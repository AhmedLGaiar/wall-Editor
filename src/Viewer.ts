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

export class Viewer {
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
    private modeIndicator: HTMLDivElement;

    private wallMeshes: Map<string, Object3D> = new Map();
    private dimensionLines: Map<string, { line: Line, label: HTMLDivElement }> = new Map();
    private raycaster: Raycaster = new Raycaster();
    private mouse: Vector2 = new Vector2();
    private textureLoader: TextureLoader = new TextureLoader();
    private intersectionPlane: Plane;

    // New properties for drawing
    private isDrawing: boolean = false;
    private startPoint: Vector3 | null = null;
    private previewLine: Line | null = null;

    // New property for wall list element
    private wallListElement: HTMLUListElement | null = null;
    private selectedWall: string | null = null;

    // New property to track if we're in drawing mode
    private isDrawingMode: boolean = true;

    constructor(container: HTMLElement) {
        this.container = container;
        this.intersectionPlane = new Plane(new Vector3(0, 0, 1), 0);

        // Create mode indicator
        this.modeIndicator = this.createModeIndicator();
        this.container.appendChild(this.modeIndicator);
        this.updateModeIndicator();

        this.renderer = this.createRenderer();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        container.append(this.renderer.domElement);

        this.scene2D = this.createScene2D();
        this.scene3D = this.createScene3D();
        this.camera2D = this.createCamera2D();
        this.camera3D = this.createCamera3D();
        this.controls2D = this.createControls2D();
        this.controls3D = this.createControls3D();
        this.setup();
        this.animate();

        // Add window resize handler
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    private setup() {
        // Add event listeners
        window.addEventListener('mousedown', this.onMouseDown.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('mouseup', this.onMouseUp.bind(this));
        window.addEventListener('contextmenu', (e) => e.preventDefault()); // Prevent right-click menu

        // Add grid and lights to both scenes
        this.addGridAndLights(this.scene2D);
        this.addGridAndLights(this.scene3D);

        // Get wall list element and set up event listeners
        this.wallListElement = document.getElementById('wall-list') as HTMLUListElement;
        if (this.wallListElement) {
            this.wallListElement.addEventListener('mouseover', this.onWallListItemMouseOver.bind(this));
            this.wallListElement.addEventListener('mouseout', this.onWallListItemMouseOut.bind(this));
            this.wallListElement.addEventListener('click', this.onWallListItemClick.bind(this));
        }

        // Fit the view to the grid or walls on startup
        this.zoomExtend();
    }

    private createRenderer(): WebGLRenderer {
        const renderer = new WebGLRenderer({ antialias: true });
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
        const frustumSize = 500; // Increased to handle larger distances
        const camera = new OrthographicCamera(
            -frustumSize * aspect / 2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            -frustumSize / 2,
            1,
            1000
        );
        // Position the camera for a top-down view (XY plane)
        camera.position.set(0, 0, 50); // Position on Z axis looking down
        camera.lookAt(0, 0, 0);
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
        // Rotate grid to lie on the XY plane for 2D view, keep default for 3D
        if (scene === this.scene2D) {
             grid.rotation.x = Math.PI / 2; // Rotate 90 degrees around X to get XY plane
        }
        scene.add(grid);

        // Add axes helper
        const axesHelper = new AxesHelper(2);
        // Re-orient axes for 2D (XY plane) view: Red=X, Green=Y, Blue=Z (up)
        if (scene === this.scene2D) {
             axesHelper.rotation.x = Math.PI / 2; // Align axes with rotated grid
        }

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
            // Show dimension lines in 2D
            this.dimensionLines.forEach((dimension) => {
                dimension.line.visible = true;
                dimension.label.style.display = 'block';
            });
        } else {
            this.controls3D.update();
            this.update3DView();
            // Hide dimension lines in 3D
            this.dimensionLines.forEach((dimension) => {
                dimension.line.visible = false;
                dimension.label.style.display = 'none';
            });
        }
    }

    private update3DView() {
        this.wallMeshes.forEach(mesh => this.scene3D.remove(mesh));
        this.wallMeshes.clear();
        this.walls.forEach(wall => this.createWallMesh3D(wall));
    }

    private createWallMesh3D(wall: Wall) {
        const wallHeight = 3;
        const wallThickness = 0.2;
        const wallLength = wall.length;

        const geometry = new BoxGeometry(wallLength, wallHeight, wallThickness);
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
        const midPoint = new Vector3().addVectors(wall.start, wall.end).multiplyScalar(0.5);
        mesh.position.set(midPoint.x, wallHeight / 2, midPoint.y);
        mesh.rotation.y = -wall.angle;

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
        this.updateWallList(); // Update list when wall is added
        return wall;
    }

    private createWallMesh2D(wall: Wall) {
        // Create the wall line
        const material = new LineBasicMaterial({ 
            color: wall.selected ? 0xff0000 : (wall.highlighted ? 0x00ff00 : 0x000000),
            linewidth: 2 // Note: linewidth only works in WebGL 2
        });
        const points = [wall.start, wall.end];
        const geometry = new BufferGeometry().setFromPoints(points);
        const line = new Line(geometry, material);
        line.userData.wallId = wall.id;

        // Create a thicker wall mesh for better interaction
        const wallThickness = 0.5; // Increased thickness for better hover detection
        const wallLength = wall.length;
        const wallGeometry = new BoxGeometry(wallLength, wallThickness, 0.01);
        const wallMaterial = new MeshStandardMaterial({ 
            color: wall.selected ? 0xff0000 : (wall.highlighted ? 0x00ff00 : 0xcccccc),
            side: DoubleSide,
            transparent: true,
            opacity: 0.6 // Semi-transparent to see the line underneath
        });
        const wallMesh = new Mesh(wallGeometry, wallMaterial);

        // Position and rotate the wall mesh on the XY plane, slightly above Z=0
        const midPoint = new Vector3().addVectors(wall.start, wall.end).multiplyScalar(0.5);
        wallMesh.position.set(midPoint.x, midPoint.y, 0.01);
        wallMesh.rotation.z = wall.angle;
        wallMesh.userData.wallId = wall.id;

        this.scene2D.add(line);
        this.scene2D.add(wallMesh);
        this.wallMeshes.set(wall.id, wallMesh);
        
        // Add dimension line
        this.createDimensionLine(wall);
    }

    private createDimensionLine(wall: Wall) {
        // Remove existing dimension line if any
        this.removeDimensionLine(wall.id);

        // Calculate offset for dimension line (perpendicular to wall)
        const wallVector = new Vector2(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
        const perpendicular = new Vector2(-wallVector.y, wallVector.x).normalize();
        const offset = 0.5; // Offset distance from wall

        // Create dimension line points with offset
        const startPoint = new Vector3(
            wall.start.x + perpendicular.x * offset,
            wall.start.y + perpendicular.y * offset,
            0.02
        );
        const endPoint = new Vector3(
            wall.end.x + perpendicular.x * offset,
            wall.end.y + perpendicular.y * offset,
            0.02
        );

        // Create the dimension line
        const geometry = new BufferGeometry().setFromPoints([startPoint, endPoint]);
        const material = new LineBasicMaterial({ color: 0x000000 });
        const line = new Line(geometry, material);
        this.scene2D.add(line);

        // Create HTML label for dimension
        const label = document.createElement('div');
        label.style.position = 'absolute';
        label.style.backgroundColor = 'white';
        label.style.border = '1px solid black';
        label.style.padding = '2px 5px';
        label.style.borderRadius = '3px';
        label.style.fontSize = '12px';
        label.style.pointerEvents = 'none';
        label.style.fontFamily = 'Arial, sans-serif';
        this.container.appendChild(label);

        // Store the dimension line and label
        this.dimensionLines.set(wall.id, { line, label });

        // Update the label position
        this.updateDimensionLabel(wall);
    }

    private updateDimensionLabel(wall: Wall) {
        const dimension = this.dimensionLines.get(wall.id);
        if (!dimension) return;

        // Get the midpoint of the dimension line
        const midPoint = new Vector3()
            .addVectors(wall.start, wall.end)
            .multiplyScalar(0.5);

        // Project the 3D midpoint to screen coordinates
        const screenPosition = midPoint.clone().project(this.camera2D);
        
        // Convert to pixel coordinates
        const x = (screenPosition.x + 1) * this.container.clientWidth / 2;
        const y = (-screenPosition.y + 1) * this.container.clientHeight / 2;

        // Update label position and content
        dimension.label.style.left = `${x}px`;
        dimension.label.style.top = `${y}px`;
        dimension.label.textContent = `${wall.length.toFixed(2)}m`;
    }

    private removeDimensionLine(wallId: string) {
        const dimension = this.dimensionLines.get(wallId);
        if (dimension) {
            this.scene2D.remove(dimension.line);
            dimension.line.geometry.dispose();
            (dimension.line.material as LineBasicMaterial).dispose();
            dimension.label.remove();
            this.dimensionLines.delete(wallId);
        }
    }

    private updateMousePosition(e: MouseEvent) {
        const rect = this.container.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / this.container.clientWidth) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / this.container.clientHeight) * 2 + 1;
    }

