using Azure.Identity;
using Microsoft.Graph;
using Microsoft.Graph.Models;
using Microsoft.Graph.Models.ODataErrors;
using Microsoft.Graph.Drives.Item.Items.Item.CreateUploadSession;
using Microsoft.Kiota.Http.HttpClientLibrary.Middleware.Options;
using System.Net;

namespace MigrateABStoSPE
{
    public class GraphClientManager: IGraphClientManager
    {
        private GraphServiceClient _graphClient;
        private string _clientId;
        private string _containerId;
        string[] _scopes = { "User.Read", "FileStorageContainer.Selected" };
        // This is a recommended size as a starting point. You can experiment with different chunk sizes.
        // For example, increasing the chunk size might reduce the number of requests but could lead to
        // larger data transfers that might be more susceptible to network issues.
        private const int _maxChunkSize = 320 * 1024; // 320 KB - Upload the file in chunks

        public GraphClientManager(GraphServiceClient graphClient, string tenantId, string clientId, string containerId, string?[] scopes)
        {
            if (graphClient == null)
            {
                if (scopes != null)
                {
                    _scopes = scopes;
                }

                InteractiveBrowserCredentialOptions interactiveBrowserCredentialOptions = new InteractiveBrowserCredentialOptions()
                {
                    TenantId = tenantId,
                    ClientId = clientId,
                    RedirectUri = new Uri("http://localhost"),
                };
                InteractiveBrowserCredential interactiveBrowserCredential = new InteractiveBrowserCredential(interactiveBrowserCredentialOptions);

                graphClient = new GraphServiceClient(interactiveBrowserCredential, scopes, null);
            }

            _graphClient = graphClient;
            _clientId = clientId;
            _containerId = containerId;
        }

        public async Task<bool> Authenticate()
        {
            try
            {
                var user = await _graphClient.Me.GetAsync();
                if (user != null)
                {
                    Utility.ConsoleWriteWithColor($"Graph Authenticated Successfully", ConsoleColor.Magenta);
                    return true;
                }
                Utility.ConsoleWriteWithColor($"Graph failed To Authenticate.", ConsoleColor.Red);
                return false;
            }
            catch (Exception ex)
            {
                Utility.ConsoleWriteWithColor($"Graph failed To Authenticate. Exception: {ex.Message}.", ConsoleColor.Red);
                return false;
            }
        }

        public async Task<DriveItem?> CreateFolder(string folderName, string parentFolderId)
        {
            string functionName = "CreateFolder";

            var folder = new DriveItem
            {
                Name = folderName,
                Folder = new Folder(),
                AdditionalData = new Dictionary<string, object>()
                {
                    { "@microsoft.graph.conflictBehavior", "fail" }
                }
            };
            try
            {
                // Retry has already been implemented in the Graph SDK
                var createdFolder = await _graphClient.Drives[_containerId].Items[parentFolderId].Children.PostAsync(folder);
                if (createdFolder != null)
                {
                    Utility.ConsoleWriteWithColor($"{functionName}: Folder Created \"{folderName}\". Parent: {parentFolderId}", ConsoleColor.Cyan);
                    return createdFolder;
                }
                Utility.ConsoleWriteWithColor($"{functionName}: Failed to create folder \"{folderName}\". Parent: {parentFolderId}", ConsoleColor.Red);
                return null;
            }
            catch (ODataError odataError)
            {
                HandleUnsuccessfulResponse(odataError, "Create folder request failed", parentFolderId, folderName);

                return null;
            }
            catch (Exception ex)
            {
                HandleUnsuccessfulResponse(ex, "Failed to create folder", parentFolderId, folderName);

                return null;
            }
        }

