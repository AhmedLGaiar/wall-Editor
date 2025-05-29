export interface ICommand{
     onMouseDown(e:MouseEvent) :void;
    onMouseUp(e:MouseEvent):void;
    onMouseMove(e:MouseEvent):void;
    execute():void;
}