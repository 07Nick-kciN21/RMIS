export function initModal() {
    $(document).ready(function () {
        function initializeObserver(buttonId) {
            var button = $(`#${buttonId}`);
            var targetId = button.data('target');
            var targetElement = $(`#${targetId}`);
            
            console.log(targetId);
            observeDisplayChanges(button, targetElement);
        }
    
        ['adminMenuBtn'].forEach(initializeObserver);
    });
    // Dropdown 切換邏輯
    $('#adminMenuBtn').on('click', function (e) {
        e.stopPropagation();
        var targetId = $(this).data('target');
        console.log("adminMenuBtn click");
        $(`#${targetId}`).toggle();
        $(this).addClass('open');
    });

    $('.modal-link').on('click', function (e) {
        console.log("modal click");
        $('#customModal').fadeIn();
        var url = $(this).data('action');
        var modalTitle = $(this).text();
        // l = 500px
        // xl = 800px
        $('#customModal').fadeIn();
        $('#modalTitle').text(modalTitle);
        $('#customModal .modal-body').html('<p>正在加载...</p>');

        $.get(url, function (data) {
            console.log("get data");
            $('#customModal .modal-body').html(data);
            $('#customModal .modal-body form').on('submit', function (e) {
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
                        alert(response.message);
                    },
                    error: function (xhr, status, error) {
                        // 處理錯誤回應
                        alert(`Error ${status}. 表單提交失敗: {${xhr.responseText}}` );
                    }
                });
            });
        }).fail(function () {
            $('#customModal .modal-body').html('<p>載入失敗。</p>');
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