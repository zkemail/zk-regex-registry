import { getEntryById } from "@/lib/models/entry";
import { queueProofJob } from "@/lib/proof-gen";
import { NextRequest, NextResponse } from "next/server";

interface ProofRequest {
    email: string;
}

export async function POST(request: NextRequest, { params }: { params: { id: string }}) {
    const circuitInput = await request.json() as ProofRequest;

    const entry = await getEntryById(params.id);
    if (!entry) {
        return NextResponse.json({
            error: 'Entry not found'
        }, {
            status: 404
        });
    }
    const token = Buffer.from(request.headers.get('Authorization')?.split('Bearer ')[1] || '', 'base64').toString().trim();
    if (!token) {
        return NextResponse.json({
            error: 'Unauthorized'
        }, {
            status: 401
        });
    }

    const result = await queueProofJob(entry, circuitInput, token);
    return NextResponse.json(result);
}
