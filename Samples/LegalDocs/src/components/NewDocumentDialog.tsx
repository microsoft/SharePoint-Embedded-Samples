import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Sheet, Presentation } from "lucide-react";

interface NewDocumentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFile: (fileName: string, extension: string) => Promise<void>;
  isCreating: boolean;
}

type FileType = "docx" | "xlsx" | "pptx";

const fileTypes: { value: FileType; label: string; icon: React.ReactNode }[] = [
  { value: "docx", label: "Word Document", icon: <FileText className="w-4 h-4 text-blue-600" /> },
  { value: "xlsx", label: "Excel Spreadsheet", icon: <Sheet className="w-4 h-4 text-green-600" /> },
  { value: "pptx", label: "PowerPoint Presentation", icon: <Presentation className="w-4 h-4 text-orange-600" /> },
];

export default function NewDocumentDialog({
  isOpen,
  onClose,
  onCreateFile,
  isCreating,
}: NewDocumentDialogProps) {
  const [fileType, setFileType] = useState<FileType>("docx");
  const [fileName, setFileName] = useState("");

  const handleCreate = async () => {
    if (!fileName.trim()) return;
    await onCreateFile(fileName.trim(), fileType);
    setFileName("");
    setFileType("docx");
  };

  const handleClose = () => {
    setFileName("");
    setFileType("docx");
    onClose();
  };

  const selectedFileType = fileTypes.find((ft) => ft.value === fileType);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Office File</DialogTitle>
          <DialogDescription>
            Create a new Microsoft Office file in the current folder
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="file-type">File Type</Label>
            <Select value={fileType} onValueChange={(val) => setFileType(val as FileType)}>
              <SelectTrigger id="file-type" className="w-full">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    {selectedFileType?.icon}
                    <span>{selectedFileType?.label}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {fileTypes.map((ft) => (
                  <SelectItem key={ft.value} value={ft.value}>
                    <div className="flex items-center gap-2">
                      {ft.icon}
                      <span>{ft.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file-name">File Name</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file-name"
                placeholder="Enter file name"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && fileName.trim()) {
                    handleCreate();
                  }
                }}
              />
              <span className="text-muted-foreground">.{fileType}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!fileName.trim() || isCreating}
          >
            {isCreating ? "Creating..." : "Create File"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}