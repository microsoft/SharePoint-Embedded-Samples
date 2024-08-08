using Azure.Storage.Blobs;
using Microsoft.Graph.Models;

namespace MigrateABStoSPE
{
    public class FileMigrator
    {
        private CountdownEvent _countdown;
        private GraphClientManager _gcm;
        private AzureBlobManager _abm;
        private string _containerName;
        private Dictionary<string, string> directoryListingCache = new Dictionary<string, string>();
        private const char _separator = '/';
        private List<string> blobUploadFailed = new List<string>();
        private List<string> blobUploadSuccessfully = new List<string>();
        private List<string> blobExist = new List<string>();

        public FileMigrator(
            int fileCount,
            GraphClientManager gcm,
            AzureBlobManager abm)
        {
            _countdown = new CountdownEvent(fileCount);
            _gcm = gcm;
            _abm = abm;
            _containerName = _abm.GetContainerName();
        }

        /// <summary>
        /// Migrates a list of files to a specified container folder.
        /// </summary>
        /// <param name="fileList">The list of files to migrate.</param>
        /// <returns>A task representing the asynchronous operation.</returns>
        public async Task MigrateFiles(IEnumerable<string> fileList)
        {
            // Create top level folder
            DriveItem containerFolder = await _gcm.CheckIfItemExists(_containerName, "root");
            if (containerFolder == null)
            {
                containerFolder = await _gcm.CreateFolder(_containerName, "root");
            }
            AddOrUpdateDirectoryListingCache(_containerName, containerFolder.Id);

            foreach (var blobName in fileList)
            {
                FileStructure fs = new FileStructure() { blobName = blobName };
                string parentFolderId = await TraverseFileListing(fs, containerFolder.Id);
                if (String.IsNullOrEmpty(parentFolderId))
                {
                    Utility.ConsoleWriteWithColor($"Failed to create folder/sub folders for this blob {blobName}", ConsoleColor.Red);
                    _countdown.Signal();
                    continue;
                }
                fs.parentFolderId = parentFolderId;

                Utility.ConsoleWriteWithColor($"Queuing \"{blobName}\" to be migrate", ConsoleColor.Green);
                ThreadPool.QueueUserWorkItem(MigrateFile, fs);
            }

            // Wait for all files to be migrated
            Console.WriteLine("Waiting for all blobs to be migrated - " + DateTime.Now.ToString("HH:mm:ss"));
            _countdown.Wait();
            Console.WriteLine("All blobs got processed - " + DateTime.Now.ToString("HH:mm:ss"));
        }

        /// <summary>
        /// Migrates a single file to a specified container folder.
        /// </summary>
        /// <param name="stateInfo">The state information containing the file structure.</param>
        internal async void MigrateFile(Object stateInfo)
        {
            var fileStructure = (FileStructure)stateInfo;

            // Check if file exists in destination
            string fileName = Path.GetFileName(fileStructure.blobName);
            DriveItem fileDI = await _gcm.CheckIfItemExists(fileName, fileStructure.parentFolderId);
            if (fileDI != null)
            {
                Utility.ConsoleWriteWithColor($"{fileName} already exists, will not migrate again.", ConsoleColor.Yellow);
                blobExist.Add(fileStructure.blobName);
                _countdown.Signal();
                return;
            }

            // Migrate the file
            bool result = await TransferBlobToSharePointAsync(fileStructure.blobName, fileStructure.parentFolderId);
            if (result)
            {
                Utility.ConsoleWriteWithColor($"Transfer successful: {fileName}!", ConsoleColor.Green);
                blobUploadSuccessfully.Add(fileStructure.blobName);
            }
            else
            {
                Utility.ConsoleWriteWithColor($"Transfer failed: {fileName}!", ConsoleColor.Red);
                blobUploadFailed.Add(fileStructure.blobName);
            }

            // Signal the countdown event that a file has been migrated
            _countdown.Signal();
            return;
        }

        /// <summary>
        /// Transfers a blob to SharePoint asynchronously.
        /// </summary>
        /// <param name="blobName">The name of the blob to transfer.</param>
        /// <param name="parentFolderId">The ID of the parent folder in SharePoint.</param>
        /// <returns>A task representing the asynchronous operation. Returns true if the transfer is successful, false otherwise.</returns>
        internal async Task<bool> TransferBlobToSharePointAsync(string blobName, string parentFolderId)
        {
            try
            {
                // Will throw exception if failed to download blob
                Stream blobStream = await _abm.DownloadBlobStreamAsync(blobName);

                string fileName = Path.GetFileName(blobName);
                // Will throw exception if failed to upload file
                await _gcm.UploadStreamToSharePointAsync(blobStream, parentFolderId, fileName);

                return true; // Indicate success
            }
            catch (Exception ex)
            {
                // Log the exception or handle it as needed
                Utility.ConsoleWriteWithColor($"An error occurred while migrating failed: {blobName}! Exception: {ex.Message}", ConsoleColor.Red);
                return false; // Indicate failure
            }
        }

