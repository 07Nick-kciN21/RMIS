export function initCommonLink() {
    $(document).ready(function () {
        var targetId = $('#commonLinkBtn').data('target');
        var targetElement = $(`#${targetId}`);
        observeDisplayChanges($('#commonLinkBtn'), targetElement);
    });

    $('#commonLinkBtn').on('click', function (e) {
        e.stopPropagation();
        var targetId = $(this).data('target');
        console.log("commonLinkBtn click");
        $(`#${targetId}`).toggle();
        $(this).addClass('open');
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