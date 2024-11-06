import { Entry } from "@prisma/client";
import { spawn } from "child_process";
import "@zk-email/helpers"
import path from "path";
import fs from "fs";
import { builder } from "./circuit-runner";
import { verify } from "crypto";

import { bytesToHex, createPublicClient, createWalletClient, getAddress, Hex, http, isHex, parseAbi, toBytes, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia, foundry, optimismSepolia, arbitrumSepolia, arbitrum, optimism, Chain, mainnet, scrollSepolia, scroll } from 'viem/chains';
import { pki } from "node-forge";
import { toCircomBigIntBytes } from "@zk-email/helpers";
import { usePublicClient } from "wagmi";
import { Chain as ChainType } from "prisma/prisma-client"
import prisma from "../prisma";

const CONTRACT_OUT_DIR = "./output/contract";
const CODE_OUT_DIR = "./output/code";
const CHAIN_ID = process.env.CHAIN_ID || "1";
export const CHAINS: { [key: string]: Chain } = {
    "Ethereum": mainnet,
    "Ethereum Sepolia": sepolia,
    "Arbitrum Sepolia": arbitrumSepolia,
    "Arbitrum": arbitrum,
    "Optimism Sepolia": optimismSepolia,
    "Optimism": optimism,
    "Scroll Sepolia": scrollSepolia,
    "Scroll": scroll,
}

export async function deployContract(entry: Entry): Promise<void> {
    const contractDir = path.join(CODE_OUT_DIR, entry.slug, 'contract')
    const script = path.join(__dirname, "deploy-contract.sh")

    // spawn process
    return new Promise((resolve, reject) => {
        const builder = spawn('bash', [script, contractDir]);
        builder.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });
        builder.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });
        builder.on('close', (code) => {
            if (code) {
                console.error(`child process exited with code ${code}`);
                return reject(new Error(`child process exited with code ${code}`))
            }
            resolve()
        });
    })
}

export async function deployContractWithModal(entry: Entry, chainName: string): Promise<void> {
    const contractDir = path.join(CODE_OUT_DIR, entry.slug, 'contract');
    const chain = await prisma.chain.findFirstOrThrow({where: {chainName}})
    
    // Environment variables needed for deployment
    const env = {
        ...process.env,
        RPC_URL: chain.rpcUrl,
        CHAIN_ID: chain.chainId,
        DKIM_REGISTRY: chain.dkimContractAddress,
        PROJECT_SLUG: entry.slug,
        CIRCUIT_NAME: (entry.parameters as any).name as string,
        CONTRACT_PATH: contractDir,
    };

    return new Promise((resolve, reject) => {
        const deployer = spawn('python', ['-m', 'modal', 'run', '--detach', 'modal/deploy-contract.py'], { env });

        deployer.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });

        deployer.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        deployer.on('close', (code) => {
            if (code !== 0) {
                console.error(`Modal deployment process exited with code ${code}`);
                reject(new Error(`Modal deployment process exited with code ${code}`));
            } else {
                console.log('Modal deployment completed successfully');
                resolve();
            }
        });
    });
}

export async function buildContract(entry: Entry): Promise<void> {
    const contractOutDir = path.join(CONTRACT_OUT_DIR, entry.slug)
    const contractDir = path.join(CODE_OUT_DIR, entry.slug, 'contract')
    const script = path.join(__dirname, "build-contract.sh")

    // spawn process
    return new Promise((resolve, reject) => {
        const builder = spawn('bash', [script, contractDir, contractOutDir]);
        builder.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });
        builder.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });
        builder.on('close', (code) => {
            // check if file exists
            if (!fs.existsSync(path.join(contractOutDir, "verifier.sol", "Groth16Verifier.json"))) {
                console.error('Error building contract');
                return reject(new Error("Output file not found"));
            }
            if (code) {
                console.error(`child process exited with code ${code}`);
                return reject(new Error(`child process exited with code ${code}`))
            }
            resolve()
        });
    })
}


export async function readContractAddresses(entry: Entry): Promise<{ verifier: string, contract: string }> {
    const contractDir = path.join(CODE_OUT_DIR, entry.slug, 'contract');
    let logFile = path.join(contractDir, "broadcast", "Deploy.s.sol", CHAIN_ID, "run-latest.json")
    if (!fs.existsSync(logFile)) {
        logFile = path.join(contractDir, "contract-deploy.json")
    }
    const log = JSON.parse(fs.readFileSync(logFile, "utf-8"))
    const result = {
        verifier: "",
        contract: "",
    };
    for (const tx of log.transactions) {
        if (tx.contractName === "Groth16Verifier") {
            result.verifier = tx.contractAddress;
        }
        if (tx.contractName === "Contract") {
            result.contract = tx.contractAddress;
        }
    }
    return result;
}

