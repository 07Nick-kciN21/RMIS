namespace RMIS.Models.sql
{
    public class Category
    {
        public Guid Id { get; set; } // 唯一識別碼
        public string Name { get; set; } // 分類名稱
        public Guid? ParentId { get; set; }
        public Category Parent { get; set; } // 父類別 (optional)
        public ICollection<Category> Subcategories { get; set; } // 子類別 (children)
        // 新增一個自動遞增的 OrderId
        public int OrderId { get; set; }
        // 允許存取的部門 (可多個)
        public List<int> DepartmentIds { get; set; } = new();
        // Constructor
        public Category()
        {
            Subcategories = new List<Category>();
        }
    }
}
