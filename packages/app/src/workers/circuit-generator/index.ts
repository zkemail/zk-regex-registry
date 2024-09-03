import { compileCircuit, generateZKey, generateVKey, installProjectDeps } from "@/lib/circuit-gen/gen";
import { getFirstPendingEntry, updateState } from "@/lib/models/entry";
import { generateCodeLibrary } from "@/lib/code-gen/gen"
import { Entry } from "@prisma/client";

async function generateCiruitService() {
    while (true) {
        let entry: Entry;
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const pendingEntry = await getFirstPendingEntry();
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
            await generateCodeLibrary(entry.parameters, entry.slug, entry.status)
            updateState(entry.id, "INSTALLING");
            const promise = installProjectDeps(entry.slug);
            await promise.then(() => {
                updateState(entry.id, "COMPILING");
                return compileCircuit(entry.slug, circuitName, true);
            }).then(() => {
                updateState(entry.id, "GENERATING_ZKEY");
                return generateZKey(entry.slug, circuitName, true);
            }).then(() => {
                updateState(entry.id, "GENERATING_VKEY");
                return generateVKey(entry.slug, circuitName, true);
            }).then(() => {
                updateState(entry.id, "COMPLETED");
            }).catch((e) => {
                console.error(`Failed to generate ${e}`);
                updateState(entry.id, "ERROR");
            });
        } catch (e) {
            console.error(`Failed to generate ${e}`);
            updateState(entry.id, "ERROR");
        }
    }
}
generateCiruitService();
