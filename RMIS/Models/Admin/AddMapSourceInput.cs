namespace RMIS.Models.Admin
{
    public class AddMapSourceInput
    {
        public string Url { get; set; }
        public string LayerName { get; set; }
        public string Type { get; set; }
        public string ImageFormat { get; set; }
        public string Attribution { get; set; }
    }
}
