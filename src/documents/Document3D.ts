import {AxesHelper, Box3, BoxGeometry, Color, DirectionalLight, GridHelper, MathUtils, Mesh, MeshBasicMaterial, MeshStandardMaterial, OrthographicCamera, PerspectiveCamera, Plane, Raycaster, Scene, SphereGeometry, Vector2, Vector3, WebGLRenderer} from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
import { Resizer } from '../resizer';
import type { IDocument } from './IDocument';
export class Document3D implements IDocument{
    canvas;
    scene;
    camera;
    controls;
    rayCaster:Raycaster;
    plane:Plane;
    private mouse:Vector2=new Vector2();
    highlighted:any;
    selected:any;
    spheres:any[]=[];

    constructor(canvas:HTMLElement){
        this.canvas=canvas;
        this.scene=this.createScene();
        this.camera=this.createCamera();
        new Resizer(canvas,this.camera);
        this.controls=this.addControls();
        this.addCube();
        this.addGridHelper();
        this.rayCaster=new Raycaster();
      
        this.plane=new Plane(new Vector3(0,-1,0),0);
        this.addLight();
    }
    onMouseUp(e: MouseEvent): void {
        
    }
    onMouseDown(e:MouseEvent){
        //if the user holds CTRL button;
        if(e.button!=0) return;
        this.rayCaster.setFromCamera(this.mouse,this.camera);
        const intersects=this.rayCaster.intersectObjects(this.spheres);
          this.spheres.forEach(sphere=>{
                sphere.material.color.set('blue');
            })
        if (intersects.length) {
          
          var selected = intersects[0].object as any;
          selected.material.color.set("red");
        } else {
          const origin = this.rayCaster.ray.origin.clone();
          const endPoint = this.rayCaster.ray.direction
            .clone()
            .multiplyScalar(100);
          var position = origin.add(endPoint);

          //itersect with plane
          var intersectionPoint = new Vector3();
          this.rayCaster.ray.intersectPlane(this.plane, intersectionPoint);
          this.addSphere(intersectionPoint);
        }
        
    }
    addSphere(position:Vector3){
     const geometry=new SphereGeometry(1,32,32);
     const material=new MeshStandardMaterial({color:'blue'});
     const sphere=new Mesh(geometry,material);
     sphere.position.copy(position);
     this.scene.add(sphere);
     this.spheres.push(sphere);
    }
    zoomFit(){
        const box = new Box3().setFromObject(this.scene);
        const size = box.getSize(new Vector3());
        const center = box.getCenter(new Vector3());

        this.camera.position.set(
          center.x,
          center.y + size.y,
          center.z + size.x
        );
        this.camera.lookAt(center);

        this.controls.target.copy(center);
        this.controls.update();
    }
    onMouseMove(e:MouseEvent){
        this.mouse.x=(e.clientX/this.canvas.clientWidth)*2-1;
        this.mouse.y=-(e.clientY/this.canvas.clientHeight)*2+1;
        this.rayCaster.setFromCamera(this.mouse,this.camera);
        var intersects=this.rayCaster.intersectObjects(this.spheres);
        var filtered=intersects.filter(obj=>obj.object.type!="GridHelper");
        if(this.highlighted){
            this.highlighted.material.emissive.set(0x000000);
            this.highlighted=null;
        }
        if(filtered.length){
            debugger;
            var object=filtered[0].object as any;
            object.material.emissive.set(0x333300);
            this.highlighted=object; //highlighted sphere
        }
    }
    render(renderer:WebGLRenderer){
        this.controls.update();
        renderer.render(this.scene,this.camera);
    }
    addLight(){
        var directionalLight=new DirectionalLight('white',5);
        this.scene.add(directionalLight);
        directionalLight.position.set(0,20,10);
    }
    addControls(){
        var controls=new OrbitControls(this.camera,this.canvas);
        controls.enableDamping=true;
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
        //grid.rotation.x=MathUtils.degToRad(90);
        var axesHelper=new AxesHelper(2);
        this.scene.add(axesHelper);
    }
    createScene(){
        var scene=new Scene();
        scene.background=new Color('black');
        return scene;
    }
    createCamera(){
       
        const camera=new PerspectiveCamera(45,
            this.canvas.clientWidth/this.canvas.clientHeight,
            .1,
            500
        );
        camera.position.set(50,50,50);
        return camera;
    }
    createRenderer(){
        var renderer=new WebGLRenderer({antialias:true});
        return renderer;
    }
    
}
