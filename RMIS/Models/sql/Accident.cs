using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RMIS.Models.sql
{
    public class Accident
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        /// <summary>民國年，例如 101</summary>
        [Column("year")]
        public string Year { get; set; } = string.Empty;

        /// <summary>日期，格式 YYYYMMDD，例如 20170101</summary>
        [Column("date")]
        public string Date { get; set; } = string.Empty;

        /// <summary>時間，例如 33500</summary>
        [Column("time")]
        public string Time { get; set; } = string.Empty;

        /// <summary>事故類型，A1/A2/A3</summary>
        [Column("accident_type")]
        public string AccidentType { get; set; } = string.Empty;

        /// <summary>地點類型，例如 交叉路口</summary>
        [Column("location_type")]
        public string LocationType { get; set; } = string.Empty;

        /// <summary>縣市，例如 桃園市</summary>
        [Column("county")]
        public string County { get; set; } = string.Empty;

        /// <summary>縣市代碼</summary>
        [Column("countycode")]
        public string CountyCode { get; set; } = string.Empty;

        /// <summary>行政區，例如 大溪區</summary>
        [Column("area")]
        public string Area { get; set; } = string.Empty;

        /// <summary>行政區代碼</summary>
        [Column("areacode")]
        public string AreaCode { get; set; } = string.Empty;

        /// <summary>道路名稱</summary>
        [Column("road")]
        public string Road { get; set; } = string.Empty;

        /// <summary>路段</summary>
        [Column("section")]
        public string? Section { get; set; }

        /// <summary>車道</summary>
        [Column("lane")]
        public string? Lane { get; set; }

        /// <summary>巷弄</summary>
        [Column("alley")]
        public string? Alley { get; set; }

        /// <summary>交叉路口道路名稱</summary>
        [Column("intersection_road")]
        public string? IntersectionRoad { get; set; }

        /// <summary>交叉路口路段</summary>
        [Column("intersection_section")]
        public string? IntersectionSection { get; set; }

        /// <summary>交叉路口車道</summary>
        [Column("intersection_lane")]
        public string? IntersectionLane { get; set; }

        /// <summary>交叉路口巷弄</summary>
        [Column("intersection_alley")]
        public string? IntersectionAlley { get; set; }

        /// <summary>其他道路描述</summary>
        [Column("road_other")]
        public string? RoadOther { get; set; }

        /// <summary>經度</summary>
        [Column("longitude")]
        public string? Longitude { get; set; }

        /// <summary>緯度</summary>
        [Column("latitude")]
        public string? Latitude { get; set; }
    }
}
