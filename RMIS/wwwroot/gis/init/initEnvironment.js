
var initEnvironment = {
    url: {
        // apiBaseUrl: "http://localhost:40044",
        apiBaseUrl: "https://localhost:7167/",
    },
    layerConfigs: {
        basemap: [
            {
                id: 'google_streets',
                name: 'Google 街道圖',
                type: 'tile',
                url: 'http://{s}.google.com/vt?lyrs=m&x={x}&y={y}&z={z}&hl=zh_TW',
                subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
                maxZoom: 22,
                pane: 'basePane',
                initVisible: false
            },
            {
                id: 'google_satellite',
                name: 'Google 衛星圖',
                type: 'tile',
                url: 'http://{s}.google.com/vt?lyrs=s,h&x={x}&y={y}&z={z}&hl=zh_TW',
                subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
                maxZoom: 22,
                pane: 'basePane',
                initVisible: false
            },
            {
                id: 'google_terrain',
                name: 'Google 地形圖',
                type: 'tile',
                url: 'http://{s}.google.com/vt?lyrs=s&x={x}&y={y}&z={z}&hl=zh_TW',
                subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
                maxZoom: 22,
                pane: 'basePane',
                initVisible: false
            },
            {
                id: 'google_hybrid',
                name: 'Google 混合圖',
                type: 'tile',
                url: 'http://{s}.google.com/vt?lyrs=p&x={x}&y={y}&z={z}&hl=zh_TW',
                subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
                maxZoom: 22,
                pane: 'basePane',
                initVisible: false
            },
            {
                id: 'open_street_map',
                name: 'OpenStreetMap',
                type: 'tile',
                url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                maxZoom: 22,
                pane: 'basePane',
                initVisible: true
            },
            {
                id: 'sp2006nc',
                name: 'SP2006NC_3857',
                type: 'tile',
                url: 'https://data.csrsr.ncu.edu.tw/SP/SP2006NC_3857/{z}/{x}/{y}.png',
                maxZoom: 22,
                pane: 'basePane',
                initVisible: false
            }
        ]
    }
};

export { initEnvironment };
