/**
 * menu.js - 圖層選單控制（增強版）
 * 
 * 向後兼容原有功能，新增 LayerManager 整合
 */

// ============================================================================
// 全域變數（向後兼容）
// ============================================================================
export let layerList = {};

// ============================================================================
// 內部變數（新增）
// ============================================================================
let _appCore = null;
let _layerManager = null;
let _initialized = false;

// ============================================================================
// 初始化方法（保持原有簽名，向後兼容）
// ============================================================================

/**
 * 初始化選單（原有方法，保持不變）
 */
export function initMenu() {
    $.ajax({
        url: "/Home/BuildTreeData",
        type: "GET",
        success: function (data) {
            console.log(data.menuData);
            var menuHtml = generateMenu(data.menuData, "", 0);
            $('#imageDataContent').html(menuHtml);
            bindMenuEvents();
            return menuHtml;
        },
        error: function (xhr, status, error) {
            console.error("Failed to load menu:", xhr, status, error);
        }
    });
}

/**
 * 生成選單 HTML（原有方法，保持不變）
 */
export function generateMenu(data, parent_name, index) {
    let html = '<ul';
    if (index > 0) {
        html += ' class="menu-sub"';
    } else {
        html += ' id="imageDataMenu" class="menu-background"';
    }
    html += '>';
    
    data.forEach(function (item) {
        let liClass;
        if (index == 0) {
            liClass = 'menu-head';
        } else {
            if (item.tag == "node") {
                liClass = 'menu-sublayer';
            } else {
                liClass = 'menu-layer';
            }
        }

        let liId;
        if (item.tag == "node") {
            liId = '';
        } else {
            liId = ` id="${item.id}"`;
        }

        html += `<li class="${liClass}" ${liId}>`;

        let headingTag;
        let headingClass;

        if (index == 0) {
            headingTag = 'h4';
            headingClass = 'menu-title';
        } else {
            headingTag = 'span';
            headingClass = 'text-secondary';
        }

        if (item.tag == "node") {
            html += `
                <div class="menu-node">
                    <span class="menu-icon menu-close" id="menu-${item.id}"></span>
                    <${headingTag} class="${headingClass}">
                        ${item.text}
                    </${headingTag}>
                </div>`;
        } else {
            html += `
                <div class="switch switch-off" id="switch-${item.id}"></div>
                <${headingTag} class="${headingClass}">
                    ${item.text}
                </${headingTag}>`;
            layerList[item.id] = false;
        }
        
        if (item.children && item.children.length > 0) {
            html += generateMenu(item.children, item.text, index + 1);
        }
        
        html += `</li>`;
    });
    
    html += '</ul>';
    return html;
}

// ============================================================================
// 事件綁定（改良版，支援 LayerManager）
// ============================================================================

/**
 * 綁定選單事件（改良版）
 */
export function bindMenuEvents() {
    $(document).ready(function () {
        function initializeObserver(buttonId) {
            var button = $(`#${buttonId}`);
            var targetId = button.data('target');
            var targetElement = $(`#${targetId}`);
            
            if (targetElement.length) {
                observeDisplayChanges(button, targetElement);
            }
        }
    
        // 初始化觀察器
        ['imageDataBtn', 'userMenuBtn'].forEach(initializeObserver);
    });
    
    // 選單按鈕事件
    $('#imageDataBtn').click(function (e) {
        e.stopPropagation();
        var targetId = $(this).data('target');
        $(`#${targetId}`).toggle();
        updateOpenState($(this), $(`#${targetId}`));
    });
    
    $('#userMenuBtn').click(function (e) {
        e.stopPropagation();
        var targetId = $(this).data('target');
        $(`#${targetId}`).toggle();
        updateOpenState($(this), $(`#${targetId}`));
    });
    
    // 節點展開/收合事件
    $('.menu-node').click(function (e) {
        e.stopPropagation();
        $(this).next('.menu-sub').slideToggle();

        let $span = $(this).children('span');
        if ($span.hasClass('menu-close')) {
            $span.removeClass('menu-close').addClass('menu-open');
        } else {
            $span.removeClass('menu-open').addClass('menu-close');
        }
    });

    // 圖層開關事件（改良版，支援 LayerManager）
    $('.menu-layer').on('click', async function (e) {
        e.stopPropagation();
        
        var id = $(this).attr('id');
        var name = $(this).children('span').text();
        var $switch = $(this).children('.switch');
        
        console.log(`Toggle layer ${id}: ${name}`);
        
        // 判斷當前狀態
        const isOn = $switch.hasClass('switch-on');
        
        if (isOn) {
            // 關閉圖層
            await _removeLayer(id, $switch);
        } else {
            // 開啟圖層
            await _addLayer(id, name, $switch);
        }
    });
}

