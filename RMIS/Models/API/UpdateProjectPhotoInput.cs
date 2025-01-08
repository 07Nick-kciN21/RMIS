namespace RMIS.Models.API
{
    public class UpdateProjectPhotoInput
    {
        public IFormFile Photo { get; set; }
        public string PhotoName { get; set; }
    }
}
