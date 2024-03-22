import {
  IContainer,
  IContainerProperty,
  IContainerPermission
} from "../common";

const samples = [
  {
    id: 'c32f1ceb-0c1c-4f71-9d1a-9b8b1f7bf3e9',
    displayName: 'Container 1',
    containerTypeId: 'a9b7e1a8-5b1d-4c13-8d9a-1e8c6f2b3d4f',
    createdDateTime: '2023-04-12T16:20:30Z'
  },
  {
    id: 'd1a2e8c6-4f3b-1c2d-5a6e-9f8a7c4b3e2d',
    displayName: 'Container 2',
    containerTypeId: 'b7f3a1c2-9d8a-4b3e-1c6f-2d5a8e1b7a9c',
    createdDateTime: '2023-05-15T10:45:00Z'
  },
  {
    id: 'e9b8a7c6-3d2b-8a1f-4c9d-5b6f7e2a1c8d',
    displayName: 'Container 3',
    containerTypeId: 'c5b4a3d2-1f6c-9b8e-7a4d-3e2c1b5a9f7c',
    createdDateTime: '2023-06-20T12:30:45Z'
  },
  {
    id: 'f4e3d2c1-7b6a-1f5c-8d9e-2a3b4c5d6f7',
    displayName: 'Container 4',
    containerTypeId: 'd8e9f2a7-1c3d-6b4a-9e5c-2f8b1c7d9e3a',
    createdDateTime: '2023-07-25T08:15:20Z'
  },
  {
    id: 'a6b5c4d3-2e1f-7a9b-8c6d-5e4f3a2b1c7',
    displayName: 'Container 5',
    containerTypeId: 'e1d9c8b7-3a2f-6d5e-4c1b-7a9f8c2d3b6',
    createdDateTime: '2023-08-30T14:10:00Z'
  },
  {
    id: 'b1c2d3e4-5f6a7b8-9c1d2e3f4a5',
    displayName: 'Container 6',
    containerTypeId: 'f9a8b7c6-2d3e4f5a6b7c8',
    createdDateTime: '2023-09-05T18:55:30Z'
  },
  {
    id: 'c6d7a8b9-3e4f5a6-2b1c2d3e4f5',
    displayName: 'Container 7',
    containerTypeId: '1d2e3f4a5-6b7c8d9e1f2a3b4c',
    createdDateTime: '2023-10-10T09:40:15Z'
  },
  {
    id: 'd2e3f4a5-7b8c9d1-e2f3a4b5c6d7',
    displayName: 'Container 8',
    containerTypeId: '2e3f4a5b6-7c8d9e1f2a3b4c5',
    createdDateTime: '2023-11-15T22:25:45Z'
  },
  {
    id: 'e1f2a3b4-9c1d2e3f4-a5b6c7d8e9f',
    displayName: 'Container 9',
    containerTypeId: '3f4a5b6c7-8d9e1f2a3b4c5d6',
    createdDateTime: '2023-12-20T11:05:10Z'
  },
  {
    id: 'f5a6b7c8-1d2e3f4a-5b6c7d8e9f1',
    displayName: 'Container 10',
    containerTypeId: '4a5b6c7d8-9e1f2a3b4c5d6e7',
    createdDateTime: '2024-01-25T17:00:30Z'
  }
];

const getContainers = async (): Promise<IContainer[]> => {
  return new Promise(resolve => resolve(samples));
}

const getContainer = async (containerId: string): Promise<IContainer> => {
  const container = samples.find(c => c.id === containerId);
  return new Promise(resolve => resolve(container as IContainer));
}

const getContainerProperties = async (containerId: string): Promise<IContainerProperty[]> => {
  return new Promise(resolve => resolve([
    {
      propertyName: "property-1",
      propertyValue: "value-1",
      isSearchable: false
    },
    {
      propertyName: "property-2",
      propertyValue: "value-2",
      isSearchable: true
    },
    {
      propertyName: "property-3",
      propertyValue: "value-3",
      isSearchable: true
    }
  ]));
}

const getContainerPermissions = async (containerId: string): Promise<IContainerPermission[]> => {
  return new Promise(resolve => resolve([
    {
      id: "permission-1",
      roles: ["Owner"],
      user: {
        displayName: "Adele Vance",
        email: "adelev@contoso.onmicrosoft.com",
        userPrincipalName: "adelev@contoso.onmicrosoft.com"
      }
    },
    {
      id: "permission-2",
      roles: ["Writer"],
      user: {
        displayName: "Megan Bowen",
        email: "meganb@contoso.onmicrosoft.com",
        userPrincipalName: "meganb@contoso.onmicrosoft.com"
      }
    },
    {
      id: "permission-3",
      roles: ["Reader"],
      user: {
        displayName: "Alex Wilber",
        email: "alexw@contoso.onmicrosoft.com",
        userPrincipalName: "alexw@contoso.onmicrosoft.com"
      }
    }
  ]));
}

export {
  getContainers,
  getContainer,
  getContainerProperties,
  getContainerPermissions
};
