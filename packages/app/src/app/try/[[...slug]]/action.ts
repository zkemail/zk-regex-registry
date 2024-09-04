'use server';

import prisma from "@/lib/prisma";
import { Entry } from "@prisma/client";

export async function redeployContracts(entry: Entry) {
    await prisma.entry.update({
        where: {
            slug: entry.slug,
        },
        data: {
            verifierContractAddress: null,
            contractAddress: null
        }
    })
}