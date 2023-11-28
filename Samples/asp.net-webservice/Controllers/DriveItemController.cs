using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Graph;
using Microsoft.Identity.Web;
using SyntexRSDemo.Services;
using SyntexRSDemo.Utils;
using System.Threading.Tasks;

namespace SyntexRSDemo.Controllers
{
    [Authorize]
    public class DriveItemController : Controller
    {
        private readonly ITokenAcquisition _tokenAcquisition;
        private readonly IMSGraphService _msGraphService;
        private readonly ILogger<ContainerController> _logger;

        public DriveItemController(ITokenAcquisition tokenAcquisition,
            IMSGraphService msGraphService,
            ILogger<ContainerController> logger)
        {
            _tokenAcquisition = tokenAcquisition;
            _msGraphService = msGraphService;
            _logger = logger;
        }


        [HttpGet]
        [AuthorizeForScopes(Scopes = new string[] { GraphScope.FilesReadWriteAll })]
        public async Task<IActionResult> Index(string tenantId, string driveId, string folderId, string itemId)
        {
            //The Controllers and services are stateless, so we need to acquire the token for this specific call.
            var accessToken = await _tokenAcquisition.GetAccessTokenForUserAsync(new string[] { GraphScope.FilesReadWriteAll }, tenantId: tenantId);

            var driveItem = await _msGraphService.GetDriveItem(accessToken, driveId, itemId);

            ViewData["TenantId"] = tenantId;
            ViewData["DriveItem"] = driveItem;
            ViewData["DriveId"] = driveId;
            ViewData["FolderId"] = folderId;

            return View();
        }

        [HttpPost]
        [AuthorizeForScopes(Scopes = new string[] { GraphScope.FilesReadWriteAll })]
        public async Task<IActionResult> Update(string tenantId, string driveId, string folderId, string itemId, string name)
        {
            //The Controllers and services are stateless, so we need to acquire the token for this specific call.
            var accessToken = await _tokenAcquisition.GetAccessTokenForUserAsync(new string[] { GraphScope.FilesReadWriteAll }, tenantId: tenantId);
            var driveItem = new DriveItem
            {
                Name = name
            };
            await _msGraphService.UpdateDriveItem(accessToken, driveId, itemId, driveItem);

            return RedirectToAction("Index", "Container", new { tenantId, driveId, folderId });
        }
    }
}
