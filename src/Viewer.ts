import {
    LineBasicMaterial, WebGLRenderer, Vector3, Color, Scene, PerspectiveCamera,
    OrthographicCamera, GridHelper, AxesHelper, AmbientLight,
    DirectionalLight, Line, BufferGeometry, Raycaster, Vector2,
    BoxGeometry, MeshStandardMaterial, Mesh, TextureLoader, DoubleSide,
    Box2, Box3, Object3D, Plane
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface Wall {
    type: 'wall';
    start: Vector3;
    end: Vector3;
    angle: number;
    length: number;
    id: string;
    selected?: boolean;
    highlighted?: boolean;
}

export class Viewer{
    private container: HTMLElement;
    private renderer: WebGLRenderer;
    private scene2D: Scene;
    private scene3D: Scene;
    private camera2D: OrthographicCamera;
    private camera3D: PerspectiveCamera;
    private controls2D: OrbitControls;
    private controls3D: OrbitControls;
    private is2D: boolean = true;
    private walls: Wall[] = [];
    private wallCounter: number = 0;
    private isDrawing: boolean = false;
    private currentStartPoint: Vector3 | null = null;
    private tempLine: Line | null = null;
    private wallMeshes: Map<string, Object3D> = new Map();
    private raycaster: Raycaster = new Raycaster();
    private mouse: Vector2 = new Vector2();
    private textureLoader: TextureLoader = new TextureLoader();
    private intersectionPlane: Plane;

    constructor(container: HTMLElement){
        this.container=container;
        this.intersectionPlane = new Plane(new Vector3(0, 0, 1), 0);
   
        this.renderer=this.createRenderer();
            this.renderer.setSize(container.clientWidth,container.clientHeight);
            this.renderer.setPixelRatio(window.devicePixelRatio);
        container.append(this.renderer.domElement);
     
        this.scene2D=this.createScene2D();
        this.scene3D=this.createScene3D();
        this.camera2D=this.createCamera2D();
        this.camera3D=this.createCamera3D();
        this.controls2D=this.createControls2D();
        this.controls3D=this.createControls3D();
        this.setup();
        this.animate();

        // Add window resize handler
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    private setup() {
        // Add event listeners
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('mousedown', this.onMouseDown.bind(this));
        window.addEventListener('mouseup', this.onMouseUp.bind(this));
        window.addEventListener('contextmenu', (e) => e.preventDefault()); // Prevent right-click menu

        // Add grid and lights to both scenes
        this.addGridAndLights(this.scene2D);
        this.addGridAndLights(this.scene3D);
    }

    private createRenderer(): WebGLRenderer {
        var renderer=new WebGLRenderer({antialias:true});
        return renderer;
    }

    private createScene2D(): Scene {
        const scene = new Scene();
        scene.background = new Color('white');
        return scene;
    }

    private createScene3D(): Scene {
        const scene = new Scene();
        scene.background = new Color('black');
        return scene;
    }

    private createCamera2D(): OrthographicCamera {
        const aspect = this.container.clientWidth / this.container.clientHeight;
        const frustumSize = 100;
        const camera = new OrthographicCamera(
            -frustumSize * aspect / 2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            -frustumSize / 2,
            1,
            100
        );
        camera.position.set(0, 0, 5);
        return camera;
    }

    private createCamera3D(): PerspectiveCamera {
        const aspect = this.container.clientWidth / this.container.clientHeight;
        const camera = new PerspectiveCamera(35, aspect, 0.1, 500);
        camera.position.set(50, 50, 50);
        camera.lookAt(0, 0, 0);
        return camera;
    }

    private createControls2D(): OrbitControls {
        const controls = new OrbitControls(this.camera2D, this.container);
        controls.enableRotate = false;
        controls.enablePan = true;
        controls.panSpeed = 2;
        controls.zoomSpeed = 1;
        controls.update();
        return controls;
    }

    private createControls3D(): OrbitControls {
        const controls = new OrbitControls(this.camera3D, this.container);
        controls.panSpeed = 2;
        controls.zoomSpeed = 1;
        controls.update();
        return controls;
    }

    private addGridAndLights(scene: Scene) {
        // Add grid
        const grid = new GridHelper(100, 100);
        scene.add(grid);

        // Add axes helper
        const axesHelper = new AxesHelper(2);
        scene.add(axesHelper);

        // Add lights
        const ambientLight = new AmbientLight('white', 0.5);
        scene.add(ambientLight);

        const directionalLight = new DirectionalLight('white', 1);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);
    }

    public setView(is2D: boolean) {
        this.is2D = is2D;
        if (is2D) {
            this.controls2D.update();
        } else {
            this.controls3D.update();
            this.update3DView();
        }
    }

    private update3DView() {
        // Clear existing 3D meshes
        this.wallMeshes.forEach(mesh => this.scene3D.remove(mesh));
        this.wallMeshes.clear();
        // Recreate all walls in 3D
        this.walls.forEach(wall => this.createWallMesh3D(wall));
    }

    private createWallMesh3D(wall: Wall) {
        const wallHeight = 3; // meters
        const wallThickness = 0.2; // meters
        const wallLength = wall.length;

        // Create wall geometry
        const geometry = new BoxGeometry(wallLength, wallHeight, wallThickness);

        // Load and apply wall texture
        const texture = this.textureLoader.load('/textures/brick.jpg');
        texture.wrapS = texture.wrapT = 1000;
        texture.repeat.set(wallLength / 2, wallHeight / 2);

        const material = new MeshStandardMaterial({
            map: texture,
            side: DoubleSide,
            roughness: 0.7,
            metalness: 0.1
        });

        const mesh = new Mesh(geometry, material);

        // Position and rotate the wall
        const midPoint = new Vector3().addVectors(wall.start, wall.end).multiplyScalar(0.5);
        mesh.position.set(midPoint.x, wallHeight / 2, midPoint.y);
        mesh.rotation.y = -wall.angle; // Negative for correct orientation

        mesh.userData.wallId = wall.id;
        this.scene3D.add(mesh);
        this.wallMeshes.set(wall.id, mesh);
    }

    public addWall(start: Vector3, end: Vector3): Wall {
        const length = start.distanceTo(end);
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const wall: Wall = {
            type: 'wall',
            start: start.clone(),
            end: end.clone(),
            angle,
            length,
            id: `wall_${this.wallCounter++}`,
            selected: false,
            highlighted: false
        };
        this.walls.push(wall);
        this.createWallMesh2D(wall);
        if (!this.is2D) {
            this.createWallMesh3D(wall);
        }
        return wall;
    }

    private createWallMesh2D(wall: Wall) {
        // Create a line for the wall
        const material = new LineBasicMaterial({ 
            color: wall.selected ? 0xff0000 : (wall.highlighted ? 0x00ff00 : 0x000000)
        });
        const points = [wall.start, wall.end];
        const geometry = new BufferGeometry().setFromPoints(points);
        const line = new Line(geometry, material);
        line.userData.wallId = wall.id;

        // Create a rectangle for wall thickness
        const wallThickness = 0.2;
        const wallLength = wall.length;
        const wallGeometry = new BoxGeometry(wallLength, wallThickness, 0.01);
        const wallMaterial = new MeshStandardMaterial({ 
            color: wall.selected ? 0xff0000 : (wall.highlighted ? 0x00ff00 : 0xcccccc),
            side: DoubleSide
        });
        const wallMesh = new Mesh(wallGeometry, wallMaterial);

        // Position and rotate the wall mesh
        const midPoint = new Vector3().addVectors(wall.start, wall.end).multiplyScalar(0.5);
        wallMesh.position.set(midPoint.x, midPoint.y, 0);
        wallMesh.rotation.z = wall.angle;
        wallMesh.userData.wallId = wall.id;

        this.scene2D.add(line);
        this.scene2D.add(wallMesh);
        this.wallMeshes.set(wall.id, wallMesh);

        // Add dimension label
        this.addDimensionLabel(wall);
    }

    private onMouseMove(e: MouseEvent) {
        this.updateMousePosition(e);

        if (this.is2D) {
            if (this.isDrawing && this.currentStartPoint) {
                const intersects = this.getIntersectionPoint();
                if (intersects) {
                    this.updateTempLine(this.currentStartPoint, intersects);
                }
            } else {
                // Check for wall highlighting
                const intersects = this.getWallIntersection();
                if (intersects.length > 0) {
                    const wallId = intersects[0].object.userData.wallId;
                    this.highlightWall(wallId);
                } else {
                    this.clearWallStates();
                }
            }
        }
    }

    private onMouseDown(e: MouseEvent) {
        if (this.is2D) {
            if (e.button === 0) { // Left click
                const intersects = this.getIntersectionPoint();
                if (intersects) {
                    if (!this.isDrawing) {
                        // Start drawing
                        this.isDrawing = true;
                        this.currentStartPoint = intersects;
                        this.tempLine = this.createTempLine(intersects, intersects);
                        this.scene2D.add(this.tempLine);
                    } else {
                        // Finish drawing
                        const wall = this.addWall(this.currentStartPoint!, intersects);
                        this.isDrawing = false;
                        this.scene2D.remove(this.tempLine!);
                        this.tempLine = null;
                        this.currentStartPoint = null;
                    }
                }
            } else if (e.button === 2) { // Right click
                // Handle wall selection
                const intersects = this.getWallIntersection();
                if (intersects.length > 0) {
                    const wallId = intersects[0].object.userData.wallId;
                    this.selectWall(wallId);
                } else {
                    this.clearWallStates();
                }
            }
        }
    }

    private onMouseUp(e: MouseEvent) {
        // Handle any mouse up events if needed
    }

    private createTempLine(start: Vector3, end: Vector3): Line {
        const material = new LineBasicMaterial({ color: 0x0000ff });
        const points = [start, end];
        const geometry = new BufferGeometry().setFromPoints(points);
        return new Line(geometry, material);
    }

    private updateTempLine(start: Vector3, end: Vector3) {
        if (this.tempLine) {
            const positions = this.tempLine.geometry.attributes.position;
            positions.setXYZ(0, start.x, start.y, start.z);
            positions.setXYZ(1, end.x, end.y, end.z);
            positions.needsUpdate = true;
        }
    }

    private updateMousePosition(e: MouseEvent) {
        const rect = this.container.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / this.container.clientWidth) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / this.container.clientHeight) * 2 + 1;
    }

    private getIntersectionPoint(): Vector3 | null {
        this.raycaster.setFromCamera(this.mouse, this.is2D ? this.camera2D : this.camera3D);
        const intersects = this.raycaster.ray.intersectPlane(this.intersectionPlane, new Vector3());
        return intersects || null;
    }

    private getWallIntersection(): any[] {
        this.raycaster.setFromCamera(this.mouse, this.is2D ? this.camera2D : this.camera3D);
        const wallObjects = Array.from(this.wallMeshes.values());
        return this.raycaster.intersectObjects(wallObjects);
    }

    private animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.render();
    }

    private render() {
        if (this.is2D) {
            this.controls2D.update();
            this.renderer.render(this.scene2D, this.camera2D);
        } else {
            this.controls3D.update();
            this.renderer.render(this.scene3D, this.camera3D);
        }
    }

    private onWindowResize() {
        // Update renderer size
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Update 2D camera
        const aspect = this.container.clientWidth / this.container.clientHeight;
        const frustumSize = 100;
        this.camera2D.left = -frustumSize * aspect / 2;
        this.camera2D.right = frustumSize * aspect / 2;
        this.camera2D.top = frustumSize / 2;
        this.camera2D.bottom = -frustumSize / 2;
        this.camera2D.updateProjectionMatrix();

        // Update 3D camera
        this.camera3D.aspect = aspect;
        this.camera3D.updateProjectionMatrix();
    }

    public zoomExtend() {
        if (this.is2D) {
            // Calculate bounding box of all walls in 2D
            const positions: Vector3[] = [];
            this.walls.forEach(wall => {
                positions.push(wall.start, wall.end);
            });

            if (positions.length > 0) {
                const box = new Box2().setFromPoints(positions.map(p => new Vector2(p.x, p.y)));
                const center = box.getCenter(new Vector2());
                const size = box.getSize(new Vector2());
                const maxDim = Math.max(size.x, size.y);
                
                this.camera2D.position.set(center.x, center.y, 5);
                this.camera2D.zoom = 1 / (maxDim * 1.2);
                this.camera2D.updateProjectionMatrix();
                this.controls2D.update();
            }
        } else {
            // Calculate bounding box of all walls in 3D
            const positions: Vector3[] = [];
            this.wallMeshes.forEach(mesh => {
                const geometry = mesh.geometry;
                const position = geometry.attributes.position;
                for (let i = 0; i < position.count; i++) {
                    const vertex = new Vector3();
                    vertex.fromBufferAttribute(position, i);
                    vertex.applyMatrix4(mesh.matrixWorld);
                    positions.push(vertex);
                }
            });

            if (positions.length > 0) {
                const box = new Box3().setFromPoints(positions);
                const center = box.getCenter(new Vector3());
                const size = box.getSize(new Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const fov = this.camera3D.fov * (Math.PI / 180);
                let cameraZ = Math.abs(maxDim / Math.sin(fov / 2)) * 1.2;
                
                this.camera3D.position.set(center.x + cameraZ, center.y + cameraZ, center.z + cameraZ);
                this.camera3D.lookAt(center);
                this.controls3D.target.copy(center);
                this.controls3D.update();
            }
        }
    }

    private addDimensionLabel(wall: Wall) {
        const label = document.createElement('div');
        label.className = 'dimension-label';
        label.style.position = 'absolute';
        label.style.color = 'black';
        label.style.fontSize = '12px';
        label.style.pointerEvents = 'none';
        label.textContent = `${wall.length.toFixed(2)}m`;
        
        const midPoint = new Vector3().addVectors(wall.start, wall.end).multiplyScalar(0.5);
        const screenPosition = midPoint.project(this.camera2D);
        
        const x = (screenPosition.x * 0.5 + 0.5) * this.container.clientWidth;
        const y = (-screenPosition.y * 0.5 + 0.5) * this.container.clientHeight;
        
        label.style.left = `${x}px`;
        label.style.top = `${y}px`;
        
        this.container.appendChild(label);
    }

    private highlightWall(id: string) {
        this.walls.forEach(wall => {
            wall.highlighted = wall.id === id;
            this.updateWallAppearance(wall);
        });
    }

    private selectWall(id: string) {
        this.walls.forEach(wall => {
            wall.selected = wall.id === id;
            this.updateWallAppearance(wall);
        });
    }

    private clearWallStates() {
        this.walls.forEach(wall => {
            wall.selected = false;
            wall.highlighted = false;
            this.updateWallAppearance(wall);
        });
    }

    private updateWallAppearance(wall: Wall) {
        const mesh = this.wallMeshes.get(wall.id);
        if (mesh) {
            if (mesh instanceof Mesh) {
                const material = mesh.material as MeshStandardMaterial;
                material.color.setHex(wall.selected ? 0xff0000 : (wall.highlighted ? 0x00ff00 : 0xcccccc));
            }
        }
    }
}