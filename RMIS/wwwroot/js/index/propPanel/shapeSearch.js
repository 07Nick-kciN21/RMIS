import { layers } from '../ctrlMap/layers.js';

let currentShape;
let drawingActive = false; // Track if drawing is currently active
let shapeLayer;
let condition="";
export function handleDrawShape($indexMap) {
    if (!$indexMap.editTools) {
        $indexMap.editTools = new L.Editable($indexMap);
    }

    // 繪圖完成事件
    $indexMap.on('editable:drawing:end', function (e) {
        if (!drawingActive || !currentShape) {
            return;
        }
        drawingActive = false;
        shapeLayer = e.layer;
        $('#searchPropPanel').removeClass('hide');
        setTimeout(() => shapeLayer.disableEdit(), 0);
    });

    // 繪圖開始事件
    $('#propGeoCustom > button').on('click', function () {
        if (currentShape) {
            $indexMap.removeLayer(currentShape);
            currentShape = null;
        }
        console.log("propGeoCustom click");
        $('#searchPropPanel').addClass('hide');
        drawingActive = true;
        if (this.id == 'propRect') {
            condition = "空間-自畫正方形";
            currentShape = $indexMap.editTools.startRectangle();
        } else if (this.id == 'propCircle') {
            condition = "空間-自畫圓形";
            currentShape = $indexMap.editTools.startCircle();
        } else if (this.id == 'propPolygon') {
            condition = "空間-自畫多邊形";
            currentShape = $indexMap.editTools.startPolygon();
        }
    });
}

export function getShape() {
    return condition;
}

// 根據圖形篩選
export async function filterPropsByShape(gselectedId) {
    if (!shapeLayer) {
        return null;
    }
    try {
        // 正方形和多邊形的事件
        if (shapeLayer instanceof L.Rectangle || shapeLayer instanceof L.Polygon) {
            const ret = await getObjectsInBounds(shapeLayer.getBounds(), gselectedId);
            return ret;
        } else { // 圓形的事件
            const ret = await getObjectsInCircle(shapeLayer, gselectedId);
            return ret;
        }
    } catch (err) {
        console.error('Error in filterPropsByShape:', err);
        return null;
    }
}

// 取得邊界內所有彈出視窗元素
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

                if (subLayer instanceof L.Marker) {
                    // 如果是 Marker，取得座標
                    item['座標'] = subLayer.getLatLng();
                } else if (subLayer instanceof L.Polygon) {
                    // 計算多邊形的質心 (內心)
                    item['座標'] = calculatePolygonCentroid(subLayer.getLatLngs()[0]);
                    console.log("Polygon LatLng", subLayer.getLatLngs()[0]);
                } else if (subLayer instanceof L.Polyline) {
                    // Polyline 使用 getBounds().getCenter() 為近似中心
                    item['座標'] = subLayer.getBounds().getCenter();
                } else {
                    // 預設情況，取第一個座標
                    item['座標'] = subLayer.getLatLngs()[0];
                }

                filteredProps.push(item);
            } catch (err) {
                console.error('無法解析 JSON', err);
            }
        } else {
            console.error('未找到 .popupData 元素');
        }
    }

    return new Promise((resolve, reject) => {
        // 取得管線下所有圖層的資料
        $.ajax({
            url: `/api/MapAPI/GetLayerIdByPipeline?PipelineId=${gselectedId}`,
            method: 'POST',
            success: function (result) {
                try {
                    result.layerIdList.forEach(function (id) {
                        let layer = layers[id];
                        if (layer instanceof L.LayerGroup) {
                            layer.eachLayer(function (subLayer) {
                                if (subLayer instanceof L.Polygon && bounds.intersects(subLayer.getBounds())) {
                                    console.log("get polygon");
                                    count++;
                                    processPopupContent(subLayer);
                                }
                                else if (subLayer instanceof L.Marker && bounds.contains(subLayer.getLatLng())) {
                                    console.log("get Marker");
                                    count++;
                                    processPopupContent(subLayer);
                                } else if (subLayer instanceof L.Polyline && bounds.intersects(subLayer.getBounds())) {
                                    console.log("get Polyline");
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
// 計算多邊形質心的函式
function calculatePolygonCentroid(latlngs) {
    var x = 0, y = 0, signedArea = 0, a = 0;

    for (var i = 0; i < latlngs.length; i++) {
        var lat1 = latlngs[i].lat;
        var lng1 = latlngs[i].lng;
        var lat2 = latlngs[(i + 1) % latlngs.length].lat;
        var lng2 = latlngs[(i + 1) % latlngs.length].lng;

        // 計算三角形面積
        a = (lng1 * lat2 - lng2 * lat1);
        signedArea += a;

        // 累加坐標值
        x += (lng1 + lng2) * a;
        y += (lat1 + lat2) * a;
    }

    signedArea *= 0.5;
    x = x / (6 * signedArea);
    y = y / (6 * signedArea);

    return L.latLng(y, x); // 返回質心
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
    $indexMap.removeLayer(shapeLayer);
}