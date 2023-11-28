/*
 The MIT License (MIT)

Copyright (c) 2020 Microsoft Corporation

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */


using Microsoft.Graph;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SyntexRSDemo.Models;

namespace SyntexRSDemo.Services
{
    public interface IMSGraphService
    {
        Task<ICollection<Site>> GetContainers(string accessToken, string uri);
        Task<ContainerModel> AddContainer(string accessToken, ContainerModel container);
        Task ActivateContainer(string accessToken, string containerId);
        Task<ContainerModel> GetContainer(string accessToken, string containerId);
        Task<ContainerModel> UpdateContainer(string accessToken, string containerId, ContainerModel container);
        Task DeleteContainer(string accessToken, string containerId);
        Task<IEnumerable<ContainerModel>> GetAllContainers(string accessToken);

        Task<IEnumerable<ContainerPermissionModel>> GetContainerPermissions(string accessToken, string containerId);
        Task<ContainerPermissionModel> UpdateContainerPermission(string accessToken, string containerId, string permissionId, string role);
        Task<ContainerPermissionModel> AddContainerPermission(string accessToken, string containerId, ContainerPermissionModel permission);
        Task DeleteContainerPermission(string accessToken, string containerId, string permissionId);

        Task<Drive> GetDrive(string accessToken, string driveId);
        Task<Drive> UpdateDrive(string accessToken, string driveId, Drive drive);
        Task DeleteDrive(string accessToken, string driveId);
        Task<DriveItem> GetDriveRoot(string accessToken, string driveId);

        Task<ICollection<DriveItem>> GetDriveItems(string accessToken, string driveId, string itemId);
        Task<DriveItem> GetDriveItem(string accessToken, string driveId, string id);
        Task<string> GetItemPreview(string accessToken, string driveId, string itemId);
        Task<DriveItem> UpdateDriveItem(string accessToken, string driveId, string itemId, DriveItem driveItem);
        Task<DriveItem> CopyDriveItem(string accessToken, string driveId, string itemId, string name, ItemReference parentReference);
        Task DeleteDriveItem(string accessToken, string driveId, string driveItemId);
        Task AddFile(string accessToken, string driveId, string parentId, string name, System.IO.Stream stream);
        Task AddFolder(string accessToken, string driveId, string parentId, string path);
        Task<Uri> GetFileDownloadUrl(string accessToken, string driveId, string itemId);

        Task<ICollection<Permission>> GetPermissions(string accessToken, string driveId, string itemId);
        Task<Permission> GetPermission(string accessToken, string driveId, string itemId, string permissionId);
        Task UpdatePermission(string accessToken, string driveId, string itemId, string permissionId, List<string> roles);
        Task DeletePermission(string accessToken, string driveId, string itemId, string permissionId);
        Task AddPermissions(string accessToken, string driveId, string itemId, IEnumerable<string> roles, IEnumerable<DriveRecipient> recipients);
        
        Task<ICollection<DriveItem>> SearchInDrive(string accessToken, string driveId, string searchString);
        Task<ICollection<DriveItem>> SearchForCurrentUser(string accessToken, string searchString);
    }
}