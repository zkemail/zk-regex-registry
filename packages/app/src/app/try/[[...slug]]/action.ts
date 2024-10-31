'use server';

import prisma from "@/lib/prisma";
import { Entry } from "@prisma/client";

export async function redeployContracts(entry: Entry, chainName: string) {
    const deployment = await prisma.contractDeployment.findFirst({
        where: {
            entryId: entry.id, chainName
        }
    });
    if (deployment) {
        await prisma.contractDeployment.update({
            where: { id: deployment.id }, data: {
                status: "PENDING"
            }
        })
    } else {

        await prisma.contractDeployment.create({
            data: {
                chainName,
                status: "PENDING",
                entryId: entry.id,
            }
        })
    }
}