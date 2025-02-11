namespace RMIS.Models.Account
{
    public class UpdateRolePermission
    {
        public string RoleId { get; set; }
        public string RoleName { get; set; }
        public List<string> Roles { get; set; }
        public List<Permissions> Permissions { get; set; }
    }

    public class Permissions
    {
        public string PermissionName { get; set; }
        public bool Read { get; set; }
        public bool Create { get; set; }
        public bool Update { get; set; }
        public bool Delete { get; set; }
        public bool Export { get; set; }
    }
}
