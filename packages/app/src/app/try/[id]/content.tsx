import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Entry } from "@prisma/client";
import { CheckedState } from "@radix-ui/react-checkbox";
import { useState, useEffect, FormEvent } from "react";
import { useGoogleAuth, fetchEmailList, fetchEmailsRaw, fetchProfile, useZkRegex } from "zk-regex-sdk";
import { RawEmailResponse } from "zk-regex-sdk/dist/hooks/useGmailClient";
import { Check, X } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import PostalMime from 'postal-mime';
import { parse } from "path";

export interface ContentProps {
    entry: Entry
}

type Email = RawEmailResponse & { selected: boolean, inputs?: any, error?: string, body?: string };


export function PageContent(props: ContentProps) {
    const entry = props.entry;
    const {
        googleAuthToken,
        isGoogleAuthed,
        loggedInGmail,
        scopesApproved,
        googleLogIn,
        googleLogOut,
    } = useGoogleAuth();

    const {
        createInputWorker,
        generateInputFromEmail,
        generateProofRemotely,
        proofStatus,
    } = useZkRegex();

    const [messages, setMessages] = useState<Email[]>([]);
    const [workerReady, setWorkerReady] = useState<boolean>(false);

    useEffect(() => {
        if (!workerReady) {
            return
        }
        filterEmails(entry.emailQuery)
    }, [googleAuthToken, workerReady])
    function filterEmails(query: string) {
        console.log("fetching emails");
        const fetchData = async () => {
            const res = await fetchEmailList(googleAuthToken.access_token, { q: query })
            const messageIds = res.messages.map((message: any) => message.id)
            const emails = await fetchEmailsRaw(googleAuthToken.access_token, messageIds);

            const processedEmails: Email[] = [];
            for (const email of emails) {
                processedEmails.push(await mapEmail(email));
            }
            setMessages(processedEmails)
        }
        fetchData();
    }

    useEffect(() => {
        createInputWorker(entry.id);
        setWorkerReady(true);
    }, [entry.id])

    async function startProofGeneration() {
        for (const message of messages) {
            if (!message.selected || !message.inputs) {
                continue;
            }
            const proofRes = await generateProofRemotely(entry.id, message.inputs);
            console.log("proofRes", proofRes);
        }
    }

    async function mapEmail(email: RawEmailResponse): Promise<Email> {
        let inputs
        let error, body: string | undefined;
        try {
            inputs = await generateInputFromEmail(entry.id, email.decodedContents);
            body = Buffer.from(inputs.emailBody).toString('utf-8');
            console.log("inputs", inputs)
        } catch (e: any) {
            console.error("Error generating circuit inputs: ", e);
            error = "Error generating circuit inputs: " + e;
        }
        return {
            ...email,
            selected: false,
            inputs,
            error,
            body,
        }
    }

    function displayGoogleLoginButton(isGoogleAuthed: boolean) {
        if (isGoogleAuthed) {
            return (
                <Button onClick={googleLogOut}>Logout</Button>
            )
        } else {
            return <Button onClick={googleLogIn}>Login with Google</Button>
        }
    }

    function displayEmailList() {
        if (messages.length === 0) {
            return <p>No emails found</p>
        } else {
            return (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">Select</TableHead>
                            <TableHead>Valid?</TableHead>
                            <TableHead>Sent on</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>Generated Input</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {messages.map((message, index) => (
                            <TableRow key={index}>
                                <TableCell className="font-medium"><Checkbox disabled={!!message.error} onCheckedChange={c => selectEmail(c, index)} checked={message.selected} /></TableCell>
                                <TableCell>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                {!message.error ? <Check color="green" /> : <X color="red" />}
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                {!message.error ? <p>Email is valid</p> : <p>{message.error}</p>}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </TableCell>
                                <TableCell>{new Date(+message.internalDate).toLocaleString()}</TableCell>
                                <TableCell>{message.subject}</TableCell>
                                <TableCell>{message.body?.slice(0, 100)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )
        }
    }

    function displayProofJobs() {
        if (Object.keys(proofStatus).length === 0) {
            return 
        } else {
            return (<Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[100px]">Job ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Estimated Time Left</TableHead>
                    <TableHead>Proof</TableHead>
                    <TableHead>Public Output</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {Object.keys(proofStatus).map((id) => (
                    <TableRow key={id}>
                        <TableCell className="font-medium">{proofStatus[id].id}</TableCell>
                        <TableCell>{proofStatus[id].status}</TableCell>
                        <TableCell>{proofStatus[id].estimatedTimeLeft.toFixed(1)}</TableCell>
                        <TableCell>{JSON.stringify(proofStatus[id].proof || "-- generating --")}</TableCell>
                        <TableCell>{JSON.stringify(proofStatus[id].publicOutput || "-- generating --")}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table> )
        }
    }

    function selectEmail(checked: CheckedState, key: number) {
        if (checked === true) {
            messages[key].selected = true
        } else {
            messages[key].selected = false
        }
        setMessages([...messages])
    }

    function uploadEmail(e: FormEvent<HTMLInputElement>) {
        console.log("uploading")
        if (e.currentTarget.files) {
            for (let i = 0; i < e.currentTarget.files.length; i++) {
                const file = e.currentTarget.files[i];
                console.log(file);
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const contents = e.target?.result;
                    console.log(contents);
                    if (typeof contents === "string") {
                        let inputs: any;
                        let error, body: string | undefined;
                        const parsed = await PostalMime.parse(contents)
                        try {
                            inputs = await generateInputFromEmail(entry.id, contents);
                            console.log(inputs);
                            body = Buffer.from(inputs.emailBody).toString('utf-8');
                        } catch (e: any) {
                            error = e.toString();
                        }
                        const email: Email = {
                            decodedContents: contents,
                            internalDate: "" + (parsed.date ? Date.parse(parsed.date) : file.lastModified),
                            subject: parsed.subject || file.name,
                            selected: false,
                            body,
                            inputs,
                            error,
                        }
                        setMessages([...messages, email])
                    }
                }
                reader.readAsText(file);
            }
        }
    }

    return (
        <div className="w-full py-20 lg:py-40">
            <div className="container mx-auto">
                <div className="flex flex-col gap-10">
                    <div className="flex text-left justify-center items-center gap-4 flex-col">
                        <div className="flex gap-2 flex-col">
                            <div className="mb-4">
                                <h2 className="text-4xl md:text-5xl tracking-tighter max-w-xl text-left font-extrabold mb-6">
                                    {entry.slug}
                                </h2>
                                <h4 className="text-2xl md:text-2xl tracking-tighter max-w-xl text-left font-extrabold mb-4 mt-4">
                                    Step 1: Provide an email sample
                                </h4>
                                <p className="mb-4">You can either connect your gmail or upload a .eml file. Your google API key is kept locally and never sent out to any of our servers.</p>
                                {loggedInGmail && <p className="mb-2"><b>Logged in as: {loggedInGmail}</b></p>}
                                <div className="flex flex-row">
                                    {displayGoogleLoginButton(isGoogleAuthed)}
                                    <div>
                                        <Input className='ml-4' type="file" onChange={e => uploadEmail(e)} />
                                    </div>
                                </div>
                            </div>
                            <div className="mb-4">
                                <h4 className="text-2xl md:text-2xl tracking-tighter max-w-xl text-left font-extrabold mb-4">
                                    Step 2: Select the emails you want the proofs created for
                                </h4>
                                <p>Choose the emails you want to create proofs for. You can select multiple emails.</p>
                                <p>If you select to create the proofs remotely, your emails will be sent to our secured service for proof generation. Emails will be deleted once the proofs are generated</p>
                                {displayEmailList()}
                                <div>
                                    <Button onClick={startProofGeneration}>Create proof locally</Button>
                                    <Button className='ml-4'>Create proof remotely</Button>
                                </div>
                            </div>
                            <div className="mb-4">
                                <h4 className="text-2xl md:text-2xl tracking-tighter max-w-xl text-left font-extrabold mb-4">
                                    Step 3: View generated proofs
                                </h4>
                                {displayProofJobs()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    )
}