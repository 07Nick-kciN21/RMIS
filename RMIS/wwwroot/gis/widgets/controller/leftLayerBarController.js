/**
 * LayerBarController.js - 圖層列表控制器（升級版）
 * 
 * 擴展原有的 leftLayerBarController，整合完整的功能：
 * - 基礎 UI 生成（原有功能）
 * - 事件綁定（新增功能）
 * - LayerManager 整合（新增功能）
 * 
 * 向後兼容：保留原有的 add() 和 remove() 方法
 */

class LayerBarController {
    /**
     * @param {string} containerSelector - 容器選擇器
     * @param {Object} appCore - 應用核心物件（可選，用於整合）
     */
    constructor(containerSelector = '#layerBarContainer', appCore = null) {
        this.$container = $(containerSelector);
        this._appCore = appCore;
        this._layerManager = appCore?.layerManager;
        
        // 是否啟用完整功能（事件綁定、LayerManager 整合）
        this._fullFeatured = !!appCore;
        
        // 如果啟用完整功能，監聽 LayerManager 事件
        if (this._fullFeatured) {
            this._bindLayerManagerEvents();
        }
    }
    
    // ========================================================================
    // 基礎方法（向後兼容）
    // ========================================================================
    
    /**
     * 添加圖層項目（基礎版，向後兼容）
     * @param {string|number} id - Pipeline ID
     * @param {string} name - Pipeline 名稱
     * @param {Array} datas - 圖層資料陣列
     * @param {Object} metaData - 詮釋資料（可選）
     */
    add(id, name, datas, metaData) {
        // 避免重複添加
        if (this.$container.find('#layerBar_' + id).length > 0) {
            console.warn(`Layer bar ${id} already exists`);
            return;
        }
        
        // 生成子圖層列表
        let sections = "";
        datas.forEach((data) => {
            sections += `
                <div class="section" id="section_${data.id}">
                    <span class="section_icon" style="background-image: url('/img/${data.svg}');"></span>
                    ${data.name}
                </div>`;
        });
        
        // 決定是否顯示完整功能
        let layerItem;
        if (this._fullFeatured) {
            // 完整版 UI（包含所有控制按鈕）
            layerItem = this._generateFullLayerItem(id, name, sections, metaData);
        } else {
            // 簡化版 UI（向後兼容）
            layerItem = this._generateBasicLayerItem(id, name, sections);
        }
        
        // 添加到容器
        this.$container.append(layerItem);
        
        // 如果啟用完整功能，綁定事件
        if (this._fullFeatured) {
            this._bindItemEvents(id, name, datas, metaData);
        }
    }
    
    /**
     * 移除圖層項目
     * @param {string|number} id - Pipeline ID
     */
    remove(id) {
        this.$container.find('#layerBar_' + id).remove();
    }
    
    // ========================================================================
    // 內部方法：UI 生成
    // ========================================================================
    
    /**
     * 生成基礎版 UI（原版功能）
     * @private
     */
    _generateBasicLayerItem(id, name, sections) {
        return `
            <div class="layerBar featureLayer-Bg" id="layerBar_${id}">
                <div class="layerTitle">
                    <div style="display:flex; border-bottom:solid 1px #160386;"> 
                        <span class="menu-icon menu-open" id="layerLegend_${id}"></span>
                        <div class="layerName">${name}</div>
                    </div>
                    <div id="sections_${id}">${sections}</div>
                </div>
            </div>`;
    }
    
    /**
     * 生成完整版 UI（含所有控制按鈕）
     * @private
     */
    _generateFullLayerItem(id, name, sections, metaData) {
        // 詮釋資料按鈕（根據是否有資料決定樣式）
        const metaItemHtml = metaData
            ? `<li id="more_action3_${id}">檢視詮釋資料</li>`
            : `<li id="more_action3_${id}" style="color: #ccc; cursor: default; pointer-events: none;">檢視詮釋資料</li>`;
        
        return `
            <div class="layerBar featureLayer-Bg" id="layerBar_${id}">
                <div class="layerTitle" style="border-top">
                    <div style="display:flex; border-bottom:solid 1px #160386;"> 
                        <span class="menu-icon menu-open" id="layerLegend_${id}"></span>
                        <div class="layerName">${name}</div>
                    </div>
                    <div id="sections_${id}">
                        ${sections}
                    </div>
                </div>
                <div class="more more-off" id="more_${id}">
                    <ul class="moreMenu">
                        <li id="more_action2_${id}">編輯圖徽</li>
                        ${metaItemHtml}
                        <li id="more_action4_${id}">
                            透明度
                            <input class="layerOpacity" type="text" value="100" placeholder="100">
                        </li>
                    </ul>
                </div>
                <div class="eye eyeOpen" id="eye_${id}"></div>
                <div class="layerRemove" id="layerRemove_${id}"></div>
            </div>`;
    }
    
