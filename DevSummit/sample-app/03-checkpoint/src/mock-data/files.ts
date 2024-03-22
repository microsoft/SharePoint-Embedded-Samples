import { DriveItem } from "@microsoft/microsoft-graph-types-beta";

const samples: DriveItem[] = [
  {
    id: 'a1b2c3d4-5e6f7a8b-9c1d2e3f4a5b',
    name: 'Folder 1',
    folder: { childCount: 2 },
    lastModifiedBy: { user: { displayName: 'Megan Bowen' } },
    lastModifiedDateTime: '2023-04-12T16:20:30Z',
    webUrl: 'https://contoso.sharepoint.com/sites/contoso/Shared%20Documents/Folder%201'
  },
  {
    id: 'a1b2c3d4-5e6f7a8b-9c1d2e3f4a6b',
    name: 'Folder 2',
    folder: { childCount: 2 },
    lastModifiedBy: { user: { displayName: 'Alex Wilber' } },
    lastModifiedDateTime: '2023-04-12T16:20:30Z',
    webUrl: 'https://contoso.sharepoint.com/sites/contoso/Shared%20Documents/Folder%201'
  },
  {
    id: 'a1b2c3d4-5e6f7a8b-9c1d2e3f4a7b',
    name: 'File 1',
    lastModifiedBy: { user: { displayName: 'Alex Wilber' } },
    lastModifiedDateTime: '2023-04-12T16:20:30Z',
    webUrl: 'https://contoso.sharepoint.com/sites/contoso/Shared%20Documents/Folder%201'
  },
  {
    id: 'a1b2c3d4-5e6f7a8b-9c1d2e3f4a8b',
    name: 'File 2',
    lastModifiedBy: { user: { displayName: 'Alex Wilber' } },
    lastModifiedDateTime: '2023-04-12T16:20:30Z',
    webUrl: 'https://contoso.sharepoint.com/sites/contoso/Shared%20Documents/Folder%201'
  },
  {
    id: 'a1b2c3d4-5e6f7a8b-9c1d2e3f4a9b',
    name: 'File 3',
    lastModifiedBy: { user: { displayName: 'Alex Wilber' } },
    lastModifiedDateTime: '2023-04-12T16:20:30Z',
    webUrl: 'https://contoso.sharepoint.com/sites/contoso/Shared%20Documents/Folder%201'
  },
  {
    id: 'a1b2c3d4-5e6f7a8b-9c1d2e3f4a0b',
    name: 'File 4',
    lastModifiedBy: { user: { displayName: 'Alex Wilber' } },
    lastModifiedDateTime: '2023-04-12T16:20:30Z',
    webUrl: 'https://contoso.sharepoint.com/sites/contoso/Shared%20Documents/Folder%201'
  }
]

const getFiles = async (containerId: string): Promise<DriveItem[]> => {
  return new Promise(resolve => resolve(samples));
}

const getFile = async (fileId: string): Promise<DriveItem> => {
  const file = samples.find((file) => file.id === fileId);
  return new Promise(resolve => resolve(file as DriveItem));
}

export {
  getFiles,
  getFile
};
