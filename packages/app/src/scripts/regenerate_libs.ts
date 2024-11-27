import { generateCodeLibrary } from "@/lib/code-gen/gen";
import { prisma } from "@/lib/prisma";

(async () => {
    const entries = await prisma.entry.findMany({
        where: {
            status: "COMPLETED"
        }
    });

    for (const entry of entries) {
        const parameters = entry.parameters as any;
        if (parameters.emailHeaderMaxLength) {
            parameters.emailHeaderMaxLength = 1024;
        }
        console.log(`Generating code library for ${entry.slug}`);
        await generateCodeLibrary(parameters, entry.slug, entry.status);
    }
})();