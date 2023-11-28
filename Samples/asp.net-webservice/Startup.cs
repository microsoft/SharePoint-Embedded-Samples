
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

//Enable distributed cache only if you have created and configured the appropriate persistent cache
//#define USE_DISTRIBUTED_TOKENS_CACHE

using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Identity.Web;
using Microsoft.Identity.Web.UI;
using Demo.Data;
using Demo.Services;
using Demo.Utils;
using System;



namespace Demo
{
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            //By default configuration reads from appsettings.json
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            services.Configure<CookiePolicyOptions>(options =>
            {
                // This lambda determines whether user consent for non-essential cookies is needed for a given request.
                options.CheckConsentNeeded = context => true;
                options.MinimumSameSitePolicy = SameSiteMode.Unspecified;
                // Handling SameSite cookie according to https://docs.microsoft.com/en-us/aspnet/core/security/samesite?view=aspnetcore-3.1
                options.HandleSameSiteCookieCompatibility();
            });


            services.AddOptions();

            //Add DB support
            services.AddDbContext<DemoDbContext>(options => options.UseSqlServer(Configuration.GetConnectionString("AppDBConnStr")));

            // Add Microsoft Graph support
            services.AddScoped<IMSGraphService, MSGraphService>();

            services.AddHttpClient();  //Enable direct http client calls

            AddMicrosoftIdentityAuthenticationService(services);

#if USE_DISTRIBUTED_TOKENS_CACHE
            //This is an example of how to implement a persistent cache
            //https://github.com/Azure-Samples/active-directory-aspnetcore-webapp-openidconnect-v2/tree/master/2-WebApp-graph-user/2-2-TokenCache
            services.AddDistributedSqlServerCache(options =>
            {
                options.ConnectionString = Configuration.GetConnectionString("TokenCacheConnStr");
                options.SchemaName = "dbo";
                options.TableName = "TokenCache";

                // You don't want the SQL token cache to be purged before the access token has expired. Usually
                // access tokens expire after 1 hour (but this can be changed by token lifetime policies), whereas
                // the default sliding expiration for the distributed SQL database is 20 mins. 
                // Use a value which is above 60 mins (or the lifetime of a token in case of longer lived tokens)
                options.DefaultSlidingExpiration = TimeSpan.FromMinutes(90);
            });
#endif


            services.AddControllersWithViews().AddMicrosoftIdentityUI();

            services.AddRazorPages();

            services.AddSession(options =>
            {
                options.IdleTimeout = TimeSpan.FromMinutes(30);
                options.Cookie.HttpOnly = true;
                options.Cookie.IsEssential = true;
            });


            //validate anti forgery token by default for all requests
            services.AddMvc(options => { options.Filters.Add(new AutoValidateAntiforgeryTokenAttribute()); });
        }

        // This function takes some of the configuration items in appsettings.json and use those to configure MicrosoftIdentityWebApp
        // and EnableTokenAcquisitionToCallDownstreamApi, as well as enabling in memory token cache
        //
        //Authentication basics: https://docs.microsoft.com/en-us/aspnet/core/security/authentication/?view=aspnetcore-6.0
        //
        private void AddMicrosoftIdentityAuthenticationService(IServiceCollection services)
        {
            //To use certificates: https://aka.ms/ms-id-web-certificates and update appsettings.json

            // Sign-in users with the Microsoft identity platform
            services.AddAuthentication(OpenIdConnectDefaults.AuthenticationScheme)
                    .AddMicrosoftIdentityWebApp(options =>
                    {
                        //Documentation for MicrosoftIdentityOptions
                        //https://learn.microsoft.com/en-us/dotnet/api/microsoft.identity.web.microsoftidentityoptions?view=azure-dotnet
                        Configuration.Bind("AzureAd", options);
                    }
                    ).EnableTokenAcquisitionToCallDownstreamApi(options =>
                    {
                        //Takes _configuration options such as ClientSecret, ClientId.
                        //Documentation for ConfidentialClientApplicationOptions
                        //See https://docs.microsoft.com/en-us/dotnet/api/microsoft.identity.client.confidentialclientapplicationoptions?view=azure-dotnet
                        Configuration.Bind("AzureAd", options);
                    },
                    GraphScope.InitialPermissions
                    )
#if USE_DISTRIBUTED_TOKENS_CACHE
                    .AddDistributedTokenCaches();
#else
                    //In memory token is suitable for app permissions for development. Consider using a different cache
                    //for production: https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-net-token-cache-serialization?tabs=aspnetcore
                    .AddInMemoryTokenCaches();
#endif
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {

            using (var serviceScope = app.ApplicationServices.GetService<IServiceScopeFactory>().CreateScope())
            {
                var context = serviceScope.ServiceProvider.GetRequiredService<DemoDbContext>();
                // To reset the DB (delete), uncomment, run the solution, and comment again 
                //context.Database.EnsureDeleted();
                context.Database.EnsureCreated();
            }

            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                app.UseExceptionHandler("/Home/Error");
                // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
                app.UseHsts();
            }

            app.UseHttpsRedirection();
            app.UseStaticFiles();
            app.UseCookiePolicy();

            app.UseAuthentication();
            app.UseRouting();
            app.UseAuthorization();

            app.UseSession();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllerRoute(
                    name: "default",
                    pattern: "{controller=Home}/{action=Index}/{id?}");
                endpoints.MapRazorPages();
            });
        }
    }
}