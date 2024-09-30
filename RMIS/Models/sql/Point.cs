namespace RMIS.Models.sql
{
    public class Point
    {
        public Guid Id { get; set; }
        public int Index { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public Guid? AreaId { get; set; }
        public Area Area { get; set; }
        public Guid? RoadId { get; set; }
        public Road Road { get; set; }
    }
}
