namespace RMIS.Models.sql
{
    public class Point
    {
        public int Id { get; set; }
        public int Index { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string? Property { get; set; }
        public int AreaId { get; set; }
        public Area Area { get; set; }
        public NetTopologySuite.Geometries.Point? GeoLocation { get; set; }

    }
}
