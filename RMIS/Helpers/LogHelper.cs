namespace RMIS.Helpers
{
    public static class LogHelper
    {
        public static void LogOperation(
            this ILogger logger,
            string operation,
            bool isSuccess,
            string reason = "",
            string userId = null,
            string ipAddress = null,
            Exception exception = null)
        {
            var status = isSuccess ? "Success" : "Failed";

            // 如果有提供 userId 或 ipAddress，加入到日誌屬性中
            if (!string.IsNullOrEmpty(userId) || !string.IsNullOrEmpty(ipAddress))
            {
                if (exception != null)
                {
                    logger.LogError(exception,
                        "Operation: {Operation}, Status: {Status}, UserId: {UserId}, IP: {IP}, Reason: {Reason}",
                        operation, status, userId ?? "Unknown", ipAddress ?? "Unknown", reason);
                }
                else if (isSuccess)
                {
                    logger.LogInformation(
                        "Operation: {Operation}, Status: {Status}, UserId: {UserId}, IP: {IP}, Reason: {Reason}",
                        operation, status, userId ?? "Unknown", ipAddress ?? "Unknown", reason);
                }
                else
                {
                    logger.LogWarning(
                        "Operation: {Operation}, Status: {Status}, UserId: {UserId}, IP: {IP}, Reason: {Reason}",
                        operation, status, userId ?? "Unknown", ipAddress ?? "Unknown", reason);
                }
            }
            else
            {
                // 沒有提供 userId 或 ipAddress 時，使用原本的格式
                if (exception != null)
                {
                    logger.LogError(exception,
                        "Operation: {Operation}, Status: {Status}, Reason: {Reason}",
                        operation, status, reason);
                }
                else if (isSuccess)
                {
                    logger.LogInformation(
                        "Operation: {Operation}, Status: {Status}, Reason: {Reason}",
                        operation, status, reason);
                }
                else
                {
                    logger.LogWarning(
                        "Operation: {Operation}, Status: {Status}, Reason: {Reason}",
                        operation, status, reason);
                }
            }
        }
    }
}
