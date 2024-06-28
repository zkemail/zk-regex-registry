import {Copy} from "lucide-react"
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Entry } from "@/lib/models/entry";
import { ItemParameterDialog } from "./item-parameter-dialog";


export const Item = (props: {entry: Entry}) => {
    const entry = props.entry;
    return (
    <div className="">
        <div className="flex w-full flex-row pb-2 items-center">
            <h4 className="font-bold text-xl pr-2">{entry.title}</h4>
            {entry.tags.map((tag) => ( 
                <Badge key={tag} variant="outline" className="mr-1">{tag}</Badge>
            ))}
        </div>
        <div className="flex w-full items-center text-gray-800">
            <pre>{entry.slug}</pre> <Copy size="15" className="ml-2"/>
        </div>
        <div className="w-full">
            <span className="text-xs text-gray-500">Last modified: {entry.updatedAt.toLocaleDateString('en-UK')}</span>
        </div>
        <div className="w-full">
            <p className="">{entry.description}</p>
            <p>Extractable values: {entry.parameters.values.map((v:any) => v.name).join(", ")}</p>
        </div>
        <div className="w-full mt-2">
            <a href={"/api/download/"+entry.id}><Button className="mr-2">Download Example Project</Button></a>
            {/* <Button className="mr-2">Download Circuits Only</Button> */}
            <ItemParameterDialog entry={entry}/>
        </div>
    </div>
    );
}