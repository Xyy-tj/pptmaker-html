(function() {
    let fs, path, electron;
    try {
        fs = require('fs');
        path = require('path');
        electron = require('electron');
    } catch (e) {
        console.warn('Node.js modules not found. Running in browser mode?');
    }

// State
let currentProject = null;
let currentSlideIndex = 0;
let projectsData = null;
const configPath = path ? path.join(process.cwd(), 'projects.json') : '';

// DOM Elements
const dashboardView = document.getElementById('view-dashboard');
const projectsContainer = document.getElementById('projectList'); // Corrected ID
const previewView = document.getElementById('view-preview');
const generatorView = document.getElementById('view-generator');

const projectNameEl = document.getElementById('project-name');
const slideListEl = document.getElementById('slide-list');
const slideFrame = document.getElementById('slide-frame');

const openFolderBtn = document.getElementById('open-folder-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const pageInfo = document.getElementById('page-info');

// Preview Navigation Elements
const previewPrevBtn = document.getElementById('preview-prev-btn');
const previewNextBtn = document.getElementById('preview-next-btn');
const previewPageInfo = document.getElementById('preview-page-info');

const fullscreenBtn = document.getElementById('nav-present');
const exitBtn = document.getElementById('exit-present-btn');
const presentationControls = document.getElementById('present-controls');

// Navigation Elements
const navDashboard = document.getElementById('nav-dashboard');
const navGenerator = document.getElementById('nav-generator');
const navPreview = document.getElementById('nav-preview');
const navSettings = document.getElementById('nav-settings');

// Settings Elements
const settingApiKey = document.getElementById('setting-apiKey');
const settingBaseUrl = document.getElementById('setting-baseUrl');
const settingModelSelect = document.getElementById('setting-modelSelect');
const settingCustomModelInput = document.getElementById('setting-customModelInput');
const settingTestConnectBtn = document.getElementById('setting-testConnectBtn');
const settingConnectStatus = document.getElementById('setting-connectStatus');
const settingSystemPrompt = document.getElementById('setting-systemPrompt');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const settingsStatus = document.getElementById('settingsStatus');

window.updateGeneratorProjectList = function(projects) {
    if (window.slideGenerator && window.slideGenerator.updateProjectList) {
        window.slideGenerator.updateProjectList(projects);
    }
}

// Initialize
function init() {
    loadConfig();
    
    renderProjectList();
    initSettings();
    
    // Update generator list
    if (projectsData && projectsData.projects) {
        window.updateGeneratorProjectList(projectsData.projects);
    }

    // Check URL params
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('project');
    const slideIdx = parseInt(params.get('slide')) || 0;

    if (projectId && projectsData && projectsData.projects) {
        const project = projectsData.projects.find(p => p.id === projectId);
        if (project) {
            loadProject(project, slideIdx);
        }
    } else {
        // Default to dashboard
        navigateTo('dashboard');
    }
}

function loadConfig() {
    if (!fs) {
        // Fallback for browser mode without Node integration
        console.warn('fs module missing, using window.appConfig');
        if (window.appConfig) {
            projectsData = window.appConfig;
        }
        return;
    }

    try {
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf8');
            projectsData = JSON.parse(data);
            window.appConfig = projectsData; // Keep backward compatibility for now
        } else {
            // Fallback to initial config if file doesn't exist
            console.warn('projects.json not found, using default config');
            if (window.appConfig) {
                projectsData = window.appConfig;
                saveConfig(); // Create the file
            }
        }
    } catch (err) {
        console.error('Error loading config:', err);
        alert('Failed to load configuration!');
    }
}

function saveConfig() {
    if (!fs) return;
    try {
        fs.writeFileSync(configPath, JSON.stringify(projectsData, null, 4), 'utf8');
        window.appConfig = projectsData; // Sync
    } catch (err) {
        console.error('Error saving config:', err);
    }
}

// Global Navigation Function
window.navigateTo = function(viewName) {
    // Update Nav State
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const navItem = document.getElementById('nav-' + viewName);
    if (navItem) navItem.classList.add('active');

    // Update View State
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    const viewSection = document.getElementById('view-' + viewName);
    if (viewSection) viewSection.classList.add('active');

    // Special logic
    if (viewName === 'dashboard') {
        currentProject = null;
        slideFrame.src = 'about:blank';
        if (navPreview) navPreview.classList.add('hidden');
        
        // Update URL to clean state
        history.pushState(null, '', window.location.pathname);
    }
}

// Render Projects
function renderProjectList() {
    if (!projectsContainer || !projectsData) return;
    projectsContainer.innerHTML = '';
    projectsData.projects.forEach(project => {
        const card = document.createElement('div');
        card.className = 'project-card';
        
        // Preview logic: use first slide if available
        let previewHtml = '<div class="card-preview" style="background: #f1f5f9; color: #94a3b8; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 500;">No Preview Available</div>';
        if (project.slides && project.slides.length > 0) {
            previewHtml = `
                <div class="card-preview">
                    <iframe src="${project.slides[0].path}" scrolling="no" tabindex="-1"></iframe>
                    <div class="card-overlay"></div>
                </div>
            `;
        }

        const slideCount = project.slides ? project.slides.length : 0;
        const description = project.description || 'No description provided for this project.';

        card.innerHTML = `
            ${previewHtml}
            <div class="card-content">
                <div class="project-title">${project.name}</div>
                <div class="project-desc">${description}</div>
                <div class="card-footer">
                    <div class="card-meta">
                        <div class="meta-item">
                            <span class="meta-icon">📄</span>
                            <span>${slideCount} Slides</span>
                        </div>
                    </div>
                    <div class="card-actions">
                        <button class="btn-icon-only" title="Open Project">
                            <span class="icon">↗️</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Click on card body loads project
        card.onclick = (e) => {
            loadProject(project);
        };
        projectsContainer.appendChild(card);
    });
}

// Refresh Project Slides from Disk
function refreshProjectSlides(project) {
    if (!fs || !path) return;

    // 1. Determine the directory
    let projectDir = `slides/${project.id}`;
    
    // Use the first slide to determine the directory if available
    if (project.slides && project.slides.length > 0) {
        const firstPath = project.slides[0].path;
        const lastSlashIndex = firstPath.lastIndexOf('/');
        if (lastSlashIndex !== -1) {
            projectDir = firstPath.substring(0, lastSlashIndex);
        }
    }
    
    const fullDirPath = path.join(process.cwd(), projectDir);
    
    // 2. Check if directory exists
    if (!fs.existsSync(fullDirPath)) return;
    
    // 3. Read directory
    try {
        const files = fs.readdirSync(fullDirPath);
        const htmlFiles = files.filter(f => f.toLowerCase().endsWith('.html')).sort();
        
        // 4. Sync slides
        const newSlides = [];
        
        htmlFiles.forEach(filename => {
            const relPath = `${projectDir}/${filename}`;
            const existing = project.slides.find(s => s.path === relPath);
            
            if (existing) {
                newSlides.push(existing);
            } else {
                // New file found
                newSlides.push({
                    title: filename.replace(/\.html$/i, ''),
                    path: relPath
                });
            }
        });
        
        project.slides = newSlides;
        saveConfig();
        
    } catch (e) {
        console.error('Error refreshing project slides:', e);
    }
}

// Load Project
function loadProject(project, initialSlideIndex = 0) {
    refreshProjectSlides(project);
    currentProject = project;
    window.currentProject = project; // Expose globally
    
    // Update Generator Selection
    if (window.slideGenerator && window.slideGenerator.saveProjectSelect) {
        window.slideGenerator.saveProjectSelect.value = project.id;
    }

    currentSlideIndex = initialSlideIndex;
    
    if (projectNameEl) projectNameEl.textContent = project.name;
    
    // Show Preview Nav
    if (navPreview) navPreview.classList.remove('hidden');
    
    // Navigate to Preview
    navigateTo('preview');
    
    renderSlideList();
    loadSlide(currentSlideIndex);
    
    updateUrl();
}

// Expose for back button or external calls
window.showProjectList = function() {
    navigateTo('dashboard');
}

// Render Slide List
function renderSlideList() {
    if (!slideListEl) return;
    slideListEl.innerHTML = '';
    currentProject.slides.forEach((slide, index) => {
        const item = document.createElement('div');
        item.className = `slide-item ${index === currentSlideIndex ? 'active' : ''}`;
        
        // Create content wrapper
        const content = document.createElement('div');
        content.style.display = 'flex';
        content.style.alignItems = 'center';
        content.style.gap = '8px';
        content.innerHTML = `
            <span class="slide-index">${index + 1}</span>
            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px;">${slide.title}</span>
        `;
        
        // Create delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'slide-delete-btn';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = '从列表中移除 (需要手动更新 config.js)';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm(`确定要移除 "${slide.title}" 吗？\n注意：这只会从当前会话中移除，刷新后会恢复，除非您更新 config.js。`)) {
                deleteSlide(index);
            }
        };

        item.appendChild(content);
        item.appendChild(deleteBtn);
        
        item.onclick = () => loadSlide(index);
        slideListEl.appendChild(item);
    });
}

// Delete Slide
function deleteSlide(index) {
    if (!currentProject) return;
    
    const slide = currentProject.slides[index];
    
    // Remove from array
    currentProject.slides.splice(index, 1);
    
    // Delete file from disk
    try {
        if (fs && path) {
            const filePath = path.join(process.cwd(), slide.path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log('Deleted file:', filePath);
            }
        }
    } catch (err) {
        console.error('Error deleting file:', err);
        alert('Failed to delete file from disk: ' + err.message);
    }

    // Save config
    saveConfig();

    // Adjust index if needed
    if (currentSlideIndex >= currentProject.slides.length) {
        currentSlideIndex = Math.max(0, currentProject.slides.length - 1);
    }
    
    // Re-render
    renderSlideList();
    loadSlide(currentSlideIndex);
}

// Expose add function for generator
window.addSlideToProject = function(project, title, relPath) {
    if (!project) return;
    
    // Add to array
    project.slides.push({
        title: title,
        path: relPath
    });
    
    // Save config
    saveConfig();
    
    // If this is the current project, refresh list
    if (currentProject && currentProject.id === project.id) {
        renderSlideList();
        // Optionally switch to new slide
        loadSlide(project.slides.length - 1);
    }
};

// Create New Project Helper
window.createProject = function(name) {
    if (!projectsData) return null;
    
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString(36);
    const newProject = {
        id: id,
        name: name,
        description: `Created on ${new Date().toLocaleDateString()}`,
        slides: []
    };
    
    projectsData.projects.push(newProject);
    saveConfig();
    renderProjectList();
    window.updateGeneratorProjectList(projectsData.projects);
    
    return newProject;
}

// Load Slide
function loadSlide(index) {
    if (!currentProject || !currentProject.slides || currentProject.slides.length === 0) {
        slideFrame.src = 'about:blank';
        return;
    }
    if (index < 0 || index >= currentProject.slides.length) return;
    
    currentSlideIndex = index;
    const slide = currentProject.slides[index];
    
    slideFrame.src = slide.path;
    
    // Fix: Use absolute path for preview in packaged app
    if (path && process.cwd()) {
        try {
            const absPath = path.resolve(process.cwd(), slide.path);
            // Ensure we use file protocol
            slideFrame.src = 'file:///' + absPath.replace(/\\/g, '/');
        } catch (e) {
            console.warn('Failed to resolve absolute path for slide:', e);
            slideFrame.src = slide.path;
        }
    }

    // Auto-scale content to fit iframe
    slideFrame.onload = () => {
        setTimeout(adjustSlideScale, 50);
    };

    
    // Update UI
    document.querySelectorAll('.slide-item').forEach((el, i) => {
        el.classList.toggle('active', i === index);
    });
    
    // Scroll sidebar to active item
    const activeItem = document.querySelector('.slide-item.active');
    if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Update controls
    if (prevBtn) prevBtn.disabled = index === 0;
    if (nextBtn) nextBtn.disabled = index === currentProject.slides.length - 1;
    if (pageInfo) pageInfo.textContent = `${index + 1} / ${currentProject.slides.length}`;

    // Update Preview Controls
    if (previewPrevBtn) previewPrevBtn.disabled = index === 0;
    if (previewNextBtn) previewNextBtn.disabled = index === currentProject.slides.length - 1;
    if (previewPageInfo) previewPageInfo.textContent = `${index + 1} / ${currentProject.slides.length}`;

    updateUrl();
}

function updateUrl() {
    if (currentProject) {
        const url = new URL(window.location);
        url.searchParams.set('project', currentProject.id);
        url.searchParams.set('slide', currentSlideIndex);
        history.pushState(null, '', url);
    }
}

// Settings Logic
function initSettings() {
    // Load defaults
    if (settingApiKey) settingApiKey.value = localStorage.getItem('openai_api_key') || '';
    if (settingBaseUrl) settingBaseUrl.value = localStorage.getItem('openai_base_url') || 'https://api.openai.com/v1';
    if (settingSystemPrompt) settingSystemPrompt.value = localStorage.getItem('system_prompt') || ''; 

    // Load Model Settings
    const savedModel = localStorage.getItem('openai_model') || 'gemini-3-pro-preview';
    if (settingModelSelect) {
        const options = Array.from(settingModelSelect.options).map(o => o.value);
        let found = false;
        
        // Check if saved model matches a preset
        for (let opt of options) {
            if (opt === savedModel && opt !== 'custom') {
                settingModelSelect.value = savedModel;
                found = true;
                break;
            }
        }
        
        // If not found, it's a custom model
        if (!found) {
            settingModelSelect.value = 'custom';
            if (settingCustomModelInput) {
                settingCustomModelInput.classList.remove('hidden');
                settingCustomModelInput.value = savedModel;
            }
        } else {
            // If found, ensure custom input is hidden
            if (settingCustomModelInput) {
                settingCustomModelInput.classList.add('hidden');
                // Pre-fill custom input with last used custom name if available, for convenience
                settingCustomModelInput.value = localStorage.getItem('openai_custom_model_name') || '';
            }
        }

        // Change Event
        settingModelSelect.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                settingCustomModelInput.classList.remove('hidden');
            } else {
                settingCustomModelInput.classList.add('hidden');
            }
        });
    }
    
    // Test Connectivity
    if (settingTestConnectBtn) {
        settingTestConnectBtn.onclick = async () => {
            const apiKey = settingApiKey.value;
            const baseUrl = settingBaseUrl.value;
            let model = settingModelSelect.value;
            if (model === 'custom') {
                model = settingCustomModelInput.value;
            }

            if (!apiKey) {
                settingConnectStatus.textContent = '❌ 请先输入 API Key';
                settingConnectStatus.style.color = 'var(--danger-color, red)';
                settingConnectStatus.style.display = 'block';
                return;
            }

            settingTestConnectBtn.disabled = true;
            settingTestConnectBtn.textContent = '⏳ 测试中...';
            settingConnectStatus.style.display = 'none';

            try {
                const response = await fetch(`${baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: 'user', content: 'Hi' }],
                        max_tokens: 1
                    })
                });

                if (response.ok) {
                    settingConnectStatus.textContent = `✅ 连接成功! (Model: ${model})`;
                    settingConnectStatus.style.color = 'var(--success-color, green)';
                } else {
                    let errorMsg = '连接失败';
                    try {
                        const errorData = await response.json();
                        if (errorData.error && errorData.error.message) {
                            errorMsg += `: ${errorData.error.message}`;
                        } else {
                            errorMsg += `: Status ${response.status}`;
                        }
                    } catch (e) {
                        errorMsg += `: Status ${response.status}`;
                    }
                    settingConnectStatus.textContent = `❌ ${errorMsg}`;
                    settingConnectStatus.style.color = 'var(--danger-color, red)';
                }
            } catch (error) {
                settingConnectStatus.textContent = `❌ 网络错误: ${error.message}`;
                settingConnectStatus.style.color = 'var(--danger-color, red)';
            } finally {
                settingTestConnectBtn.disabled = false;
                settingTestConnectBtn.textContent = '🔌 测试连通性';
                settingConnectStatus.style.display = 'block';
            }
        };
    }
    
    if (saveSettingsBtn) {
        saveSettingsBtn.onclick = () => {
            const newKey = settingApiKey.value;
            const newUrl = settingBaseUrl.value;
            const newSystemPrompt = settingSystemPrompt.value;
            
            let newModel = settingModelSelect.value;
            if (newModel === 'custom') {
                newModel = settingCustomModelInput.value;
                localStorage.setItem('openai_custom_model_name', newModel);
            }

            localStorage.setItem('openai_api_key', newKey);
            localStorage.setItem('openai_base_url', newUrl);
            localStorage.setItem('openai_model', newModel);
            localStorage.setItem('system_prompt', newSystemPrompt);
            
            settingsStatus.textContent = '配置已保存！';
            setTimeout(() => { settingsStatus.textContent = ''; }, 2000);
            
            // Sync to Generator inputs
            const genKey = document.getElementById('apiKey');
            const genUrl = document.getElementById('baseUrl');
            const genSys = document.getElementById('systemPrompt');
            const genModel = document.getElementById('modelSelect');
            const genCustom = document.getElementById('customModelInput');
            
            if (genKey) { genKey.value = newKey; genKey.dispatchEvent(new Event('change')); }
            if (genUrl) { genUrl.value = newUrl; genUrl.dispatchEvent(new Event('change')); }
            if (genSys) { genSys.value = newSystemPrompt; genSys.dispatchEvent(new Event('change')); }
            
            if (genModel) {
                // Determine if newModel is in options
                const options = Array.from(genModel.options).map(o => o.value);
                let found = false;
                for (let opt of options) {
                    if (opt === newModel && opt !== 'custom') {
                        genModel.value = newModel;
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    genModel.value = 'custom';
                    if (genCustom) {
                        genCustom.classList.remove('hidden');
                        genCustom.value = newModel;
                    }
                } else {
                    if (genCustom) genCustom.classList.add('hidden');
                }
                genModel.dispatchEvent(new Event('change'));
                if (genCustom && !found) genCustom.dispatchEvent(new Event('input'));
            }
        };
    }
}

