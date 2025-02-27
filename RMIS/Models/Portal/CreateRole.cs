namespace RMIS.Models.Portal
{
    public class CreateRole
    {
        public string RoleName { get; set; }
        public List<CreatePermission> Permissions { get; set; }
    }

    public class CreatePermission
    {
        public int PermissionId { get; set; } // 權限 ID
        public string PermissionName { get; set; } // 權限名稱
        public bool Read { get; set; } // 讀取權限
        public bool Create { get; set; } // 新增權限
        public bool Update { get; set; } // 修改權限
        public bool Delete { get; set; } // 刪除權限
        public bool Export { get; set; } // 匯出權限
    }
}
