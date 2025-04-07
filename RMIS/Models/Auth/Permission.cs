namespace RMIS.Models.Auth
{
    public class Permission
    {
        public int Id { get; set; }
        public int Order { get; set; }
        public string Name { get; set; }
        public bool Status { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public bool IsSystemProtected { get; set; } = false;
        public ICollection<RolePermission> RolePermissions { get; set; }
    }
}
