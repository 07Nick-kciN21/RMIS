import { getIndexMap } from './map.js'

const adminDists = [
    "桃園區",  // value: 1
    "大溪區",  // value: 2
    "中壢區",  // value: 3
    "楊梅區",  // value: 4
    "蘆竹區",  // value: 5
    "大園區",  // value: 6
    "龜山區",  // value: 7
    "八德區",  // value: 8
    "龍潭區",  // value: 9
    "平鎮區",  // value: 10
    "新屋區",  // value: 11
    "觀音區",  // value: 12
    "復興區"   // value: 13
];

let currentRow = null;
let $indexMap;
let projectLayer = L.layerGroup();
// Helper function: 處理 select 值
function convertSelectValue(value) {
    return value === "-1" ? null : value;
}

// Helper function: 處理 input 值
function convertInputValue(value) {
    return value.trim() === "" ? null : value.trim();
}

export function initProjectPanel() {
    $indexMap = getIndexMap();
    projectLayer.addTo($indexMap);
    $('#projectGoResult').click(function () {
        const formData = {
            adminDistrict: adminDists[$('#projectAdmin').val()], // 行政區
            startPoint: convertInputValue($('#StartPoint').val()), // 起點
            endPoint: convertInputValue($('#EndPoint').val()), // 終點
            roadLength: convertInputValue($('#RoadLength').val()), // 道路長度
            currentRoadWidth: convertInputValue($('#CurrentRoadWidth').val()), // 現況路寬
            plannedRoadWidth: convertInputValue($('#PlannedRoadWidth').val()), // 計畫路寬
            budgets: { // 經費資料
                projectBudget: {
                    option: convertSelectValue($('#projectBudgetOption').val()),
                    value: convertInputValue($('#projectBudgetEnd').val())
                },
                landBudget: {
                    option: convertSelectValue($('#projectLandBudgetOption').val()),
                    value: convertInputValue($('#projectLandBudgetEnd').val())
                },
                compensationBudget: {
                    option: convertSelectValue($('#projectCompensationBudgetOption').val()),
                    value: convertInputValue($('#projectCompensationBudgetEnd').val())
                },
                totalBudgetRange: {
                    start: convertInputValue($('#projectBudget').val()),
                    end: convertInputValue($('#projectBudgetEnd').val())
                }
            }
        };
        console.log(formData);
        $('#projectTbody').empty();
        // console.log(adminDists[admimVal], projectMoney, projectMoneyEnd);
        fetch(`/api/AdminAPI/getRoadProjectByBudget`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData),
        }).then(response => response.json())
        .then(data => {
            console.log(data);
            data['roadProjects'].forEach(project => {
                console.log(project);
                const tableRow = $('<tr></tr>');
                const button = $('<button>目標</button>').on('click', function () {
                    if (currentRow) {
                        currentRow.removeClass('selectRow');
                    }
                    currentRow = $(this).closest('tr');
                    currentRow.addClass('selectRow');
                    addLayerToMap(project['id']);
                    console.log(project['plannedExpansionId'], project['streetViewId']);
                });
                var projectRow = `
                        <td>${project['proposer']}</td>
                        <td>${project['administrativeDistrict']}</td>
                        <td>${project['startEndLocation']}</td>
                        <td>${project['roadLength']}</td>
                        <td>${project['currentRoadWidth']}</td>
                        <td>${project['plannedRoadWidth']}</td>
                        <td>${project['publicLand']}</td>
                        <td>${project['privateLand']}</td>
                        <td>${project['publicPrivateLand']}</td>
                        <td>${project['constructionBudget'] === 0 ? project['constructionBudget'] : project['constructionBudget']/10000 + '萬'}</td>
                        <td>${project['landAcquisitionBudget'] === 0 ? project['landAcquisitionBudget'] : project['landAcquisitionBudget']/10000 + '萬'}</td>
                        <td>${project['compensationBudget'] === 0 ? project['compensationBudget'] : project['compensationBudget']/10000 + '萬'}</td>
                        <td>${project['totalBudget'] === 0 ? project['totalBudget'] : project['totalBudget']/10000 + '萬'}</td>
                        <td>${project['remarks']}</td>
                        `
                tableRow.append($('<td></td>').append(button));
                tableRow.append(projectRow);
                $('#projectTbody').append(tableRow);
            });
        })
    });
}

