using System;
using System.ComponentModel.DataAnnotations;
using System.Reflection;

namespace RMIS.Validation
{
    public class PasswordNotSameAsAccountAttribute : ValidationAttribute
    {
        private readonly string _comparisonProperty;

        public PasswordNotSameAsAccountAttribute(string comparisonProperty)
        {
            _comparisonProperty = comparisonProperty;
        }

        protected override ValidationResult IsValid(object value, ValidationContext validationContext)
        {
            var password = value as string;

            var comparisonPropertyInfo = validationContext.ObjectType.GetProperty(_comparisonProperty);
            if (comparisonPropertyInfo == null)
            {
                return new ValidationResult($"找不到屬性 {_comparisonProperty}");
            }

            var accountValue = comparisonPropertyInfo.GetValue(validationContext.ObjectInstance) as string;

            if (!string.IsNullOrEmpty(password) && password == accountValue)
            {
                return new ValidationResult(ErrorMessage ?? "密碼不能與帳號相同");
            }

            return ValidationResult.Success;
        }
    }
}
