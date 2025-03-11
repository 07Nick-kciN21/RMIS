import { addPipeline, removePipeline } from './pipeline.js';
import { addLayer2Map } from './layers.js';
import { add2List, remove2List} from './list.js';

export let layerList = {};

export function initMenu() {
    $.ajax({
        url: "/Home/BuildTreeData",
        type: "GET",
        success: function (data) {
            console.log(data.menuData);
            var menuHtml = generateMenu(data.menuData, "", 0);
            $('#imageDataContent').html(menuHtml);
            bindMenuEvents();
            return menuHtml;
        },
        error: function (xhr, status, error) {
            console.log(xhr);
            console.log(status);
            console.log(error);
        }
    });
}

// 業務圖資下拉選單控制
export function generateMenu(data, parent_name, index) {
    let html = '<ul';
    if (index > 0) {
        html += ' class="menu-sub"';
    } else {
        html += ' id="imageDataMenu" class="menu-background"';
    }
    html += '>';
    data.forEach(function (item) {
        console.log(item.text, item.parent);
        let liClass;
        if (index == 0) {
            liClass = 'menu-head';
        } else {
            if (item.tag == "node") {
                liClass = 'menu-sublayer';
            } else {
                liClass = 'menu-layer';
            }
        }

        let liId;
        if (item.tag == "node") {
            liId = '';
        } else {
            liId = ` id="${item.id}"`;
        }

        html += `<li class="${liClass}" ${liId}>`;

        let headingTag;
        let headingClass;

        if (index == 0) {
            headingTag = 'h4';
            headingClass = 'menu-title';
        } else {
            headingTag = 'span';
            headingClass = 'text-secondary';
        }

        if (item.tag == "node") {
            html += `<div class="menu-node">
                        <span class="menu-icon menu-close" id="menu-${item.id}"></span>
                        <${headingTag} class="${headingClass}">
                            ${item.text}
                        </${headingTag}>
                    </div>`;
        } else {
            html += `
                    <div class="switch switch-off" id="switch-${item.id}"></div>
                    <${headingTag} class="${headingClass}">
                        ${item.text}
                    </${headingTag}>
                     `;
            layerList[item.id] = false;
        }
        if (item.children && item.children.length > 0) {
            html += generateMenu(item.children, item.text, index + 1);
        }
        html += `</li>`;
    });
    html += '</ul>';
    return html;
}

export function bindMenuEvents() {
    $(document).ready(function () {
        function initializeObserver(buttonId) {
            var button = $(`#${buttonId}`);
            var targetId = button.data('target');
            var targetElement = $(`#${targetId}`);
            
            console.log(targetId);
            observeDisplayChanges(button, targetElement);
        }
    
        // 呼叫函數處理不同按鈕
        ['imageDataBtn', 'userMenuBtn'].forEach(initializeObserver);
    });
    $('#imageDataBtn').click(function (e) {
        e.stopPropagation();
        var targetId = $(this).data('target');
        $(`#${targetId}`).toggle();
        updateOpenState($(this), $(`#${targetId}`));
    });
    $('#userMenuBtn').click(function (e) {
        e.stopPropagation();
        var targetId = $(this).data('target');
        $(`#${targetId}`).toggle();
        updateOpenState($(this), $(`#${targetId}`));
    });
    $('.menu-node').click(function (e) {
        console.log("click menu");
        e.stopPropagation();
        $(this).next('.menu-sub').slideToggle();

        let $span = $(this).children('span');
        if ($span.hasClass('menu-close')) {
            $span.removeClass('menu-close').addClass('menu-open');
        } else {
            $span.removeClass('menu-open').addClass('menu-close');
        }
    });

    $('.menu-layer').on('click', function (e) {
        e.stopPropagation();
        var id = $(this).attr('id');
        var name = $(this).children('span').text();
        var $switch = $(this).children('.switch');
        console.log(`click menu-layer ${id}`);
        // 如果為switch-on，則移除圖層；否則新增圖層
        if ($switch.hasClass('switch-on')) {
            removePipeline(id).then(result => {
                layerList[id] = false;
                console.log("Remove from List");
                remove2List(id);
                $switch.removeClass('switch-on').addClass('switch-off');
            });
        } else {
            // result: layerIdList
            addPipeline(id).then(result => {
                var { metaData, layers } = result;
                layerList[id] = true;
                add2List(id, name, layers, metaData);
                addLayer2Map(id, layers);
                $switch.removeClass('switch-off').addClass('switch-on');
            });
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