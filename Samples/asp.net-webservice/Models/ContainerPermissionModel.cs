using System.Collections.Generic;

namespace Demo.Models
{
    public class User
    {
        public string displayName { get; set; }
        public string email { get; set; }
        public string userPrincipalName { get; set; }
    }
    public class PermissionUser
    {
        public User user { get; set; }
    }

    public class ContainerPermissionModel
    {
        public string id { get; set; }
        public IEnumerable<string> roles;
        public PermissionUser grantedToV2;
    }
}
