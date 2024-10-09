
import ejs from 'ejs';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import { regexToDfa } from './regex';
import { genCircomAllstr } from './gen_circom';
import { spawn } from 'child_process';
import { mapPrefixRegex } from './utils';
import { log } from '../log';

const EXAMPLE_PROJECT_TYPE = 'zkemail_example';
const MASKING_PROJECT_TYPE = 'zkemail_masking';

// Define the directory path
const templatesDir = './src/lib/code-gen/templates'
const outputDir = path.join(process.env.GENERATED_OUTPUT_DIR || "./output", 'code')
const circuitOutputDir = path.join('./output', 'circuit')
const codeOutputDir = path.join('./output', 'code')
console.log("DIRRR", outputDir);
const unsafeDirPatterns = ['..', '~'];

export function codeGenerationLogPath(circuitSlug: string): string {
    return path.join(outputDir, circuitSlug, 'code.log');
}

export function fillDefaultParameters(parameters: any) {
    if (parameters.emailBodyMaxLength === undefined) {
        parameters.emailBodyMaxLength = 4032
    }
    if (parameters.externalInputs === undefined) {
        parameters.externalInputs = []
    } 
    return parameters;
}

export const generateCodeLibrary = async (parameters: any, outputName: string, status: string):Promise<string> => {
    for (const pattern of unsafeDirPatterns) {
        if (outputName.includes(pattern)) {
            throw new Error('Unsafe directory pattern detected');
        }
    }
    let projectType = EXAMPLE_PROJECT_TYPE;
    if (parameters.enableMasking) {
        projectType = MASKING_PROJECT_TYPE;
    }
    let promises = [];
    parameters = fillDefaultParameters(parameters);

    // create the log file
    const logPath = codeGenerationLogPath(outputName);
    fs.mkdirSync(path.join(outputDir, outputName), {
        recursive: true
    });
    fs.writeFileSync(logPath, "");

    if (parameters.version === "v2") {
        const mappedParams = mapPrefixRegex(parameters);
        generateFromTemplate(path.join(templatesDir, projectType), mappedParams, path.join(outputDir, outputName), logPath);
        promises.push(generateZkRegexCircuitV2(path.join(outputDir, outputName, "circuit", "regex"), mappedParams, logPath));
    } else {
        generateFromTemplate(path.join(templatesDir, projectType), parameters, path.join(outputDir, outputName), logPath);
        generateZkRegexCircuit(path.join(outputDir, outputName, "circuit", "regex"), parameters);
    }
    promises.push(generateCircuitInputsWorker(path.join(outputDir, outputName), outputName));
    if (status === 'COMPLETED') {
        promises.push(generateSolidityVerifier(circuitOutputDir, outputDir, outputName, parameters.name, logPath));
    }
    await Promise.all(promises);
    const zipFile = path.join(outputDir, `${outputName}-example.zip`);
    return await zipDirectory(path.join(outputDir, outputName), zipFile)
}


function generateFromTemplate(templateDir: string, parameters: any, outputDir: string, logPath: string) {
    walkDirectory(templateDir, parameters, outputDir, logPath);
}

// Function to walk through the template directory and generate the example project
function walkDirectory(currentPath: string, parameters: any, outputDir: string, logPath: string) {
  fs.readdirSync(currentPath).forEach(file => {
    const filePath = path.join(currentPath, file);
    const outPath = path.join(outputDir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walkDirectory(filePath, parameters, outPath, logPath);
    } else {
        ejs.renderFile(filePath, parameters, {}, function(err: any, str: string){
            if (err) {
                console.error(err);
                log(logPath, `Error rendering template ${filePath}: ${err.toString()}`, "generate-template");
            } else {
                fs.mkdirSync(outputDir, {
                    recursive: true
                });
                // replace the filename with parameters too
                let outputPath = outPath.replace('.ejs', '');
                outputPath = ejs.render(outputPath, parameters);
                fs.writeFileSync(outputPath, str)
            }
        });
    }
  });
}

export const zipDirectory = async (dir: string, outFile: string):Promise<string> => {
    const output = fs.createWriteStream(outFile);
    const archive = archiver('zip');

    return new Promise<string>((resolve, reject) => {
        output.on('close', function () {
            console.log(archive.pointer() + ' total bytes');
            console.log('archiver has been finalized and the output file descriptor has closed.');
            return resolve(outFile);
        });
        
        archive.on('error', function(err){
            reject(err)
        });
        
        archive.pipe(output);
        archive.directory(dir, false);
        archive.finalize();
    });
}

