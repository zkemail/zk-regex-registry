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
        name: z.string(),
        ignoreBodyHashCheck: z.boolean(),
        shaPrecomputeSelector: z.string(),
        senderDomain: z.string(),
        values: z.array(z.object({
            name: z.string(),
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
        }))
    }),
})
