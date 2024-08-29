import { getEntryBySlug } from "@/lib/models/entry";
import Content from "./content";

export default async function EditPage({params}: {params: {slug: string[]}}) {
    const slug = params.slug.join('/');
    const entry = await getEntryBySlug(slug);

    if (!entry) {
        return (<h1>Entry not found</h1>)
    }
    return (<Content entry={entry}/>)
}