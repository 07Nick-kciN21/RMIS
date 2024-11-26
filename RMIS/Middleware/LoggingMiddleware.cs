using Microsoft.AspNetCore.Http;
using Serilog.Context;

namespace RMIS.Middleware
{
    public class LoggingMiddleware
    {
        private readonly RequestDelegate _next;

        public LoggingMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // 取得 Controller 名稱
            using (LogContext.PushProperty("Controller", context.Request.Path))
            {
                await _next(context);
            }
        }
    }
}
