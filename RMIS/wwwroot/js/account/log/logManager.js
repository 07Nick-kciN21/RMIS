import { initPage } from "../Pagination.js";

const PAGE_SIZE = 10;

let currentLogs = [];
let pagination = null;

$(document).ready(function () {
    applyDefaultDateRange();
    loadLogData();
    $("#btnFilter").on("click", onFilterClick);
    $("#btnClear").on("click", clearFilter);
});

// 預設查詢區間：最近一個月（今天往前推一個月～今天）
function applyDefaultDateRange() {
    const to = new Date();
    const from = new Date(to);
    from.setMonth(from.getMonth() - 1);

    $("#filterDateFrom").val(formatDateInput(from));
    $("#filterDateTo").val(formatDateInput(to));
}

function formatDateInput(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

// 結束時間是否超過開始時間往後推一個月（即區間 > 1 個月）
function isRangeOverOneMonth(dateFrom, dateTo) {
    const maxTo = new Date(dateFrom);
    maxTo.setMonth(maxTo.getMonth() + 1);
    return new Date(dateTo) > maxTo;
}

function onFilterClick() {
    const dateFrom = $("#filterDateFrom").val();
    const dateTo = $("#filterDateTo").val();

    if (dateFrom && dateTo && isRangeOverOneMonth(dateFrom, dateTo)) {
        alert("查詢區間不可超過一個月，請重新選擇開始與結束時間");
        return;
    }

    loadLogData();
}

// 依目前篩選條件向後端查詢（精確過濾，非前端過濾）
function loadLogData() {
    const params = {
        dateFrom: $("#filterDateFrom").val() || null,
        dateTo: $("#filterDateTo").val() || null,
        user: $("#filterUser").val().trim() || null,
        category: $("#filterCategory").val() || null
    };

    $.ajax({
        url: "/Account/Log/Get/ManagerData",
        type: "POST",
        data: params,
        success: function (data) {
            if (data.success) {
                currentLogs = data.logManage;

                if (pagination) {
                    pagination.updateDataList(currentLogs);
                } else {
                    pagination = initPage("logPage", renderRows, currentLogs, PAGE_SIZE);
                }

                $("#totalCount").text(currentLogs.length);
            }
        }
    });
}

function clearFilter() {
    $("#filterUser").val("");
    $("#filterCategory").val("");
    applyDefaultDateRange();
    loadLogData();
}

function renderRows(pageLogs) {
    const tbody = $("#logTable");
    tbody.empty();

    pageLogs.forEach(log => {
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
}

function convertDate(createAt) {
    const datetime = createAt.split("T");
    const date = datetime[0];
    const time = datetime[1].split(".")[0];
    return `${date} ${time}`;
}
