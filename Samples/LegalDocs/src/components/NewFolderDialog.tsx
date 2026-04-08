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

interface NewFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFolder: (folderName: string) => Promise<void>;
  isCreating: boolean;
}

export default function NewFolderDialog({
  isOpen,
  onClose,
  onCreateFolder,
  isCreating,
}: NewFolderDialogProps) {
  const [folderName, setFolderName] = useState("");

  const handleCreate = async () => {
    if (!folderName.trim()) return;
    await onCreateFolder(folderName.trim());
    setFolderName("");
  };

  const handleClose = () => {
    setFolderName("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogDescription>
            Create a new folder in the current location
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              placeholder="Enter folder name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && folderName.trim()) {
                  handleCreate();
                }
              }}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!folderName.trim() || isCreating}
          >
            {isCreating ? "Creating..." : "Create Folder"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}