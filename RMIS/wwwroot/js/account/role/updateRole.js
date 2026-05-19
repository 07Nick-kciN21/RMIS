let permState = [];

$(document).ready(function () {
    if (!permissionsData || permissionsData.length === 0) {
        $('#view-accordion').html('<p style="color:#94a3b8;padding:20px">無可設定的功能權限</p>');
    } else {
        permState = permissionsData.map(p => Object.assign({}, p));
        const { groups, standalone } = groupPerms(permState);
        renderEditAccordion(groups, standalone);
        bindEditEvents();
    }

    $('#btn-submit').on('click', function (e) {
        e.preventDefault();
        const name = $('#RoleName').val().trim();
        if (!name) { alert('請輸入功能群組名稱'); return; }
        if (permState.length === 0) { alert('功能權限資料尚未載入，請重新整理頁面'); return; }

        const formData = new FormData();
        formData.append('RoleId',   $('#RoleId').val());
        formData.append('RoleName', name);
        formData.append('Status',   $('input[name="Status"]:checked').val() || 'true');

        permState.forEach((p, i) => {
            formData.append(`Permissions[${i}].PermissionId`, p.id);
            formData.append(`Permissions[${i}].Read`,         p.read);
            formData.append(`Permissions[${i}].Create`,       p.create);
            formData.append(`Permissions[${i}].Update`,       p.update);
            formData.append(`Permissions[${i}].Delete`,       p.delete);
            formData.append(`Permissions[${i}].Export`,       p.export);
        });

        $.ajax({
            url: '/Account/Role/Update',
            type: 'POST',
            processData: false,
            contentType: false,
            data: formData,
            xhrFields: { withCredentials: true },
            success: function (data) {
                alert(data.message);
                window.opener.postMessage(JSON.stringify({ success: data.success }), window.location.origin);
                window.close();
            },
            error: function () {
                alert('提交失敗');
                window.opener.postMessage(JSON.stringify({ success: false }), window.location.origin);
                window.close();
            }
        });
    });

    $('#btn-cancel').on('click', () => window.close());
});

/* ── 共用函式（與 createRole.js 相同） ────── */

function groupPerms(perms) {
    const groups = {};
    const standalone = [];
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

const ACTION_MAP = [
    ['read',   '查看', 'read-on'],
    ['create', '新增', 'create-on'],
    ['update', '修改', 'update-on'],
    ['delete', '刪除', 'delete-on'],
    ['export', '匯出', 'export-on'],
];

function editTagsHtml(perm, stateIdx) {
    return ACTION_MAP.map(([k, label, cls]) =>
        `<span class="tag edit-tag ${perm[k] ? cls : 'off'}" data-perm-idx="${stateIdx}" data-action="${k}">${label}</span>`
    ).join('');
}

function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function enabledCount(p) {
    return ACTION_MAP.filter(([k]) => p[k]).length;
}

function renderEditAccordion(groups, standalone) {
    const $c = $('#view-accordion').empty();

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
                        <div class="ac-bar">
                            <div class="ac-bar-fill ${fillCls}" style="width:${pct}%"></div>
                        </div>
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
                    <span class="ac-perm-name clickable-name" data-perm-idx="${p.stateIdx}">${esc(p.displayName)}</span>
                    <div class="ac-actions">${editTagsHtml(p, p.stateIdx)}</div>
                </div>
            `);
        });

        $card.find('.ac-header').on('click', () => $card.toggleClass('open'));
        $c.append($card);
    });

    if (standalone.length) {
        const $section = $(`
            <div>
                <div class="standalone-title">獨立功能</div>
                <div class="standalone-grid"></div>
            </div>
        `);
        standalone.forEach(p => {
            $section.find('.standalone-grid').append(`
                <div class="standalone-card" data-perm-idx="${p.stateIdx}">
                    <span class="standalone-card-name clickable-name" data-perm-idx="${p.stateIdx}">${esc(p.displayName)}</span>
                    <div class="ac-actions">${editTagsHtml(p, p.stateIdx)}</div>
                </div>
            `);
        });
        $c.append($section);
    }
}

function bindEditEvents() {
    // 點擊單一 action tag → 切換該項
    $(document).on('click', '.edit-tag', function (e) {
        e.stopPropagation();
        const idx    = parseInt($(this).data('perm-idx'));
        const action = $(this).data('action');
        const newVal = !permState[idx][action];
        permState[idx][action] = newVal;

        const cls = action + '-on';
        $(this).toggleClass(cls, newVal).toggleClass('off', !newVal);

        refreshGroupStats(idx);
    });

    // 點擊權限名稱（accordion 列或 standalone 卡片名稱）→ 全選 / 全不選
    $(document).on('click', '.clickable-name', function () {
        const idx     = parseInt($(this).data('perm-idx'));
        const actions = ACTION_MAP.map(([k]) => k);
        const allOn   = actions.every(k => permState[idx][k]);
        const newVal  = !allOn;

        actions.forEach(k => { permState[idx][k] = newVal; });

        // 更新同一列/卡片的所有 tags
        const $container = $(this).closest('.ac-row, .standalone-card');
        $container.find('.edit-tag').each(function () {
            const action = $(this).data('action');
            const cls    = action + '-on';
            $(this).toggleClass(cls, newVal).toggleClass('off', !newVal);
        });

        refreshGroupStats(idx);
    });
}

// 更新所屬群組卡片的進度條與計數
function refreshGroupStats(stateIdx) {
    const permName = permState[stateIdx].name;
    const dash     = permName.indexOf('-');
    if (dash === -1) return; // standalone 不需更新 group bar

    const groupName = permName.substring(0, dash);
    const $header   = $('#view-accordion .ac-card').filter(function () {
        return $(this).find('.ac-name').text() === groupName;
    });
    if (!$header.length) return;

    const groupItems = Object.values(permState).filter(p => p.name.startsWith(groupName + '-'));
    const total   = groupItems.length * 5;
    const enabled = groupItems.reduce((s, p) => s + enabledCount(p), 0);
    const pct     = total ? Math.round(enabled / total * 100) : 0;
    const fillCls = pct === 100 ? 'full' : pct === 0 ? 'empty' : '';

    const $card = $header.first();
    $card.find('.ac-count').text(`${enabled} / ${total} 項`);
    $card.find('.ac-bar-fill')
        .attr('class', `ac-bar-fill ${fillCls}`)
        .css('width', `${pct}%`);
}
