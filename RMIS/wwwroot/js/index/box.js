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

    // 關閉容器
    closeBox: function(boxId) {
        $(`#${boxId}`).addClass('hidden');
    },

    /**
     * 初始化 Left Box 功能綁定
     * @param {Array} config - 包含按鈕 ID、分頁 ID 與標題的設定陣列
     */
    initLeftBox: function(config) {
        const self = this;
        console.log('初始化 Left Box 功能綁定', config);
        // 1. 綁定設定檔中的按鈕
        config.forEach(item => {
            $(`#${item.btnId}`).on('click', function() {
                console.log(`按下按鈕 ${item.btnId}，開啟分頁 ${item.pageId}`);
                self.openLeftBoxPage(item.pageId, item.title);
            });
        });

        // 2. 自動綁定所有具備 btn-close-box 類別的按鈕
        $('.btn-close-box').on('click', function() {
            const boxId = $(this).closest('.map-fixed-container').attr('id');
            self.closeBox(boxId);
        });
    }
};

// 導出供外部使用
export default BoxManager;