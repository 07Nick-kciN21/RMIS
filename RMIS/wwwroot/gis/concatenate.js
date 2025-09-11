// simpleConcatenate.js
class Concatenate {
    constructor() {
        this.all = [];   // 存放功能清單
    }

    // 加入功能
    push(obj) {
        this.all.push(obj);
    }

    // 開啟功能
    open(funcId) {
        let target = this.all.find(f => f.funcId === funcId);
        if (target && typeof target.openFunc === "function") {
            target.active = true;
            $("#" + target.divId).show();
            target.openFunc();
        }
    }

    // 關閉功能
    close(funcId) {
        let target = this.all.find(f => f.funcId === funcId);
        if (target && typeof target.closeFunc === "function") {
            target.active = false;
            $("#" + target.divId).hide();
            target.closeFunc();
        }
    }

    // 一次關閉所有功能
    closeAll() {
        this.all.forEach(obj => {
            if (obj.active && typeof obj.closeFunc === "function") {
                obj.active = false;
                $("#" + obj.divId).hide();
                obj.closeFunc();
            }
        });
    }
}

export { Concatenate };
