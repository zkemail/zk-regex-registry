import { getEntryBySlug } from '@/lib/models/entry';
import TryPage from './wrapper';

export default async function Page({params}: {params: {slug: string[]}}) {
    const slug = params.slug.join('/');
    const entry = await getEntryBySlug(slug);
    if (!entry) {
        return (<h1>Entry not found</h1>)
    }
    return (
        <TryPage entry={entry}/>
    );
}