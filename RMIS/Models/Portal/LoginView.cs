using System.ComponentModel.DataAnnotations;

namespace RMIS.Models.Portal
{
    public class LoginView
    {
        [Required]
        public string UserName { get; set; }

        [Required]
        [DataType(DataType.Password)]
        public string Password { get; set; }
    }
}
