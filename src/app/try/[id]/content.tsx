import { Button } from "@/components/ui/button";
import { Entry } from "@prisma/client";
import { useState, useEffect } from "react";
import { useGoogleAuth, fetchEmailList, fetchEmailsRaw, fetchProfile, useZkRegex } from "zk-regex-sdk";
import { RawEmailResponse } from "zk-regex-sdk/dist/hooks/useGmailClient";

export interface ContentProps {
    entry: Entry
}

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
    }= useZkRegex();

    const [messages, setMessages] = useState<RawEmailResponse[]>([]);
    const [input, setInput] = useState<any>();

    useEffect(() => {
        filterEmails(entry.emailQuery)
    }, [googleAuthToken])
    function filterEmails(query: string) {
        console.log("fetching emails");
        const fetchData = async () => {
            const res = await fetchEmailList(googleAuthToken.access_token, { q: query })
            const messageIds = res.messages.map((message: any) => message.id)
            const emails = await fetchEmailsRaw(googleAuthToken.access_token, messageIds);
            setMessages(emails)
        }
        fetchData();
    }

    useEffect(() => {
        createInputWorker(entry.id);
    }, [entry.id])

    async function startInputGeneration() {
        console.log("starting input generation");
        for (const message of messages) {
            console.log("generating input for ", message.subject)
            const result  = await generateInputFromEmail(entry.id, message.decodedContents);
            console.log("result", result);
        }
    }

    function login() {
        console.log("test");
        googleLogIn();
    }

    function displayGoogleLoginButton(isGoogleAuthed: boolean) {
        if (isGoogleAuthed) {
            return (
                <div>
                    <p>Logged in as: {loggedInGmail}</p>
                    <Button onClick={() => { console.log("done") }}>Logout</Button>
                </div>
            )
        } else {
            return <Button onClick={login}>Login with Google</Button>
        }
    }
    return (
        <div className="w-full py-20 lg:py-40">
            <div className="container mx-auto">
                <div className="flex flex-col gap-10">
                    <div className="flex text-left justify-center items-center gap-4 flex-col">
                        <div className="flex gap-2 flex-col">
                            <div className="mb-4">
                                <h4 className="text-2xl md:text-2xl tracking-tighter max-w-xl text-left font-extrabold mb-4">
                                    Step 1: Provide an email sample
                                </h4>
                                <p>You can either connect your gmail or upload a .eml file. Your google API key is kept locally and never sent out to any of our servers.</p>
                                <div>
                                    {displayGoogleLoginButton(isGoogleAuthed)}
                                    <Button className='ml-4' onClick={() => { console.log("uploading email") }}>Upload Emails (.eml)</Button>
                                </div>
                            </div>
                            <div className="mb-4">
                                <h4 className="text-2xl md:text-2xl tracking-tighter max-w-xl text-left font-extrabold mb-4">
                                    Step 2: Select the emails you want the proofs created for
                                </h4>
                                <p>Choose the emails you want to create proofs for. You can select multiple emails.</p>
                                <p>If you select to create the proofs remotely, your emails will be sent to our secured service for proof generation. Emails will be deleted once the proofs are generated</p>
                                {messages.length > 0 &&
                                    <ul>
                                        {messages.map((message, index) => (
                                            <li key={index}>{message.subject}</li>
                                        ))}
                                    </ul>
                                }
                                <div>
                                    <Button onClick={startInputGeneration}>Create proof locally</Button>
                                    <Button className='ml-4'>Create proof remotely</Button>
                                </div>
                            </div>
                            <div className="mb-4">
                                <h4 className="text-2xl md:text-2xl tracking-tighter max-w-xl text-left font-extrabold mb-4">
                                    Step 3: Verify the proofs directly in your browswer
                                </h4>
                                <p>Choose the emails you want to create proofs for. You can select multiple emails.</p>
                                <p>If you select to create the proofs remotely, your emails will be sent to our secured service for proof generation. Emails will be deleted onces the proofs are generated</p>
                                <div>
                                    <Button>Create proof locally</Button>
                                    <Button className='ml-4'>Create proof remotely</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    )
}