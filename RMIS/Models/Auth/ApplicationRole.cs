using Microsoft.AspNetCore.Identity;
using System.Collections.Generic;

namespace RMIS.Models.Auth
{
    public class ApplicationRole : IdentityRole
    {
        public ICollection<RolePermission> RolePermissions { get; set; }
    }
}
