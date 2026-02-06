/**
 * 儀表板模組 - Dashboard Box
 * 使用 jQuery + Chart.js
 */
const DashboardBox = (function () {
    // 圖表實例
    let chartBudgetAllocation = null;
    let chartDistrictCount = null;
    let chartStatusRatio = null;
    let chartSCurve = null;

    // 模擬資料 (之後可替換為 API)
    const mockData = {
        kpi: {
            totalCount: 42,
            totalTrend: '+3',
            totalLength: 8.5,
            totalBudget: 12.8,
            budgetProgress: 70,
            contractAmount: 8.4,
            contractPercent: 65
        },
        latestProjects: [
            { id: 'PJ-113-001', name: '中壢區龍岡路三段拓寬工程', status: '設計與施工', createDate: '2023-01-15' },
            { id: 'PJ-113-004', name: '平鎮區金陵路四段瓶頸打通', status: '用地取得', createDate: '2023-05-20' },
            { id: 'PJ-113-008', name: '楊梅區校前路人行道改善', status: '前期規劃', createDate: '2023-09-10' },
            { id: 'PJ-113-012', name: '桃園區大興西路路平專案', status: '設計與施工', createDate: '2023-10-05' },
            { id: 'PJ-113-015', name: '八德區介壽路排水改善工程', status: '前期規劃', createDate: '2023-11-12' }
        ],
        budgetAllocation: {
            labels: ['工程費', '用地費', '規設費'],
            data: [65, 25, 10],
            colors: ['#2563eb', '#f59e0b', '#64748b']
        },
        districtCount: {
            labels: ['中壢區', '桃園區', '平鎮區', '楊梅區', '八德區', '大溪區'],
            data: [12, 15, 8, 5, 9, 3]
        },
        statusRatio: {
            labels: ['施工中', '規劃中', '用地取得'],
            data: [40, 30, 30],
            colors: ['#22c55e', '#3b82f6', '#ef4444']
        },
        sCurve: {
            labels: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
            target: [5, 10, 18, 28, 40, 52, 64, 75, 84, 91, 96, 100],
            actual: [3, 8, 15, 25, 38, 50, 58, null, null, null, null, null]
        }
    };

    /**
     * 初始化儀表板
     */
    function init() {
        console.log('DashboardBox 初始化');

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
     * 載入 KPI 數據
     */
    function loadKPIData() {
        const kpi = mockData.kpi;

        $('#kpi-total-count').text(kpi.totalCount);
        $('#kpi-total-trend').text(`較上月 ${kpi.totalTrend}`);
        $('#kpi-total-length').text(kpi.totalLength);
        $('#kpi-total-budget').text(kpi.totalBudget);
        $('#kpi-budget-progress').css('width', kpi.budgetProgress + '%');
        $('#kpi-contract-amount').text(kpi.contractAmount);
        $('#kpi-contract-percent').text(`佔總經費 ${kpi.contractPercent}%`);
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
            data: { count: 5 },
            success: function(projects) {
                $list.empty();

                if (!projects || projects.length === 0) {
                    $list.html('<div class="latest-project-item"><div class="project-info"><div class="project-name" style="color:#94a3b8;">目前沒有專案資料</div></div></div>');
                    return;
                }

                projects.forEach(project => {
                    const stepText = getStepText(project.step);
                    const stepClass = getStepClass(project.step);
                    const createDate = formatDate(project.createTime);
                    const projectName = project.projectName || project.projectId;

                    const $item = $(`
                        <div class="latest-project-item" data-project-id="${project.projectId}">
                            <div class="project-info">
                                <div class="project-name" title="${projectName}">${projectName}</div>
                                <div class="project-date">${createDate}</div>
                            </div>
                            <span class="project-status ${stepClass}">${stepText}</span>
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
     * 取得階段文字
     */
    function getStepText(step) {
        const stepMap = {
            1: '前期規劃',
            2: '用地取得',
            3: '設計與施工'
        };
        return stepMap[step] || `階段 ${step}`;
    }

    /**
     * 取得階段對應的 CSS class
     */
    function getStepClass(step) {
        switch (step) {
            case 1: return 'planning';
            case 2: return 'land';
            case 3: return 'design';
            default: return 'planning';
        }
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
        initStatusRatioChart();
        initSCurveChart();
    }

    /**
     * 經費分配結構圓餅圖
     */
    function initBudgetAllocationChart() {
        const ctx = document.getElementById('chart-budget-allocation');
        if (!ctx) return;

        const data = mockData.budgetAllocation;

        chartBudgetAllocation = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.data,
                    backgroundColor: data.colors,
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
    }

    /**
     * 行政區案件數量長條圖
     */
    function initDistrictCountChart() {
        const ctx = document.getElementById('chart-district-count');
        if (!ctx) return;

        const data = mockData.districtCount;

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
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#e2e8f0',
                            drawBorder: false
                        },
                        ticks: {
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
    }

    /**
     * 案件狀態佔比甜甜圈圖
     */
    function initStatusRatioChart() {
        const ctx = document.getElementById('chart-status-ratio');
        if (!ctx) return;

        const data = mockData.statusRatio;

        chartStatusRatio = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.data,
                    backgroundColor: data.colors,
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '55%',
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
    }

    /**
     * S曲線圖 (折線圖)
     */
    function initSCurveChart() {
        const ctx = document.getElementById('chart-s-curve');
        if (!ctx) return;

        const data = mockData.sCurve;

        chartSCurve = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: '預定進度',
                        data: data.target,
                        borderColor: '#cbd5e1',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0
                    },
                    {
                        label: '實際進度',
                        data: data.actual,
                        borderColor: '#2563eb',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 4,
                        pointBackgroundColor: '#2563eb',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.raw === null) return '';
                                return `${context.dataset.label}: ${context.raw}%`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        min: 0,
                        max: 100,
                        grid: {
                            color: '#e2e8f0',
                            drawBorder: false
                        },
                        ticks: {
                            callback: value => value + '%',
                            font: { size: 10 },
                            color: '#94a3b8'
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { size: 10 },
                            color: '#64748b'
                        }
                    }
                }
            }
        });
    }

    /**
     * 綁定事件
     */
    function bindEvents() {
        // 套用篩選
        $('#btn-apply-filter').on('click', function() {
            const district = $('#filter-district').val();
            const year = $('#filter-year').val();
            const budget = $('#filter-budget').val();

            console.log('套用篩選:', { district, year, budget });
            // TODO: 呼叫 API 重新載入數據
            alert('篩選功能開發中...');
        });

        // 查看更多專案
        $('#btn-view-all-projects').on('click', function() {
            // 關閉儀表板，開啟專案列表
            closeBox('full-box');
            // TODO: 開啟專案查詢頁面
        });

        // 點擊專案項目
        $('#latest-projects-list').on('click', '.latest-project-item', function() {
            const projectId = $(this).data('project-id');
            console.log('點擊專案:', projectId);
            // TODO: 開啟專案詳情
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
        if (chartStatusRatio) {
            chartStatusRatio.destroy();
            chartStatusRatio = null;
        }
        if (chartSCurve) {
            chartSCurve.destroy();
            chartSCurve = null;
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
