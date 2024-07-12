'use server';
import { z } from 'zod';
import { formSchema } from './form';
import prisma from '@/lib/prisma';

export async function createEntry(values: z.infer<typeof formSchema>) {
    console.log(JSON.stringify(values, null, 2));

    const entry = {
        title: values.title,
        slug: values.slug,
        description: values.description,
        createdBy: 'ui',
        tags: values.tags,
        parameters: {
            ...values.parameters,
            version: values.useNewSdk ? "v2" : "v1"
        },
        emailQuery: values.emailQuery
    }

    const createdEntry = await prisma.entry.create({data: entry})
    return createdEntry
}