
var initEnvironment = {
    url: {
        // apiBaseUrl: "http://localhost:40044",
        apiBaseUrl: "https://localhost:7167/",
    },
    layerConfigs: {
        basemap: [
            {
                id: "nlscmap",
                name: "臺灣通用電子地圖",
                image: "nlsc.png",
                type: "wmts",
                listMode: "hide",
                minLevel: 19,
                opacity: 0.75,
                initVisible: true,
                identifier: "EMAP",
                serviceMode: "KVP",
                url: "https://wmts.nlsc.gov.tw/wmts"
            },
            {
                id: "osm",
                name: "開放街道地圖",
                image: "OSM.png",
                type: "osm",
                listMode: "hide",
                //minLevel: 19,
                opacity: 0.75,
                initVisible: true,
                url: "osm"
            },
            {
                id: "none",
                name: "關閉底圖",
                image: "XX.png",
                type: "none",
                url: null
            }
        ]
    }
};

export { initEnvironment };
