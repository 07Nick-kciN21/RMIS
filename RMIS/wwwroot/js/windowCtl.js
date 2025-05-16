let managedWindow = null;

export class WindowManager {
    constructor(){
        this.windows = new Map(); // 視窗名稱對應的 window 實例
        // this.registerAutoClose(); // 主頁離開時自動關閉視窗
    }

    open(name, url, width = 800, height = 600){
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        const left = 0 - (screenWidth + width) / 2;
        const top = (screenHeight - height) / 2;

        const newWin = window.open(url, name, `width=${width},height=${height},top=${top},left=${left}`);
        if (newWin) {
            console.log(`開啟視窗: ${name}`);
            // this.windows.set(name, newWin);
        } else {
            console.warn(`無法開啟視窗: ${name}，可能被瀏覽器阻擋`);
        }
    }

    // close(name){
    //     const win = this.windows.get(name);
    //     if(win && ~win.closed){
    //         win.close();
    //     }
    //     this.windows.delete(name);
    // }

    // // 綁定主頁 unload 時自動關閉所有視窗
    // registerAutoClose() {
    //     const closeHandler = () => this.closeAll();

    //     window.addEventListener('beforeunload', closeHandler); // 標準關閉
    //     window.addEventListener('pagehide', closeHandler);     // Safari & iOS 有效
    //     document.addEventListener('visibilitychange', () => {
    //         if (document.visibilityState === 'hidden') {
    //             this.closeAll(); // 偵測頁面隱藏（跳轉或關閉）
    //         }
    //     });
    // }
}

// export function openWindow(currentWindow, url, name, width, height) {
//     var screenWidth = window.screen.width;
//     var screenHeight = window.screen.height;
//     var left = 0 - (screenWidth + width) / 2;
//     var top = (screenHeight - height) / 2;

//     // 如果視窗存在且未關閉，先關閉它
//     if (currentWindow && !currentWindow.closed) {
//         console.log("關閉舊視窗");
//         currentWindow.close();
//     }

//     // 重新開啟新視窗
//     managedWindow = window.open(url, name, `width=${width},height=${height},top=${top},left=${left}`);
//     console.log("開啟新視窗");
//     return managedWindow;
// }

// // ✅ 關閉註冊：離開主頁時自動關閉視窗
// export function registerWindowAutoClose() {
//     window.addEventListener('beforeunload', () => {
//         if (managedWindow && !managedWindow.closed) {
//             managedWindow.close();
//         }
//     });
// }
