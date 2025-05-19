let managedWindow = null;

export class WindowManager {
    constructor(){
        this.windows = new Map(); // 視窗名稱對應的 window 實例
        this.registerAutoClose(); // 主頁離開時自動關閉視窗
    }

    open(name, url, width = 800, height = 600){
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        const left = 0 - (screenWidth + width) / 2;
        const top = (screenHeight - height) / 2;

        const newWin = window.open(url, name, `width=${width},height=${height},top=${top},left=${left}`);
        if (newWin) {
            console.log(`開啟視窗: ${name}`);
            this.windows.set(name, newWin);
        } else {
            console.warn(`無法開啟視窗: ${name}，可能被瀏覽器阻擋`);
        }
    }

    close(name) {
        const win = this.windows.get(name);
        if (win && !win.closed) {
            win.close();
        }
        this.windows.delete(name);
    }

    closeAll() {
        for (const [name, win] of this.windows.entries()) {
            if (win && !win.closed) {
                win.close();
            }
        }
        this.windows.clear();
    }

    // // 綁定主頁 unload 時自動關閉所有視窗
    registerAutoClose() {
        const closeHandler = () => this.closeAll();

        window.addEventListener('beforeunload', closeHandler); // 標準關閉
        window.addEventListener('pagehide', closeHandler);     // Safari & iOS 有效
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.closeAll(); // 偵測頁面隱藏（跳轉或關閉）
            }
        });
    }
}
