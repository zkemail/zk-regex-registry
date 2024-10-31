import { generateCodeLibrary } from "@/lib/code-gen/gen";
import { addDkimEntry, buildContract, deployContract, readContractAddresses, deployContractWithModal } from "@/lib/contract-deploy"
import prisma from "@/lib/prisma"
import { error } from "console";

async function getUndeployedEntry() {
    const deployment = await prisma.contractDeployment.findFirst({where: {status: "PENDING"}, include: {entry: true}})
    return deployment;
}

async function startContractDeployerService() {
    while (true) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const deployment = await getUndeployedEntry();
        if (deployment) {
            try {
                const entry = deployment.entry;
                if (entry.withModal) {
                    await deployContractWithModal(entry, deployment.chainName);
                } else {
                    await generateCodeLibrary(entry.parameters, entry.slug, entry.status);
                    await deployContract(entry);
                }
                await addDkimEntry(entry, deployment.chainName);
                const addresses = await readContractAddresses(entry);
                await prisma.contractDeployment.update({
                    where: {
                        id: deployment.id
                    },
                    data: {
                        status: "COMPLETED",
                        verifierContractAddress: addresses.verifier,
                        contractAddress: addresses.contract,
                        error: null,
                    }
                });
            } catch (error) {
                await prisma.contractDeployment.update({
                    where: {
                        id: deployment.id
                    },
                    data: {
                        status: "ERROR",
                        error: "error:" + (error as Error).toString(),
                    }
                });
            }
        }
    }
}

startContractDeployerService()