namespace RMIS.Models.sql
{
    public class Pipeline
    {
        public Guid Id { get; set; } // 唯一識別碼
        public string Name { get; set; } // 管線名稱
        public string ManagementUnit { get; set; } // 管理單位
        public string Color { get; set; } // 顏色
        public Guid CategoryId { get; set; } // 管線類別
        public ICollection<Road> Roads { get; set; } // 多條道路
        //public Guid PipelineSysId { get; set; } // 管線系統 ID
        //// 導航屬性，用於關聯 Pipeline_sys
        //public Pipeline_sys PipelineSys { get; set; }
    }
}
