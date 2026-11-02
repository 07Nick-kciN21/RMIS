// 平板以下：頂部導覽列收成漢堡選單（樣式見 css/responsive/base.css）
document.addEventListener('DOMContentLoaded', function () {
    const toggle = document.getElementById('menu-toggle');
    const panel = document.getElementById('col2');
    if (!toggle || !panel) return;

    function setOpen(open) {
        panel.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', String(open));
    }

    toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        setOpen(!panel.classList.contains('is-open'));
    });

    // 點選單外面或按 Esc 收起
    document.addEventListener('click', function (e) {
        if (!panel.contains(e.target)) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') setOpen(false);
    });
});
