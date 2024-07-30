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
import { FromAddressPattern, SubjectPattern, TimestampPattern, ToAddressPattern } from './patterns';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectLabel, SelectItem } from '@/components/ui/select';

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
                senderDomain: "",
                values: [
                    {
                        name: "",
                        maxLength: 64,
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

    function fillDemo() {
        const sampleForm:{[key:string]:any} = {
            "title": "Proof of Twitter",
            "description": "Use a password reset email to proof you own the email connected to a twitter handle.",
            "slug": "zk-email/proof-of-twitter",
            "tags": "email,identity",
            "emailQuery": "Password reset request from: info@x.com ",
            "useNewSdk": true,
            "parameters.name": "twitter",
            "parameters.ignoreBodyHashCheck": false,
            "parameters.shaPrecomputeSelector": ">Not my account<",
            "parameters.senderDomain": "x.com",
            "parameters.values.0.name": "handle",
            "parameters.values.0.location": "body",
            "parameters.values.0.parts": `[
  { "is_public": false, "regex_def": "email was meant for @" }, 
  { "is_public": true, "regex_def": "(a-zA-Z0-9_)+" }
]
`,
            "parameters.values.0.maxLength": 64,
        }

        for (let v of Object.keys(sampleForm)) {
            form.setValue(v as any, sampleForm[v])
        }
    }

    function addValueObject() {
        append({
            name: "",
            maxLength: 64,
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

    function autoFillRegex(index: number, value: string) {
        let preFilledPattern;
        switch (value) {
            case "from":
                preFilledPattern = FromAddressPattern;
                break;
            case "to":
                preFilledPattern = ToAddressPattern;
                break
            case "subject":
                preFilledPattern = SubjectPattern;
                break
            case "timestamp":
                preFilledPattern = TimestampPattern;
                break
            default:
                break;
        }
        if (preFilledPattern) {
            form.setValue(`parameters.values.${index}.parts`, JSON.stringify(preFilledPattern, null, 2))
        } else {
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
                        <h1 className="text-xl md:text-3xl tracking-tighter text-left font-extrabold">Submit new pattern</h1>
                        <Button className="mb-6" variant="secondary" size="sm" onClick={fillDemo}>Fill form using a sample</Button>
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
                                            <FormDescription>e.g CircuitName (without the .circom extension)</FormDescription>
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
                                    name="parameters.senderDomain"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email sender domain</FormLabel>
                                            <FormControl>
                                                <Input placeholder="x.com" {...field} />
                                            </FormControl>
                                            <FormDescription>This is used for DKIM verification</FormDescription>
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
                                                <Input disabled={form.getValues("parameters.ignoreBodyHashCheck")} {...field} />
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
                                                            <Select value={field.value} onValueChange={ v => {form.setValue(`parameters.values.${i}.location`, v); autoFillRegex(i, v);}}>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="body" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectGroup>
                                                                        <SelectLabel>Location</SelectLabel>
                                                                        <SelectItem value="body">Email Body</SelectItem>
                                                                        <SelectItem value="header">Email Header</SelectItem>
                                                                        <SelectItem value="from">Sender</SelectItem>
                                                                        <SelectItem value="to">Recepient</SelectItem>
                                                                        <SelectItem value="subject">Subject</SelectItem>
                                                                        <SelectItem value="timestamp">Timestamp</SelectItem>
                                                                    </SelectGroup>
                                                                </SelectContent>
                                                            </Select>
                                                        </FormControl>
                                                        <FormMessage></FormMessage>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`parameters.values.${i}.maxLength`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Max length of extracted data</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" {...field} />
                                                        </FormControl>
                                                        <FormDescription></FormDescription>
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
