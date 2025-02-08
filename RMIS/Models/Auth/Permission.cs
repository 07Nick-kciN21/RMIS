namespace RMIS.Models.Auth
{
    public class Permission
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public ICollection<RolePermission> RolePermissions { get; set; }
    }
}
