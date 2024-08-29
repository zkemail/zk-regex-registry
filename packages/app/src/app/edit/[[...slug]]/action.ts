'use server';

import { formSchema } from "@/app/submit/form";
import { updateEntry } from "@/lib/models/entry";
import { Entry, Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";

export async function submit(values: z.infer<typeof formSchema>) {
    const entry = {
        title: values.title,
        slug: values.slug,
        description: values.description,
        createdBy: 'ui',
        tags: values.tags,
        parameters: {
            ...values.parameters,
            version: values.useNewSdk ? "v2" : "v1",
        } as Prisma.InputJsonValue,
        emailQuery: values.emailQuery,
        status: "PENDING"
    } as Entry;

    try {
        await updateEntry(entry)
        return redirect("/")
    } catch (e: any) {
        return {
            error: true,
            message: "Error updating entry: " + e.toString()
        }
    }
}