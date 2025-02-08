namespace RMIS.Models.Auth
{
    public class RolePermission
    {
        public string AccessLevel { get; set; } // "None", "View", "Edit", "Full"
        public string RoleId { get; set; }
        public ApplicationRole Role { get; set; }
        public int PermissionId { get; set; }
        public Permission Permission { get; set; }
    }

}
