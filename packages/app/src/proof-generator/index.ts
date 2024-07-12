import prisma from "@/lib/prisma";
import { generateProof } from "@/lib/proof-gen";

(async () => {
    console.log("Starting proof generation service");
    while (true) {
        try {
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
        } catch (e) {
            console.error(e)
        }
    }
})()