using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Identity.Web;
using Demo.Data;
using Demo.Models;
using Demo.Services;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Demo.Controllers
{
    [Authorize]
    public class ContainerMetadataController : Controller
    {
        private readonly ITokenAcquisition _tokenAcquisition;
        private readonly IMSGraphService _graph;

        public ContainerMetadataController(ITokenAcquisition tokenAcquisition,
            IMSGraphService graph)
        {
            _tokenAcquisition = tokenAcquisition;
            _graph = graph;
        }


        [HttpGet]
        [AuthorizeForScopes(Scopes = new string[] { "FileStorageContainer.Selected" })]
        public async Task<IActionResult> Index(string tenantId, string containerId, bool isAppOnly=false)
        {
            var token = await _tokenAcquisition.GetAccessTokenForUserAsync(new string[] { "FileStorageContainer.Selected" });
            ContainerModel container = await _graph.GetContainer(token, containerId);

            ViewData["Container"] = container;
            ViewData["TenantId"] = tenantId;

            return View();
        }

        [HttpPost]
        [AuthorizeForScopes(Scopes = new string[] { "FileStorageContainer.Selected" })]
        public async Task<IActionResult> Update(string tenantId, string containerId, string name, string description, bool isAppOnly=false)
        {
            var container = new ContainerModel
            {
                displayName = name,
                description = description
            };
            var token = await _tokenAcquisition.GetAccessTokenForUserAsync(new string[] { "FileStorageContainer.Selected" });
            await _graph.UpdateContainer(token, containerId, container);

            return RedirectToAction(actionName:"Index", controllerName: "Containers", new { tenantId, containerId });
        }

        [HttpGet]
        [AuthorizeForScopes(Scopes = new string[] { "FileStorageContainer.Selected" })]
        public async Task<IActionResult> Activate(string tenantId, string containerId)
        {
            var token = await _tokenAcquisition.GetAccessTokenForUserAsync(new string[] { "FileStorageContainer.Selected" });
            await _graph.ActivateContainer(token, containerId);

            return RedirectToAction("Index", new { tenantId, containerId });
        }
    }
}
