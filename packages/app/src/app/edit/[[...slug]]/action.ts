'use server';

import { formSchema } from "@/app/submit/form";
import { getEntryBySlug, updateEntry } from "@/lib/models/entry";
import { Entry, Prisma } from "@prisma/client";
import { redirect, RedirectType } from "next/navigation";
import { z } from "zod";

export async function submit(values: z.infer<typeof formSchema>) {
    const entry = await getEntryBySlug(values.slug);
    if (!entry) {
        return {
            error: true,
            message: "Entry not found"
        }
    }
    const updatedParameters = {
            ...values.parameters,
            version: values.useNewSdk ? "v2" : "v1",
    } as Prisma.InputJsonValue;
    const needsRecompilation = !areJsonObjectsEqual(updatedParameters, entry.parameters || {});
    const updatedEntry = {
        title: values.title,
        slug: values.slug,
        description: values.description,
        createdBy: 'ui',
        tags: values.tags,
        parameters: updatedParameters,
        emailQuery: values.emailQuery,
        status: needsRecompilation ? "PENDING" : entry.status,
    } as Entry;
    try {
        await updateEntry(updatedEntry)
    } catch (e: any) {
        return {
            error: true,
            message: "Error updating entry: " + e.toString()
        }
    }
    redirect("/", RedirectType.push)
}

function areJsonObjectsEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) return false;

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
        if (!keys2.includes(key)) return false;
        if (!areJsonObjectsEqual(obj1[key], obj2[key])) return false;
    }

    return true;
}