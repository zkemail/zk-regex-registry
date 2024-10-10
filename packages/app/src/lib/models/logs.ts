"use server";

import fs from "fs";
import path from "path";

const CIRCUIT_OUT_DIR = "./output/circuit"
const outputDir = path.join(process.env.GENERATED_OUTPUT_DIR || "./output", 'code')

function codeGenerationLogPath(circuitSlug: string): string {
    return path.join(outputDir, circuitSlug, 'code.log');
}

function circuitCompilationLogPath(circuitSlug: string): string {
    return path.join(CIRCUIT_OUT_DIR, circuitSlug, 'circuit.log');
}

export async function getLogs(slug: string) {
    const codeLogPath = codeGenerationLogPath(slug);
    const circuitLogPath = circuitCompilationLogPath(slug);
    // read files
    let codeLog = "";
    let circuitLog = "";
    try {
        codeLog = fs.readFileSync(codeLogPath, 'utf8');
    } catch (e) {
        codeLog = "No code logs found";
    }
    try {
        circuitLog = fs.readFileSync(circuitLogPath, 'utf8');
    } catch (e) {
        circuitLog = "No circuit logs found";
    }
    return {codeLog, circuitLog};
}

export async function getProofLogs(slug: string, proofId: string) {
    const CIRCUIT_OUT_DIR = "./output/circuit";
    const proofDir = `${CIRCUIT_OUT_DIR}/${slug}/proofs`;

    const proofLogPath = `${proofDir}/${proofId}/log.txt`;
    let proofLog = "";
    try {
        proofLog = fs.readFileSync(proofLogPath, 'utf8');
    } catch (e) {
        proofLog = "No proof logs found";
    }
    return proofLog;
}