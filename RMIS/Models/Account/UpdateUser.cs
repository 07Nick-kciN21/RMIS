namespace RMIS.Models.Account
{
    public class UpdateUser
    {
        public string UserId { get; set; }
        public string UserName { get; set; }
        public string RoleId { get; set; }
        public int DepartmentId { get; set; }
        public bool Status { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
    }
}
