export interface LegalCase {
  id: string;
  name: string;
  createdDate: Date;
  modifiedDate: Date;
  status: "active" | "pending" | "closed";
  folderCount: number;
  documentCount: number;
  containerId: string;
}

export interface CaseFolder {
  id: string;
  name: string;
  parentId: string | null;
  itemCount: number;
  createdDate: Date;
  modifiedDate: Date;
}

export interface CaseDocument {
  id: string;
  name: string;
  folderId: string;
  size: number;
  createdDate: Date;
  modifiedDate: Date;
  createdBy: string;
  fileType: string;
}
