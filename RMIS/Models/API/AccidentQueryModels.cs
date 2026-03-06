using System.Text.Json.Serialization;

namespace RMIS.Models.API
{
    public class AccidentQueryInput
    {
        public int StartYear { get; set; }
        public int StartMonth { get; set; }
        public int EndYear { get; set; }
        public int EndMonth { get; set; }
        public string Area { get; set; } = string.Empty;
        public string? Road { get; set; }
        public string? AccidentType { get; set; }
    }

    public class AccidentRecord
    {
        [JsonPropertyName("year")]
        public string Year { get; set; } = string.Empty;

        [JsonPropertyName("date")]
        public string Date { get; set; } = string.Empty;

        [JsonPropertyName("time")]
        public string Time { get; set; } = string.Empty;

        [JsonPropertyName("area")]
        public string Area { get; set; } = string.Empty;

        [JsonPropertyName("road")]
        public string Road { get; set; } = string.Empty;

        [JsonPropertyName("section")]
        public string? Section { get; set; }

        [JsonPropertyName("lane")]
        public string? Lane { get; set; }

        [JsonPropertyName("alley")]
        public string? Alley { get; set; }

        [JsonPropertyName("intersection_road")]
        public string? IntersectionRoad { get; set; }

        [JsonPropertyName("intersection_section")]
        public string? IntersectionSection { get; set; }

        [JsonPropertyName("intersection_lane")]
        public string? IntersectionLane { get; set; }

        [JsonPropertyName("intersection_alley")]
        public string? IntersectionAlley { get; set; }

        [JsonPropertyName("road_other")]
        public string? RoadOther { get; set; }

        [JsonPropertyName("accident_type")]
        public string Type { get; set; } = string.Empty;

        [JsonPropertyName("latitude")]
        public string Latitude { get; set; } = string.Empty;

        [JsonPropertyName("longitude")]
        public string Longitude { get; set; } = string.Empty;

        /// <summary>
        /// 從 Date (如 "20170101") 解析出月份
        /// </summary>
        [JsonIgnore]
        public string Month =>
            Date?.Length >= 6 ? Date.Substring(4, 2) : string.Empty;

        /// <summary>
        /// 從 Date (如 "20170101") 解析出日
        /// </summary>
        [JsonIgnore]
        public string Day =>
            Date?.Length >= 8 ? Date.Substring(6, 2) : string.Empty;
    }
}
