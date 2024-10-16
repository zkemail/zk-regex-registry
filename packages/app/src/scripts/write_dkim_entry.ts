import { addDkimEntry } from "@/lib/contract-deploy";
import { prisma } from "@/lib/prisma";

(async () => {
    const entries = await prisma.entry.findMany({
        where: {
            status: "COMPLETED",
        }
    });
    for (const entry of entries) {
        console.log("Adding DKIM entry for entry: ", entry.slug)
        try {
            await addDkimEntry(entry)
        } catch {
            console.log("Error adding DKIM entry for: ", entry.slug);
        }
    }
})()