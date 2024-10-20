import { getPrefixRegex } from '@/lib/code-gen/utils';
import { z } from 'zod';

export const formSchema = z.object({
    title: z.string().min(1, {
        message: "Title must be at least 1 characters.",
    }),
    slug: z.string().regex(/[\w\-\_\@]+\/[\w\-\_\@)]+/, {
        message: "Needs to match this pattern 'xxxx/yyyy'",
    }),
    description: z.string().min(1),
    tags: z.string().transform((str, ctx) => {
        try {
            return str.split(",")
        } catch (e) {
            ctx.addIssue({ code: 'custom', message: 'Invalid tags' })
            return z.NEVER
        }
    }),
    emailQuery: z.string(),
    useNewSdk: z.boolean(),
    parameters: z.object({
        // name can only be valid variable names
        name: z.string().min(1).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid name, must start with a letter, digit, or underscore, and can only contain letters, digits or underscores."),
        ignoreBodyHashCheck: z.boolean(),
        enableMasking: z.boolean(),
        shaPrecomputeSelector: z.string().transform(value => value.replace(/(?<!\\)"/g, '\\"')),
        senderDomain: z.string().refine(value => !value.includes('@'), {
            message: "Sender domain should not contain '@' symbol, only the domain",
        }),
        dkimSelector: z.string().optional().refine(
            (value) => {
                if (value === undefined || value === "") return true; // Allow undefined values
                return /^[a-zA-Z0-9](?:[a-zA-Z0-9-_]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-_]{0,61}[a-zA-Z0-9])?)*$/.test(value) && value.length <= 253;
            },
            {
                message: "Invalid DKIM selector format or length",
            }
        ),
        emailBodyMaxLength: z.coerce.number().transform((n, ctx) => {
            if (n % 64 !== 0) {
                ctx.addIssue({ code: 'custom', message: 'Must be a multiple of 64' })
            }
            return n;
        }),
        emailHeaderMaxLength: z.coerce.number().transform((n, ctx) => {
            if (n % 64 !== 0) {
                ctx.addIssue({ code: 'custom', message: 'Must be a multiple of 64' })
            }
            return n;
        }).default(1024),
        values: z.array(z.object({
            name: z.string().min(1).transform((value, ctx) => {
                if (value.includes(' ')) {
                    ctx.addIssue({
                        code: 'custom',
                        message: 'Warning: Name contains spaces. They will be replaced with underscores.',
                    });
                    return value.replace(/ /g, '_');
                }
                return value;
            }),
            maxLength: z.coerce.number().positive().default(64),
            regex: z.string().optional(),
            prefixRegex: z.string().optional(),
            location: z.string().regex(/(body)|(header)|(from)|(to)|(subject)|(timestamp)/),
            revealStates: z.string().transform((str, ctx) => {
                try {
                    return JSON.parse(str)
                } catch (e) {
                    ctx.addIssue({ code: 'custom', message: 'Must look like [[[22,1],[1,1]]]' })
                }
            }).optional(),
            parts: z.string().transform((str, ctx) => {
                // Check if the string contains 'is_public'
                if (!str.includes('is_public')) {
                    ctx.addIssue({
                        code: 'custom',
                        message: 'Each parts config must include at least one "is_public" field, and at least one thats true and one thats false. Please add it for now until we fix this requirement.'
                    });
                    return z.NEVER;
                }
                let parsed;

                try {
                    parsed = JSON.parse(str)
                } catch (e) {
                    ctx.addIssue({ code: 'custom', message: 'Invalid JSON' })
                    return z.NEVER
                }
                // Validate the structure of the parsed JSON
                if (!Array.isArray(parsed)) {
                    ctx.addIssue({ code: 'custom', message: 'Parts must be an array' });
                    return z.NEVER;
                }
                for (let i = 0; i < parsed.length; i++) {
                    const part = parsed[i];
                    if (typeof part !== 'object' || part === null) {
                        ctx.addIssue({ code: 'custom', message: `Part ${i} must be an object` });
                        return z.NEVER;
                    }

                    if (!('is_public' in part) || typeof part.is_public !== 'boolean') {
                        ctx.addIssue({ code: 'custom', message: `Part ${i} must have a boolean 'is_public' field` });
                        return z.NEVER;
                    }

                    if (!('regex_def' in part) || typeof part.regex_def !== 'string') {
                        ctx.addIssue({ code: 'custom', message: `Part ${i} must have a string 'regex_def' field` });
                        return z.NEVER;
                    }
                }
                try {
                    // try to map and see if it works
                    getPrefixRegex(parsed);
                    return parsed;
                }
                catch (e: any) {
                    ctx.addIssue({ code: 'custom', message: (e as Error).message })
                    return z.NEVER
                }

            }).optional()
                .or(z.array(z.any())), // this is that when we pre-populate the form directly with an array, the form will still accept it
        })),
        externalInputs: z.array(z.object({
            name: z.string().min(1),
            maxLength: z.coerce.number().positive().default(64),
        }))
    }),
}).refine(data => // make sure if values contain body, then ignoreBodyHashCheck must be false
    !data.parameters.ignoreBodyHashCheck || !data.parameters.values.some(value => value.location === 'body'), {
    message: "Ignore body hash check must be false if you want to extract data from the email body",
    path: ["parameters", "ignoreBodyHashCheck"]
});