import { Box3, Vector3 } from "three";
import type { Document2D } from "../documents/Document2D";

export class ZoomFitCommand{
    document: Document2D;
    constructor(document:Document2D){
        this.document=document;
    }
    execute(offset:number){
         var box=new Box3().setFromObject(this.document.scene);
        var size=box.getSize(new Vector3());
        var center=box.getCenter(new Vector3());
         this.document.camera.left = (-size.x * offset) / 2;
         this.document.camera.right = (size.x * offset) / 2;
         this.document.camera.top = (size.y * offset) / 2;
         this.document.camera.bottom = (-size.y * offset) / 2;
         this.document.camera.position.set(center.x, center.y, 1);
         this.document.camera.updateProjectionMatrix();
         this.document.controls.target.copy(center);
         this.document.controls.update();
    }
}