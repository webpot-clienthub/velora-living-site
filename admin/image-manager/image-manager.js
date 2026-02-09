// Image Manager logic
let currentCategory = null;
let currentAction = null;
let stagedImages = []; // New images waiting to be added
let selectedForDelete = []; // Images selected for deletion
let selectedForUpdate = null; // Single image selected for update
let productData = {};
let apiAvailable = false;
const API_BASE = '../api';

// Get category from URL parameter
const params = new URLSearchParams(window.location.search);
currentCategory = params.get('category');

// Load products data
async function loadProducts() {
    try {
        const apiResponse = await fetch(`${API_BASE}/products.php`, { cache: 'no-store' });
        if (apiResponse.ok) {
            const data = await apiResponse.json();
            if (data && typeof data === 'object') {
                productData = data;
                apiAvailable = true;
                console.log('Products loaded from API:', productData);
                return;
            }
        }
    } catch (error) {
        console.warn('API not available, falling back to local JSON.');
    }

    try {
        const response = await fetch('../data/products.json', { cache: 'no-store' });
        productData = await response.json();
        apiAvailable = false;
        console.log('Products loaded from local JSON:', productData);
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

// Initialize theme from localStorage
function initializeTheme() {
    const savedTheme = localStorage.getItem('themeMode');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        updateThemeToggle('☀️');
    }
}

// Toggle theme between light and dark
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('themeMode', isDark ? 'dark' : 'light');
    updateThemeToggle(isDark ? '☀️' : '🌙');
}

// Update theme toggle button text
function updateThemeToggle(icon) {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.textContent = icon;
    }
}

function showCategoryPicker() {
    const workspace = document.getElementById('workspace');
    const heading = document.querySelector('h2');
    const actions = document.querySelector('.actions');
    const confirmSection = document.querySelector('.confirm-section');

    if (actions) actions.classList.add('is-hidden');
    if (confirmSection) confirmSection.classList.add('is-hidden');

    if (heading) {
        heading.textContent = 'Select a Category';
    }

    const categories = Object.keys(productData);
    if (categories.length === 0) {
        workspace.innerHTML = '<p>No categories found in velora_product.</p>';
        return;
    }

    const cards = categories.map((key) => {
        const category = productData[key];
        const name = category?.name || key;
        const count = category?.images?.length || 0;
        return `
            <button class="category-card" data-category="${key}">
                <span class="category-name">${name}</span>
                <span class="category-count">${count} images</span>
            </button>
        `;
    });

    workspace.innerHTML = `<div class="category-grid">${cards.join('')}</div>`;

    workspace.querySelectorAll('.category-card').forEach((btn) => {
        btn.addEventListener('click', () => {
            window.location.href = `index.php?category=${btn.dataset.category}`;
        });
    });
}

function showInvalidCategory() {
    const workspace = document.getElementById('workspace');
    const heading = document.querySelector('h2');
    const actions = document.querySelector('.actions');
    const confirmSection = document.querySelector('.confirm-section');

    if (actions) actions.classList.add('is-hidden');
    if (confirmSection) confirmSection.classList.add('is-hidden');

    if (heading) {
        heading.textContent = 'Category Not Found';
    }

    workspace.innerHTML = '<p>Invalid category. Please go back and choose a valid category.</p>';
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    if (window.AUTH && AUTH.requireAuth) {
        await AUTH.requireAuth();
    }
    // Initialize theme
    initializeTheme();
    
    // Setup theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (window.AUTH && AUTH.logout) {
                await AUTH.logout();
            }
            window.location.href = '/admin/login.html';
        });
    }
    
    await loadProducts();
    
    if (!currentCategory) {
        showCategoryPicker();
        return;
    }

    if (!productData[currentCategory]) {
        showInvalidCategory();
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
                    data: event.target.result,
                    file
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
                    replaceIndex: selectedForUpdate,
                    file: e.target.files[0]
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
            if (!apiAvailable) {
                alert('Server not running. Start the admin server to upload images.');
                return;
            }
            const newPaths = await uploadAddImages(stagedImages, currentCategory);
            newPaths.forEach((p) => productData[currentCategory].images.push(p));
        } 
        else if (currentAction === 'REMOVE') {
            if (selectedForDelete.length === 0) {
                alert('No images selected for removal');
                return;
            }
            if (!apiAvailable) {
                alert('Server not running. Start the admin server to delete images.');
                return;
            }
            const images = productData[currentCategory].images;
            const pathsToDelete = selectedForDelete.map((idx) => images[idx]).filter(Boolean);
            await deleteImages(pathsToDelete);
            selectedForDelete.sort((a, b) => b - a).forEach(idx => {
                productData[currentCategory].images.splice(idx, 1);
            });
        } 
        else if (currentAction === 'UPDATE') {
            if (!stagedImages.length || selectedForUpdate === null) {
                alert('No replacement image provided');
                return;
            }
            if (!apiAvailable) {
                alert('Server not running. Start the admin server to update images.');
                return;
            }
            const prevPath = productData[currentCategory].images[selectedForUpdate];
            const newPath = await replaceImage(stagedImages[0], currentCategory, prevPath);
            if (newPath) {
                productData[currentCategory].images[selectedForUpdate] = newPath;
            }
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
    if (!apiAvailable) {
        localStorage.setItem('velora_products', JSON.stringify(productData));
        console.log('Products saved to localStorage:', productData);
        return;
    }

    await fetch(`${API_BASE}/products.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
    });
    console.log('Products saved to API:', productData);
}

async function uploadAddImages(images, category) {
    const formData = new FormData();
    images.forEach((img) => formData.append('images[]', img.file, img.name));

    const response = await fetch(`${API_BASE}/images_add.php?category=${encodeURIComponent(category)}`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        let details = '';
        try {
            const err = await response.json();
            details = err?.error ? `: ${err.error}` : '';
        } catch (_) {
            try {
                const text = await response.text();
                details = text ? `: ${text}` : '';
            } catch (_) {}
        }
        throw new Error(`Upload failed${details}`);
    }

    const data = await response.json();
    return Array.isArray(data.paths) ? data.paths : [];
}

async function replaceImage(image, category, prevPath) {
    const formData = new FormData();
    formData.append('image', image.file, image.name);
    formData.append('prevPath', prevPath || '');

    const response = await fetch(`${API_BASE}/images_replace.php?category=${encodeURIComponent(category)}`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        let details = '';
        try {
            const err = await response.json();
            details = err?.error ? `: ${err.error}` : '';
        } catch (_) {
            try {
                const text = await response.text();
                details = text ? `: ${text}` : '';
            } catch (_) {}
        }
        throw new Error(`Replace failed${details}`);
    }

    const data = await response.json();
    return data.path || null;
}

async function deleteImages(paths) {
    const response = await fetch(`${API_BASE}/images_delete.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths })
    });

    if (!response.ok) {
        let details = '';
        try {
            const err = await response.json();
            details = err?.error ? `: ${err.error}` : '';
        } catch (_) {
            try {
                const text = await response.text();
                details = text ? `: ${text}` : '';
            } catch (_) {}
        }
        throw new Error(`Delete failed${details}`);
    }
}