// Global Paste Support (Ctrl+V)
document.addEventListener('paste', (e) => {
    // If we are already in generator view, let generator.js handle it to avoid double-paste
    const genView = document.getElementById('view-generator');
    if (genView && genView.classList.contains('active')) return;

    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    let hasImage = false;
    let imageFile = null;

    for (let index in items) {
        const item = items[index];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
            imageFile = item.getAsFile();
            hasImage = true;
            break;
        }
    }

    if (hasImage && imageFile) {
        e.preventDefault();
        e.stopImmediatePropagation(); // Prevent generator.js from handling this same event after view switch
        
        // Switch to generator
        navigateTo('generator');
        
        // Populate input
        // Wait a tick for view transition if needed, though DOM is present
        setTimeout(() => {
            const imageInput = document.getElementById('imageInput'); // Correct ID from generator.js
            if (imageInput) {
                const container = new DataTransfer();
                container.items.add(imageFile);
                imageInput.files = container.files;
                
                // Trigger change event for preview/logic
                imageInput.dispatchEvent(new Event('change', { bubbles: true }));
                
                // Also trigger paste event on document so generator.js logic (preview) runs? 
                // generator.js listens to 'paste'. 
                // Actually generator.js has a paste listener on document.
                // But we returned early if generator view was active.
                // Now that we made it active, generator.js's listener might not catch THIS event because it's already past capture/bubble?
                // Or we need to manually trigger the preview logic.
                // generator.js paste listener handles: input.files = ..., statusMsg = ...
                
                // Let's just manually update status since we set files directly
                const statusMsg = document.getElementById('statusMsg');
                if (statusMsg) {
                    statusMsg.textContent = '已从剪贴板粘贴图片: ' + imageFile.name;
                    statusMsg.style.color = 'var(--success-color, green)';
                }
            }
        }, 100);
    }
});

