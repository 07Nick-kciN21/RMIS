/**
 * LayerMenuController.js - 圖層選單控制器
 * 管理業務圖層樹狀選單的顯示和互動
 * 
 * 整合原本的 menu.js 功能
 */

class LayerMenuController {
    constructor(appCore, layerManager, layerBarController) {
        this._appCore = appCore;
        this._layerManager = layerManager;
        this._layerBarController = layerBarController;
        this._apiBaseUrl = appCore.environment.url.apiBaseUrl || '/api/MapAP';
        this._menuContainer = $('#imageDataContent');
    }
    
    /**
     * 初始化選單
     */
    async init() {
        try {
            // 從後端獲取選單結構
            const data = await this._fetchMenuData();
            
            // 生成選單 HTML
            const menuHtml = this._generateMenu(data.menuData, "", 0);
            this._menuContainer.html(menuHtml);
            
            // 綁定事件
            this._bindMenuEvents();
            
            console.log('LayerMenuController initialized');
        } catch (error) {
            console.error('Failed to initialize menu:', error);
        }
    }
    
    /**
     * 從後端獲取選單資料
     * @private
     */
    _fetchMenuData() {
        return $.ajax({
            url: "/Home/BuildTreeData",
            type: "GET"
        });
    }
    
    /**
     * 遞迴生成選單 HTML
     * @private
     * @param {Array} data - 選單資料
     * @param {string} parentName - 父層名稱
     * @param {number} level - 層級深度
     * @returns {string} HTML 字串
     */
    _generateMenu(data, parentName, level) {
        let html = '<ul';
        
        // 設定 class
        if (level > 0) {
            html += ' class="menu-sub"';
        } else {
            html += ' id="imageDataMenu" class="menu-background"';
        }
        html += '>';
        
        // 遍歷每個項目
        data.forEach(item => {
            // 決定 li 的 class
            let liClass;
            if (level === 0) {
                liClass = 'menu-head';
            } else {
                liClass = item.tag === "node" ? 'menu-sublayer' : 'menu-layer';
            }
            
            // 決定 li 的 id
            const liId = item.tag === "node" ? '' : ` id="${item.id}"`;
            
            html += `<li class="${liClass}" ${liId}>`;
            
            // 決定標題標籤
            const headingTag = level === 0 ? 'h4' : 'span';
            const headingClass = level === 0 ? 'menu-title' : 'text-secondary';
            
            if (item.tag === "node") {
                // 節點（可展開/收合）
                html += `
                    <div class="menu-node">
                        <span class="menu-icon menu-close" id="menu-${item.id}"></span>
                        <${headingTag} class="${headingClass}">
                            ${item.text}
                        </${headingTag}>
                    </div>`;
            } else {
                // 圖層（可開關）
                html += `
                    <div class="switch switch-off" id="switch-${item.id}"></div>
                    <${headingTag} class="${headingClass}">
                        ${item.text}
                    </${headingTag}>`;
            }
            
            // 遞迴處理子項目
            if (item.children && item.children.length > 0) {
                html += this._generateMenu(item.children, item.text, level + 1);
            }
            
            html += `</li>`;
        });
        
        html += '</ul>';
        return html;
    }
    
    /**
     * 綁定選單事件
     * @private
     */
    _bindMenuEvents() {
        console.log("Bind Menu Events");
        // ====================================================================
        // 選單按鈕控制
        // ====================================================================
        this._initMenuToggleButtons();
        
        // ====================================================================
        // 節點展開/收合
        // ====================================================================
        $('.menu-node').on('click', function(e) {
            e.stopPropagation();
            
            // 切換子選單顯示
            $(this).next('.menu-sub').slideToggle();
            
            // 切換圖示
            const $icon = $(this).children('span');
            if ($icon.hasClass('menu-close')) {
                $icon.removeClass('menu-close').addClass('menu-open');
            } else {
                $icon.removeClass('menu-open').addClass('menu-close');
            }
        });
        
        // ====================================================================
        // 圖層開關
        // ====================================================================
        $('.menu-layer').on('click', async (e) => {
            e.stopPropagation();
            
            const $item = $(e.currentTarget);
            const id = $item.attr('id');
            const name = $item.children('span').text();
            const $switch = $item.children('.switch');
            
            console.log(`Toggle layer ${id}: ${name}`);
            
            // 判斷當前狀態
            const isOn = $switch.hasClass('switch-on');
            
            if (isOn) {
                // 關閉圖層
                await this._removeLayer(id, $switch);
            } else {
                // 開啟圖層
                await this._addLayer(id, name, $switch);
            }
        });
    }
    
    /**
     * 初始化選單切換按鈕
     * @private
     */
    _initMenuToggleButtons() {
        // 觀察器初始化
        ['imageDataBtn', 'userMenuBtn'].forEach(buttonId => {
            const $button = $(`#${buttonId}`);
            const targetId = $button.data('target');
            const $target = $(`#${targetId}`);
            if ($target.length) {
                this._observeDisplayChanges($button, $target);
            }
        });
        
        // 圖資選單按鈕
        $('#imageDataBtn').on('click', (e) => {
            e.stopPropagation();
            const targetId = $(e.currentTarget).data('target');
            const $target = $(`#${targetId}`);
            console.log(targetId);
            $target.toggle();
            this._updateOpenState($(e.currentTarget), $target);
        });
        
        // 使用者選單按鈕
        $('#userMenuBtn').on('click', (e) => {
            e.stopPropagation();
            const targetId = $(e.currentTarget).data('target');
            const $target = $(`#${targetId}`);
            console.log(targetId);
            $target.toggle();
            this._updateOpenState($(e.currentTarget), $target);
        });
    }
    
    /**
     * 添加圖層
     * @private
     */
    async _addLayer(id, name, $switch) {
        try {
            // 呼叫 LayerManager 添加 Pipeline
            const result = await this._layerManager.addPipeline(id, name);
            
            // 更新開關狀態
            $switch.removeClass('switch-off').addClass('switch-on');
            
            console.log(`Layer ${id} added successfully`);
        } catch (error) {
            console.error(`Failed to add layer ${id}:`, error);
            alert('圖層載入失敗，請稍後再試');
        }
    }
    
    /**
     * 移除圖層
     * @private
     */
    async _removeLayer(id, $switch) {
        try {
            // 呼叫 LayerManager 移除 Pipeline
            await this._layerManager.removePipeline(id);
            
            // 更新開關狀態
            $switch.removeClass('switch-on').addClass('switch-off');
            
            console.log(`Layer ${id} removed successfully`);
        } catch (error) {
            console.error(`Failed to remove layer ${id}:`, error);
            alert('圖層移除失敗，請稍後再試');
        }
    }
    
    /**
     * 觀察元素顯示變化
     * @private
     */
    _observeDisplayChanges($trigger, $target) {
        const observer = new MutationObserver(() => {
            this._updateOpenState($trigger, $target);
        });
        
        observer.observe($target[0], {
            attributes: true,
            attributeFilter: ['style']
        });
    }
    
    /**
     * 更新按鈕開啟狀態
     * @private
     */
    _updateOpenState($trigger, $target) {
        if ($target.is(':visible')) {
            $trigger.addClass("open");
        } else {
            $trigger.removeClass("open");
        }
    }
}

export { LayerMenuController };