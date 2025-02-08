using System.ComponentModel.DataAnnotations;

namespace RMIS.Models.Account
{
    public class RegisterViewModel
    {
        [Required]
        [Display(Name = "使用者名稱")]
        public string Username { get; set; }

        [Required]
        [EmailAddress]
        [Display(Name = "電子郵件")]
        public string Email { get; set; }

        [Required]
        [DataType(DataType.Password)]
        [Display(Name = "密碼")]
        public string Password { get; set; }

        [Required]
        [DataType(DataType.Password)]
        [Display(Name = "確認密碼")]
        [Compare("Password", ErrorMessage = "密碼與確認密碼不匹配")]
        public string ConfirmPassword { get; set; }
    }
}
