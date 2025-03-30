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
});