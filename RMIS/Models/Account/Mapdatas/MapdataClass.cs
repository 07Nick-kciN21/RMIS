namespace RMIS.Models.Account.Mapdatas
{
    public class MapdataManager
    {
        public List<PipelineData> PipelineDatas { get; set; }
    }

    public class PipelineData
    {
        public Guid Id { get; set; }
        public string? Category { get; set; }
        public string Name { get; set; }
        public bool Status { get; set; }
    }

    public class MapdataLayer
    {      
        public string Name { get; set; }
        public string Kind { get; set; }
        public string Svg { get; set; }
        public List<MapdataArea> Areas { get; set; }
    }

    public class MapdataArea
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
    }

    public class MapdataPoint
    {
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public int Index { get; set; }
        public string? Property { get; set; }
    }
}
