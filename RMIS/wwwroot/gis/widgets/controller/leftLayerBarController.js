// import { removePipeline, addPipeline } from './pipeline.js';
// import { layers } from './layers.js';
// import { getIndexMap } from '../map.js';
// import { Map } from '../map_test.js';
// import { layerEditor } from './layerEdit/layerEditor.js';
// import { opacityLayer } from './opacityCtrl.js';
// import { openPanel } from '../metaDataPanel.js';


class LayerBarController {
    constructor(containerSelector = '#layerBarContainer') {
        this.$container = $(containerSelector);
    }

    add(id, name, datas, metaData) {
        if (this.$container.find('#layerBar_' + id).length > 0) return;
        let sections = "";
        datas.forEach((data) => {
            sections += `
                <div class="section" id="section_${data.id}">
                    <span class="section_icon" style="background-image: url('/img/${data.svg}');"></span>
                    ${data.name}
                </div>`;
        });

        let layerItem = `
            <div class="layerBar featureLayer-Bg" id="layerBar_${id}">
                <div class="layerTitle">
                    <div style="display:flex; border-bottom:solid 1px #160386;"> 
                        <span class="menu-icon menu-open" id="layerLegend_${id}"></span>
                        <div class="layerName">${name}</div>
                    </div>
                    <div id="sections_${id}">${sections}</div>
                </div>
            </div>`;
        this.$container.append(layerItem);
    }

    remove(id) {
        this.$container.find('#layerBar_' + id).remove();
    }
}

export { LayerBarController };