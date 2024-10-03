import { generateCodeLibrary } from "@/lib/code-gen/gen";
import { addDkimEntry, buildContract, deployContract, readContractAddresses, deployContractWithModal } from "@/lib/contract-deploy"
import { getFirstUndeployedEntry } from "@/lib/models/entry"
import prisma from "@/lib/prisma"

async function startContractDeployerService() {
    while (true) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const entry = await getFirstUndeployedEntry();
        if (entry) {
            try {
                await generateCodeLibrary(entry.parameters, entry.slug, entry.status);
                if (entry.withModal) {
                    await deployContractWithModal(entry);
                } else {
                    await deployContract(entry);
                }
                await addDkimEntry(entry);
                const addresses = await readContractAddresses(entry);
                await prisma.entry.update({
                    where: {
                        id: entry.id
                    },
                    data: {
                        verifierContractAddress: addresses.verifier,
                        contractAddress: addresses.contract
                    }
                });
            } catch (error) {
                await prisma.entry.update({
                    where: {
                        id: entry.id
                    },
                    data: {
                        verifierContractAddress: "error:" + (error as Error).toString(),
                        contractAddress: "error:" + (error as Error).toString()
                    }
                });
            }
        }
    }
}

startContractDeployerService()