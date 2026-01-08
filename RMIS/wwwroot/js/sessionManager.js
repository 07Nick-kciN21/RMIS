const sessionManager = (() => {
    const COOKIE_NAME = "LoginExpireTime";
    const EXTEND_API_URL = "/Portal/ExtendSession";
    const LOGIN_URL = "/Portal/Login";
    const TIMEOUT_BEFORE_EXPIRY = 5 * 60 * 1000; // 提前 5 分鐘顯示
    const CHECK_INTERVAL = 30 * 1000; // 30 秒檢查間隔
    const STORAGE_KEY = "sessionWarningShown"; // 跨標籤頁同步

    let modalInstance = null;
    let hasLogout = false; // 修正拼字錯誤
    let warningTimeout = null;
    let checkInterval = null;
    let isPageBlocked = false; // 頁面是否被鎖定

    function getCookieValue(name) {
        let cookies = document.cookie.split("; ");
        let cookie = cookies.find(row => row.startsWith(name + "="));
        return cookie ? decodeURIComponent(cookie.split("=")[1]) : null;
    }

    // 取得到期時間的 cookie 值
    function getRemainingTime() {
        const expireTimeStr = getCookieValue(COOKIE_NAME);
        if (!expireTimeStr) return 0;
        
        // 加入日期格式驗證
        const expireTime = new Date(expireTimeStr);
        if (isNaN(expireTime.getTime())) {
            console.error("無效的到期時間格式:", expireTimeStr);
            return 0;
        }
        
        return expireTime - new Date();
    }

    // 跨標籤頁狀態同步
    function setWarningShown(shown) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                shown: shown,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn("無法存取 localStorage:", e);
        }
    }

    function isWarningShownInOtherTab() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (!data) return false;
            
            const parsed = JSON.parse(data);
            // 如果資料超過 10 分鐘就視為過期
            return parsed.shown && (Date.now() - parsed.timestamp < 10 * 60 * 1000);
        } catch (e) {
            return false;
        }
    }

    // 強制檢查會話狀態
    function checkSessionTimeout() {
        const remainingTime = getRemainingTime();
        
        if (remainingTime <= 0) {
            handleSessionExpired();
        } else if (remainingTime <= TIMEOUT_BEFORE_EXPIRY && !hasLogout && !isWarningShownInOtherTab()) {
            showExtendLoginDialog();
        }
    }

    // 處理會話過期
    function handleSessionExpired() {
        hasLogout = true;
        clearAllTimers();
        blockPageInteraction();
        showSessionExpiredMessage();
        
        // 3秒後自動跳轉
        setTimeout(() => {
            redirectToLogin();
        }, 3000);
    }

    // 鎖定頁面互動
    function blockPageInteraction() {
        if (isPageBlocked) return;
        
        isPageBlocked = true;
        const overlay = document.createElement('div');
        overlay.id = 'sessionExpiredOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 9999;
            display: flex;
            justify-content: center;
            align-items: center;
            color: white;
            font-size: 18px;
            text-align: center;
        `;
        document.body.appendChild(overlay);
    }

    // 顯示會話過期訊息
    function showSessionExpiredMessage() {
        const overlay = document.getElementById('sessionExpiredOverlay');
        if (overlay) {
            overlay.innerHTML = `
                <div style="padding: 20px; background: #dc3545; border-radius: 10px;">
                    <h3>會話已過期</h3>
                    <p>系統將在 3 秒後自動跳轉至登入頁面...</p>
                </div>
            `;
        }
    }

    function showExtendLoginDialog() {
        // 防止重複顯示
        const modalEl = document.getElementById("extendSessionModal");
        if (!modalEl) {
            console.error("找不到 extendSessionModal 元素");
            return;
        }

        if (modalEl.classList.contains("show")) {
            return;
        }

        setWarningShown(true);

        if (!modalInstance) {
            // 設定為不可關閉的模態框
            modalInstance = new bootstrap.Modal(modalEl, {
                backdrop: 'static',
                keyboard: false
            });
        }

        modalInstance.show();

        // 重新綁定按鈕事件（防止重複綁定）
        const extendBtn = document.getElementById("extendBtn");
        const logoutBtn = document.getElementById("logoutBtn");

        if (extendBtn) {
            extendBtn.onclick = handleExtendSession;
        }

        if (logoutBtn) {
            logoutBtn.onclick = handleLogoutChoice;
        }

        // 設定自動倒數計時
        startCountdown();
    }

    // 倒數計時顯示
    function startCountdown() {
        const updateCountdown = () => {
            const remainingTime = getRemainingTime();
            const minutes = Math.floor(remainingTime / (60 * 1000));
            const seconds = Math.floor((remainingTime % (60 * 1000)) / 1000);
            
            const countdownEl = document.getElementById("countdown");
            if (countdownEl && remainingTime > 0) {
                countdownEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }

            if (remainingTime <= 0) {
                handleSessionExpired();
            }
        };

        updateCountdown();
        const countdownInterval = setInterval(updateCountdown, 1000);

        // 儲存 interval ID 以便清理
        modalInstance._countdownInterval = countdownInterval;
    }

    function handleExtendSession() {
        const loadingBtn = document.getElementById("extendBtn");
        if (loadingBtn) {
            loadingBtn.disabled = false;
            loadingBtn.textContent = "延長會話";
        }

        fetch(EXTEND_API_URL, { 
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("✅ 登入時間已延長到", data.expiresUtc);
            
            // 隱藏模態框並清理
            hideModalAndCleanup();
            setWarningShown(false);
            
            // 重新排程下次警告
            scheduleNextWarning();
            
            // 顯示成功訊息
            // showSuccessMessage("會話已成功延長！");
        })
        .catch(error => {
            console.error("延長會話失敗:", error);
            
            if (error.message.includes('401') || error.message.includes('403')) {
                alert("會話已過期，請重新登入");
                handleSessionExpired();
            } else {
                alert("網路錯誤，請稍後再試或重新登入");
                // 提供重試選項
                if (loadingBtn) {
                    loadingBtn.disabled = false;
                    loadingBtn.textContent = "延長會話";
                }
            }
        });
    }

    function handleLogoutChoice() {
        hasLogout = true;
        hideModalAndCleanup();
        setWarningShown(false);
        
        const remainingTime = getRemainingTime();
        if (remainingTime > 0) {
            showLogoutMessage(remainingTime);
            setTimeout(() => {
                redirectToLogin();
            }, remainingTime);
        } else {
            redirectToLogin();
        }
    }

    function showLogoutMessage(remainingTime) {
        const minutes = Math.floor(remainingTime / (60 * 1000));
        const seconds = Math.floor((remainingTime % (60 * 1000)) / 1000);
        
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ffc107;
            color: #000;
            padding: 15px;
            border-radius: 5px;
            z-index: 10500;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;
        message.innerHTML = `
            <strong>系統將在 ${minutes}:${seconds.toString().padStart(2, '0')} 後自動登出</strong>
        `;
        document.body.appendChild(message);

        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, remainingTime);
    }

    function showSuccessMessage(text) {
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 15px;
            border-radius: 5px;
            z-index: 10500;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;
        message.textContent = text;
        document.body.appendChild(message);

        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 3000);
    }

    function hideModalAndCleanup() {
        if (modalInstance) {
            // 清理倒數計時
            if (modalInstance._countdownInterval) {
                clearInterval(modalInstance._countdownInterval);
                modalInstance._countdownInterval = null;
            }
            modalInstance.hide();
        }
    }

    function redirectToLogin() {
        hasLogout = true;
        clearAllTimers();
        setWarningShown(false);
        window.location.href = LOGIN_URL;
    }

    function clearAllTimers() {
        if (warningTimeout) {
            clearTimeout(warningTimeout);
            warningTimeout = null;
        }
        if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
        }
        if (modalInstance && modalInstance._countdownInterval) {
            clearInterval(modalInstance._countdownInterval);
            modalInstance._countdownInterval = null;
        }
    }

    function scheduleNextWarning() {
        // 清理之前的計時器
        clearAllTimers();
        
        const remainingTime = getRemainingTime();
        
        if (remainingTime <= 0) {
            handleSessionExpired();
            return;
        }
        
        if (remainingTime <= TIMEOUT_BEFORE_EXPIRY) {
            // 剩餘時間已進入警示區間 → 立即跳視窗
            if (!isWarningShownInOtherTab()) {
                showExtendLoginDialog();
            }
        } else {
            // 距離警示點還有一段時間 → 準確設定 timeout
            const timeout = remainingTime - TIMEOUT_BEFORE_EXPIRY;
            warningTimeout = setTimeout(() => {
                checkSessionTimeout();
            }, timeout);
        }
    }

    // 監聽 localStorage 變化（跨標籤頁同步）
    function setupCrossTabSync() {
        window.addEventListener('storage', (e) => {
            if (e.key === STORAGE_KEY) {
                // 其他標籤頁的狀態改變了
                const newData = e.newValue ? JSON.parse(e.newValue) : null;
                if (newData && newData.shown && modalInstance) {
                    // 其他標籤頁已顯示警告，隱藏當前標籤頁的警告
                    hideModalAndCleanup();
                }
            }
        });

        // 監聽頁面可見性變化
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // 頁面重新可見時檢查狀態
                checkSessionTimeout();
            }
        });
    }

    function init() {
        // 初始化時清理可能存在的舊狀態
        setWarningShown(false);
        
        // 設定跨標籤頁同步
        setupCrossTabSync();
        
        // 排程下一次延長提醒
        scheduleNextWarning();
        
        // 設定定期檢查（防止計時器失效）
        checkInterval = setInterval(() => {
            if (!hasLogout) {
                checkSessionTimeout();
            }
        }, CHECK_INTERVAL);

        // 頁面卸載時清理
        window.addEventListener('beforeunload', () => {
            clearAllTimers();
            setWarningShown(false);
        });
    }

    return { 
        init,
        // 暴露一些方法供外部使用（例如手動檢查）
        checkStatus: () => ({
            remainingTime: getRemainingTime(),
            isExpired: getRemainingTime() <= 0,
            hasLogout: hasLogout
        })
    };
})();

// 確保 DOM 載入完成後初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sessionManager.init);
} else {
    sessionManager.init();
}