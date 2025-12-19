using RMIS.Validation;
using System.ComponentModel.DataAnnotations;

namespace RMIS.Models.Portal
{
    public class LoginView
    {
        [Required(ErrorMessage = "請輸入帳號")]
        public string UserName { get; set; }

        [Required(ErrorMessage = "請輸入密碼")]
        [DataType(DataType.Password)]
        public string Password { get; set; }
    }
    public class RegisterView
    {
        [Required(ErrorMessage = "使用者名稱是必填欄位")]
        [StringLength(20, MinimumLength = 2, ErrorMessage = "使用者名稱長度不合規定(2~20)")]
        [RegularExpression(@"^[\u4e00-\u9fa5a-zA-Z0-9_]+$", ErrorMessage = "只能包含中文、英文、數字及底線")]
        public string DisplayName { get; set; }

        [Required(ErrorMessage = "帳號是必填欄位")]
        [StringLength(20, MinimumLength = 6, ErrorMessage = "帳號長度不合規定(6~20)")]
        [RegularExpression(@"^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,20}$",
            ErrorMessage = "帳號必須包含至少 1 個英文字母和 1 個數字，長度 6~20 位")]
        public string Account { get; set; }

        [Required(ErrorMessage = "密碼是必填欄位")]
        [StringLength(20, MinimumLength = 6, ErrorMessage = "密碼長度不合規定(6~20)")]
        [PasswordNotSameAsAccount("Account", ErrorMessage = "密碼不能與帳號相同")]
        [RegularExpression(@"^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,20}$",
            ErrorMessage = "密碼必須包含至少 1 個英文字母和 1 個數字，長度 6~20 位")]
        public string Password { get; set; }

        public int DepartmentId { get; set; }

        public string RoleId { get; set; }

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
