using RMIS.Models.Auth;

namespace RMIS.Models.Account
{
    public class CreateUser
    {
        public string Name { get; set; }
        public string Password { get; set; }
        public string Phone { get; set; }
        public string Email { get; set; }
    }
}
