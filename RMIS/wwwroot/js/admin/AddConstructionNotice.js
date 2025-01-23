$(document).ready(function () {
    $('#addLocationBtn').click(function () {
        var location = $('#ConstructionLocation').val();
        if(location == "") {
            alert("請輸入地點");
            return;
        }
        const locationTable = $('#locationTable');
        var newRow = locationTable.find('tbody').append('<tr></tr>');
        newRow.append(`<td>${location}</td>`);
    });
});

