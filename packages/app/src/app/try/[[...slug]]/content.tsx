import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Chain, ContractDeployment, Entry } from "@prisma/client";
import { CheckedState } from "@radix-ui/react-checkbox";
import { useState, useEffect, FormEvent } from "react";
import { useGoogleAuth, fetchEmailList, fetchEmailsRaw, useZkEmailSDK } from "@zk-email/zk-email-sdk";
import { Check, LoaderCircle, Trash, X, RefreshCw } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import PostalMime from 'postal-mime';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { BaseError, Hex } from "viem";
import '@rainbow-me/rainbowkit/styles.css';
import { circuitOutputToArgs, parseOutput } from "@/lib/contract";
import { SimpleDialog } from "@/components/simple-dialog";
import { calculateSignalLength } from "@/lib/code-gen/utils";
import { redeployContracts } from "./action";
import { getProofLogs } from "@/lib/models/logs";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectValue } from "@/components/ui/select";
import { SelectTrigger } from "@radix-ui/react-select";
import { FormControl, FormField } from "@/components/ui/form";

export interface ContentProps {
    entry: Entry,
    supportedChains: Chain[],
    deployedContracts: ContractDeployment[],
}

type RawEmailResponse = {
    subject: string;
    internalDate: string;
    decodedContents: string;
};

type Email = RawEmailResponse & { selected: boolean, inputs?: any, error?: string, body?: string };

const chains = {
    "Ethereum": "",
    "ETH Sepolia": "",
    "Arbitrum Testnet": "",
    "Arbitrum": ""
}

