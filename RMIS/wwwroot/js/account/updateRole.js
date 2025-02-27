
$(document).ready(function () {
    $('#submit').on('click', function (e) {
        e.preventDefault(); // 阻止預設提交行為
        console.log("submit", $("#RoleId").text());
        
        // $.ajax({
        //     url: '/Account/Role/Update', // 修改為你的 Controller 路徑
        //     type: 'POST',
        //     data: $(this).serialize(), // 序列化表單數據
        //     success: function (response) {
        //         if (response.success) {
        //             alert('更新成功');
        //             // 通知主視窗更新，然後關閉
        //             window.opener.postMessage(JSON.stringify({ success: true }), window.location.origin);
        //             window.close();
        //         } else {
        //             alert(response.message); // 顯示錯誤訊息
        //         }
        //     },
        //     error: function () {
        //         alert('更新失敗，請稍後再試');
        //     }
        // });
    });
});