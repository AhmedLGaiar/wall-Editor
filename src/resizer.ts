 import { Camera, OrthographicCamera, PerspectiveCamera, WebGLRenderer } from "three";
 class Resizer{
constructor(container:HTMLElement,camera:Camera){
   // camera.aspect=container.clientWidth/container.clientHeight
   if(camera instanceof PerspectiveCamera){
       camera.updateProjectionMatrix();
   }
   if(camera instanceof OrthographicCamera){
       camera.updateProjectionMatrix();
   }
    // renderer.setSize(container.clientWidth,container.clientHeight);
    // renderer.setPixelRatio(window.devicePixelRatio);
}
 }
 
 export {Resizer} 