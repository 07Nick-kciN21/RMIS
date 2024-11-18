import { getIndexMap } from './map.js'

let $indexMap
let currentOverlay;
let isAddPhotoEnabled = false;
export function initPhoto() {
    $indexMap = getIndexMap();
    var $tb = $("#tb-addPhoto");
    $(document).on('mousemove', function (e) {
        $('#tooltip')
            .css({
                left: e.pageX + 10 + 'px',
                top: e.pageY - 20 + 'px',
            });
    });
    $tb.on("click", function () {
        isAddPhotoEnabled = !isAddPhotoEnabled;
        if (isAddPhotoEnabled) {
            $tb.addClass("active");
            $('#tooltip').css('display', 'block');
        } else {
            $tb.removeClass("active");
            $('#tooltip').css('display', 'none');
            if (currentOverlay) {
                $indexMap.removeLayer(currentOverlay);
            }
        }
    });
    $indexMap.on('click', function (e) {
        if ($tb.hasClass("active")) {
            addPHOTO(e);
        }
    });
}

function addPHOTO(e) {
    if (currentOverlay) {
        $indexMap.removeLayer(currentOverlay);
    }

    var latlng = e.latlng;
    var bounds = [
        [latlng.lat - 0.01, latlng.lng - 0.01],
        [latlng.lat + 0.01, latlng.lng + 0.01]
    ];
    console.log(bounds);
    const wmsURL = 'https://wms.nlsc.gov.tw/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=PHOTO2&STYLES=&FORMAT=image%2Fpng&TRANSPARENT=true&BBOX=' + bounds[0][1] + ',' + bounds[0][0] + ',' + bounds[1][1] + ',' + bounds[1][0] + '&WIDTH=2048&HEIGHT=2048&SRS=EPSG:4326';
    console.log(wmsURL);
    currentOverlay = L.imageOverlay(wmsURL, bounds, { pane: 'photoPane', interactive: false }).addTo($indexMap);
}