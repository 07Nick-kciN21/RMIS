namespace RMIS.Models.Auth
{
    /// <summary>vw_RolePermissionDetail：角色 × 權限完整矩陣（唯讀），未指派的權限 CRUD 皆為 false</summary>
    public class RolePermissionView
    {
        public string RoleId { get; set; }
        public string? RoleName { get; set; }
        public bool RoleStatus { get; set; }
        public int RoleOrder { get; set; }
        public int PermissionId { get; set; }
        public string PermissionName { get; set; }
        public bool PermissionStatus { get; set; }
        public int PermissionOrder { get; set; }
        /// <summary>RolePermissions 是否有實際資料列</summary>
        public bool IsAssigned { get; set; }
        public bool Read { get; set; }
        public bool Create { get; set; }
        public bool Update { get; set; }
        public bool Delete { get; set; }
        public bool Export { get; set; }
    }
}
