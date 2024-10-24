'use server';
import { z } from 'zod';
import { formSchema } from '../form';
import { generateCodeLibrary } from '@/lib/code-gen/gen';
import { verifyDKIMSignature } from "@zk-email/helpers/dist/dkim";

export interface ProcessEmailResult {
    error: boolean,
    message: string,
    parameters?: {
        maxHeaderLength: number,
        maxBodyLength?: number,
        domain: string,
        selector: string,
    },
    matches: {
        name: string,
        match: string,
    }[],
}

export async function processEmail(values: z.infer<typeof formSchema>, email: string): Promise<ProcessEmailResult> {
    let res;
    let result;
    let bodyString;
    let headerString;

    try {
        result = await verifyDKIMSignature(email)
    } catch (e: any) {
        return {
            error: true,
            matches: [],
            message: "Error verifying DKIM signature: " + e.toString()
        }
    }
    headerString = result.headers.toString();
    const headerLength = result.headers.length;
    const maxHeaderLength = (Math.ceil(headerLength / 64) + 2) * 64;
    const domain = result.signingDomain;
    const selector = result.selector;
    res = {
        maxHeaderLength,
        domain,
        selector,
    }
    if (!values.parameters.ignoreBodyHashCheck) {
        bodyString = result.body.toString();
        let splitBodyString = bodyString;
        if (values.parameters.shaPrecomputeSelector) {
            const split = bodyString.split(values.parameters.shaPrecomputeSelector);
            if (split.length > 2) {
                return {
                    error: true,
                    matches: [],
                    message: "Non-unique email body cut-off value. Use something that can split the email into strictly two parts."
                }
            }
            if (split.length == 1) {
                return {
                    error: true,
                    matches: [],
                    message: "Email body cut-off value is not found in the email body."
                }
            }
            splitBodyString = split[1];
        }
        const maxBodyLength = (Math.ceil(splitBodyString.length / 64) + 2) * 64;
        res = {
            ...res,
            maxBodyLength,
        }
    }

    // Apply regex
    const matches = extractMatches(headerString, bodyString, values.parameters.values as Values[]);

    const parameters = {
        ...values.parameters,
        version: values.useNewSdk ? "v2" : "v1",
    }
    try {
        await generateCodeLibrary(parameters, "drafts/" + values.slug, "DRAFT");
    } catch (e: any) {
        return {
            error: true,
            matches: [],
            message: "Error generating code: " + e.toString()
        }
    }
    return {
        error: false,
        message: "Email processed successfully",
        parameters: res,
        matches,
    }
}

interface Values {
    name: string,
    location: "header" | "body",
    parts: {
        regex_def: string,
        is_public: boolean,
    }[],
}

function extractMatches(headerString: string, bodyString: string | undefined, values: Values[]) {
    const regexes = values.map((v: any) => {
        let publicGroups: number[] = [];
        let index = 1;
        const regex = v.parts.reduce((acc: any, part: any) => {
            if (part.regex_def.match(/\([^\)]+/)) index++;
            if (part.is_public) {
                publicGroups.push(index);
                index++;
                return acc + "(" + part.regex_def + ")"
            } 
            return acc + part.regex_def
        }, "");
        return {
            regex,
            publicGroups,
            name: v.name,
            location: v.location,
        }
    })

    let matches = []

    for (const regex of regexes) {
        if (regex.location == "body" && bodyString) {
            const match = bodyString.match(regex.regex)
            if (match) {
                for (const group of regex.publicGroups) {
                    matches.push({
                        name: regex.name,
                        match: match[group],
                    })
                }
            }
        } else {
            const match = headerString.match(regex.regex)
            if (match) {
                for (const group of regex.publicGroups) {
                    matches.push({
                        name: regex.name,
                        match: match[group],
                    })
                }
            }
        }
    }
    return matches;
}