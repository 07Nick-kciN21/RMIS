namespace RMIS.Models.Account.Roles
{
    public class GetRolePermission
    {
        public string RoleId { get; set; }
        public string RoleName { get; set; }
        public List<GetPermission> Permissions { get; set; }
    }

    public class GetPermission
    {
        public int PermissionId { get; set; } // 權限 ID
        public string PermissionName { get; set; } // 權限名稱
        public bool Read { get; set; } // 讀取權限
        public bool Create { get; set; } // 新增權限
        public bool Update { get; set; } // 修改權限
        public bool Delete { get; set; } // 刪除權限
        public bool Export { get; set; } // 匯出權限
    }

    public class ReadRolePermission
    {
        public string RoleName { get; set; }
        public List<ReadPermission> Permissions { get; set; }
    }
    public class ReadPermission
    {
        public string PermissionName { get; set; }
        public bool Read { get; set; }
        public bool Create { get; set; }
        public bool Update { get; set; }
        public bool Delete { get; set; }
        public bool Export { get; set; }
    }
    public class RoleManager
    {
        public List<RoleData> Roles { get; set; }
    }

    public class RoleData
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public bool Status { get; set; }
        public DateTime CreateAt { get; set; }
        public List<RolePermissionData> permissions { get; set; }
    }

    public class RolePermissionData
    {
        public string Name { get; set; }
        public bool Read { get; set; }
        public bool Create { get; set; }
        public bool Update { get; set; }
        public bool Delete { get; set; }
        public bool Export { get; set; }
    }
    public class UpdateRoleView
    {
        public string RoleId { get; set; }
        public string RoleName { get; set; }
        public bool Status { get; set; }
        public List<UpdatePermission> Permissions { get; set; }
    }
    public class UpdatePermission
    {
        public int PermissionId { get; set; }
        public string PermissionName { get; set; }
        public bool Read { get; set; }
        public bool Create { get; set; }
        public bool Update { get; set; }
        public bool Delete { get; set; }
        public bool Export { get; set; }
    }

    public class CreateRoleView
    {
        public string RoleName { get; set; }
        public bool Status { get; set; }
        public List<CreatePermission> Permissions { get; set; }
    }

    public class CreatePermission
    {
        public int PermissionId { get; set; }
        public string PermissionName { get; set; }
        public bool Read { get; set; }
        public bool Create { get; set; }
        public bool Update { get; set; }
        public bool Delete { get; set; }
        public bool Export { get; set; }
    }
}
