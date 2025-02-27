using Microsoft.AspNetCore.Identity;
using System.Collections.Generic;

namespace RMIS.Models.Auth
{
    public class ApplicationUser : IdentityUser
    {
        public string DisplayName { get; set; }
        public int Order { get; set; }
        public bool Status { get; set; } = true;
        public int? DepartmentId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public Department Department { get; set; }
        public ICollection<IdentityUserRole<string>> UserRoles { get; set; }
    }
}
