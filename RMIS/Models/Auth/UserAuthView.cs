namespace RMIS.Models.Auth
{
    /// <summary>vw_UserAuthInfo：使用者 + 角色 + 部門（唯讀）</summary>
    public class UserAuthView
    {
        public string UserId { get; set; }
        public string? UserName { get; set; }
        public string? DisplayName { get; set; }
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }
        public string? CitizenCardNo { get; set; }
        public int UserOrder { get; set; }
        public bool UserStatus { get; set; }
        public bool EmailConfirmed { get; set; }
        public DateTime CreatedAt { get; set; }
        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public bool? DeptStatus { get; set; }
        public int? DeptOrder { get; set; }
        public string? RoleId { get; set; }
        public string? RoleName { get; set; }
        public bool? RoleStatus { get; set; }
        public int? RoleOrder { get; set; }
    }
}
