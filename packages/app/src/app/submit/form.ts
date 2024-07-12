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
        values: z.array(z.object({
            name: z.string(),
            regex: z.string().optional(),
            location: z.string().regex(/(body)|(header)/),
            revealStates: z.string().optional(),
            parts: z.string().transform( ( str, ctx ) => {
                try {
                    return JSON.parse( str )
                } catch ( e ) {
                    ctx.addIssue( { code: 'custom', message: 'Invalid JSON' } )
                    return z.NEVER
                }
            }).optional(),
        }))
    }),
})
