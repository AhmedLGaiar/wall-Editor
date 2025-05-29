import { Viewer } from './Viewer';

// Get the container element
const container = document.getElementById('viewer-container');
if (!container) {
    throw new Error('Container element not found');
}

// Create the viewer
const viewer = new Viewer(container);

// Add view switching buttons
const switchTo2DButton = document.getElementById('switch-to-2d');
const switchTo3DButton = document.getElementById('switch-to-3d');
const zoomExtendButton = document.getElementById('zoom-extend');

if (switchTo2DButton) {
    switchTo2DButton.addEventListener('click', () => {
        viewer.setView(true);
    });
}

if (switchTo3DButton) {
    switchTo3DButton.addEventListener('click', () => {
        viewer.setView(false);
    });
}

if (zoomExtendButton) {
    zoomExtendButton.addEventListener('click', () => {
        viewer.zoomExtend();
    });
}