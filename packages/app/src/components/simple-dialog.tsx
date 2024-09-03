import { cn } from "@/lib/utils";
import { DialogHeader, Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./ui/dialog";

interface SimpleDialogProps {
    trigger: React.ReactNode;
    title: string;
    children: React.ReactNode;
    wide?: boolean;
}

export function SimpleDialog({title, children, trigger, wide = false}: SimpleDialogProps) {
    return <Dialog>
    <DialogTrigger asChild>
        {trigger}
    </DialogTrigger>
    <DialogContent className={cn(wide ? "max-w-[80%]" : "overflow-clip")}>
        <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="overflow-scroll">
            {children}
        </div>
        {/* <DialogDescription className="overflow-scroll"> */}
        {/* </DialogDescription> */}
    </DialogContent>
</Dialog>
}