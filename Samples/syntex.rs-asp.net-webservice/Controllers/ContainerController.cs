using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Graph;
using Microsoft.Identity.Web;
using SyntexRSDemo.Models;
using SyntexRSDemo.Services;
using SyntexRSDemo.Utils;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;



namespace SyntexRSDemo.Controllers
{
    [Authorize]
    public class ContainerController : Controller
    {
        private readonly ITokenAcquisition _tokenAcquisition;
        private readonly IMSGraphService _msGraphService;
        private readonly ILogger<ContainerController> _logger;

        public ContainerController(ITokenAcquisition tokenAcquisition,
            IMSGraphService msGraphService,
            ILogger<ContainerController> logger)
        {
            _tokenAcquisition = tokenAcquisition;
            _msGraphService = msGraphService;
            _logger = logger;
        }

        //
        //  AuthorizeForScopes: 
        //  https://docs.microsoft.com/en-us/azure/active-directory/develop/web-app-quickstart?pivots=devlang-aspnet-core#protect-a-controller-or-a-controllers-method
        //
        [HttpGet]
        [AuthorizeForScopes(Scopes = new string[] { GraphScope.FilesReadAll })]
        public async Task<IActionResult> Index(string driveId, string folderId, string tenantId)
        {
            //The Controllers and services are stateless, so we need to acquire the token for this specific call.
            var accessToken = await _tokenAcquisition.GetAccessTokenForUserAsync(new string[] { GraphScope.FilesReadAll });

            FilesViewModel filesViewModel = await GetFilesViewModel(driveId, folderId, accessToken);
            if (filesViewModel == null)
            {
                _logger.LogError("Failed to retrieve drive information: driveId: {driveId}, folderId: {folderId}.", driveId, folderId);
                return RedirectToAction("Error", "Home", new { error = "Cannot locate the requested container" });
            }

            SetSessionFilesView(filesViewModel);
            await PopulateFolderView(filesViewModel, accessToken);
            ViewData["TenantId"] = tenantId;
            return View();
        }

        [HttpPost]
        [AuthorizeForScopes(Scopes = new string[] { GraphScope.FilesReadWriteAll })]
        public async Task<IActionResult> UploadFile(string tenantId, IFormFile file)
        {
            var graphAccessToken = await _tokenAcquisition.GetAccessTokenForUserAsync(new string[] { GraphScope.FilesReadWriteAll }, tenantId: tenantId);

            var filesViewModel = GetSessionFilesView();
            var currentPath = filesViewModel.Path.Last();

            using (Stream s = file.OpenReadStream())
            {
                await _msGraphService.AddFile(graphAccessToken, filesViewModel.DriveId, currentPath.Id, file.FileName, s);
            }

            return RedirectToAction("Index", new { tenantId });
        }

        [HttpPost]
        [AuthorizeForScopes(Scopes = new string[] { GraphScope.FilesReadWriteAll })]
        public async Task<IActionResult> CreateFolder(string tenantId, string folderName)
        {
            var filesViewModel = GetSessionFilesView();
            string currentFolderId = filesViewModel.Path.Last().Id;

            var graphAccessToken = await _tokenAcquisition.GetAccessTokenForUserAsync(new string[] { GraphScope.FilesReadWriteAll }, tenantId: tenantId);
            await _msGraphService.AddFolder(graphAccessToken, filesViewModel.DriveId, currentFolderId, folderName);

            return RedirectToAction("Index", new { tenantId });
        }

        [HttpGet]
        [AuthorizeForScopes(Scopes = new string[] { GraphScope.FilesReadWriteAll })]
        public async Task<IActionResult> Delete(string tenantId, string itemId)
        {
            var filesViewModel = GetSessionFilesView();
            var graphAccessToken = await _tokenAcquisition.GetAccessTokenForUserAsync(new string[] { GraphScope.FilesReadWriteAll }, tenantId: tenantId);
            await _msGraphService.DeleteDriveItem(graphAccessToken, filesViewModel.DriveId, itemId);

            return RedirectToAction("Index", new { tenantId });
        }

        [HttpGet]
        [AuthorizeForScopes(Scopes = new string[] { GraphScope.FilesReadWriteAll })]
        public async Task<IActionResult> Duplicate(string tenantId, string itemId, string name)
        {
            var filesViewModel = GetSessionFilesView();
            var graphAccessToken = await _tokenAcquisition.GetAccessTokenForUserAsync(new string[] { GraphScope.FilesReadWriteAll }, tenantId: tenantId);

            var copyName = Path.GetFileNameWithoutExtension(name) + "_copy" + Path.GetExtension(name);
            await _msGraphService.CopyDriveItem(graphAccessToken, filesViewModel.DriveId, itemId, copyName, null);

            return RedirectToAction("Index", new { tenantId });
        }

        [HttpGet]
        public IActionResult OpenFolder(string tenantId, string folder, string folderId)
        {
            var filesViewModel = GetSessionFilesView();

            //if we were directed to use a folder (different from current), add that to 
            //the session and reload index.
            if (filesViewModel != null && "/".CompareTo(folder) != 0)
            {
                filesViewModel.Path.Add(new DriveItem { Id = folderId, Name = folder, Folder = new Folder() });
                SetSessionFilesView(filesViewModel);
            }

            return RedirectToAction("Index", new { tenantId });
        }

