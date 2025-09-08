export class Pagination {
    constructor(options){
        this.dataList = options.dataList || [];
        this.$container = $(`#${options.id}`);
        this.pageSize = options.pageSize || 1;
        this.currentPage = 1;
        this.onPageChangeCallback = options.onPageChange || function () {};

        this.renderPagination();
        this.bindEvents();
        this.updatePagination();
    }

    getId(name) {
        return `${this.$container.attr("id")}-${name}`;
    }

    renderPagination() {
        this.$container.html(`
            <div class="tablePage d-flex align-items-center flex-wrap gap-3">
                <div class="d-flex align-items-center">
                    <label class="me-2">顯示數目:</label>
                    <select id="${this.getId('pageSize')}" class="form-select form-select-sm" style="width: 80px;">
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                </div>

                <div>
                    <ul class="pagination mb-0 flex-wrap gap-1" id="${this.getId('pageNumbers')}">
                        <li class="page-item"><button class="page-link" id="${this.getId('prevPage')}" disabled>«</button></li>
                        <!-- page buttons here -->
                        <li class="page-item"><button class="page-link" id="${this.getId('nextPage')}">»</button></li>
                    </ul>
                </div>

                <span>共 <span id="${this.getId('totalPages')}"></span> 頁</span>
            </div>
        `);

        // 綁定 UI 元素
        this.$pageSize = this.$container.find(`#${this.getId('pageSize')}`);
        this.$prevPage = this.$container.find(`#${this.getId('prevPage')}`);
        this.$nextPage = this.$container.find(`#${this.getId('nextPage')}`);
        this.$totalPages = this.$container.find(`#${this.getId('totalPages')}`);
        this.$pageNumbers = this.$container.find(`#${this.getId('pageNumbers')}`);
    }

    updatePagination() {
        this.totalRecords = this.dataList.length;
        this.totalPages = Math.ceil(this.totalRecords / this.pageSize) || 1;

        this.$totalPages.text(this.totalPages);
        this.renderPageButtons();

        this.$prevPage.prop("disabled", this.currentPage <= 1);
        this.$nextPage.prop("disabled", this.currentPage >= this.totalPages);

        // 取得當前頁的資料
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        const currentPageData = this.dataList.slice(start, end);

        this.onPageChangeCallback(currentPageData);
    }

    renderPageButtons() {
        this.$pageNumbers.find(".page-number-btn, .ellipsis-btn, .goto-input").remove();
    
        const $next = this.$nextPage.parent();
        const total = this.totalPages;
        const current = this.currentPage;
    
        const createPageBtn = (page) => {
            const $btn = $(`
                <li class="page-item page-number-btn ${page === current ? 'select' : ''}">
                    <button class="page-link">${page}</button>
                </li>
            `);
            $btn.insertBefore($next);
            $btn.on("click", () => {
                this.currentPage = page;
                this.updatePagination();
            });
        };
    
        const createEllipsis = () => {
            const $ellipsis = $(`
                <li class="page-item ellipsis-btn">
                    <button class="page-link">...</button>
                </li>
            `);
            $ellipsis.insertBefore($next);
            $ellipsis.on("click", () => this.showGotoInput($ellipsis));
        };
    
        if (total <= 9) {
            for (let i = 1; i <= total; i++) createPageBtn(i);
        } else {
            if (current <= 5) {
                // 顯示前 7 頁 + ... + 最後一頁
                for (let i = 1; i <= 7; i++) createPageBtn(i);
                createEllipsis();
                createPageBtn(total);
            } else if (current >= total - 4) {
                // 顯示第一頁 + ... + 倒數 7 頁
                createPageBtn(1);
                createEllipsis();
                for (let i = total - 6; i <= total; i++) createPageBtn(i);
            } else {
                // 顯示第一頁 + ... + 當前前後各 2 頁 + ... + 最後一頁
                createPageBtn(1);
                createEllipsis();
                for (let i = current - 2; i <= current + 2; i++) createPageBtn(i);
                createEllipsis();
                createPageBtn(total);
            }
        }
    }
    
    
        
    showGotoInput($ellipsisItem) {
        // 替換 ellipsis 為輸入框
        const $inputItem = $(`
            <li class="page-item goto-input d-flex align-items-center">
                <input type="number" class="form-control form-control-sm" style="width: 70px;" min="1" max="${this.totalPages}" placeholder="跳轉">
            </li>
        `);
        $ellipsisItem.replaceWith($inputItem);

        const $input = $inputItem.find("input");
        $input.focus();

        const commit = () => {
            const val = parseInt($input.val(), 10);
            if (!isNaN(val) && val >= 1 && val <= this.totalPages) {
                this.currentPage = val;
                this.updatePagination();
            } else {
                this.updatePagination(); // 無效輸入則還原
            }
        };

        $input.on("keydown", (e) => {
            if (e.key === "Enter") commit();
            else if (e.key === "Escape") this.updatePagination();
        });

        $input.on("blur", () => setTimeout(() => this.updatePagination(), 200)); // 確保輸入完成
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
    }

    updateDataList(newDataList) {
        this.dataList = newDataList || [];
        this.currentPage = 1;
        this.updatePagination();
    }
}

// ✅ `initPage()` 幫助你快速創建分頁
export function initPage(id, callback, dataList, pageSize = 10) {
    return new Pagination({
        id: id,
        onPageChange: callback,
        dataList: dataList,
        pageSize: pageSize
    });
}
