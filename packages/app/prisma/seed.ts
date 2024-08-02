import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
    await prisma.entry.upsert({
        where: { slug: 'zk-email/proof-of-twitterx' },
        update: {},
        create: {
            slug: 'zk-email/proof-of-twitterx',
            title: 'Proof of Twitter',
            description: 'Use a password reset email to proof you own the email connected to a twitter handle.',
            createdBy: 'zk-email',
            tags: ["twitter", "identity", "email"],
            status: "PENDING",
            parameters: {"name":"twitterProof","values":[{"name":"handle","regex":"email was meant for @[a-zA-Z0-9]+","location":"body","maxLength":64,"prefixRegex":"email was meant for @","revealStates":[[[22,1],[1,1]]]}],"ignoreBodyHashCheck":false,"shaPrecomputeSelector":">Not my account<"},
            emailQuery: "Password reset request from: info@x.com "
        },
    })

    await prisma.entry.upsert({
        where: { slug: 'zk-email/proof-of-twitter-v2' },
        update: {},
        create: {
            slug: 'zk-email/proof-of-twitter-v2',
            title: 'Proof of Twitter V2',
            description: 'Use a password reset email to proof you own the email connected to a twitter handle.',
            createdBy: 'zk-email',
            tags: ["twitter", "identity", "email"],
            status: "PENDING",
            parameters: {
                "name": "twitterProof",
                "version": "v2",
                "senderDomain": "x.com",
                "values": [
                    {
                        "name": "handle",
                        "location": "body",
                        "maxLength": 64,
                        "parts": [
                            {
                                "is_public": false,
                                "regex_def": "email was meant for @"
                            },
                            {
                                "is_public": true,
                                "regex_def": "(a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z|A|B|C|D|E|F|G|H|I|J|K|L|M|N|O|P|Q|R|S|T|U|V|W|X|Y|Z|0|1|2|3|4|5|6|7|8|9|_)+"
                            }
                        ]
                    }
                ],
                "ignoreBodyHashCheck": false,
                "shaPrecomputeSelector": ">Not my account<"
            },
            emailQuery: "Password reset request from: info@x.com "
        },
    })

    await prisma.apiKey.upsert({
        where: { key: 'guest' },
        update: {},
        create: {
            name: 'guest',
            key: 'guest',
            status: 'ACTIVE',
        }
    });
};

main();