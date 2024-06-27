import { NextRequest, NextResponse } from "next/server";
import { ENV } from "@/lib/env";
import { compileCircuit, generateZKey } from "@/lib/circuit-gen/gen";
import { getEntryById, updateState } from "@/lib/models/entry";

const STATE: { [key: string]: string } = {
    "PENDING": "Circuit generation in progress",
    "COMPILING": "Compiling circuit",
    "GENERATING_ZKEY": "Generating zkey",
    "GENERATING_VKEY": "Generating vkey",
    "COMPLETED": "Completed",
};

export async function POST(request: NextRequest, { params }: { params: { id: string }}) {

    const force = request.nextUrl.searchParams.get('force') === 'true' ? true : false;
    // TODO: Refactor this to use a decorator
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (token && ENV.SECRET_TOKEN !== Buffer.from(token, 'base64').toString().trim()) {
        return NextResponse.json({
            error: 'Unauthorized'
        }, {
            status: 401
        });
    }

    const entry = await getEntryById(params.id);
    if (!entry) {
        return NextResponse.json({
            error: 'Entry not found'
        }, {
            status: 404
        });
    }

    if (!force || entry.status !== "PENDING") {
        return NextResponse.json({
            description: STATE[entry.status] || "Unknown",
            status: entry.status,
        }, {
            status: 409
        });
    }

    const circuitName =(entry.parameters as any)['name'];
    try {
        const promise = compileCircuit(entry.slug, circuitName, force);
        updateState(params.id, "COMPILING");
        promise.then(() => {
            updateState(params.id, "GENERATING_ZKEY");
            return generateZKey(entry.slug, circuitName, force);
        }).then(() => {
            updateState(params.id, "GENERATING_VKEY");
            return Promise.resolve();
        }).then(() => {
            updateState(params.id, "COMPLETED");
        }).catch((e) => {
            console.error(`Failed to generate ${e}`);
            updateState(params.id, "PENDING");
        });

        return NextResponse.json({
            description: STATE[entry.status] || "Unknown",
            status: entry.status,
        }, {
            status: 200
        });
    } catch (e) {
        return NextResponse.json({
            error: `Failed to generate ${e}`
        }, {
            status: 500
        });
    }
}