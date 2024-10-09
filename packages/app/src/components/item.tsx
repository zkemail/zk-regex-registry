import {Copy, Hourglass, CheckCircle, XCircle} from "lucide-react"
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ItemParameterDialog } from "./item-parameter-dialog";
import { Entry } from "@prisma/client";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from "@/components/ui/tooltip"
import { SimpleDialog } from "./simple-dialog";
import { getLogs } from "@/lib/models/logs";

const tooltips: Record<string, string> = {
    "COMPLETED": "Pattern is ready to be used.",
    "ERROR": "Pattern has failed to compile. Click to see logs.",
    "PENDING": "Pattern is still being compiled and generated in the background."
}
export const Item = (props: {entry: Entry}) => {
    const entry = props.entry;
    const parameters = entry.parameters as any;

    async function pendingOrCompleted(status: string) {
        // const icon = (status === "COMPLETED") ? <CheckCircle color="green" className="w-5 h-5 mr-2"/> : <Hourglass color="gray" className="w-5 h-5 mr-2"/>;
        let icon;
        switch (status) {
            case "COMPLETED":
                icon = <CheckCircle color="green" className="w-5 h-5 mr-2"/>;
                break;
            case "ERROR":
                const logs = await getLogs(entry.slug);
                icon = <SimpleDialog trigger={<div><XCircle color="red" className="w-6 h-6 mr-2"/></div>} title={"Error logs"} wide={true}>
                  <div>
                    <pre>{logs.codeLog}</pre>
                    <pre>{logs.circuitLog}</pre>
                  </div>
                </SimpleDialog>
                break;
            default:
                icon = <Hourglass color="gray" className="w-5 h-5 mr-2"/>;
        }
        let tooltip = tooltips[status];
        return (
            <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  {icon}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
    }

    return (
    <div className="">
        <div className="flex w-full flex-row pb-2 items-center">
            {pendingOrCompleted(entry.status)}
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
            <p>Extractable values: {parameters.values.map((v:any) => v.name).join(", ")}</p>
        </div>
        <div className="w-full mt-2">
            <a href={"/try/"+entry.slug}><Button className="mr-2" disabled={entry.status !== "COMPLETED"}>Try it out</Button></a>
            <a href={"/api/download/"+entry.slug}><Button variant="outline" className="mr-2">Download Example Project</Button></a>
            {(entry.status === "COMPLETED" && entry.withModal)&& <a href={"/api/download_zkey/"+entry.slug}><Button variant="link" className="mr-2">Download .zkey</Button></a>}
            {/* <Button className="mr-2">Download Circuits Only</Button> */}
            <ItemParameterDialog entry={entry}/>
        </div>
    </div>
    );
}