/**
 * 上傳大小限制與錯誤訊息共用模組
 * MAX_UPLOAD_MB 需與 appsettings.json 的 UploadLimits:MaxRequestBodyMB（單次請求總大小）一致
 * MAX_FILE_MB   需與 appsettings.json 的 UploadLimits:MaxFileMB（歷程佐證文件、備註附件的單一檔案大小）一致
 * MAX_SUPPLEMENT_IMAGE_MB 需與 appsettings.json 的 UploadLimits:SupplementImageMB（補充格式附圖，壓縮後）一致
 */
export const MAX_UPLOAD_MB = 100;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
export const MAX_FILE_MB = 20;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
export const MAX_SUPPLEMENT_IMAGE_MB = 5;
export const MAX_SUPPLEMENT_IMAGE_BYTES = MAX_SUPPLEMENT_IMAGE_MB * 1024 * 1024;
// 補充格式附圖「原檔」大小上限（壓縮前，僅前端檢查；原檔不會送到後端）
export const MAX_SUPPLEMENT_SOURCE_MB = 20;
export const MAX_SUPPLEMENT_SOURCE_BYTES = MAX_SUPPLEMENT_SOURCE_MB * 1024 * 1024;

const formatMB = bytes => (bytes / 1024 / 1024).toFixed(1);

/**
 * 檢查單一檔案大小
 * @param {Array<File|null|undefined>} files
 * @returns {string|null} 有檔案超過上限時回傳錯誤訊息（列出檔名），否則回傳 null
 */
export function checkFileSizes(files) {
    const oversized = (files || []).filter(f => f && f.size > MAX_FILE_BYTES);
    if (oversized.length === 0) return null;
    const list = oversized.map(f => `${f.name}（${formatMB(f.size)} MB）`).join('\n');
    return `以下檔案超過單一檔案大小上限 ${MAX_FILE_MB} MB：\n${list}`;
}

/**
 * 檔案總大小超過上限時的訊息
 * @param {number} [totalBytes] - 本次總大小（可省略）
 */
export function oversizeMessage(totalBytes) {
    const sizeText = totalBytes ? `（本次約 ${formatMB(totalBytes)} MB）` : '';
    return `上傳檔案總大小超過上限 ${MAX_UPLOAD_MB} MB${sizeText}，請減少檔案數量或壓縮後再試`;
}

/**
 * 送出前檢查檔案總大小
 * @param {Array<File|Blob|null|undefined>} files
 * @param {number} [extraBytes] - 其他內容的大小（例如 Base64 圖片字串長度）
 * @returns {string|null} 超過上限時回傳錯誤訊息，否則回傳 null
 */
export function checkUploadSize(files, extraBytes = 0) {
    const total = (files || []).reduce((sum, f) => sum + (f?.size || 0), 0) + extraBytes;
    return total > MAX_UPLOAD_BYTES ? oversizeMessage(total) : null;
}

/**
 * 解析失敗回應的錯誤內容，統一處理：
 * - 413（應用程式回傳的 JSON，或 IIS / 伺服器的錯誤頁）→ 檔案過大訊息
 * - IIS 請求過濾 404.13 錯誤頁 → 檔案過大訊息
 * - JSON 回應 → 保留原欄位（message、code…）
 * @param {Response} response
 * @param {string} [fallback] - 無法解析時的預設訊息
 * @returns {Promise<{message: string, code?: string}>}
 */
export async function readErrorResponse(response, fallback) {
    let text = '';
    try { text = await response.text(); } catch { /* 忽略 */ }

    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* 非 JSON（例如伺服器錯誤頁） */ }

    if (response.status === 413) {
        return { ...(json || {}), message: json?.message || oversizeMessage() };
    }
    if (response.status === 404 && text.includes('404.13')) {
        return { message: oversizeMessage() };
    }
    if (json && typeof json === 'object') {
        return { ...json, message: json.message || fallback || `伺服器回應異常（${response.status}）` };
    }
    return { message: fallback || `伺服器回應異常（${response.status}）` };
}

/**
 * 取得失敗回應的錯誤訊息（readErrorResponse 的簡化版）
 * @param {Response} response
 * @param {string} [fallback]
 * @returns {Promise<string>}
 */
export async function getErrorMessage(response, fallback) {
    return (await readErrorResponse(response, fallback)).message;
}
