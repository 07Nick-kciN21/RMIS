namespace RMIS.Models.Admin
{
    public class CSVFormat
    {
        public string road_name { get; set; }
        public string road_city { get; set; }
        public string road_dist { get; set; }
        public string pile_data { get; set; }
    }
    public class pile
    {
        public double pile_lat { get; set; }
        public double pile_lon { get; set; }
        public int pile_distance { get; set; }
        public int pile_dir { get; set; }
        public string pile_prop { get; set; }
    }
}
