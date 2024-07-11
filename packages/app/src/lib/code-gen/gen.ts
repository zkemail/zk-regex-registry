
import ejs from 'ejs';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import { regexToDfa } from './regex';
import { genCircomAllstr } from './gen_circom';
import { spawn } from 'child_process';

const EXAMPLE_PROJECT_TYPE = 'zkemail_example';

// Define the directory path
const templatesDir = './src/lib/code-gen/templates'
const outputDir = path.join(process.env.GENERATED_OUTPUT_DIR || "./output", 'code')
console.log("DIRRR", outputDir);
const unsafeDirPatterns = ['..', '~'];

export const generateCodeLibrary = async (parameters: any, outputName: string):Promise<string> => {
    for (const pattern of unsafeDirPatterns) {
        if (outputName.includes(pattern)) {
            throw new Error('Unsafe directory pattern detected');
        }
    }
    if (parameters.version === "v2") {
        const mappedParams = mapPrefixRegex(parameters);
        console.log(JSON.stringify(parameters,null, 2));
        console.log(JSON.stringify(mappedParams,null, 2));
        generateFromTemplate(path.join(templatesDir, EXAMPLE_PROJECT_TYPE), mappedParams, path.join(outputDir, outputName));
        await generateZkRegexCircuitV2(path.join(outputDir, outputName, "circuit", "regex"), mappedParams);
    } else {
        generateFromTemplate(path.join(templatesDir, EXAMPLE_PROJECT_TYPE), parameters, path.join(outputDir, outputName));
        generateZkRegexCircuit(path.join(outputDir, outputName, "circuit", "regex"), parameters);
    }
    generateCircuitInputsWorker(path.join(outputDir, outputName), outputName);
    return await zipDirectory(path.join(outputDir, outputName), path.join(outputDir, `${outputName}-example.zip`))
}

function mapPrefixRegex(parameters: any): any {
    const mappedValues = parameters.values.map((v:{ parts: {is_public: boolean, regex_def: string}[]}) => {
        let prefixRegex = "";
        for (let part of v.parts) {
            if (!part.is_public) prefixRegex = part.regex_def;
            else break;
        }
        if (!prefixRegex) throw new Error('Part has to have start with a regex that is_public = false in order to find it later')
            return {
            ...v,
            prefixRegex
        }
    })
    return {
        ...parameters,
        values: mappedValues
    }
}

function generateFromTemplate(templateDir: string, parameters: any, outputDir: string) {
    walkDirectory(templateDir, parameters, outputDir);
}

// Function to walk through the template directory and generate the example project
function walkDirectory(currentPath: string, parameters: any, outputDir: string) {
  fs.readdirSync(currentPath).forEach(file => {
    const filePath = path.join(currentPath, file);
    const outPath = path.join(outputDir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walkDirectory(filePath, parameters, outPath);
    } else {
        ejs.renderFile(filePath, parameters, {}, function(err: any, str: string){
            if (err) {
                console.error(err);
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

export const generateZkRegexCircuitV2 = (outDir: string, parameters: any): Promise<void[]> => {
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
        console.log("json", jsonFile)
        fs.writeFileSync(jsonFile, JSON.stringify({parts: value.parts}))
        const outCircomFile = `${outDir}/${value.name}Regex.circom`;
        const zkSdk = spawn('zk-regex', ['decomposed', '-d', jsonFile, '-c', outCircomFile, '-t', `${value.name}Regex`, '-g',  'true'])
        
        promises.push(new Promise<void>((resolve, reject) => {
            zkSdk.stdout.on('data', (data) => {
                console.log(`stdout: ${data}`);
            });
            zkSdk.stderr.on('data', (data) => {
                console.error(`stderr: ${data}`);
                reject(data);
            });
            zkSdk.on('close', (code) => {
                // check if file exists
                if (!fs.existsSync(outCircomFile)) {
                    console.error('Error generating circom');
                    reject(new Error('Error generating circom, file not found'))
                }
                console.log(`child process exited with code ${code}`);
                resolve();
            });
        }));
    }
    return Promise.all(promises);
}

export const generateCircuitInputsWorker = (outDir: string, outputName: string):void => {
    const inputFile = path.join(outDir, "generate_inputs_worker.js");
    console.log(inputFile);
    const filename = 'generate_inputs_worker_bundled.js';
    // run the bundler in a child process
    const bundler = spawn('node', ['./src/lib/code-gen/webpack.js', inputFile, outDir, filename]);
    bundler.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });
    bundler.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });
    bundler.on('close', (code) => {
        // check if file exists
        if (!fs.existsSync(path.join(outDir, filename))) {
            console.error('Error bundling worker');
        }
        console.log(`child process exited with code ${code}`);
    });

}