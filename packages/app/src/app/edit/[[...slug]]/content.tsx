'use client'
import { formSchema } from "@/app/submit/form";
import { z } from "zod";
import { submit } from "./action";
import { Entry } from "@prisma/client";
import { EntryForm } from "@/components/entry-form";

export default function Content({entry}: {entry: Entry, sampleEmail: string}) {
    async function onSubmit(values: z.infer<typeof formSchema>) {
        await submit(values)
    }
    return (
    <div className="w-full py-20 lg:py-40">
        <div className="container mx-auto">
            <div className="flex flex-col gap-10">
                <div className="flex text-left justify-center items-center gap-4 flex-col px-10 md:px-40">
                    <h1 className="text-xl md:text-3xl tracking-tighter text-left font-extrabold">Edit pattern</h1>
                    <h1 className="text-md md:text-xl tracking-tighter text-left">{entry.title}</h1>
                    <h1 className="text-md md:text-xl tracking-tighter text-left">{entry.description}</h1>
                    <EntryForm entry={entry} onFormSubmit={onSubmit} />
                </div>
            </div>
        </div>
    </div>
    )
}