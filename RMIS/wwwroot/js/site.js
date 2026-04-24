// Please see documentation at https://learn.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

// Write your JavaScript code.

/**
 * 顯示 loading
 * @param {string} text - 提示文字
 * @param {HTMLElement|string|null} container - 目標容器（element 或 selector），null 為全頁
 */
function showLoading(text = '載入中...', container = null) {
    const target = typeof container === 'string' ? document.querySelector(container) : container;

    if (target) {
        // 容器模式：動態建立並插入
        let overlay = target.querySelector(':scope > .loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'loading-overlay loading-local';
            overlay.innerHTML = '<div class="spinner"></div><span class="loading-text"></span>';
            // 確保容器可定位
            if (getComputedStyle(target).position === 'static') {
                target.style.position = 'relative';
            }
            target.appendChild(overlay);
        }
        overlay.querySelector('.loading-text').textContent = text;
        overlay.classList.remove('hidden');
    } else {
        // 全頁模式
        const overlay = document.getElementById('loadingOverlay');
        if (!overlay) return;
        overlay.querySelector('.loading-text').textContent = text;
        overlay.classList.remove('hidden');
    }
}

/**
 * 關閉 loading
 * @param {HTMLElement|string|null} container - 目標容器，null 為全頁
 */
function hideLoading(container = null) {
    const target = typeof container === 'string' ? document.querySelector(container) : container;

    if (target) {
        const overlay = target.querySelector(':scope > .loading-overlay');
        if (overlay) overlay.classList.add('hidden');
    } else {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.add('hidden');
    }
}
