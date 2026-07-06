
import React from 'react';
import { Progress } from '@/components/ui/progress';

interface FileUploadProgressProps {
  uploading?: boolean;
  progress?: number;
  files?: Array<{ name: string; progress: number }>;
}

const FileUploadProgress: React.FC<FileUploadProgressProps> = ({ uploading, progress, files }) => {
  // If we have files array, render multiple progress bars
  if (files && files.length > 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Uploading {files.length} files</h3>
        {files.map((file, index) => (
          <div key={`${file.name}-${index}`} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="truncate max-w-[300px]">{file.name}</span>
              <span>{file.progress}%</span>
            </div>
            <Progress value={file.progress} />
          </div>
        ))}
      </div>
    );
  }
  
  // If we have single progress value, use the original implementation
  if (!uploading) return null;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Uploading...</span>
        <span>{progress}%</span>
      </div>
      <Progress value={progress} />
    </div>
  );
};

export default FileUploadProgress;
