import { Entry } from "@prisma/client";
import { spawn } from "child_process";
import "@zk-email/helpers"
import path from "path";
import fs from "fs";
import { builder } from "./circuit-runner";
import { verify } from "crypto";

const CONTRACT_OUT_DIR = "./output/contract";
const CODE_OUT_DIR = "./output/code";
const CHAIN_ID = process.env.CHAIN_ID || "1";

export async function deployContract(entry: Entry): Promise<void> {
    const contractOutDir = path.join(CONTRACT_OUT_DIR, entry.slug)
    const contractDir = path.join(CODE_OUT_DIR, entry.slug, 'contract')
    const script = path.join(__dirname, "deploy-contract.sh")

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

export async function readContractAddresses(entry: Entry): Promise<{verifier: string, contract: string}> {
    const contractDir = path.join(CODE_OUT_DIR, entry.slug, 'contract');
    const logFile = path.join(contractDir, "broadcast", "Deploy.s.sol", CHAIN_ID, "run-latest.json")
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

export async function addDkimEntry(entry: Entry): Promise<void> {
   const domain = (entry.parameters as any).senderDomain as string;
}

export async function pubKeyHasher(pubkeyChunks: string[]): Promise<string> {
    const code = fs.readFileSync(path.join(__dirname, "pubkey-hasher.wasm"))
    const wc = await builder(code, null)
    const witness = await wc.calculateWitness({
        "pubkey": pubkeyChunks
    }, {})
    return witness[1].toString()
}