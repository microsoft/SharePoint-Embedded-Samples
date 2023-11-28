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

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using SyntexRSDemo.Data;
using SyntexRSDemo.Models;
using System;
using System.Diagnostics;
using System.Linq;

namespace SyntexRSDemo.Controllers
{
    [Authorize]
    public class HomeController : Controller
    {
        private readonly DemoDbContext _dbContext;

        public HomeController(DemoDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public IActionResult Index()
        {
            //Do not display empty tenants, since those represent failed/aborted attempts to sign in a tenant.
            //IDEA: It may be possible also to call some endpoint to filter the tenants to the ones available to the signed in user (even as guest user)
            ViewData["Tenants"] = _dbContext.TenantSites.Where(t => !(t.TenantId == Guid.Empty)).OrderBy(t => t.Name).ToList();
            return View();
        }

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error(string error)
        {
            if (error == null)
            {
                var exceptionHandler = HttpContext.Features.Get<IExceptionHandlerFeature>();
                error = exceptionHandler?.Error?.Message;
            }
            TempData["ErrorMessage"] = error;
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
