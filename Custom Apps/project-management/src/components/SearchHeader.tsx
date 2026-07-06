
import React from 'react';
import { useParams } from 'react-router-dom';
import SearchBar from './SearchBar';

const SearchHeader: React.FC = () => {
  // Get container ID if available from the route params
  const { containerId } = useParams<{ containerId?: string }>();
  
  return (
    <div className="border-b py-4 px-6 bg-background sticky top-0 z-10 shadow-sm">
      <div className="flex justify-between items-center gap-6">
        <div className="text-lg font-medium whitespace-nowrap">Search Documents</div>
        <SearchBar containerId={containerId} className="w-full max-w-md" />
      </div>
    </div>
  );
};

export default SearchHeader;
