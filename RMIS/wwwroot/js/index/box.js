/**
 * Box 管理模組
 */
const BoxManager = {
    // 顯示外層容器並切換分頁
    openLeftBoxPage: function(pageId, title) {
        $('#left-box').removeClass('hidden');
        
        // 隱藏所有分頁並顯示目標分頁
        $('#left-box .box-page').addClass('hidden');
        const $targetPage = $(`#${pageId}`);
        
        if ($targetPage.length > 0) {
            $targetPage.removeClass('hidden');
        } else {
            console.error(`找不到分頁 ID: ${pageId}`);
        }
        
        // 更新標題
        if (title) {
            $('#left-box-title').text(title);
        }
    },

    // 顯示 Right Box 並切換分頁
    openRightBoxPage: function(pageId, title) {
        $('#right-box').removeClass('hidden');
        
        // 隱藏所有分頁並顯示目標分頁
        $('#right-box .box-page').addClass('hidden');
        const $targetPage = $(`#${pageId}`);
        
        if ($targetPage.length > 0) {
            $targetPage.removeClass('hidden');
        } else {
            console.error(`找不到分頁 ID: ${pageId}`);
        }
        
        // 更新標題
        if (title) {
            $('#right-box-title').text(title);
        }
    },

    // 顯示 Full Box
    openFullBox: function(title, content) {
        $('#full-box').removeClass('hidden');
        
        // 更新標題
        if (title) {
            $('#full-box-title').text(title);
        }
        
        // 更新內容
        if (content) {
            $('#full-box .box-content').html(content);
        }
    },

    // 關閉容器
    closeBox: function(boxId) {
        $(`#${boxId}`).addClass('hidden');
    },

    /**
     * 初始化 Left Box 功能
     * 只負責初始化容器和事件隔離，不綁定特定按鈕
     * 使用 openLeftBoxPage() 方法來開啟
     */
    initLeftBox: function() {
        const boxElement = document.getElementById('left-box');

        if (!boxElement) {
            console.warn('找不到 left-box 元素');
            return;
        }

        if (typeof L !== 'undefined' && L.DomEvent) {
            // 1. 隔絕點擊、雙擊與拖拽冒泡
            L.DomEvent.disableClickPropagation(boxElement);
            
            // 2. 隔絕滾輪縮放冒泡
            L.DomEvent.disableScrollPropagation(boxElement);
        }
        
        const self = this;
        console.log('初始化 Left Box 功能');

        // 綁定關閉按鈕
        $('#left-box .btn-close-box').off('click').on('click', function() {
            self.closeBox('left-box');
        });
    },

    /**
     * 初始化 Right Box 功能
     */
    initRightBox: function() {
        const boxElement = document.getElementById('right-box');

        if (!boxElement) {
            console.warn('找不到 right-box 元素');
            return;
        }

        if (typeof L !== 'undefined' && L.DomEvent) {
            L.DomEvent.disableClickPropagation(boxElement);
            L.DomEvent.disableScrollPropagation(boxElement);
        }
        
        const self = this;
        console.log('初始化 Right Box 功能');

        // 綁定關閉按鈕
        $('#right-box .btn-close-box').off('click').on('click', function() {
            self.closeBox('right-box');
        });
    },

    /**
     * 初始化 Full Box 功能
     * 只負責初始化容器和事件隔離，不綁定特定按鈕
     * 使用 openFullBox() 方法來開啟
     */
    initFullBox: function() {
        const boxElement = document.getElementById('full-box');

        if (!boxElement) {
            console.warn('找不到 full-box 元素');
            return;
        }

        if (typeof L !== 'undefined' && L.DomEvent) {
            // 1. 隔絕點擊、雙擊與拖拽冒泡
            L.DomEvent.disableClickPropagation(boxElement);
            
            // 2. 隔絕滾輪縮放冒泡
            L.DomEvent.disableScrollPropagation(boxElement);
        }
        
        const self = this;
        console.log('初始化 Full Box 功能');

        // 綁定關閉按鈕
        $('#full-box .btn-close-box').off('click').on('click', function() {
            self.closeBox('full-box');
        });
    }
};

// 導出供外部使用
export default BoxManager;