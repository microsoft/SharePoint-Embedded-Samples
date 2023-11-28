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

using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Graph;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SyntexRSDemo.Controllers;
using SyntexRSDemo.Exceptions;
using SyntexRSDemo.Models;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;


namespace SyntexRSDemo.Services
{

    class PreviewItemResponse
    {
        public string GetUrl { get; set; }
    }

    /// <summary>Provides helper methods built over MS Graph SDK</summary>
    /// <seealso cref="SyntexRSDemo.Services.IMSGraphService" />
    public class MSGraphService : IMSGraphService
    {
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<MSGraphService> _logger;
        private const long SmallFileSizeBoundary = 4000000;
        private const string GraphContainersEndpoint = "beta/storage/fileStorage/containers";

        public MSGraphService(IConfiguration configuration, IHttpClientFactory httpClientFactory, ILogger<MSGraphService> logger)
        {
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        public async Task<ContainerModel> AddContainer(string accessToken, ContainerModel container)
        {
            HttpClient client = GetHttpClient(accessToken, "application/json");
            var response = await client.PostAsJsonAsync($"{GraphContainersEndpoint}", container);

            if (!response.IsSuccessStatusCode)
            {
                throw new ContainerException($"We couldn't create the container, status code {(int)response.StatusCode}, reason: {response.ReasonPhrase}''");
            }

            return response.Content.ReadAsAsync<ContainerModel>().Result;
        }

        public async Task ActivateContainer(string accessToken, string containerId)
        {
            HttpClient client = GetHttpClient(accessToken, "application/json");
            var response = await client.PostAsync($"{GraphContainersEndpoint}/{containerId}/activate", null);

            if (!response.IsSuccessStatusCode)
            {
                throw new ContainerException($"We couldn't activate the container, status code {(int)response.StatusCode}, reason: {response.ReasonPhrase}''");
            }
        }

        public async Task<ContainerModel> GetContainer(string accessToken, string containerId)
        {
            HttpClient client = GetHttpClient(accessToken, "application/json");
            var response = await client.GetAsync($"{GraphContainersEndpoint}/{containerId}");

            if (!response.IsSuccessStatusCode)
            {
                throw new ContainerException($"We couldn't get the container, status code {(int)response.StatusCode}, reason: {response.ReasonPhrase}''");
            }

            return response.Content.ReadAsAsync<ContainerModel>().Result;
        }

        public async Task<ContainerModel> UpdateContainer(string accessToken, string containerId, ContainerModel container)
        {
            HttpClient client = GetHttpClient(accessToken, "application/json");
            string serialized = JsonConvert.SerializeObject(container, new JsonSerializerSettings { NullValueHandling = NullValueHandling.Ignore });
            HttpContent content =  new StringContent(serialized, Encoding.UTF8, "application/json");
            var response = await client.PatchAsync($"{GraphContainersEndpoint}/{containerId}", content);

            if (!response.IsSuccessStatusCode)
            {
                throw new ContainerException($"We couldn't update the container, status code {(int)response.StatusCode}, reason: {response.ReasonPhrase}''");
            }

            return response.Content.ReadAsAsync<ContainerModel>().Result;
        }

        public async Task DeleteContainer(string accessToken, string containerId)
        {
            HttpClient client = GetHttpClient(accessToken, "application/json");
            var response = await client.DeleteAsync($"{GraphContainersEndpoint}/{containerId}");

            if (!response.IsSuccessStatusCode)
            {
                throw new ContainerException($"We couldn't delete the container. Status code {(int)response.StatusCode}, reason: {response.ReasonPhrase}''");
            }
        }

        public async Task<IEnumerable<ContainerModel>> GetAllContainers(string accessToken)
        {
            string containerTypeId = _configuration.GetValue<string>("TestContainer:containerTypeId");
            HttpClient client = GetHttpClient(accessToken, "application/json");
            var response = await client.GetAsync($"{GraphContainersEndpoint}?$filter=containerTypeId eq {containerTypeId}");

            _logger.LogInformation("Request url {1}", response.RequestMessage.RequestUri.ToString());
            _logger.LogInformation("containerTypeId {1}", containerTypeId);
            if (!response.IsSuccessStatusCode)
            {
                throw new ContainerException($"We couldn't get the list of containers. Status code {(int)response.StatusCode}, reason: {response.ReasonPhrase}''");
            }
            string content = await response.Content.ReadAsStringAsync();
            JObject deserialized = JsonConvert.DeserializeObject<JObject>(content);
            JArray array = deserialized.Value<JArray>("value");
            return array.ToObject<List<ContainerModel>>();
        }

        public async Task<IEnumerable<ContainerPermissionModel>> GetContainerPermissions(string accessToken, string containerId)
        {
            HttpClient client = GetHttpClient(accessToken, "application/json");
            var response = await client.GetAsync($"{GraphContainersEndpoint}/{containerId}/permissions");

            if (!response.IsSuccessStatusCode)
            {
                throw new ContainerException($"We couldn't get the container's permissions. Status code {(int)response.StatusCode}, reason: {response.ReasonPhrase}''");
            }
            string content = await response.Content.ReadAsStringAsync();
            JObject deserialized = JsonConvert.DeserializeObject<JObject>(content);
            JArray array = deserialized.Value<JArray>("value");
            return array.ToObject<List<ContainerPermissionModel>>();
        }

        public async Task<ContainerPermissionModel> UpdateContainerPermission(string accessToken, string containerId, string permissionId, string role)
        {
            HttpClient client = GetHttpClient(accessToken, "application/json");
            var json = $@"{{ ""roles"":[""{role}""]}}";
            HttpContent content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await client.PatchAsync($"{GraphContainersEndpoint}/{containerId}/permissions/{permissionId}", content);

            if (!response.IsSuccessStatusCode)
            {
                throw new ContainerException($"We couldn't update the container's permission. Status code {(int)response.StatusCode}, reason: {response.ReasonPhrase}''");
            }
            return response.Content.ReadAsAsync<ContainerPermissionModel>().Result;
        }

        public async Task<ContainerPermissionModel> AddContainerPermission(string accessToken, string containerId, ContainerPermissionModel permission)
        {
            HttpClient client = GetHttpClient(accessToken, "application/json");
            string serialized = JsonConvert.SerializeObject(permission, new JsonSerializerSettings { NullValueHandling = NullValueHandling.Ignore });
            HttpContent content = new StringContent(serialized, Encoding.UTF8, "application/json");
            var response = await client.PostAsync($"{GraphContainersEndpoint}/{containerId}/permissions", content);

            if (!response.IsSuccessStatusCode)
            {
                throw new ContainerException($"We couldn't add the permission to the container. Status code {(int)response.StatusCode}, reason: {response.ReasonPhrase}''");
            }
            return response.Content.ReadAsAsync<ContainerPermissionModel>().Result;
        }

        public async Task DeleteContainerPermission(string accessToken, string containerId, string permissionId)
        {
            HttpClient client = GetHttpClient(accessToken, "application/json");
            var response = await client.DeleteAsync($"{GraphContainersEndpoint}/{containerId}/permissions/{permissionId}");

            if (!response.IsSuccessStatusCode)
            {
                throw new ContainerException($"We couldn't delete the permission. Status code {(int)response.StatusCode}, reason: {response.ReasonPhrase}''");
            }
        }

        public async Task<Drive> GetDrive(string accessToken, string driveId)
        {
            var graphServiceClient = getGraphClient(accessToken);
            Drive drive = await graphServiceClient.Drives[driveId]
                .Request()
            .GetAsync();

            var json = JsonConvert.SerializeObject(drive);
            Console.WriteLine(json);
            return drive;
        }

        public Task<Drive> UpdateDrive(string accessToken, string driveId, Drive drive)
        {
            throw new NotSupportedException();
        }

        public Task DeleteDrive(string accessToken, string driveId)
        {
            throw new NotImplementedException();
        }

        public async Task<DriveItem> GetDriveRoot(string accessToken, string driveId)
        {
            var graphServiceClient = getGraphClient(accessToken);
            var driveItem = await graphServiceClient.Drives[driveId].Root
                .Request()
                .GetAsync();

            return driveItem;
        }

        public async Task<ICollection<DriveItem>> GetDriveItems(string accessToken, string driveId, string itemId)
        {
            var graphServiceClient = getGraphClient(accessToken);
            IDriveItemChildrenCollectionPage driveItems = await graphServiceClient.Drives[driveId].Items[itemId].Children
                .Request()
                .GetAsync();

            return driveItems;
        }

        public async Task<DriveItem> GetDriveItem(string accessToken, string driveId, string id)
        {
            var graphServiceClient = getGraphClient(accessToken);
            return await graphServiceClient.Drives[driveId].Items[id]
                .Request()
                .GetAsync();
        }

        public async Task<string> GetItemPreview(string accessToken, string driveId, string itemId)
        {
            var graphServiceClient = getGraphClient(accessToken);
            ItemPreviewInfo preview = await graphServiceClient.Drives[driveId].Items[itemId].Preview()
                .Request()
                .PostAsync();
            return preview.GetUrl;
        }

        public async Task<DriveItem> UpdateDriveItem(string accessToken, string driveId, string itemId, DriveItem driveItem)
        {
            var graphServiceClient = getGraphClient(accessToken);
            return await graphServiceClient.Drives[driveId].Items[itemId]
                .Request()
                .UpdateAsync(driveItem);
        }

        public async Task<DriveItem> CopyDriveItem(string accessToken, string driveId, string itemId, string name, ItemReference parentReference)
        {
            var graphServiceClient = getGraphClient(accessToken);
            return await graphServiceClient.Drives[driveId].Items[itemId]
                .Copy(name, parentReference)
                .Request()
                .PostAsync();
        }

        public async Task AddFile(string accessToken, string driveId, string parentId, string name, System.IO.Stream stream)
        {
            //Upload small file> https://docs.microsoft.com/en-us/graph/api/driveitem-put-content
            //Upload large file> https://docs.microsoft.com/en-us/graph/sdks/large-file-upload

            var graphServiceClient = getGraphClient(accessToken);
            if (stream.Length < SmallFileSizeBoundary)
            {
                await UploadSmallFile(graphServiceClient, driveId, parentId, name, stream);
            }
            else
            {
                await UploadLargeFile(graphServiceClient, driveId, parentId, name, stream);
            }
        }

        private async Task UploadSmallFile(GraphServiceClient graphServiceClient, string driveId, string parentId, string name, Stream stream)
        {
            await graphServiceClient.Drives[driveId].Items[parentId]
                .ItemWithPath(name)
                .Content
                .Request()
                .PutAsync<DriveItem>(stream);
        }


        private async Task UploadLargeFile(GraphServiceClient graphServiceClient, string driveId, string parentId, string name, Stream fileStream)
        {
            // Use properties to specify the conflict behavior
            // in this case, replace
            var uploadProps = new DriveItemUploadableProperties
            {
                AdditionalData = new Dictionary<string, object>
                {
                    { "@microsoft.graph.conflictBehavior", "replace" }
                }
            };

            var uploadSession = await graphServiceClient.Drives[driveId].Items[parentId]
                .ItemWithPath(name)
                .CreateUploadSession(uploadProps)
                .Request()
                .PostAsync();

            // Max slice size must be a multiple of 320 KiB
            // The recommended fragment size is between 5-10 MiB.
            // https://docs.microsoft.com/en-us/graph/api/driveitem-createuploadsession?view=graph-rest-1.0
            int maxSliceSize = 320 * 1024 * 16;
            var fileUploadTask =
                new LargeFileUploadTask<DriveItem>(uploadSession, fileStream, maxSliceSize);

            var totalLength = fileStream.Length;
            // Create a callback that is invoked after each slice is uploaded
            IProgress<long> progress = new Progress<long>(prog =>
            {
                Console.WriteLine($"Uploaded {prog} bytes of {totalLength} bytes");
            });

            try
            {
                var uploadResult = await fileUploadTask.UploadAsync(progress);

                Console.WriteLine(uploadResult.UploadSucceeded ?
                    $"Upload complete, item ID: {uploadResult.ItemResponse.Id}" :
                    "Upload failed");
            }
            catch (ServiceException ex)
            {
                Console.WriteLine($"Error uploading: {ex.ToString()}");
            }
        }

        public async Task DeleteDriveItem(string accessToken, string driveId, string itemId)
        {
            var graphServiceClient = getGraphClient(accessToken);
            await graphServiceClient.Drives[driveId].Items[itemId]
                .Request()
                .DeleteAsync();
        }

        public Task<ICollection<Site>> GetContainers(string uri, string accessToken)
        {
            //Not implemented, return an empty list
            ICollection<Site> containers = new List<Site>();
            return Task.FromResult(containers);
        }

        public async Task AddFolder(string accessToken, string driveId, string parentId, string name)
        {
            var driveItem = new DriveItem
            {
                Name = name,
                Folder = new Microsoft.Graph.Folder
                {
                },
                AdditionalData = new Dictionary<string, object>()
                {
                    {"@microsoft.graph.conflictBehavior", "rename"}
                }
            };
            var graphClient = getGraphClient(accessToken);

            try
            {
                await graphClient.Drives[driveId].Items[parentId].Children
                        .Request()
                        .AddAsync(driveItem);
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
            }
        }

        public async Task<ICollection<Permission>> GetPermissions(string accessToken, string driveId, string itemId)
        {
            var graphClient = getGraphClient(accessToken);
            return await graphClient.Drives[driveId].Items[itemId].Permissions
                .Request()
                .GetAsync();
        }

        public async Task<Permission> GetPermission(string accessToken, string driveId, string itemId, string permissionId)
        {
            var graphClient = getGraphClient(accessToken);
            var permission = await graphClient.Drives[driveId].Items[itemId].Permissions[permissionId]
                .Request()
                .GetAsync();
            return permission;
        }

        // Graph reference on permision update
        // https://learn.microsoft.com/en-us/graph/api/permission-update?view=graph-rest-beta
        //
        public async Task UpdatePermission(string accessToken, string driveId, string itemId, string permissionId, List<string> roles)
        {
            var permission = new Permission
            {
                Roles = roles
            };

            var graphClient = getGraphClient(accessToken);
            await graphClient.Drives[driveId].Items[itemId].Permissions[permissionId]
                .Request()
                .UpdateAsync(permission);
        }

        // Graph reference on permision delete
        // https://learn.microsoft.com/en-us/graph/api/permission-delete?view=graph-rest-beta
        //
        public async Task DeletePermission(string accessToken, string driveId, string itemId, string permissionId)
        {
            var graphClient = getGraphClient(accessToken);
            await graphClient.Drives[driveId].Items[itemId].Permissions[permissionId]
                .Request()
                .DeleteAsync();
        }


        // Graph reference on permisions
        // https://docs.microsoft.com/en-us/graph/api/driveitem-invite
        public async Task AddPermissions(string accessToken, string driveId, string itemId, IEnumerable<string> roles, IEnumerable<DriveRecipient> recipients)
        {
            var graphClient = getGraphClient(accessToken);

            var requireSignIn = true;
            var sendInvitation = false;

            await graphClient.Drives[driveId].Items[itemId]
                .Invite(recipients, requireSignIn, roles, sendInvitation)
                .Request()
                .PostAsync();
        }

        public async Task<Uri> GetFileDownloadUrl(string accessToken, string driveId, string itemId)
        {
            HttpClient client = GetHttpClient(accessToken, "application/json");
            var response = await client.GetAsync($"v1.0/drives/{driveId}/items/{itemId}/content");

            if (!response.IsSuccessStatusCode)
            {
                throw new ContainerException($"We couldn't download the file, status code {(int)response.StatusCode}, reason: {response.ReasonPhrase}''");
            }

            return response.RequestMessage.RequestUri;
        }

        public async Task<ICollection<DriveItem>> SearchInDrive(string accessToken, string driveId, string searchString)
        {
            var graphServiceClient = getGraphClient(accessToken);
            var driveItems = await graphServiceClient.Drives[driveId].Root
                .Search(searchString)
                .Request()
                .GetAsync();

            return driveItems;
        }

        public async Task<ICollection<DriveItem>> SearchForCurrentUser(string accessToken, string searchString)
        {
            var graphServiceClient = getGraphClient(accessToken);
            var driveItems = await graphServiceClient.Me.Drive.Root
                .Search(searchString)
                .Request()
                .GetAsync();

            return driveItems;
        }


        /// <summary>
        /// Prepares an authenticated HTTP client.
        /// </summary>
        /// <param name="accessToken">The access token.</param>
        private HttpClient GetHttpClient(string token, string responseMediaType = null)
        {
            HttpClient client = _httpClientFactory.CreateClient();
            client.BaseAddress = new Uri("https://graph.microsoft.com");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("bearer", token);
            if (responseMediaType != null)
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue(responseMediaType));
            return client;
        }

        /// <summary>
        /// Prepares the authenticated client.
        /// </summary>
        /// <param name="accessToken">The access token.</param>
        private GraphServiceClient getGraphClient(string accessToken)
        {
            /***
            //Microsoft Azure AD Graph API endpoint,
            'https://graph.microsoft.com'   Microsoft Graph global service
            'https://graph.microsoft.us' Microsoft Graph for US Government
            'https://graph.microsoft.de' Microsoft Graph Germany
            'https://microsoftgraph.chinacloudapi.cn' Microsoft Graph China
                ***/

            string graphEndpoint = _configuration.GetValue<string>("GraphAPI:Endpoint");
            return new GraphServiceClient(graphEndpoint,
                            new DelegateAuthenticationProvider(
                                async (requestMessage) =>
                                {
                                    await Task.Run(() =>
                                    {
                                        requestMessage.Headers.Authorization = new AuthenticationHeaderValue("bearer", accessToken);
                                    });
                                }));
        }
    }
}