export function PageContent(props: ContentProps) {
    const workers = new Map<string, boolean>();
    const entry = props.entry;
    const supportedChains = props.supportedChains;
    const deployedContracts = props.deployedContracts;
    const {
        googleAuthToken,
        isGoogleAuthed,
        loggedInGmail,
        googleLogIn,
        googleLogOut,
    } = useGoogleAuth();

    const {
        createInputWorker,
        generateInputFromEmail,
        generateProofRemotely,
        proofStatus,
        inputWorkers,
        loadProofsFromStorage,
        deleteProofFromStorage
    } = useZkEmailSDK();

    const account = useAccount();
    const { isConnected } = useAccount() // Add this hook to check if wallet is connected

    const [messages, setMessages] = useState<Email[]>([]);
    const [signalLength, setSignalLength] = useState<number>(1);
    const [externalInputs, setExternalInputs] = useState<Record<string,string>>({});
    const [isRedeploying, setIsRedeploying] = useState<boolean>(false);
    const [proofLogs, setProofLogs] = useState<Record<string, string>>({});
    const [emailPageToken, setEmailPageToken] = useState<string|undefined>("0");
    const [selectedChain, setSelectedChain] = useState<string>("Ethereum Sepolia");
    const [selectedContracts, setSelectedContracts] = useState<(ContractDeployment|null)>(null);

    useEffect(() => {
        if (!inputWorkers[entry.slug]) {
            return
        }
        filterEmails(entry.emailQuery)
    }, [googleAuthToken, inputWorkers])

    useEffect(() => {
        const deployed = deployedContracts.find(d => d.chainName == selectedChain)
        if (!deployed) {
            return setSelectedContracts(null);
        } 
        setSelectedContracts(deployed)
    }, [selectedChain])

    function filterEmails(query: string) {
        const fetchData = async () => {
            if (emailPageToken === undefined) {
                return
            }
            const res = await fetchEmailList(googleAuthToken.access_token, { q: query, pageToken: emailPageToken, maxResults: 3})
            setEmailPageToken(res.nextPageToken)
            if (!res.messages) {
                return
            }
            const messageIds = res.messages.map((message: any) => message.id)
            const emails = await fetchEmailsRaw(googleAuthToken.access_token, messageIds);

            const processedEmails: Email[] = [];
            for (const email of emails) {
                const parsed = await PostalMime.parse(email.decodedContents);
                const parsedEmail = {
                    ...email,
                    subject: parsed.subject || "Error parsing subject",
                }
                processedEmails.push(await mapEmail(parsedEmail));
            }
            setMessages([...messages, ...processedEmails])
        }
        if (googleAuthToken) {
            fetchData();
        }
    }

    useEffect(() => {
        if (workers.get(entry.slug)) {
            return;
        }
        createInputWorker(entry.slug);
        workers.set(entry.slug, true);
        const entryExternalInputs = (entry.parameters as any).externalInputs as {name: string, maxLength: number}[] || [];

        setSignalLength(calculateSignalLength(entry))
        for (const input of entryExternalInputs) {
            setExternalInputs({
                ...externalInputs,
                [input.name]: "",
            });
        }
        loadProofsFromStorage(entry.slug);
    }, [])

    useEffect(() => {
        for (const id of Object.keys(proofStatus)) {
            if (["COMPLETED", "ERROR"].includes(proofStatus[id].status) && !proofLogs[id]) {
                getProofLogs(entry.slug, id).then((logs) => {
                    setProofLogs({
                        ...proofLogs,
                        [id]: logs,
                    })
                })
            }
        }
    }, [proofStatus])

    const { data: hash, error, isPending, writeContract } = useWriteContract();

    const { isLoading: isConfirming, isSuccess: isConfirmed, isError, error: txError } =
    useWaitForTransactionReceipt({
      hash,
    })

    async function startProofGeneration() {
        for (const message of messages) {
            if (!message.selected || !message.inputs) {
                continue;
            }
            const proofRes = await generateProofRemotely(entry.slug, message.inputs);
            console.log("proofRes", proofRes);
        }
    }

    async function mapEmail(email: RawEmailResponse): Promise<Email> {
        let inputs
        let error, body: string | undefined;
        try {
            inputs = await generateInputFromEmail(entry.slug, email.decodedContents, externalInputs);
            body = inputs.emailBody ? Buffer.from(inputs.emailBody).toString('utf-8') : undefined;
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

    function redeployContractsHandler() {
        redeployContracts(entry, selectedChain);
        setIsRedeploying(true);
        setTimeout(() => {window.location.reload()}, 30000);
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

    function displayExternalInputForm() {
        if (Object.keys(externalInputs).length === 0) {
            return <></>
        } else {
            return (<>
            <p className="mb-4">This pattern requires you to also submit an external input to the circuit.</p>
            {Object.keys(externalInputs).map(name => {
                return (<div key={name}><b>Input {name}</b><br/><Input placeholder={name} onChange={(e) => {setExternalInputs({
                    ...externalInputs,
                    [name]: e.target.value,
                })}}></Input></div>)
            })}
            </>)
        }
    }

    function displayEmailList() {
        if (messages.length === 0) {
            return <p>No emails found</p>
        } else {
            return (
                <>
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
                                <TableCell>{JSON.stringify({...message.inputs, emailBody: message.inputs?.emailBody ? "<trimmed>": undefined, emailHeader: "<trimmed>", signature: "<trimmed>"}, null, 2)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {emailPageToken !== undefined && (<div className="flex flex-row justify-center pt-2 pb-4" onClick={() => filterEmails(entry.emailQuery)}>
                    <RefreshCw className="w-5 h-5 mr-2"/> Load more emails
                </div>)}
                </>
            )
        }
    }

    function renderEstimatedTimeLeft(status: string, estimatedTimeLeft: number) {
        if (status === "COMPLETED") {
            return "Completed";
        } else if (estimatedTimeLeft > 0) {
            return estimatedTimeLeft.toFixed(1) + "s";
        } else {
            return "Taking longer than expected...";
        }
    }

    function displayProofJobs() {
        if (Object.keys(proofStatus).length === 0) {
            return 
        } else {
            return (<Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[20px]"></TableHead>
                    <TableHead className="w-[100px]">Job ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Estimated Time Left</TableHead>
                    <TableHead>View Logs</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {Object.keys(proofStatus).map((id) => (
                    <TableRow key={id}>
                        <TableCell><Trash className="text-red-500" onClick={() => deleteProofFromStorage(id)} /></TableCell>
                        <TableCell className="font-medium">{proofStatus[id].id}</TableCell>
                        <TableCell>{proofStatus[id].status}</TableCell>
                        <TableCell>{renderEstimatedTimeLeft(proofStatus[id].status, proofStatus[id].estimatedTimeLeft)}</TableCell>
                        <TableCell><SimpleDialog trigger={<Button variant="link">View</Button>} title={"Error logs"} wide={true}>
                            <div>
                                <pre>{proofLogs[id] || "No logs yet"}</pre>
                            </div>
                        </SimpleDialog></TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table> )
        }
    }

    function verifyProof(id: string) {
        if (!isConnected || !selectedContracts) {
            return // Don't proceed if wallet is not connected
        }
        
        writeContract({
            abi: [ {
                "inputs": [
                {
                    "internalType": "uint256[2]",
                    "name": "a",
                    "type": "uint256[2]"
                },
                {
                    "internalType": "uint256[2][2]",
                    "name": "b",
                    "type": "uint256[2][2]"
                },
                {
                    "internalType": "uint256[2]",
                    "name": "c",
                    "type": "uint256[2]"
                },
                {
                    "internalType": `uint256[${signalLength}]`,
                    "name": "signals",
                    "type": `uint256[${signalLength}]`
                }
                ],
                "name": "verify",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }] as const,
            address: selectedContracts.contractAddress! as Hex,
            functionName: "verify",
            args: circuitOutputToArgs({
                proof: proofStatus[id].proof,
                public: proofStatus[id].publicOutput,
            }) as any
        }, {
            onError: console.log,
        }); 
    }
    
    function displayProofJobsToBeVerified() {
        if (Object.keys(proofStatus).length === 0) {
            return 
        } else {
            return (<Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[100px]">Verify</TableHead>
                    <TableHead className="w-[100px]">Job ID</TableHead>
                    <TableHead>Proof Output Decoded</TableHead>
                    <TableHead>Proof</TableHead>
                    <TableHead>Public Output</TableHead>
                    <TableHead>Contract Calldata</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {Object.keys(proofStatus).filter(id => proofStatus[id].status === "COMPLETED").map((id) => (
                    <TableRow key={id}>
                        <TableCell>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            disabled={!isConnected || isPending || isConfirming}  
                                            onClick={() => verifyProof(id)}
                                        >
                                            Verify
                                        </Button>
                                    </TooltipTrigger>
                                    {!isConnected && (
                                        <TooltipContent>
                                            <p>Please connect your wallet first</p>
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </TooltipProvider>
                        </TableCell>
                        <TableCell className="font-medium">{proofStatus[id].id}</TableCell>
                        <TableCell>{JSON.stringify(parseOutput(entry, proofStatus[id].publicOutput), null, 2)}</TableCell>
                        <TableCell><SimpleDialog title="Proof" trigger={<Button variant="link">View</Button>}><code><pre>{JSON.stringify(proofStatus[id].proof, null, 2)}</pre></code></SimpleDialog></TableCell>
                        <TableCell><SimpleDialog title="Public Output" trigger={<Button variant="link">View</Button>}><code><pre>{JSON.stringify(proofStatus[id].publicOutput, null, 2)}</pre></code></SimpleDialog></TableCell>
                        <TableCell><SimpleDialog title="Contract Calldata" trigger={<Button variant="link">View</Button>}><code><pre>{JSON.stringify(circuitOutputToArgs({ proof: proofStatus[id].proof, public: proofStatus[id].publicOutput }), null, 2)}</pre></code></SimpleDialog></TableCell>
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
        if (e.currentTarget.files) {
            for (let i = 0; i < e.currentTarget.files.length; i++) {
                const file = e.currentTarget.files[i];
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const contents = e.target?.result;
                    if (typeof contents === "string") {
                        let inputs: any;
                        let error, body: string | undefined;
                        const parsed = await PostalMime.parse(contents)
                        try {
                            inputs = await generateInputFromEmail(entry.slug, contents, externalInputs);
                            body = inputs.emailBody ? Buffer.from(inputs.emailBody).toString('utf-8') : undefined;
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
                        <div className="flex gap-2 flex-col w-full">
                            <div className="mb-4">
                                <h2 className="text-3xl md:text-5xl tracking-tighter text-left font-extrabold mb-6">
                                    {entry.slug}
                                </h2>
                                <p>{entry.description}</p>
                                <h4 className="text-xl md:text-2xl tracking-tighter text-left font-extrabold mb-4 mt-4">
                                    Step 1: Provide an email sample
                                </h4>
                                {displayExternalInputForm()}
                                <p className="mb-4 mt-4">You can either connect your gmail or upload a .eml file. Your google API key is kept locally and never sent out to any of our servers.</p>
                                {loggedInGmail && <p className="mb-2"><b>Logged in as: {loggedInGmail}</b></p>}
                                <div className="flex flex-row">
                                    {displayGoogleLoginButton(isGoogleAuthed)}
                                    <div>
                                        <Input className='ml-4' type="file" onChange={e => uploadEmail(e)} />
                                    </div>
                                </div>

                            </div>
                            <div className="mb-4">
                                <h4 className="text-xl md:text-2xl tracking-tighter text-left font-extrabold mb-4">
                                    Step 2: Select the emails you want the proofs created for
                                </h4>
                                <p>Choose the emails you want to create proofs for. You can select multiple emails.</p>
                                <p>If you select to create the proofs remotely, your emails will be sent to our secured service for proof generation. Emails will be deleted once the proofs are generated</p>
                                {displayEmailList()}
                                <div>
                                    <Button onClick={startProofGeneration}>Create proof remotely</Button>
                                    <Button className='ml-4' disabled>Create proof locally (WIP)</Button>
                                </div>
                            </div>
                            <div className="mb-4">
                                <h4 className="text-2xl md:text-2xl tracking-tighter max-w-xl text-left font-extrabold mb-4">
                                    Step 3: View generated proofs
                                </h4>
                                {displayProofJobs()}
                            </div>
                            <div className="mb-4">
                                <h4 className="text-2xl md:text-2xl tracking-tighter max-w-xl text-left font-extrabold mb-4">
                                    Step 4: Verify proofs on-chain 
                                </h4>
                                <Select value={selectedChain} onValueChange={setSelectedChain}>
                                    <SelectTrigger>
                                        Deploy to <b className="font-bold outline-1 outline-black outline pl-2 pr-2 ml-2">{selectedChain}</b>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectLabel>Chain</SelectLabel>
                                            {supportedChains.map(e => (<SelectItem key={e.id} value={e.chainName}>{e.chainName}</SelectItem>))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                                <div className="flex flex-row items-center">
                                    {selectedContracts?.error && <p>Error deploying contract: {selectedContracts.error}</p>}
                                </div>
                                <div className="flex flex-row items-center">
                                    <p><b className="font-extrabold">Verification Contract:</b> {selectedContracts?.contractAddress || "Not deployed yet"}</p>
                                    <SimpleDialog title="Verification Contract" trigger={<Button className="font-extrabold" variant="link">View ABI</Button>}>
                                        <code className="text-xs">
                                            <pre>
                                                {JSON.stringify([{
                                                    "inputs": [
                                                        {
                                                            "internalType": "uint256[2]",
                                                            "name": "a",
                                                            "type": "uint256[2]"
                                                        },
                                                        {
                                                            "internalType": "uint256[2][2]",
                                                            "name": "b",
                                                            "type": "uint256[2][2]"
                                                        },
                                                        {
                                                            "internalType": "uint256[2]",
                                                            "name": "c",
                                                            "type": "uint256[2]"
                                                        },
                                                        {
                                                            "internalType": `uint256[${signalLength}]`,
                                                            "name": "signals",
                                                            "type": `uint256[${signalLength}]`
                                                        }
                                                    ],
                                                    "name": "verify",
                                                    "outputs": [],
                                                    "stateMutability": "nonpayable",
                                                    "type": "function"
                                                }], null, 2)}
                                            </pre>
                                        </code>
                                    </SimpleDialog>
                                </div>
                                <p><b className="font-bold">Groth16 Contract:</b> {selectedContracts?.verifierContractAddress || "Not deployed yet"}</p>
                                <div className="flex flex-row">
                                    <ConnectButton />
                                    <Button className="ml-4" variant="outline" onClick={redeployContractsHandler}>{isRedeploying ? <><LoaderCircle className="animate-spin" /> Reloading in ~30s...</> : "Redeploy Contracts"}</Button>
                                </div>
                                {displayProofJobsToBeVerified()}
                                {hash && <p>Transaction hash: {hash}</p>}
                                {isConfirming && <div>Waiting for confirmation...</div>}
                                {isConfirmed && <div>Transaction is successful.</div>}
                                {error && (
                                    <div>Error: {(error as BaseError).shortMessage || error.message}</div>
                                )}
                                {txError && (
                                    <div>Error: {(txError as BaseError).shortMessage || txError.message}</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    )
}