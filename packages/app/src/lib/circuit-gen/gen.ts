import path from "path"
import fs from "fs";
import { spawn } from "child_process";
import { log } from "../log";
import { Storage } from "@google-cloud/storage"

const CIRCUIT_OUT_DIR = "./output/circuit"
const CODE_OUT_DIR = "./output/code"
const PTAU_PATH = process.env.PTAU_PATH || ""

export function circuitCompilationLogPath(circuitSlug: string): string {
    return path.join(CIRCUIT_OUT_DIR, circuitSlug, 'circuit.log');
}

export function installProjectDeps(circuitSlug: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const c = spawn("yarn", ["install"], {
            cwd: path.join(CODE_OUT_DIR, circuitSlug)
        });
        // on error
        c.stderr.on('data', (data) => {
            process.stderr.write(`stdout: ${data}`);
        });
        c.on('exit', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject();
            }
        });
    });
}

export function compileCircuit(circuitSlug: string, circuitName: string, force: boolean): Promise<void> {
    const circuitLogPath = circuitCompilationLogPath(circuitSlug);
    const circuitDirectory = path.join(CIRCUIT_OUT_DIR, circuitSlug);

    if (fs.existsSync(circuitDirectory) && !force) {
        console.log("Skipping compilation");
        return Promise.resolve();
    }

    fs.mkdirSync(circuitDirectory, { recursive: true });

    console.log(`Compiling circuit for ${circuitSlug} with name ${circuitName} and force ${force}`);
    log(circuitLogPath, `Compiling circuit for ${circuitSlug} with name ${circuitName} and force ${force}`, 'circuit-compile');

    fs.writeFileSync(circuitLogPath, "");

    return new Promise<void>((resolve, reject) => {
        const c = spawn("python", ["-m", "modal", "run", "--detach", "modal/compile-circuit.py"], {
            env: {
                ...process.env,
                PROJECT_SLUG: circuitSlug,
                PROJECT_PATH: path.join(process.cwd(), CODE_OUT_DIR, circuitSlug)
            }
        });

        c.stdout.on('data', (data) => {
            process.stdout.write(`stdout: ${data}`);
            log(circuitLogPath, data, 'circuit-compile');
        });

        c.stderr.on('data', (data) => {
            process.stderr.write(`stderr: ${data}`);
            log(circuitLogPath, data, 'circuit-compile');
        });

        c.on('exit', (code, signal) => {
            if (code === 0) {
                console.log(`Compiled circuit for ${circuitSlug} with name ${circuitName}`);
                log(circuitLogPath, `Compiled circuit for ${circuitSlug} with name ${circuitName}`, 'circuit-compile');
                resolve();
            } else {
                console.log(`Process exited with code ${code}`);
                log(circuitLogPath, `Process exited with code ${code}`, 'circuit-compile');
                reject();
            }
        });
    });
}

export function compileCircuitModal(circuitSlug: string, circuitName: string, force: boolean): Promise<void> {
    const circuitLogPath = circuitCompilationLogPath(circuitSlug);
    const circuitDirectory = path.join(CIRCUIT_OUT_DIR, circuitSlug);

    if (fs.existsSync(circuitDirectory) && !force) {
        console.log("Skipping compilation");
        return Promise.resolve();
    }

    fs.mkdirSync(circuitDirectory, { recursive: true });

    console.log(`Compiling circuit for ${circuitSlug} with name ${circuitName} and force ${force}`);
    log(circuitLogPath, `Compiling circuit for ${circuitSlug} with name ${circuitName} and force ${force}`, 'circuit-compile');

    fs.writeFileSync(circuitLogPath, "");

    return new Promise<void>((resolve, reject) => {
        const c = spawn("python", ["-m", "modal", "run", "--detach", "modal/compile-circuit.py"], {
            env: {
                ...process.env,
                PROJECT_SLUG: circuitSlug,
                PROJECT_PATH: path.join(process.cwd(), CODE_OUT_DIR, circuitSlug)
            }
        });

        c.stdout.on('data', (data) => {
            // process.stdout.write(`stdout: ${data}`);
            log(circuitLogPath, data, 'circuit-compile');
        });

        c.stderr.on('data', (data) => {
            process.stderr.write(`stderr: ${data}`);
            log(circuitLogPath, data, 'circuit-compile');
        });

        c.on('exit', (code, signal) => {
            if (code === 0) {
                console.log(`Compiled circuit for ${circuitSlug} with name ${circuitName}`);
                log(circuitLogPath, `Compiled circuit for ${circuitSlug} with name ${circuitName}`, 'circuit-compile');
                resolve();
            } else {
                console.log(`Process exited with code ${code}`);
                log(circuitLogPath, `Process exited with code ${code}`, 'circuit-compile');
                reject();
            }
        });
    });
}

