export function initModal() {
    $(document).ready(function () {
        var targetId = $('#dropdownMenuBtn').data('target');
        var targetElement = $(`#${targetId}`);
        observeDisplayChanges($('#dropdownMenuBtn'), targetElement);
    });
    // Dropdown 切換邏輯
    $('#dropdownMenuBtn').on('click', function (e) {
        e.stopPropagation();
        var targetId = $(this).data('target');
        console.log("dropdownMenuBtn click");
        $(`#${targetId}`).toggle();
        $(this).addClass('open');
    });

    $('.modal-link').on('click', function (e) {
        console.log("modal click");
        $('#customModal').fadeIn();
        var url = $(this).data('action');
        var modalTitle = $(this).text();

        $('#customModal').fadeIn();
        $('#modalTitle').text(modalTitle);
        $('.modal-body').html('<p>正在加载...</p>');

        $.get(url, function (data) {
            $('.modal-body').html(data);
            $('.modal-body form').on('submit', function (e) {
                e.preventDefault(); // 阻止默認行為
                var method = $(this).attr('method');
                var formData = new FormData(this);
                // alert(`${method} ${url} ${formData}`);
                $.ajax({
                    url: url,
                    type: method,
                    data: formData,
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function (response) {
                        // 處理成功回應
                        alert(response);
                    },
                    error: function (xhr, status, error) {
                        // 處理錯誤回應
                        alert(`Error ${status}. 表單提交失敗: {${xhr.responseText}}` );
                    }
                });
            });
        }).fail(function () {
            $('.modal-body').html('<p>載入失敗。</p>');
        });

        if (!$('.disable-overlay').length) {
            $('body').append('<div class="disable-overlay"></div>');
        }
        //$('.dropdown-content').each(function () {
        //    $(this).css('display', 'none');
        //});
    });

    $('.close-modal').on('click', function () {
        $('#customModal').fadeOut();
        $('.disable-overlay').remove(); 
        $('body').removeClass('dimmed');
    });

    $('#customModal').on('click', function (e) {
        if ($(e.target).is('#customModal')) {
            $('#customModal').fadeOut();
            $('.disable-overlay').remove();
            $('body').removeClass('dimmed');
        }
    });

    // 提交modal表單時阻止頁面跳轉，用ajax提交
    $('.modal-form').on('submit', function (e) {
        e.preventDefault(); // 阻止默認行為
        var url = $(this).attr('action');
        var method = $(this).attr('method');
        var formData = $(this).serialize();
        alert(formData, url);
        //$.ajax({
        //    url: url,
        //    type: method,
        //    data: formData,
        //    success: function (response) {
        //        // 處理成功回應
        //        alert('表單提交成功，影響行數: ' + response);
        //    },
        //    error: function (xhr, status, error) {
        //        // 處理錯誤回應
        //        alert(`Error ${status}. 表單提交失敗: {${xhr.responseText}}` );
        //    }
        //});
    });
}
function observeDisplayChanges(triggerElement, targetElement) {
    const observer = new MutationObserver(() => {
        updateOpenState(triggerElement, targetElement);
    });

    observer.observe(targetElement[0], {
        attributes: true,
        attributeFilter: ['style'] // 監控 style 屬性變化
    });
}
function updateOpenState(triggerElement, targetElement) {
    if (targetElement.is(':visible')) {
        triggerElement.addClass("open");
    } else {
        triggerElement.removeClass("open");
    }
}