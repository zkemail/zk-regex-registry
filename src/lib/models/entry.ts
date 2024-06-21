import { JsonValue } from "@prisma/client/runtime/library"
import prisma from "../prisma"

export type Entry = {
    id: string,
    title: string,
    slug: string,
    description: string,
    createdAt: Date,
    updatedAt: Date,
    createdBy: string,
    tags: string[],
    parameters: any
}

export type ZkRegexParameters = {
    name: string,
    ignoreBodyHashCheck: boolean,
    shaPrecomputeSelector?: string,
    maxBodyLength?: number,
    values: [
        {
            name: string,
            location: "body" | "header",
            regex: string,
            prefixRegex: string,
            revealStates: number[][]
            maxLength: number
        }
    ]
}


export const getAllEntries = async (take: number, skip: number) => {
  const entries = await prisma.entry.findMany({take, skip, orderBy: {createdAt: 'desc'}});
  return entries
}

export const getEntryById = async (id: string) => {
    const entry = await prisma.entry.findUnique({where: {id}});
    return entry
}

export const getEntryBySlug = async (slug: string) => {
  const entry = await prisma.entry.findFirst({where: {slug}});
  return entry
}

export const getEntryCount = async () => {
    const count = await prisma.entry.count();
    return count
}