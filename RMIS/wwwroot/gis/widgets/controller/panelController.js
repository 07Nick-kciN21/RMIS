class PanelController {
    constructor() {
        this.panels = new Map();
        this.$container = $("#indexMap");
    }

    register({ funcId, buttonId, divId, openFunc, closeFunc }) {
        const $tb = $("#" + buttonId);
        const $panel = $("#" + divId);
        const $panelHeading = $panel.find(".panelHeading");
        const $panelCloseBtn = $panel.find(".closeButton");

        const panelData = {
            funcId,
            buttonId,
            divId,
            openFunc,
            closeFunc,
            active: false,
            $panel,
            $tb,
            isDragging: false,
            offsetX: 0,
            offsetY: 0
        };

        this.panels.set(funcId, panelData);

        // === 綁定事件 ===
        this.#initDrag(panelData, $panelHeading);
        this.#initClose(panelData, $panelCloseBtn);

        // 點擊 toolbar → toggle
        $tb.off("click").on("click", () => this.togglePanel(funcId));
    }

    openPanel(funcId) {
        const panel = this.panels.get(funcId);
        if (panel && !panel.active) {
            panel.active = true;
            panel.$tb.addClass("active");
            panel.$panel.removeClass("hide").show().css("z-index", 1053);
            if (typeof panel.openFunc === "function") panel.openFunc();
        }
    }

    closePanel(funcId) {
        const panel = this.panels.get(funcId);
        if (panel && panel.active) {
            panel.active = false;
            panel.$tb.removeClass("active");
            panel.$panel.addClass("hide").hide();
            if (typeof panel.closeFunc === "function") panel.closeFunc();
        }
    }

    togglePanel(funcId) {
        const panel = this.panels.get(funcId);
        if (!panel) return;
        if (panel.active) this.closePanel(funcId);
        else this.openPanel(funcId);
    }

    closeAll() {
        this.panels.forEach(panel => {
            if (panel.active) this.closePanel(panel.funcId);
        });
    }

    // ========== 私有方法 ==========
    #initDrag(panelData, $heading) {
        const $panel = panelData.$panel;
        const container = this.$container[0];

        const handlePanelMove = (e) => {
            if (panelData.isDragging) {
                let newLeft = e.touches ? e.touches[0].clientX - panelData.offsetX : e.clientX - panelData.offsetX;
                let newTop = e.touches ? e.touches[0].clientY - panelData.offsetY : e.clientY - panelData.offsetY;

                const containerRect = container.getBoundingClientRect();
                const panelRect = $panel[0].getBoundingClientRect();

                newLeft = Math.max(containerRect.left, Math.min(newLeft, containerRect.right - panelRect.width));
                newTop = Math.max(containerRect.top, Math.min(newTop, containerRect.bottom - panelRect.height));

                $panel.css({ left: `${newLeft}px`, top: `${newTop}px` });
            }
        };

        $heading.on("pointerdown", (e) => {            
            panelData.isDragging = true;
            panelData.offsetX = e.clientX - $panel.offset().left;
            panelData.offsetY = e.clientY - $panel.offset().top;
            console.log("pointerdown", panelData.offsetX, panelData.offsetY)
            $panel.css("z-index", 1052);
            $panel.siblings(".panel").css("z-index", 1051);
            e.preventDefault();
        });

        // 判斷螢幕尺寸是否啟用拖曳
        const enableDrag = () => {
            const isSmallScreen = window.matchMedia("(max-width: 899px)").matches;
            if (!isSmallScreen) $(document).on("pointermove", handlePanelMove);
            else $(document).off("pointermove", handlePanelMove);
        };
        enableDrag();

        $(document).on("pointerup", () => {
            panelData.isDragging = false;
        });
    }

    #initClose(panelData, $closeBtn) {
        $closeBtn.on("click", () => {
            this.closePanel(panelData.funcId);
        });
    }
}

export { PanelController };
