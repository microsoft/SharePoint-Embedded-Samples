"""
Configuration management for the CMIS test client.
Loads settings from environment variables or prompts the user.
"""

import os
from getpass import getpass
from dotenv import load_dotenv


def load_config() -> dict:
    """
    Load configuration from .env file or prompt user for missing values.
    
    Returns:
        dict: Configuration dictionary with all required settings.
    """
    # Load .env file if it exists
    load_dotenv()
    
    config = {}
    
    # Container Type ID
    config['container_type_id'] = os.getenv('CONTAINER_TYPE_ID')
    if not config['container_type_id']:
        config['container_type_id'] = input("Enter Container Type ID: ").strip()
    
    # Username
    config['username'] = os.getenv('CMIS_USERNAME')
    if not config['username']:
        config['username'] = input("Enter CMIS Username: ").strip()
    
    # Password
    config['password'] = os.getenv('CMIS_PASSWORD')
    if not config['password']:
        config['password'] = getpass("Enter CMIS Password: ")
    
    # Container name for testing (default: "CMIS Test")
    config['container_name'] = os.getenv('CMIS_CONTAINER_NAME', 'CMIS Test')
    
    # Base URL (with default) - point this at your Azure deployment to test a live server
    config['base_url'] = os.getenv('CMIS_BASE_URL', 'http://localhost:7071')
    
    # Local sample data folder path (override to upload a different folder)
    config['docs_folder'] = os.getenv(
        'CMIS_SAMPLE_DATA_FOLDER',
        os.path.join(os.path.dirname(__file__), 'sample_data'),
    )
    
    return config


def get_cmis_url(config: dict) -> str:
    """
    Construct the full CMIS browser binding URL.
    
    Args:
        config: Configuration dictionary containing base_url and container_type_id
        
    Returns:
        str: The full CMIS service URL
    """
    base_url = config['base_url'].rstrip('/')
    container_type_id = config['container_type_id']
    return f"{base_url}/api/storage/fileStorage/containerTypes/{container_type_id}/cmis/browser"


if __name__ == "__main__":
    # Test configuration loading
    config = load_config()
    print(f"\nConfiguration loaded:")
    print(f"  Container Type ID: {config['container_type_id']}")
    print(f"  Username: {config['username']}")
    print(f"  Password: {'*' * len(config['password'])}")
    print(f"  CMIS URL: {get_cmis_url(config)}")
