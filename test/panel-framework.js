// ==UserScript==
// @name         WorkFlowy Forwarder Plus - Panel Framework
// @namespace    http://tampermonkey.net/
// @version      0.0.4
// @description  Basic panel framework for WorkFlowy Forwarder Plus
// @author       Namkit
// @match        https://workflowy.com/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // 默认配置
    const DEFAULT_CONFIG = {
        version: '0.0.4',
        theme: 'dark',
        refreshInterval: 60000,
        dailyPlanner: {
            enabled: false,
            taskName: '',
            nodeId: ''
        },
        target: {
            work: {
                enabled: false,
                taskName: '',
                nodeId: '',
                tag: ''
            },
            personal: {
                enabled: false,
                taskName: '',
                nodeId: '',
                tag: ''
            },
            temp: {
                enabled: false,
                taskName: '',
                nodeId: '',
                tag: ''
            }
        },
        collector: {
            enabled: false,
            taskName: '',
            nodeId: '',
            tags: '',
            autoComplete: true,
            copyFormat: 'plain'
        }
    };

    // 配置管理
    const ConfigManager = {
        // 获取完整配置
        getConfig() {
            try {
                const saved = localStorage.getItem('wf_config');
                return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
            } catch (error) {
                console.error('读取配置失败:', error);
                return DEFAULT_CONFIG;
            }
        },

        // 保存配置
        saveConfig(config) {
            try {
                localStorage.setItem('wf_config', JSON.stringify(config));
                return true;
            } catch (error) {
                console.error('保存配置失败:', error);
                return false;
            }
        },

        // 重置配置
        resetConfig() {
            try {
                localStorage.setItem('wf_config', JSON.stringify(DEFAULT_CONFIG));
                return true;
            } catch (error) {
                console.error('重置配置失败:', error);
                return false;
            }
        },

        // 验证配置项
        validateConfig(config) {
            const errors = [];

            // 验证节点ID
            const validateNodeId = (id, name) => {
                if (id && !/^[0-9a-f]{12}$/.test(id)) {
                    errors.push(`${name}的节点ID格式不正确`);
                }
            };

            // 验证标签
            const validateTags = (tags, name) => {
                if (tags && !/^[#\w\s,]+$/.test(tags)) {
                    errors.push(`${name}的标签格式不正确`);
                }
            };

            // 验证 DailyPlanner
            if (config.dailyPlanner.enabled) {
                validateNodeId(config.dailyPlanner.nodeId, 'DailyPlanner');
            }

            // 验证 Target
            Object.entries(config.target).forEach(([key, value]) => {
                if (value.enabled) {
                    validateNodeId(value.nodeId, `Target-${key}`);
                    validateTags(value.tag, `Target-${key}`);
                }
            });

            // 验证 Collector
            if (config.collector.enabled) {
                validateNodeId(config.collector.nodeId, 'Collector');
                validateTags(config.collector.tags, 'Collector');
            }

            return errors;
        }
    };

    // 添加基础样式
    GM_addStyle(`
        /* 面板基础样式 */
        .wf-panel {
            position: fixed;
            right: -320px;
            top: 46px;
            height: calc(100vh - 46px);
            width: 320px;
            background: var(--bg-color, #2B3135);
            border-left: 1px solid var(--border-color, #5c6062);
            z-index: 100;
            transition: transform 0.3s ease;
            display: flex;
            flex-direction: column;
        }

        .wf-panel.visible {
            transform: translateX(-320px);
        }

        .wf-panel.visible ~ #content {
            padding-right: 320px;
        }

        #content {
            transition: padding-right 0.3s ease;
        }

        /* 切换按钮样式 */
        .wf-toggle {
            position: fixed;
            right: 20px;
            top: 60px;
            background: var(--bg-color, #2B3135);
            border: none;
            padding: 8px;
            cursor: pointer;
            z-index: 101;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        }

        .wf-toggle:hover {
            background: var(--hover-bg, #363b3f);
        }

        .wf-toggle.active .toggle-arrow {
            transform: rotate(180deg);
        }

        .toggle-arrow {
            width: 20px;
            height: 20px;
            color: var(--text-secondary, #9EA1A2);
            transition: transform 0.3s ease;
            opacity: 0.8;
        }

        .wf-toggle:hover .toggle-arrow {
            opacity: 1;
        }

        /* 主题变量 */
        :root[data-theme="dark"] {
            --bg-color: #2B3135;
            --border-color: #5c6062;
            --text-color: #d9dbdb;
            --text-secondary: #9ea1a2;
            --hover-bg: #363b3f;
        }

        :root[data-theme="light"] {
            --bg-color: #ffffff;
            --border-color: #e0e0e0;
            --text-color: #333333;
            --text-secondary: #666666;
            --hover-bg: #f5f5f5;
        }

        /* 设置面板内容样式 */
        .config-header {
            padding: 24px 12px 12px;
            border-bottom: 1px solid var(--border-color);
        }

        .config-header h2 {
            margin: 0;
            font-size: 18px;
            color: var(--text-color);
            font-weight: 500;
        }

        .header-actions {
            margin-top: 12px;
        }

        .theme-toggle {
            background: none;
            border: 1px solid var(--border-color);
            color: var(--text-color);
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .version-tag {
            font-size: 8px;
            color: var(--text-secondary);
            margin-left: 8px;
            padding: 0px 2px;
            background: var(--bg-color);
            border-radius: 4px;
            border: 1px solid var(--border-color);
        }

        /* 模式切换按钮组样式 */
        .mode-switch {
            display: flex;
            background: rgba(39, 45, 50, 1);
            border-radius: 6px;
            padding: 6px;
            margin: 16px 12px;
        }

        .mode-btn {
            flex: 1;
            padding: 6px 10px;
            border: none;
            background: transparent;
            color: var(--text-secondary);
            cursor: pointer;
            border-radius: 4px;
            transition: all 0.3s;
            font-size: 14px;
            margin: 2px;
        }

        .mode-btn.active {
            background: rgba(56, 70, 81, 1);
            color: var(--text-color);
        }

        .mode-btn:hover {
            background: var(--hover-bg);
            color: var(--text-color);
        }

        /* 配置按钮样式 */
        .config-trigger {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 16px;
            border-top: 1px solid var(--border-color);
            background: var(--bg-color);
        }

        .config-trigger-btn {
            width: 100%;
            padding: 12px;
            background: var(--bg-color);
            border: 1px solid var(--border-color);
            color: var(--text-color);
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.2s ease;
        }

        .config-trigger-btn:hover {
            background: var(--hover-bg);
        }

        /* 配置面板样式 */
        .config-panel {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--bg-color);
            z-index: 200;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.2s ease;
            display: flex;
            flex-direction: column;
        }

        .config-panel.visible {
            opacity: 1;
            visibility: visible;
        }

        .config-panel-header {
            padding: 16px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .config-panel-title {
            font-size: 16px;
            color: var(--text-color);
            margin: 0;
        }

        .config-panel-close {
            background: none;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            font-size: 20px;
            padding: 4px;
        }

        .config-panel-content {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
        }

        /* 配置组样式优化 */
        .config-group {
            margin-bottom: 16px;
            padding: 16px;
            background: var(--section-bg);
            border-radius: 6px;
            border: 1px solid var(--border-color);
        }

        .group-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
        }

        .task-name-input {
            flex: 1;
            padding: 8px 12px;
            background: var(--input-bg);
            border: 1px solid var(--input-border);
            border-radius: 4px;
            color: var(--text-color);
            font-size: 14px;
        }

        .config-item {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
        }

        .config-item label {
            min-width: 80px;
            color: var(--text-secondary);
        }

        .config-item input {
            flex: 1;
            padding: 8px 12px;
            background: var(--input-bg);
            border: 1px solid var(--input-border);
            border-radius: 4px;
            color: var(--text-color);
            font-size: 14px;
        }

        .config-buttons {
            padding: 16px;
            border-top: 1px solid var(--border-color);
            background: var(--bg-color);
        }

        .config-btn {
            width: 100%;
            padding: 12px;
            margin-bottom: 8px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s ease;
        }

        .config-save {
            background: var(--btn-bg);
            color: var(--btn-text);
        }

        .config-reset {
            background: var(--input-bg);
            color: var(--text-color);
            border: 1px solid var(--border-color);
        }

        /* 复选框样式 */
        input[type="checkbox"] {
            width: 16px;
            height: 16px;
            margin: 0;
            cursor: pointer;
        }

        /* 复选框标签样式 */
        .checkbox-label {
            margin-left: 8px;
            color: var(--text-secondary);
            font-size: 14px;
        }

        /* 下拉选择框样式 */
        .config-select {
            flex: 1;
            padding: 8px 12px;
            background: var(--input-bg);
            border: 1px solid var(--input-border);
            border-radius: 4px;
            color: var(--text-color);
            font-size: 14px;
            cursor: pointer;
        }

        .config-select option {
            background: var(--bg-color);
            color: var(--text-color);
        }
    `);

    // 面板切换函数
    function togglePanel() {
        const panel = document.querySelector('.wf-panel');
        const toggleBtn = document.querySelector('.wf-toggle');
        
        if (panel && toggleBtn) {
            panel.classList.toggle('visible');
            toggleBtn.classList.toggle('active');
        }
    }

    // 主题切换函数
    function toggleTheme() {
        const html = document.documentElement;
        const themeIcon = document.querySelector('.theme-icon');
        const currentTheme = html.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        html.setAttribute('data-theme', newTheme);
        themeIcon.textContent = newTheme === 'dark' ? '🌙' : '☀️';
        
        localStorage.setItem('wf_theme', newTheme);
    }

    // 初始化主题
    function initTheme() {
        const savedTheme = localStorage.getItem('wf_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    function handleKeyPress(event) {
        if (event.ctrlKey && event.key === '/') {
            setTimeout(() => {
                togglePanel();
            }, 50);
        }
    }

    function initPanel() {
        const panel = document.createElement('div');
        panel.className = 'wf-panel';
        
        panel.innerHTML = `
            <div class="config-header">
                <h2>
                    Workflowy<br/>
                    Forwarder Plus
                    <span class="version-tag">v0.0.4</span>
                </h2>
            </div>

            <div class="mode-switch">
                <button class="mode-btn active" id="mode-daily">DailyPlanner</button>
                <button class="mode-btn" id="mode-target">Target</button>
                <button class="mode-btn" id="mode-collect">Collector</button>
            </div>

            <!-- 配置按钮 -->
            <div class="config-trigger">
                <button class="config-trigger-btn">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6.5 1L7.5 0H8.5L9.5 1L10.5 1.5L11.5 1L12.5 1.5L13 2.5L14 3.5L14.5 4.5L15 5.5V6.5L14 7.5V8.5L15 9.5V10.5L14.5 11.5L14 12.5L13 13.5L12.5 14.5L11.5 15L10.5 14.5L9.5 15H8.5L7.5 16H6.5L5.5 15L4.5 14.5L3.5 15L2.5 14.5L2 13.5L1 12.5L0.5 11.5L0 10.5V9.5L1 8.5V7.5L0 6.5V5.5L0.5 4.5L1 3.5L2 2.5L2.5 1.5L3.5 1L4.5 1.5L5.5 1H6.5Z" fill="currentColor"/>
                        <circle cx="8" cy="8" r="2" fill="var(--bg-color)"/>
                    </svg>
                    设置
                </button>
            </div>

            <!-- 配置面板 -->
            <div class="config-panel">
                <div class="config-panel-header">
                    <h3 class="config-panel-title">设置</h3>
                    <button class="config-panel-close">×</button>
                </div>
                <div class="config-panel-content">
                    <!-- DailyPlanner 设置 -->
                    <div class="config-section">
                        <div class="section-header">
                            <h3>DailyPlanner 设置</h3>
                        </div>
                        <div class="config-group">
                            <div class="group-header">
                                <input type="checkbox" id="enable-daily">
                                <input type="text" class="task-name-input" id="task-daily" placeholder="输入任务名称">
                            </div>
                            <div class="group-content">
                                <div class="config-item">
                                    <label>节点ID</label>
                                    <input type="text" id="node-daily" placeholder="输入节点ID">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Target 设置 -->
                    <div class="config-section">
                        <div class="section-header">
                            <h3>Target 设置</h3>
                        </div>
                        <!-- 工作任务 -->
                        <div class="config-group">
                            <div class="group-header">
                                <input type="checkbox" id="enable-work">
                                <input type="text" class="task-name-input" id="task-work" placeholder="输入任务名称">
                            </div>
                            <div class="group-content">
                                <div class="config-item">
                                    <label>节点ID</label>
                                    <input type="text" id="node-work" placeholder="输入节点ID">
                                </div>
                                <div class="config-item">
                                    <label>标签</label>
                                    <input type="text" id="tag-work" placeholder="输入标签">
                                </div>
                            </div>
                        </div>

                        <!-- 个人任务 -->
                        <div class="config-group">
                            <div class="group-header">
                                <input type="checkbox" id="enable-personal">
                                <input type="text" class="task-name-input" id="task-personal" placeholder="输入任务名称">
                            </div>
                            <div class="group-content">
                                <div class="config-item">
                                    <label>节点ID</label>
                                    <input type="text" id="node-personal" placeholder="输入节点ID">
                                </div>
                                <div class="config-item">
                                    <label>标签</label>
                                    <input type="text" id="tag-personal" placeholder="输入标签">
                                </div>
                            </div>
                        </div>

                        <!-- 临时任务 -->
                        <div class="config-group">
                            <div class="group-header">
                                <input type="checkbox" id="enable-temp">
                                <input type="text" class="task-name-input" id="task-temp" placeholder="输入任务名称">
                            </div>
                            <div class="group-content">
                                <div class="config-item">
                                    <label>节点ID</label>
                                    <input type="text" id="node-temp" placeholder="输入节点ID">
                                </div>
                                <div class="config-item">
                                    <label>标签</label>
                                    <input type="text" id="tag-temp" placeholder="输入标签">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Collector 设置 -->
                    <div class="config-section">
                        <div class="section-header">
                            <h3>Collector 设置</h3>
                        </div>
                        <div class="config-group">
                            <div class="group-header">
                                <input type="checkbox" id="enable-collector">
                                <input type="text" class="task-name-input" id="task-collector" placeholder="输入任务名称">
                            </div>
                            <div class="group-content">
                                <div class="config-item">
                                    <label>节点ID</label>
                                    <input type="text" id="node-collector" placeholder="输入节点ID">
                                </div>
                                <div class="config-item">
                                    <label>标签</label>
                                    <input type="text" id="tag-collector" placeholder="输入标签，多个用逗号分隔">
                                </div>
                                <div class="config-item">
                                    <label>自动完成</label>
                                    <input type="checkbox" id="auto-complete-collector">
                                    <span class="checkbox-label">复制内容后自动标记完成</span>
                                </div>
                                <div class="config-item">
                                    <label>复制格式</label>
                                    <select id="copy-format-collector" class="config-select">
                                        <option value="plain">纯文本</option>
                                        <option value="markdown">Markdown</option>
                                        <option value="opml">OPML</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 基本设置 -->
                    <div class="config-section">
                        <div class="section-header">
                            <h3>基本设置</h3>
                        </div>
                        <div class="config-group">
                            <div class="config-item">
                                <label>主题</label>
                                <button class="theme-toggle">
                                    <i class="theme-icon">🌙</i>
                                    <span class="theme-text">切换主题</span>
                                </button>
                            </div>
                            <div class="config-item">
                                <label>刷新间隔</label>
                                <input type="number" id="refresh-interval" placeholder="毫秒">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="config-buttons">
                    <button class="config-btn config-save">保存设置</button>
                    <button class="config-btn config-reset">重置设���</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);

        // 创建切换按钮
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'wf-toggle';
        toggleBtn.innerHTML = `
            <svg class="toggle-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 18l-6-6 6-6"/>
            </svg>
        `;
        document.body.appendChild(toggleBtn);

        // 添加事件监听
        toggleBtn.onclick = togglePanel;
        document.addEventListener('keydown', handleKeyPress, false);
        
        const themeToggle = panel.querySelector('.theme-toggle');
        themeToggle.addEventListener('click', toggleTheme);

        // 初始化主题
        initTheme();

        // 添加模式切换事件处理
        const modeButtons = panel.querySelectorAll('.mode-btn');
        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // 移除所有按钮的 active 状态
                modeButtons.forEach(b => b.classList.remove('active'));
                // 添加当前按钮的 active 状态
                btn.classList.add('active');
                // 保存当前模式
                const mode = btn.id.replace('mode-', '');
                localStorage.setItem('wf_current_mode', mode);
                // TODO: 切换模式后的其他处理
            });
        });

        // 恢复上次选择的模式
        const savedMode = localStorage.getItem('wf_current_mode') || 'daily';
        const savedModeBtn = panel.querySelector(`#mode-${savedMode}`);
        if (savedModeBtn) {
            savedModeBtn.click();
        }

        // 添加配置面板事件处理
        const configTrigger = panel.querySelector('.config-trigger-btn');
        const configPanel = panel.querySelector('.config-panel');
        const configClose = panel.querySelector('.config-panel-close');

        configTrigger.addEventListener('click', () => {
            configPanel.classList.add('visible');
        });

        configClose.addEventListener('click', () => {
            configPanel.classList.remove('visible');
        });

        // 加载配置
        function loadConfig() {
            const config = ConfigManager.getConfig();
            
            // 设置主题
            document.documentElement.setAttribute('data-theme', config.theme);
            
            // 设置表单值
            Object.entries({
                'node-daily': config.dailyPlanner.nodeId,
                'task-daily': config.dailyPlanner.taskName,
                'enable-daily': config.dailyPlanner.enabled,
                
                'node-work': config.target.work.nodeId,
                'task-work': config.target.work.taskName,
                'enable-work': config.target.work.enabled,
                'tag-work': config.target.work.tag,
                
                'node-personal': config.target.personal.nodeId,
                'task-personal': config.target.personal.taskName,
                'enable-personal': config.target.personal.enabled,
                'tag-personal': config.target.personal.tag,
                
                'node-temp': config.target.temp.nodeId,
                'task-temp': config.target.temp.taskName,
                'enable-temp': config.target.temp.enabled,
                'tag-temp': config.target.temp.tag,
                
                'node-collector': config.collector.nodeId,
                'task-collector': config.collector.taskName,
                'enable-collector': config.collector.enabled,
                'tag-collector': config.collector.tags,
                'auto-complete-collector': config.collector.autoComplete,
                'copy-format-collector': config.collector.copyFormat,
                
                'refresh-interval': config.refreshInterval
            }).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = value;
                    } else {
                        element.value = value;
                    }
                }
            });
        }

        // 收集表单数据
        function collectFormData() {
            return {
                version: DEFAULT_CONFIG.version,
                theme: document.documentElement.getAttribute('data-theme') || 'dark',
                refreshInterval: Number(document.getElementById('refresh-interval').value) || DEFAULT_CONFIG.refreshInterval,
                dailyPlanner: {
                    enabled: document.getElementById('enable-daily').checked,
                    taskName: document.getElementById('task-daily').value,
                    nodeId: document.getElementById('node-daily').value
                },
                target: {
                    work: {
                        enabled: document.getElementById('enable-work').checked,
                        taskName: document.getElementById('task-work').value,
                        nodeId: document.getElementById('node-work').value,
                        tag: document.getElementById('tag-work').value
                    },
                    personal: {
                        enabled: document.getElementById('enable-personal').checked,
                        taskName: document.getElementById('task-personal').value,
                        nodeId: document.getElementById('node-personal').value,
                        tag: document.getElementById('tag-personal').value
                    },
                    temp: {
                        enabled: document.getElementById('enable-temp').checked,
                        taskName: document.getElementById('task-temp').value,
                        nodeId: document.getElementById('node-temp').value,
                        tag: document.getElementById('tag-temp').value
                    }
                },
                collector: {
                    enabled: document.getElementById('enable-collector').checked,
                    taskName: document.getElementById('task-collector').value,
                    nodeId: document.getElementById('node-collector').value,
                    tags: document.getElementById('tag-collector').value,
                    autoComplete: document.getElementById('auto-complete-collector').checked,
                    copyFormat: document.getElementById('copy-format-collector').value
                }
            };
        }

        // 保存按钮事件处理
        const saveBtn = panel.querySelector('.config-save');
        saveBtn.addEventListener('click', () => {
            const newConfig = collectFormData();
            const errors = ConfigManager.validateConfig(newConfig);
            
            if (errors.length > 0) {
                alert('配置验证失败:\n' + errors.join('\n'));
                return;
            }
            
            if (ConfigManager.saveConfig(newConfig)) {
                alert('配置已保存');
            } else {
                alert('保存失败');
            }
        });

        // 重置按钮事件处理
        const resetBtn = panel.querySelector('.config-reset');
        resetBtn.addEventListener('click', () => {
            if (confirm('确定要重置所有设置吗？')) {
                if (ConfigManager.resetConfig()) {
                    loadConfig();
                    alert('配置已重置');
                } else {
                    alert('重置失败');
                }
            }
        });

        // 初始加载配置
        loadConfig();
    }

    // 等待 WorkFlowy 加载完成
    function waitForWF() {
        if(typeof WF !== 'undefined') {
            console.log('WorkFlowy API 加载完成');
            initPanel();
        } else {
            console.log('等待 WorkFlowy API...');
            setTimeout(waitForWF, 100);
        }
    }

    // 启动
    console.log('WorkFlowy Forwarder Plus Framework 启动...');
    waitForWF();
})();