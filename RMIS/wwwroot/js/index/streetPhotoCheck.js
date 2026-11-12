/**
 * 新增 / 編輯專案送出前的街景照片檢查（後端 StreetPhotoValidator 有相同規則）：
 * - 每筆照片都要有圖檔（新選的檔案，或編輯時既有的照片）
 * - 緯經度必須是有效數字，且不可為 0
 * @param {Array<{Photo?: File|null, PhotoName?: string, existingUrl?: string}>} photoList
 * @param {(index: number) => {lat: string, lng: string}} getCoord - 取得第 index 筆畫面上的緯經度輸入值
 * @returns {string|null} 有問題時回傳提示訊息（逐筆列出），否則回傳 null
 */
export function checkStreetPhotos(photoList, getCoord) {
    const problems = [];

    (photoList || []).forEach((item, index) => {
        const issues = [];
        // 既有照片需有實際檔名（舊資料可能存成「專案編號/」而沒有檔名）
        const hasExisting = !!item.existingUrl && !!item.PhotoName;
        if (!item.Photo && !hasExisting) {
            issues.push('尚未選擇圖檔');
        }

        const { lat, lng } = getCoord(index);
        const latNum = Number(lat);
        const lngNum = Number(lng);
        const validLat = String(lat ?? '').trim() !== '' && isFinite(latNum) && latNum !== 0 && Math.abs(latNum) <= 90;
        const validLng = String(lng ?? '').trim() !== '' && isFinite(lngNum) && lngNum !== 0 && Math.abs(lngNum) <= 180;
        if (!validLat || !validLng) {
            issues.push('緯經度未填寫或格式不正確');
        }

        if (issues.length) problems.push(`照片 ${index + 1}：${issues.join('、')}`);
    });

    return problems.length
        ? `街景照片資料不完整，請補齊或刪除該筆後再送出：\n${problems.join('\n')}`
        : null;
}