// Event Listeners
if (openFolderBtn) {
    openFolderBtn.onclick = () => {
        if (!currentProject || !electron || !path) {
            console.warn('Cannot open folder: project or modules missing');
            return;
        }
        
        try {
            let targetPath = '';
            if (currentProject.slides && currentProject.slides.length > 0) {
                targetPath = path.resolve(process.cwd(), currentProject.slides[0].path);
            } else {
                targetPath = path.resolve(process.cwd(), 'slides', currentProject.id);
            }
            
            console.log('Opening folder for:', targetPath);
            
            if (fs.existsSync(targetPath)) {
                electron.shell.showItemInFolder(targetPath);
            } else {
                const parent = path.dirname(targetPath);
                if (fs.existsSync(parent)) {
                    electron.shell.openPath(parent);
                } else {
                    alert('Folder does not exist: ' + parent);
                }
            }
        } catch (e) {
            console.error('Error opening folder:', e);
        }
    };
}

// Setup nav buttons
if (prevBtn) prevBtn.onclick = () => loadSlide(currentSlideIndex - 1);
if (nextBtn) nextBtn.onclick = () => loadSlide(currentSlideIndex + 1);

if (previewPrevBtn) previewPrevBtn.onclick = () => loadSlide(currentSlideIndex - 1);
if (previewNextBtn) previewNextBtn.onclick = () => loadSlide(currentSlideIndex + 1);

