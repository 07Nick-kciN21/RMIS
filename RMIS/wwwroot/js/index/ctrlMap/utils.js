import { getIndexMap, popupEnabled } from '../map.js'; 
import { getCookie } from '../../admin/UserRole.js'

let currentRectangle = null; // 用於保存當前的矩形
let currentLine = null; // 用於保存當前的線段
let currentPolygon = null; // 用於保存當前的多邊形
let currentArrow = null; // 用於保存當前的箭頭線段

// 將標記加入圖層
export function addMarkersToLayer(points, newLayer, svg, name) {
    var $indexMap = getIndexMap();
    let icon = L.icon({
        iconUrl: `/img/${svg}`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15]
    });
    points.forEach(function (point) {
        let marker = L.marker(point[0], {
            icon: icon,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            popupAnchor: [0, -15],
        }).addTo(newLayer);

        let prop = point[1];
        let popupContent = name == "街景照片" ? popupPhoto(prop) : `
                <div class="popupData" style="display: none;">
                    ${prop}
                </div>
                <div style="font-size: 18px;">
                    <text style="font-size: 25px; font-weight: bolder;">
                        圖層：${name}
                    </text>
                    <div>
                        ${popUpForm(prop)}
                    </div> 
                </div>`;

        marker.bindPopup(popupContent, {
            maxWidth: 450,
            maxHeight: 350
        });
        marker.on('click', function (e) {
            console.log("Marker Clicked",popupEnabled);
            if(popupEnabled){
                const latLng = e.latlng;
                $indexMap.setView(latLng, $indexMap.getZoom());

                if (currentRectangle) {
                    newLayer.removeLayer(currentRectangle);
                }

                const squareIcon = L.divIcon({
                    html: `<svg width="24" height="24">
                            <rect 
                            x="0" 
                            y="0" 
                            width="24" 
                            height="24" 
                            fill="none" 
                            stroke="#0066CC" 
                            stroke-width="3"
                            />
                        </svg>`,
                    className: 'square-marker',  // 避免 Leaflet 默認樣式
                    iconSize: [24, 24],         // 圖標大小
                    iconAnchor: [12, 12]        // 錨點在正方形中心
                });

                currentRectangle = L.marker(latLng, { icon: squareIcon }).addTo(newLayer);

                const mapClickHandler = function (e) {
                    if (currentRectangle) {
                        newLayer.removeLayer(currentRectangle);
                        console.log("Removed currentRectangle");
            
                        // 事件執行一次後立即移除
                        $indexMap.off('click', mapClickHandler);
                    }
                };
                // 動態綁定地圖點擊事件
                $indexMap.on('click', mapClickHandler);
            }
            else{ 
                e.target.closePopup();
            }
        });
        marker._isVisible = true;
        point[2].Instance = marker;
    });
    console.log("Create Maker");
}

export function addLineToLayer(points, newLayer, color, name) {
    var $indexMap = getIndexMap();
    var zoom = $indexMap.getZoom();
    let segment = null;
    console.log("Create Line");
    for (var i = 0; i < points.length - 1; i++) {
        var startPoint = points[i][0];
        var endPoint = points[i + 1][0];
        var prop = points[i][1];

        // 創建線段
        segment = L.polyline([startPoint, endPoint], {
            color: color
        }).addTo(newLayer);

        // 為每個線段綁定 Popup，顯示其起點和終點座標
        segment.bindPopup(`
            <div class="popupData" style="display: none;">
                ${prop}
            </div>
            <div style="font-size: 18px;">
                <h4>圖層：${name}</h4><br>
                ${popUpForm(prop)}
            </div>`, {
            maxWidth: 350,
            maxHeight: 450
        });

        segment.on('click', function (e) {
            if(popupEnabled){
                if (currentLine) {
                    $indexMap.removeLayer(currentLine);
                }
    
                // 將當前點擊的線段設置為白色並增加線段寬度
                currentLine = L.polyline(e.target.getLatLngs(), {
                    color: 'white',
                    opacity: 0.8
                }).addTo(newLayer);
                
                // 移動地圖中央到點擊的點
                const latLng = e.latlng; // 取得點擊事件中的座標
                $indexMap.setView(latLng, $indexMap.getZoom()); // 將地圖的中央移動到該點，保持當前縮放級別
                
                const mapClickHandler = function (e) {
                    if (currentLine) {
                        newLayer.removeLayer(currentLine);
                        console.log("Removed currentLine");
                    }
                    $indexMap.off('click', mapClickHandler);
                };

                $indexMap.on('click', mapClickHandler);
            }
            else{ 
                // popupEnabled為false時，不顯示popup
                e.target.closePopup();
            }
        });
        segment._isVisible = true;
        points[i][2].Instance = segment;
    }
}

