import { getEntryById } from '@/lib/models/entry';
import TryPage from './wrapper';

export default async function Page({params: {id}}: {params: {id: string}}) {
    const entry = await getEntryById(id);
    if (!entry) {
        return (<h1>Entry not found</h1>)
    }
    return (
        <TryPage entry={entry}/>
    );
}