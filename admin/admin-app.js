// Initialize Supabase Client
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// State Variables
let allApps = [];
let editingId = null;
let deletingId = null;

// DOM Elements
const appsContainer = document.getElementById('apps-container');
const searchInput = document.getElementById('search-input');
const categoryFilter = document.getElementById('category-filter');
const sortFilter = document.getElementById('sort-filter');
const totalCount = document.getElementById('total-count');

// Modal Elements
const appModalOverlay = document.getElementById('app-modal-overlay');
const appForm = document.getElementById('app-form');
const modalTitle = document.getElementById('modal-title');
const btnSave = document.getElementById('btn-save');

const deleteModalOverlay = document.getElementById('delete-modal-overlay');
const btnConfirmDelete = document.getElementById('btn-confirm-delete');

// Form Inputs
const nameInput = document.getElementById('app-name');
const categoryInput = document.getElementById('app-category');
const downloadUrlInput = document.getElementById('app-download-url');
const descriptionInput = document.getElementById('app-description');
const iconUrlInput = document.getElementById('app-icon-url');
const fileInput = document.getElementById('icon-file');
const btnGetUrl = document.getElementById('btn-get-url');
const previewBox = document.getElementById('icon-preview-box');

// -----------------------------------------
// 1. AUTHENTICATION CHECK (TEMPORARILY BYPASSED)
// -----------------------------------------
function checkAuth() {
    // Bina login check kiye direct apps fetch karega
    fetchApps();
}


// 2. FETCH & RENDER APPS
// -----------------------------------------
async function fetchApps() {
    try {
        const { data, error } = await supabaseClient
            .from('apps')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        allApps = data || [];
        renderApps();
    } catch (err) {
        console.error("Fetch Error:", err);
        showToast("Unable to load apps. Please try again.", "error");
        appsContainer.innerHTML = `<div class="empty-state"><h3>Error Loading Data</h3><p>Check connection or refresh the page.</p></div>`;
    }
}