function addLayerToMap(projectId) {
    fetch(`/api/AdminAPI/GetPointsByProjectId?projectId=${projectId}`, {
        method: 'POST'
    }).then(response => response.json())
    .then(data => {
        console.log(data['points']['photoPoints']);
        // 移除projectLayer中的所有圖層
        projectLayer.clearLayers();

        // 焦點移置data['points']['rangePoints']的起點
        var {latitude, longitude} = data['points']['rangePoints'][0];

        $indexMap.setView([latitude, longitude], 18);
        // photoPoints:在地圖上添加marker
        data['points']['photoPoints'].forEach(point => {
            // 添加marker
            let marker = L.marker([point['latitude'], point['longitude']]).addTo(projectLayer);
            marker.bindPopup(`
                <div>
                    <img src="/img/roadProject/${point['url']}" style="width: 350px; height: auto;">
                </div>`, {
                maxWidth: 350,
                maxHeight: 200
            });
        });
        console.log(data['points']['rangePoints']);
        // rangePoints:在地圖上添加polygon
        var rangePoints = data['points']['rangePoints'].map(coord => [coord.latitude, coord.longitude]);
        var polygon = L.polygon(rangePoints, {color: 'red'}).addTo(projectLayer);
        var prop = data['points']['rangePoints'][0]['prop'];
        // prop 轉換成json
        polygon.bindPopup(`
            <div style="font-size: 18px;">
                <h4>圖層：道路專案</h4>
                <div>
                    <p>${popUpForm(prop)}</p>
                </div>
            </div>`, {
            maxWidth: 350,
            maxHeight: 450
        });
    });
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
    
    const propMap = {
        "Proposer": "提案人",
        "AdministrativeDistrict": "行政區",
        "StartEndLocation": "起訖位置",
        "RoadLength": "道路長度",
        "CurrentRoadWidth": "現況路寬",
        "PlannedRoadWidth": "計畫路寬",
        "PublicLand": "公有土地",
        "PrivateLand": "私有土地",
        "PublicPrivateLand": "公私土地",
        "ConstructionBudget": "工程經費",
        "LandAcquisitionBudget": "用地經費",
        "CompensationBudget": "補償經費",
        "TotalBudget": "合計經費",
        "Remarks": "備註"
    };
    
    Object.keys(prop).forEach(key => {
        // 如果key不存在於propMap中，則不顯示
        if (!propMap[key]) return;
        var value = prop[key];
        // 如果是PublicPrivateLand、ConstructionBudget、LandAcquisitionBudget、CompensationBudget、TotalBudget，則轉換成萬元，否則直接顯示
        value = ["ConstructionBudget", "LandAcquisitionBudget", "CompensationBudget", "TotalBudget"].includes(key) ? prop[key] === 0 ? prop[key] : prop[key] / 10000 + '萬' : prop[key];
        value = ["PublicLand", "PrivateLand ", "PublicPrivateLand"].includes(key) ? value + "筆" : value;
        table += `<tr><th>${propMap[key]}</th><td>${value}</td></tr>`;
    });
    table += '</table>';

    return `
        <div class="popup-table">
            ${table}
        </div>
    `;
}

function add2List(){
    let layerItem = `
        <div class="layerBar featureLayer-Bg" id="layerBar_${id}">
            <div class="layerTitle" style="border-top">
                <div style="display: flex; border-bottom: solid 1px green;"> 
                    <span class="menu-icon menu-open" id="layerLegend_${id}"></span>
                    <div class="layerName">道路專案</div>
                </div>
                <div id="sections_${id}">
                    ${sections}
                </div>
            </div>
            <div class="more more-off" id="more_${id}">
                <ul class="moreMenu" >
                    <li id="more_action1_${id}">縮放至</li>
                    <li id="more_action2_${id}">編輯圖徽</li>
                    <li id="more_action3_${id}">檢視詮釋資料</li>
                    <li id="more_action4_${id}">
                        透明度
                        <input class="layerOpacity" type="text" value="100" placeholder="100">
                    </li>
                </ul>
            </div>
            <div class="eye eyeOpen" id="eye_${id}"></div>
            <div class="layerRemove" id="layerRemove_${id}"></div>
        </div>
    `;
}