export function addPolygonToLayer(points, newLayer, color, name) {
    var $indexMap = getIndexMap();
    var pointGroup = [];
    var prop = points[0][1];

    // 把points的所有[0]取出集合
    for (var i = 0; i < points.length; i++) {
        pointGroup.push(points[i][0]);
    }
    // 創建 Leaflet Polygon
    let polygon = L.polygon(pointGroup, {
        color: "#000000",       // 邊框顏色
        opacity: 0,             // 邊框透明度
        fillColor: color,       // 填充顏色
        fillOpacity: 0         // 填充透明度
    }).addTo(newLayer);
    polygon.bindPopup(`
            <div class="popupData" style="display: none;">
                ${prop}
            </div>
            <div>
                <text style="font-size: 25px; font-weight: bolder;">
                    圖層：${name}
                </text>
                <div style="font-size: 20px;">
                    ${ name == "預拓範圍" ? popupProjectFrom(prop) : popUpForm(prop)}
                </div>
            </div>`, {
        maxWidth: 350,
        maxHeight: 450
    });
    points = points[0][2].Instance = polygon;
    // 點擊多邊形設為相反色
    polygon.on('click', function () {
        if(popupEnabled){
            const inverseColor = getInverseColor(color);
            
            // 如果有已記錄的多邊形，重置它的顏色
            if (currentPolygon && currentPolygon !== this) {
                currentPolygon.setStyle({ fillColor: color });
            }

            // 更新目前點選的多邊形
            currentPolygon = this;
            polygon.setStyle({ fillColor: inverseColor });

            const mapClickHandler = function (e) {
                // 重置當前多邊形的顏色
                if (currentPolygon) {
                    currentPolygon.setStyle({ fillColor: color });
                    currentPolygon = null; // 清空記錄
                }
                console.log("Reset currentPolygon");
                $indexMap.off('click', mapClickHandler);
            };
            
            $indexMap.on('click', mapClickHandler);
        }
        else{ 
            // popupEnabled為false時，不顯示popup
            polygon.closePopup();
        }
    });

    polygon._isVisible = true;
}

// 添加箭頭線段
export function addArrowlineToLayer(points, newLayer, color, name) {
    var $indexMap = getIndexMap();
    function addArrowToLine(line, color) {
        var arrow = L.polylineDecorator(line, {
            patterns: [
                {   
                    offset: '100%',
                    repeat: 0,      // 不重複，僅在尾端顯示箭頭
                    symbol: L.Symbol.arrowHead({
                        pixelSize: 25,
                        pathOptions: {
                            fillOpacity: 1,
                            weight: 0,
                            color: color,
                            interactive: false, // 禁用互動
                        }
                    })
                }
            ]
        }).addTo(newLayer);
    }
    // 把所有points的[0]取出集合
    let pointGroup = [];
    for (let i = 0; i < points.length; i++) {
        if (points[i] && points[i][0]) {
            pointGroup.push(points[i][0]); // 提取座標點
        }
    }
    // 建立arrowline
    let arrowline = L.polyline(pointGroup,{ 
        color: color, 
         
    }).addTo(newLayer);
    // 在線段加上popup
    arrowline.bindPopup(`
        <div class="popupData" style="display: none;">
            ${points[0][1]}
        </div>
        <div>
            <text style="font-size: 25px; font-weight: bolder;">
                圖層：${name}
            </text>
            <div style="font-size: 20px;">
                ${popUpForm(points[0][1])}
            </div>
        </div>`, {
        maxWidth: 350,
        maxHeight: 450
    });
    // 在尾端添加箭頭
    addArrowToLine(arrowline, color);
    arrowline.on('click', function (e) {
        if(popupEnabled){
            if(currentArrow){
                $indexMap.removeLayer(currentArrow);
            }
            const inverseColor = getInverseColor(color);
            currentArrow = L.polyline(arrowline.getLatLngs(), {
                color: inverseColor,
                opacity: 0.8
            }).addTo(newLayer);
            const latLng = e.latlng; // 取得點擊事件中的座標
            $indexMap.setView(latLng, $indexMap.getZoom()); // 將地圖的中央移動到該點，保持當前縮放級別

            const mapClickHandler = function (e) {
                if(currentArrow){
                    $indexMap.removeLayer(currentArrow);
                }
                $indexMap.off('click', mapClickHandler);
            };

            $indexMap.on('click', mapClickHandler);
        }
        else{ 
            // popupEnabled為false時，不顯示popup
            arrowline.closePopup();
        }
    });
}

