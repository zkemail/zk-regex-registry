import prisma from "../prisma";

// Calculate the estimated duration of a single job
// If there are none, then we just use a default value of 120 seconds
export async function getAverageProcessingTime(entryId: string) {
    const average = (await prisma.proofJob.aggregate({
        _avg: {
            timeToComplete: true
        },
        where: {
            status: "COMPLETED",
            entryId: entryId,
        },
        take: 10
    }))._avg.timeToComplete || 120;
    return average || 120
}

export async function countOfPendingJobs(createdBefore: Date) {
    return prisma.proofJob.count({
        where: {
            status: {
                in: ["PENDING", "PROCESSING"],
            },
            createdAt: {
                lte: createdBefore
            }
        }
    })
}

export async function timeToComplete(jobId: string) {
    const job = await prisma.proofJob.findUnique({
        where: {
            id: jobId
        }
    });
    if (!job) {
        return 0;
    }
    const average = await getAverageProcessingTime(job.entryId);
    const countOfPending = await countOfPendingJobs(job.createdAt);
    // Current job is being processed
    if (job.status === "PROCESSING") {
        return average - (Date.now() - job.updatedAt.getTime()) / 1000;
    }
    // Estimate by using how many jobs are queued in front of this one
    return average * countOfPending;
}