        /// <summary>
        /// Retrieves the list of blob names that failed to upload during the migration process.
        /// </summary>
        /// <returns>A list of blob names that failed to upload.</returns>
        public List<string> GetBlobUploadFailed()
        {
            return blobUploadFailed;
        }

        /// <summary>
        /// Retrieves the list of blob names that upload successfully during the migration process.
        /// </summary>
        /// <returns>A list of blob names that upload successfully.</returns>
        public List<string> GetBlobUploadSuccessfully()
        {
            return blobUploadSuccessfully;
        }

        /// <summary>
        /// Retrieves the list of blob names already exist in destination.
        /// </summary>
        /// <returns>A list of blob names already exist in destination.</returns>
        public List<string> GetBlobExist()
        {
            return blobExist;
        }

        /// <summary>
        /// Retrieves the directory listing from the cache based on the directory name.
        /// </summary>
        /// <param name="directoryName">The name of the directory.</param>
        /// <returns>The directory listing if found in the cache, otherwise null.</returns>
        private string? GetDirectoryListingCache(string directoryName)
        {
            if (directoryListingCache.ContainsKey(directoryName))
            {
                return directoryListingCache[directoryName];
            }
            return null;
        }

        /// <summary>
        /// Adds or updates the directory listing cache with the given directory name and ID.
        /// </summary>
        /// <param name="directoryName">The name of the directory.</param>
        /// <param name="id">The ID of the directory.</param>
        private void AddOrUpdateDirectoryListingCache(string directoryName, string id)
        {
            string functionName = "AddOrUpdateDirectoryListingCache";
            if (directoryListingCache.ContainsKey(directoryName))
            {
                Console.WriteLine($"{functionName}: Update cache \"{directoryName}\" with folder information");
                directoryListingCache[directoryName] = id;
            }
            else
            {
                Console.WriteLine($"{functionName}: Add to cache \"{directoryName}\" with folder information");
                directoryListingCache.Add(directoryName, id);
            }
        }

        /// <summary>
        /// Traverses the file listing and creates folders as necessary based on the file path.
        /// </summary>
        /// <param name="file">The file structure containing the file name.</param>
        /// <param name="parentFolderId">The ID of the parent folder.</param>
        /// <returns>The ID of the last created folder.</returns>
        private async Task<string> TraverseFileListing(FileStructure file, string parentFolderId)
        {
            string functionName = "TraverseFileListing";
            string filePath = file.blobName;
            if (filePath.Length == 0)
            {
                Utility.ConsoleWriteWithColor($"{functionName}: No folder found", ConsoleColor.Red);

                // Don't throw exception just log and continue
                return "";
            }

            // Get directory part of the file path
            string fullPath = Path.GetDirectoryName(filePath);
            if (String.IsNullOrEmpty(fullPath))
            {
                Console.WriteLine($"{functionName}: File {filePath} is in root");

                return parentFolderId;
            }

            string newFullPath = _containerName + _separator + fullPath;
            string folderIdFound = GetDirectoryListingCache(newFullPath);
            if (!String.IsNullOrEmpty(folderIdFound))
            {
                Console.WriteLine($"{functionName}: Full path found in cache: " + newFullPath);
                return folderIdFound;
            }

            // Parse for folder path not including the file name and put it in an array
            var pathSegments = filePath.Split(new char[] { '/' }, StringSplitOptions.RemoveEmptyEntries);
            string[] directoriesParts = pathSegments.Take(pathSegments.Length - 1).ToArray();

            // Traverse the folder listing and create 1 folder at a time
            string relativePath = _containerName;
            string newFolderId = parentFolderId;
            foreach (string folderName in directoriesParts)
            {
                string newPath = relativePath + _separator + folderName;
                string partFolderId = GetDirectoryListingCache(newPath);
                if (!String.IsNullOrEmpty(partFolderId))
                {
                    Console.WriteLine($"{functionName}: New part path found in cache: \"{newPath}\". Part Folder \"{partFolderId}\".");
                    newFolderId = partFolderId;
                    relativePath = newPath;
                    continue;
                }

                DriveItem subFolder = await _gcm.CheckIfItemExists(folderName, newFolderId);
                if (subFolder == null)
                {
                    subFolder = await _gcm.CreateFolder(folderName, newFolderId);
                    if (subFolder == null)
                    {
                        blobUploadFailed.Add(file.blobName);
                        Console.WriteLine($"{functionName}: Failed to create folder \"{folderName}\". Parent: {newFolderId}");
                        return "";
                    } 
                }
                newFolderId = subFolder.Id;
                AddOrUpdateDirectoryListingCache(newPath, newFolderId);

                relativePath = newPath;
            }

            return newFolderId;
        }
    }

    public class FileStructure
    {
        public string blobName { get; set; }
        public string parentFolderId { get; set; }
    }
}
