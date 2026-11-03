using System.ComponentModel.DataAnnotations.Schema;

namespace RMIS.Models.sql
{
    public class AccidentAll
    {
        [Column("minguo")] public int Minguo { get; set; }
        [Column("year")] public string Year { get; set; } = string.Empty;
        [Column("date")] public string Date { get; set; } = string.Empty;
        [Column("time")] public string Time { get; set; } = string.Empty;
        [Column("accident_type")] public string AccidentType { get; set; } = string.Empty;
        [Column("area")] public string Area { get; set; } = string.Empty;
        [Column("road")] public string Road { get; set; } = string.Empty;
        [Column("section")] public string? Section { get; set; }
        [Column("lane")] public string? Lane { get; set; }
        [Column("alley")] public string? Alley { get; set; }
        [Column("intersection_road")] public string? IntersectionRoad { get; set; }
        [Column("intersection_section")] public string? IntersectionSection { get; set; }
        [Column("intersection_lane")] public string? IntersectionLane { get; set; }
        [Column("intersection_alley")] public string? IntersectionAlley { get; set; }
        [Column("road_other")] public string? RoadOther { get; set; }
        [Column("longitude")] public string? Longitude { get; set; }
        [Column("latitude")] public string? Latitude { get; set; }
    }
}
