import { getIndexMap } from './map.js'

let $indexMap
let currentOverlay;
let isAddPhotoEnabled = false;
export function initPhoto() {
    $indexMap = getIndexMap();
    var $tb = $("#tb-addPhoto");
    $tb.on("click", function () {
        isAddPhotoEnabled = !isAddPhotoEnabled;
        if (isAddPhotoEnabled) {
            $tb.addClass("active");
        } else {
            $tb.removeClass("active");
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

    currentOverlay = L.imageOverlay('https://wms.nlsc.gov.tw/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=PHOTO2&STYLES=&FORMAT=image%2Fpng&TRANSPARENT=true&BBOX='
        + bounds[0][1] + ',' + bounds[0][0] + ',' + bounds[1][1] + ',' + bounds[1][0] + '&WIDTH=1024&HEIGHT=1024&SRS=EPSG:4326',
        bounds, { pane: 'photoPane', interactive: false }).addTo($indexMap);
}