// modules/uiManager.js - UI管理模組
export class UIManager {
    constructor() {
        this.loadingSelector = '.loadingSpinner';
    }

    /**
     * 初始化載入狀態
     */
    initLoadingState() {
        this.hideLoading();
    }

    /**
     * 顯示載入動畫 - 保持原有功能
     */
    showLoading() {
        $(this.loadingSelector).show();
    }

    /**
     * 隱藏載入動畫 - 保持原有功能
     */
    hideLoading() {
        $(this.loadingSelector).hide();
    }

    /**
     * 顯示容器
     */
    showContainer(selector) {
        $(selector).removeClass("d-none").show();
    }

    /**
     * 隱藏容器
     */
    hideContainer(selector) {
        $(selector).addClass("d-none").hide();
    }

    /**
     * 清空容器內容
     */
    clearContainer(selector) {
        $(selector).empty();
    }

    /**
     * 生成區域容器 - 統一版本
     */
    generateAreaContainer_unified(name, mapdataPoints, associated_fields = []) {
        const $container = $(`
            <div class="areaContainer">
                <div class="card-header bg-primary text-white">
                    <strong class="layerName">${name}</strong>
                </div>
                <table class="table table-bordered table-sm">
                    <thead class="table-primary">
                        <tr>
                            <th>Index</th>
                            <th>緯度</th>
                            <th>經度</th>
                            <th style="width: 450px;">資訊</th>
                        </tr>
                    </thead>
                    <tbody class="mapdataPointBody"></tbody>
                </table>
            </div>
        `);

        const $tbody = $container.find(".mapdataPointBody");
        
        mapdataPoints.forEach(point => {
            let infoHtml = '';
            const props = point.Property ? JSON.parse(point.Property) : {};
            
            for (const key in props) {
                // 跳過關聯欄位的顯示（如果需要的話）
                if (associated_fields.includes(key)) {
                    continue;
                }
                infoHtml += `<b>${key}</b>: ${props[key]}<br>`;
            }

            const $tr = $(`
                <tr>
                    <td>${point.Index}</td>
                    <td>${point.Latitude.toFixed(6)}</td>
                    <td>${point.Longitude.toFixed(6)}</td>
                    <td>${infoHtml}</td>
                </tr>
            `);
            $tbody.append($tr);
        });

        return $container;
    }

    /**
     * 更新元素內容
     */
    updateContent(selector, content) {
        $(selector).html(content);
    }

    /**
     * 更新元素文字
     */
    updateText(selector, text) {
        $(selector).text(text);
    }

    /**
     * 添加內容到容器
     */
    appendContent(selector, content) {
        $(selector).append(content);
    }

    /**
     * 設定元素屬性
     */
    setAttribute(selector, attribute, value) {
        $(selector).attr(attribute, value);
    }

    /**
     * 移除元素屬性
     */
    removeAttribute(selector, attribute) {
        $(selector).removeAttr(attribute);
    }

    /**
     * 添加 CSS 類別
     */
    addClass(selector, className) {
        $(selector).addClass(className);
    }

    /**
     * 移除 CSS 類別
     */
    removeClass(selector, className) {
        $(selector).removeClass(className);
    }

    /**
     * 切換 CSS 類別
     */
    toggleClass(selector, className) {
        $(selector).toggleClass(className);
    }

    /**
     * 顯示警告訊息
     */
    showAlert(message, type = 'info') {
        // 可以擴展為更美觀的通知系統
        alert(message);
    }

    /**
     * 顯示確認對話框
     */
    showConfirm(message) {
        return confirm(message);
    }

    /**
     * 截斷檔案名稱
     */
    truncateFileName(fileName, maxLength) {
        if (fileName.length <= maxLength) {
            return fileName;
        }
        
        const extension = fileName.split('.').pop();
        const nameWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.'));
        const truncatedName = nameWithoutExtension.substring(0, maxLength - extension.length - 4) + '...';
        
        return truncatedName + '.' + extension;
    }

    /**
     * 創建進度條
     */
    createProgressBar(containerId, initialValue = 0) {
        const progressHtml = `
            <div class="progress" style="height: 20px;">
                <div class="progress-bar" role="progressbar" 
                     style="width: ${initialValue}%" 
                     aria-valuenow="${initialValue}" 
                     aria-valuemin="0" 
                     aria-valuemax="100">
                    ${initialValue}%
                </div>
            </div>
        `;
        
        $(`#${containerId}`).html(progressHtml);
    }

    /**
     * 更新進度條
     */
    updateProgressBar(containerId, value) {
        const $progressBar = $(`#${containerId} .progress-bar`);
        $progressBar.css('width', value + '%');
        $progressBar.attr('aria-valuenow', value);
        $progressBar.text(value + '%');
    }

    /**
     * 初始化工具提示
     */
    initializeTooltips() {
        if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });
        }
    }

    /**
     * 取得查詢參數
     */
    getQueryParam(key) {
        const query = window.location.search.substring(1);
        const vars = query.split("&");
        
        for (let i = 0; i < vars.length; i++) {
            const pair = vars[i].split("=");
            if (decodeURIComponent(pair[0]) === key) {
                return decodeURIComponent(pair[1]);
            }
        }
        return null;
    }
}