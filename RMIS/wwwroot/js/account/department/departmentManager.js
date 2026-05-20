import { initPage } from "../Pagination.js";

let allDepartments = [];
let initialUpdateValues = [];

$(document).ready(function () {
    initDepartmentTable();

    $("#createDepartment").on("click", openCreateModal);

    $("#departmentSelector").on("change", function () {
        var selectedId = $(this).val();
        if (selectedId == 0) {
            initPage("departmentPage", updateDepartmentTable, allDepartments);
        } else {
            var filtered = allDepartments.filter(d => d.id == selectedId);
            initPage("departmentPage", updateDepartmentTable, filtered);
        }
    });

    $("#btn-create-submit").on("click", submitCreate);
    $("#btn-update-submit").on("click", submitUpdate);
});

function openCreateModal() {
    $('#create-Name').val('');
    $('input[name="create-Status"][value="true"]').prop('checked', true);
    destroySelect2('#create-pipelineAccess');
    $('#createDepartmentModal').modal('show');
    loadPipelineAccess(-1, '#create-pipelineAccess', '#createDepartmentModal', null);
}

function openUpdateModal(department) {
    $('#update-Id').val(department.id);
    $('#update-Name').val(department.name);
    $(`input[name="update-Status"][value="${department.status}"]`).prop('checked', true);
    destroySelect2('#update-pipelineAccess');
    initialUpdateValues = [];
    $('#updateDepartmentModal').modal('show');
    loadPipelineAccess(department.id, '#update-pipelineAccess', '#updateDepartmentModal', function (vals) {
        initialUpdateValues = vals;
    });
}

function destroySelect2(sel) {
    var $el = $(sel);
    if ($el.hasClass('select2-hidden-accessible')) {
        $el.select2('destroy');
    }
    $el.empty();
}

function loadPipelineAccess(id, selectSel, modalSel, onInit) {
    $.ajax({
        url: `/Account/Department/Get/PipelineAccess?id=${id}`,
        type: 'POST',
        processData: false,
        contentType: false,
        dataType: 'json',
        xhrFields: { withCredentials: true },
        success: function (result) {
            if (!result.success) return;
            var data = JSON.parse(result.data);
            var $select = $(selectSel);
            populateSelectFromTree(data, $select);
            $select.select2({
                placeholder: '請選擇管線',
                width: '100%',
                closeOnSelect: false,
                dropdownParent: $(modalSel),
                templateResult: function (item) {
                    if (!item.id) return item.text;
                    var level = $(item.element).data('level') || 0;
                    var indent = '&emsp;'.repeat(level * 2);
                    var label = $(item.element).prop('disabled')
                        ? `<strong>${item.text}</strong>`
                        : item.text;
                    return $('<span>').html(indent + label);
                },
                templateSelection: function (item) { return item.text; }
            });
            if (onInit) onInit($select.val() || []);
        },
        error: function () { console.error('載入業務圖資失敗'); }
    });
}

function submitCreate() {
    var name = $('#create-Name').val().trim();
    if (!name) { alert('請輸入部門名稱'); return; }
    var formData = new FormData();
    formData.append('Name', name);
    formData.append('Status', $('input[name="create-Status"]:checked').val() || 'true');
    ($('#create-pipelineAccess').val() || []).forEach(id => formData.append('Added', id));
    $.ajax({
        url: '/Account/Department/Create',
        type: 'POST',
        processData: false,
        contentType: false,
        data: formData,
        xhrFields: { withCredentials: true },
        success: function (data) {
            alert(data.message);
            if (data.success) {
                $('#createDepartmentModal').modal('hide');
                initDepartmentTable();
            }
        },
        error: function () { alert('提交失敗'); }
    });
}

function submitUpdate() {
    var name = $('#update-Name').val().trim();
    if (!name) { alert('請輸入部門名稱'); return; }
    var current = $('#update-pipelineAccess').val() || [];
    var added   = current.filter(id => !initialUpdateValues.includes(id));
    var removed = initialUpdateValues.filter(id => !current.includes(id));
    var formData = new FormData();
    formData.append('Id',   $('#update-Id').val());
    formData.append('Name', name);
    formData.append('Status', $('input[name="update-Status"]:checked').val() || 'true');
    added.forEach(id   => formData.append('Added',   id));
    removed.forEach(id => formData.append('Removed', id));
    $.ajax({
        url: '/Account/Department/Update',
        type: 'POST',
        processData: false,
        contentType: false,
        data: formData,
        xhrFields: { withCredentials: true },
        success: function (data) {
            alert(data.message);
            if (data.success) {
                $('#updateDepartmentModal').modal('hide');
                initDepartmentTable();
            }
        },
        error: function () { alert('提交失敗'); }
    });
}

function initDepartmentTable() {
    $.ajax({
        url: "/Account/Department/Get/ManagerData",
        type: "POST",
        processData: false,
        contentType: false,
        xhrFields: { withCredentials: true },
        success: function (data) {
            if (data.success) {
                allDepartments = data.departmentManager.departments;
                initPage("departmentPage", updateDepartmentTable, allDepartments);
                initDepartmentFilter(allDepartments);
            }
        },
        error: function (xhr) { console.log("取得資料失敗:", xhr.status); }
    });
}

function initDepartmentFilter(departments) {
    var $filter = $("#departmentSelector").empty();
    $filter.append(`<option value="0" selected>全部</option>`);
    departments.forEach(d => $filter.append(`<option value="${d.id}">${d.name}</option>`));
}

function updateDepartmentTable(departments) {
    var $table = $("#departmentTable").empty();
    departments.forEach(department => {
        var row = $("<tr></tr>").attr("data-department-id", department.id);

        var updateBtn = $(`<button class="update-department read">編輯</button>`).on("click", function () {
            openUpdateModal(department);
        });

        var deleteBtn = $(`<button class="delete-department read">刪除</button>`).on("click", function () {
            if (confirm("確定要刪除部門？")) {
                $.ajax({
                    url: `/Account/Department/Delete?departmentId=${department.id}`,
                    type: "POST",
                    xhrFields: { withCredentials: true },
                    success: function (data) {
                        alert(data.message);
                        if (data.success) initDepartmentTable();
                    },
                    error: function (xhr) { console.log("API 錯誤:", xhr.status); }
                });
            }
        });

        row.append(`<td class="name-cell"><span class="read">${department.name}</span></td>`);
        row.append(`<td class="status-cell">
            ${department.status
                ? '<span class="read enable">啟用</span>'
                : '<span class="read stop">停用</span>'}
        </td>`);
        row.append(`<td class="createAt-cell">${convertDate(department.createAt)}</td>`);
        row.append($("<td class='action-cell'></td>").append(updateBtn, deleteBtn));
        $table.append(row);
    });
}

function convertDate(createAt) {
    var parts = createAt.split("T");
    return `${parts[0]} ${parts[1].split(".")[0]}`;
}

function populateSelectFromTree(data, $select, level = 0) {
    data.forEach(item => {
        var option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.text;
        option.setAttribute('data-level', level);
        if (item.tag === 'node') option.disabled = true;
        if (item.selected) option.selected = true;
        $select.append(option);
        if (Array.isArray(item.children) && item.children.length > 0) {
            populateSelectFromTree(item.children, $select, level + 1);
        }
    });
}
