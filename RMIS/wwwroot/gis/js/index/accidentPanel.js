

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