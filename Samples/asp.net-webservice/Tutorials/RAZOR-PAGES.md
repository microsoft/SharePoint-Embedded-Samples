# Razor pages

## Overview
Razor pages, which are mainly html pages with some asp.net idioms to access variables,
loop through collections or calculate endpoints. 

This idioms and variables are translated to html code. E.g.:
```
<a asp-area="" asp-controller="Permissions" asp-action="Add" asp-route-tenantId="@tenantId" asp-route-driveId="@driveId" asp-route-itemId="@itemId">Add</a>
```
Is translated to 
```
<a href="/Permissions/Add?tenantId=YOUR_TENANTID&amp;driveId=YOUR_DRIVEID&amp;itemId=YOUR_ITEMID">Add</a>
```
This calls the PermissionController, Add action:
```
public IActionResult Add(string tenantId, string driveId, string itemId)
```

## Organization
In this project, Razor pages are located in the `Views` folder. Each folder corresponds to one controller. For example, files in `./Views/Container` are related to the ContainerController.cs. 

The default file is index.cshtml, but some folders have other files, like Add.cshtml. This roughly translates 
to the final Url, adding the controller and action to the path. For example `./Views/Permissions/Add.cshtml` translates into a 
Url similar to `https://localhost:57750/Permissions/Add`

This pattern can be modified by changing the following code in startup.cs
```
    app.UseEndpoints(endpoints =>
    {
        endpoints.MapControllerRoute(
            name: "default",
            pattern: "{controller=Home}/{action=Index}/{id?}");
        endpoints.MapRazorPages();
    });
```

