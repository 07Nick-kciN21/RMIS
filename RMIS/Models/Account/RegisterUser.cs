using RMIS.Models.Auth;
using System.ComponentModel.DataAnnotations;

namespace RMIS.Models.Account
{
    public class RegisterUser
    {
        [Required(ErrorMessage = "帳號是必填欄位")]
        [StringLength(20, MinimumLength = 6, ErrorMessage = "帳號長度不合規定(6~20)")]
        public string Username { get; set; }

        [Required(ErrorMessage = "帳號是必填欄位")]
        [StringLength(20, MinimumLength = 6, ErrorMessage = "帳號長度不合規定(6~20)")]
        [RegularExpression(@"^[a-zA-Z0-9_]+$", ErrorMessage = "使用者名稱只能包含英文字母、數字和底線")]
        public string Account { get; set; }

        [Required(ErrorMessage = "密碼是必填欄位")]
        [DataType(DataType.Password)]
        [StringLength(20, MinimumLength = 6, ErrorMessage = "密碼長度不合規定(6~20)")]
        [RegularExpression(@"^[a-zA-Z0-9_]+$", ErrorMessage = "使用者名稱只能包含英文字母、數字和底線")]
        public string Password { get; set; }

        [Required(ErrorMessage = "請再次輸入密碼")]
        [DataType(DataType.Password)]
        [Compare("Password", ErrorMessage = "確認密碼與密碼不匹配")]
        public string ConfirmPassword { get; set; }

        [Required(ErrorMessage = "Email 是必填欄位")]
        [DataType(DataType.EmailAddress)]
        [EmailAddress(ErrorMessage = "請輸入有效的 Email 地址")]
        public string Email { get; set; }

        [Required(ErrorMessage = "電話號碼是必填欄位")]
        [DataType(DataType.PhoneNumber)]
        [RegularExpression(@"^09\d{8}$", ErrorMessage = "請輸入有效的台灣手機號碼 (09xxxxxxxx)")]
        public string Phone { get; set; }
    }
}
