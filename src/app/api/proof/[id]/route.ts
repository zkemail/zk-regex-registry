import { NextRequest, NextResponse } from "next/server";

interface ProofRequest {
    email: string;
}

export async function POST(request: NextRequest, { params }: { params: { id: string }}) {
    const body = await request.json() as ProofRequest;
    if (!body.email) {
        return NextResponse.json({
            error: 'Email is required'
        }, {
            status: 400
        });
    }

    


    return NextResponse.json({
        success: true
    });
}