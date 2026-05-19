import { initPage } from "../Pagination.js";

let allRoles = [];
let createPermState = [];
let updatePermState = [];

const ACTION_MAP = [
    ['read',   '查看', 'read-on'],
    ['create', '新增', 'create-on'],
    ['update', '修改', 'update-on'],
    ['delete', '刪除', 'delete-on'],
    ['export', '匯出', 'export-on'],
];

$(document).ready(function () {
    initRoleTable();

    $('#roleSelector').on('change', function () {
        const selectedId = $(this).val();
        if (selectedId == 0) {
            initPage("rolePage", updateRoleTable, allRoles);
        } else {
            initPage("rolePage", updateRoleTable, allRoles.filter(r => r.id == selectedId));
        }
    });

    $('#createRole').on('click', openCreateModal);

    $('#btn-create-submit').on('click', function () {
        const name = $('#create-RoleName').val().trim();
        if (!name) { alert('請輸入功能群組名稱'); return; }

        const formData = new FormData();
        formData.append('RoleName', name);
        formData.append('Status', $('input[name="create-Status"]:checked').val() || 'true');
        createPermState.forEach((p, i) => appendPerm(formData, i, p));

        $.ajax({
            url: '/Account/Role/Create',
            type: 'POST',
            processData: false,
            contentType: false,
            data: formData,
            xhrFields: { withCredentials: true },
            success: function (data) {
                alert(data.message);
                if (data.success) {
                    $('#createRoleModal').modal('hide');
                    initRoleTable();
                }
            },
            error: function () { alert('提交失敗'); }
        });
    });

    $('#btn-update-submit').on('click', function () {
        const name = $('#update-RoleName').val().trim();
        if (!name) { alert('請輸入功能群組名稱'); return; }

        const formData = new FormData();
        formData.append('RoleId',   $('#update-RoleId').val());
        formData.append('RoleName', name);
        formData.append('Status', $('input[name="update-Status"]:checked').val() || 'true');
        updatePermState.forEach((p, i) => appendPerm(formData, i, p));

        $.ajax({
            url: '/Account/Role/Update',
            type: 'POST',
            processData: false,
            contentType: false,
            data: formData,
            xhrFields: { withCredentials: true },
            success: function (data) {
                alert(data.message);
                if (data.success) {
                    $('#updateRoleModal').modal('hide');
                    initRoleTable();
                }
            },
            error: function () { alert('提交失敗'); }
        });
    });

    // 手風琴 tag 點擊（全部 modal 共用，用 data-modal 區分）
    $(document).on('click', '.edit-tag', function (e) {
        e.stopPropagation();
        const modal  = $(this).data('modal');
        const state  = modal === 'create' ? createPermState : updatePermState;
        const idx    = parseInt($(this).data('perm-idx'));
        const action = $(this).data('action');
        state[idx][action] = !state[idx][action];
        $(this).toggleClass(action + '-on', state[idx][action]).toggleClass('off', !state[idx][action]);
        refreshGroupStats(modal, idx, state);
    });

    $(document).on('click', '.clickable-name', function () {
        const modal   = $(this).data('modal');
        const state   = modal === 'create' ? createPermState : updatePermState;
        const idx     = parseInt($(this).data('perm-idx'));
        const actions = ACTION_MAP.map(([k]) => k);
        const allOn   = actions.every(k => state[idx][k]);
        const newVal  = !allOn;
        actions.forEach(k => { state[idx][k] = newVal; });

        const $container = $(this).closest('.ac-row, .standalone-card');
        $container.find('.edit-tag').each(function () {
            const action = $(this).data('action');
            $(this).toggleClass(action + '-on', newVal).toggleClass('off', !newVal);
        });
        refreshGroupStats(modal, idx, state);
    });
});

function openCreateModal() {
    $('#create-RoleName').val('');
    $('input[name="create-Status"][value="true"]').prop('checked', true);
    $('#create-accordion').html('<p class="text-center text-secondary py-4">載入中…</p>');
    $('#createRoleModal').modal('show');

    $.ajax({
        url: '/Account/Role/Get/CreateData',
        type: 'GET',
        xhrFields: { withCredentials: true },
        success: function (data) {
            if (!data.success) { alert(data.message); return; }
            createPermState = data.permissions.map(p => Object.assign({}, p));
            renderAccordion('#create-accordion', 'create', createPermState);
        },
        error: function () { $('#create-accordion').html('<p class="text-center text-danger py-4">載入失敗</p>'); }
    });
}

