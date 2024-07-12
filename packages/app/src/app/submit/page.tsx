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
import { useState } from 'react';

export default function Submit() {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            description: "",
            slug: "",
            tags: [],
            emailQuery: "",
            useNewSdk: true,
            parameters: {
                name: "",
                ignoreBodyHashCheck: true,
                shaPrecomputeSelector: "",
                values: [
                    {
                        name: "",
                        regex: "",
                        prefixRegex: "",
                        location: "body",
                        revealStates: "[]",
                        parts: "[]"
                    }
                ]
            }

        },
    })

    const { fields, append, remove } = useFieldArray({control: form.control, name: "parameters.values"})
    const [modal, setModal] = useState<boolean>(false);
    const [modalMessage, setModalMessage] = useState<string>("");
    const [modalError, setModalError] = useState<boolean>(false);

    function addValueObject() {
        append({
            name: "",
            regex: "",
            prefixRegex: "",
            location: "body",
            revealStates: "[]",
            parts: "{}"
        })
    }

    function removeValueObject(i: number) {
        remove(i)
    }

    function displayValueForm(i: number) {
        if (form.getValues().useNewSdk) {
            return <FormField
                control={form.control}
                name={`parameters.values.${i}.parts`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Parts JSON</FormLabel>
                        <FormControl>
                            <Textarea className="font-mono" {...field} />
                        </FormControl>
                        <FormDescription></FormDescription>
                        <FormMessage></FormMessage>
                    </FormItem>
                )}
            />
        } else {
            return <>
                <FormField
                    control={form.control}
                    name={`parameters.values.${i}.regex`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Regex</FormLabel>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                            <FormDescription></FormDescription>
                            <FormMessage></FormMessage>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name={`parameters.values.${i}.prefixRegex`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Prefix Regex</FormLabel>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                            <FormDescription></FormDescription>
                            <FormMessage></FormMessage>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name={`parameters.values.${i}.revealStates`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Reveal States</FormLabel>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                            <FormDescription>e.g [[23,24], [45,67]]</FormDescription>
                            <FormMessage></FormMessage>
                        </FormItem>
                    )}
                />
            </>
        }
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
                        <h1 className="text-xl md:text-3xl tracking-tighter text-left font-extrabold mb-6">Submit new pattern</h1>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Pattern Title</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Proof of Twitter" {...field} />
                                            </FormControl>
                                            <FormDescription></FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="" {...field} />
                                            </FormControl>
                                            <FormDescription></FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="slug"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Slug</FormLabel>
                                            <FormControl>
                                                <Input placeholder="author/name-of-pattern" {...field} />
                                            </FormControl>
                                            <FormDescription></FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="tags"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tags</FormLabel>
                                            <FormControl>
                                                <Input placeholder="email,identity" {...field} />
                                            </FormControl>
                                            <FormDescription>Separated by commas ,</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="emailQuery"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email Query</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Password reset request from: info@x.com" {...field} />
                                            </FormControl>
                                            <FormDescription>As if you were searching for the email in your Gmail inbox</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="parameters.name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Circuit Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="" {...field} />
                                            </FormControl>
                                            <FormDescription></FormDescription>
                                            <FormMessage></FormMessage>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="parameters.ignoreBodyHashCheck"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Skip body hash check?</FormLabel>
                                            <FormControl>
                                                <Checkbox className="ml-2" checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <FormDescription>Enable to ignore the contents on the email and only extract data from the headers</FormDescription>
                                            <FormMessage></FormMessage>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="parameters.shaPrecomputeSelector"
                                    render={({ field, formState }) => (
                                        <FormItem>
                                            <FormLabel>SHA Precompute Selector</FormLabel>
                                            <FormControl>
                                                <Input disabled={formState.dirtyFields.parameters?.ignoreBodyHashCheck} {...field} />
                                            </FormControl>
                                            <FormDescription>A selector that is used to cut-off the email body so that we only compute the hash of the email body after the selector. This is to reduce the number of constraints in the circuit.</FormDescription>
                                            <FormMessage></FormMessage>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="useNewSdk"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Use new ZK Regex SDK for circuit generation</FormLabel>
                                            <FormControl>
                                                <Checkbox className="ml-2" checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <FormDescription></FormDescription>
                                            <FormMessage></FormMessage>
                                        </FormItem>
                                    )}
                                />
                                <div className="flex flex-row items-center">
                                    <b>Fields to Extract</b>
                                    <Button type="button" onClick={() => addValueObject()} variant="outline" className="ml-4"><Plus color="green"/>Add new value to extract</Button>
                                </div>
                                {fields.map((v, i) => {
                                    return (
                                        <div className='pl-8 pb-4' key={v.id}>
                                            <div className="flex flex-row items-center"><b>Field #{i + 1}</b>{i !== 0 && <Trash color="red" className="ml-2" onClick={() => removeValueObject(i)}/>}</div>
                                            <FormField
                                                control={form.control}
                                                name={`parameters.values.${i}.name`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Field Name</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} />
                                                        </FormControl>
                                                        <FormDescription></FormDescription>
                                                        <FormMessage></FormMessage>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`parameters.values.${i}.location`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Data Location</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} />
                                                        </FormControl>
                                                        <FormDescription>Either body or header</FormDescription>
                                                        <FormMessage></FormMessage>
                                                    </FormItem>
                                                )}
                                            />
                                            {displayValueForm(i)}
                                        </div>
                                    )
                                })}

                                <Button type="submit">Submit</Button>
                            </form>
                        </Form>
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