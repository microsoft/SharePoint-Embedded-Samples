using CommandLine;

namespace MigrateABStoSPE
{
    internal class Program
    {
        class Options
        {
            [Option('s', "sasurl", Required = true, HelpText = "container-level SAS URL - a azure blob container level SAS url.")]
            public string ContainerLevelSASUrl { get; set; }
            [Option('t', "tenantid", Required = true, HelpText = "SPE tenant id - the tenant id that we are authenticating against.")]
            public string TenantId { get; set; }
            [Option('c', "clientid", Required = true, HelpText = "SPE client id - the client id that we are authenticating against.")]
            public string ClientId { get; set; }
            [Option('o', "containerid", Required = true, HelpText = "SPE container id - the container id that we are migrating content to.")]
            public string ContainerId { get; set; }
            [Option('b', "blobfile", Required = false, HelpText = "(optional) File name with full path that contains the blob list.")]
            public string? BlobFiles { get; set; }
            [Option('f', "outputfile", Required = false, HelpText = "(optional) File name with full path where to output failed blobs.")]
            public string? OutputFile { get; set; }
        }

        public static async Task Main(string[] args)
        {
            string containerLevelSASUrl = String.Empty;
            string tenantId = String.Empty;
            string clientId = String.Empty;
            string containerId = String.Empty;
            string blobList = String.Empty;
            string outputFile = String.Empty;
            IEnumerable<string> blobListInJson = null;

            Parser.Default.ParseArguments<Options>(args)
            .WithParsed<Options>(opts => HandleOptions(opts, out containerLevelSASUrl, out tenantId, out clientId, out containerId, out blobList, out outputFile))
            .WithNotParsed<Options>((errs) => {
                ShowUsage();
                Environment.Exit(1);
            });

            try
            {
                ValidateArguments(containerLevelSASUrl, clientId, blobList, out blobListInJson);
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
                ShowUsage();
                return;
            }

            // Authenticate with SPE
            GraphClientManager graphClientManager = new GraphClientManager(null, tenantId, clientId, containerId, null);
            bool graphAuthenticated = await graphClientManager.Authenticate();
            if (!graphAuthenticated)
            {
                return;
            }

            // Instantiates an ABS, authenticate happens when accessing the blob
            AzureBlobManager azureBlobManager = new AzureBlobManager(containerLevelSASUrl);
            if (blobListInJson == null)
            {
                // No blob list provided, get all blobs in the container to migrate
                blobListInJson = await azureBlobManager.ListBlobsAsync();
                if (blobListInJson == null)
                {
                    Utility.ConsoleWriteWithColor("No blobs found in the container.", ConsoleColor.Red);
                    return;
                }
            }

            FileMigrator migrator = new FileMigrator(
                blobListInJson.Count(),
                graphClientManager,
                azureBlobManager);
            try
            {
                await migrator.MigrateFiles(blobListInJson);
            }
            catch (Exception ex)
            {
                Utility.ConsoleWriteWithColor($"This exception should not occur because most exceptions should of already been handled. Exception {ex.Message}", ConsoleColor.Red);
            }

            List<string> blobUploadFailed = migrator.GetBlobUploadFailed();
            List<string> blobUploadSucceeded = migrator.GetBlobUploadSuccessfully();
            List<string> blobExist = migrator.GetBlobExist();
            if (blobUploadFailed.Count > 0)
            {
                HandleFailedBlobs(blobUploadFailed, blobList, outputFile, containerLevelSASUrl, clientId, containerId);
            }
            Utility.ConsoleWriteWithColor($"Stats out of {blobListInJson.Count()} blobs", ConsoleColor.Green);
            Utility.ConsoleWriteWithColor($"Failed: {blobUploadFailed.Count()} out of {blobListInJson.Count()} blob(s)", ConsoleColor.Green);
            Utility.ConsoleWriteWithColor($"Migrated: {blobUploadSucceeded.Count()} out of {blobListInJson.Count()} blob(s)", ConsoleColor.Green);
            Utility.ConsoleWriteWithColor($"Already exists: {blobExist.Count()} out of {blobListInJson.Count()} blob(s)", ConsoleColor.Green);
        }

