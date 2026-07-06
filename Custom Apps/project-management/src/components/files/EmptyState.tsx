
import React from 'react';
import { File, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  onUploadClick: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onUploadClick }) => {
  return (
    <div className="border rounded-lg p-12 text-center bg-white h-full flex flex-col items-center justify-center">
      <File className="h-12 w-12 mx-auto text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-1">No files found</h3>
      <p className="text-gray-500 mb-4">Upload files to get started</p>
      <Button onClick={onUploadClick}>
        <Upload className="mr-2 h-4 w-4" />
        Upload Files
      </Button>
    </div>
  );
};

export default EmptyState;