        [HttpGet]
        [AuthorizeForScopes(Scopes = new string[] { GraphScope.FilesReadAll })]
        public async Task<IActionResult> DownloadFile(string tenantId, string driveId, string itemId)
        {
            var accessToken = await _tokenAcquisition.GetAccessTokenForUserAsync(new string[] { GraphScope.FilesReadAll }, tenantId: tenantId);
            var downloadUri = await _msGraphService.GetFileDownloadUrl(accessToken, driveId, itemId);

            return Redirect(downloadUri.ToString());
        }

        [HttpGet]
        [AuthorizeForScopes(Scopes = new string[] { GraphScope.FilesReadAll })]
        public async Task<IActionResult> Search(string tenantId, string driveId, string searchText)
        {
            var accessToken = await _tokenAcquisition.GetAccessTokenForUserAsync(new string[] { GraphScope.FilesReadAll }, tenantId: tenantId);
            var items = await _msGraphService.SearchInDrive(accessToken, driveId, searchText);
            UpdateWebUrlToForceEdit(items);

            ViewData["TenantId"] = tenantId;
            ViewData["FilesViewModel"] = GetSessionFilesView();

            ViewData["DriveItems"] = items;
            ViewData["SearchText"] = searchText;
            return View("Index");
        }

        [HttpGet]
        [AuthorizeForScopes(Scopes = new string[] { GraphScope.FilesReadAll })]
        public async Task<IActionResult> PreviewItem(string driveId, string itemId)
        {
            var accessToken = await _tokenAcquisition.GetAccessTokenForUserAsync(new string[] { GraphScope.FilesReadAll });
            var url = await _msGraphService.GetItemPreview(accessToken, driveId, itemId);
            return Redirect(AddNoBrandParameter(url));
        }

        [HttpGet]
        [AuthorizeForScopes(Scopes = new string[] { GraphScope.FilesReadAll })]
        public async Task<ActionResult<string>> GetPreviewItemLink(string driveId, string itemId)
        {
            var accessToken = await _tokenAcquisition.GetAccessTokenForUserAsync(new string[] { GraphScope.FilesReadAll });
            var url = await _msGraphService.GetItemPreview(accessToken, driveId, itemId);
            return AddNoBrandParameter(url);
        }

        private static string AddNoBrandParameter(string url)
        {
            if (url != null)
            {
                return url + "&nb=true";
            }
            return null;
        }

        private static void UpdateWebUrlToForceEdit(ICollection<DriveItem> items)
        {
            foreach(var item in items)
            {
                if (item.WebUrl != null)
                {
                    var uriBuilder = new System.UriBuilder(item.WebUrl);
                    System.Collections.Specialized.NameValueCollection queryDictionary = System.Web.HttpUtility.ParseQueryString(uriBuilder.Query);
                    queryDictionary["action"] = "edit";
                    uriBuilder.Query = queryDictionary.ToString();
                    item.WebUrl = uriBuilder.ToString();
                }
            }
        }

        private async Task<FilesViewModel> GetFilesViewModel(string driveId, string folderId, string accessToken)
        {
            //if drive id was given, but no folder id, start from root
            //if folder id was given, look for path in session
            //if nothing was given, look in session
            //error if not
            FilesViewModel filesViewModel;
            if (!string.IsNullOrEmpty(driveId) && string.IsNullOrEmpty(folderId))
            {
                filesViewModel = await GetTopLevelFolder(accessToken, driveId);
            }
            else
            {
                filesViewModel = GetSessionFilesView();

                if (filesViewModel != null)
                {
                    if (!string.IsNullOrEmpty(folderId))
                    {
                        filesViewModel.Path = GetFolderPathForId(filesViewModel.Path, folderId);
                    }
                }
            }
            return filesViewModel;
        }

        private async Task<FilesViewModel> GetTopLevelFolder(string accessToken, string driveId)
        {
            var driveRootItem = await _msGraphService.GetDriveRoot(accessToken, driveId);
            return new FilesViewModel
            {
                DriveId = driveId,
                Path = new List<DriveItem> { driveRootItem },
            };
        }

        private async Task PopulateFolderView(FilesViewModel filesViewModel, string accessToken)
        {
            ViewData["FilesViewModel"] = filesViewModel;
            var currentFolder = filesViewModel.Path.Last();

            var folderContents = new List<DriveItem>() {
                //Add '/' as symbol of "this folder" to the folder contents to be able to view and change its permissions
                new DriveItem(){ Id = currentFolder.Id, Name = "/", Folder = new Folder() }
            };
            var folderItems = await _msGraphService.GetDriveItems(accessToken, filesViewModel.DriveId, currentFolder.Id);
            UpdateWebUrlToForceEdit(folderItems);
            folderContents.AddRange(folderItems);
            ViewData["DriveItems"] = folderContents;
        }

        private static List<DriveItem> GetFolderPathForId(List<DriveItem> subfolders, string folderId)
        {
            var folderPath = new List<DriveItem>();
            foreach (var folder in subfolders)
            {
                folderPath.Add(folder);
                if (folder.Id == folderId)
                {
                    break;
                }
            }
            return folderPath;
        }

        //We use a session to easily navigate through the folder structure
        private void SetSessionFilesView(FilesViewModel filesViewModel)
        {
            HttpContext.Session.SetString("filesViewModel", JsonSerializer.Serialize(filesViewModel));
        }
        private FilesViewModel GetSessionFilesView()
        {
            string fv = HttpContext.Session.GetString("filesViewModel");
            if (fv == null)
            {
                return null;
            }
            return JsonSerializer.Deserialize<FilesViewModel>(fv);
        }

    }
}
