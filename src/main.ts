import { Viewer } from './Viewer';

// Get the container element
const container = document.getElementById('viewer-container');
if (!container) {
    throw new Error('Container element not found');
}

// Create the viewer
const viewer = new Viewer(container);
console.log("Viewer instance created.");

// Get UI elements
const switchTo2DButton = document.getElementById('switch-to-2d');
const switchTo3DButton = document.getElementById('switch-to-3d');
const toggleModeButton = document.getElementById('toggle-mode');

// Set initial button text to match default drawing mode
if (toggleModeButton) {
    toggleModeButton.textContent = 'Drawing Mode';
}

// Log button retrieval
console.log("Buttons retrieved:", { 
    switchTo2D: !!switchTo2DButton, 
    switchTo3D: !!switchTo3DButton,
    toggleMode: !!toggleModeButton
});

// Add event listeners for view switching
if (switchTo2DButton) {
    switchTo2DButton.addEventListener('click', () => { 
        console.log("2D Button Clicked"); 
        viewer.setView(true); 
    });
}

if (switchTo3DButton) {
    switchTo3DButton.addEventListener('click', () => { 
        console.log("3D Button Clicked"); 
        viewer.setView(false); 
    });
}

// Add mode toggle button listener
if (toggleModeButton) {
    toggleModeButton.addEventListener('click', () => {
        viewer.toggleDrawingMode();
        toggleModeButton.textContent = viewer.isInDrawingMode() ? 'Drawing Mode' : 'Selection Mode';
    });
}

// Add keyboard shortcut for mode switching
document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'd') {
        viewer.toggleDrawingMode();
        if (toggleModeButton) {
            toggleModeButton.textContent = viewer.isInDrawingMode() ? 'Drawing Mode' : 'Selection Mode';
        }
    }
});

// --- In Viewer.ts --- (Add these logs manually if needed, or I can do it next)
// constructor(container: HTMLElement) { ... console.log("Viewer constructor called."); ... }
// private setup() { ... console.log("Viewer setup() called, adding mouse listeners."); ... }