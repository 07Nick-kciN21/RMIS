namespace RMIS.Models.sql
{
    public class Pipeline_sys
    {
        public Guid Id { get; set; } // 唯一識別碼
        public string SystemName { get; set; } // 系統名稱
        public ICollection<Pipeline> pipelines { get; set; }
    }
}
