
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent,
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileItem, sharePointService } from '@/services/sharePointService';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

interface ShareDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileItem | null;
  containerId: string;
  onShareComplete?: () => void;
}

const ShareDialog = ({
  isOpen,
  onOpenChange,
  file,
  containerId,
  onShareComplete
}: ShareDialogProps) => {
  const [recipients, setRecipients] = useState('');
  const [role, setRole] = useState<'read' | 'write'>('read');
  const [message, setMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const { getAccessToken } = useAuth();

  if (!file) return null;

  const handleShare = async () => {
    if (!recipients.trim()) {
      toast({
        title: "Missing Recipients",
        description: "Please enter at least one recipient email address",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSharing(true);
      
      // Get all recipient emails (comma or semicolon separated)
      const recipientsList = recipients
        .split(/[,;]/)
        .map(email => email.trim())
        .filter(email => email.length > 0);
      
      if (recipientsList.length === 0) {
        toast({
          title: "Invalid Recipients",
          description: "Please enter valid email addresses",
          variant: "destructive",
        });
        return;
      }
      
      const token = await getAccessToken();
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Failed to get access token",
          variant: "destructive",
        });
        return;
      }
      
      await sharePointService.shareFile(
        token,
        containerId,
        file.id,
        recipientsList,
        role,
        message
      );
      
      toast({
        title: "Shared Successfully",
        description: `Shared ${file.name} with ${recipientsList.length} recipient(s)`,
      });
      
      // Reset form
      setRecipients('');
      setRole('read');
      setMessage('');
      
      // Close dialog and notify parent
      onOpenChange(false);
      if (onShareComplete) {
        onShareComplete();
      }
    } catch (error) {
      console.error('Error sharing file:', error);
      toast({
        title: "Share Failed",
        description: "Failed to share file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share {file.name}</DialogTitle>
          <DialogDescription>
            Invite others to view or edit this file.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="recipients" className="text-left">
              Recipients
            </Label>
            <Input
              id="recipients"
              placeholder="email@example.com, email2@example.com"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="role" className="text-left">
              Permission
            </Label>
            <Select value={role} onValueChange={(value) => setRole(value as 'read' | 'write')}>
              <SelectTrigger>
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="write">Edit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="message" className="text-left">
              Message (Optional)
            </Label>
            <Textarea
              id="message"
              placeholder="Add a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSharing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleShare}
            disabled={isSharing}
          >
            {isSharing ? 'Sharing...' : 'Share'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
