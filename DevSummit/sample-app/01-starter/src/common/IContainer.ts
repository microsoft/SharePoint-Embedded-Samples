export interface IContainer {
  id: string;
  displayName: string;
  containerTypeId: string;
  createdDateTime: string;
}

export interface IContainerProperty {
  propertyName: string;
  propertyValue: string;
  isSearchable: boolean;
}

export interface IUser {
  displayName?: string;
  email?: string;
  userPrincipalName: string;
}

export interface IContainerPermission {
  id?: string;
  roles: string[];
  user: IUser;
}