function getInverseColor(color) {
    if (!color.startsWith("#")) return "#FFFFFF"; // 預設為白色

    const hex = color.replace("#", "");
    const r = 255 - parseInt(hex.substring(0, 2), 16);
    const g = 255 - parseInt(hex.substring(2, 4), 16);
    const b = 255 - parseInt(hex.substring(4, 6), 16);
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()}`;
}

function popUpForm(prop) {
    if (typeof prop === 'string') {
        prop = prop.replace(/NaN/g, 'null');
        try {
            prop = JSON.parse(prop);
        } catch (e) {
            console.error("無法解析 JSON:", e);
            return "無效的 JSON 資料";
        }
    }

    let table = '<table class="popup-table-content"  cellpadding="5" cellspacing="0">';

    Object.keys(prop).forEach(key => {
        table += `<tr><th>${key}</th><td>${prop[key]}</td></tr>`;
    });

    table += '</table>';

    return `
        <div class="popup-table">
            ${table}
        </div>
    `;
}

function popupPhoto(prop){
    let url = JSON.parse(prop);
    console.log(url);
    // 創建 popupContent
    let popupContent = document.createElement('div');
    popupContent.id = 'photoPopup';

    // 添加圖片
    let img = document.createElement('img');
    let src = `/roadProject/${url["url"]}?v=${new Date().getTime()}`;
    img.src = src;
    img.style.width = '450px';
    img.style.height = '300px';
    popupContent.appendChild(img);

    // 編輯按鈕 => 選擇圖片 => 顯示圖片 => 儲存
    // 如果用戶角色為 Admin，添加編輯按鈕和文件輸入框
    if (getCookie('UserRole') === 'Admin') {
        let editBtn = document.createElement('button');
        editBtn.className = 'btn btn-primary';
        editBtn.innerText = '編輯圖片';
        editBtn.addEventListener('click', () => {
            // 編輯按鈕
            document.getElementById(`photoEdit`).click();
        });

        let fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = `photoEdit`;
        fileInput.style.display = 'none';
        // 選擇圖片
        fileInput.addEventListener('change', event => {
            const file = event.target.files[0];
            if (file) {
                // 把img的src改成file的url
                img.src = URL.createObjectURL(file);
                editBtn.style.display = 'none';
                saveBtn.style.display = 'inline-block';
                cancelBtn.style.display = 'inline-block';
            }
        });
        
        let saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-success';
        saveBtn.innerText = '儲存';
        saveBtn.style.display = 'none';
        saveBtn.addEventListener('click', () => {
            if(confirm('是否修改圖片')){
                console.log('修改圖片');
                var formData = new FormData();
                formData.append('Photo', fileInput.files[0]);
                formData.append('PhotoName', url);
                fetch(`/api/AdminAPI/updateProjectPhoto`, {
                    method: 'POST',
                    body: formData
                }).then(response => {
                    img.src = `${src}?v=${new Date().getTime()}`;
                    saveBtn.style.display = 'none';
                    cancelBtn.style.display = 'none';
                    editBtn.style.display = 'inline-block';
                });
            } 
        });
        let cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.innerText = '取消';
        cancelBtn.style.display = 'none';
        cancelBtn.addEventListener('click', () => {
            img.src = src;
            saveBtn.style.display = 'none';
            cancelBtn.style.display = 'none';
            editBtn.style.display = 'inline-block';
        });
        popupContent.appendChild(editBtn);
        popupContent.appendChild(saveBtn);
        popupContent.appendChild(cancelBtn);
        popupContent.appendChild(fileInput);
    }
    return popupContent;
}

function popupProjectFrom(prop){
    if (typeof prop === 'string') {
        prop = prop.replace(/NaN/g, 'null');
        try {
            prop = JSON.parse(prop);
        } catch (e) {
            console.error("無法解析 JSON:", e);
            return "無效的 JSON 資料";
        }
    }
    let table = '<table class="popup-table-content"  cellpadding="5" cellspacing="0">';
    
    Object.keys(prop).forEach(key => {
        // 如果key不存在於propMap中，則不顯示
        // if (!propMap[key]) return;
        let value = prop[key];
    
        // 如果是CurrentRoadWidth、PlannedRoadWidth，轉換成json格式，並顯示路寬與路況
        if (["現況路寬", "計畫路寬"].includes(key)) {
            const parsedValue = JSON.parse(value);
            value = `${parsedValue["路寬"]} | ${parsedValue["路況"]}`;
        }
    
        // 如果是ConstructionBudget等，則轉換成萬元
        if (["工程經費", "用地經費", "補償經費", "合計經費"].includes(key)) {
            value = value === 0 ? value : value / 10000 + '萬';
        }
    
        // 如果是PublicPrivateLand等，則顯示筆數
        if (["公有土地", "私有土地", "公私土地"].includes(key)) {
            value += "筆";
        }
        table += `<tr><th style="width: 40%;">${key}</th><td>${value}</td></tr>`;
    });
    
    table += '</table>';

    return `
        <div class="popup-table">
            ${table}
        </div>
    `;
}