export async function addDkimEntry(entry: Entry, chainName: string): Promise<void> {
    const chain = await prisma.chain.findFirstOrThrow({where: {chainName}});
    if (!chain.dkimContractAddress) {
        throw new Error("DKIM registry not found for chain")
    }
    if (!CHAINS[chainName]) {
        throw new Error(`Chain ${chainName} not found`)
    }
    const domain = (entry.parameters as any).senderDomain as string;
    const selector = (entry.parameters as any).dkimSelector as string;
    const res = await fetch(`https://archive.prove.email/api/key?domain=${domain}`);
    const body = await res.json();

    if (!body.length) {
        throw new Error(`No DKIM key found for domain ${domain}`);
    }

    // If selector is provided, only add the key for that selector
    // Otherwise, add all keys to the registry
    let keys: { selector: string, value: string }[] = [];
    if (selector) {
        keys.push(body.find((b: { selector: string }) => b.selector === selector));
    } else {
        keys = body.map((b: { selector: string, value: string }) => ({ selector: b.selector, value: b.value }));
    }

    console.log(`Adding ${keys.length} DKIM keys to ${chainName} registry for domain ${domain}`);

    for (const key of keys) {
        const pubKeyData = key.value.split(";").filter((part: string) => part.includes("p="));
        if (pubKeyData[0].length < 4) {
            console.log(`No valid DKIM key found for domain ${domain} selector ${key.selector}. Found ${pubKeyData}.`);
            continue;
        }
        const pkiStr = `-----BEGIN PUBLIC KEY-----${pubKeyData[0].split("=")[1]}-----END PUBLIC KEY-----`;
        const pubkey = pki.publicKeyFromPem(pkiStr);
        const chunkedKey = toCircomBigIntBytes(BigInt(pubkey.n.toString()));
        const hashedKey = BigInt(await pubKeyHasher(chunkedKey));

        const isDKIMPublicKeyHashValid = await checkDKIMPublicKeyHash(domain, hashedKey, chain);
        if (isDKIMPublicKeyHashValid) {
            console.log(`DKIM key already exists for domain ${domain} selector ${key.selector}`);
            continue;
        }

        const privateKey = process.env.PRIVATE_KEY;
        if (!privateKey) {
            throw new Error('PRIVATE_KEY not found in environment variables');
        }
        const account = privateKeyToAccount(privateKey as Hex);
        const client = createWalletClient({
            account,
            chain: CHAINS[chainName],
            transport: http()
        });


        // Prepare contract interaction
        const dkimContract = chain.dkimContractAddress;
        if (!dkimContract) {
            throw new Error('DKIM_REGISTRY not found in environment variables');
        }
        const contractAddress = getAddress(dkimContract as Hex); // Replace 'X' with the actual contract address
        const abi = [{
            name: 'setDKIMPublicKeyHash',
            type: 'function',
            inputs: [
                { name: 'domain', type: 'string' },
                { name: 'pubkeyHash', type: 'bytes32' }
            ],
        }];

        // Send transaction
        const hash = await client.writeContract({
            address: contractAddress,
            abi,
            functionName: 'setDKIMPublicKeyHash',
            args: [domain, bytesToHex(toBytes(hashedKey), { size: 32 })],
        });

        console.log(`Transaction sent: ${hash}`);
    }
}

export async function checkDKIMPublicKeyHash(domain: string, pubkeyHash: bigint, chain: ChainType): Promise<boolean> {
    const contractAddress = getAddress(chain.dkimContractAddress as Hex); // Replace 'X' with the actual contract address
    const abi = parseAbi(["function isDKIMPublicKeyHashValid( string memory domainName, bytes32 publicKeyHash) external view returns (bool)"]);
    // use viem to read the contract function
    const publicClient = createPublicClient({
        chain: CHAINS[chain.chainName],
        transport: http()
    });

    const isDKIMPublicKeyHashValid = await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: 'isDKIMPublicKeyHashValid',
        args: [domain, bytesToHex(toBytes(pubkeyHash), { size: 32 })],
    });
    return isDKIMPublicKeyHashValid;
}

export async function pubKeyHasher(pubkeyChunks: string[]): Promise<string> {
    const code = fs.readFileSync(path.join(__dirname, "pubkey-hasher.wasm"))
    const wc = await builder(code, null)
    const witness = await wc.calculateWitness({
        "pubkey": pubkeyChunks
    }, {})
    return witness[1].toString()
}