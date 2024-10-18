namespace RMIS.Models.Admin
{
    public class CSVFormat
    {
        public int road_id { get; set; }
        public string road_name { get; set; }
        public string road_city { get; set; }
        public string road_dist { get; set; }
        public List<pile> piles { get; set; }
    }
    public class pile
    {
        public int pile_id { get; set; }
        public int road_id { get; set; }
        public double pile_lat { get; set; }
        public double pile_lon { get; set; }
        public int pile_distance { get; set; }
        public int pile_dir { get; set; }
    }
}