        public async Task<DriveItem?> CheckIfItemExists(string itemPath, string parentFolderId)
        {
            string functionName = "CheckIfItemExists";
            try
            {
                var item = await _graphClient.Drives[_containerId].Items[parentFolderId].ItemWithPath(itemPath).GetAsync();

                if (item != null)
                {
                    Utility.ConsoleWriteWithColor($"{functionName} - Item name: \"{itemPath}\" exist. Parent: \"{parentFolderId}\"", ConsoleColor.Yellow);
                    return item;
                }
            }
            catch (ODataError odataError)
            {
                HandleUnsuccessfulResponse(odataError, "Check item exists request failed", parentFolderId, itemPath);
            }
            catch (Exception e)
            {
                HandleUnsuccessfulResponse(e, "Failed to check item exists", parentFolderId, itemPath);

                Console.WriteLine($"An exception occurred while checking to see if item exists: {itemPath}: {e.Message}");
            }

            return null;
        }

        public async Task<bool> UploadStreamToSharePointAsync(Stream stream, string parentFolderId, string fileName)
        {
            var uploadSessionRequestBody = new CreateUploadSessionPostRequestBody()
            {
                AdditionalData = new Dictionary<string, object>
                {
                    { "@microsoft.graph.conflictBehavior", "fail" }
                }
            };

            try
            {
                var uploadSession = await _graphClient.Drives[_containerId]
                    .Items[parentFolderId]
                    .ItemWithPath(fileName)
                    .CreateUploadSession
                    .PostAsync(uploadSessionRequestBody);

                var fileUploadTask = new LargeFileUploadTask<DriveItem>(uploadSession, stream, _maxChunkSize, _graphClient.RequestAdapter);

                IProgress<long> progress = new Progress<long>(prog => Console.WriteLine($"Uploaded {fileName} {prog} bytes"));

                var uploadResult = await fileUploadTask.UploadAsync(progress);
                if (uploadResult.UploadSucceeded)
                {
                    Console.WriteLine($"Upload succeeded: {fileName}!");
                    return true;
                }
                else
                {
                    Console.WriteLine($"Upload failed: {fileName}.");
                    return false;
                }
            }
            catch (Exception ex)
            {
                Utility.ConsoleWriteWithColor($"An error occurred while uploading: {fileName}! Exception: {ex.Message}", ConsoleColor.Red);
                throw ex;
            }
        }

        /// <summary>
        /// Handles an unsuccessful response from the Graph API.
        /// </summary>
        /// <param name="error">The ODataError or Exception object representing the error response.</param>
        /// <param name="errorString">The error string to display.</param>
        /// <param name="parentFolderId">The ID of the parent folder.</param>
        /// <param name="item">The name of the item.</param>
        private void HandleUnsuccessfulResponse(Object error, string errorString, string parentFolderId, string item)
        {
            Utility.ConsoleWriteWithColor($"{errorString} - Item name: \"{item}\". Parent: \"{parentFolderId}\"", ConsoleColor.Red);

            if (error is ODataError oDataError)
            {
                switch (oDataError.ResponseStatusCode)
                {
                    case (int)HttpStatusCode.BadRequest:
                        Utility.ConsoleWriteWithColor($"Error: {oDataError.Error.Message}. Status code: {oDataError.ResponseStatusCode}.", ConsoleColor.Red);
                        break;
                    case (int)HttpStatusCode.Conflict:
                        Utility.ConsoleWriteWithColor($"Warning: {oDataError.Error.Message}. Status code: {oDataError.ResponseStatusCode}.", ConsoleColor.Yellow);
                        break;
                    case (int)HttpStatusCode.NotFound:
                        Utility.ConsoleWriteWithColor($"Warning: Item not found {item}", ConsoleColor.Yellow);
                        break;
                    default:
                        Utility.ConsoleWriteWithColor($"An error occurred. Please try again later. Status code: {oDataError.ResponseStatusCode}. Error message: {oDataError.Error.Message}", ConsoleColor.Red);
                        break;
                }
                return;
            }
            if (error is Exception e)
            {
                Utility.ConsoleWriteWithColor($"Unexpected exception occurred. Error message: {e.Message}", ConsoleColor.Red);
            }
        }
    }
}
