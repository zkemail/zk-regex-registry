import { getEntryBySlug } from '@/lib/models/entry';
import TryPage from './wrapper';
import prisma from '@/lib/prisma';

export default async function Page({params}: {params: {slug: string[]}}) {
    const slug = params.slug.join('/');
    const entry = await getEntryBySlug(slug);
    if (!entry) {
        return (<h1>Entry not found</h1>)
    }
    const supportedChains = await prisma.chain.findMany();
    const deployedContracts = await prisma.contractDeployment.findMany({where: {entryId: entry?.id, OR: [{status: "COMPLETED"}, {status: "ERROR"}]}});
    return (
        <TryPage entry={entry} supportedChains={supportedChains} deployedContracts={deployedContracts}/>
    );
}