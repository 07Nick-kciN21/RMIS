using System.ComponentModel.DataAnnotations.Schema;

namespace RMIS.Models.sql
{
    [Table("process_edit_log")]
    public class ProcessEditLog
    {
        public int Id { get; set; }
        public string ProcessId { get; set; }
        public DateTime RecordTime { get; set; }
        /// <summary>
        /// 操作種類：建立 / 編輯
        /// </summary>
        public string OperationType { get; set; }
    }
}
