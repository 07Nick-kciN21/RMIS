namespace RMIS.Models.Account.Departments
{
    public class DepartmentManager
    {
        public List<DepartmentData> Departments { get; set; }
    }

    public class DepartmentData
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public bool Status { get; set; }
        public DateTime CreateAt { get; set; }
    }
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
    public class UpdateDepartment
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public bool Status { get; set; }
    }
    public class UpdateDepartmentView
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public bool Status { get; set; }
    }

    public class CreateDepartmentView
    {
        public string Name { get; set; }
        public bool Status { get; set; }
    }
}
