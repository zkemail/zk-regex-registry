import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = process.env.GENERATED_OUTPUT_DIR || "./output";

export async function GET(request: NextRequest, { params }: { params: { slug: string[] }}) {
    const slug = params.slug.join('/')
    try {
        const file = fs.readFileSync(path.join(OUTPUT_DIR, "code", slug, "generate_inputs_worker_bundled.js"))
        const content = Buffer.from(file);
        return new NextResponse(content, {
            headers: {
                'Content-Type': 'text/javascript',
                "Content-Length": '' + content.length,
            }
        })
    } catch (e) {
        return new NextResponse("Not found", { status: 404 })
    }
}