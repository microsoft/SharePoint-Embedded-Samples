using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Identity.Web;
using SyntexRSDemo.Services;
using System.Collections.Generic;
using System.Threading.Tasks;
using SyntexRSDemo.Models;
using Microsoft.Extensions.Configuration;

namespace SyntexRSDemo.Controllers
{
    [Authorize]
    public class ContainersController : Controller
    {
        private readonly ITokenAcquisition _tokenAcquisition;
        private readonly IMSGraphService _graph;
        private readonly IConfiguration _configuration;

        public ContainersController(ITokenAcquisition tokenAcquisition,
            IMSGraphService mSGraphService,
            IConfiguration configuration,
            ILogger<ContainersController> logger)
        {
            _tokenAcquisition = tokenAcquisition;
            _graph = mSGraphService;
            _configuration = configuration;
        }

        [HttpGet]
        [AuthorizeForScopes(Scopes = new string[] { "FileStorageContainer.Selected" })]
        public async Task<IActionResult> Index(string tenantId, bool isAppOnly=false)
        {
            if (string.IsNullOrEmpty(tenantId))
            {
                return RedirectToAction("Index", "Home");
            }

            //var token = await _tokenAcquisition.GetAccessTokenForAppAsync("https://graph.microsoft.com/.default", tenant: tenantId);
            var token = await _tokenAcquisition.GetAccessTokenForUserAsync(new string[] { "FileStorageContainer.Selected" });
            IEnumerable<ContainerModel> containers = await _graph.GetAllContainers(token);

            ViewData["Containers"] = containers;
            ViewData["TenantId"] = tenantId;

            return View();
        }

        [HttpGet]
        [AuthorizeForScopes(Scopes = new string[] { "FileStorageContainer.Selected" })]
        public async Task<IActionResult> Create(string containerAlias, string tenantId)
        {
            var token = await _tokenAcquisition.GetAccessTokenForUserAsync(new string[] { "FileStorageContainer.Selected" });
            var container = new ContainerModel()
            {
                displayName = containerAlias,
                description = "This is a created demo container",
                containerTypeId = _configuration["TestContainer:containerTypeId"],
            };
            var _ = await _graph.AddContainer(token, container);

            return RedirectToAction("Index", new { tenantId });
        }

        [HttpGet]
        public async Task<IActionResult> CreateAppOnly(string containerAlias, string tenantId)
        {
            var container = new ContainerModel()
            {
                displayName = containerAlias,
                description = "This is a created enterprise container",
                containerTypeId = _configuration["TestContainer:containerTypeId"],
            };
            var token = await _tokenAcquisition.GetAccessTokenForAppAsync("FileStorageContainer.Selected");
            var _ = await _graph.AddContainer(token, container);

            return RedirectToAction("Index", new { tenantId });
        }

        [HttpGet]
        [AuthorizeForScopes(Scopes = new string[] { "FileStorageContainer.Selected" })]
        public async Task<IActionResult> Delete(string tenantId, string containerId, bool isAppOnly = false)
        {
            var token = await _tokenAcquisition.GetAccessTokenForUserAsync(new string[] { "FileStorageContainer.Selected" });
            await _graph.DeleteContainer(token, containerId);


            return RedirectToAction("Index", new { tenantId });
        }

    }
}
