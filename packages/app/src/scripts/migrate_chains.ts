import { CHAINS } from "@/lib/contract-deploy";
import prisma from "@/lib/prisma";

const DKIM_CONTRACTS = {
    "Ethereum Sepolia": "0xCD0E07250d70f07BbA71419969E3Ab9840D00A0a",
    // "Optimism Sepolia": "0x94d987d05732dFC3A98cD4B5d3B1d27677568745",
    "Arbitrum": "0xA605d110572c3efD43662785721b3f5cBdcF7f66",
    "Arbitrum Sepolia": "0xdFA0726F9DA74568d97aCbB3205Fcf40c5730Ada",
};

(async function() {
    const entries = await prisma.entry.findMany();
    for (const entry of entries) {
        if (entry.contractAddress && !entry.contractAddress.startsWith("0x")) {
            console.log(`Entry ${entry.slug} has contract address ${entry.contractAddress}, skipping`)
            await prisma.contractDeployment.create({
                data: {
                    chainName: "Ethereum Sepolia",
                    contractAddress: entry.contractAddress,
                    verifierContractAddress: entry.verifierContractAddress,
                    entryId: entry.id,
                    status: "COMPLETED"
                }
            })
        }
    }

    for (const [chainName, dkimContractAddress] of Object.entries(DKIM_CONTRACTS)) {
        const chain = CHAINS[chainName];
        await prisma.chain.create({
            data: {
                chainId: ""+chain.id,
                chainName,
                dkimContractAddress,
                rpcUrl:chain.rpcUrls.default.http[0]
            }
        })
    }
})()