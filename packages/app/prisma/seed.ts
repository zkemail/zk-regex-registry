import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
    await prisma.entry.upsert({
        where: { slug: 'zk-email/proof-of-twitterx' },
        update: {},
        create: {
            slug: 'zk-email/proof-of-twitterx',
            title: 'Proof of Twiiter',
            description: 'Use a password reset email to proof you own the email connected to a twitter handle.',
            createdBy: 'zk-email',
            tags: ["twitter", "identity", "email"],
            status: "PENDING",
            parameters: {"name":"twitterProof","values":[{"name":"handle","regex":"email was meant for @[a-zA-Z0-9]+","location":"body","maxLength":64,"prefixRegex":"email was meant for @","revealStates":[[[22,1],[1,1]]]}],"ignoreBodyHashCheck":false,"shaPrecomputeSelector":">Not my account<"},
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