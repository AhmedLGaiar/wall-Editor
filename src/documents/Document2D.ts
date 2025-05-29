import {AxesHelper, Box3, BoxGeometry, Color, DoubleSide, GridHelper, MathUtils, Mesh, MeshBasicMaterial, OrthographicCamera, PerspectiveCamera, PlaneGeometry, Scene, Vector2, Vector3, WebGLRenderer} from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
import { Resizer } from '../resizer';
import type { IDocument } from './IDocument';
import type { ICommand } from '../commands/ICommand';
import { CreateWallCommand } from '../commands/CreateWallCommand';
import { ZoomFitCommand } from '../commands/ZoomFitCommand';
class Document2D implements IDocument{
    container;
    scene;
    camera;
    controls;
    activeCommand:ICommand;
     
    constructor(canvas:HTMLElement){
        this.container=canvas;
        this.scene=this.createScene();
        this.camera=this.createCamera();
        new Resizer(canvas,this.camera);
        this.controls=this.addControls();
        this.addCube();
        this.addGridHelper();
        document.addEventListener('mousedown',this.onMouseDown.bind(this)); 
        document.addEventListener('mouseup',this.onMouseUp.bind(this));
         document.addEventListener('mousemove',this.onMouseMove.bind(this));
         this.zoomFit();
         this.activeCommand=new CreateWallCommand(this);
    }
    onMouseDown(e:MouseEvent){
        this.activeCommand.onMouseDown(e);
        
    }
    removeObject(obj:any){
        this.scene.remove(obj);
    }
     addObject(obj:any){
        this.scene.add(obj);
    }
    getBoundingClientRect( ){
     return this.container.getBoundingClientRect();
    }
    unproject(vec: Vector3){
        return vec.unproject(this.camera);
    }
    onMouseUp(e:MouseEvent){
      this.activeCommand.onMouseUp(e);
    }
    drawWall(start:Vector3,end:Vector3){
  var wallVec=new Vector2(end.x-start.x,end.y-start.y);
        var length=wallVec.length();
         var angle=Math.atan2(wallVec.y,wallVec.x) 
        var geometry=new PlaneGeometry(length,1);
        var material=new MeshBasicMaterial({
                    color: 0x6699ff,
        side: DoubleSide,
        transparent: true,
        opacity: 0.6,
        });
        var mesh=new Mesh(geometry,material);
         mesh.position.set(
            ((start.x+end.x)/2),
           ((start.y+end.y)/2),
           0
        );
        mesh.rotation.z=angle;
        this.scene.add(mesh);
    }
    onMouseMove(e:MouseEvent){
          this.activeCommand.onMouseMove(e);
    }
    zoomFit(offset=1.1){
    new ZoomFitCommand(this).execute(offset);
    }
    render(renderer:WebGLRenderer){
        this.controls.update();
        renderer.render(this.scene,this.camera);
    }
    addControls(){
        var controls=new OrbitControls(this.camera,this.container);
        controls.enablePan=true;
        controls.enableRotate=false;
        controls.update();
        return controls;
    }
    addCube(){
        var geometry=new BoxGeometry(1,1,1);
        var material=new MeshBasicMaterial({color:'red'});
        var mesh=new Mesh(geometry,material);
        this.scene.add(mesh);
    }
    addGridHelper(){
        var grid=new GridHelper(100,100);
        this.scene.add(grid);
        grid.rotation.x=MathUtils.degToRad(90);
        var axesHelper=new AxesHelper(2);
        this.scene.add(axesHelper);
    }
    createScene(){
        var scene=new Scene();
        scene.background=new Color('white');
        return scene;
    }
    createCamera(){
       
        const camera=new OrthographicCamera(
            this.container.clientWidth/-2,
            this.container.clientWidth/2,
            this.container.clientHeight/2,
            this.container.clientHeight/-2,
            .1,
            100
        );
        camera.position.set(0,0,10);
        return camera;
    }
    createRenderer(){
        var renderer=new WebGLRenderer({antialias:true});
        return renderer;
    }
    
}

export {Document2D};