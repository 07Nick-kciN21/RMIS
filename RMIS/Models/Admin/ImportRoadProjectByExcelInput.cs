using Microsoft.AspNetCore.Http;

namespace RMIS.Models.Admin
{
    /// <summary>
    /// Excel 匯入道路專案輸入模型
    /// </summary>
    public class ImportRoadProjectByExcelInput
    {
        /// <summary>
        /// Excel 檔案 (.xlsx)
        /// </summary>
        public IFormFile? ExcelFile { get; set; }

        /// <summary>
        /// 照片壓縮檔 (.zip)，目錄結構: {ProjectId}/photo1.jpg, {ProjectId}/photo2.jpg...
        /// </summary>
        public IFormFile? PhotoZipFile { get; set; }

    }

    /// <summary>
    /// Excel 匯入的單筆道路專案資料
    /// </summary>
    public class ExcelRoadProjectRow
    {
        public string ProjectId { get; set; } = "";
        public string Proposer { get; set; } = "";
        public string AdministrativeDistrict { get; set; } = "";
        public string StartPoint { get; set; } = "";
        public string EndPoint { get; set; } = "";
        public string StartEndLocation { get; set; } = "";
        public string RoadLength { get; set; } = "";
        public string CurrentRoadWidth { get; set; } = "";
        public string PlannedRoadWidth { get; set; } = "";
        public string PublicLand { get; set; } = "";
        public string PrivateLand { get; set; } = "";
        public string PublicPrivateLand { get; set; } = "";
        public int ConstructionBudget { get; set; }
        public int LandAcquisitionBudget { get; set; }
        public int CompensationBudget { get; set; }
        public int TotalBudget { get; set; }
        public string Remarks { get; set; } = "";
        public string ReviewYear { get; set; } = "";
        public string CaseType { get; set; } = "";
        public string ProjectName { get; set; } = "";
        public string RCCount { get; set; } = "";
        public string TinHouseCount { get; set; } = "";
        public string ReviewResult { get; set; } = "";

        /// <summary>
        /// 拓寬範圍座標 JSON: [{"lat":24.123,"lng":121.456},...]
        /// </summary>
        public string ExpansionRangeJson { get; set; } = "";

        /// <summary>
        /// 街景照片座標 JSON: [{"lat":24.123,"lng":121.456,"photoName":"xxx.jpg"},...]
        /// </summary>
        public string StreetViewPhotoJson { get; set; } = "";

        /// <summary>
        /// 座標是否由 OpenStreetMap API 自動取得（非 Excel 原始資料）
        /// </summary>
        [System.Text.Json.Serialization.JsonIgnore]
        public bool GeocodedByApi { get; set; } = false;

        /// <summary>
        /// Excel 中的列號（用於錯誤訊息）
        /// </summary>
        [System.Text.Json.Serialization.JsonIgnore]
        public int RowNumber { get; set; }
    }

    /// <summary>
    /// 匯入前檢查結果（專案編號是否已存在 / Excel 內是否重複）
    /// </summary>
    public class CheckRoadProjectImportResult
    {
        public bool Success { get; set; } = true;
        public string Message { get; set; } = "";
        public int TotalCount { get; set; }

        /// <summary>
        /// 系統中已存在的專案（匯入時將被更新覆蓋）
        /// </summary>
        public List<ExistingRoadProjectInfo> ExistingProjects { get; set; } = new List<ExistingRoadProjectInfo>();

        /// <summary>
        /// Excel 內重複出現的專案編號
        /// </summary>
        public List<DuplicateProjectIdInfo> DuplicateInFile { get; set; } = new List<DuplicateProjectIdInfo>();

        /// <summary>
        /// 已存在但建立者非目前使用者的專案（無更新權限）
        /// </summary>
        public List<ExistingRoadProjectInfo> NoPermissionProjects { get; set; } = new List<ExistingRoadProjectInfo>();

        public List<string> Errors { get; set; } = new List<string>();
    }

    public class ExistingRoadProjectInfo
    {
        public string ProjectId { get; set; } = "";
        public string? ProjectName { get; set; }

        [System.Text.Json.Serialization.JsonIgnore]
        public string? CreatedByUserId { get; set; }
    }

    public class DuplicateProjectIdInfo
    {
        public string ProjectId { get; set; } = "";
        public List<int> RowNumbers { get; set; } = new List<int>();
    }

    /// <summary>
    /// Excel 匯入結果
    /// </summary>
    public class ImportRoadProjectResult
    {
        public bool Success { get; set; }
        public string Message { get; set; } = "";
        public int ImportedCount { get; set; }
        public int UpdatedCount { get; set; }
        public List<string> Errors { get; set; } = new List<string>();
    }
}