export const generateZkRegexCircuit = (outDir: string, parameters: any):void => {
    fs.mkdirSync(outDir, {
        recursive: true
    }); 
    for (const value of parameters.values) {
        console.log(value.regex);
        const minDfa = regexToDfa(value.regex);
        const circuitStr = genCircomAllstr(minDfa, value.name+"Regex", value.revealStates, value.regex)
        fs.writeFileSync(`${outDir}/${value.name}Regex.circom`, circuitStr);
    }
}

export const generateZkRegexCircuitV2 = (outDir: string, parameters: any, logPath: string): Promise<void[]> => {
    fs.mkdirSync(outDir, {
        recursive: true
    }); 
    const promises = [];
    for (const value of parameters.values) {
        if (!value.parts) {
            console.error("path is required for v2")
            continue;
        }
        // create a json file
        const jsonFile = `${outDir}/${value.name}.json`
        fs.writeFileSync(jsonFile, JSON.stringify({parts: value.parts}))
        const outCircomFile = `${outDir}/${value.name}Regex.circom`;
        const zkSdk = spawn('zk-regex', ['decomposed', '-d', jsonFile, '-c', outCircomFile, '-t', `${value.name}Regex`, '-g',  'true'])
        
        promises.push(new Promise<void>((resolve, reject) => {
            zkSdk.stdout.on('data', (data) => {
                console.log(`stdout: ${data}`);
                log(logPath, data, "generate-circuit");
            });
            zkSdk.stderr.on('data', (data) => {
                console.error(`stderr: ${data}`);
                log(logPath, data, "generate-circuit");
                reject(data);
            });
            zkSdk.on('close', (code) => {
                // check if file exists
                if (!fs.existsSync(outCircomFile)) {
                    console.error('Error generating circom');
                    log(logPath, `Error generating circom, file ${outCircomFile} not found`, "generate-circuit");
                    reject(new Error('Error generating circom, file not found'))
                }
                console.log(`child process exited with code ${code}`);
                resolve();
            });
        }));
    }
    return Promise.all(promises);
}

export const generateCircuitInputsWorker = (outDir: string, logPath: string):Promise<void> => {
    const inputFile = path.join(outDir, "generate_inputs_worker.js");
    const filename = 'generate_inputs_worker_bundled.js';
    // run the bundler in a child process
    return new Promise((resolve, reject) => {
        const bundler = spawn('node', ['./src/lib/code-gen/webpack.js', inputFile, outDir, filename]);
        bundler.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
            log(logPath, data, "generate-circuit-inputs-worker");
        });
        bundler.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
            log(logPath, data, "generate-circuit-inputs-worker");
        });
        bundler.on('close', (code) => {
            // check if file exists
            if (!fs.existsSync(path.join(outDir, filename))) {
                console.error('Error bundling worker');
                log(logPath, `Error bundling worker, file ${path.join(outDir, filename)} not found`);
                return reject(new Error("Output file not found"));
            }
            if (code) {
                console.error(`child process exited with code ${code}`);
                log(logPath, `child process exited with code ${code}`);
                return reject(new Error(`child process exited with code ${code}`))
            }
            resolve()
        });

    })
}

export const generateSolidityVerifier = (circuitDir: string, outDir: string, outputName: string, patternName: string, logPath: string): Promise<void> => {
    const inputFile = path.join(circuitDir, outputName, `${patternName}.zkey`)
    const altInputFile = path.join(codeOutputDir, outputName, "circuit", `${patternName}.zkey`)
    console.log("inputFile", inputFile);
    console.log("altInputFile", altInputFile);
    let file;
    if (fs.existsSync(altInputFile)) {
        file = altInputFile;
    } else {
        file = inputFile;
    }
    const outputFile = path.join(outDir, outputName, 'contract', 'src', `verifier.sol`)
    // run snarkjs in a child process
    return new Promise((resolve, reject) => {
        const snarkjs = spawn('snarkjs', ['zkey', 'export', 'solidityverifier', file, outputFile]);
        snarkjs.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
            log(logPath, data, "generate-solidity-verifier");
        });
        snarkjs.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
            log(logPath, data, "generate-solidity-verifier");
        });
        snarkjs.on('close', (code) => {
            // check if file exists
            if (!fs.existsSync(outputFile)) {
                console.error('Error generating solidity verifier');
                log(logPath, `Error generating solidity verifier, file ${outputFile} not found`, "generate-solidity-verifier");
                return reject(new Error("Output file not found"));
            }
            if (code) {
                console.error(`child process exited with code ${code}`);
                log(logPath, `child process exited with code ${code}`, "generate-solidity-verifier");
                return reject(new Error(`child process exited with code ${code}`))
            }
            resolve()
        });
    })
}