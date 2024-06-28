import { Entry, ProofJob } from "@prisma/client";
import prisma from "./prisma";
import { spawn } from "child_process";
import fs from "fs";

const CIRCUIT_OUT_DIR = "./output/circuit";

interface QueueStatus {
    status: string,
    jobId: string,
    pollUrl: string,
    estimatedDuration: number
}

export async function queueProofJob(entry: Entry, circuitInput: any, apiKey: string): Promise<QueueStatus> {
    // Create a new proof job in the database
    const job = await prisma.proofJob.create(
        {
            data: {
                circuitInput,
                entryId: entry.id,
                createdBy: apiKey,
            }
        }
    );

    // Check how many jobs are currently pending
    const processingJobs = (await prisma.proofJob.count({
        where: {
            status: "PENDING"
        }
    }));

    // Calculate the estimated duration of a single job
    // If there are none, then we just use a default value of 120 seconds
    const average = (await prisma.proofJob.aggregate({
        _avg: {
            timeToComplete: true
        },
        where: {
            status: "COMPLETED",
            // entryId: entry.id,
        },
        take: 10
    }))._avg.timeToComplete || 120;

    // Return the proof job id
    return {
        estimatedDuration: average * processingJobs,
        jobId: job.id,
        pollUrl: `/api/proof/${job.id}`,
        status: job.status,
    }
}

export function startProofService() {
    setImmediate(async () => {
        console.log("Starting proof generation service");
        while (true) {
            let jobWithEntry = await prisma.proofJob.findFirst({
                where: {
                    status: "PENDING"
                },
                include: {
                    entry: true
                },
                orderBy: {
                    createdAt: "asc"
                }
            });
            // Sleep and try again
            if (!jobWithEntry) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
                continue;
            }
            const job = await prisma.proofJob.update({
                where: {
                    id: jobWithEntry.id
                },
                data: {
                    status: "PROCESSING"
                }
            })
            // Generate proof
            await generateProof(jobWithEntry.entry, job);

            // Update job status and delete circuit input
            await prisma.proofJob.update({
                where: {
                    id: job.id
                },
                data: {
                    status: "COMPLETED",
                    circuitInput: {},
                    timeToComplete: (Date.now() - job.updatedAt.getTime())/1000
                }
            })
        }
    })
}

export async function generateProof(entry: Entry, job: ProofJob) {

    const circuitName = (entry.parameters as any)["name"];
    const circuitSlug = entry.slug;

    // Generate circuit input
    const proofDir = `${CIRCUIT_OUT_DIR}/${entry.slug}/proofs/${job.id}`;
    if (!fs.existsSync(proofDir)) {
        fs.mkdirSync(proofDir, { recursive: true });
    }

    // Write the circuit inputs to a file
    // TODO: directly send the inputs to the witness generation script
    await new Promise<void>((resolve, reject) => {
        fs.writeFile(`${proofDir}/input.json`, JSON.stringify(job.circuitInput), (err) => {
            if (err) {
                reject(err);
            }
            resolve();
        });
    })

    // Generate witness
    // node output/circuit/zk-email/address-from-sp-bill/bill_js/generate_witness.js output/circuit/zk-email/address-from-sp-bill/bill_js/bill.wasm fixtures/bill_input.json fixtures/bill_output.wtns
    await new Promise<void>((resolve, reject) => {
        const witness_p = spawn("node", [`${CIRCUIT_OUT_DIR}/${circuitSlug}/${circuitName}_js/generate_witness.js`, `${CIRCUIT_OUT_DIR}/${circuitSlug}/${circuitName}_js/${circuitName}.wasm`, `${proofDir}/input.json`, `${proofDir}/output.wtns`]);
        witness_p.stdout.on('data', (data) => {
            process.stdout.write(`stdout: ${data}`);
        });
        witness_p.stderr.on('data', (data) => {
            process.stderr.write(`stderr: ${data}`);
        });
        witness_p.on('exit', (code, signal) => {
            if (code === 0) {
                console.log(`Generated witness for ${circuitSlug} with name ${circuitName}`);
                resolve();
            } else {
                console.log(`Process exited with code ${code}`);
                reject();
            }
        });
    })

    // Generate proof from witness
    // node node_modules/.bin/snarkjs groth16 prove output/circuit/zk-email/address-from-sp-bill/bill.zkey fixtures/bill_output.wtns fixtures/proof.json fixtures/public.json
    return new Promise<void>((resolve, reject) => {
        const proof_p = spawn("node", ["node_modules/.bin/snarkjs", "groth16", "prove", `${CIRCUIT_OUT_DIR}/${circuitSlug}/${circuitName}.zkey`, `${proofDir}/output.wtns`, `${proofDir}/proof.json`, `${proofDir}/public.json`]);
        proof_p.stdout.on('data', (data) => {
            process.stdout.write(`stdout: ${data}`);
        });
        proof_p.stderr.on('data', (data) => {
            process.stderr.write(`stderr: ${data}`);
        });
        proof_p.on('exit', (code, signal) => {
            if (code === 0) {
                console.log(`Generated proof for ${circuitSlug} with name ${circuitName}`);
                resolve();
            } else {
                console.log(`Process exited with code ${code}`);
                reject();
            }
        });
    })
}