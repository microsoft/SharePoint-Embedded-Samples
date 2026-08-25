"""
CMIS Client for SharePoint Embedded CMIS Adapter

This client uses cmislib to connect to the SPE CMIS server
for testing and validation purposes.

Uses the Browser Binding (JSON-based) since the SPE CMIS server
implements the CMIS Browser Binding specification.
"""

import os
import sys
import mimetypes
import requests
from cmislib import CmisClient
from cmislib.browser.binding import BrowserBinding
from cmislib.exceptions import CmisException
from config import load_config, get_cmis_url


def debug_http_request(url: str, config: dict, description: str) -> None:
    """
    Make a raw HTTP request and show what the server returns.
    Useful for debugging CMIS response format issues.
    """
    print(f"\n--- DEBUG: {description} ---")
    print(f"URL: {url}")
    
    try:
        response = requests.get(
            url,
            auth=(config['username'], config['password']),
            timeout=30
        )
        
        print(f"Status: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type', 'N/A')}")
        print(f"Response:")
        
        # Try to pretty-print JSON
        try:
            import json
            data = response.json()
            print(json.dumps(data, indent=2)[:2000])  # Limit output
        except:
            print(response.text[:2000])
            
    except Exception as e:
        print(f"Error: {e}")
    
    print("--- END DEBUG ---\n")


def create_client(config: dict) -> CmisClient:
    """
    Create a CMIS client with the given configuration.
    
    Args:
        config: Configuration dictionary with URL and credentials
        
    Returns:
        CmisClient: Configured CMIS client instance using Browser Binding
    """
    cmis_url = get_cmis_url(config)
    print(f"Connecting to: {cmis_url}")
    
    # Use Browser Binding since the SPE CMIS server uses /cmis/browser endpoint
    client = CmisClient(
        cmis_url,
        config['username'],
        config['password'],
        binding=BrowserBinding()
    )
    
    return client


def get_repositories(client: CmisClient) -> list:
    """
    Get all repositories from the CMIS server.
    
    Args:
        client: CMIS client instance
        
    Returns:
        list: List of repository info dictionaries
    """
    print("\n" + "=" * 60)
    print("Getting Repositories")
    print("=" * 60)
    
    repositories = client.getRepositories()
    
    if not repositories:
        print("No repositories found.")
        return []
    
    print(f"Found {len(repositories)} repository(ies):\n")
    
    for repo_info in repositories:
        print(f"  • {repo_info.get('repositoryName', 'N/A')} ({repo_info.get('repositoryId', 'N/A')})")
    
    return repositories


def find_repository_by_name(client: CmisClient, repositories: list, container_name: str):
    """
    Find a repository by name.
    
    Args:
        client: CMIS client instance
        repositories: List of repository info dicts from getRepositories
        container_name: Name to search for
        
    Returns:
        Repository object or None
    """
    print("\n" + "=" * 60)
    print(f"Looking for container: '{container_name}'")
    print("=" * 60)
    
    matching = [r for r in repositories if r.get('repositoryName') == container_name]
    
    if not matching:
        print(f"ERROR: No container found with name '{container_name}'")
        return None
    
    if len(matching) > 1:
        print(f"Found {len(matching)} containers with name '{container_name}', using the first one.")
    
    repo_id = matching[0].get('repositoryId')
    print(f"Found container: {repo_id}")
    
    return client.getRepository(repo_id)


def show_repository_info(repo) -> None:
    """
    Display detailed repository information.
    
    Args:
        repo: Repository object
    """
    print("\n" + "=" * 60)
    print("Repository Info")
    print("=" * 60)
    
    info = repo.info if hasattr(repo, 'info') else {}
    
    print(f"  ID: {repo.id}")
    print(f"  Name: {repo.name}")
    print(f"  Description: {info.get('repositoryDescription', '(none)') or '(none)'}")
    print(f"  Root Folder ID: {info.get('rootFolderId', 'N/A')}")
    print(f"  CMIS Version: {info.get('cmisVersionSupported', 'N/A')}")
    print(f"  Vendor: {info.get('vendorName', 'N/A')}")
    print(f"  Product: {info.get('productName', 'N/A')} v{info.get('productVersion', 'N/A')}")


def list_folder_contents(folder, indent: int = 0, max_depth: int = 10) -> list:
    """
    List all children (files and folders) in a folder.
    
    Args:
        folder: CMIS folder object
        indent: Indentation level for nested display
        max_depth: Maximum recursion depth to prevent infinite loops
        
    Returns:
        list: All child objects
    """
    if indent >= max_depth:
        print(f"{'  ' * indent}... (max depth reached)")
        return []
    
    children = list(folder.getChildren())
    prefix = "  " * indent
    
    for child in children:
        # Check if it's a folder by looking at the baseTypeId property
        base_type = child.properties.get('cmis:baseTypeId', '')
        is_folder = base_type == 'cmis:folder'
        
        if is_folder:
            print(f"{prefix}📁 {child.name}")
            # Recursively list subfolder contents
            list_folder_contents(child, indent + 1, max_depth)
        else:
            print(f"{prefix}📄 {child.name}")
    
    return children


def list_all_contents(repo, config: dict = None) -> None:
    """
    List all contents in the repository root.
    
    Args:
        repo: Repository object
        config: Optional config dict for debug HTTP calls
    """
    print("\n" + "=" * 60)
    print("Listing Repository Contents")
    print("=" * 60)
    
    # Debug: Show raw HTTP request for getChildren
    if config:
        info = repo.info if hasattr(repo, 'info') else {}
        root_folder_url = info.get('rootFolderUrl', 'N/A')
        if root_folder_url and root_folder_url != 'N/A':
            debug_url = f"{root_folder_url}?cmisselector=children"
            debug_http_request(debug_url, config, "getChildren on root folder")
    
    root = repo.rootFolder
    children = list_folder_contents(root)
    
    if not children:
        print("  (empty)")
    
    print(f"\nTotal items in root: {len(children)}")


