using RMIS.Models.Auth;

namespace RMIS.Models.Portal
{
    public class CreateUser
    {
        public string DisplayName { get; set; }
        public string Account { get; set; }
        public string Password { get; set; }
        public string Phone { get; set; }
        public string Email { get; set; }
    }
}
