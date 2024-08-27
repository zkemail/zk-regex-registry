'use client';
import { Checkbox } from "./ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectLabel, SelectItem } from "./ui/select";
import { Plus, Trash } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Textarea } from "./ui/textarea";
import { z, ZodObject } from "zod";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formSchema } from "@/app/submit/form";
import { FromAddressPattern, SubjectPattern, TimestampPattern, ToAddressPattern } from "@/app/submit/patterns";
import { Entry } from "@prisma/client";
import { useEffect } from "react";

interface EntryFormProps {
    onSubmit: (values: z.infer<typeof formSchema>) => void,
    entry: Entry,
}

export function EntryForm( {onSubmit, entry}: EntryFormProps) {
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
                enableMasking: false,
                shaPrecomputeSelector: "",
                emailBodyMaxLength: 4032,
                senderDomain: "",
                dkimSelector: "",
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
                ],
                externalInputs: []
            }

        },
    })

    useEffect(() => {
        const parameters = entry.parameters as any;
        let filledForm: { [key: string]: any } = {
            "title": entry.title,
            "description": entry.description,
            "slug": entry.slug,
            "tags": entry.tags.join(","),
            "emailQuery": entry.emailQuery,
            "useNewSdk": parameters.version === "v2",
            "parameters.name": parameters.name,
            "parameters.ignoreBodyHashCheck": parameters.ignoreBodyHashCheck,
            "parameters.enableMasking": !!parameters.enableMasking,
            "parameters.shaPrecomputeSelector": parameters.shaPrecomputeSelector,
            "parameters.senderDomain": parameters.senderDomain,
            "parameters.emailBodyMaxLength": parameters.emailBodyMaxLength,
            "parameters.dkimSelector": parameters.dkimSelector,
        }
        for (let i = 0; i < parameters.values.length; i++) {
            const value = parameters.values[i];
            filledForm[`parameters.values.${i}.name`] = value.name;
            filledForm[`parameters.values.${i}.location`] = value.location;
            filledForm[`parameters.values.${i}.maxLength`] = value.maxLength;
            filledForm[`parameters.values.${i}.regex`] = value.regex;
            filledForm[`parameters.values.${i}.prefixRegex`] = value.prefixRegex;
            filledForm[`parameters.values.${i}.parts`] = JSON.stringify(value.parts, null, 2);
        }
        for (let i = 0; i < parameters.externalInputs.length; i++) {
            const value = parameters.externalInputs[i];
            filledForm[`parameters.externalInputs.${i}.name`] = value.name;
            filledForm[`parameters.externalInputs.${i}.maxLength`] = value.maxLength;
        }

        for (let v of Object.keys(filledForm)) {
            form.setValue(v as any, filledForm[v])
        }
    }, []);

    const { fields, append, remove } = useFieldArray({control: form.control, name: "parameters.values"})
    const { fields: externalInputs, append: appendInput, remove: removeInput } = useFieldArray({control: form.control, name: "parameters.externalInputs"})

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

    function addExternalInputObject() {
        appendInput({
            name: "",
            maxLength: 64
        })
    }

    function removeExternalInputObject(i: number) {
        removeInput(i)
    }

    async function onFormSubmit(values: z.infer<typeof formSchema>) {
        await onSubmit(values)
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
    
    return (
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-8 w-full">
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
                name="parameters.enableMasking"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Enable email masking?</FormLabel>
                        <FormControl>
                            <Checkbox className="ml-2" checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormDescription>Enable and send a mask to return a masked email in the public output</FormDescription>
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
                name="parameters.dkimSelector"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>DKIM selector</FormLabel>
                        <FormControl>
                            <Input placeholder="dkim" {...field} />
                        </FormControl>
                        <FormDescription>(Optional) DKIM selector that is found in the email header</FormDescription>
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
                name="parameters.emailBodyMaxLength"
                render={({ field, formState }) => (
                    <FormItem>
                        <FormLabel>Max Email Body Length</FormLabel>
                        <FormControl>
                            <Input type="number" disabled={form.getValues("parameters.ignoreBodyHashCheck")} {...field} />
                        </FormControl>
                        <FormDescription>Must be a multiple of 64</FormDescription>
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
                                        <Select value={field.value} onValueChange={ v => {form.setValue(`parameters.values.${i}.location`, v); autoFillRegex(i, v); }}>
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
            <div className="flex flex-row items-center">
                <b>External Inputs</b>
                <Button type="button" onClick={() => addExternalInputObject()} variant="outline" className="ml-4"><Plus color="green"/>Add new value to extract</Button>
            </div>
            {externalInputs.map((v, i) => {
                return (
                    <div className='pl-8 pb-4' key={v.id}>
                        <div className="flex flex-row items-center"><b>Field #{i + 1}</b><Trash color="red" className="ml-2" onClick={() => removeExternalInputObject(i)}/></div>
                        <FormField
                            control={form.control}
                            name={`parameters.externalInputs.${i}.name`}
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
                            name={`parameters.externalInputs.${i}.maxLength`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Max length of input</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormDescription></FormDescription>
                                    <FormMessage></FormMessage>
                                </FormItem>
                            )}
                        />
                    </div>
                )})}
            <Button type="submit">Submit</Button>
        </form>
    </Form>
    )
}