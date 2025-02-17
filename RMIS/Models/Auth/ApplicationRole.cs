using Microsoft.AspNetCore.Identity;
using System.Collections.Generic;

namespace RMIS.Models.Auth
{
    public class ApplicationRole : IdentityRole
    {
        public int Order { get; set; }
        public bool Status { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public ICollection<RolePermission> RolePermissions { get; set; }
    }
}