    private getIntersectionPoint(): Vector3 | null {
        if (this.is2D) {
            // Unproject mouse coordinates to the Z=0 plane in 2D view
            const vector = new Vector3(this.mouse.x, this.mouse.y, 0.5); // Use 0.5 for depth in NDC
            vector.unproject(this.camera2D);
            return new Vector3(vector.x, vector.y, 0); // Return point on Z=0 plane
        } else {
            // Use raycasting for intersection in 3D view
            this.raycaster.setFromCamera(this.mouse, this.camera3D);
            const intersects = this.raycaster.ray.intersectPlane(this.intersectionPlane, new Vector3());
            return intersects || null;
        }
    }

    private getWallIntersection(): any[] {
        this.raycaster.setFromCamera(this.mouse, this.is2D ? this.camera2D : this.camera3D);
        const wallObjects = Array.from(this.wallMeshes.values());
        return this.raycaster.intersectObjects(wallObjects);
    }

    private animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        // Update dimension labels if in 2D mode
        if (this.is2D) {
            this.walls.forEach(wall => {
                this.updateDimensionLabel(wall);
            });
        }
        
        this.renderer.render(this.is2D ? this.scene2D : this.scene3D, this.is2D ? this.camera2D : this.camera3D);
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
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        const aspect = this.container.clientWidth / this.container.clientHeight;
        const frustumSize = 500;
        this.camera2D.left = -frustumSize * aspect / 2;
        this.camera2D.right = frustumSize * aspect / 2;
        this.camera2D.top = frustumSize / 2;
        this.camera2D.bottom = -frustumSize / 2;
        this.camera2D.updateProjectionMatrix();

