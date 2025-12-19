using RMIS.Models.Portal;

namespace RMIS.Repositories
{
    public interface PortalInterface
    {
        Task<(bool Success, string Message)> RegisterAsync(RegisterView registerUser);
        Task<Dictionary<string, object>> RegisterSelectListAsync();
        Task<(bool Success, string Token, string Message)> GenerateResetPasswordTokenAsync(string account);
    }
}
