import { generateCodeLibrary } from "@/lib/code-gen/gen";
import { prisma } from "@/lib/prisma";

(async () => {
    const entries = await prisma.entry.findMany({
        where: {
            status: "COMPLETED"
        }
    });

    for (const entry of entries) {
        console.log(`Generating code library for ${entry.slug}`);
        await generateCodeLibrary(entry.parameters, entry.slug, entry.status);
    }
})();