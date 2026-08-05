/**
 * 儀表板模組 - Dashboard Box
 * 使用 jQuery + Chart.js
 */
const DashboardBox = (function () {
    // 圖表實例
    let chartBudgetAllocation = null;
    let chartDistrictCount = null;


    /**
     * 取得目前篩選參數
     */
    function getFilterParams() {
        return {
            district: $('#filter-district').val() || '',
            year: $('#filter-year').val() || '',
            budget: $('#filter-budget').val() || ''
        };
    }

    /**
     * 初始化儀表板
     */
    function init() {
        console.log('DashboardBox 初始化');

        // 載入年度篩選選項
        loadYearOptions();

        // 載入 KPI 數據
        loadKPIData();

        // 載入最新立案
        loadLatestProjects();

        // 初始化圖表
        initCharts();

        // 綁定事件
        bindEvents();
    }

    /**
     * 重新載入所有數據（套用篩選）
     */
    function reloadDashboard() {
        loadKPIData();
        loadLatestProjects();
        initCharts();
    }

    /**
     * 載入 KPI 數據
     */
    function loadKPIData() {
        $.ajax({
            url: '/api/RoadProject/GetDashboardKPI',
            data: getFilterParams(),
            method: 'GET',
            success: function(kpi) {
                $('#kpi-total-count').text(kpi.totalCount);
                const sign = kpi.monthDiff >= 0 ? '+' : '';
                $('#kpi-total-trend')
                    .text(`較上月 ${sign}${kpi.monthDiff}`)
                    .removeClass('positive negative')
                    .addClass(kpi.monthDiff >= 0 ? 'positive' : 'negative');
                $('#kpi-total-budget').text(kpi.totalBudget);
                $('#kpi-total-length').text(kpi.totalLength);
                $('#kpi-contract-amount').text(kpi.contractAmount);
                $('#kpi-contract-percent').text(`佔總經費 ${kpi.contractPercent}%`);
            },
            error: function() {
                $('#kpi-total-count').text('--');
                $('#kpi-total-trend').text('載入失敗');
                $('#kpi-total-budget').text('--');
                $('#kpi-total-length').text('--');
                $('#kpi-contract-amount').text('--');
                $('#kpi-contract-percent').text('佔總經費 --%');
            }
        });
    }

    /**
     * 載入年度篩選選項（動態從後端取得資料庫中現有的審議年度）
     */
    function loadYearOptions() {
        const $select = $('#filter-year');

        $.ajax({
            url: '/api/RoadProject/GetAvailableYears',
            method: 'GET',
            success: function(years) {
                const currentValue = $select.val();
                $select.find('option:not(:first)').remove();

                (years || []).forEach(year => {
                    $select.append(`<option value="${year}">${year} 年度</option>`);
                });

                if (currentValue) {
                    $select.val(currentValue);
                }
            },
            error: function() {
                console.error('載入年度選項失敗');
            }
        });
    }

    /**
     * 載入最新立案列表
     */
    function loadLatestProjects() {
        const $list = $('#latest-projects-list');
        $list.html('<div class="latest-project-item"><div class="project-info"><div class="project-name">載入中...</div></div></div>');

        $.ajax({
            url: '/api/RoadProject/GetLatestProjects',
            method: 'GET',
            data: { count: 5, ...getFilterParams() },
            success: function(projects) {
                $list.empty();

                if (!projects || projects.length === 0) {
                    $list.html('<div class="latest-project-item"><div class="project-info"><div class="project-name" style="color:#94a3b8;">目前沒有專案資料</div></div></div>');
                    return;
                }

                projects.forEach(project => {
                    const createDate = formatDate(project.createTime);
                    const projectName = project.projectName || project.projectId;

                    const $item = $(`
                        <div class="latest-project-item" data-project-id="${project.projectId}">
                            <div class="project-info">
                                <div class="project-name" title="${projectName}">${projectName}</div>
                                <div class="project-date">${createDate}</div>
                            </div>
                        </div>
                    `);
                    $list.append($item);
                });
            },
            error: function(xhr, status, error) {
                console.error('載入最新立案失敗:', error);
                $list.html('<div class="latest-project-item"><div class="project-info"><div class="project-name" style="color:#ef4444;">載入失敗</div></div></div>');
            }
        });
    }

    /**
     * 格式化日期
     */
    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * 初始化所有圖表
     */
    function initCharts() {
        initBudgetAllocationChart();
        initDistrictCountChart();
    }

    /**
     * 經費分配結構圓餅圖
     */
    function initBudgetAllocationChart() {
        const ctx = document.getElementById('chart-budget-allocation');
        if (!ctx) return;

        const colors = ['#2563eb', '#f59e0b', '#64748b'];

        $.ajax({
            url: '/api/RoadProject/GetBudgetAllocation',
            data: getFilterParams(),
            method: 'GET',
            success: function(data) {
                if (chartBudgetAllocation) { chartBudgetAllocation.destroy(); chartBudgetAllocation = null; }
                chartBudgetAllocation = new Chart(ctx, {
                    type: 'pie',
                    data: {
                        labels: data.labels,
                        datasets: [{
                            data: data.data,
                            backgroundColor: colors,
                            borderWidth: 2,
                            borderColor: '#fff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    padding: 15,
                                    usePointStyle: true,
                                    pointStyle: 'rectRounded',
                                    font: { size: 11 }
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return `${context.label}: ${context.raw}%`;
                                    }
                                }
                            }
                        }
                    }
                });
            },
            error: function() {
                console.error('載入經費分配資料失敗');
            }
        });
    }

    /**
     * 行政區案件數量長條圖
     */
    function initDistrictCountChart() {
        const ctx = document.getElementById('chart-district-count');
        if (!ctx) return;

        $.ajax({
            url: '/api/RoadProject/GetDistrictCount',
            data: getFilterParams(),
            method: 'GET',
            xhrFields: { withCredentials: true },
            success: function(data) {
                if (!data.labels || data.labels.length === 0) {
                    $(ctx).closest('.chart-canvas-container').html('<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:13px;">目前無資料</div>');
                    return;
                }
                if (chartDistrictCount) { chartDistrictCount.destroy(); chartDistrictCount = null; }
                chartDistrictCount = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: data.labels,
                        datasets: [{
                            label: '案件數',
                            data: data.data,
                            backgroundColor: '#059669',
                            borderRadius: 4,
                            barThickness: 32
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return `${context.raw} 件`;
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                grid: {
                                    color: '#e2e8f0',
                                    drawBorder: false
                                },
                                ticks: {
                                    stepSize: 1,
                                    font: { size: 10 },
                                    color: '#94a3b8'
                                }
                            },
                            x: {
                                grid: { display: false },
                                ticks: {
                                    font: { size: 10, weight: '600' },
                                    color: '#64748b'
                                }
                            }
                        }
                    }
                });
            },
            error: function(xhr) {
                console.error('載入行政區案件數量失敗:', xhr.status);
                $(ctx).closest('.chart-canvas-container').html('<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#ef4444;font-size:13px;">載入失敗</div>');
            }
        });
    }

    /**
     * 綁定事件
     */
    function bindEvents() {
        // 套用篩選
        $('#btn-apply-filter').on('click', function() {
            reloadDashboard();
        });

        // 查看更多專案
        $('#btn-view-all-projects').on('click', function() {
            // 關閉儀表板，開啟專案查詢頁面
            closeBox('full-box');
            DashboardBox.close();
            if (window.BoxManager) {
                window.BoxManager.openLeftBoxPage('page-project', '專案查詢');
            }
        });

        // 點擊專案項目
        $('#latest-projects-list').on('click', '.latest-project-item', function() {
            const projectId = $(this).data('project-id');
            if (!projectId) return;

            // 關閉儀表板，開啟專案詳情
            closeBox('full-box');
            DashboardBox.close();
            if (window.RoadProjectView) {
                window.RoadProjectView.openViewById(projectId);
            }
        });
    }

    /**
     * 銷毀所有圖表 (切換頁面時呼叫)
     */
    function destroyCharts() {
        if (chartBudgetAllocation) {
            chartBudgetAllocation.destroy();
            chartBudgetAllocation = null;
        }
        if (chartDistrictCount) {
            chartDistrictCount.destroy();
            chartDistrictCount = null;
        }
    }

    /**
     * 開啟儀表板
     */
    function open() {
        console.log('DashboardBox.open() called');
        console.log('full-box element:', $('#full-box').length);

        $('#full-box').removeClass('hidden');
        $('#full-box-title').text('決策儀錶板');

        console.log('full-box hidden class removed:', !$('#full-box').hasClass('hidden'));

        // 隱藏其他 full-box 內的頁面，顯示儀表板
        $('#full-box .box-page').addClass('hidden');
        $('#dashboard-page').removeClass('hidden');

        // 初始化 (若尚未初始化)
        if (!chartBudgetAllocation) {
            init();
        }
    }

    /**
     * 關閉儀表板
     */
    function close() {
        destroyCharts();
    }

    // 公開 API
    return {
        init: init,
        open: open,
        close: close,
        destroyCharts: destroyCharts
    };
})();

// 當 DOM 載入完成後，若需要自動初始化可在此處呼叫
// $(document).ready(function() {
//     DashboardBox.init();
// });

console.log('dashboardBox.js loaded, DashboardBox:', typeof DashboardBox);
