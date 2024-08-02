import { Button } from "./ui/button";
import { DialogHeader, Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./ui/dialog";

interface SimpleDialogProps {
    trigger: React.ReactNode;
    title: string;
    children: React.ReactNode;
}

export function SimpleDialog({title, children, trigger}: SimpleDialogProps) {
    return <Dialog>
    <DialogTrigger asChild>
        {trigger}
    </DialogTrigger>
    <DialogContent  className="overflow-clip">
        <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogDescription className="overflow-scroll">
            {children}
        </DialogDescription>
    </DialogContent>
</Dialog>
}