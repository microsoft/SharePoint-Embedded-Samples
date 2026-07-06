
import React from 'react';
import { ChevronRight, Folder, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BreadcrumbItem {
  id: string;
  name: string;
}

interface FolderNavigationProps {
  currentPath: BreadcrumbItem[];
  onNavigate: (folderId: string) => void;
}

const FolderNavigation: React.FC<FolderNavigationProps> = ({
  currentPath,
  onNavigate,
}) => {
  return (
    <div className="mb-4 p-4 bg-white rounded-lg border">
      <div className="flex items-center space-x-1">
        {currentPath.map((item, index) => (
          <React.Fragment key={item.id}>
            <div 
              className={`flex items-center ${
                index === currentPath.length - 1 
                  ? 'text-blue-600 font-medium' 
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => onNavigate(item.id)}
              >
                {index === currentPath.length - 1 ? (
                  <FolderOpen className="h-4 w-4 mr-2" />
                ) : (
                  <Folder className="h-4 w-4 mr-2" />
                )}
                <span>{item.name}</span>
              </Button>
              {index < currentPath.length - 1 && (
                <ChevronRight className="h-4 w-4 text-gray-400 mx-1" />
              )}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default FolderNavigation;
