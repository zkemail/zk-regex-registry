
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
    generateFromTemplate(path.join(templatesDir, EXAMPLE_PROJECT_TYPE), parameters, path.join(outputDir, outputName));
    generateZkRegexCircuit(path.join(outputDir, outputName, "circuit", "regex"), parameters);
    generateCircuitInputsWorker(path.join(outputDir, outputName), outputName);
    return await zipDirectory(path.join(outputDir, outputName), path.join(outputDir, `${outputName}-example.zip`))
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

export const generateCircuitInputsWorker = (outDir: string, outputName: string):void => {
    const inputFile = path.join(outDir, "generate_inputs_worker.js");
    console.log(inputFile);
    const filename = 'generate_inputs_worker_bundled.js';
    // run the bundler in a child process
    const bundler = spawn('node', ['./scripts/04_webpack.js', inputFile, outDir, filename]);
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