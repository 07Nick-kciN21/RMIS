using Microsoft.AspNetCore.Http;

namespace RMIS.Middleware
{
    /// <summary>
    /// 上傳大小檢查：請求總大小超過 UploadLimits:MaxRequestBodyMB 時，
    /// 直接回傳 413 與明確的 JSON 錯誤訊息（不讀取請求內容），
    /// 取代伺服器預設的錯誤頁或前端看不懂的解析錯誤。
    /// </summary>
    public class RequestSizeLimitMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<RequestSizeLimitMiddleware> _logger;
        private readonly int _maxMB;
        private readonly long _maxBytes;

        public RequestSizeLimitMiddleware(RequestDelegate next, IConfiguration configuration, ILogger<RequestSizeLimitMiddleware> logger)
        {
            _next = next;
            _logger = logger;
            _maxMB = configuration.GetValue<int?>("UploadLimits:MaxRequestBodyMB") ?? 100;
            _maxBytes = _maxMB * 1024L * 1024L;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var contentLength = context.Request.ContentLength;

            // 有 Content-Length（瀏覽器上傳皆有）：超過上限直接拒絕
            if (contentLength.HasValue && contentLength.Value > _maxBytes)
            {
                await WriteTooLargeAsync(context, contentLength);
                return;
            }

            try
            {
                await _next(context);
            }
            catch (Exception ex) when (IsTooLarge(ex) && !context.Response.HasStarted)
            {
                // 無 Content-Length（chunked）時，由伺服器讀取到超過上限才丟出例外
                await WriteTooLargeAsync(context, contentLength);
            }
        }

        private static bool IsTooLarge(Exception? ex)
        {
            for (var e = ex; e != null; e = e.InnerException)
            {
                if (e is BadHttpRequestException bad && bad.StatusCode == StatusCodes.Status413PayloadTooLarge)
                    return true;
                if (e is InvalidDataException && e.Message.Contains("length limit", StringComparison.OrdinalIgnoreCase))
                    return true;
            }
            return false;
        }

        private async Task WriteTooLargeAsync(HttpContext context, long? contentLength)
        {
            var sizeText = contentLength.HasValue ? $"（本次約 {contentLength.Value / 1024d / 1024d:0.#} MB）" : "";
            var message = $"上傳檔案總大小超過上限 {_maxMB} MB{sizeText}，請減少檔案數量或壓縮後再試";

            _logger.LogWarning("上傳大小超過上限: {Path} {Size} bytes, 使用者 {User}",
                context.Request.Path, contentLength, context.User.Identity?.Name);

            context.Response.Clear();
            context.Response.StatusCode = StatusCodes.Status413PayloadTooLarge;
            // 拒絕後關閉連線，避免伺服器繼續接收剩餘的大量資料
            context.Response.Headers.Connection = "close";
            await context.Response.WriteAsJsonAsync(new { success = false, code = "PAYLOAD_TOO_LARGE", message });
        }
    }
}
