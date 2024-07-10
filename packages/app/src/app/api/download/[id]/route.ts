import { generateCodeLibrary } from "@/lib/code-gen/gen";
import { NextRequest, NextResponse } from "next/server";
import { getEntryById, getEntryBySlug } from "@/lib/models/entry";
import { readFileSync, statSync } from "fs";

export async function GET(request: NextRequest, { params }: { params: { id: string }}) {
    const entry = await getEntryById(params.id);
    if (!entry) {
        return NextResponse.json({
            error: 'Entry not found'
        }, {
            status: 404
        })
    }
    const output = await generateCodeLibrary(entry.parameters, entry.slug);
    const stats = statSync(output);
    const fileContent = readFileSync(output)

    return new NextResponse(fileContent, {
        headers: {
            'Content-Disposition': `attachment; filename=example.zip`,
            'Content-Type': 'application/zip',
            "Content-Length": stats.size + "",
        }
    })
}