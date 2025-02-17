namespace RMIS.Models.Account
{
    public class DepartmentUser
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public int? DepartmentId { get; set; }
        public string Department { get; set; }
        public string Role { get; set; }
        public bool Status { get; set; }
        public DateTime CreateAt { get; set; }
    }
}