    // ========================================================================
    // 事件綁定（完整功能）
    // ========================================================================
    
    /**
     * 綁定 LayerManager 事件
     * @private
     */
    _bindLayerManagerEvents() {
        if (!this._layerManager) return;
        
        // 監聽圖層添加事件
        this._layerManager.on('onLayerAdd', (data) => {
            this.add(
                data.pipelineId,
                data.pipelineName,
                data.layers,
                data.metaData
            );
        });
        
        // 監聽圖層移除事件
        this._layerManager.on('onLayerRemove', (data) => {
            this.remove(data.pipelineId);
        });
    }
    
    /**
     * 綁定圖層項目的所有事件
     * @private
     */
    _bindItemEvents(id, name, datas, metaData) {
        const layerIds = datas.map(d => d.id);
        
        // ====================================================================
        // 更多選單切換
        // ====================================================================
        $(`#more_${id}`).on('click', function() {
            $(this).find('.moreMenu').toggle();
            const offset = $(this).offset();
            const height = $(this).outerHeight();
            $(this).find('.moreMenu').css('top', offset.top + height);
        });
        
        // ====================================================================
        // 編輯圖徽
        // ====================================================================
        $(`#more_action2_${id}`).on('click', () => {
            if (this._appCore.handler?.layerEditor) {
                this._appCore.handler.layerEditor.open(id, name, layerIds);
            } else {
                console.warn('layerEditor not available');
            }
        });
        
        // ====================================================================
        // 檢視詮釋資料
        // ====================================================================
        $(`#more_action3_${id}`).on('click', () => {
            if (!metaData) return;
            
            if (this._appCore.handler?.metaDataPanel) {
                this._appCore.handler.metaDataPanel.open(metaData);
            } else {
                console.warn('metaDataPanel not available');
            }
        });
        
        // ====================================================================
        // 透明度控制
        // ====================================================================
        $(`#more_action4_${id} .layerOpacity`)
            .on('click', (e) => {
                e.stopPropagation(); // 防止關閉選單
            })
            .on('blur', (e) => {
                const opacity = parseInt($(e.target).val()) || 100;
                if (this._layerManager) {
                    this._layerManager.setLayerOpacity(id, opacity);
                }
            });
        
        // ====================================================================
        // 可見性切換（眼睛圖示）
        // ====================================================================
        $(`#eye_${id}`).on('click', () => {
            const $eye = $(`#eye_${id}`);
            const isVisible = $eye.hasClass('eyeOpen');
            
            // 切換狀態
            if (this._layerManager) {
                this._layerManager.toggleLayerVisibility(id, !isVisible);
            }
            
            // 更新 UI
            if (isVisible) {
                $eye.removeClass('eyeOpen').addClass('eyeClosed');
            } else {
                $eye.removeClass('eyeClosed').addClass('eyeOpen');
            }
        });
        
        // ====================================================================
        // 圖例展開/收合
        // ====================================================================
        $(`#layerLegend_${id}`).on('click', function() {
            const isOpen = $(this).hasClass('menu-open');
            
            if (isOpen) {
                $(this).removeClass('menu-open').addClass('menu-close');
                $(`#sections_${id}`).css('display', 'none');
            } else {
                $(this).removeClass('menu-close').addClass('menu-open');
                $(`#sections_${id}`).css('display', 'block');
            }
        });
        
        // ====================================================================
        // 圖層移除
        // ====================================================================
        $(`#layerRemove_${id}`).on('click', async () => {
            try {
                if (this._layerManager) {
                    // 移除圖層
                    await this._layerManager.removePipeline(id);
                    
                    // 更新選單開關狀態
                    const $switch = $(`#switch-${id}`);
                    $switch.removeClass('switch-on').addClass('switch-off');
                }
            } catch (error) {
                console.error('Failed to remove layer:', error);
            }
        });
    }
    
    // ========================================================================
    // 公開方法：升級現有實例
    // ========================================================================
    
    /**
     * 升級現有實例，啟用完整功能
     * @param {Object} appCore - 應用核心物件
     */
    upgrade(appCore) {
        if (this._fullFeatured) {
            console.warn('Already upgraded');
            return;
        }
        
        this._appCore = appCore;
        this._layerManager = appCore?.layerManager;
        this._fullFeatured = true;
        
        // 綁定 LayerManager 事件
        this._bindLayerManagerEvents();
        
        console.log('LayerBarController upgraded to full-featured mode');
    }
    
    /**
     * 檢查是否啟用完整功能
     * @returns {boolean}
     */
    isFullFeatured() {
        return this._fullFeatured;
    }
}

export { LayerBarController };