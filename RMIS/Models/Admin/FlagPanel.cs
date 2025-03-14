namespace RMIS.Models.Admin
{
    public class FlagPanelInput
    {
        public List<pipelineItem> FlaggedPipelines { get; set; }
    }
    public class pipelineItem
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
    }
}
