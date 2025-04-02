using RMIS.Models.Portal;

namespace RMIS.Repositories
{
    public interface PortalInterface
    {
        Task<(bool Success, string Message)> RegisterAsync(RegisterVIew registerUser);
        Task<Dictionary<string, object>> RegisterSelectListAsync();
    }
}