def delete_all_contents(repo) -> None:
    """
    Delete all files and folders in the repository root.
    
    Args:
        repo: Repository object
    """
    print("\n" + "=" * 60)
    print("Deleting All Contents")
    print("=" * 60)
    
    root = repo.rootFolder
    children = list(root.getChildren())
    
    if not children:
        print("  Repository is already empty.")
        return
    
    deleted_count = 0
    
    for child in children:
        try:
            # Check if it's a folder by looking at the baseTypeId property
            base_type = child.properties.get('cmis:baseTypeId', '')
            is_folder = base_type == 'cmis:folder'
            name = child.name
            
            if is_folder:
                # Delete folder tree (recursive)
                print(f"  🗑️  Deleting folder: {name}")
                child.deleteTree()
            else:
                # Delete document
                print(f"  🗑️  Deleting file: {name}")
                child.delete()
            
            deleted_count += 1
            
        except CmisException as e:
            print(f"  ❌ ERROR deleting {child.name}: {e}")
    
    print(f"\nDeleted {deleted_count} item(s).")


def get_mime_type(file_path: str) -> str:
    """
    Get the MIME type for a file based on its extension.
    
    Args:
        file_path: Path to the file
        
    Returns:
        str: MIME type string
    """
    mime_type, _ = mimetypes.guess_type(file_path)
    return mime_type or 'application/octet-stream'


def upload_folder_contents(repo, local_folder: str, parent_folder=None, indent: int = 0) -> None:
    """
    Upload all files and folders from a local directory to CMIS.
    
    Args:
        repo: Repository object
        local_folder: Path to local folder to upload
        parent_folder: CMIS folder to upload into (None = root)
        indent: Indentation level for display
    """
    if parent_folder is None:
        parent_folder = repo.rootFolder
    
    if not os.path.exists(local_folder):
        print(f"ERROR: Local folder not found: {local_folder}")
        return
    
    prefix = "  " * indent
    
    for item in sorted(os.listdir(local_folder)):
        item_path = os.path.join(local_folder, item)
        
        if os.path.isdir(item_path):
            # Create folder in CMIS
            print(f"{prefix}📁 Creating folder: {item}")
            try:
                new_folder = parent_folder.createFolder(item)
                # Recursively upload folder contents
                upload_folder_contents(repo, item_path, new_folder, indent + 1)
            except CmisException as e:
                print(f"{prefix}  ❌ ERROR creating folder {item}: {e}")
        else:
            # Upload file
            print(f"{prefix}📄 Uploading file: {item}")
            try:
                mime_type = get_mime_type(item_path)
                with open(item_path, 'rb') as f:
                    parent_folder.createDocument(
                        item,
                        contentFile=f,
                        contentType=mime_type
                    )
            except CmisException as e:
                print(f"{prefix}  ❌ ERROR uploading {item}: {e}")


def sync_docs_folder(repo, docs_folder: str) -> None:
    """
    Sync the local docs folder to the CMIS repository.
    
    Args:
        repo: Repository object
        docs_folder: Path to local docs folder
    """
    print("\n" + "=" * 60)
    print(f"Uploading contents from: {docs_folder}")
    print("=" * 60)
    
    if not os.path.exists(docs_folder):
        print(f"ERROR: Docs folder not found: {docs_folder}")
        return
    
    upload_folder_contents(repo, docs_folder)
    print("\nUpload complete!")


def main():
    """Main entry point for the CMIS client tests."""
    print("=" * 60)
    print("SPE CMIS Client - Test Suite")
    print("=" * 60)
    
    # Load configuration
    config = load_config()
    
    # Create client
    try:
        client = create_client(config)
    except Exception as e:
        print(f"Failed to create client: {e}")
        return 1
    
    # Run tests
    try:
        # Step 1: Get all repositories
        repositories = get_repositories(client)
        
        if not repositories:
            print("No repositories available. Exiting.")
            return 1
        
        # Step 2: Find the target container by name
        repo = find_repository_by_name(client, repositories, config['container_name'])
        
        if repo is None:
            print(f"\nPlease create a container named '{config['container_name']}' or set CMIS_CONTAINER_NAME in .env")
            return 1
        
        # Step 3: Show repository info
        show_repository_info(repo)
        
        # Debug: Show the rootFolderUrl
        info = repo.info if hasattr(repo, 'info') else {}
        print(f"\n  rootFolderUrl: {info.get('rootFolderUrl', 'NOT SET')}")
        
        # Step 4: List current contents
        print("\n" + "=" * 60)
        print("BEFORE CLEANUP")
        print("=" * 60)
        list_all_contents(repo, config)
        
        # Step 5: Delete everything
        delete_all_contents(repo)
        
        # Step 6: Upload docs folder contents
        sync_docs_folder(repo, config['docs_folder'])
        
        # Step 7: List contents after upload
        print("\n" + "=" * 60)
        print("AFTER UPLOAD")
        print("=" * 60)
        list_all_contents(repo, config)
        
        print("\n" + "=" * 60)
        print("All tests completed successfully!")
        print("=" * 60)
        return 0
        
    except CmisException as e:
        print(f"\nTest failed with CMIS error: {e}")
        return 1
    except Exception as e:
        print(f"\nTest failed with unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
