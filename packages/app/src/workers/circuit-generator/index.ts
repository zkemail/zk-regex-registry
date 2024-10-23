import { compileCircuitModal, downloadBuiltCircuit, downloadZkey } from "@/lib/circuit-gen/gen";
import { getRandomPendingEntry, updateState } from "@/lib/models/entry";
import { generateCodeLibrary, shouldRetryCompilation } from "@/lib/code-gen/gen"
import { Entry } from "@prisma/client";
import { getLogs } from "@/lib/models/logs";

const processing: string[] = [];
let forceStop = false;

async function generateCiruitService() {
    while (true) {
        let entry: Entry;
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const pendingEntry = await getRandomPendingEntry();
            if (!pendingEntry) {
                continue
            }
            entry = pendingEntry;
        } catch (e) {
            console.error("Failed to poll for entries", e)
            continue;
        }

        const circuitName = (entry.parameters as any)['name'];
        try {
            processing.push(entry.slug);
            // Use modal to compile circuit
            await generateCodeLibrary(entry.parameters, entry.slug, entry.status)
            await compileCircuitModal(entry.slug, circuitName, true);
            await downloadZkey(entry.slug, circuitName);
            await downloadBuiltCircuit(entry.slug, circuitName);
            await updateState(entry.id, "COMPLETED", true);
        } catch (e) {
            if (await shouldRetryCompilation(entry.slug)) {
                console.error("Retrying circuit compilation", e)
                await updateState(entry.id, "PENDING");
            } else {
                console.error("Failed to compile circuit using modal", e)
                await updateState(entry.id, "ERROR");
            }
        }
        processing.splice(processing.indexOf(entry.slug), 1);
    }
}

// Function to handle graceful exit
function handleGracefulExit() {
    console.log('Received exit signal. Gracefully shutting down...');
    if (forceStop) {
        process.exit(0);
    }
    // Perform any cleanup tasks here if needed
    if (processing.length > 0) {
        console.log("Waiting for circuits to finish processing", processing);
        console.log("Cancel again to force exit");
        setInterval(() => {
            console.log("Waiting for circuits to finish processing", processing);
            console.log("Cancel again to force exit");
        }, 10000);
        forceStop = true;
    } else {
        process.exit(0);
    }
}

// Listen for SIGINT and SIGTERM signals
process.on('SIGINT', handleGracefulExit);
process.on('SIGTERM', handleGracefulExit);

// Wrap the main loop in a try-catch block
async function main() {
    try {
        await generateCiruitService();
    } catch (error) {
        console.error('Unhandled error in main loop:', error);
        process.exit(1);
    }
}

main();