        static void HandleFailedBlobs(IEnumerable<string> blobUploadFailed, string blobFile, string outputFile, string containerLevelSASUrl, string clientId, string containerId)
        {
            string useFileName = !string.IsNullOrEmpty(outputFile) ? outputFile : blobFile;
            string fullPath = Path.GetFullPath(useFileName);

            // Get the filename without the extension
            string fileNameWithoutExtension = Path.GetFileNameWithoutExtension(fullPath);

            string fileExtension = Path.GetExtension(fullPath);

            // Combine the directory path with the filename without extension
            string directoryPath = Path.GetDirectoryName(fullPath);
            string fullPathWithoutExtension = Path.Combine(directoryPath, fileNameWithoutExtension);

            string newOutputFile = fullPathWithoutExtension + "1" + fileExtension;
            if (String.IsNullOrEmpty(outputFile))
            {
                outputFile = fullPathWithoutExtension + "1" + fileExtension;
                newOutputFile = fullPathWithoutExtension + "11" + fileExtension;
            }

            Utility.ConsoleWriteWithColor($"There are the blobs that failed to upload. The failed blobs are saved in {outputFile}.", ConsoleColor.Red);
            Utility.ConsoleWriteWithColor($"To re-run, copy the command as below", ConsoleColor.Red);
            Utility.ConsoleWriteWithColor($"dotnet run Program.cs -- --sasurl \"{containerLevelSASUrl}\" --clientid \"{clientId}\" --containerid \"{containerId}\" --blobfile \"{outputFile}\" --outputfile \"{newOutputFile}\"", ConsoleColor.Red);

            using (StreamWriter writer = new StreamWriter(outputFile))
            {
                foreach (string item in blobUploadFailed)
                {
                    writer.WriteLine(item);
                }
            }
        }

        static void HandleOptions(Options opts, out string sasUrl, out string tenantId, out string clientId, out string containerId, out string blobList, out string outputFile)
        {
            sasUrl = opts.ContainerLevelSASUrl;
            tenantId = opts.TenantId;
            clientId = opts.ClientId;
            containerId = opts.ContainerId;
            blobList = opts.BlobFiles ?? String.Empty;
            outputFile = opts.OutputFile ?? String.Empty;
        }

        static void ShowUsage()
        {
            Console.WriteLine("Usage: dotnet run Program.cs -- --sasurl \"<sas url>\" --tenantid \"<owning tenant id>\" --clientid \"<client id>\" --containerid \"<container id>\" [--blobfile \"<file name>\" --outputfile \"<file name>\"]");
        }

        /// <summary>
        /// Validates the arguments passed to the program.
        /// </summary>
        /// <param name="containerLevelSASUrl">The container-level SAS URL.</param>
        /// <param name="clientId">The Graph client ID.</param>
        /// <param name="blobFiles">The list of blobs to copy.</param>
        /// <param name="blobListJson">The list of blobs to copy in JSON format.</param>
        /// <exception cref="ArgumentException">Thrown when the container level SAS URL is invalid, the Graph client ID is not a valid GUID, or the blob list format is invalid.</exception>
        private static void ValidateArguments(string containerLevelSASUrl, string clientId, string blobFiles, out IEnumerable<string> blobListJson)
        {
            blobListJson = null;

            Uri uriResult;
            bool isValidUri = Uri.TryCreate(containerLevelSASUrl, UriKind.Absolute, out uriResult) &&
                (uriResult.Scheme == Uri.UriSchemeHttp || uriResult.Scheme == Uri.UriSchemeHttps);
            if (!isValidUri)
            {
                throw new ArgumentException("Invalid container level SAS URL format.");
            }

            bool isValid = Guid.TryParse(clientId, out Guid guid);
            if (!isValid)
            {
                throw new ArgumentException("The SPE clientId is not a valid GUID.");
            }

            if (!String.IsNullOrEmpty(blobFiles))
            {
                try
                {
                    blobListJson = File.ReadAllLines(blobFiles);
                }
                catch (Exception ex)
                {
                    throw new ArgumentException($"Cannot read file. Exception: {ex.Message}.");
                }
            }            
        }
    }
}
