import type { WebGLRenderer } from "three";

export interface IDocument{
    render(renderer:WebGLRenderer):void;
    onMouseDown(e:MouseEvent) :void;
    onMouseUp(e:MouseEvent):void;
    onMouseMove(e:MouseEvent):void;
    zoomFit():void;
}