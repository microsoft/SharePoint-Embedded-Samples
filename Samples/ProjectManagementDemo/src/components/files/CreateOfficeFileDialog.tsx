
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent,
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
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
import { FileText, Sheet, Presentation } from 'lucide-react';
import { sharePointService } from '@/services/sharePointService';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';

interface CreateOfficeFileDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  containerId: string;
  currentFolder: string;
  onFileCreated: () => void;
}

const CreateOfficeFileDialog: React.FC<CreateOfficeFileDialogProps> = ({
  isOpen,
  onOpenChange,
  containerId,
  currentFolder,
  onFileCreated
}) => {
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<'word' | 'excel' | 'powerpoint'>('word');
  const [isCreating, setIsCreating] = useState(false);
  const { getAccessToken } = useAuth();

  const fileTypeOptions = [
    { value: 'word', label: 'Word Document', icon: FileText, extension: '.docx', fileExtension: 'docx' },
    { value: 'excel', label: 'Excel Spreadsheet', icon: Sheet, extension: '.xlsx', fileExtension: 'xlsx' },
    { value: 'powerpoint', label: 'PowerPoint Presentation', icon: Presentation, extension: '.pptx', fileExtension: 'pptx' }
  ];

  const handleCreate = async () => {
    if (!fileName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a file name",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreating(true);
      const token = await getAccessToken();
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Failed to get access token",
          variant: "destructive",
        });
        return;
      }

      const selectedOption = fileTypeOptions.find(opt => opt.value === fileType);
      if (!selectedOption) {
        toast({
          title: "Error",
          description: "Invalid file type selected",
          variant: "destructive",
        });
        return;
      }

      await sharePointService.createOfficeFile(
        token,
        containerId,
        currentFolder || 'root',
        fileName.trim(),
        selectedOption.fileExtension // Pass the actual file extension (docx, xlsx, pptx)
      );

      toast({
        title: "Success",
        description: `${selectedOption.label} created successfully`,
      });

      setFileName('');
      setFileType('word');
      onOpenChange(false);
      onFileCreated();
    } catch (error) {
      console.error('Error creating Office file:', error);
      toast({
        title: "Error",
        description: "Failed to create file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const selectedOption = fileTypeOptions.find(opt => opt.value === fileType);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Office File</DialogTitle>
          <DialogDescription>
            Create a new Microsoft Office file in the current folder
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fileType">File Type</Label>
            <Select value={fileType} onValueChange={(value: 'word' | 'excel' | 'powerpoint') => setFileType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select file type" />
              </SelectTrigger>
              <SelectContent>
                {fileTypeOptions.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fileName">File Name</Label>
            <div className="flex">
              <Input
                id="fileName"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Enter file name"
                className="flex-1"
              />
              <span className="flex items-center px-3 text-sm text-muted-foreground border border-l-0 border-input rounded-r-md bg-muted">
                {selectedOption?.extension}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={isCreating || !fileName.trim()}
          >
            {isCreating ? "Creating..." : "Create File"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOfficeFileDialog;
