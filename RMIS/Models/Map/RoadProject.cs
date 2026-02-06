using RMIS.Models.sql;

namespace RMIS.Models.Map
{
    public class RoadProject
    {
        public class ProjectProcessesList
        {
            public string ProjectId { get; set; }
            public List<ProcessRecordDTO> Process1List { get; set; } = new();
            public List<ProcessRecordDTO> Process2List { get; set; } = new();
            public List<ProcessRecordDTO> Process3List { get; set; } = new();
        }

        public class ProcessRecordDTO
        {
            public int Id { get; set; }
            public Guid ProcessId { get; set; }
            public string RecordType { get; set; } = string.Empty;  // Process1, Process2, Process3
            public string RecordTitle { get; set; } = string.Empty;
            public DateTime? CreatedAt { get; set; }
            public string CurrentStatus { get; set; } = string.Empty;
            public List<ProcessFileDTO> Files { get; set; } = new();
        }

        public class ProcessFileDTO
        {
            public int Id { get; set; }
            public string FileName { get; set; } = string.Empty;
            public string FileType { get; set; } = string.Empty;
            public string FileSize { get; set; } = string.Empty;
        }

        public class Process1ViewDTO
        {
            public int Id { get; set; }
            public Guid ProcessId { get; set; }
            public string ProjectId { get; set; }

            /// <summary>
            /// 行政區
            /// </summary>
            public string? District { get; set; }

            /// <summary>
            /// 記錄類別
            /// </summary>
            public string? RecordType { get; set; }

            /// <summary>
            /// 記錄標題
            /// </summary>
            public string? RecordTitle { get; set; }

            /// <summary>
            /// 執行單位
            /// </summary>
            public string? ExecutionUnit { get; set; }

            /// <summary>
            /// 工程單位
            /// </summary>
            public string? ConstructionUnit { get; set; }

            /// <summary>
            /// 工程名稱
            /// </summary>
            public string? ProjectName { get; set; }

            /// <summary>
            /// 前次會議辦理情形
            /// </summary>
            public string? PreviousMeetingStatus { get; set; }

            /// <summary>
            /// 前次會議裁示
            /// </summary>
            public string? PreviousMeetingResolution { get; set; }

            /// <summary>
            /// 最新辦理情形
            /// </summary>
            public string? CurrentStatus { get; set; }

            /// <summary>
            /// 本次會議裁示
            /// </summary>
            public string? CurrentMeetingResolution { get; set; }

            /// <summary>
            /// 新增時間
            /// </summary>
            public DateTime? CreatedAt { get; set; }

            /// <summary>
            /// 佐證文件
            /// </summary>
            public string? SupportingDocument { get; set; }
        }
    }
}
