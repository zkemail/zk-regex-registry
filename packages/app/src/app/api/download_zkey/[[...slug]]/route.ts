import { NextRequest, NextResponse } from "next/server";
import { getEntryBySlug } from "@/lib/models/entry";
import { GetSignedUrlConfig, Storage } from "@google-cloud/storage";

export async function GET(request: NextRequest, { params }: { params: { slug: string[] } }) {
    const slug = params.slug.join('/');
    const entry = await getEntryBySlug(slug);
    if (!entry) {
        return NextResponse.json({
            error: 'Entry not found'
        }, {
            status: 404
        })
    }
    let keyFilename;
    if (process.env.GOOGLE_AUTH_JSON) {
        keyFilename = process.env.GOOGLE_AUTH_JSON;
    }
    const storage = new Storage({ keyFilename: keyFilename });
    const options = {
        version: 'v2', // defaults to 'v2' if missing.
        action: 'read',
        expires: Date.now() + 1000 * 60 * 60, // one hour
    } as GetSignedUrlConfig;
    if (!process.env.BUCKET_NAME) {
        throw new Error("BUCKET_NAME is not set");
    }
    const bucketName = process.env.BUCKET_NAME;
    const circuitName = (entry.parameters as any).name;
    const fileName = `circuit/${entry.slug}/${circuitName}.zkey`;

    // Get a v2 signed URL for the file
    const [url] = await storage
        .bucket(bucketName)
        .file(fileName)
        .getSignedUrl(options);

    console.log(`The signed url for ${fileName} is ${url}.`);
    // redirect to the signed url
    return NextResponse.redirect(url);
}