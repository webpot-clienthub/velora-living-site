// Image Manager logic
let currentCategory = null;
let currentAction = null;
let stagedImages = []; // New images waiting to be added
let selectedForDelete = []; // Images selected for deletion
let selectedForUpdate = null; // Single image selected for update
let productData = {};

// Get category from URL parameter
const params = new URLSearchParams(window.location.search);
currentCategory = params.get('category');

// Load products data
async function loadProducts() {
    try {
        const response = await fetch('../data/products.json');
        productData = await response.json();
        console.log('Products loaded:', productData);
    } catch (error) {
        console.error('Failed to load products:', error);
    }
}

function resetUI() {
    currentAction = null;
    stagedImages = [];
    selectedForDelete = [];
    selectedForUpdate = null;
    document.getElementById('workspace').innerHTML = '';
    document.getElementById('confirm').disabled = true;
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadProducts();
    
    if (!currentCategory || !productData[currentCategory]) {
        document.getElementById('workspace').innerHTML = '<p>Invalid category</p>';
        return;
    }
    
    document.querySelector('h2').textContent = `Image Manager - ${productData[currentCategory].name}`;
    
    // Setup action buttons
    document.getElementById('add').addEventListener('click', () => setupAddAction());
    document.getElementById('remove').addEventListener('click', () => setupRemoveAction());
    document.getElementById('update').addEventListener('click', () => setupUpdateAction());
    document.getElementById('confirm').addEventListener('click', () => confirmChanges());
    document.getElementById('cancel').addEventListener('click', () => resetUI());
});

function setupAddAction() {
    currentAction = 'ADD';
    stagedImages = [];
    selectedForDelete = [];
    selectedForUpdate = null;
    
    const workspace = document.getElementById('workspace');
    workspace.innerHTML = `
        <div class="add-action">
            <h3>Add New Images</h3>
            <input type="file" id="file-upload" multiple accept="image/*">
            <div id="staged-preview" class="preview-grid"></div>
        </div>
    `;
    
    const fileInput = document.getElementById('file-upload');
    const stagedPreview = document.getElementById('staged-preview');
    
    fileInput.addEventListener('change', (e) => {
        stagedImages = [];
        stagedPreview.innerHTML = '';
        
        Array.from(e.target.files).forEach((file, idx) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                stagedImages.push({
                    name: file.name,
                    data: event.target.result
                });
                
                const preview = document.createElement('div');
                preview.className = 'image-preview';
                preview.innerHTML = `<img src="${event.target.result}"><p>${file.name}</p>`;
                stagedPreview.appendChild(preview);
            };
            reader.readAsDataURL(file);
        });
    });
    
    document.getElementById('confirm').disabled = false;
}

function setupRemoveAction() {
    currentAction = 'REMOVE';
    stagedImages = [];
    selectedForDelete = [];
    selectedForUpdate = null;
    
    const workspace = document.getElementById('workspace');
    const images = productData[currentCategory].images;
    
    let html = '<div class="remove-action"><h3>Remove Images</h3><div class="preview-grid">';
    images.forEach((img, idx) => {
        html += `
            <div class="image-preview selectable" data-index="${idx}">
                <img src="../../${img}">
                <input type="checkbox" class="image-checkbox" data-index="${idx}">
            </div>
        `;
    });
    html += '</div></div>';
    
    workspace.innerHTML = html;
    
    document.querySelectorAll('.image-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const idx = parseInt(e.target.dataset.index);
            if (e.target.checked) {
                selectedForDelete.push(idx);
            } else {
                selectedForDelete = selectedForDelete.filter(i => i !== idx);
            }
        });
    });
    
    document.getElementById('confirm').disabled = false;
}

function setupUpdateAction() {
    currentAction = 'UPDATE';
    stagedImages = [];
    selectedForDelete = [];
    selectedForUpdate = null;
    
    const workspace = document.getElementById('workspace');
    const images = productData[currentCategory].images;
    
    let html = '<div class="update-action"><h3>Update Images (Click to Select)</h3><div class="preview-grid">';
    images.forEach((img, idx) => {
        html += `
            <div class="image-preview selectable clickable" data-index="${idx}">
                <img src="../../${img}">
            </div>
        `;
    });
    html += '</div><input type="file" id="replacement-file" accept="image/*" style="display:none;"></div>';
    
    workspace.innerHTML = html;
    
    document.querySelectorAll('.image-preview.clickable').forEach(preview => {
        preview.addEventListener('click', () => {
            // Deselect previous
            document.querySelectorAll('.image-preview.clickable.selected').forEach(p => 
                p.classList.remove('selected')
            );
            
            // Select this one
            preview.classList.add('selected');
            selectedForUpdate = parseInt(preview.dataset.index);
            document.getElementById('replacement-file').click();
        });
    });
    
    document.getElementById('replacement-file').addEventListener('change', (e) => {
        if (e.target.files[0] && selectedForUpdate !== null) {
            const reader = new FileReader();
            reader.onload = (event) => {
                stagedImages = [{
                    name: e.target.files[0].name,
                    data: event.target.result,
                    replaceIndex: selectedForUpdate
                }];
            };
            reader.readAsDataURL(e.target.files[0]);
            document.getElementById('confirm').disabled = false;
        }
    });
    
    document.getElementById('confirm').disabled = true;
}

async function confirmChanges() {
    if (!currentAction) return;
    
    try {
        if (currentAction === 'ADD') {
            if (stagedImages.length === 0) {
                alert('No images to add');
                return;
            }
            // In a real app, upload to server/storage
            // For now, simulate adding paths
            stagedImages.forEach(img => {
                const newPath = `assets/products/${currentCategory}_${Date.now()}_${img.name}`;
                productData[currentCategory].images.push(newPath);
            });
        } 
        else if (currentAction === 'REMOVE') {
            if (selectedForDelete.length === 0) {
                alert('No images selected for removal');
                return;
            }
            // Remove in reverse order to maintain correct indices
            selectedForDelete.sort((a, b) => b - a).forEach(idx => {
                productData[currentCategory].images.splice(idx, 1);
            });
        } 
        else if (currentAction === 'UPDATE') {
            if (!stagedImages.length || selectedForUpdate === null) {
                alert('No replacement image provided');
                return;
            }
            const newPath = `assets/products/${currentCategory}_${Date.now()}_${stagedImages[0].name}`;
            productData[currentCategory].images[selectedForUpdate] = newPath;
        }
        
        // Save updated data
        await saveProducts();
        alert(`${currentAction} action confirmed!`);
        
        // Reset
        resetUI();
        
    } catch (error) {
        console.error('Error confirming changes:', error);
        alert('Failed to confirm changes');
    }
}

async function saveProducts() {
    // In a real app, this would POST to a backend endpoint
    // For now, we'll just store in localStorage as a demo
    localStorage.setItem('velora_products', JSON.stringify(productData));
    console.log('Products saved:', productData);
}
