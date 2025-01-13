import { getIndexMap } from './map.js'
import { getCookie } from '../admin/UserRole.js'

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
let filterProject = [];
let pageSize = 10;
let currentPage = 1;

// Helper function: 處理 select 值
function convertSelectValue(value) {
    return value === "-1" || value === undefined ? null : value;
}

// Helper function: 處理 input 值
function convertInputValue(value) {
    return value.trim() === "" || value === undefined ? null : value.trim();
}

export function initProjectPanel() {
    $indexMap = getIndexMap();
    projectLayer.addTo($indexMap);
    $('#projectGoResult').click(function () {
        const formData = {
            adminDistrict: adminDists[$('#projectAdmin').val()], // 行政區
            startPoint: convertInputValue($('#projectStartPoint').val()), // 起點
            endPoint: convertInputValue($('#projectEndPoint').val()), // 終點
            roadLength: convertInputValue($('#projectRoadLength').val()), // 道路長度
            currentRoadWidth: convertInputValue($('#projectCurrentRoadWidth').val()), // 現況路寬
            plannedRoadWidth: convertInputValue($('#projectPlannedRoadWidth').val()), // 計畫路寬
            budgets: { // 經費資料
            constructionBudget: { // 工程經費
                option: convertSelectValue($('#constructionBudgetOption').val()),
                value: convertInputValue($('#constructionBudget').val())
            },
            landAcquisitionBudget: { // 用地經費
                option: convertSelectValue($('#landAcquisitionBudgetOption').val()),
                value: convertInputValue($('#landAcquisitionBudget').val())
            },
            compensationBudget: {
                option: convertSelectValue($('#compensationBudgetOption').val()),
                value: convertInputValue($('#compensationBudget').val())
            },
            totalBudgetRange: {
                start: convertInputValue($('#totalBudgetStart').val()),
                end: convertInputValue($('#totalBudgetEnd').val())
            }
            }
        };
        console.log(formData);
        $('#projectTbody').empty();
        // console.log(adminDists[admimVal], projectMoney, projectMoneyEnd);
        fetch(`/api/AdminAPI/getRoadProject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData),
        }).then(response => response.json())
        .then(data => {
            filterProject = data['roadProjects'];
            updateProjectTable();
        })
    });

    $("#protectPageSize").on('change', function () {
        pageSize = parseInt($(this).find('option:selected').text(), 10);
        currentPage = 1;
        updateProjectTable();
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

        $indexMap.setView([latitude, longitude], 19);
        console.log(data['points']['photoPoints']);
        // photoPoints:在地圖上添加marker
        data['points']['photoPoints'].forEach(point => {
            // 添加 marker
            let marker = L.marker([point['latitude'], point['longitude']]).addTo(projectLayer);
        
            // 創建 popupContent
            let popupContent = document.createElement('div');
            popupContent.id = 'photoPopup';
        
            // 添加圖片
            let img = document.createElement('img');
            let src = `/roadProject/${point['url']}?v=${new Date().getTime()}`;
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
                        formData.append('PhotoName', point['url']);
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
        
            // 綁定 popup
            marker.bindPopup(popupContent, {
                maxWidth: 450,
                maxHeight: 350
            });
        });
        console.log(data['points']['rangePoints']);
        // rangePoints:在地圖上添加polygon
        var rangePoints = data['points']['rangePoints'].map(coord => [coord.latitude, coord.longitude]);
        var polygon = L.polygon(rangePoints, {color: 'red'}).addTo(projectLayer);
        var prop = data['points']['rangePoints'][0]['prop'];
        // prop 轉換成json
        polygon.bindPopup(`
            <div>
                <text style="font-size: 25px; font-weight: bolder;">
                    圖層：道路專案
                </text>
                <div style="font-size: 20px;">
                    ${popUpForm(prop)}
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
    console.log(prop);
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
        // if (!propMap[key]) return;
        let value = prop[key];
    
        // 如果是CurrentRoadWidth、PlannedRoadWidth，轉換成json格式，並顯示路寬與路況
        if (["CurrentRoadWidth", "PlannedRoadWidth"].includes(key)) {
            const parsedValue = JSON.parse(value);
            value = `${parsedValue["路寬"]} | ${parsedValue["路況"]}`;
        }
    
        // 如果是ConstructionBudget等，則轉換成萬元
        if (["ConstructionBudget", "LandAcquisitionBudget", "CompensationBudget", "TotalBudget"].includes(key)) {
            value = value === 0 ? value : value / 10000 + '萬';
        }
    
        // 如果是PublicPrivateLand等，則顯示筆數
        if (["PublicLand", "PrivateLand", "PublicPrivateLand"].includes(key)) {
            value += "筆";
        }
    
        console.log(value);
        table += `<tr><th style="width: 40%;">${propMap[key]}</th><td>${value}</td></tr>`;
    });
    
    table += '</table>';

    return `
        <div class="popup-table">
            ${table}
        </div>
    `;
}

// 更新道路專案表格
function updateProjectTable(){
    // 更新總頁數
    const totalPages = Math.ceil(filterProject.length / pageSize);
    // 當前頁數索引範圍
    const startIndex = (currentPage - 1) * pageSize;
    // 取得當前頁數的範圍資料
    const pageData = filterProject.slice(startIndex, startIndex + pageSize);
    // 添加當前範圍內的資料
    renderTableBody(pageData);
    // 更新分頁按鈕
    updatePagination(totalPages);
}

// 渲染道路專案表格
function renderTableBody(pageData){
    const projectTbody = $('#projectTbody');
    projectTbody.empty();
    pageData.forEach(project => {
        const tableRow = $('<tr></tr>');
        const targetBtn = $('<button>目標</button>').on('click', function () {
            if (currentRow) {
                currentRow.removeClass('selectRow');
            }
            currentRow = $(this).closest('tr');
            currentRow.addClass('selectRow');
            addLayerToMap(project['id']);
            console.log(project['plannedExpansionId'], project['streetViewId']);
        });
        // 預設儲存按鈕不顯示
        // 編輯與儲存交替顯示
        const editBtn = $('<button>編輯</button>').on('click', function () {
            if (currentRow) {
                currentRow.removeClass('selectRow');
            }
            currentRow = $(this).closest('tr');
            currentRow.addClass('selectRow');
            // 將td內容轉換成input
            const tds = $(this).closest('tr').find('td');
            tds.each(function (index) {
                if (index < 2) return;
                const text = $(this).text();
                // 行政區改成select，預設值為原本的行政區
                if (index === 3) {
                    $(this).html(`<select>
                        ${adminDists.map((district, index) => 
                            `<option value="${index + 1}" ${district === text ? 'selected' : ''}>
                                ${district}
                            </option>`).join('')}
                    </select>`);
                    return;
                }

                // 起訖位置改成兩個input，一個起點，一個終點
                if (index === 4) {
                    var input = text.split('至');
                    $(this).html(`<input type="text" value="${input[0]}"> 至 <input type="text" value="${input[1]}">`);
                    return;
                }
                // 目前路寬	計畫路寬改成兩個input，一個是路寬數值(數字)，一個是類別(文字)，ex: 8公尺 | 都計道路 或著 0公尺、未開闢
                if (index === 6 || index === 7) {
                    var input = text.split('|');
                    console.log(input);
                    $(this).html(`<input type="text" value="${input[0].replace('公尺', '').trim()}">公尺 | <input type="text" value="${input[1].trim()}">`);
                    return;
                }
                if(index === 8 || index === 9 || index === 10) {
                    $(this).html(`<input type="text" value="${text.replace('筆', '')}">`);
                    return;
                }
                // 工程經費	用地經費 補償經費 總經費，去掉萬，輸入數字即可
                if (index === 11 || index === 12 || index === 13 || index === 14) {
                    $(this).html(`<input type="text" value="${text.replace('萬', '')}">`);
                    return;
                }
                if (index === 15) {
                    // 備註欄改成textarea
                    $(this).html(`<textarea style=""weight:100%">${text}</textarea>`);
                    return;
                }
                $(this).html(`<input type="text" value="${text}">`);
            });
            $(this).hide();
            $(this).siblings('button:contains("儲存")').show();
        });
        
        const saveBtn = $('<button>儲存</button>').on('click', function () {
            // 將input內容轉換成td
            const tds = $(this).closest('tr').find('td');
            var updateForm = new FormData();
            updateForm.append('Id', project['id']);
            tds.each(function (index) { 
                if (index < 2) return;
                // 把所有欄位都變回text，並且儲存修改過的值，不管是select、input、textarea
                const input = $(this).find('input, select, textarea');
                const text = input.val();
                if (index === 2) {
                    $(this).text(text);
                    updateForm.append('Proposer', text);
                    return;
                }
                if (index === 3) {
                    $(this).text(adminDists[text - 1]);
                    updateForm.append('AdministrativeDistrict', adminDists[text - 1]);
                    return;
                }
                if (index === 4) {
                    $(this).text(`${input[0].value}至${input[1].value}`);
                    updateForm.append('StartPoint', input[0].value);
                    updateForm.append('EndPoint', input[1].value);
                    updateForm.append('StartEndLocation', `${input[0].value}至${input[1].value}`);
                    return;
                }
                if(index === 5) {
                    $(this).text(text);
                    updateForm.append('RoadLength', text);
                    return;
                }
                if (index === 6 || index === 7) {
                    $(this).text(`${input[0].value}公尺|${input[1].value}`);
                    if(index === 6) {
                        updateForm.append('CurrentRoadWidth', JSON.stringify({路寬: input[0].value, 路況: input[1].value}));
                    }
                    if(index === 7) {
                        updateForm.append('PlannedRoadWidth', JSON.stringify({路寬: input[0].value, 路況: input[1].value}));
                    }
                    return;
                }
                if(index === 8 || index === 9 || index === 10) {
                    $(this).text(`${text}筆`);
                    if(index === 8) {
                        updateForm.append('PublicLand', text.replace('筆', ''));
                    }
                    if(index === 9) {
                        updateForm.append('PrivateLand', text.replace('筆', ''));
                    }
                    if(index === 10) {
                        updateForm.append('PublicPrivateLand', text.replace('筆', ''));
                    }
                    return;
                }
                if (index === 11 || index === 12 || index === 13 || index === 14) {
                    $(this).text(`${text}萬`);
                    if(index === 11) {
                        updateForm.append('ConstructionBudget', text * 10000);
                    }
                    if(index === 12) {
                        updateForm.append('LandAcquisitionBudget', text * 10000);
                    }
                    if(index === 13) {
                        updateForm.append('CompensationBudget', text * 10000);
                    }
                    if(index === 14) {
                        updateForm.append('TotalBudget', text * 10000);
                    }
                    return;
                }
                if(index === 15) {
                    $(this).text(text);
                    updateForm.append('Remarks', text);
                    return;
                }
            });
            // 印出formdata的值
            for (var pair of updateForm.entries()) {
                console.log(pair[0]+ ', ' + pair[1]); 
            }


            // 取得更新後的所有值
            // 透過/api/AdminAPI/UpdateRoadProject更新資料
            fetch(`/api/AdminAPI/updateProjectData`, {  
                method: 'POST',
                body: updateForm
            })
            .then(res => {
            return res.json().then(data => ({ status: res.status, body: data }));
        })
        .then(({ status, body }) => {
            console.log(status, body);
        });

            $(this).hide();
            $(this).siblings('button:contains("編輯")').show();
        }).hide();
        // 轉換project['currentRoadWidth']
        const parsedValue = JSON.parse(project['currentRoadWidth']);
        const currentRoadWidth = `${parsedValue["路寬"]} | ${parsedValue["路況"]}`;
        const parsedValue2 = JSON.parse(project['plannedRoadWidth']);
        const plannedRoadWidth = `${parsedValue2["路寬"]} | ${parsedValue2["路況"]}`;
        var projectRow = `
                <td>${project['proposer']}</td>
                <td>${project['administrativeDistrict']}</td>
                <td>${project['startEndLocation']}</td>
                <td>${project['roadLength']}</td>
                <td>${currentRoadWidth}</td>
                <td>${plannedRoadWidth}</td>
                <td>${project['publicLand']}筆</td>
                <td>${project['privateLand']}筆</td>
                <td>${project['publicPrivateLand']}筆</td>
                <td>${project['constructionBudget'] === 0 ? project['constructionBudget'] : project['constructionBudget']/10000 + '萬'}</td>
                <td>${project['landAcquisitionBudget'] === 0 ? project['landAcquisitionBudget'] : project['landAcquisitionBudget']/10000 + '萬'}</td>
                <td>${project['compensationBudget'] === 0 ? project['compensationBudget'] : project['compensationBudget']/10000 + '萬'}</td>
                <td>${project['totalBudget'] === 0 ? project['totalBudget'] : project['totalBudget']/10000 + '萬'}</td>
                <td>${project['remarks']}</td>
                `
        tableRow.append($('<td></td>').append(targetBtn));
        tableRow.append($('<td></td>').append(editBtn, saveBtn));
        tableRow.append(projectRow);
        projectTbody.append(tableRow);
    });
}

function updatePagination(totalPages){
    // 更新分頁按鈕
    const $pagination = $('#protectPages');
    $pagination.empty();
    for (let i = 1; i <= totalPages; i++) {
        const pageButton = $('<a></a>')
            .text(i)
            .toggleClass('select', i === currentPage)
            .on('click', function () {
                currentPage = i;
                updateProjectTable();
            });
        $pagination.append(pageButton);
    }
}