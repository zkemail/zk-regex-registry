import { getEntryById } from "@/lib/models/entry";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";

const CIRCUIT_OUT_DIR = "./output/circuit";

export async function GET(request: NextRequest, { params }: { params: { id: string }}) {
    const token = Buffer.from(request.headers.get('Authorization')?.split('Bearer ')[1] || '', 'base64').toString().trim();

    const job = await prisma.proofJob.findFirst({
        where: {
            id: params.id,
            createdBy: token
        },
        include: {
            entry: true
        }
    });
    if (!job) {
        return NextResponse.json({
                error: 'Job not found'
        }, {
            status: 404
        })
    }

    let publicOutput: string | null = null;
    let proof: string | null = null;
    
    if (job.status === "COMPLETED") {
        publicOutput = await new Promise((resolve, reject) => {
            fs.readFile(`${CIRCUIT_OUT_DIR}/${job.entry.slug}/proofs/${job.id}/public.json`, 'utf-8', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            }
        )});

        proof = await new Promise((resolve, reject) => {
            fs.readFile(`${CIRCUIT_OUT_DIR}/${job.entry.slug}/proofs/${job.id}/proof.json`, 'utf-8', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            }
        )});
    }

    return NextResponse.json({
        jobId: job.id,
        pollUrl: `/api/proof/${job.id}`,
        status: job.status,
        publicOutput,
        proof
    });
}