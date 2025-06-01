import {AxesHelper, Box3, BoxGeometry, Color, DoubleSide, GridHelper, MathUtils, Mesh, MeshBasicMaterial, OrthographicCamera, PerspectiveCamera, PlaneGeometry, Scene, Vector2, Vector3, WebGLRenderer, Line, LineBasicMaterial, BufferGeometry, Raycaster, Plane} from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
import { Resizer } from '../resizer';
import type { IDocument } from './IDocument';
import type { ICommand } from '../commands/ICommand';
import { CreateWallCommand } from '../commands/CreateWallCommand';
import { ZoomFitCommand } from '../commands/ZoomFitCommand';
import { Wall } from '../Viewer';

class Document2D implements IDocument {
    container: HTMLElement;
    scene: Scene;
    camera: OrthographicCamera;
    controls: OrbitControls;
    activeCommand: ICommand;
    walls: Wall[] = [];
    wallMeshes: Map<string, Mesh> = new Map();
    highlightedWall: string | null = null;
    selectedWall: string | null = null;
    raycaster = new Raycaster();
    mouse = new Vector2();
    intersectionPlane = new Plane(new Vector3(0, 0, 1), 0);
     
    constructor(canvas: HTMLElement) {
        this.container = canvas;
        this.scene = this.createScene();
        this.camera = this.createCamera();
        new Resizer(canvas, this.camera);
        this.controls = this.addControls();
        this.addGridHelper();
        this.setupEventListeners();
        this.zoomFit();
        this.activeCommand = new CreateWallCommand(this);
    }

    private setupEventListeners() {
        document.addEventListener('mousedown', this.onMouseDown.bind(this)); 
        document.addEventListener('mouseup', this.onMouseUp.bind(this));
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
    }

    onMouseDown(e: MouseEvent) {
        this.updateMousePosition(e);
        const intersects = this.getWallIntersection();
        if (intersects.length > 0) {
            const wallId = intersects[0].object.userData.wallId;
            this.selectWall(wallId);
        } else {
            this.clearWallStates();
            this.activeCommand.onMouseDown(e);
        }
    }

    onMouseUp(e: MouseEvent) {
        this.activeCommand.onMouseUp(e);
    }

    onMouseMove(e: MouseEvent) {
        this.updateMousePosition(e);
        const intersects = this.getWallIntersection();
        if (intersects.length > 0) {
            const wallId = intersects[0].object.userData.wallId;
            if (this.highlightedWall !== wallId) {
                this.highlightWall(wallId);
            }
        } else if (this.highlightedWall) {
            this.clearHighlight();
        }
        this.activeCommand.onMouseMove(e);
    }

    private updateMousePosition(e: MouseEvent) {
        const rect = this.container.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }

    private getWallIntersection() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        return this.raycaster.intersectObjects(this.scene.children.filter(obj => obj.userData.wallId));
    }

    private highlightWall(id: string) {
        this.clearHighlight();
        this.highlightedWall = id;
        const mesh = this.wallMeshes.get(id);
        if (mesh) {
            (mesh.material as MeshBasicMaterial).color.setHex(0x00ff00);
        }
    }

    private selectWall(id: string) {
        this.clearSelection();
        this.selectedWall = id;
        const mesh = this.wallMeshes.get(id);
        if (mesh) {
            (mesh.material as MeshBasicMaterial).color.setHex(0xff0000);
        }
    }

    private clearHighlight() {
        if (this.highlightedWall && this.highlightedWall !== this.selectedWall) {
            const mesh = this.wallMeshes.get(this.highlightedWall);
            if (mesh) {
                (mesh.material as MeshBasicMaterial).color.setHex(0x6699ff);
            }
        }
        this.highlightedWall = null;
    }

    private clearSelection() {
        if (this.selectedWall) {
            const mesh = this.wallMeshes.get(this.selectedWall);
            if (mesh) {
                (mesh.material as MeshBasicMaterial).color.setHex(0x6699ff);
            }
        }
        this.selectedWall = null;
    }

    private clearWallStates() {
        this.clearHighlight();
        this.clearSelection();
    }

    removeObject(obj: any) {
        this.scene.remove(obj);
        if (obj.userData.wallId) {
            this.wallMeshes.delete(obj.userData.wallId);
        }
    }

    addObject(obj: any) {
        this.scene.add(obj);
    }

    getBoundingClientRect() {
        return this.container.getBoundingClientRect();
    }

    unproject(vec: Vector3) {
        return vec.unproject(this.camera);
    }

    drawWall(start: Vector3, end: Vector3) {
        const wallVec = new Vector2(end.x - start.x, end.y - start.y);
        const length = wallVec.length();
        const angle = Math.atan2(wallVec.y, wallVec.x);
        
        const geometry = new PlaneGeometry(length, 1);
        const material = new MeshBasicMaterial({
            color: 0x6699ff,
            side: DoubleSide,
            transparent: true,
            opacity: 0.6,
        });

        const mesh = new Mesh(geometry, material);
        mesh.position.set(
            (start.x + end.x) / 2,
            (start.y + end.y) / 2,
            0
        );
        mesh.rotation.z = angle;

        const wallId = `wall_${Date.now()}`;
        mesh.userData.wallId = wallId;
        this.wallMeshes.set(wallId, mesh);
        this.scene.add(mesh);

        // Add wall to walls array
        const wall: Wall = {
            type: 'wall',
            start: start.clone(),
            end: end.clone(),
            angle: angle,
            length: length,
            id: wallId
        };
        this.walls.push(wall);

        // Add dimension label
        this.addDimensionLabel(wall);

        return wall;
    }

    private addDimensionLabel(wall: Wall) {
        const midPoint = new Vector3().addVectors(wall.start, wall.end).multiplyScalar(0.5);
        const geometry = new BufferGeometry().setFromPoints([
            new Vector3(wall.start.x, wall.start.y, 0),
            new Vector3(wall.end.x, wall.end.y, 0)
        ]);
        const material = new LineBasicMaterial({ color: 0x000000 });
        const line = new Line(geometry, material);
        this.scene.add(line);

        // Add text label for length
        const lengthText = `${wall.length.toFixed(2)}m`;
        // Note: In a real implementation, you'd want to use a proper text renderer
        // like HTML overlay or Three.js TextGeometry
    }

    zoomFit(offset = 1.1) {
        new ZoomFitCommand(this).execute(offset);
    }

    render(renderer: WebGLRenderer) {
        this.controls.update();
        renderer.render(this.scene, this.camera);
    }

    addControls() {
        const controls = new OrbitControls(this.camera, this.container);
        controls.enablePan = true;
        controls.enableRotate = false;
        controls.update();
        return controls;
    }

    addGridHelper() {
        // Create grid in XY plane (plan view)
        const grid = new GridHelper(100, 100);
        grid.rotation.x = 0; // No rotation needed for XY plane
        this.scene.add(grid);

        // Add axes helper with proper orientation
        const axesHelper = new AxesHelper(2);
        // Red = X axis (horizontal)
        // Green = Y axis (vertical)
        // Blue = Z axis (coming out of screen)
        this.scene.add(axesHelper);
    }

    createScene() {
        const scene = new Scene();
        scene.background = new Color('white');
        return scene;
    }

    createCamera() {
        const camera = new OrthographicCamera(
            this.container.clientWidth / -2,
            this.container.clientWidth / 2,
            this.container.clientHeight / 2,
            this.container.clientHeight / -2,
            .1,
            100
        );
        camera.position.set(0, 0, 10);
        return camera;
    }

    getWalls(): Wall[] {
        return this.walls;
    }
}

export { Document2D };