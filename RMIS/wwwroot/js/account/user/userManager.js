import { initPage } from "../Pagination.js";

var allUsers = [];
var allRoles = [];
var allDepartments = [];

$(document).ready(function () {
    initUserTable();

    $("#departmentSelector").on("change", function () {
        var selectedDepartment = $(this).val();
        if (selectedDepartment == 0) {
            initPage("userPage", updateUserTable, allUsers);
            return;
        }
        var filteredUsers = allUsers.filter((user) => user.departmentId == selectedDepartment);
        initPage("userPage", updateUserTable, filteredUsers);
    });

    $("#createUser").on("click", function () {
        openCreateModal();
    });

    $(document).on('click', '.captchaImage', function () {
        refreshCaptcha($(this));
    });

    $('#createUserForm').on('submit', function (e) {
        e.preventDefault();
        const $form = $(this);
        let isValid = true;

        $form.find('.form-control').removeClass('is-valid is-invalid');
        $form.find('.form-control[required]').each(function () {
            const $input = $(this);
            const value = $input.val();
            const pattern = $input.attr('pattern');
            if (!value || value.trim() === '') {
                $input.addClass('is-invalid');
                isValid = false;
            } else if (pattern && !(new RegExp(pattern).test(value))) {
                $input.addClass('is-invalid');
                isValid = false;
            } else {
                $input.addClass('is-valid');
            }
        });

        const account = $('#create-Account').val();
        const password = $('#create-Password').val();
        if (account && password && account === password) {
            $('#create-Password').addClass('is-invalid').removeClass('is-valid');
            $('#create-passwordFeedback').text('帳號與密碼不可相同');
            isValid = false;
        }

        if (!isValid) return;

        let formData = new FormData();
        formData.append("Account", account);
        formData.append("Password", password);
        formData.append("DisplayName", $('#create-DisplayName').val());
        formData.append("Email", $('#create-Email').val());
        formData.append("Phone", $('#create-Phone').val());
        formData.append("DepartmentId", $('#create-DepartmentId').val());
        formData.append("RoleId", $('#create-RoleId').val());
        formData.append("Status", $('input[name="create-Status"]:checked').val() ?? '');

        $.ajax({
            url: '/Account/User/Create',
            type: 'POST',
            processData: false,
            contentType: false,
            data: formData,
            xhrFields: { withCredentials: true },
            success: function (data) {
                alert(data.message);
                if (data.success) {
                    $('#createUserModal').modal('hide');
                    initUserTable();
                }
            },
            error: function () {
                alert('提交失敗');
            }
        });
    });

    $('#updateUserForm').on('submit', function (e) {
        e.preventDefault();
        let formData = new FormData();
        formData.append("UserId", $('#edit-UserId').val());
        formData.append("UserName", $('#edit-UserName').val());
        formData.append("DisplayName", $('#edit-DisplayName').val());
        formData.append("Phone", $('#edit-Phone').val());
        formData.append("DepartmentId", $('#edit-DepartmentId').val());
        formData.append("RoleId", $('#edit-RoleId').val());
        formData.append("Status", $('input[name="Status"]:checked').val() ?? '');

        $.ajax({
            url: '/Account/User/Update',
            type: 'POST',
            processData: false,
            contentType: false,
            data: formData,
            xhrFields: { withCredentials: true },
            success: function (data) {
                alert(data.message);
                if (data.success) {
                    $('#updateUserModal').modal('hide');
                    initUserTable();
                }
            },
            error: function () {
                alert('提交失敗');
            }
        });
    });

    $('#btn-pwd-submit').on('click', function () {
        const $container = $('#resetPasswordForm');
        if (!validateForm($container)) return;
        if ($('#NewPassword').val() !== $('#CheckPassword').val()) {
            alert("新密碼與確認密碼不相同");
            return;
        }

        let formData = new FormData();
        formData.append("UserId", $('#edit-pwd-UserId').val());
        formData.append("NewPassword", $('#NewPassword').val());
        formData.append("NewPasswordCaptcha", $('#adminUpdate_newPasswordCaptcha').val());
        $.ajax({
            url: '/Account/User/UpdatePassword',
            type: 'POST',
            processData: false,
            contentType: false,
            data: formData,
            xhrFields: { withCredentials: true },
            success: function (data) { alert(data.message); },
            error: function () { alert('提交失敗'); }
        }).always(function () {
            $('#resetPasswordSection').collapse('hide');
            $container.find('input[type="password"], input[type="text"]').val('');
            $container.find('.form-control').removeClass('is-valid is-invalid');
            refreshCaptcha($(".captchaImage[data-type='adminUpdate_newPassword']"));
        });
    });

    $('#btn-email-submit').on('click', function () {
        const $container = $('#resetEmailForm');
        if (!validateForm($container)) return;

        let formData = new FormData();
        formData.append("UserId", $('#edit-email-UserId').val());
        formData.append("NewEmail", $('#newEmail').val());
        formData.append("NewEmailCaptcha", $('#adminUpdate_newEmailCaptcha').val());
        $.ajax({
            url: '/Account/User/UpdateEmail',
            type: 'POST',
            processData: false,
            contentType: false,
            data: formData,
            xhrFields: { withCredentials: true },
            success: function (data) { alert(data.message); },
            error: function () { alert('提交失敗'); }
        }).always(function () {
            $('#resetEmailSection').collapse('hide');
            $container.find('input[type="email"], input[type="text"]').val('');
            $container.find('.form-control').removeClass('is-valid is-invalid');
            refreshCaptcha($(".captchaImage[data-type='newEmail']"));
        });
    });
});

