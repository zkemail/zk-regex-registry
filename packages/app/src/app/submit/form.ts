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
    tags: z.string().transform( ( str, ctx ) => {
        try {
            return str.split(",")
        } catch ( e ) {
            ctx.addIssue( { code: 'custom', message: 'Invalid tags' } )
            return z.NEVER
        }
    }),
    emailQuery: z.string(),
    useNewSdk: z.boolean(),
    parameters: z.object({
        name: z.string().min(1).transform(value => value.replace(/"/g, '')),
        ignoreBodyHashCheck: z.boolean(),
        enableMasking: z.boolean(),
        shaPrecomputeSelector: z.string().transform(value => value.replace(/"/g, '\\"')),
        senderDomain: z.string().refine(value => !value.includes('@'), {
            message: "Sender domain should not contain '@' symbol, only the domain",
        }),
        dkimSelector: z.string().optional().refine(
            (value) => {
              if (value === undefined) return true; // Allow undefined values
              return /^[a-zA-Z0-9](?:[a-zA-Z0-9-_]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-_]{0,61}[a-zA-Z0-9])?)*$/.test(value) && value.length <= 253;
            },
            {
              message: "Invalid DKIM selector format or length",
            }
        ),
        emailBodyMaxLength: z.coerce.number().transform((n, ctx) => {
            if (n % 64 !== 0) {
                ctx.addIssue({code: 'custom', message: 'Must be a multiple of 64'})
            }
            return n;
        }),
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
                    ctx.addIssue( {code: 'custom', message: 'Must look like [[[22,1],[1,1]]]'})
                }
            }).optional(),
            parts: z.string().transform( ( str, ctx ) => {
                // Check if the string contains 'is_public'
                if (!str.includes('is_public')) {
                    ctx.addIssue({ 
                        code: 'custom', 
                        message: 'Each parts config must include at least one "is_public" field. Please add it for now until we fix this requirement.' 
                    });
                    return z.NEVER;
                }
                let parsed;
                try {
                    parsed = JSON.parse( str )
                } catch ( e ) {
                    ctx.addIssue( { code: 'custom', message: 'Invalid JSON' } )
                    return z.NEVER
                }
                try {
                    // try to map and see if it works
                    getPrefixRegex(parsed)
                    return parsed
                }
                catch (e: any) {
                    ctx.addIssue( { code: 'custom', message: (e as Error).message } )
                    return z.NEVER
                }
                
            }).optional(),
        })),
        externalInputs: z.array(z.object({
            name: z.string().min(1),
            maxLength: z.coerce.number().positive().default(64),
        }))
    }),
})
