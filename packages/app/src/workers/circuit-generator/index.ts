import { compileCircuitModal, downloadZkey } from "@/lib/circuit-gen/gen";
import { getRandomPendingEntry, updateState } from "@/lib/models/entry";
import { generateCodeLibrary } from "@/lib/code-gen/gen"
import { Entry } from "@prisma/client";

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
            // Use modal to compile circuit
            await generateCodeLibrary(entry.parameters, entry.slug, entry.status)
            await compileCircuitModal(entry.slug, circuitName, true);
            await downloadZkey(entry.slug, circuitName);
            await updateState(entry.id, "COMPLETED", true);
        } catch (e) {
            console.error("Failed to compile circuit using modal", e)
            await updateState(entry.id, "ERROR");
        }
    }
}
generateCiruitService();
