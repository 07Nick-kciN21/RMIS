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

    // ✅ 事件委派方式：針對動態加入的 form 也能綁定
    $(document).on('submit', '#customModal .modal-body form', function (e) {
        e.preventDefault();

        const $form = $(this);
        const url = $form.attr('action') || $form.data('action'); // 優先使用 action 屬性
        const method = $form.attr('method') || 'POST';
        const formData = new FormData(this);

        $.ajax({
            url: url,
            type: method,
            data: formData,
            processData: false,
            contentType: false,
            success: function (response) {
                alert(response.message || '提交成功');
                // 若你要關掉 modal 可加上：
                $('#customModal').fadeOut();
                $('.disable-overlay').remove();
            },
            error: function (xhr, status, error) {
                alert(`Error ${status}. 表單提交失敗: ${xhr.responseText}`);
            }
        });
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
        $('#modalTitle').text(modalTitle);
        $('#customModal .modal-body').html('<p>正在加载...</p>');

        $.get(url + '?_t=' + new Date().getTime(), function (data) {
            $('#customModal .modal-body').html(data);

            // ✅ 每次 modal 載入後重新初始化 app
            if (window.app && typeof window.app.init === 'function') {
                window.app.init();
            }
        }).fail(function () {
            $('#customModal .modal-body').html('<p>載入失敗。</p>');
        });

        if (!$('.disable-overlay').length) {
            $('body').append('<div class="disable-overlay"></div>');
        }
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