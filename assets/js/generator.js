(function() {
    let fs, path, electron;
    
    function initNodeModules() {
        try {
            const req = typeof require !== 'undefined' ? require : (window.require || null);
            if (req) {
                fs = req('fs');
                path = req('path');
                try { electron = req('electron'); } catch(e) {}
                return true;
            }
        } catch (e) {
            console.warn('Node.js modules load failed', e);
        }
        return false;
    }

    initNodeModules();

class SlideGenerator {
    constructor() {
        this.config = {
            apiKey: localStorage.getItem('openai_api_key') || '',
            baseUrl: localStorage.getItem('openai_base_url') || 'https://api.openai.com/v1',
            model: localStorage.getItem('openai_model') || 'gemini-3-pro-preview',
            systemPrompt: localStorage.getItem('system_prompt') || this.getDefaultSystemPrompt()
        };
        
        this.initElements();
        this.bindEvents();
    }

    getDefaultSystemPrompt() {
        if (window.DEFAULT_SYSTEM_PROMPT) return window.DEFAULT_SYSTEM_PROMPT;
        
        return `你是一位擅长信息设计、PPT页面重构、学术汇报可视化与前端排版的资深设计师兼前端工程师。

我会给你一张 png 格式的页面草稿图。你的任务不是机械复刻，而是：
1. 先理解图片中想表达的核心信息、逻辑层级、模块关系与重点内容；
2. 对原图进行信息提取、结构重组与视觉优化；
3. 在保留原始表达意图的前提下，重新设计为一页更适合正式汇报、演示展示、PPT截图使用的高质量 HTML 页面。

你的输出目标：
- 生成一份完整的、可直接运行的单文件 HTML；
- 页面视觉风格应明显优于原始草稿，适合学术汇报、项目汇报或技术演示；
- 不要求像素级复刻原图，而是要“保留内容本质 + 全面优化版式与视觉表达”。

请严格遵循以下要求：

一、任务理解
- 先基于图片内容，识别页面主题、核心结论、信息模块、逻辑顺序、主次关系；
- 去除草稿中不必要的重复、拥挤、对齐混乱、视觉噪声；
- 若原图存在表达不清、层级不明、布局失衡、留白不合理、文字过密、元素大小不统一等问题，应主动优化；
- 如有必要，可对内容进行适度归纳、提炼和重命名，使其更符合汇报表达习惯。

二、设计目标
整体页面应满足以下风格：
- 简洁、专业、现代，有明显的高质量演示文稿气质；
- 适合 PPT 截图或直接嵌入汇报材料；
- 强调信息层级、逻辑引导与重点突出；
- 兼顾学术感、科技感与商业汇报中的清晰表达；
- 避免“网页后台”“普通文档”“低质量信息看板”的观感。

三、版式要求
- 页面按 16:9 比例设计，适合作为 PPT 单页内容区域展示；
- 建议使用中心化布局、卡片式容器、模块化分区、清晰网格系统；
- 标题、副标题、模块标题、正文、注释、标签之间要有明确层级；
- 各元素之间保持统一对齐关系、间距节奏与视觉秩序；
- 优先保证“第一页一眼看懂”的展示效果；
- 不要堆太多段落文字，尽量通过模块、短句、层级标题、关键词高亮、流程关系、对比结构等方式表达。

四、视觉风格要求
- 配色克制、统一，避免花哨；
- 可以采用浅色科技风、深色科技风、蓝灰学术风中的任一种，但整体需高级；
- 字体大小、字重、颜色对比要服务于信息层级；
- 图形元素应简洁，如卡片、圆角矩形、细分隔线、轻阴影、标签、流程箭头、编号、图标等；
- 可以适当加入几何装饰、渐变、弱化背景、局部强调色，但不能喧宾夺主；
- 不要出现低质量拟物、杂乱边框、过多艳丽颜色或密集图标堆砌。

五、内容重构原则
- 保留原图核心内容，但允许对文案进行适度精炼，使其更适合展示；
- 对明显重复、啰嗦或不适合上屏的内容进行压缩；
- 如果原图逻辑不够清楚，可以重组为更易理解的形式，例如：
  - 总分结构
  - 左文右图
  - 上结论下支撑
  - 流程图
  - 分层架构图
  - 模块对比图
  - 关键要点 + 视觉关系图
- 若图片中的关系是“并列、递进、因果、层级、流程、闭环、对比”，请用最适合汇报的结构表达出来。

六、HTML实现要求
- 输出完整 HTML 文件，包含 CSS；
- 不依赖外部前端框架；
- 优先使用纯 HTML + CSS 实现；
- 如需少量 JS，仅可用于极轻量展示，不要做复杂交互；
- 页面应在常见浏览器中直接打开；
- 所有内容放在一个 HTML 文件中；
- 代码结构清晰，便于后续我继续修改；
- 尽量保证截图时视觉稳定，不依赖滚动，不要做过长页面；
- 默认页面尺寸适合演示稿单页展示。

七、输出要求
请按以下要求输出：

- 完整 HTML 代码。

八、特别注意
- 重点是“提取信息后重新设计”，不是简单临摹；
- 你的设计需要比原草稿更适合做 PPT 汇报页；
- 若原图内容较粗糙，请主动提升其专业表达质量；
- 页面最终效果要像“精心设计过的演示文稿页面”，而不是普通网页；
- 除非图片中有明确英文术语，否则优先使用中文表达；
- 保证视觉上紧凑但不拥挤，信息丰富但不杂乱。

接下来我会上传 png 草稿，请你开始分析并输出优化后的 HTML。`;
    }

    initElements() {
        this.apiKeyInput = document.getElementById('apiKey');
        this.baseUrlInput = document.getElementById('baseUrl');
        this.systemPromptInput = document.getElementById('systemPrompt');
        this.userPromptInput = document.getElementById('userPrompt');
        this.imageInput = document.getElementById('imageInput');
        this.previewFrame = document.getElementById('previewFrame');
        this.generateBtn = document.getElementById('generateBtn');
        this.saveBtn = document.getElementById('saveBtn');
        this.openInBrowserBtn = document.getElementById('openInBrowserBtn');
        this.statusMsg = document.getElementById('statusMsg');
        this.fileNameInput = document.getElementById('fileName');
        this.genLoader = document.getElementById('gen-loader');
        this.saveProjectSelect = document.getElementById('saveProjectSelect');
        this.newProjectName = document.getElementById('newProjectName');
        
        // Image Preview Elements
        this.imagePreviewContainer = document.getElementById('imagePreview');
        this.imagePreviewImg = this.imagePreviewContainer ? this.imagePreviewContainer.querySelector('img') : null;
        this.clearImageBtn = document.getElementById('clearImageBtn');

        // Model Selection Elements
        this.modelSelect = document.getElementById('modelSelect');
        this.customModelInput = document.getElementById('customModelInput');
        this.testConnectBtn = document.getElementById('testConnectBtn');
        this.connectStatus = document.getElementById('connectStatus');

        if (!this.generateBtn) {
            console.error('Critical elements missing: generateBtn');
            return;
        }

        // Load saved config
        if (this.apiKeyInput) this.apiKeyInput.value = this.config.apiKey;
        if (this.baseUrlInput) this.baseUrlInput.value = this.config.baseUrl;
        if (this.systemPromptInput) this.systemPromptInput.value = this.config.systemPrompt;
        
        // Load model config
        if (this.modelSelect) {
            const savedModel = this.config.model;
            // Check if saved model is one of the options
            const options = Array.from(this.modelSelect.options).map(opt => opt.value);
            if (options.includes(savedModel)) {
                this.modelSelect.value = savedModel;
                if (savedModel === 'custom') {
                    if (this.customModelInput) {
                        this.customModelInput.classList.remove('hidden');
                        this.customModelInput.value = localStorage.getItem('openai_custom_model_name') || '';
                    }
                }
            } else {
                // Assuming it's a custom model from previous session or default
                // But since we store the actual model string in config.model, we need to handle "custom" logic
                // If the stored string is NOT in options, it must be a custom model name?
                // Wait, logic:
                // If savedModel is in options list (except 'custom'), select it.
                // If savedModel is 'custom', select 'custom' and show input.
                // If savedModel is something else (actual custom name), select 'custom' and set input value.
                
                let found = false;
                for (let opt of options) {
                    if (opt === savedModel && opt !== 'custom') {
                        this.modelSelect.value = savedModel;
                        found = true;
                        break;
                    }
                }
                
                if (!found) {
                    this.modelSelect.value = 'custom';
                    if (this.customModelInput) {
                        this.customModelInput.classList.remove('hidden');
                        this.customModelInput.value = savedModel;
                    }
                }
            }
        }
    }

    bindEvents() {
        if (this.generateBtn) {
            this.generateBtn.addEventListener('click', () => {
                console.log('Generate button clicked');
                this.generateSlide();
            });
        }
        
        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => this.saveSlide());
        }

        if (this.openInBrowserBtn) {
            this.openInBrowserBtn.addEventListener('click', () => this.openInBrowser());
        }
        
        // Save config on change
        if (this.apiKeyInput) {
            this.apiKeyInput.addEventListener('change', (e) => {
                localStorage.setItem('openai_api_key', e.target.value);
                this.config.apiKey = e.target.value;
            });
        }
        if (this.baseUrlInput) {
            this.baseUrlInput.addEventListener('change', (e) => {
                localStorage.setItem('openai_base_url', e.target.value);
                this.config.baseUrl = e.target.value;
            });
        }
        if (this.systemPromptInput) {
            this.systemPromptInput.addEventListener('change', (e) => {
                localStorage.setItem('system_prompt', e.target.value);
                this.config.systemPrompt = e.target.value;
            });
        }
        
        // Model Selection Change
        if (this.modelSelect) {
            this.modelSelect.addEventListener('change', (e) => {
                const value = e.target.value;
                if (value === 'custom') {
                    this.customModelInput.classList.remove('hidden');
                    this.customModelInput.focus();
                    // Don't update config.model yet, wait for input
                    // Or set it to whatever is in the input
                    this.config.model = this.customModelInput.value;
                } else {
                    this.customModelInput.classList.add('hidden');
                    this.config.model = value;
                    localStorage.setItem('openai_model', value);
                }
            });
        }

        // Custom Model Input Change
        if (this.customModelInput) {
            this.customModelInput.addEventListener('input', (e) => {
                const value = e.target.value;
                this.config.model = value;
                localStorage.setItem('openai_model', value);
                localStorage.setItem('openai_custom_model_name', value);
            });
        }

        // Test Connectivity
        if (this.testConnectBtn) {
            this.testConnectBtn.addEventListener('click', () => {
                this.testConnectivity();
            });
        }
        
        // Image Input Change
        if (this.imageInput) {
            this.imageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.showImagePreview(file);
                } else {
                    this.hideImagePreview();
                }
            });
        }

        // Clear Image Button
        if (this.clearImageBtn) {
            this.clearImageBtn.addEventListener('click', () => {
                this.imageInput.value = '';
                this.hideImagePreview();
            });
        }

        // Project Select Logic
        if (this.saveProjectSelect) {
            this.saveProjectSelect.addEventListener('change', (e) => {
                if (e.target.value === 'new_project') {
                    this.newProjectName.classList.remove('hidden');
                    this.newProjectName.focus();
                } else {
                    this.newProjectName.classList.add('hidden');
                }
            });
        }

        // Paste Image Support
        document.addEventListener('paste', (e) => {
            const genView = document.getElementById('view-generator');
            if (!genView || !genView.classList.contains('active')) return;

            const items = (e.clipboardData || e.originalEvent.clipboardData).items;
            for (let index in items) {
                const item = items[index];
                if (item.kind === 'file' && item.type.startsWith('image/')) {
                    const blob = item.getAsFile();
                    const container = new DataTransfer();
                    container.items.add(blob);
                    this.imageInput.files = container.files;
                    
                    this.statusMsg.textContent = '已粘贴图片: ' + blob.name;
                    this.statusMsg.className = 'status-success';
                    
                    this.showImagePreview(blob);
                    break;
                }
            }
        });
        
        // Suggest filename on load or project switch
        this.suggestFilename();
    }

    showImagePreview(file) {
        if (this.imagePreviewContainer && this.imagePreviewImg) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.imagePreviewImg.src = e.target.result;
                this.imagePreviewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    }

    hideImagePreview() {
        if (this.imagePreviewContainer) {
            this.imagePreviewContainer.style.display = 'none';
            if (this.imagePreviewImg) this.imagePreviewImg.src = '';
        }
    }

    suggestFilename() {
        if (this.fileNameInput) {
            const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
            const uuid = Math.random().toString(36).substring(2, 10);
            this.fileNameInput.value = `${timestamp}_${uuid}.html`;
        }
    }

    async openInBrowser() {
        if (!this.currentHtml) return;

        try {
            if (electron && electron.shell) {
                // If saved, open the saved file. If not, save to temp.
                // We don't track saved path yet, so let's just write to temp to be safe and fast.
                if (fs && path) {
                    const tempDir = require('os').tmpdir();
                    const tempFile = path.join(tempDir, `preview_${Date.now()}.html`);
                    fs.writeFileSync(tempFile, this.currentHtml, 'utf8');
                    electron.shell.openPath(tempFile);
                }
            } else {
                // Browser fallback
                const blob = new Blob([this.currentHtml], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
            }
        } catch (e) {
            console.error('Failed to open in browser', e);
            this.statusMsg.textContent = '无法在浏览器打开: ' + e.message;
        }
    }

    async testConnectivity() {
        if (!this.testConnectBtn || !this.connectStatus) return;

        const apiKey = this.config.apiKey;
        const baseUrl = this.config.baseUrl;
        const model = this.config.model;

        if (!apiKey) {
            this.connectStatus.textContent = '❌ 请先输入 API Key';
            this.connectStatus.style.color = 'var(--error-color, red)';
            this.connectStatus.style.display = 'block';
            return;
        }

        this.testConnectBtn.disabled = true;
        this.testConnectBtn.textContent = '⏳ 测试中...';
        this.connectStatus.style.display = 'none';

        try {
            // Simple request to list models or chat completion with max_tokens=1
            // Some providers don't support /models, so let's try a very cheap chat completion
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
                this.connectStatus.textContent = `✅ 连接成功! (Model: ${model})`;
                this.connectStatus.style.color = 'var(--success-color, green)';
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
                this.connectStatus.textContent = `❌ ${errorMsg}`;
                this.connectStatus.style.color = 'var(--error-color, red)';
            }
        } catch (error) {
            this.connectStatus.textContent = `❌ 网络错误: ${error.message}`;
            this.connectStatus.style.color = 'var(--error-color, red)';
        } finally {
            this.testConnectBtn.disabled = false;
            this.testConnectBtn.textContent = '🔌 测试连通性';
            this.connectStatus.style.display = 'block';
        }
    }

    async generateSlide() {
        const apiKey = this.apiKeyInput.value.trim();
        const userPrompt = this.userPromptInput.value.trim();
        const imageFile = this.imageInput.files[0];

        if (!apiKey) {
            alert('请输入 API Key');
            return;
        }

        if (!userPrompt && !imageFile) {
            alert('请输入画面描述词或上传图片');
            return;
        }

        this.setLoading(true);
        this.statusMsg.textContent = '正在生成...';
        this.saveBtn.disabled = true;
        if (this.openInBrowserBtn) this.openInBrowserBtn.disabled = true;

        try {
            const messages = [
                { role: "system", content: this.config.systemPrompt }
            ];

            const userContent = [];
            
            // Image comes first if present (optional but good practice)
            if (imageFile) {
                const base64Image = await this.toBase64(imageFile);
                userContent.push({
                    type: "image_url",
                    image_url: { url: base64Image }
                });
            }
            
            // User prompt is optional now, but if present, add it
            if (userPrompt) {
                userContent.push({ type: "text", text: userPrompt });
            }

            messages.push({ role: "user", content: userContent });

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 300000); // 300s timeout

            try {
                const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: this.config.model,
                        messages: messages,
                        temperature: 0.7
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error?.message || 'API 请求失败');
                }
    
                const data = await response.json();
                const content = data.choices[0].message.content;
                
                const html = this.extractHtml(content);
                this.currentHtml = html;
                
                this.updatePreview(html);
                this.statusMsg.textContent = '生成成功！';
                this.saveBtn.disabled = false;
                if (this.openInBrowserBtn) this.openInBrowserBtn.disabled = false;
                
                // Automatic save
                await this.saveSlide();
            } catch (error) {
                if (error.name === 'AbortError') {
                    throw new Error('请求超时 (300s)，请重试或检查网络连接。');
                }
                throw error;
            } finally {
                clearTimeout(timeoutId);
            }

        } catch (error) {
            console.error(error);
            this.statusMsg.textContent = `错误: ${error.message}`;
        } finally {
            this.setLoading(false);
        }
    }

    extractHtml(content) {
        // Robust extraction of HTML from Markdown code blocks
        const codeBlockRegex = /```html([\s\S]*?)```/i;
        const match = content.match(codeBlockRegex);
        
        if (match && match[1]) {
            return match[1].trim();
        }
        
        // Fallback: look for <html> tags
        const htmlTagRegex = /<html[\s\S]*<\/html>/i;
        const htmlMatch = content.match(htmlTagRegex);
        
        if (htmlMatch) {
            return htmlMatch[0];
        }

        // Fallback: return raw content if it looks like HTML
        if (content.trim().startsWith('<') && content.includes('</div>')) {
            return content.trim();
        }

        return content; // Return raw content if extraction fails (user might see raw markdown)
    }

    updatePreview(html) {
        // Use Data URI for more robust local preview (avoids blob origin issues in some Electron setups)
        // Encode only special characters to keep URL clean, but base64 is safer for complex content
        try {
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            this.previewFrame.src = url;
        } catch (e) {
            console.warn('Blob URL failed, falling back to Data URI', e);
            this.previewFrame.src = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
        }
    }

    async saveSlide() {
        if (!this.currentHtml) return;

        let fileName = (this.fileNameInput.value || 'new_slide.html').trim();
        if (!fileName.endsWith('.html')) fileName += '.html';

        // Check for fs again if not available
        if (!fs) initNodeModules();

        // Check if we can save to project using Node.js fs
        if (fs && path) {
             try {
                // Determine Target Project
                let targetProject = window.currentProject;
                
                if (this.saveProjectSelect) {
                    const selectedVal = this.saveProjectSelect.value;
                    if (selectedVal === 'new_project') {
                        const newName = this.newProjectName.value.trim();
                        if (!newName) {
                            alert('请输入新项目名称');
                            return;
                        }
                        if (window.createProject) {
                            targetProject = window.createProject(newName);
                        } else {
                            throw new Error('Create project function not available');
                        }
                    } else if (selectedVal) {
                        // Find existing project from appConfig/projectsData
                        if (window.appConfig && window.appConfig.projects) {
                            targetProject = window.appConfig.projects.find(p => p.id === selectedVal);
                        }
                    }
                }

                if (targetProject) {
                    // Save to project directory
                    let projectDir = `slides/${targetProject.id}`;
                    if (targetProject.slides && targetProject.slides.length > 0) {
                         // Try to infer directory from existing slides
                         const firstSlidePath = targetProject.slides[0].path;
                         const dir = path.dirname(firstSlidePath);
                         if (dir && dir !== '.') projectDir = dir;
                    }
                    
                    const fullDir = path.join(process.cwd(), projectDir);
                    if (!fs.existsSync(fullDir)) {
                        fs.mkdirSync(fullDir, { recursive: true });
                    }
                    
                    const fullPath = path.join(fullDir, fileName);
                    fs.writeFileSync(fullPath, this.currentHtml, 'utf8');
                    
                    // Add to project
                    // Calculate relative path for storage
                    let relPath = path.relative(process.cwd(), fullPath);
                    relPath = relPath.split(path.sep).join('/'); // Normalize to forward slashes
                    
                    if (window.addSlideToProject) {
                        // Extract title from HTML or use filename
                        let title = fileName.replace('.html', '');
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(this.currentHtml, 'text/html');
                        const h1 = doc.querySelector('.main-title') || doc.querySelector('h1') || doc.querySelector('title');
                        if (h1 && h1.textContent.trim()) title = h1.textContent.trim();
                        
                        window.addSlideToProject(targetProject, title, relPath);
                        this.statusMsg.textContent = `已保存到项目: ${targetProject.name}`;
                    } else {
                         this.statusMsg.textContent = '文件已保存';
                    }
                    return; // Successfully saved to project
                } else {
                     this.statusMsg.textContent = '未选择项目，无法自动保存';
                     return; 
                }
            } catch (err) {
                console.error('Save failed', err);
                this.statusMsg.textContent = `保存失败: ${err.message}`;
                return;
            }
        } else {
            this.statusMsg.textContent = '保存失败: 无法访问本地文件系统 (非 Electron 环境?)';
            console.warn('File system access not available, and browser fallback is disabled.');
        }

        /* Fallback disabled as per user request
        // Fallback: Browser mode (File System Access API or Download)
        if (window.showSaveFilePicker) {
            // ...
        } else {
            // ...
        }
        */
    }

    updateProjectList(projects) {
        if (!this.saveProjectSelect) return;
        
        this.saveProjectSelect.innerHTML = '';
        
        if (!projects || projects.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = '无项目';
            this.saveProjectSelect.appendChild(opt);
        } else {
            projects.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.name;
                // Auto select current project
                if (window.currentProject && window.currentProject.id === p.id) {
                    opt.selected = true;
                }
                this.saveProjectSelect.appendChild(opt);
            });
        }
        
        // Add "New Project" option
        const newOpt = document.createElement('option');
        newOpt.value = 'new_project';
        newOpt.textContent = '+ 新建项目...';
        this.saveProjectSelect.appendChild(newOpt);
    }

    setLoading(isLoading) {
        this.generateBtn.disabled = isLoading;
        if (isLoading) {
            this.generateBtn.classList.add('btn-loading');
            if (this.genLoader) this.genLoader.classList.remove('hidden');
        } else {
            this.generateBtn.classList.remove('btn-loading');
            if (this.genLoader) this.genLoader.classList.add('hidden');
        }
    }

    toBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_WIDTH = 1024;
                    const MAX_HEIGHT = 1024;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL(file.type));
                };
                img.onerror = (error) => reject(error);
            };
            reader.onerror = error => reject(error);
        });
    }
}

// Instantiate
window.slideGenerator = new SlideGenerator();

})();
