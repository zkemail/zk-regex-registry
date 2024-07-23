import { deployContract, readContractAddresses } from "@/lib/contract-deploy"
import { getFirstUndeployedEntry } from "@/lib/models/entry"
import prisma from "@/lib/prisma"

async function startContractDeployerService() {
    while (true) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const entry = await getFirstUndeployedEntry();
        if (entry) {
            await deployContract(entry);
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
        }
    }
}

startContractDeployerService()