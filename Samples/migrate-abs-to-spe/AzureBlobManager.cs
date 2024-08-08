using Azure.Storage.Blobs;

namespace MigrateABStoSPE
{
    public class AzureBlobManager
    {
        string _containerLevelSASUrl;
        BlobContainerClient _containerClient;

        public AzureBlobManager(string containerLevelSASUrl)
        {
            _containerLevelSASUrl = containerLevelSASUrl;
            _containerClient = new BlobContainerClient(new Uri(_containerLevelSASUrl));
        }

        /// <summary>
        /// Gets the name of the Azure Blob Storage container.
        /// </summary>
        /// <returns>The name of the container.</returns>
        public string GetContainerName()
        {
            return _containerClient.Name;
        }

        /// <summary>
        /// Lists all the blobs in the Azure Blob Storage container asynchronously.
        /// </summary>
        /// <returns>An enumerable collection of blob names or null.</returns>
        public async Task<IEnumerable<string>?> ListBlobsAsync()
        {
            try
            {
                var blobs = new List<string>();
                await foreach (var blobItem in _containerClient.GetBlobsAsync())
                {
                    blobs.Add(blobItem.Name);
                }
                return blobs;
            }
            catch (Exception ex)
            {
                Utility.ConsoleWriteWithColor($"An error occurred while listing blobs: {ex.Message}", ConsoleColor.Red);
                return null;
            }
        }

        /// <summary>
        /// Downloads the stream of a blob from Azure Blob Storage.
        /// </summary>
        /// <param name="blobName">The name of the blob to download.</param>
        /// <returns>The stream containing the downloaded blob data or null.</returns>
        public async Task<Stream> DownloadBlobStreamAsync(string blobName)
        {
            try
            {
                BlobClient blobClient = _containerClient.GetBlobClient(blobName);

                MemoryStream memoryStream = new MemoryStream();
                await blobClient.DownloadToAsync(memoryStream);
                memoryStream.Position = 0; // Reset the stream position to the beginning
                return memoryStream;
            }
            catch (Exception ex)
            {
                string message = ex.Message;
                int index = message.IndexOf("RequestId");
                if (index != -1)
                {
                    message = message.Substring(0, index);
                }

                Utility.ConsoleWriteWithColor($"An error occurred while downloading blob: {message}", ConsoleColor.Red);

                throw ex;
            }
        }
    }
}