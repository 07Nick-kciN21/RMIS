const PAGE_SIZE = 20;

// 「帳號」類別：登入/登出/延長登入等身分驗證相關操作
const ACCOUNT_TYPES = ["登入", "Login-POST", "登出", "登入延長", "ExtendSession"];

// 「管理」類別：使用者/角色/權限/部門的新增修改刪除（不含個人資料自助操作、不含專案管理）
const MANAGEMENT_TYPES = [
    "新增使用者", "更新使用者", "刪除使用者",
    "新增角色", "更新角色", "刪除角色",
    "新增權限", "更新權限", "刪除權限",
    "新增部門", "更新部門", "刪除部門"
];

// 「操作」類別：帳號、管理以外的所有業務操作，明確列出對應的 log 操作名稱
const OPERATION_TYPES = [
    // 註冊 / 信箱驗證 / 忘記密碼
    "RegisterSelect", "註冊", "ConfirmEmail", "ResendConfirmationEmail",
    "ForgotPassword", "ResetPassword-GET", "重設密碼", "重設密碼T",
    // 個人資料自助操作
    "更新個人資料", "更新使用者密碼", "更新使用者信箱", "確認使用者信箱", "更新身分證字號",
    // 業務圖資 / 專案管理
    "新增類別", "新增類別(JSON)", "新增地圖來源", "新增道路", "新增道路(CSV)", "新增管線",
    "新增道路專案", "更新道路專案", "刪除道路專案",
    "匯入道路專案(Excel)", "匯入施工通告(Excel)",
    // 道路專案歷程
    "新增歷程", "更新歷程", "刪除歷程", "匯出歷程補充資料"
];

let allLogs = [];
let filteredLogs = [];
let displayedCount = 0;

$(document).ready(function () {
    loadLogData();
    $("#btnFilter").on("click", applyFilter);
    $("#btnClear").on("click", clearFilter);
    $("#btnMore").on("click", loadMore);
});

function loadLogData() {
    $.ajax({
        url: "/Account/Log/Get/ManagerData",
        type: "POST",
        processData: false,
        contentType: false,
        success: function (data) {
            if (data.success) {
                allLogs = data.logManage;
                filteredLogs = allLogs;
                displayedCount = 0;
                renderRows();
            }
        }
    });
}

function applyFilter() {
    const dateFrom = $("#filterDateFrom").val();
    const dateTo = $("#filterDateTo").val();
    const user = $("#filterUser").val().trim().toLowerCase();
    const category = $("#filterCategory").val();

    filteredLogs = allLogs.filter(log => {
        const ts = new Date(log.timestamp);

        if (dateFrom && ts < new Date(dateFrom)) return false;
        if (dateTo && ts > new Date(dateTo + "T23:59:59")) return false;
        if (user && !log.userId.toLowerCase().includes(user)) return false;
        if (category === "account" && !ACCOUNT_TYPES.includes(log.type)) return false;
        if (category === "management" && !MANAGEMENT_TYPES.includes(log.type)) return false;
        if (category === "operation" && !OPERATION_TYPES.includes(log.type)) return false;

        return true;
    });

    displayedCount = 0;
    renderRows();
}

function clearFilter() {
    $("#filterDateFrom").val("");
    $("#filterDateTo").val("");
    $("#filterUser").val("");
    $("#filterCategory").val("");
    filteredLogs = allLogs;
    displayedCount = 0;
    renderRows();
}

function loadMore() {
    renderRows(true);
}

function renderRows(append = false) {
    const tbody = $("#logTable");

    if (!append) {
        tbody.empty();
        displayedCount = 0;
    }

    const nextCount = Math.min(displayedCount + PAGE_SIZE, filteredLogs.length);
    const slice = filteredLogs.slice(displayedCount, nextCount);

    slice.forEach(log => {
        const row = $("<tr>");
        row.append(`<td class="time-cell"><span class="read">${convertDate(log.timestamp)}</span></td>`);
        row.append(`<td class="ip-cell"><span class="read">${log.ip}</span></td>`);
        row.append(`<td class="user-cell"><span class="read">${log.userId}</span></td>`);
        row.append(`<td class="type-cell"><span class="read">${log.type}</span></td>`);
        row.append(`<td class="success-cell">
            ${log.success
                ? '<span class="read enable">成功</span>'
                : '<span class="read stop">失敗</span>'}
        </td>`);
        row.append(`<td class="reason-cell"><span class="read">${log.reason}</span></td>`);
        tbody.append(row);
    });

    displayedCount = nextCount;

    $("#displayedCount").text(displayedCount);
    $("#totalCount").text(filteredLogs.length);

    const hasMore = displayedCount < filteredLogs.length;
    $("#btnMore").toggle(hasMore);
}

function convertDate(createAt) {
    const datetime = createAt.split("T");
    const date = datetime[0];
    const time = datetime[1].split(".")[0];
    return `${date} ${time}`;
}
