// Initialize Supabase Client
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// State variables
let allPrompts = [];
let editingId = null;
let deletingId = null;

// DOM Elements
const promptsContainer = document.getElementById('prompts-container');
const searchInput = document.getElementById('search-input');
const categoryFilter = document.getElementById('category-filter');
const sortFilter = document.getElementById('sort-filter');
const totalCount = document.getElementById('total-count');

// Modal Elements
const promptModalOverlay = document.getElementById('prompt-modal-overlay');
const promptForm = document.getElementById('prompt-form');
const modalTitle = document.getElementById('modal-title');
const btnSave = document.getElementById('btn-save');

const deleteModalOverlay = document.getElementById('delete-modal-overlay');
const btnConfirmDelete = document.getElementById('btn-confirm-delete');

// Form Inputs
const titleInput = document.getElementById('prompt-title');
const categoryInput = document.getElementById('prompt-category');
const textInput = document.getElementById('prompt-text');
const urlInput = document.getElementById('prompt-image-url');
const fileInput = document.getElementById('image-file');
const btnGetUrl = document.getElementById('btn-get-url');
const previewBox = document.getElementById('image-preview-box');

// -----------------------------------------
// 1. AUTHENTICATION CHECK
// -----------------------------------------
function checkAuth() {
    const isLoggedIn = sessionStorage.getItem('admin_authenticated');
    if (!isLoggedIn) {
        window.location.href = 'admin-login.html';
    } else {
        fetchPrompts();
    }
}

// -----------------------------------------
// 2. FETCH & RENDER PROMPTS
// -----------------------------------------
async function fetchPrompts() {
    try {
        const { data, error } = await supabaseClient
            .from('prompts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        allPrompts = data || [];
        renderPrompts();
    } catch (err) {
        console.error("Fetch Error:", err);
        showToast("Unable to load prompts. Please try again.", "error");
        promptsContainer.innerHTML = `<div class="empty-state"><h3>Error Loading Data</h3><p>Check connection or refresh the page.</p></div>`;
    }
}

function renderPrompts() {
    const searchTerm = searchInput.value.toLowerCase();
    const cat = categoryFilter.value;
    const sortMethod = sortFilter.value;

    let filtered = allPrompts.filter(p => {
        const matchesSearch = (p.title || '').toLowerCase().includes(searchTerm) || (p.prompt_text || '').toLowerCase().includes(searchTerm);
        const matchesCat = cat === 'All' || p.category === cat;
        return matchesSearch && matchesCat;
    });

    filtered.sort((a, b) => {
        if (sortMethod === 'newest') return new Date(b.created_at) - new Date(a.created_at);
        if (sortMethod === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
        if (sortMethod === 'az') return (a.title || '').localeCompare(b.title || '');
        if (sortMethod === 'za') return (b.title || '').localeCompare(a.title || '');
    });

    totalCount.innerText = filtered.length;

    if (filtered.length === 0) {
        promptsContainer.innerHTML = `<div class="empty-state"><h3>No prompts found</h3><p>${allPrompts.length === 0 ? "Create your first prompt to get started." : "Try adjusting your search or filters."}</p></div>`;
        return;
    }

    let html = '';
    filtered.forEach((prompt, index) => {
        const date = prompt.created_at ? new Date(prompt.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
        const delay = index * 0.05;
        
        html += `
            <div class="prompt-row" style="animation-delay: ${delay}s">
                <img src="${prompt.image_url || ''}" alt="Thumbnail" class="p-thumb" loading="lazy">
                <div class="p-info">
                    <div class="p-title" title="${prompt.title || ''}">${prompt.title || ''}</div>
                    <span class="p-category">${prompt.category || ''}</span>
                </div>
                <div class="p-text-preview" title="${prompt.prompt_text || ''}">${prompt.prompt_text || ''}</div>
                <div class="p-date">${date}</div>
                <div class="p-actions">
                    <button class="btn btn-secondary" onclick="window.triggerEdit('${prompt.id}')">Edit</button>
                    <button class="btn btn-danger" onclick="window.triggerDelete('${prompt.id}')">Delete</button>
                </div>
            </div>
        `;
    });

    promptsContainer.innerHTML = html;
}

searchInput.addEventListener('input', renderPrompts);
categoryFilter.addEventListener('change', renderPrompts);
sortFilter.addEventListener('change', renderPrompts);

// -----------------------------------------
// 3. MODAL LOGIC
// -----------------------------------------
window.openPromptModal = () => {
    editingId = null;
    modalTitle.innerText = "Add New Prompt";
    btnSave.innerText = "Publish Prompt";
    promptForm.reset();
    updateImagePreview();
    promptModalOverlay.classList.add('active');
};

window.closePromptModal = () => {
    promptModalOverlay.classList.remove('active');
    setTimeout(() => {
        promptForm.reset();
        updateImagePreview();
        editingId = null;
    }, 300);
};

window.triggerEdit = (id) => {
    const prompt = allPrompts.find(p => String(p.id) === String(id));
    if (!prompt) return;

    editingId = id;
    modalTitle.innerText = "Edit Prompt";
    btnSave.innerText = "Update Prompt";
    
    titleInput.value = prompt.title || '';
    categoryInput.value = prompt.category || '';
    textInput.value = prompt.prompt_text || '';
    urlInput.value = prompt.image_url || '';
    updateImagePreview();
    
    promptModalOverlay.classList.add('active');
};

urlInput.addEventListener('input', updateImagePreview);

function updateImagePreview() {
    const url = urlInput.value.trim();
    if (url) {
        previewBox.innerHTML = `<img src="${url}" alt="Preview" onerror="this.onerror=null; this.parentElement.innerHTML='<span>Invalid URL</span>'">`;
    } else {
        previewBox.innerHTML = `<span>No Image</span>`;
    }
}

// -----------------------------------------
// 4. UPLOAD WORKFLOW TO "Prompt" BUCKET
// -----------------------------------------
btnGetUrl.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) {
        showToast("Please choose an image file first.", "error");
        return;
    }

    btnGetUrl.innerText = "Uploading...";
    btnGetUrl.disabled = true;

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { error: uploadError } = await supabaseClient.storage
            .from('Prompt')
            .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        const { data } = supabaseClient.storage.from('Prompt').getPublicUrl(fileName);
        
        urlInput.value = data.publicUrl;
        updateImagePreview();
        showToast("Image uploaded successfully.", "success");
        
    } catch (err) {
        console.error("Upload Error:", err);
        showToast("Failed to upload image.", "error");
    } finally {
        btnGetUrl.innerText = "Get URL";
        btnGetUrl.disabled = false;
    }
});

