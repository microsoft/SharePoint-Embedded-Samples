using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Graph;
using Microsoft.Identity.Web;
using Demo.Services;
using Demo.Utils;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;

namespace Demo.Controllers
{
    [Authorize]
    public class PermissionsController : Controller
    {
        private readonly ITokenAcquisition _tokenAcquisition;
        private readonly IMSGraphService _msGraphService;
        private readonly ILogger<PermissionsController> _logger;

        public PermissionsController(ITokenAcquisition tokenAcquisition,
                            IMSGraphService msGraphService,
                            ILogger<PermissionsController> logger)
        {
            _tokenAcquisition = tokenAcquisition;
            _msGraphService = msGraphService;
            _logger = logger;
        }

        [HttpGet]
        [AuthorizeForScopes(Scopes = new string[] { GraphScope.FilesReadAll })]
        public async Task<IActionResult> Index(string tenantId, string driveId, string itemId)
        {
            var graphAccessToken = await _tokenAcquisition.GetAccessTokenForUserAsync(new string[] { GraphScope.FilesReadAll }, tenantId: tenantId);
            ViewData["Permissions"] = await _msGraphService.GetPermissions(graphAccessToken, driveId, itemId);
            ViewData["DriveId"] = driveId;
            ViewData["ItemId"] = itemId;
            ViewData["Tenantid"] = tenantId;
            return View();
        }


        [HttpPost]
        [AuthorizeForScopes(Scopes = new string[] { GraphScope.FilesReadWriteAll })]
        public async Task<IActionResult> Update([FromForm] string tenantId, string driveId, string itemId, string id, string role)
        {
            var graphAccessToken = await _tokenAcquisition.GetAccessTokenForUserAsync(new string[] { GraphScope.FilesReadWriteAll }, tenantId: tenantId);

            var roles = new List<string>();
            if ("reader" == role)
            {
                roles.Add("read");
            }
            if ("writer" == role)
            {
                roles.Add("write");
            }
            if ("owner" == role)
            {
                //Using "sp.full control" instead of "owner" as a temporal fix per this issue https://github.com/microsoftgraph/microsoft-graph-docs/issues/4541
                roles.Add("sp.full control");
            }

            try
            {
                await _msGraphService.UpdatePermission(graphAccessToken, driveId, itemId, id, roles);
            }
            catch (ServiceException e)
            {
                string error = "Could not update roles. Do you have sufficient permissions?";
                if (!string.IsNullOrEmpty(e.Message))
                {
                    error = e.Message;
                }
                return RedirectToAction("Error", "Home", new { error });
            }

            return RedirectToAction("Index", "Permissions", new { tenantId, driveId, itemId });
        }


        [HttpGet]
        [AuthorizeForScopes(Scopes = new string[] { GraphScope.FilesReadWriteAll })]
        public async Task<IActionResult> Edit(string tenantId, string driveId, string itemId, string id)
        {
            ViewData["TenantId"] = tenantId;
            ViewData["DriveId"] = driveId;
            ViewData["ItemId"] = itemId;

            var graphAccessToken = await _tokenAcquisition.GetAccessTokenForUserAsync(new string[] { GraphScope.FilesReadWriteAll }, tenantId: tenantId);
            Permission permission = await _msGraphService.GetPermission(graphAccessToken, driveId, itemId, id);

            ViewData["Permission"] = permission;

            return View();
        }

        [HttpGet]
        [AuthorizeForScopes(Scopes = new string[] { GraphScope.FilesReadWriteAll })]
        public IActionResult Add(string tenantId, string driveId, string itemId)
        {
            ViewData["TenantId"] = tenantId;
            ViewData["DriveId"] = driveId;
            ViewData["ItemId"] = itemId;
            return View();
        }


        [HttpPost]
        [AuthorizeForScopes(Scopes = new string[] { GraphScope.FilesReadWriteAll })]
        public async Task<IActionResult> AddPermission([FromForm] string tenantId, string driveId, string itemId, string recipients, string role)
        {
            var graphAccessToken = await _tokenAcquisition.GetAccessTokenForUserAsync(new string[] { GraphScope.FilesReadWriteAll }, tenantId: tenantId);

            var roles = new List<string>();

            //Even if role is an array, in practice you can only set it to one
            if ("reader" == role)
            {
                roles.Add("read");
            }
            if ("writer" == role)
            {
                roles.Add("write");
            }
            if ("owner" == role)
            {
                //Using "sp.full control" instead of "owner" as a temporal fix per this issue https://github.com/microsoftgraph/microsoft-graph-docs/issues/4541
                roles.Add("sp.full control");
            }

            //take recipients, split and
            if (string.IsNullOrEmpty(recipients))
            {
                return RedirectToAction("Error", "Home", new { error = "Cannot add permissions to a null list" });
            }

            var driveRecipients = GetDriveRecipients(recipients.Split(','));

            try
            {
                //await _containerManagement.AddPermissions(graphAccessToken, driveId, itemId, roles, emails);
                await _msGraphService.AddPermissions(graphAccessToken, driveId, itemId, roles, driveRecipients);
            }
            catch (ServiceException e)
            {
                string error = e.Message;
                if (string.IsNullOrEmpty(error))
                {
                    error = "Could not update roles. Do you have sufficient permissions?";
                }
                return RedirectToAction("Error", "Home", new { error });
            }

            return RedirectToAction("Index", "Permissions", new { tenantId, driveId, itemId });
        }

        private List<DriveRecipient> GetDriveRecipients(IEnumerable<string> recipients)
        {
            var emailAttribute = new EmailAddressAttribute();
            var driveRecipients = new List<DriveRecipient>();
            foreach (var r in recipients)
            {
                if (emailAttribute.IsValid(r))
                {
                    driveRecipients.Add(new DriveRecipient() { Email = r });
                }
                else if (Guid.TryParse(r, out var _))
                {
                    driveRecipients.Add(new DriveRecipient() { ObjectId = r });
                }
                else
                {
                    driveRecipients.Add(new DriveRecipient() { Alias = r });
                }
            }
            return driveRecipients;
        }

        [HttpGet]
        [AuthorizeForScopes(Scopes = new string[] { GraphScope.FilesReadWriteAll })]
        public async Task<IActionResult> Delete(string tenantId, string driveId, string itemId, string id)
        {
            var graphAccessToken = await _tokenAcquisition.GetAccessTokenForUserAsync(new string[] { GraphScope.FilesReadWriteAll }, tenantId: tenantId);
            try
            {
                await _msGraphService.DeletePermission(graphAccessToken, driveId, itemId, id);
            }
            catch (ServiceException e)
            {
                string error = "Could not delete. Do you have sufficient permissions?";
                if (!string.IsNullOrEmpty(e.Message))
                {
                    error = e.Message;
                }
                return RedirectToAction("Error", "Home", new { error });
            }

            return RedirectToAction("Index", "Permissions", new { tenantId, driveId, itemId });
        }

    }
}
