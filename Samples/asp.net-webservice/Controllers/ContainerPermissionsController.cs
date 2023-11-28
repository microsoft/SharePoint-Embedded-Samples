using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Identity.Web;
using Demo.Models;
using Demo.Services;
using System.Threading.Tasks;


namespace Demo.Controllers
{
    [AllowAnonymous]
    public class ContainerPermissionsController : Controller
    {
        private readonly ITokenAcquisition _tokenAcquisition;
        private readonly IMSGraphService _graph;

        public ContainerPermissionsController(ITokenAcquisition tokenAcquisition,
            IMSGraphService graph)
        {
            _tokenAcquisition = tokenAcquisition;
            _graph = graph;
        }

        [HttpGet]
        [AuthorizeForScopes(Scopes = new string[] { "FileStorageContainer.Selected" })]
        public async Task<IActionResult> IndexAsync(string containerId, string tenantId, bool isAppOnly=false)
        {
            var token = await _tokenAcquisition.GetAccessTokenForUserAsync(new string[] { "FileStorageContainer.Selected" });
            var permissions = await _graph.GetContainerPermissions(token, containerId);


            ViewData["Permissions"] = permissions;
            ViewData["TenantId"] = tenantId;
            ViewData["ContainerId"] = containerId;

            return View();
        }


        [HttpGet]
        public IActionResult Edit(string tenantId, string containerId, string id, string email, string role)
        {
            var permission = new ContainerPermissionModel
            {
                id = id,
                roles = new[] { role },
                grantedToV2 = new PermissionUser { user = new Models.User { email = email } }
            };

            ViewData["TenantId"] = tenantId;
            ViewData["ContainerId"] = containerId;
            ViewData["Permission"] = permission;
            return View();
        }

        [HttpGet]
        [AuthorizeForScopes(Scopes = new string[] { "FileStorageContainer.Selected" })]
        public async Task<IActionResult> Delete(string tenantId, string containerId, string id, bool isAppOnly = false)
        {
            ////Future: Adding and deleting permissions could change a container to and from App-only container
            var token = await _tokenAcquisition.GetAccessTokenForUserAsync(new string[] { "FileStorageContainer.Selected" });
            await _graph.DeleteContainerPermission(token, containerId, id);

            return RedirectToAction("Index", new { tenantId, containerId });
        }

        [HttpPost]
        [AuthorizeForScopes(Scopes = new string[] { "FileStorageContainer.Selected" })]
        public async Task<IActionResult> Update(string tenantId, string containerId, string id, string role, bool isAppOnly = false)
        {
            var token = await _tokenAcquisition.GetAccessTokenForUserAsync(new string[] { "FileStorageContainer.Selected" });
            await _graph.UpdateContainerPermission(token, containerId, id, role);

            return RedirectToAction("Index", new { tenantId, containerId });
        }

        [HttpGet]
        public IActionResult Add( string tenantId, string containerId)
        {
            ViewData["ContainerId"] = containerId;
            ViewData["TenantId"] = tenantId;
            return View();
        }


        [HttpPost]
        [AuthorizeForScopes(Scopes = new string[] { "FileStorageContainer.Selected" })]
        public async Task<IActionResult> AddPermission(string tenantId, string containerId, string email, string role, bool isAppOnly=false)
        {
            var permission = new ContainerPermissionModel
            {
                roles = new[] { role },
                grantedToV2 = new PermissionUser { user = new Models.User { userPrincipalName = email } }
            };

            var token = await _tokenAcquisition.GetAccessTokenForUserAsync(new string[] { "FileStorageContainer.Selected" });
            await _graph.AddContainerPermission(token, containerId, permission);

            return RedirectToAction("Index", new { tenantId, containerId });
        }
    }
}
