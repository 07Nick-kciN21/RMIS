import {pointEdit} from './pointEdit.js';
import {lineEdit} from './lineEdit.js';
import {planeEdit} from './planeEdit.js';

export function layerEditor(id, name, layersId){
    // /api/MapAPI/GetGeoKindByPipeId?pipelineId={id}
    fetch(`/api/MapAPI/GetGeoKindByPipeId?pipelineId=${id}`)
    .then(response => response.json())
    .then(data => {
        console.log("GetGeoKindByPipeId", data.kind);
        if(data.kind == "point"){
            pointEdit(id, name, layersId);
        }
        else if(data.kind == "line"){
            lineEdit(id, name, layersId);
        }
        else if(data.kind == "plane"){
            planeEdit(id, name, layersId);
        }
    });
}
