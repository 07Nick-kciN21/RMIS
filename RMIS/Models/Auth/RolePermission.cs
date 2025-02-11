using System.ComponentModel.DataAnnotations.Schema;

namespace RMIS.Models.Auth
{
    public class RolePermission
    {
        public bool Read { get; set; }
        public bool Create { get; set; }
        public bool Update { get; set; }
        public bool Delete { get; set; }
        public bool Export { get; set; }
        [ForeignKey("Role")]
        public string RoleId { get; set; }
        public ApplicationRole Role { get; set; }
        [ForeignKey("Permission")]
        public int PermissionId { get; set; }
        public Permission Permission { get; set; }
    }

}