function openUpdateModal(role) {
    $('#update-RoleId').val(role.id);
    $('#update-RoleName').val(role.name);
    $(`input[name="update-Status"][value="${role.status}"]`).prop('checked', true);
    $('#update-accordion').html('<p class="text-center text-secondary py-4">載入中…</p>');
    $('#updateRoleModal').modal('show');

    $.ajax({
        url: `/Account/Role/Get/UpdateData?id=${role.id}`,
        type: 'GET',
        xhrFields: { withCredentials: true },
        success: function (data) {
            if (!data.success) { alert(data.message); return; }
            updatePermState = data.permissions.map(p => Object.assign({}, p));
            renderAccordion('#update-accordion', 'update', updatePermState);
        },
        error: function () { $('#update-accordion').html('<p class="text-center text-danger py-4">載入失敗</p>'); }
    });
}

function appendPerm(formData, i, p) {
    formData.append(`Permissions[${i}].PermissionId`, p.id);
    formData.append(`Permissions[${i}].Read`,         p.read);
    formData.append(`Permissions[${i}].Create`,       p.create);
    formData.append(`Permissions[${i}].Update`,       p.update);
    formData.append(`Permissions[${i}].Delete`,       p.delete);
    formData.append(`Permissions[${i}].Export`,       p.export);
}

function initRoleTable() {
    $.ajax({
        url: '/Account/Role/Get/ManagerData',
        type: 'POST',
        xhrFields: { withCredentials: true },
        success: function (data) {
            if (data.success) {
                allRoles = data.roleManager.roles;
                initPage("rolePage", updateRoleTable, allRoles);
                updateRoleFilter(allRoles);
            }
        },
        error: function (xhr) { console.log("取得資料失敗:", xhr.status); }
    });
}

function updateRoleFilter(roles) {
    $('#roleSelector').empty().append('<option value="0" selected>全部</option>');
    roles.forEach(role => {
        $('#roleSelector').append(`<option value="${role.id}">${role.name}</option>`);
    });
}

function updateRoleTable(roles) {
    const tbody = $('#roleTable').empty();
    roles.forEach(role => {
        const moreBtn = $(`<a class="more-role read">more</a>`).on('click', function () {
            window.open(`/Account/Role/Read/Permission?id=${role.id}`, '_blank', 'width=800,height=600');
        });
        const updateBtn = $(`<button class="update-role read">編輯</button>`).on('click', function () {
            openUpdateModal(role);
        });
        const deleteBtn = $(`<button class="delete-role read">刪除</button>`).on('click', function () {
            if (confirm("確定要刪除身分？")) {
                $.ajax({
                    url: `/Account/Role/Delete?id=${role.id}`,
                    type: 'POST',
                    processData: false,
                    contentType: false,
                    xhrFields: { withCredentials: true },
                    success: function (data) {
                        alert(data.message);
                        if (data.success) initRoleTable();
                    },
                    error: function (xhr) { console.log("刪除失敗:", xhr.status); }
                });
            }
        });

        const row = $('<tr>').attr('data-role-id', role.id);
        row.append(`<td class="name-cell"><span class="read">${role.name}</span></td>`);
        row.append($(`<td class="permission-cell"></td>`).append(moreBtn));
        row.append(`<td class="status-cell">${role.status ? '<span class="read enable">啟用</span>' : '<span class="read stop">停用</span>'}</td>`);
        row.append(`<td class="createAt-cell">${convertDate(role.createAt)}</td>`);
        row.append($(`<td class="action-cell"></td>`).append(updateBtn, deleteBtn));
        tbody.append(row);
    });
}

function convertDate(createAt) {
    const [date, time] = createAt.split('T');
    return `${date} ${time.split('.')[0]}`;
}

/* ── 手風琴渲染 ───────────────────────────────── */

