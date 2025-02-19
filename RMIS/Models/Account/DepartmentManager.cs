namespace RMIS.Models.Account
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
}