function renderApps() {
    const searchTerm = searchInput.value.toLowerCase();
    const cat = categoryFilter.value;
    const sortMethod = sortFilter.value;

    let filtered = allApps.filter(a => {
        const matchesSearch = (a.name || '').toLowerCase().includes(searchTerm) || (a.description || '').toLowerCase().includes(searchTerm);
        const matchesCat = cat === 'All' || a.category === cat;
        return matchesSearch && matchesCat;
    });

    filtered.sort((a, b) => {
        if (sortMethod === 'newest') return new Date(b.created_at) - new Date(a.created_at);
        if (sortMethod === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
        if (sortMethod === 'az') return (a.name || '').localeCompare(b.name || '');
        if (sortMethod === 'za') return (b.name || '').localeCompare(a.name || '');
    });

    totalCount.innerText = filtered.length;

    if (filtered.length === 0) {
        appsContainer.innerHTML = `<div class="empty-state"><h3>No apps found</h3><p>${allApps.length === 0 ? "Add your first app to get started." : "Try adjusting your search or filters."}</p></div>`;
        return;
    }

    let html = '';
    filtered.forEach((app, index) => {
        const date = app.created_at ? new Date(app.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
        const delay = index * 0.05;
        
        html += `
            <div class="app-row" style="animation-delay: ${delay}s">
                <img src="${app.icon_url || ''}" alt="Icon" class="app-icon" loading="lazy" onerror="this.src='t/1.png'">
                <div class="p-info">
                    <div class="p-title" title="${app.name || ''}">${app.name || ''}</div>
                    <span class="p-category">${app.category || ''}</span>
                </div>
                <div>
                    <a href="${app.download_url}" target="_blank" rel="noopener noreferrer" class="download-link-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        Test Link
                    </a>
                </div>
                <div class="p-text-preview" title="${app.description || ''}">${app.description || ''}</div>
                <div class="p-date">${date}</div>
                <div class="p-actions">
                    <button class="btn btn-secondary" onclick="window.triggerEdit('${app.id}')">Edit</button>
                    <button class="btn btn-danger" onclick="window.triggerDelete('${app.id}')">Delete</button>
                </div>
            </div>
        `;
    });

    appsContainer.innerHTML = html;
}

searchInput.addEventListener('input', renderApps);
categoryFilter.addEventListener('change', renderApps);
sortFilter.addEventListener('change', renderApps);

// -----------------------------------------
// 3. MODAL CONTROLS (ADD / EDIT)
// -----------------------------------------
window.openAppModal = () => {
    editingId = null;
    modalTitle.innerText = "Add New App";
    btnSave.innerText = "Publish App";
    appForm.reset();
    updateIconPreview();
    appModalOverlay.classList.add('active');
};

window.closeAppModal = () => {
    appModalOverlay.classList.remove('active');
    setTimeout(() => {
        appForm.reset();
        updateIconPreview();
        editingId = null;
    }, 300);
};

window.triggerEdit = (id) => {
    const app = allApps.find(a => String(a.id) === String(id));
    if (!app) return;

    editingId = id;
    modalTitle.innerText = "Edit App";
    btnSave.innerText = "Update App";
    
    nameInput.value = app.name || '';
    categoryInput.value = app.category || '';
    downloadUrlInput.value = app.download_url || '';
    descriptionInput.value = app.description || '';
    iconUrlInput.value = app.icon_url || '';
    updateIconPreview();
    
    appModalOverlay.classList.add('active');
};

iconUrlInput.addEventListener('input', updateIconPreview);

function updateIconPreview() {
    const url = iconUrlInput.value.trim();
    if (url) {
        previewBox.innerHTML = `<img src="${url}" alt="Preview" onerror="this.onerror=null; this.parentElement.innerHTML='<span>Invalid URL</span>'">`;
    } else {
        previewBox.innerHTML = `<span>No Icon</span>`;
    }
}

// -----------------------------------------
// 4. ICON UPLOAD WORKFLOW (To 'Prompt' or 'App' bucket)
// -----------------------------------------
btnGetUrl.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) {
        showToast("Please choose an icon image file first.", "error");
        return;
    }

    btnGetUrl.innerText = "Uploading...";
    btnGetUrl.disabled = true;

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `app_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        // Uploads to storage bucket
        const { error: uploadError } = await supabaseClient.storage
            .from('Prompt') // Agar aapne alag 'App' bucket banaya ho to yahan change kar sakte hain
            .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        const { data } = supabaseClient.storage.from('Prompt').getPublicUrl(fileName);
        
        iconUrlInput.value = data.publicUrl;
        updateIconPreview();
        showToast("Icon uploaded successfully.", "success");
        
    } catch (err) {
        console.error("Upload Error:", err);
        showToast("Failed to upload icon.", "error");
    } finally {
        btnGetUrl.innerText = "Get URL";
        btnGetUrl.disabled = false;
    }
});

// -----------------------------------------
// 5. INSERT / UPDATE TO "apps" TABLE
// -----------------------------------------
appForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const payload = {
        name: nameInput.value.trim(),
        icon_url: iconUrlInput.value.trim(),
        category: categoryInput.value,
        download_url: downloadUrlInput.value.trim(),
        description: descriptionInput.value.trim()
    };

    btnSave.disabled = true;
    const originalText = btnSave.innerText;
    btnSave.innerText = editingId ? "Updating..." : "Publishing...";

    try {
        if (editingId) {
            const { error } = await supabaseClient
                .from('apps')
                .update(payload)
                .eq('id', editingId);
                
            if (error) throw error;
            
            const index = allApps.findIndex(a => String(a.id) === String(editingId));
            if (index !== -1) {
                allApps[index] = { ...allApps[index], ...payload };
            }
            showToast("App updated successfully.", "success");
        } else {
            const { data, error } = await supabaseClient
                .from('apps')
                .insert([payload])
                .select();
                
            if (error) throw error;
            
            if (data && data.length > 0) {
                allApps.unshift(data[0]);
            }
            showToast("App published successfully.", "success");
        }

        closeAppModal();
        renderApps();
    } catch (err) {
        console.error("Save Error:", err);
        showToast("Failed to save app.", "error");
    } finally {
        btnSave.disabled = false;
        btnSave.innerText = originalText;
    }
});

// -----------------------------------------
// 6. DELETE APP
// -----------------------------------------
window.triggerDelete = (id) => {
    deletingId = id;
    deleteModalOverlay.classList.add('active');
};

window.closeDeleteModal = () => {
    deleteModalOverlay.classList.remove('active');
    deletingId = null;
};

btnConfirmDelete.addEventListener('click', async () => {
    if (!deletingId) return;

    btnConfirmDelete.disabled = true;
    btnConfirmDelete.innerText = "Deleting...";

    try {
        const { error } = await supabaseClient
            .from('apps')
            .delete()
            .eq('id', deletingId);

        if (error) throw error;

        allApps = allApps.filter(a => String(a.id) !== String(deletingId));
        showToast("App deleted successfully.", "success");
        closeDeleteModal();
        renderApps();
    } catch (err) {
        console.error("Delete Error:", err);
        showToast("Failed to delete app.", "error");
    } finally {
        btnConfirmDelete.disabled = false;
        btnConfirmDelete.innerText = "Delete App";
    }
});

// -----------------------------------------
// 7. TOAST NOTIFICATIONS
// -----------------------------------------
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' 
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Check session on page load
document.addEventListener('DOMContentLoaded', checkAuth);
