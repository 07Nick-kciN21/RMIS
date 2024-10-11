import { getIndexMap } from './map.js';

let roadlayer;
export function initPanel(panelId) {
    const $container = $("#indexMap");
    const $tb = $(`#tb-${panelId}`);
    const $panel = $(`#${panelId}`);
    const $panelHeading = $panel.find(".panelHeading");
    const $panelCloseBtn = $panel.find(".closeButton");
    let isDragging = false;
    let offsetX, offsetY;

    $panelHeading.on("mousedown", (e) => {
        isDragging = true;
        offsetX = e.clientX - $panel.offset().left;
        offsetY = e.clientY - $panel.offset().top;
    });

    $(document).on("mousemove", (e) => {
        if (isDragging) {
            let newLeft = e.clientX - offsetX;
            let newTop = e.clientY - offsetY;

            // 限制移動範圍
            const containerRect = $container[0].getBoundingClientRect();
            const panelRect = $panel[0].getBoundingClientRect();

            if (newLeft < containerRect.left) {
                newLeft = containerRect.left;
            } else if (newLeft + panelRect.width > containerRect.right) {
                newLeft = containerRect.right - panelRect.width;
            }

            if (newTop < containerRect.top) {
                newTop = containerRect.top;
            } else if (newTop + panelRect.height > containerRect.bottom) {
                newTop = containerRect.bottom - panelRect.height;
            }

            $panel.css({ left: `${newLeft}px`, top: `${newTop}px` });
        }
    });

    $(document).on("mouseup", () => {
        isDragging = false;
    });

    $panelCloseBtn.on("click", () => {
        console.log("click hide");
        $panel.hide();
    })
    $tb.on("click", () => {
        console.log("click show");
        $panel.show();
    })
}

