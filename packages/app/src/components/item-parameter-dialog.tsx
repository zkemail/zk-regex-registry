import { Entry } from "@/lib/models/entry";
import { Dialog, DialogClose, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ItemParameterDialog(props: { entry: Entry }) {
    const cleanedValues = props.entry.parameters.values.map((v: any) => {
        return {
            ...v,
            revealStates: JSON.stringify(v.revealStates)
        }
    });
    const cleanedParams = {
            ...props.entry.parameters,
            values: cleanedValues
    }
    return (
        <Dialog>
            <DialogTrigger asChild>
                {/* View Parameters */}
                <Button className="mr-2" variant="link">View Parameters</Button>
            </DialogTrigger>
            <DialogContent  className="overflow-clip">
                <DialogHeader>
                    <DialogTitle>Pattern Metadata</DialogTitle>
                </DialogHeader>
                <DialogDescription className="overflow-scroll">
                    <code className="text-xs">
                        <pre>
                            {JSON.stringify(cleanedParams, null, 2)}
                        </pre>
                    </code>
                </DialogDescription>
            </DialogContent>
        </Dialog>
    )
}