function groupPerms(perms) {
    const groups = {}, standalone = [];
    perms.forEach((p, idx) => {
        const dash = p.name.indexOf('-');
        if (dash !== -1) {
            const g = p.name.substring(0, dash);
            if (!groups[g]) groups[g] = [];
            groups[g].push(Object.assign({}, p, { displayName: p.name.substring(dash + 1), stateIdx: idx }));
        } else {
            standalone.push(Object.assign({}, p, { displayName: p.name, stateIdx: idx }));
        }
    });
    return { groups, standalone };
}

function editTagsHtml(perm, stateIdx, modalKey) {
    return ACTION_MAP.map(([k, label, cls]) =>
        `<span class="tag edit-tag ${perm[k] ? cls : 'off'}" data-modal="${modalKey}" data-perm-idx="${stateIdx}" data-action="${k}">${label}</span>`
    ).join('');
}

function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function enabledCount(p) {
    return ACTION_MAP.filter(([k]) => p[k]).length;
}

function renderAccordion(containerSel, modalKey, permState) {
    const $c = $(containerSel).empty();
    if (!permState.length) {
        $c.html('<p class="text-secondary py-4 px-3">無可設定的功能權限</p>');
        return;
    }

    const { groups, standalone } = groupPerms(permState);

    Object.entries(groups).forEach(([groupName, items]) => {
        const total   = items.length * 5;
        const enabled = items.reduce((s, p) => s + enabledCount(p), 0);
        const pct     = total ? Math.round(enabled / total * 100) : 0;
        const fillCls = pct === 100 ? 'full' : pct === 0 ? 'empty' : '';

        const $card = $(`
            <div class="ac-card">
                <div class="ac-header">
                    <span class="ac-name">${esc(groupName)}</span>
                    <div class="ac-stats">
                        <span class="ac-count">${enabled} / ${total} 項</span>
                        <div class="ac-bar"><div class="ac-bar-fill ${fillCls}" style="width:${pct}%"></div></div>
                    </div>
                    <span class="ac-chevron">▶</span>
                </div>
                <div class="ac-body"></div>
            </div>
        `);

        const $body = $card.find('.ac-body');
        items.forEach(p => {
            $body.append(`
                <div class="ac-row">
                    <span class="ac-perm-name clickable-name" data-modal="${modalKey}" data-perm-idx="${p.stateIdx}">${esc(p.displayName)}</span>
                    <div class="ac-actions">${editTagsHtml(p, p.stateIdx, modalKey)}</div>
                </div>
            `);
        });

        $card.find('.ac-header').on('click', () => $card.toggleClass('open'));
        $c.append($card);
    });

    if (standalone.length) {
        const $section = $('<div><div class="standalone-title">獨立功能</div><div class="standalone-grid"></div></div>');
        standalone.forEach(p => {
            $section.find('.standalone-grid').append(`
                <div class="standalone-card" data-perm-idx="${p.stateIdx}">
                    <span class="standalone-card-name clickable-name" data-modal="${modalKey}" data-perm-idx="${p.stateIdx}">${esc(p.displayName)}</span>
                    <div class="ac-actions">${editTagsHtml(p, p.stateIdx, modalKey)}</div>
                </div>
            `);
        });
        $c.append($section);
    }
}

function refreshGroupStats(modalKey, stateIdx, permState) {
    const permName = permState[stateIdx].name;
    const dash = permName.indexOf('-');
    if (dash === -1) return;

    const groupName  = permName.substring(0, dash);
    const groupItems = permState.filter(p => p.name.startsWith(groupName + '-'));
    const total      = groupItems.length * 5;
    const enabled    = groupItems.reduce((s, p) => s + enabledCount(p), 0);
    const pct        = total ? Math.round(enabled / total * 100) : 0;
    const fillCls    = pct === 100 ? 'full' : pct === 0 ? 'empty' : '';

    const containerSel = modalKey === 'create' ? '#create-accordion' : '#update-accordion';
    const $card = $(containerSel + ' .ac-card').filter(function () {
        return $(this).find('.ac-name').text() === groupName;
    }).first();

    $card.find('.ac-count').text(`${enabled} / ${total} 項`);
    $card.find('.ac-bar-fill').attr('class', `ac-bar-fill ${fillCls}`).css('width', `${pct}%`);
}
