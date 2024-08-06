import { addDkimEntry } from "@/lib/contract-deploy"

(async () => {
    await addDkimEntry({
        parameters: {
            senderDomain: 'user.luma-mail.com'
        }
    } as any)
})()