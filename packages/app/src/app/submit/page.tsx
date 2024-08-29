'use client';
import { z } from 'zod';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash } from 'lucide-react';
import { formSchema } from './form';
import { createEntry } from './action';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '@/components/ui/dialog';
import { useEffect, useState } from 'react';
import { FromAddressPattern, SubjectPattern, TimestampPattern, ToAddressPattern } from './patterns';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectLabel, SelectItem } from '@/components/ui/select';
import { EntryForm } from '@/components/entry-form';
import { Entry } from '@prisma/client';
import { JsonValue } from '@prisma/client/runtime/library';

export default function Submit() {

    const [modal, setModal] = useState<boolean>(false);
    const [modalMessage, setModalMessage] = useState<string>("");
    const [modalError, setModalError] = useState<boolean>(false);
    const [entry, setEntry] = useState<Entry | undefined>();

    function fillDemo() {
        setEntry({
            title: "Proof of Twitter",
            description: "Use a password reset email to proof you own the email connected to a twitter handle.",
            slug: "zk-email/proof-of-twitter",
            tags: ["email","identity"],
            emailQuery: "Password reset request from: info@x.com ",
            parameters: {
                version: "v2",
                name: "twitter",
                ignoreBodyHashCheck: false,
                enableMasking: false,
                shaPrecomputeSelector: ">Not my account<",
                senderDomain: "x.com",
                emailBodyMaxLength: 4032,
                dkimSelector: "dkim-202308",
                values: [
                    {
                        name: "handle",
                        location: "body",
                        parts: [
  { "is_public": false, "regex_def": "email was meant for @" }, 
  { "is_public": true, "regex_def": "(a-zA-Z0-9_)+" }
]
                    }
                ],
                externalInputs: []
            } as JsonValue,
        } as Entry)
    }
    
    async function onSubmit(values: z.infer<typeof formSchema>) {
        let result = await createEntry(values)
        if (result.error) {
            setModalError(true);
            setModalMessage(result.message.toString() || "Unknown error")
        } else {
            setModalError(false);
            setModalMessage("Entry created successfully")
        }
        setModal(true)
    }


    return (
        <div className="w-full py-20 lg:py-40">
            <div className="container mx-auto">
                <div className="flex flex-col gap-10">
                    <div className="flex text-left justify-center items-center gap-4 flex-col px-10 md:px-40">
                        <h1 className="text-xl md:text-3xl tracking-tighter text-left font-extrabold">Submit new pattern</h1>
                        <Button className="mb-6" variant="secondary" size="sm" onClick={fillDemo}>Fill form using a sample</Button>
                        <EntryForm entry={entry} onSubmit={onSubmit} />
                    </div>
                </div>
            </div>
            <Dialog open={modal} onOpenChange={setModal}>
                <DialogTrigger></DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogDescription>
                            {modalMessage}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="text-center">
                        {modalError && <Button variant="outline" onClick={() => setModal(false)}>Back to Editing</Button>}
                        {!modalError &&<a href="/"><Button variant="outline">Back to Home</Button></a>}
                    </div>
                </DialogContent>
            </Dialog>
        </div>)
}
