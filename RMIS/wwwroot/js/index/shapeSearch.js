import { layers } from './layers.js';

let currentShape;
let drawingActive = false; // Track if drawing is currently active
let shapeLayer;
export function handleDrawShape($indexMap) {
    if (!$indexMap.editTools) {
        $indexMap.editTools = new L.Editable($indexMap);
    }

    // 繪圖期間的事件
    $indexMap.on('editable:drawing:end', function (e) {
        if (!drawingActive || !currentShape) {
            return;
        }
        drawingActive = false;
        shapeLayer = e.layer;
        $('#searchPropPanel').removeClass('hide');
        setTimeout(() => shapeLayer.disableEdit(), 0);
    });

    // 開始繪圖事件
    $('#propGeoCustom > button').on('click', function () {
        if (currentShape) {
            $indexMap.removeLayer(currentShape);
            currentShape = null;
        }
        console.log("propGeoCustom click");
        $('#searchPropPanel').addClass('hide');
        drawingActive = true;
        if (this.id == 'propRect') {
            currentShape = $indexMap.editTools.startRectangle();
        } else if (this.id == 'propCircle') {
            console.log('click propCircle');
            currentShape = $indexMap.editTools.startCircle();
        } else if (this.id == 'propPolygon') {
            console.log('click propPolygon');
            currentShape = $indexMap.editTools.startPolygon();
        }
    });
}


export async function filterPropsByShape(gselectedId) {
    if (!shapeLayer) {
        return null;
    }
    try {
        if (shapeLayer instanceof L.Rectangle || shapeLayer instanceof L.Polygon) {
            const ret = await getObjectsInBounds(shapeLayer.getBounds(), gselectedId);
            return ret;
        } else {
            const ret = await getObjectsInCircle(shapeLayer, gselectedId);
            return ret;
        }
    } catch (err) {
        console.error('Error in filterPropsByShape:', err);
        return null;
    }
}

function getObjectsInBounds(bounds, gselectedId) {
    let count = 0;
    let filteredProps = [];

    function processPopupContent(subLayer) {
        var popup = subLayer.getPopup();
        if (!popup) return;

        var content = popup.getContent();
        var parser = new DOMParser();
        var doc = parser.parseFromString(content, 'text/html');

        var popupDataDiv = doc.querySelector('.popupData');
        if (popupDataDiv) {
            var jsonData = popupDataDiv.textContent.replace(/NaN/g, 'null');
            try {
                var item = JSON.parse(jsonData);
                item['Instance'] = subLayer;
                item['座標'] = subLayer instanceof L.Marker ? subLayer.getLatLng() : subLayer.getLatLngs()[0];
                filteredProps.push(item);
            } catch (err) {
                console.error('無法解析 JSON', err);
            }
        } else {
            console.error('未找到 .popupData 元素');
        }
    }

    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/api/MapAPI/GetLayerIdByPipeline?PipelineId=${gselectedId}`,
            method: 'POST',
            success: function (result) {
                try {
                    result.layerIdList.forEach(function (id) {
                        let layer = layers[id];
                        if (layer instanceof L.LayerGroup) {
                            layer.eachLayer(function (subLayer) {
                                if (subLayer instanceof L.Marker && bounds.contains(subLayer.getLatLng())) {
                                    count++;
                                    processPopupContent(subLayer);
                                } else if (subLayer instanceof L.Polyline && bounds.intersects(subLayer.getBounds())) {
                                    count++;
                                    processPopupContent(subLayer);
                                }
                            });
                        }
                    });
                    console.log(`圖層內的物件數量: ${count}`);
                    resolve(filteredProps);
                } catch (err) {
                    console.error('Get Layer Id', err);
                    reject(err);
                }
            },
            error: function (err) {
                console.error('AJAX Error', err);
                reject(err);
            }
        });
    });
}
async function getObjectsInCircle(circle, gselectedId) {
    // circle 是 L.Circle 的實例
    let count = 0;
    let filteredProps = [];
    const center = circle.getLatLng();
    const radius = circle.getRadius(); // 以公尺為單位

    // 改良的 processPopupContent 函數
    function processPopupContent(subLayer) {
        var popup = subLayer.getPopup();
        if (!popup) return;

        var content = popup.getContent();
        var parser = new DOMParser();
        var doc = parser.parseFromString(content, 'text/html');

        // Get .popupData content
        var popupDataDiv = doc.querySelector('.popupData');
        if (popupDataDiv) {
            var jsonData = popupDataDiv.textContent.replace(/NaN/g, 'null');
            try {
                var item = JSON.parse(jsonData);
                item['Instance'] = subLayer;
                item["座標"] = subLayer instanceof L.Marker ? subLayer.getLatLng() : subLayer.getLatLngs()[0];
                filteredProps.push(item);
            } catch (err) {
                console.error('無法解析 JSON', err);
            }
        } else {
            console.error('未找到 .popupData 元素');
        }
    }

    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/api/MapAPI/GetLayerIdByPipeline?PipelineId=${gselectedId}`,
            method: 'POST',
            success: function (result) {
                try {
                    console.log(`/api/MapAPI/GetLayerIdByPipeline?PipelineId=${gselectedId}`);
                    result.layerIdList.forEach(function (id) {
                        let layer = layers[id];
                        if (layer instanceof L.LayerGroup) {
                            layer.eachLayer(function (subLayer) {
                                if (subLayer instanceof L.Marker) {
                                    const distance = center.distanceTo(subLayer.getLatLng());
                                    if (distance <= radius) {
                                        processPopupContent(subLayer, filteredProps);
                                        count++;
                                    }
                                } else if (subLayer instanceof L.Polyline) {
                                    let found = false;
                                    subLayer.getLatLngs().forEach(function (point) {
                                        if (!found) {
                                            const distance = center.distanceTo(point);
                                            if (distance <= radius) {
                                                processPopupContent(subLayer, filteredProps);
                                                count++;
                                                found = true; // 找到一個符合的點後停止檢查這條線
                                            }
                                        }
                                    });
                                }
                            });
                        }
                    });
                    console.log(`圓範圍內的物件數量: ${count}`);
                    resolve(filteredProps);
                } catch (err) {
                    console.error('Get Layer Id', err);
                    reject(err);
                }
            }
        });
    });
}

export function clearShape($indexMap) {
    $('label[for="btnradio3"]').css('visibility', 'hidden');
    $('#shapeGroup').addClass('hide');
    $('#gFeatSelect').val('-1').trigger('change');
    $indexMap.removeLayer(shapeLayer);
}