// Initialize App
init();

// --- Slide Scaling Logic ---
function adjustSlideScale() {
    const slideFrame = document.getElementById('slide-frame');
    if (!slideFrame) return;

    try {
        const doc = slideFrame.contentDocument || slideFrame.contentWindow.document;
        if (!doc || !doc.body) return;

        const body = doc.body;
        const html = doc.documentElement;
        
        // Reset styles first to get natural dimensions
        body.style.transform = '';
        body.style.width = '';
        body.style.height = '';
        body.style.overflow = '';
        body.style.transformOrigin = '';

        // Get content dimensions
        const contentHeight = Math.max(body.scrollHeight, html.scrollHeight, body.offsetHeight, html.offsetHeight);
        const viewportHeight = html.clientHeight;
        
        // Threshold for scaling vs scrolling (e.g., if content is > 1.5x viewport, maybe just let it scroll?)
        // But for PPT, we usually want it to fit.
        // Let's stick to scaling but ensure min-height is respected.
        
        if (contentHeight > viewportHeight) {
            const scale = viewportHeight / contentHeight;
            
            // If scale is too small (e.g. < 0.5), it might be unreadable.
            // In that case, we might prefer scrolling.
            // But user specifically asked for "scaling to fit".
            
            body.style.transformOrigin = 'top center';
            body.style.transform = `scale(${scale})`;
            
            // Adjust width to compensate for scale
            body.style.width = `${100 / scale}%`;
            
            // Ensure height is also set so it takes up space correctly if needed
            // body.style.height = `${100 / scale}%`; // This might break things if content relies on auto height
            
            // Hide scrollbars on body, but maybe the iframe itself needs to handle it
            // body.style.overflow = 'hidden';
            // html.style.overflow = 'hidden';
            
            // Allow scrolling if needed, don't force hidden
            body.style.overflow = 'auto';
            html.style.overflow = 'auto';
        } else {
            // Content fits, ensure no scrollbars
            // body.style.overflow = 'hidden';
            // html.style.overflow = 'hidden';
            
            body.style.overflow = 'auto';
            html.style.overflow = 'auto';
        }
    } catch (e) {
        // Ignore cross-origin errors or if document is not ready
        console.warn('Auto-scaling failed:', e);
    }
}

// Global resize listener for scaling
window.addEventListener('resize', () => {
    // Debounce
    clearTimeout(window.resizeTimer);
    window.resizeTimer = setTimeout(adjustSlideScale, 100);
});

})();