import { generateCodeLibrary, generateZip } from "@/lib/code-gen/gen";
import { NextRequest, NextResponse } from "next/server";
import { getEntryBySlug } from "@/lib/models/entry";
import { readFileSync, statSync } from "fs";

export async function GET(request: NextRequest, { params }: { params: { slug: string[]}}) {
    const slug = params.slug.join('/');
    const entry = await getEntryBySlug(slug);
    if (!entry) {
        return NextResponse.json({
            error: 'Entry not found'
        }, {
            status: 404
        })
    }
    await generateCodeLibrary(entry.parameters, entry.slug, entry.status);
    const output = await generateZip(entry.slug);
    const stats = statSync(output);
    const fileContent = readFileSync(output)

    const filename = `${entry.slug}.zip`;
    return new NextResponse(fileContent, {
        headers: {
            'Content-Disposition': `attachment; filename=${filename}`,
            'Content-Type': 'application/zip',
            "Content-Length": stats.size + "",
        }
    })
}