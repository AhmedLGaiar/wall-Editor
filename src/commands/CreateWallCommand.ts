import { Vector3, Vector2, PlaneGeometry, MeshBasicMaterial, DoubleSide, Mesh } from "three";
import type { Document2D } from "../documents/Document2D";
import type { ICommand } from "./ICommand";

export class CreateWallCommand implements ICommand{
    document:Document2D
 startPoint?:Vector3|null;
 endPoint?:Vector3|null;
    mouse:Vector2=new Vector2();
    drawing:boolean=false;
    previewWall:any;

    constructor(document:Document2D){
        this.document=document;
    }
    onMouseUp(){
  if(this.drawing&&this.startPoint){
            const endPoint=this.document.unproject(new Vector3(this.mouse.x,this.mouse.y,0))
          this.endPoint=endPoint;
            if(this.previewWall){
                this.document.removeObject(this.previewWall);
                
                this.previewWall.geometry.dispose();
                this.previewWall.material.dispose();
                this.previewWall=null;
            }
            this.execute();
            
         
           }
              this.drawing=false;
            this.startPoint=null;
    }
    onMouseDown(e:MouseEvent){
         if(e.button!==0)return;
                this.drawing=true;
                this.startPoint=this.document.unproject( new Vector3(this.mouse.x,this.mouse.y,0));
    }
    onMouseMove(e:MouseEvent){
             var rect=this.document.getBoundingClientRect();
                    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
         if(this.drawing){
            var currentPoint=this.document.unproject( new Vector3(this.mouse.x,this.mouse.y,0));
            if(this.startPoint){
                var wallVec=new Vector2(currentPoint.x-this.startPoint.x,currentPoint.y-this.startPoint.y);
                var length=wallVec.length();
                 var angle=Math.atan2(wallVec.y,wallVec.x) 
                var geometry=new PlaneGeometry(length,1);
                var material=new MeshBasicMaterial({
                    color:'gray',
                    transparent:true,
                    opacity:.5,
                    side:DoubleSide
                });
                if(this.previewWall){
                    this.document.removeObject(this.previewWall);
                    this.previewWall.geometry.dispose();
                     this.previewWall.material.dispose();
                }
                this.previewWall=new Mesh(geometry,material);
                this.previewWall.position.set(
                    ((this.startPoint.x+currentPoint.x)/2),
                   ((this.startPoint.y+currentPoint.y)/2),
                   0
                );
                this.previewWall.rotation.z=angle;
                this.document.addObject(this.previewWall);
            }
         }
    }
    execute(){

    this.document.drawWall(this.startPoint as Vector3,this.endPoint as Vector3);
    }
}