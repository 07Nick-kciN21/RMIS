export class Pagination {
    constructor(options){
        this.dataList = options.dataList || [];
        this.$container = $(`#${options.id}`);
        this.pageSize = options.pageSize || 10;
        this.currentPage = 1;
        this.onPageChangeCallback = options.onPageChange || function () {};

        this.renderPagination();
        this.bindEvents();
        this.updatePagination();
    }

    renderPagination() {
        this.$container.html(`
            <div class="tablePage d-flex align-items-center">
                <span>共 <span id="${this.getId('totalRecords')}"></span> 條</span>
                <div class="d-flex align-items-center">
                    <label class="me-2">顯示條目:</label>
                    <select id="${this.getId('pageSize')}" class="form-select form-select-sm" style="width: 80px;">
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                </div>
                <div>
                    <ul class="pagination mb-0">
                        <li class="page-item"><button class="page-link" id="${this.getId('prevPage')}" disabled>«</button></li>
                        <li class="page-item"><span class="page-link">第 <span id="${this.getId('currentPage')}">1</span> 頁</span></li>
                        <li class="page-item"><button class="page-link" id="${this.getId('nextPage')}">»</button></li>
                    </ul>
                </div>
                <div class="d-flex align-items-center">
                    <label class="me-2">前往:</label>
                    <input type="number" id="${this.getId('gotoPage')}" class="form-control form-control-sm" style="width: 60px;" min="1">
                    <button class="ms-2 btn btn-sm btn-primary" id="${this.getId('gotoPageBtn')}">頁</button>
                </div>
                <span>共 <span id="${this.getId('totalPages')}"></span> 頁</span>
            </div>
        `);

        // 綁定 UI 元素
        this.$totalRecords = this.$container.find(`#${this.getId('totalRecords')}`);
        this.$totalPages = this.$container.find(`#${this.getId('totalPages')}`);
        this.$currentPage = this.$container.find(`#${this.getId('currentPage')}`);
        this.$pageSize = this.$container.find(`#${this.getId('pageSize')}`);
        this.$gotoPage = this.$container.find(`#${this.getId('gotoPage')}`);
        this.$gotoPageBtn = this.$container.find(`#${this.getId('gotoPageBtn')}`);
        this.$prevPage = this.$container.find(`#${this.getId('prevPage')}`);
        this.$nextPage = this.$container.find(`#${this.getId('nextPage')}`);
    }

    getId(name) {
        return `${this.prefix}-${name}`;
    }

    updatePagination() {
        this.totalRecords = this.dataList.length;
        this.totalPages = Math.ceil(this.totalRecords / this.pageSize) || 1;

        this.$totalRecords.text(this.totalRecords);
        this.$totalPages.text(this.totalPages);
        this.$currentPage.text(this.currentPage);
        this.$gotoPage.attr("max", this.totalPages);

        this.$prevPage.prop("disabled", this.currentPage <= 1);
        this.$nextPage.prop("disabled", this.currentPage >= this.totalPages);

       // 計算當前頁面應該顯示的資料範圍
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const paginatedData = this.dataList.slice(startIndex, endIndex);

        // 呼叫回調函數來更新資料，只傳遞當前頁面資料
        this.onPageChangeCallback(paginatedData);
    }
        
    bindEvents() {
        this.$prevPage.on("click", () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.updatePagination();
            }
        });

        this.$nextPage.on("click", () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.updatePagination();
            }
        });

        this.$pageSize.on("change", () => {
            this.pageSize = parseInt(this.$pageSize.val(), 10);
            this.currentPage = 1;
            this.updatePagination();
        });

        this.$gotoPage.on("input", (e) => {
            let value = parseInt(e.target.value, 10);
            if (isNaN(value) || value < 1) {
                e.target.value = 1;
            } else if (value > this.totalPages) {
                e.target.value = this.totalPages;
            }
        });

        this.$gotoPageBtn.on("click", () => {
            let gotoPage = parseInt(this.$gotoPage.val(), 10);
            if (!isNaN(gotoPage) && gotoPage >= 1 && gotoPage <= this.totalPages) {
                this.currentPage = gotoPage;
                this.updatePagination();
            }
        });
    }

    updateDataList(newDataList) {
        this.dataList = newDataList || [];
        this.currentPage = 1;
        this.updatePagination();
    }
}

// ✅ `initPage()` 幫助你快速創建分頁
export function initPage(id, callback, dataList, pageSize = 5) {
    return new Pagination({
        id: id,
        onPageChange: callback,
        dataList: dataList,
        pageSize: pageSize
    });
}
