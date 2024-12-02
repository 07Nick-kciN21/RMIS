import { getIndexMap } from './map.js'

let $indexMap;
let vertexLatLngs = [];
let isDrawing = false;
let lengthTooltip; // 全局 tooltip 變數

export function initMeasure() {
    $indexMap = getIndexMap();

    // 先移除已有的 measureTool 繪圖開始事件，防止重複註冊
    $indexMap.off("draw:drawstart.measureTool");

    // 使用命名空間註冊 measureTool 的 draw:drawstart 事件
    $indexMap.on("draw:drawstart.measureTool", function (e) {
        console.log("draw:drawstart for measure tool");
        isDrawing = true;
        vertexLatLngs = [];
        if (e.latlng) {
            vertexLatLngs.push(e.latlng);
        }
    });

    $('#tb-measure').on('click', function () {
        initPolyline();
    });
}

function initPolyline() {
    // 手動觸發繪圖開始事件，並使用 measureTool 命名空間
    $indexMap.fire('draw:drawstart.measureTool', {
        latlng: $indexMap.getCenter() // 可以設置起始位置
    });

    // 移除舊的 click 事件，防止重複註冊，並加上命名空間
    $indexMap.off('click.measureTool');

    // 監聽地圖的點擊事件來開始畫線，並加上命名空間
    $indexMap.on('click.measureTool', function (e) {
        if (!isDrawing) {
            isDrawing = true;
            vertexLatLngs = [];
            addDistTip(); // 在首次點擊地圖時顯示距離提示
        }

        // 添加新的頂點
        vertexLatLngs.push(e.latlng);
        console.log("vertexLatLngs: ", vertexLatLngs);

        // 更新距離提示的內容和位置
        updateDistanceTip(e);
    });

    // 創建折線工具
    const polylineDrawer = new L.Draw.Polyline($indexMap, {
        shapeOptions: {
            color: '#0000FF',
            weight: 3,
            opacity: 1.0
        }
    });

    // 禁用其他繪製工具
    $indexMap.eachLayer(function (layer) {
        if (layer instanceof L.Draw.Feature) {
            layer.disable();
        }
    });

    // 啟用折線繪製模式
    polylineDrawer.enable();

    // 使用一次性事件監聽器，只在繪製完成後處理一次，並加上命名空間
    $indexMap.once(L.Draw.Event.CREATED + '.measureTool', function (event) {
        if (event.layerType === 'polyline') {
            const layer = event.layer;

            // 添加到地圖
            $indexMap.addLayer(layer);
            console.log("Polyline created by measure tool");

            // 停止繪製
            polylineDrawer.disable();
            isDrawing = false;

            // 手動觸發繪圖停止事件，重新顯示工具面板
            $indexMap.fire('draw:drawstop.measureTool');

            // 隱藏 tooltip
            if (lengthTooltip) {
                lengthTooltip.style.display = 'none';
            }

            console.log("last position: ", vertexLatLngs[vertexLatLngs.length - 1]);
            // 添加距離標籤到地圖上最後的位置
            const lastLatLng = vertexLatLngs[vertexLatLngs.length - 1];
            if (lastLatLng) {
                const totalLength = vertexLatLngs.reduce((acc, cur, idx, arr) => {
                    if (idx === 0) return acc;
                    return acc + arr[idx - 1].distanceTo(cur);
                }, 0);

                L.marker(lastLatLng, {
                    icon: L.divIcon({
                        className: 'length-label',
                        html: `<div class="tip" >距離: ${totalLength.toFixed(2)} 米</div>`,
                        iconSize: null
                    }),
                    interactive: false
                }).addTo($indexMap);
            }

            // 移除 mousemove 事件監聽
            $indexMap.off('mousemove.measureTool');
        }
    });
}

function addDistTip() {
    if (!lengthTooltip) {
        // 創建自定義的距離提示並添加到 body 中
        lengthTooltip = document.createElement('div');
        lengthTooltip.className = "tip";
        lengthTooltip.id = "length-tooltip";
        document.body.appendChild(lengthTooltip);
    }

    // 監聽 mousemove 事件來動態顯示距離，並加上命名空間
    $indexMap.on('mousemove.measureTool', function (e) {
        if (isDrawing && vertexLatLngs.length > 0) {
            updateDistanceTip(e);
        }
    });
}

function updateDistanceTip(e) {
    if (lengthTooltip) { // 確保 lengthTooltip 已經被創建
        if (vertexLatLngs.length > 0) {
            // 添加鼠標當前位置作為新的點
            const currentLatLngs = vertexLatLngs.concat(e.latlng);

            // 計算從起點到當前位置的總距離
            let length = 0;
            for (let i = 1; i < currentLatLngs.length; i++) {
                length += currentLatLngs[i - 1].distanceTo(currentLatLngs[i]);
            }

            // 更新 tooltip 的位置和顯示內容
            lengthTooltip.style.left = (e.originalEvent.pageX + 15) + 'px';
            lengthTooltip.style.top = (e.originalEvent.pageY + 15) + 'px';
            lengthTooltip.style.display = 'block';
            lengthTooltip.innerHTML = '距離: ' + length.toFixed(2) + ' 米';
        }
    }
}
