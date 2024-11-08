'use server';
import { z } from 'zod';
import { formSchema } from '../form';
import { generateCodeLibrary } from '@/lib/code-gen/gen';
import { verifyDKIMSignature } from "@zk-email/helpers/dist/dkim";
import { extractMatches, extractMatchesWasm, Values } from '@/lib/regex';

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
        result = await verifyDKIMSignature(email, values.parameters.senderDomain)
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
    const matches = await extractMatchesWasm(headerString, bodyString, values.parameters.values as Values[]);

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