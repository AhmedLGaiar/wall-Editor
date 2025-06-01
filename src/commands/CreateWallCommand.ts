import { Vector3, Vector2, PlaneGeometry, MeshBasicMaterial, DoubleSide, Mesh } from "three";
import type { Document2D } from "../documents/Document2D";
import type { ICommand } from "./ICommand";

export class CreateWallCommand implements ICommand {
    document: Document2D;
    startPoint: Vector3 | null = null;
    endPoint: Vector3 | null = null;
    mouse: Vector2 = new Vector2();
    drawing: boolean = false;
    previewWall: Mesh | null = null;
    isCreatingSeries: boolean = false;
    lastEndPoint: Vector3 | null = null;

    constructor(document: Document2D) {
        this.document = document;
    }

    onMouseUp(e: MouseEvent) {
        if (e.button !== 0) return; // Only handle left click

        if (this.drawing && this.startPoint) {
            const endPoint = this.document.unproject(new Vector3(this.mouse.x, this.mouse.y, 0));
            this.endPoint = endPoint;

            if (this.previewWall) {
                this.document.removeObject(this.previewWall);
                this.previewWall.geometry.dispose();
                this.previewWall.material.dispose();
                this.previewWall = null;
            }

            // Create the wall
            this.execute();

            // If shift is pressed, continue the series from the end point
            if (e.shiftKey) {
                this.isCreatingSeries = true;
                this.lastEndPoint = this.endPoint;
                this.startPoint = this.endPoint;
            } else {
                this.isCreatingSeries = false;
                this.drawing = false;
                this.startPoint = null;
                this.lastEndPoint = null;
            }
        }
    }

    onMouseDown(e: MouseEvent) {
        if (e.button !== 0) return; // Only handle left click

        if (!this.isCreatingSeries) {
            this.drawing = true;
            this.startPoint = this.document.unproject(new Vector3(this.mouse.x, this.mouse.y, 0));
        }
    }

    onMouseMove(e: MouseEvent) {
        const rect = this.document.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        if (this.drawing) {
            const currentPoint = this.document.unproject(new Vector3(this.mouse.x, this.mouse.y, 0));
            const startPoint = this.isCreatingSeries ? this.lastEndPoint : this.startPoint;

            if (startPoint) {
                const wallVec = new Vector2(currentPoint.x - startPoint.x, currentPoint.y - startPoint.y);
                const length = wallVec.length();
                const angle = Math.atan2(wallVec.y, wallVec.x);

                const geometry = new PlaneGeometry(length, 1);
                const material = new MeshBasicMaterial({
                    color: 'gray',
                    transparent: true,
                    opacity: 0.5,
                    side: DoubleSide
                });

                if (this.previewWall) {
                    this.document.removeObject(this.previewWall);
                    this.previewWall.geometry.dispose();
                    this.previewWall.material.dispose();
                }

                this.previewWall = new Mesh(geometry, material);
                this.previewWall.position.set(
                    (startPoint.x + currentPoint.x) / 2,
                    (startPoint.y + currentPoint.y) / 2,
                    0
                );
                this.previewWall.rotation.z = angle;
                this.document.addObject(this.previewWall);
            }
        }
    }

    execute() {
        if (this.startPoint && this.endPoint) {
            this.document.drawWall(this.startPoint, this.endPoint);
        }
    }
}