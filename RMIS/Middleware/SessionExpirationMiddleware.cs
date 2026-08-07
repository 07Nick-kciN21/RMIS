using Microsoft.AspNetCore.Http;

namespace RMIS.Middleware
{
    /// <summary>
    /// 檢查 LoginExpireTime Cookie，若過期則清除認證 Cookie 並重導向至登入頁
    /// 避免頁面先顯示再跳轉的情況
    /// </summary>
    public class SessionExpirationMiddleware
    {
        private readonly RequestDelegate _next;

        // 不需要檢查的路徑
        private static readonly string[] ExcludedPaths = new[]
        {
            "/portal",
            "/css",
            "/js",
            "/img",
            "/lib",
            "/svg",
            "/favicon.ico"
        };

        public SessionExpirationMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var path = context.Request.Path.ToString().ToLower();

            // 檢查是否為排除的路徑
            bool isExcluded = ExcludedPaths.Any(p => path.StartsWith(p));

            if (!isExcluded && context.User.Identity?.IsAuthenticated == true)
            {
                // 檢查 LoginExpireTime Cookie
                if (context.Request.Cookies.TryGetValue("LoginExpireTime", out string? expireTimeStr))
                {
                    if (DateTime.TryParse(expireTimeStr, out DateTime expireTime))
                    {
                        // 如果已過期
                        if (expireTime <= DateTime.UtcNow)
                        {
                            // 清除 LoginExpireTime Cookie
                            context.Response.Cookies.Delete("LoginExpireTime");

                            // 清除 ASP.NET Identity 認證 Cookie
                            context.Response.Cookies.Delete(".AspNetCore.Identity.Application");

                            // 重導向至登入頁
                            context.Response.Redirect("/Portal/Login");
                            return;
                        }
                    }
                }
                else
                {
                    // 如果沒有 LoginExpireTime Cookie 但已認證，也清除並重導向
                    // 這種情況可能是 Cookie 被手動刪除但 Identity Cookie 還存在
                    context.Response.Cookies.Delete(".AspNetCore.Identity.Application");
                    context.Response.Redirect("/Portal/Login");
                    return;
                }
            }

            await _next(context);
        }
    }
}
