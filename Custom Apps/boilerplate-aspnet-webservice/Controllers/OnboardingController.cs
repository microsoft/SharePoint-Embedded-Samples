/*
 The MIT License (MIT)

Copyright (c) 2020 Microsoft Corporation

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */

using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Extensions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.Identity.Web;
using Demo.Data;
using Demo.Data.Entities;
using System;
using System.Linq;
using System.Net.Mail;
using System.Security.Claims;



namespace WebApp_OpenIDConnect_DotNet.Controllers
{
    [Authorize]
    public class OnboardingController : Controller
    {
        private readonly MicrosoftIdentityOptions _microsoftIdentityOptions;
        private readonly DemoDbContext _dbContext;

        public OnboardingController(DemoDbContext dbCtx, IOptionsMonitor<MicrosoftIdentityOptions> microsoftIdentityOptions)
        {
            _dbContext = dbCtx;
            _microsoftIdentityOptions = microsoftIdentityOptions.Get(OpenIdConnectDefaults.AuthenticationScheme);
        }

        [HttpGet]
        public IActionResult SignUp()
        {
            ClaimsPrincipal user = GetCurrentUser();
            if (user == null || user.Claims == null)
            {
                return RedirectToAction("Error", "Home", new { error = "error reading user. Cannot obtain tenant information from it" });
            }
            ViewData["TenantDomain"] = GetTenantDomain(user);
            return View();
        }

        /// <summary>This action builds the admin consent Url to let the tenant admin consent and provision a service principal of their app in their tenant.</summary>
        /// <returns></returns>
        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult Onboard(string tenantDomain)
        {
            if (string.IsNullOrEmpty(tenantDomain))
            {
                return RedirectToAction("Error", "Home", new { error = "Process error. The tenant cannot be empty" });
            }


            // Generate a random value to identify the request
            Guid stateMarker = Guid.NewGuid();
            string tenantUrl = "https://" + tenantDomain;
            string tenantName = tenantDomain.Replace(".sharepoint", "").Replace(".com", "");

            TenantSite authorizedTenant = new TenantSite
            {
                Id = stateMarker, //Use the stateMarker as a tempCode, so we can locate this entity in the ProcessCode method
                Url = new Uri(tenantUrl),
                Name = tenantName
            };

            string currentUri = UriHelper.BuildAbsolute(
                this.Request.Scheme,
                this.Request.Host,
                this.Request.PathBase);


            // Create an OAuth2 request, using the web app as the client. This will trigger a consent flow that will provision the app in the target tenant.
            // Refer to https://docs.microsoft.com/azure/active-directory/develop/v2-admin-consent for details about the Url format being constructed below
            string authorizationRequest = string.Format(
                "{0}organizations/v2.0/adminconsent?client_id={1}&redirect_uri={2}&state={3}&scope={4}",
                _microsoftIdentityOptions.Instance,
                Uri.EscapeDataString(_microsoftIdentityOptions.ClientId),       // The application id as obtained from the Azure Portal
                Uri.EscapeDataString(currentUri + "Onboarding/ProcessCode"),    // Uri that the admin will be redirected to after the consent
                Uri.EscapeDataString(stateMarker.ToString()),                   // The state parameter is used to validate the response, preventing a man-in-the-middle attack, and it will also be used to identify this request in the ProcessCode action.
                Uri.EscapeDataString(tenantUrl + "/.default"));                 // The scopes to be presented to the admin to consent. Note that I used .default to get approval for App-only scopes


            // Saving a temporary tenant to validate the stateMarker on the admin consent response
            _dbContext.Add(authorizedTenant);
            _dbContext.SaveChanges();

            return Redirect(authorizationRequest);

        }

        /// <summary>
        /// This handler is used to process the response after the admin consent process is complete.
        /// </summary>
        /// <param name="tenant">The directory tenant that granted your application the permissions it requested, in GUID format..</param>
        /// <param name="error">An error code string that can be used to classify types of errors that occur, and can be used to react to errors..</param>
        /// <param name="error_description">A specific error message that can help a developer identify the root cause of an error..</param>
        /// <param name="admin_consent">Will be set to True to indicate that this response occurred on an admin consent flow..</param>
        /// <param name="state">A value included in the request that also will be returned in the token response. It can be a string of any content you want. The state is used to encode information about the user's state in the app before the authentication request occurred, such as the page or view they were on..</param>
        /// <remarks>Refer to https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-admin-consent for details on the response</remarks>
        /// <returns></returns>
        public IActionResult ProcessCode(string tenant, string error, string error_description, bool admin_consent, string state)
        {
            if (error != null)
            {
                RemoveProvisonalRecord(state);
                return RedirectToAction("Error", "Home", new { error = error_description });
            }

            if (!admin_consent)
            {
                RemoveProvisonalRecord(state);
                return RedirectToAction("Error", "Home", new { error = "The admin consent operation failed." });
            }

            // Save the record only if not present already
            if (_dbContext.TenantSites.FirstOrDefault(t => t.TenantId.ToString() == tenant) == null)
            {
                var preAuthorizedTenant = _dbContext.TenantSites.FirstOrDefault(a => a.Id.ToString() == state);
                if (preAuthorizedTenant == null)
                {
                    return RedirectToAction("Error", "Home", new { error = "State verification failed." });
                }
                preAuthorizedTenant.TenantId = new Guid(tenant);
                _dbContext.SaveChanges();
            }

            return RedirectToAction("Index", "Containers", new { tenantId = tenant });
        }

        private void RemoveProvisonalRecord(string id)
        {
            // Save the record only if not present already
            var tenantToDelete = _dbContext.TenantSites.FirstOrDefault(t => t.Id.ToString() == id);

            if (tenantToDelete != null)
            {
                _dbContext.TenantSites.Remove(tenantToDelete);
                _dbContext.SaveChanges();
            }
        }

        private ClaimsPrincipal GetCurrentUser()
        {
            ClaimsPrincipal user;
            //HttpContext is not thread safe. Use a lock to obtain the current user
            lock (HttpContext)
            {
                user = HttpContext.User;
            }
            return user;
        }

        private string GetTenantDomain(ClaimsPrincipal user)
        {

            if (user != null && user.Identities != null)
            {
                string userName = user.Identity.Name;
                return GetTenantDomainFromUserName(userName);
            }
            return null;
        }

        private string GetTenantDomainFromUserName(string userName)
        {
            MailAddress addr = new MailAddress(userName);
            string domain = addr.Host;
            return domain.Replace("onmicrosoft", "sharepoint");
        }

    }
}