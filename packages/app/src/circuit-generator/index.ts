import { compileCircuit, generateZKey, generateVKey } from "@/lib/circuit-gen/gen";
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
            console.error("Failed to poll for entries")
            continue;
        }

        const circuitName = (entry.parameters as any)['name'];
        try {
            await generateCodeLibrary(entry.parameters, entry.slug, entry.status)
            const promise = compileCircuit(entry.slug, circuitName, true);
            updateState(entry.id, "COMPILING");
            await promise.then(() => {
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