using Microsoft.AspNetCore.Mvc.Rendering;

namespace RMIS.Models.Account.Users
{
    public class UpdateUser
    {
        public string UserId { get; set; }
        public string UserName { get; set; }
        public string DisplayName { get; set; }
        public string RoleId { get; set; }
        public int DepartmentId { get; set; }
        public bool Status { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
    }

    public class UserManager
    {
        public List<UserData> Users { get; set; }
        public List<UserRole> Roles { get; set; }
        public List<UserDepartment> Departments { get; set; }
    }
    public class UserData
    {
        public string Id { get; set; }
        public string UserName { get; set; }
        public string DisplayName { get; set; }
        public int? DepartmentId { get; set; }
        public string Department { get; set; }
        public string Email { get; set; }
        public string Phone { get; set; }
        public string RoleId { get; set; }
        public string Role { get; set; }
        public bool Status { get; set; }
        public DateTime CreateAt { get; set; }
    }

    public class UserRole
    {
        public string Id { get; set; }
        public string Name { get; set; }
    }
    public class UserDepartment
    {
        public int Id { get; set; }
        public string Name { get; set; }
    }

    public class UpdateUserView
    {
        public string UserId { get; set; }
        public string UserName { get; set; }
        public string DisplayName { get; set; }
        public string Email { get; set; }
        public string Phone { get; set; }
        public string RoleId { get; set; }
        public IEnumerable<SelectListItem> Roles { get; set; }
        public int? DepartmentId { get; set; }
        public IEnumerable<SelectListItem> Departments { get; set; }
        public bool Status { get; set; }
    }
}
