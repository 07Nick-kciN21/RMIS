// events.js
export function add2List(id, name, datas) {
    let sections = "";
    datas.forEach(function (data) {
        var section = `
            <div class="section" id="section_${data.id}">
                <span class="section_icon" style="background-image: url('/img/${data.svg}');"></span>
                ${data.name}
            </div>
        `;
        sections += section;
    })
    let layerItem = `
        <div class="layerBar featureLayer-Bg" id="layerBar_${id}">
            <div class="layerTitle">
                <div class="layerName">${name}</div>
                ${sections}
            </div>
            <div class="eye eyeOpen" id="eye_${id}"></div>
            <div class="layerRemove" id="layerRemove_${id}"></div>
        </div>
    `;
    $('.layerList').append(layerItem);

    $(`#eye_${id}`).on('click', function (e) {
        if ($(this).hasClass('eyeOpen')) {
            closeLayer(id);
            $(this).removeClass('eyeOpen');
            $(this).addClass('eyeClosed');
        }
        else {
            displayLayer(id);
            $(this).removeClass('eyeClosed');
            $(this).addClass('eyeOpen');
        }
    });

    $(`#layerRemove_${id}`).on('click', function (e) {
        removePipeline(id).then(result => {
            layerList[id] = false;
            console.log("Remove click");
            remove2List(id);
            var $switch = $(`#switch-${id}`);
            $switch.removeClass('switch-on');
            $switch.addClass('switch-off');
        })
    })
}

export function remove2List(id) {
    let $layerList = $(".layerList");
    $layerList.find('#layerBar_' + id).remove();
    layerList[id] = false;
}

// 显示和关闭图层
export function closeLayer(id) {
    removePipeline(id);
    layerList[id] = false;
}

function displayLayer(id) {
    addPipeline(id).then(result => {
        layerList[id] = true;
        addLayer2Map(result);
    });
}