        this.camera3D.aspect = aspect;
        this.camera3D.updateProjectionMatrix();
    }

    public zoomExtend() {
        if (this.is2D) {
            let targetBox: Box2;

            if (this.walls.length > 0) {
                // Calculate bounding box of all walls in 2D
                const positions: Vector3[] = [];
                this.walls.forEach(wall => {
                    positions.push(wall.start, wall.end);
                });
                targetBox = new Box2().setFromPoints(positions.map(p => new Vector2(p.x, p.y)));

                // Add padding to the wall bounding box
                const padding = targetBox.getSize(new Vector2()).multiplyScalar(0.1); // 10% padding
                targetBox.expandByVector(padding);

            } else {
                // If no walls, use the 100x100 grid extent as the target box
                const gridExtent = 100;
                targetBox = new Box2(new Vector2(-gridExtent / 2, -gridExtent / 2), new Vector2(gridExtent / 2, gridExtent / 2));

                // Add padding to the grid bounding box
                 const padding = targetBox.getSize(new Vector2()).multiplyScalar(0.1); // 10% padding
                targetBox.expandByVector(padding);
            }

            const center = targetBox.getCenter(new Vector2());
            const size = targetBox.getSize(new Vector2());
            const aspect = this.container.clientWidth / this.container.clientHeight;

            // Calculate the viewable area needed to fit the target box
            let viewWidth = size.x;
            let viewHeight = size.y;

            if (viewWidth / aspect > viewHeight) {
                // If width is the limiting dimension
                viewHeight = viewWidth / aspect;
            } else {
                // If height is the limiting dimension
                viewWidth = viewHeight * aspect;
            }

            // Update the 2D camera's frustum to fit the calculated viewable area
            const halfViewWidth = viewWidth / 2;
            const halfViewHeight = viewHeight / 2;

            this.camera2D.left = center.x - halfViewWidth;
            this.camera2D.right = center.x + halfViewWidth;
            this.camera2D.top = center.y + halfViewHeight;
            this.camera2D.bottom = center.y - halfViewHeight;
            this.camera2D.position.set(center.x, center.y, this.camera2D.position.z); // Maintain current Z position
            this.camera2D.zoom = 1; // Reset zoom to 1 as we are setting frustum directly
            this.camera2D.updateProjectionMatrix();

            // Update controls target and limits
            this.controls2D.target.set(center.x, center.y, 0); // Ensure controls are centered on the content plane
             // Optional: Set controls limits based on the target box if you want to restrict panning
            // this.controls2D.minPan = new Vector3(targetBox.min.x, targetBox.min.y, 0);
            // this.controls2D.maxPan = new Vector3(targetBox.max.x, targetBox.max.y, 0);

            this.controls2D.update();

        } else { // 3D view
            const positions: Vector3[] = [];
            this.wallMeshes.forEach(mesh => {
                if (mesh instanceof Mesh) {
                    const geometry = mesh.geometry;
                    const position = geometry.attributes.position;
                    for (let i = 0; i < position.count; i++) {
                        const vertex = new Vector3();
                        vertex.fromBufferAttribute(position, i);
                        vertex.applyMatrix4(mesh.matrixWorld);
                        positions.push(vertex);
                    }
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

    private highlightWall(id: string) {
        this.walls.forEach(wall => {
            // Only update if state is actually changing to avoid unnecessary renders
            if (wall.id === id && !wall.highlighted) {
                wall.highlighted = true;
                this.updateWallAppearance(wall.id);
            } else if (wall.id !== id && wall.highlighted) {
                 wall.highlighted = false;
                 this.updateWallAppearance(wall.id);
            }
        });
        this.updateWallList(); // Always update the list to reflect highlight state changes
    }

    private selectWall(id: string) {
        // Clear current selection first
        this.clearWallStates();

        this.walls.forEach(wall => {
            if (wall.id === id) {
                wall.selected = true;
                this.selectedWall = id; // Keep track of the selected wall ID
            } else {
                wall.selected = false;
            }
             // Update appearance for all walls to reflect cleared state and new selection
            this.updateWallAppearance(wall.id);
        });
        this.updateWallList(); // Always update the list to reflect select state changes
    }

    private clearWallStates() {
        this.walls.forEach(wall => {
            wall.selected = false;
            wall.highlighted = false;
        });
        this.selectedWall = null; // Clear selected wall ID

         // Update appearances for all walls
        this.walls.forEach(wall => this.updateWallAppearance(wall.id));
        this.updateWallList(); // Update list to reflect cleared state
    }

    private updateWallAppearance(id: string) {
        const wall = this.walls.find(w => w.id === id);
        const mesh = this.wallMeshes.get(id);
        if (wall && mesh && mesh instanceof Mesh) {
            const material = mesh.material as MeshStandardMaterial;
            material.color.setHex(wall.selected ? 0xff0000 : (wall.highlighted ? 0x00ff00 : 0xcccccc));
        }
    }

    // New methods for wall list management
    private updateWallList() {
        if (!this.wallListElement) return;

        // Clear current list
        this.wallListElement.innerHTML = '';

        // Populate list with walls
        this.walls.forEach(wall => {
            const listItem = document.createElement('li');
            listItem.textContent = `Wall ${wall.id.split('_')[1]} (Length: ${wall.length.toFixed(2)}m)`;
            listItem.dataset.wallId = wall.id; // Store wall id in data attribute
             if (wall.selected) {
                listItem.classList.add('selected');
            }
            this.wallListElement!.appendChild(listItem);
        });
    }

     private onWallListItemMouseOver(e: MouseEvent) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'LI' && target.dataset.wallId) {
            this.highlightWall(target.dataset.wallId);
        }
    }

    private onWallListItemMouseOut(e: MouseEvent) {
         const target = e.target as HTMLElement;
        if (target.tagName === 'LI' && target.dataset.wallId) {
             // Only clear highlight if it's not the selected wall
            if (this.selectedWall !== target.dataset.wallId) {
                 this.walls.find(wall => wall.id === target.dataset.wallId)!.highlighted = false;
                 this.updateWallAppearance(target.dataset.wallId);
                 this.updateWallList();
            }
        }
    }

    private onWallListItemClick(e: MouseEvent) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'LI' && target.dataset.wallId) {
            this.selectWall(target.dataset.wallId);
        }
    }

    private onMouseDown(e: MouseEvent) {
        if (!this.is2D) { // Handle interactions in 3D view
            this.updateMousePosition(e);
            const intersects = this.getWallIntersection();

            if (intersects.length > 0) {
                const wallId = intersects[0].object.userData.wallId;
                this.selectWall(wallId);
            } else {
                this.clearWallStates();
            }
            return;
        }

        // Update mouse position
        this.updateMousePosition(e);

        // Handle based on current mode
        if (this.isDrawingMode) {
            // Drawing mode behavior
            if (e.button !== 0) return; // Only handle left click for drawing

            const intersection = this.getIntersectionPoint();
            if (!intersection) return;

            if (!this.isDrawing) {
                // First click: Start drawing
                this.isDrawing = true;
                this.startPoint = intersection;

                // Create initial preview line
                const geometry = new BufferGeometry().setFromPoints([this.startPoint, intersection]);
                const material = new LineBasicMaterial({ color: 0x0000ff });
                this.previewLine = new Line(geometry, material);
                this.scene2D.add(this.previewLine);
            } else {
                // Second click: End drawing and create wall
                const endPoint = intersection;
                this.addWall(this.startPoint!, endPoint);

                // Clean up preview line
                if (this.previewLine) {
                    this.scene2D.remove(this.previewLine);
                    this.previewLine.geometry.dispose();
                    (this.previewLine.material as LineBasicMaterial).dispose();
                    this.previewLine = null;
                }

                // If Shift is held, start a new wall from the end of the last one
                if (e.shiftKey) {
                    this.startPoint = endPoint;
                    const geometry = new BufferGeometry().setFromPoints([this.startPoint, this.startPoint]);
                    const material = new LineBasicMaterial({ color: 0x0000ff });
                    this.previewLine = new Line(geometry, material);
                    this.scene2D.add(this.previewLine);
                } else {
                    this.isDrawing = false;
                    this.startPoint = null;
                }
            }
        } else {
            // Selection mode behavior
            if (e.button === 0) { // Left click
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

    private onMouseMove(e: MouseEvent) {
        this.updateMousePosition(e);

        // Handle wall highlighting in 2D view (always active)
        if (this.is2D) {
            const intersects = this.getWallIntersection();
            if (intersects.length > 0) {
                const wallId = intersects[0].object.userData.wallId;
                this.highlightWall(wallId);
            } else if (!this.isDrawing) {
                this.clearHighlight();
            }
        }

        // Handle preview line update during drawing
        if (this.is2D && this.isDrawingMode && this.isDrawing && this.startPoint && this.previewLine) {
            const intersection = this.getIntersectionPoint();
            if (intersection) {
                const positions = (this.previewLine.geometry.attributes.position as any).array;
                positions[3] = intersection.x;
                positions[4] = intersection.y;
                positions[5] = intersection.z;
                this.previewLine.geometry.attributes.position.needsUpdate = true;
            }
        }
    }

    private onMouseUp(e: MouseEvent) {
        // Mouse up is not used for drawing in the two-click method
        // Keep for potential other interactions like selection drag
    }

    // New method to clear all walls
    public clearAllWalls() {
        // Remove all dimension lines
        this.dimensionLines.forEach((dimension, wallId) => {
            this.removeDimensionLine(wallId);
        });
        
        // Remove all wall meshes from both scenes
        this.wallMeshes.forEach(mesh => {
            this.scene2D.remove(mesh);
            this.scene3D.remove(mesh);
            if (mesh instanceof Mesh) {
                 mesh.geometry.dispose();
                 (mesh.material as any).dispose(); // Dispose material(s)
            }
        });
        this.wallMeshes.clear();

        // Clear the walls array
        this.walls = [];

        // Clear the wall list
        this.updateWallList();

        // Clear any active selection/highlight
        this.clearWallStates();

        // Zoom to fit the grid
        this.zoomExtend();
    }

    // New method to delete selected walls
    public deleteSelectedWalls() {
        const wallsToDelete = this.walls.filter(wall => wall.selected);

        wallsToDelete.forEach(wall => {
            // Remove dimension line
            this.removeDimensionLine(wall.id);
            
            // Remove mesh from scenes and dispose
            const mesh = this.wallMeshes.get(wall.id);
            if (mesh) {
                this.scene2D.remove(mesh);
                this.scene3D.remove(mesh);
                if (mesh instanceof Mesh) {
                    mesh.geometry.dispose();
                    (mesh.material as any).dispose(); // Dispose material(s)
                }
                this.wallMeshes.delete(wall.id);
            }

            // Remove wall from the walls array
            const index = this.walls.indexOf(wall);
            if (index !== -1) {
                this.walls.splice(index, 1);
            }
        });

        // Clear selection state and update list
        this.clearWallStates();
        this.updateWallList();

        // Optional: Zoom to fit remaining walls or grid after deletion
        this.zoomExtend();
    }

    private clearHighlight() {
        this.walls.forEach(wall => {
            if (wall.highlighted && !wall.selected) {
                wall.highlighted = false;
                this.updateWallAppearance(wall.id);
            }
        });
    }

    // Add method to toggle drawing mode
    public toggleDrawingMode() {
        this.isDrawingMode = !this.isDrawingMode;
        
        // Update the mode indicator
        this.updateModeIndicator();
        
        // If turning off drawing mode, clean up any ongoing drawing
        if (!this.isDrawingMode) {
            this.cleanupDrawing();
        }
    }

    // Add method to get current mode
    public isInDrawingMode(): boolean {
        return this.isDrawingMode;
    }

    private cleanupDrawing() {
        // Clean up preview line if it exists
        if (this.previewLine) {
            this.scene2D.remove(this.previewLine);
            this.previewLine.geometry.dispose();
            (this.previewLine.material as LineBasicMaterial).dispose();
            this.previewLine = null;
        }
        this.isDrawing = false;
        this.startPoint = null;
    }

    private createModeIndicator(): HTMLDivElement {
        const indicator = document.createElement('div');
        indicator.className = 'mode-indicator drawing-mode';
        
        const icon = document.createElement('div');
        icon.className = 'mode-indicator-icon';
        
        const text = document.createElement('span');
        text.textContent = 'Drawing Mode';
        
        indicator.appendChild(icon);
        indicator.appendChild(text);
        
        return indicator;
    }

    private updateModeIndicator() {
        const text = this.modeIndicator.querySelector('span');
        if (text) {
            text.textContent = this.isDrawingMode ? 'Drawing Mode' : 'Selection Mode';
        }
        this.modeIndicator.className = `mode-indicator ${this.isDrawingMode ? 'drawing-mode' : 'selection-mode'}`;
    }
}