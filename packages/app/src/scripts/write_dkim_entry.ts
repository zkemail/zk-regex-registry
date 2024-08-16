import { addDkimEntry } from "@/lib/contract-deploy"

(async () => {
    await addDkimEntry({
        parameters: {
            senderDomain: 'github.com',
            dkimSelector: 'pf2023'
        }
    } as any)
})()