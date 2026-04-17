Add the ability to manage the permissions on a container.

-----------------------------------------------
0. USER EXPERIENCE
-----------------------------------------------
- Settings dialog when looking at a specific container page
- Dialog has a section with 4 tabs called Readers, Writers, Managers, and Owners that correspond to the built-in permission roles of a container: reader, writer, manager, and owner
- User can view and edit the permission assignments on the container and save them

-----------------------------------------------
1. CONTAINER PERMISSIONS
-----------------------------------------------
LIST CONTAINER PERMISSIONS
----------------
Method: GET  
URL: https://graph.microsoft.com/beta/storage/fileStorage/containers/<containerId>/permissions  


CREATE CONTAINER PERMISSION
----------------
Method: POST  
URL: https://graph.microsoft.com/beta/storage/fileStorage/containers/<containerId>/permissions  

{
  "roles": ["reader"],// "writer", "manager", "owner"
  "grantedToV2": {
    "user": {
      "userPrincipalName": "<user_alias>@<tenant_name>.onmicrosoft.com"
      //"userPrincipalName": "<group_alias>@<tenant_name>.onmicrosoft.com"
    }
  }
}


GET CONTAINER PERMISSION
----------------
Method: GET  
URL: https://graph.microsoft.com/beta/storage/fileStorage/containers/<containerId>/permissions/<permissionId>


DELETE CONTAINER PERMISSION
----------------
Method: DELETE  
URL: https://graph.microsoft.com/beta/storage/fileStorage/containers/<containerId>/permissions/<permissionId>


