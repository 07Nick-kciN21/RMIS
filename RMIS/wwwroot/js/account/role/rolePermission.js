$(document).ready(function () {
    const { groups, standalone } = groupPerms(permissionsData);
    renderAccordion(groups, standalone);
});

function groupPerms(perms) {
    const groups = {};
    const standalone = [];

    perms.forEach(p => {
        const dash = p.name.indexOf('-');
        if (dash !== -1) {
            const g = p.name.substring(0, dash);
            if (!groups[g]) groups[g] = [];
            groups[g].push(Object.assign({}, p, { displayName: p.name.substring(dash + 1) }));
        } else {
            standalone.push(Object.assign({}, p, { displayName: p.name }));
        }
    });

    return { groups, standalone };
}

function enabledCount(p) {
    return ['read', 'create', 'update', 'delete', 'export'].filter(k => p[k]).length;
}

const ACTION_MAP = [
    ['read',   '查看', 'read-on'],
    ['create', '新增', 'create-on'],
    ['update', '修改', 'update-on'],
    ['delete', '刪除', 'delete-on'],
    ['export', '匯出', 'export-on'],
];

function tagsHtml(perm) {
    return ACTION_MAP.map(([k, label, cls]) =>
        `<span class="tag ${perm[k] ? cls : 'off'}">${label}</span>`
    ).join('');
}

function esc(s) {
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderAccordion(groups, standalone) {
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
                    <span class="ac-perm-name">${esc(p.displayName)}</span>
                    <div class="ac-actions">${tagsHtml(p)}</div>
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
                <div class="standalone-card">
                    <span class="standalone-card-name">${esc(p.displayName)}</span>
                    <div class="ac-actions">${tagsHtml(p)}</div>
                </div>
            `);
        });
        $c.append($section);
    }
}
