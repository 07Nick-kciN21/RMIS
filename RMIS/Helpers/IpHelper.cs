namespace RMIS.Helpers
{
    public static class IpHelper
    {
        public static string GetClientIpAddress(this HttpContext httpContext)
        {
            if (httpContext == null)
                return "Unknown";

            // 1. 檢查 X-Forwarded-For header（反向代理最常用）
            var forwardedFor = httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
            if (!string.IsNullOrEmpty(forwardedFor))
            {
                // X-Forwarded-For 可能包含多個 IP，取第一個（客戶端真實 IP）
                var ips = forwardedFor.Split(',', StringSplitOptions.RemoveEmptyEntries);
                if (ips.Length > 0)
                {
                    return ips[0].Trim();
                }
            }

            // 2. 檢查 X-Real-IP header（Nginx 常用）
            var realIp = httpContext.Request.Headers["X-Real-IP"].FirstOrDefault();
            if (!string.IsNullOrEmpty(realIp))
            {
                return realIp.Trim();
            }

            // 3. 檢查 CF-Connecting-IP（Cloudflare）
            var cfIp = httpContext.Request.Headers["CF-Connecting-IP"].FirstOrDefault();
            if (!string.IsNullOrEmpty(cfIp))
            {
                return cfIp.Trim();
            }

            // 4. 使用 RemoteIpAddress（直接連線）
            var remoteIp = httpContext.Connection.RemoteIpAddress;
            if (remoteIp != null)
            {
                // 處理 IPv6 本地地址
                if (remoteIp.ToString() == "::1")
                    return "127.0.0.1";

                // 移除 IPv6 映射的 IPv4 前綴
                if (remoteIp.IsIPv4MappedToIPv6)
                    return remoteIp.MapToIPv4().ToString();

                return remoteIp.ToString();
            }

            return "Unknown";
        }
    }
}
