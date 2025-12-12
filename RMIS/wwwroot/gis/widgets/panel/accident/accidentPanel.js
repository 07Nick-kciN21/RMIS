let _fId = "accidentPanel";
let _appCore, _apiBaseUrl;

var instance = {
    id: _fId,
    set: function (appCore) {
        _apiBaseUrl = appCore.environment.url.apiBaseUrl;
        _appCore = appCore;
        return this;
    },
    init: function () {
        console.log(`panel ${_fId} init`);
        $indexMap = _appCore.map.leafletMap;
        initPainterPanel();
        // initEstateBuildItem();
    },
    open: function () {
        if (!_initFlag) { _initFlag = true; instance.init(); }
        console.log(`${_fId} open`);
    },
    close: function () {
        //console.log(`${_fId} close`);
    },
};
export { instance as painterPanel };

export function initAccidentPanel(){
    $('input[name="accradio"]').on('change', function () {
        console.log('radio change');
        $('input[name="accradio"]').each(function () {
            $(this).next('label').removeClass('select');
        });
        $(this).next('label').addClass('select');
        const selectedLabel = $(this).next('label').text();
        $('#acc1, #acc2, #acc3').css('display', 'none');

        if (selectedLabel === '圖層開關') {
            $('#acc1').css('display', 'block');
        } else if (selectedLabel === '簡易查詢') {
            $('#acc2').css('display', 'block');
        } else if (selectedLabel === '資料匯出') {
            $('#acc3').css('display', 'block');
        }
    });
}