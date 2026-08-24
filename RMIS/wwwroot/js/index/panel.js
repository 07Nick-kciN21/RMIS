export function initPanel(panelId) {
    const $container = $("#indexMap");
    const $tb = $(`#tb-${panelId}`);
    const $panel = $(`#${panelId}`);
    const $panelHeading = $panel.find(".panelHeading");
    const $panelCloseBtn = $panel.find(".closeButton");
    let isDragging = false;
    let offsetX, offsetY;

    function handlePanelMove(e) {
        if (isDragging) {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            const containerRect = $container[0].getBoundingClientRect();
            const panelWidth = $panel[0].offsetWidth;
            const panelHeight = $panel[0].offsetHeight;

            let newLeft = clientX - offsetX - containerRect.left;
            let newTop = clientY - offsetY - containerRect.top;

            newLeft = Math.max(0, Math.min(newLeft, containerRect.width - panelWidth));
            newTop = Math.max(0, Math.min(newTop, containerRect.height - panelHeight));

            $panel.css({ left: `${newLeft}px`, top: `${newTop}px` });
        }
    }

    // Event listeners for dragging functionality
    $panelHeading.on('pointerdown', (e) => {
        isDragging = true;
        const panelRect = $panel[0].getBoundingClientRect();
        offsetX = e.clientX - panelRect.left;
        offsetY = e.clientY - panelRect.top;
        $panel.css('z-index', 1052);
        $panel.siblings('.panel').css('z-index', 1051);
        e.preventDefault();
    });


    // 檢查螢幕尺寸條件
    function enablePanelDrag() {
        const isSmallScreen = window.matchMedia("(max-width: 899px)").matches; // 設定特定寬度條件
        if (!isSmallScreen) {
            $(document).on('pointermove', handlePanelMove); // 啟用拖移
        } else {
            $(document).off('pointermove', handlePanelMove); // 禁用拖移
        }
    }

    enablePanelDrag();

    // 防止事件穿透到地圖（滾動、點擊、拖曳、右鍵選單）
    // 少了 contextmenu 的話，在面板內按右鍵仍會冒泡到地圖，觸發地圖本身的座標資訊彈窗
    $panel.on('wheel mousedown pointerdown dblclick contextmenu', (e) => {
        e.stopPropagation();
    });

    $(document).on('pointerup', () => {
        isDragging = false;
    });

    // Event listener for closing the panel
    $panelCloseBtn.on('click', () => {
        $panel.addClass('hide');
    });

    // Event listener for toggling the panel visibility
    $tb.on('click', () => {
        if ($("#addPhotoBtn").hasClass("active")) {
            $("#addPhotoBtn").trigger('click');
        }
        $panel.toggleClass('hide');
        $panel.css('z-index', 1053);
    });
}

