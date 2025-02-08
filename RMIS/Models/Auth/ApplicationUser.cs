using Microsoft.AspNetCore.Identity;
using System.Collections.Generic;

namespace RMIS.Models.Auth
{
    public class ApplicationUser : IdentityUser
    {
        public ICollection<IdentityUserRole<string>> UserRoles { get; set; }
    }
}
