using Microsoft.AspNetCore.Http;

namespace RMIS.Models.Admin
{
    public class AddRoadProjectInput
    {

        // 提案人
        public string? Proposer { get; set; }

        // 行政區
        public string? AdminDistrict { get; set; }

        // 起點
        public string? StartPoint { get; set; }

        // 終點
        public string? EndPoint { get; set; }

        // 道路長度
        public float RoadLength { get; set; }

        // 現況路寬
        public string? CurrentRoadWidth { get; set; }

        // 現況類別
        public string? CurrentRoadType { get; set; }

        // 計畫路寬
        public string? PlannedRoadWidth { get; set; }

        //計畫類別
        public string? PlannedRoadType { get; set; }

        // 公有土地
        public int PublicLand { get; set; }

        // 私有土地
        public int PrivateLand { get; set; }

        // 公私土地
        public int PublicPrivateLand { get; set; }

        // 工程經費
        public int ConstructionBudget { get; set; }

        // 用地經費
        public int LandBudget { get; set; }

        // 補償經費
        public int CompensationBudget { get; set; }

        // 合計經費
        public int TotalBudget { get; set; }

        // 備註
        public string? Remark { get; set; }

        // 審議年度
        public string? ReviewYear { get; set; }

        // 案件類型
        public string? CaseType { get; set; }

        // 工程名稱
        public string? ProjectName { get; set; }

        // RC數量
        public string? RCCount { get; set; }

        // 鐵皮屋數量
        public string? TinHouseCount { get; set; }

        // 審議結果
        public string? ReviewResult { get; set; }

        // 欲拓範圍
        public List<range>? ExpansionRange { get; set; }
        // 街景照片
        public List<photo>? StreetViewPhoto { get; set; }
    }
    public class range
    {
        public int Id { get; set; } // 主鍵
        public double Latitude { get; set; } // 經度
        public double Longitude { get; set; } // 緯度
    }
    public class photo
    {
        public int Id { get; set; } // 序列
        public IFormFile? Photo { get; set; } // 圖檔
        // 可為 null：避免 [ApiController] 將空值視為隱含必填而回傳英文驗證錯誤，改由 StreetPhotoValidator 檢查
        public string? PhotoName { get; set; } // 圖片描述
        public double? Latitude { get; set; } // 經度
        public double? Longitude { get; set; } // 緯度
    }

    /// <summary>
    /// 街景照片資料檢查（前端 streetPhotoCheck.js 有相同規則）：
    /// 每筆都要有圖檔（新上傳，或允許時沿用既有檔名），且緯經度有效、不為 0
    /// </summary>
    public static class StreetPhotoValidator
    {
        /// <param name="photos">街景照片清單</param>
        /// <param name="allowExisting">編輯時為 true：未上傳新檔但有既有檔名者視為沿用既有照片</param>
        /// <returns>有問題時回傳錯誤訊息（逐筆列出），否則回傳 null</returns>
        public static string? Validate(IEnumerable<photo>? photos, bool allowExisting)
        {
            var problems = new List<string>();
            var index = 0;
            foreach (var p in photos ?? Enumerable.Empty<photo>())
            {
                index++;
                var issues = new List<string>();

                var hasFile = p.Photo != null && p.Photo.Length > 0;
                var hasExisting = allowExisting && !string.IsNullOrWhiteSpace(p.PhotoName);
                if (!hasFile && !hasExisting)
                {
                    issues.Add("尚未選擇圖檔");
                }

                var validLat = p.Latitude is double lat && double.IsFinite(lat) && lat != 0 && Math.Abs(lat) <= 90;
                var validLng = p.Longitude is double lng && double.IsFinite(lng) && lng != 0 && Math.Abs(lng) <= 180;
                if (!validLat || !validLng)
                {
                    issues.Add("緯經度未填寫或格式不正確");
                }

                if (issues.Count > 0)
                {
                    problems.Add($"照片 {index}：{string.Join("、", issues)}");
                }
            }

            return problems.Count == 0
                ? null
                : $"街景照片資料不完整，請補齊或刪除該筆後再送出：{string.Join("；", problems)}";
        }
    }

    /// <summary>
    /// 重試多次仍無法產生未使用的專案編號
    /// </summary>
    public class ProjectIdUnavailableException : Exception
    {
        public ProjectIdUnavailableException() : base("網路錯誤，請稍後再次新增") { }
    }
}
