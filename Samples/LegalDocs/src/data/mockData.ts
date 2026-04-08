import { LegalCase, CaseFolder, CaseDocument } from "@/types/legal";

// Mock data for demonstration - in production, this would come from Graph API
export const mockCases: LegalCase[] = [
  {
    id: "1",
    name: "State of LA vs Joshua Cornell",
    createdDate: new Date("2025-08-26"),
    modifiedDate: new Date("2025-08-26"),
    status: "active",
    folderCount: 5,
    documentCount: 12,
    containerId: "container-1",
  },
  {
    id: "2",
    name: "Eugene Steppe vs Miami Beach Realty",
    createdDate: new Date("2025-08-25"),
    modifiedDate: new Date("2025-08-25"),
    status: "active",
    folderCount: 3,
    documentCount: 8,
    containerId: "container-2",
  },
  {
    id: "3",
    name: "Johnson & Associates Merger",
    createdDate: new Date("2025-08-20"),
    modifiedDate: new Date("2025-08-24"),
    status: "pending",
    folderCount: 4,
    documentCount: 15,
    containerId: "container-3",
  },
  {
    id: "4",
    name: "TechCorp IP Infringement Claim",
    createdDate: new Date("2025-08-15"),
    modifiedDate: new Date("2025-08-22"),
    status: "active",
    folderCount: 6,
    documentCount: 23,
    containerId: "container-4",
  },
];

export const mockFolders: Record<string, CaseFolder[]> = {
  "1": [
    { id: "f1", name: "Contracts", parentId: null, itemCount: 2, createdDate: new Date("2025-08-25"), modifiedDate: new Date("2025-08-25") },
    { id: "f2", name: "Correspondence", parentId: null, itemCount: 3, createdDate: new Date("2025-08-25"), modifiedDate: new Date("2025-08-25") },
    { id: "f3", name: "Invoices", parentId: null, itemCount: 3, createdDate: new Date("2025-08-25"), modifiedDate: new Date("2025-08-25") },
    { id: "f4", name: "Progress Reports", parentId: null, itemCount: 2, createdDate: new Date("2025-09-26"), modifiedDate: new Date("2025-09-26") },
  ],
  "2": [
    { id: "f5", name: "Property Documents", parentId: null, itemCount: 4, createdDate: new Date("2025-08-25"), modifiedDate: new Date("2025-08-25") },
    { id: "f6", name: "Legal Briefs", parentId: null, itemCount: 2, createdDate: new Date("2025-08-25"), modifiedDate: new Date("2025-08-25") },
  ],
};

export const mockDocuments: Record<string, CaseDocument[]> = {
  "1": [
    { id: "d1", name: "BarCodeSeparator2.docx", folderId: "root", size: 12430, createdDate: new Date("2025-09-08"), modifiedDate: new Date("2025-09-08"), createdBy: "Steve Pucelik", fileType: "docx" },
    { id: "d2", name: "Sample Document.docx", folderId: "root", size: 11110, createdDate: new Date("2025-09-18"), modifiedDate: new Date("2025-09-18"), createdBy: "Steve Pucelik", fileType: "docx" },
    { id: "d3", name: "SharePoint Embedded Deployment Guide.pdf", folderId: "root", size: 3430000, createdDate: new Date("2025-09-16"), modifiedDate: new Date("2025-09-16"), createdBy: "Steve Pucelik", fileType: "pdf" },
    { id: "d4", name: "state_of_louisiana_v_joshua_cornell_palmer.pdf", folderId: "root", size: 233750, createdDate: new Date("2025-08-25"), modifiedDate: new Date("2025-08-25"), createdBy: "Steve Pucelik", fileType: "pdf" },
  ],
};