// -----------------------------------------
// 5. SAVE / UPDATE PROMPT
// -----------------------------------------
promptForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const payload = {
        title: titleInput.value.trim(),
        image_url: urlInput.value.trim(),
        prompt_text: textInput.value.trim(),
        category: categoryInput.value
    };

    btnSave.disabled = true;
    const originalText = btnSave.innerText;
    btnSave.innerText = editingId ? "Updating..." : "Publishing...";

    try {
        if (editingId) {
            const { error } = await supabaseClient.from('prompts').update(payload).eq('id', editingId);
            if (error) throw error;
            
            const index = allPrompts.findIndex(p => String(p.id) === String(editingId));
            if (index !== -1) {
                allPrompts[index] = { ...allPrompts[index], ...payload };
            }
            showToast("Prompt updated successfully.", "success");
        } else {
            const { data, error } = await supabaseClient.from('prompts').insert([payload]).select();
            if (error) throw error;
            
            if (data && data.length > 0) {
                allPrompts.unshift(data[0]);
            }
            showToast("Prompt published successfully.", "success");
        }

        closePromptModal();
        renderPrompts();
    } catch (err) {
        console.error("Save Error:", err);
        showToast("Failed to save prompt.", "error");
    } finally {
        btnSave.disabled = false;
        btnSave.innerText = originalText;
    }
});

// -----------------------------------------
// 6. DELETE PROMPT
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
        const { error } = await supabaseClient.from('prompts').delete().eq('id', deletingId);
        if (error) throw error;

        allPrompts = allPrompts.filter(p => String(p.id) !== String(deletingId));
        showToast("Prompt deleted successfully.", "success");
        closeDeleteModal();
        renderPrompts();
    } catch (err) {
        console.error("Delete Error:", err);
        showToast("Failed to delete prompt.", "error");
    } finally {
        btnConfirmDelete.disabled = false;
        btnConfirmDelete.innerText = "Delete Prompt";
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

document.addEventListener('DOMContentLoaded', checkAuth);
