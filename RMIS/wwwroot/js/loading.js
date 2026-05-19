/**
 * Loading overlay module
 * 顯示/隱藏載入遮罩，支援針對特定容器或全頁遮擋。
 *
 * 用法：
 *   import { showLoading, hideLoading } from '../loading.js';
 *
 *   showLoading('查詢中...', '#left-box');   // 遮擋特定容器
 *   showLoading();                           // 全頁遮擋
 *   hideLoading('#left-box');
 *   hideLoading();
 *
 * CSS 依賴：loading.css（需確保已在頁面載入）
 */

/**
 * 顯示 loading 遮罩
 * @param {string} [text='載入中...'] - 提示文字
 * @param {string|HTMLElement|null} [container=null] - 目標容器（selector 或 element），null 為全頁
 */
export function showLoading(text = '載入中...', container = null) {
    const target = typeof container === 'string'
        ? document.querySelector(container)
        : container;

    if (target) {
        let overlay = target.querySelector(':scope > .loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'loading-overlay loading-local';
            overlay.innerHTML = '<div class="spinner"></div><span class="loading-text"></span>';
            if (getComputedStyle(target).position === 'static') {
                target.style.position = 'relative';
            }
            target.appendChild(overlay);
        }
        overlay.querySelector('.loading-text').textContent = text;
        overlay.classList.remove('hidden');
    } else {
        const overlay = document.getElementById('loadingOverlay');
        if (!overlay) return;
        overlay.querySelector('.loading-text').textContent = text;
        overlay.classList.remove('hidden');
    }
}

/**
 * 隱藏 loading 遮罩
 * @param {string|HTMLElement|null} [container=null] - 目標容器（selector 或 element），null 為全頁
 */
export function hideLoading(container = null) {
    const target = typeof container === 'string'
        ? document.querySelector(container)
        : container;

    if (target) {
        const overlay = target.querySelector(':scope > .loading-overlay');
        if (overlay) overlay.classList.add('hidden');
    } else {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.add('hidden');
    }
}
