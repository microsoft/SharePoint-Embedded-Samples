namespace Demo.Utils
{
    public static class GraphScope
    {
        public const string FilesReadAll = "Files.Read.All";
        public const string FilesRead = "Files.Read";
        public const string FilesReadWrite = "Files.ReadWrite";
        public const string FilesReadWriteAll = "Files.ReadWrite.All";
        public const string Profile = "profile";

        //initial permissions should be equal or less than the ones configured for the app in Azure. 
        public static readonly string[] InitialPermissions = new string[] { };
    }
}