// ============================================================================
// 內部輔助方法
// ============================================================================

/**
 * 添加圖層（支援 LayerManager 或原有方式）
 * @private
 */
async function _addLayer(id, name, $switch) {
    try {
        if (_layerManager) {
            // ✨ 使用 LayerManager（新方式）
            console.log('Using LayerManager to add layer');
            await _layerManager.addPipeline(id, name);
            
            // 更新狀態
            layerList[id] = true;
            $switch.removeClass('switch-off').addClass('switch-on');
            
        } else {
            // ⚠️ 降級到原有方式（向後兼容）
            console.warn('LayerManager not available, using legacy method');
            
            const { addPipeline } = await import('./pipeline.js');
            const { add2List } = await import('./list.js');
            const { addLayer2Map } = await import('./layers.js');
            
            const result = await addPipeline(id);
            const { metaData, layers } = result;
            
            layerList[id] = true;
            add2List(id, name, layers, metaData);
            addLayer2Map(id, layers);
            $switch.removeClass('switch-off').addClass('switch-on');
        }
        
        console.log(`Layer ${id} added successfully`);
        
    } catch (error) {
        console.error(`Failed to add layer ${id}:`, error);
        alert('圖層載入失敗，請稍後再試');
    }
}

/**
 * 移除圖層（支援 LayerManager 或原有方式）
 * @private
 */
async function _removeLayer(id, $switch) {
    try {
        if (_layerManager) {
            // ✨ 使用 LayerManager（新方式）
            console.log('Using LayerManager to remove layer');
            await _layerManager.removePipeline(id);
            
            // 更新狀態
            layerList[id] = false;
            $switch.removeClass('switch-on').addClass('switch-off');
            
        } else {
            // ⚠️ 降級到原有方式（向後兼容）
            console.warn('LayerManager not available, using legacy method');
            
            const { removePipeline } = await import('./pipeline.js');
            const { remove2List } = await import('./list.js');
            
            await removePipeline(id);
            layerList[id] = false;
            remove2List(id);
            $switch.removeClass('switch-on').addClass('switch-off');
        }
        
        console.log(`Layer ${id} removed successfully`);
        
    } catch (error) {
        console.error(`Failed to remove layer ${id}:`, error);
        alert('圖層移除失敗，請稍後再試');
    }
}

/**
 * 觀察元素顯示變化
 * @private
 */
function observeDisplayChanges(triggerElement, targetElement) {
    const observer = new MutationObserver(() => {
        updateOpenState(triggerElement, targetElement);
    });

    observer.observe(targetElement[0], {
        attributes: true,
        attributeFilter: ['style']
    });
}

/**
 * 更新按鈕開啟狀態
 * @private
 */
function updateOpenState(triggerElement, targetElement) {
    if (targetElement.is(':visible')) {
        triggerElement.addClass("open");
    } else {
        triggerElement.removeClass("open");
    }
}

// ============================================================================
// 新增：LayerManager 整合方法
// ============================================================================

/**
 * 整合 LayerManager（新增方法）
 * @param {Object} appCore - 應用核心物件
 */
export function integrateLayerManager(appCore) {
    if (_initialized) {
        console.warn('LayerManager already integrated');
        return;
    }
    
    _appCore = appCore;
    _layerManager = appCore.layerManager;
    _initialized = true;
    
    console.log('✅ LayerManager integrated with menu.js');
    console.log('Menu will now use LayerManager for layer operations');
}

/**
 * 檢查是否已整合 LayerManager
 * @returns {boolean}
 */
export function isLayerManagerIntegrated() {
    return _initialized && _layerManager !== null;
}

/**
 * 獲取 LayerManager 實例
 * @returns {Object|null}
 */
export function getLayerManager() {
    return _layerManager;
}

// ============================================================================
// facilityLayerList 模組（原有結構，保持不變）
// ============================================================================

let _fId = "facilityLayerList";
let _initFlag = false;

var instance = {
    id: _fId,
    set: function (appCore) {
        _appCore = appCore;
        
        // ✨ 自動整合 LayerManager（如果可用）
        if (appCore.layerManager) {
            integrateLayerManager(appCore);
        }
        
        // 初始化選單
        initMenu();
        
        return this;
    },
    init: function () {
        console.log(`Module ${_fId} init`);
    },
    open: function () {
        if (!_initFlag) { 
            _initFlag = true; 
            instance.init(); 
        }
        console.log(`${_fId} open`);
    },
    close: function () {
        console.log(`${_fId} close`);
    },
};

export { instance as facilityLayerList };