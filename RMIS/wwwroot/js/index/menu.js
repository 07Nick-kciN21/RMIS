import { addPipeline, removePipeline } from './pipeline.js';
import { addLayer2Map } from './layers.js';
import { add2List, remove2List} from './list.js';

export let layerList = {};


// 業務圖資下拉選單控制
export function generateMenu(data, parent_name, index) {
    let html = '<ul class=';
    if (index > 0) {
        html += '"menu-sub"';
    } else {
        html += '"menu-background"';
    }
    html += '>';
    data.forEach(function (item) {
        console.log(item.text, item.parent);
        let liClass;
        if (index == 0) {
            liClass = 'head-menu';
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
            headingClass = 'border-bottom text-success';
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
    // 顯示或隱藏菜單
    $('.dropdown-button').click(function (e) {
        e.stopPropagation();
        var targetId = $(this).data('target');
        console.log(targetId);
        $(`#${targetId}`).toggle();
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
        if (!layerList[id]) {
            addPipeline(id).then(result => {
                layerList[id] = true;
                add2List(id, name, result);
                addLayer2Map(id, result);
                $switch.removeClass('switch-off');
                $switch.addClass('switch-on');
            });
        } else {
            removePipeline(id).then(result => {
                layerList[id] = false;
                console.log("Remove from List");
                remove2List(id);
                $switch.removeClass('switch-on');
                $switch.addClass('switch-off');
            });
        }
    });
}