function refreshCaptcha($img) {
    $img = $($img);
    const type = $img.data("type");
    $img.attr("src", "/Portal/Captcha?type=" + type + "&_=" + new Date().getTime());
}

function validateForm($container) {
    let isValid = true;
    $container = $($container);
    $container.find('.form-control').removeClass('is-valid is-invalid');
    $container.find('.form-control[required]').each(function () {
        const $input = $(this);
        const value = $input.val();
        const pattern = $input.attr('pattern');
        if (!value || value.trim() === '') {
            $input.addClass('is-invalid');
            isValid = false;
        } else if (pattern && !(new RegExp(pattern).test(value))) {
            $input.addClass('is-invalid');
            isValid = false;
        } else {
            $input.addClass('is-valid');
        }
    });
    return isValid;
}

function openCreateModal() {
    $('#createUserForm')[0].reset();
    $('#createUserForm').find('.form-control').removeClass('is-valid is-invalid');

    var roleSelect = $('#create-RoleId');
    roleSelect.empty().append('<option value="">請選擇角色</option>');
    allRoles.forEach(role => {
        roleSelect.append(`<option value="${role.id}">${role.name}</option>`);
    });

    var deptSelect = $('#create-DepartmentId');
    deptSelect.empty().append('<option value="">請選擇部門</option>');
    allDepartments.forEach(dept => {
        deptSelect.append(`<option value="${dept.id}">${dept.name}</option>`);
    });

    $('#createUserModal').modal('show');
}

function openEditModal(user) {
    $('#edit-UserId').val(user.id);
    $('#edit-pwd-UserId').val(user.id);
    $('#edit-email-UserId').val(user.id);
    $('#edit-DisplayName').val(user.displayName || '');
    $('#edit-UserName').val(user.userName || '');
    $('#edit-Phone').val(user.phone || '');
    $(`input[name="Status"][value="${user.status}"]`).prop('checked', true);

    var roleSelect = $('#edit-RoleId');
    roleSelect.empty().append('<option value="">請選擇角色</option>');
    allRoles.forEach(role => {
        roleSelect.append(`<option value="${role.id}" ${role.id === user.roleId ? 'selected' : ''}>${role.name}</option>`);
    });

    var deptSelect = $('#edit-DepartmentId');
    deptSelect.empty().append('<option value="">請選擇部門</option>');
    allDepartments.forEach(dept => {
        deptSelect.append(`<option value="${dept.id}" ${dept.id == user.departmentId ? 'selected' : ''}>${dept.name}</option>`);
    });

    $('#resetPasswordSection').collapse('hide');
    $('#resetEmailSection').collapse('hide');
    $('#resetPasswordForm').find('input[type="password"], input[type="text"]').val('');
    $('#resetEmailForm').find('input[type="email"], input[type="text"]').val('');
    $('#resetPasswordForm, #resetEmailForm').find('.form-control').removeClass('is-valid is-invalid');
    $('.captchaImage').each(function () { refreshCaptcha($(this)); });

    $('#updateUserModal').modal('show');
}

function initUserTable() {
    $.ajax({
        url: "/Account/User/Get/ManagerData",
        type: "POST",
        processData: false,
        contentType: false,
        xhrFields: { withCredentials: true },
        success: function (data) {
            if (data.success) {
                var managerData = data.userManager;
                allUsers = managerData.users;
                allRoles = managerData.roles;
                allDepartments = managerData.departments;
                initPage("userPage", updateUserTable, allUsers);
                initDepartmentFilter();
            }
        },
        error: function (xhr) {
            console.log("取得資料失敗:", xhr.status);
        }
    });
}

function initDepartmentFilter() {
    var departmentFilter = $("#departmentSelector");
    departmentFilter.empty();
    departmentFilter.append('<option value="0">全部</option>');
    allDepartments.forEach((department) => {
        departmentFilter.append(`<option value="${department.id}">${department.name}</option>`);
    });
}

function updateUserTable(users) {
    var tbody = $("#userTable");
    tbody.empty();
    users.forEach((user) => {
        var row = $("<tr>").attr({
            "data-user-id": user.id,
            "data-user-role": user.role
        });

        var updateBtn = $(`<button class="update-user read">編輯</button>`).on("click", function () {
            openEditModal(user);
        });

        var deleteBtn = $(`<button class="delete-user read">刪除</button>`).on("click", function () {
            if (confirm("確定要刪除使用者？")) {
                $.ajax({
                    url: `/Account/User/Delete?UserId=${user.id}`,
                    type: "POST",
                    processData: false,
                    contentType: false,
                    xhrFields: { withCredentials: true },
                    success: function (data) {
                        if (data.success) {
                            alert(data.message);
                            location.reload();
                        } else {
                            alert(data.message);
                        }
                    },
                    error: function (xhr) {
                        console.log("API 錯誤:", xhr.status);
                    }
                });
            }
        });

        row.append(`<td class="department-cell"><span class="read">${user.department}</span></td>`);
        row.append(`<td class="display-cell"><span class="read">${user.displayName}</span></td>`);
        row.append(`<td class="user-cell"><span class="read">${user.userName}</span></td>`);
        row.append(`<td class="role-cell"><span class="read">${user.role}</span></td>`);
        row.append(`<td class="status-cell">${user.status ? '<span class="read enable">啟用</span>' : '<span class="read stop">停用</span>'}</td>`);
        row.append(`<td class="status-cell">${user.emailConfirm ? '<span class="read enable">啟用</span>' : '<span class="read stop">停用</span>'}</td>`);

        var actionTd = $(`<td class="action-cell"></td>`);
        actionTd.append(updateBtn, deleteBtn);
        row.append(actionTd);
        tbody.append(row);
    });
}
