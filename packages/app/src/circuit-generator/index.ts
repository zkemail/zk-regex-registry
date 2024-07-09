import { compileCircuit, generateZKey, generateVKey } from "@/lib/circuit-gen/gen";
import { getFirstPendingEntry, updateState } from "@/lib/models/entry";
import { generateCodeLibrary } from "@/lib/code-gen/gen"

async function generateCiruitService() {
    while (true) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const entry = await getFirstPendingEntry();
        if (!entry) {
            continue
        }

        const circuitName = (entry.parameters as any)['name'];
        try {
            await generateCodeLibrary(entry.parameters, entry.slug)
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