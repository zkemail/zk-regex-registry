import { JsonValue } from "@prisma/client/runtime/library"
import prisma from "../prisma"

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

export const textSearchEntries = async(query: string, take: number, skip: number) => {
    return prisma.entry.findMany({
        take, skip, orderBy: {createdAt: 'desc'},
        where: {
            OR: [{description: { search: query }}, {slug: { search: query }}, {title: { search: query }}]
        }
    })
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

export const updateState = async (id: string, state: string) => {
    await prisma.entry.update({where: {id}, data: {status: state}});
}

export const getFirstPendingEntry = async () => {
    const entry = await prisma.entry.findFirst({where: {status: "PENDING"}, orderBy: {createdAt: 'asc'}});
    return entry
}