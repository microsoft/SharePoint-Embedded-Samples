using Microsoft.Graph.Models;

namespace MigrateABStoSPE
{
    public interface IGraphClientManager
    {
        /// <summary>
        /// Authenticates the Graph client.
        /// </summary>
        /// <returns>A boolean indicating whether the authentication was successful or not.</returns>
        Task<bool> Authenticate();

        /// <summary>
        /// Creates a folder with the specified name under the given parent folder ID.
        /// </summary>
        /// <param name="folderName">The name of the folder to create.</param>
        /// <param name="parentFolderId">The ID of the parent folder.</param>
        /// <returns>The created DriveItem representing the folder.</returns>
        Task<DriveItem?> CreateFolder(string folderName, string parentFolderId);

        /// <summary>
        /// Checks if an item with the specified path exists under the given parent folder ID.
        /// </summary>
        /// <param name="itemPath">The path of the item to check.</param>
        /// <param name="parentFolderId">The ID of the parent folder.</param>
        /// <returns>The DriveItem representing the item if it exists, otherwise null.</returns>
        Task<DriveItem?> CheckIfItemExists(string itemPath, string parentFolderId);

        /// <summary>
        /// Uploads a stream to SharePoint asynchronously. This stream is from ABS.
        /// </summary>
        /// <param name="stream">The stream to upload.</param>
        /// <param name="parentFolderId">The ID of the parent folder.</param>
        /// <param name="fileName">The name of the file.</param>
        Task<bool> UploadStreamToSharePointAsync(Stream stream, string parentFolderId, string fileName);
    }
}
