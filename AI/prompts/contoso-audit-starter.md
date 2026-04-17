SHAREPOINT EMBEDDED (SPE) DEMO APP INSTRUCTIONS
===============================================

Please create a beautiful demo app for SharePoint Embedded based on the following instructions.
Note that this app should be themed around the corporate audit use case.  Each container is a company's audit.  
Instead of showing a list of containers or creating a container, you are listing audits or creating new audits.

-----------------------------------------------
0. Notes on user experience
-----------------------------------------------

- the app name should include "Contoso Audit" 
- very clean and simple is the goal
- you will need a login page, a post login landing page, a file upload page.  Note that file upload can be modal dialogs instead of separate pages.
- the header should display "Contoso Audit", a link specific to the user, and a logout button.
- logout should take the user back to a login page.
- the post login landing page should display all of the containers a user has access to.
- use a bright and soft color scheme with pastel-like colors that is warm and professional
- DO NOT INCLUDE file search functionality.
- DO NOT INCLUDE container search functionality.

-----------------------------------------------
1. REQUIRED CONFIGURATION
-----------------------------------------------

Every SPE app must define these three non-secret values:

CLIENT_ID=[uuid]   
TENANT_ID=[uuid] 
CONTAINER_TYPE_ID=[uuid]  

Use the values as they are above, but put them into a central configuration file so they are easy to update later


-----------------------------------------------
2. AUTHENTICATION (MSAL)
-----------------------------------------------

Use Microsoft Authentication Library (MSAL) to authenticate users.

- use the latest version of @azure/msal-react@latest and @azure/msal-browser@latest.
- best sure to install these as you go.
- do not specify scopes as part of login.  Scopes should be empty.
- if a user is not authenticated, they should only be able to see the login screen.
- once a user is authenticated, they should advance to the list of containers.
- IMPORTANT: Make sure you call and wait for MSAL's `initialize` function before attempting user login

Access Tokens:
- Must be sent with every Graph API request
- Header format: Authorization: Bearer <accessToken>

Login behavior:
- Do not auto-login
- Wait for user to click a login button before starting the flow
- remember to call the MSAL initialize function ahead of time
- IMPORTANT: Make sure when a user logs in they are take to a post login landing page where they can see the list of audits

Logout behavior:
- Be sure to clear any local storage on logout to prevent data leakage.

-----------------------------------------------
3. CONTAINERS
-----------------------------------------------

CREATE CONTAINER
----------------
Method: POST  
URL: https://graph.microsoft.com/v1.0/storage/fileStorage/containers  
Body JSON:
{
  "displayName": "Name of container",
  "description": "Optional description",
  "containerTypeId": "<value of CONTAINER_TYPE_ID>"
}

LIST CONTAINERS
---------------
Method: GET  
URL format:
https://graph.microsoft.com/v1.0/storage/fileStorage/containers
  ?$select=id,displayName,description,containerTypeId,createdDateTime
  &$filter=containerTypeId eq <value of CONTAINER_TYPE_ID>

Important:
- Do NOT add quotes around the containerTypeId
- Do NOT include extra fields in the $select parameter
- Clicking on the name of a container should open that container and list the files and folders inside.

-----------------------------------------------
4. FILES
-----------------------------------------------

UPLOAD FILE TO CONTAINER
------------------------
Method: PUT  
URL format:
https://graph.microsoft.com/v1.0/drives/<driveId>/items/<folderId>:/<fileName>:/content

- A file must be uploaded into a particular driveId. 
- If no folderId is provided, use 'root:' instead of '<folderId>:'
- File upload should support selecting and uploading multiple files
- Each file should be uploaded in its own PUT request with raw file content as the body
- There should be a progress meter that fits within the UX
- File upload user experience should expand to handle 30 files gracefully

LIST FILES IN A CONTAINER
--------------------------
Method: GET  
URL format:
https://graph.microsoft.com/v1.0/drives/<containerId>/items/<folderId>/children
  ?$expand=listItem($expand=fields)

- listing of files must include the container name as part of a browsing path (eg "home > container name")
- a list of files should generally be a line by line list and not a card style interface.
- some results will be folders
- If no folderId is specified, use 'root:'
- if there is a folder, use it's name where it says "folderId" and remember what folder you are on.  the user should be able to click on a folder and see what's in the folder.
- when the user is browsing a folder, there should be a path indicator that shows where the user is (eg "home > container name > folder")
- when display folders or files, use clean iconography to indicate the file type and what actions are available
- when in doubt, clicking on the name of folder should open that folder and list the contents.  
- clicking on the name of a file should either open that file for editing or open for preview, depending on the file type.

CREATE FOLDER IN A CONTAINER
------------------------
Method: POST  
URL format:
https://graph.microsoft.com/v1.0/drives/<driveId>/items/<folderId>/children

{
  "name": "New Folder",
  "folder": { },
  "@microsoft.graph.conflictBehavior": "rename"
}

- If no folderId is provided, use 'root' instead of '<folderId>:'

-----------------------------------------------
5. OPENING & PREVIEWING FILES
-----------------------------------------------

OFFICE DOCUMENTS
----------------
- Use the webUrl property to open the document in Office Online
- Redirect the browser to the webUrl
- Office documents are editable; the user experience should reflect that with labels like “Edit”
- Clicking on an Office document should always open it in a new browser tab using its webUrl property
- IMPORTANT: Always open Office documents in a new tab; never open an Office document in an iframe

NON-OFFICE DOCUMENTS (PDF, JPEG, etc.)
--------------------------------------
Step 1: Fetch preview URL

Method: POST  
URL format:
https://graph.microsoft.com/v1.0/drives/<driveId>/items/<itemId>/preview

- Response includes a getUrl field
- Redirect to: getUrl + "&nb=true"

Step 2: Render in iframe or allow user to open in new tab

Important:
- Do NOT use webUrl for non-Office formats
- Use only the preview URL
- Non-Office documents are preview-only; the UX should label this action as “Preview”
- On-screen preview should include a link to open the document in a new tab


-----------------------------------------------
6. GENERAL NOTES
-----------------------------------------------

- Use any HTTP library or tool (Fetch, axios, etc.)
- Generally speaking you should use the latest versions of any imported libraries or modules.
- Do not include Microsoft or other logos in the demo
- Add a “Get Started with SharePoint Embedded” link in the footer of every page:
  https://aka.ms/start-spe 

END OF INSTRUCTIONS