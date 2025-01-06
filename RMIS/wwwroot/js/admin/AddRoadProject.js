

$(document).ready(function () {
    let expansionRangeIndex = 0;
    let streetViewPhotoIndex = 0;
    let rangeList = [];
    let photoList = [];
    const adminDists = [
        "桃園區",  
        "大溪區",
        "中壢區", 
        "楊梅區",
        "蘆竹區",
        "大園區", 
        "龜山區", 
        "八德區", 
        "龍潭區",
        "平鎮區", 
        "新屋區", 
        "觀音區", 
        "復興區"
    ];
    let newWindow;
    $("#submit").on('click', function (e) {
        e.preventDefault();

        // 檢查必填欄位
        const requiredFields = [
            { id: "#Proposer", name: "Proposer" },
            { id: "#adminSelect", name: "Admin District" },
            { id: "#StartPoint", name: "Start Point" },
            { id: "#EndPoint", name: "End Point" },
            { id: "#RoadLength", name: "Road Length" },
            { id: "#CurrentRoadWidth", name: "Current Road Width" },
            { id: "#CurrentRoadType", name: "Current Road Type" },
            { id: "#PlannedRoadWidth", name: "Planned Road Width" },
            { id: "#PlannedRoadType", name: "Planned Road Type" },
            { id: "#PublicLand", name: "Public Land" },
            { id: "#PrivateLand", name: "Private Land" },
            { id: "#PublicPrivateLand", name: "Public & Private Land" },
            { id: "#ConstructionBudget", name: "Construction Budget" },
            { id: "#LandBudget", name: "Land Budget" },
            { id: "#CompensationBudget", name: "Compensation Budget" },
            { id: "#TotalBudget", name: "Total Budget" }
        ];

        let missingFields = []; // 用於儲存未填寫的欄位名稱
        for (const field of requiredFields) {
            const value = $(field.id).val();
            if (!value || value.trim() === "") {
                missingFields.push(field.name);
            }
        }

        // 如果有缺少的欄位，顯示一次性提示
        if (missingFields.length > 0) {
            alert(`以下欄位尚未填寫：\n${missingFields.join("\n")}`);
            return;
        }
        
        const input = new FormData();
        input.append("Proposer", $("#Proposer").val());
        input.append("AdminDistrict", adminDists[$("#adminSelect").val()]);
        input.append("StartPoint", $("#StartPoint").val());
        input.append("EndPoint", $("#EndPoint").val());
        input.append("RoadLength", $("#RoadLength").val());
        input.append("CurrentRoadWidth", $("#CurrentRoadWidth").val());
        input.append("CurrentRoadType", $("#CurrentRoadType").val());
        input.append("PlannedRoadWidth", $("#PlannedRoadWidth").val());
        input.append("PlannedRoadType", $("#PlannedRoadType").val());
        input.append("PublicLand", $("#PublicLand").val());
        input.append("PrivateLand", $("#PrivateLand").val());
        input.append("PublicPrivateLand", $("#PublicPrivateLand").val());
        input.append("ConstructionBudget", $("#ConstructionBudget").val());
        input.append("LandBudget", $("#LandBudget").val());
        input.append("CompensationBudget", $("#CompensationBudget").val());
        input.append("TotalBudget", $("#TotalBudget").val());
        input.append("Remark", $("#Remark").val());
        rangeList.forEach((item, index) => {
            input.append(`ExpansionRange[${index}].Id`, item.Id);
            input.append(`ExpansionRange[${index}].Latitude`, item.Latitude);
            input.append(`ExpansionRange[${index}].Longitude`, item.Longitude);
        });
        photoList.forEach((item, index) => {
            input.append(`StreetViewPhoto[${index}].Id`, item.Id);
            input.append(`StreetViewPhoto[${index}].Latitude`, item.Latitude);
            input.append(`StreetViewPhoto[${index}].Longitude`, item.Longitude);
            input.append(`StreetViewPhoto[${index}].Photo`, item.Photo);
            input.append(`StreetViewPhoto[${index}].PhotoName`, item.PhotoName);
        });
        console.log(...input.entries()); // 检查 FormData 内容
        fetch('/Admin/AddRoadProject', {
            method: 'POST',
            body: input
        }).then(res => {
            if (res.ok) {
                alert(res.ok);
            } else {
                alert('提交失敗');
            }
        }).catch(err => {
            console.error(err);
            alert(err);
        });
    });
    
    $('#addRangeBtn').on('click', function () {
        newWindow = window.open('/Admin/ExpansionRangeMap', 'newWindow', 'width=600,height=400');
    });
    
    //#addPhotoBtn 按鈕被點擊時，開啟新視窗
    $('#addPhotoBtn').on('click', function () {
        newWindow = window.open('/Admin/StreetViewPhotoMap', 'newWindow', 'width=600,height=400');
    });
    
    // 接收新視窗的訊息
    window.addEventListener('message', function(event) {
        if (event.origin !== window.location.origin) return; // 安全性驗證
        const message = JSON.parse(event.data);
        const data = message.data;
        if(message.type == "range"){
            const rangeTable = $('#rangeTable');
            rangeTable.find('tbody').empty();
            rangeList.length = 0;
            for(let i = 0; i < data.length; i++) {
                rangeItem = { Id:i, Latitude: data[i].lat, Longitude: data[i].lng };
    
                rangeList.push(rangeItem);
                // 在 rangeTable 中新增一個新的 td
                var newRow = rangeTable.find('tbody').append('<tr></tr>');
                newRow.append(`<td>${expansionRangeIndex}</td>`);
                newRow.append(`<td>${data[i].lat}</td>`);
                newRow.append(`<td>${data[i].lng}</td>`);
                expansionRangeIndex++;
            };
        };
        if(message.type == "photo"){
            const photoTable = $('#photoTable');
            photoTable.find('tbody').empty();
            photoList.length = 0;
            for(let i = 0; i < data.length; i++) {
                photoItem = { Id:i, Latitude: data[i].lat, Longitude: data[i].lng, Photo: data[i].photo, PhotoName: data[i].photoName };
                photoList.push(photoItem);
                var newRow = photoTable.find('tbody').append('<tr></tr>');
                newRow.append(`<td>${streetViewPhotoIndex}</td>`);
                // 取得data[i].file的檔名
                newRow.append(`<td>${data[i].photoName}</td>`);
                newRow.append(`<td>${data[i].lat}</td>`);
                newRow.append(`<td>${data[i].lng}</td>`);
                
                streetViewPhotoIndex++;
            }
            console.log("streetViewPhoto：", photoList);
        }
    });
});
