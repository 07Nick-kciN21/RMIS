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
            let newLeft = e.touches ? e.touches[0].clientX - offsetX : e.clientX - offsetX;
            let newTop = e.touches ? e.touches[0].clientY - offsetY : e.clientY - offsetY;

            const containerRect = $container[0].getBoundingClientRect();
            const panelRect = $panel[0].getBoundingClientRect();

            newLeft = Math.max(containerRect.left, Math.min(newLeft, containerRect.right - panelRect.width));
            newTop = Math.max(containerRect.top, Math.min(newTop, containerRect.bottom - panelRect.height));

            $panel.css({ left: `${newLeft}px`, top: `${newTop}px` });
        }
    }

    // Event listeners for dragging functionality
    $panelHeading.on('pointerdown', (e) => {
        isDragging = true;
        offsetX = e.clientX - $panel.offset().left;
        offsetY = e.clientY - $panel.offset().top;
        $panel.css('z-index', 1052);
        $panel.siblings('.panel').css('z-index', 1051);
        e.preventDefault();
    });

    $(document).on('pointermove', handlePanelMove);
    $(document).on('pointerup', () => {
        isDragging = false;
    });

    // Event listener for closing the panel
    $panelCloseBtn.on('click', () => {
        $panel.addClass('hide');
    });

    // Event listener for toggling the panel visibility
    $tb.on('click', () => {
        if ($("#tb-addPhoto").hasClass("active")) {
            $("#tb-addPhoto").trigger('click');
        }
        $panel.toggleClass('hide');
        $panel.css('z-index', 1053);
    });
}

