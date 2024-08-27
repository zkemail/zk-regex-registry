import { EntryForm } from "@/components/entry-form";
import { getEntryBySlug } from "@/lib/models/entry";
import { submit } from "./action";

export default async function EditPage({params}: {params: {slug: string[]}}) {
    const slug = params.slug.join('/');
    const entry = await getEntryBySlug(slug);

    if (!entry) {
        return (<h1>Entry not found</h1>)
    }

    return (
    <div className="w-full py-20 lg:py-40">
        <div className="container mx-auto">
            <div className="flex flex-col gap-10">
                <div className="flex text-left justify-center items-center gap-4 flex-col px-10 md:px-40">
                    <h1 className="text-xl md:text-3xl tracking-tighter text-left font-extrabold">Edit pattern</h1>
                    <h1 className="text-md md:text-xl tracking-tighter text-left">{entry.title}</h1>
                    <h1 className="text-md md:text-xl tracking-tighter text-left">{entry.description}</h1>
                    <EntryForm entry={entry} onSubmit={submit} />
                </div>
            </div>
        </div>
    </div>
    )
}