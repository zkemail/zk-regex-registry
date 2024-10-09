import { downloadZkey } from "@/lib/circuit-gen/gen";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

(async () => {
    const entries = await prisma.entry.findMany({
        where: {
            status: "COMPLETED",
            withModal: true,
        }
    });

    for (const entry of entries) {
        const circuitName = (entry.parameters as any).name as string;
        if (!fs.existsSync(path.join("output", "code", entry.slug, "circuit", `${circuitName}.zkey`))) {
            console.log(`Downloading ${circuitName} for ${entry.slug}`);
            await downloadZkey(entry.slug, circuitName);
            console.log(`Downloaded ${circuitName} for ${entry.slug}`);
        }
    }
})();