export function generateZKey(circuitSlug: string, circuitName: string, force: boolean): Promise<void> {
    const zkeyLogPath = path.join(CIRCUIT_OUT_DIR, circuitSlug, circuitName + '_zkey.log');
    // Make sure output directory exists, delete if exist
    console.log(`Generating zkey for ${circuitSlug} with name ${circuitName}`);
    log(zkeyLogPath, `Generating zkey for ${circuitSlug} with name ${circuitName}`, 'generate-zkey');
    const zkeyPath = path.join(CIRCUIT_OUT_DIR, circuitSlug, circuitName + '.zkey');
    fs.writeFileSync(zkeyLogPath, "");
    if (fs.existsSync(zkeyPath)) {
        if (force) {
            fs.rmSync(zkeyPath);
        } else {
            console.log("Skipping zkey generation")
            return Promise.resolve();
        }
    }

    const r1csPath = path.join(CIRCUIT_OUT_DIR, circuitSlug, circuitName + '.r1cs');
    return new Promise<void>((resolve, reject) => {
        console.log('ptua', PTAU_PATH);
        const c = spawn("./node_modules/.bin/snarkjs", ['zkey', 'new', r1csPath, PTAU_PATH, zkeyPath, '-v'], {
            env: {
                ...process.env,
                NODE_OPTIONS: '--max-old-space-size=16000'
            }
        });
        c.stdout.on('data', (data) => {
            log(zkeyLogPath, data, 'generate-zkey');
        });
        c.stderr.on('data', (data) => {
            process.stderr.write(`stdout: ${data}`);
            log(zkeyLogPath, data, 'generate-zkey');
        });
        c.on('exit', (code, signal) => {
            if (code === 0) {
                console.log(`Generated ZKey for ${circuitSlug} with name ${circuitName}`);
                log(zkeyLogPath, `Generated ZKey for ${circuitSlug} with name ${circuitName}`, 'generate-zkey');
                resolve();
            } else {
                console.log(`Process exited with code ${code}`);
                log(zkeyLogPath, `Process exited with code ${code}`, 'generate-zkey');
                reject();
            }
        });
    });
}

export function generateVKey(circuitSlug: string, circuitName: string, force: boolean): Promise<void> {
    const vKeyLogPath = circuitCompilationLogPath(circuitSlug);
    console.log(`Generating vkey for ${circuitSlug} with name ${circuitName}`);
    log(vKeyLogPath, `Generating vkey for ${circuitSlug} with name ${circuitName}`, 'generate-vkey');
    const vKeyPath = path.join(CIRCUIT_OUT_DIR, circuitSlug, circuitName + '_vkey.json');
    const zkeyPath = path.join(CIRCUIT_OUT_DIR, circuitSlug, circuitName + '.zkey');
    fs.writeFileSync(vKeyLogPath, "");
    if (fs.existsSync(vKeyPath)) {
        if (force) {
            fs.rmSync(vKeyPath);
        } else {
            console.log("Skipping vkey generation")
            return Promise.resolve();
        }
    }
    // node ../node_modules/.bin/snarkjs zkey export verificationkey "$BUILD_DIR"/"$CIRCUIT_NAME".zkey "$BUILD_DIR"/"$CIRCUIT_NAME"_vkey.json
    return new Promise<void>((resolve, reject) => {
        const c = spawn("./node_modules/.bin/snarkjs", ['zkey', 'export', 'verificationkey', zkeyPath, vKeyPath]);
        c.stdout.on('data', (data) => {
            process.stdout.write(`stdout: ${data}`);
            log(vKeyLogPath, data, 'generate-vkey');
        });
        c.stderr.on('data', (data) => {
            process.stderr.write(`stdout: ${data}`);
            log(vKeyLogPath, data, 'generate-vkey');
        });
        c.on('exit', (code, signal) => {
            if (code === 0) {
                console.log(`Generated VKey for ${circuitSlug} with name ${circuitName}`);
                log(vKeyLogPath, `Generated VKey for ${circuitSlug} with name ${circuitName}`, 'generate-vkey');
                resolve();
            } else {
                console.log(`Process exited with code ${code}`);
                log(vKeyLogPath, `Process exited with code ${code}`, 'generate-vkey');
                reject();
            }
        });
    });
}

export function copyGenerateInputScript(circuitSlug: string, circuitName: string, force: boolean): Promise<void> {
    const scriptPath = path.join(CODE_OUT_DIR, circuitSlug, "generate_inputs.js");
    const inputScriptPath = path.join(CIRCUIT_OUT_DIR, circuitSlug, circuitName + "_js", "generate_inputs.js");
    if (fs.existsSync(inputScriptPath)) {
        if (force) {
            fs.rmSync(inputScriptPath);
        } else {
            console.log("Skipping input script generation")
            return Promise.resolve();
        }
    }
    fs.copyFileSync(scriptPath, inputScriptPath);
    return Promise.resolve();  
}

export async function downloadZkey(circuitSlug: string, circuitName: string): Promise<void> {
    let keyFilename;
    if (process.env.GOOGLE_AUTH_JSON) {
        keyFilename = process.env.GOOGLE_AUTH_JSON;
    }
    const storage = new Storage({ keyFilename: keyFilename });
    const destDir = path.join(CIRCUIT_OUT_DIR, circuitSlug);
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }
    const options = {
        destination: path.join(destDir, circuitName + '.zkey')
    };
    if (!process.env.BUCKET_NAME) {
        throw new Error("BUCKET_NAME is not set");
    }
    const bucketName = process.env.BUCKET_NAME;
    const fileName = `circuit/${circuitSlug}/${circuitName}.zkey`;
    // Downloads the file
    await storage.bucket(bucketName).file(fileName).download(options);
}
