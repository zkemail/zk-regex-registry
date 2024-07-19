import { getEntryBySlug } from "@/lib/models/entry";
import { queueProofJob } from "@/lib/proof-gen";
import { NextRequest, NextResponse } from "next/server";

interface ProofRequest {
    email: string;
}

export async function POST(request: NextRequest, { params }: { params: { slug: string[] }}) {
    const circuitInput = await request.json() as ProofRequest;
    const slug = params.slug.join('/');
    const entry = await getEntryBySlug(slug);
    if (!entry) {
        return NextResponse.json({
            error: 'Entry not found'
        }, {
            status: 404
        });
    }
    let token = Buffer.from(request.headers.get('Authorization')?.split('Bearer ')[1] || '', 'base64').toString().trim();
    // if (!token) {
    //     return NextResponse.json({
    //         error: 'Unauthorized'
    //     }, {
    //         status: 401
    //     });
    // }
    token = token || "guest";

    const result = await queueProofJob(entry, circuitInput, token);
    return NextResponse.json(result);
}
