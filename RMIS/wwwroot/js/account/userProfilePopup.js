$(document).ready(function () {
    $("#profileBtn").on("click", function () {
        var windowWidth = 800;
        var windowHeight = 600;
        // 獲取螢幕的寬高
        var screenWidth = window.screen.width;
        var screenHeight = window.screen.height;
        // 計算彈出視窗的位置
        var left = 0 - (screenWidth + windowWidth) / 2;
        var top = (screenHeight - windowHeight) / 2;
        window.open("/Account/User/Profile", 'newWindow', `width=${windowWidth},height=${windowHeight}, top=${top}, left=${left}`);
    });

    // 設定 userMenuContent 的寬度等於 username
    function setMenuWidth() {
        let usernameWidth = $('#username').outerWidth(); // 獲取 username 的完整寬度（包括 padding 和邊框）
        $('#userMenuContent').css({
            'width': usernameWidth+10,
            'min-width': usernameWidth+10
        });
    }

    // 初始化時設置一次
    setMenuWidth();

    // 監聽視窗大小變化時重新設置
    $(window).on('resize', function () {
        setMenuWidth();
    });

    // 如果 @ViewBag.Username 的內容可能通過 AJAX 或其他方式變更
    // 可以每次打開 userMenuContent 時重新設置寬度
    $('#userMenuBtn').on('click', function () {
        setMenuWidth(); // 每次點擊重新調整寬度
    });
});