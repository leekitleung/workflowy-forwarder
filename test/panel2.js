// ==UserScript==
// @name         WorkFlowy Forwarder Plus - Panel Framework
// @namespace    http://tampermonkey.net/
// @version      0.0.5
// @description  Basic panel framework for WorkFlowy Forwarder Plus
// @author       Namkit
// @match        https://workflowy.com/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // 模块作用域变量
    let panel;
    let reminders = {};
    
    // 默认配置
    const DEFAULT_CONFIG = {
        version: '0.0.5',
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

    // 通用验证函数
    function validateInput(value, type, options) {
        const { required = false, format = null, name = '' } = options || {};
        const errors = [];

        if (required && !value) {
            errors.push(`${name} 不能为空`);
            return errors;
        }

        if (!value) return errors;

        switch (type) {
            case 'nodeId':
                const ids = value.split(',').map(i => i.trim());
                for (const singleId of ids) {
                  if (singleId && !/^[0-9a-f]{12}$/.test(singleId)) {
                    errors.push(`${name}的节点ID "${singleId}" 格式不正确`);
                  }
                }
                break;
            case 'tags':
                const tagList = value.split(',').map(t => t.trim());
                for (const tag of tagList) {
                  if (tag && !/^[#]?[\u4e00-\u9fa5a-zA-Z0-9_\u5904\u7406]+$/.test(tag)) {
                      errors.push(`${name}的标签 "${tag}" 格式不正确，标签只能包含中文、英文、数字和下划线`);
                  }
                }
                break;
            // ... 其他验证类型
        }

        return errors;
    }


    // 配置管理
    const ConfigManager = {
        // 获取完整配置
        getConfig() {
            try {
                const saved = localStorage.getItem('wf_config');
                if (!saved) return DEFAULT_CONFIG;
                
                const parsedConfig = JSON.parse(saved);
                // 确保所有必要的字段都存在
                return {
                    ...DEFAULT_CONFIG,
                    ...parsedConfig,
                    dailyPlanner: {
                        ...DEFAULT_CONFIG.dailyPlanner,
                        ...parsedConfig.dailyPlanner
                    },
                    target: {
                        work: {
                            ...DEFAULT_CONFIG.target.work,
                            ...parsedConfig.target?.work
                        },
                        personal: {
                            ...DEFAULT_CONFIG.target.personal,
                            ...parsedConfig.target?.personal
                        },
                        temp: {
                            ...DEFAULT_CONFIG.target.temp,
                            ...parsedConfig.target?.temp
                        }
                    },
                    collector: {
                        ...DEFAULT_CONFIG.collector,
                        ...parsedConfig.collector
                    }
                };
            } catch (error) {
                console.error('读取配置失败:', error);
                return DEFAULT_CONFIG;
            }
        },

        // 保存配置
        saveConfig(config) {
            try {
                // 验证配置
                const errors = this.validateConfig(config);
                if (errors.length > 0) {
                    console.error('配置验证失败:', errors);
                    return false;
                }

                // 保存前确保所有必要的字段都存在
                const finalConfig = {
                    ...DEFAULT_CONFIG,
                    ...config,
                    version: DEFAULT_CONFIG.version // 始终使用最新版本号
                };

                localStorage.setItem('wf_config', JSON.stringify(finalConfig));
                console.log('配置保存成功:', finalConfig);
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

        // 验证配置
        validateConfig(config) {
            const errors = [];

            // 验证 nodeId (支持单个或多个，逗号分隔)
            const validateNodeId = (id, name, required = true) => {
                if (!id) {
                    if (required) {
                        errors.push(`${name}的节点ID不能为空`);
                    }
                    return;
                }
                const ids = id.split(',').map(i => i.trim());
                for (const singleId of ids) {
                    if (singleId && !/^[0-9a-f]{12}$/.test(singleId)) {
                        errors.push(`${name}的节点ID "${singleId}" 格式不正确`);
                    }
                }
            };

            // 验证标签
            const validateTags = (tags, name) => {
                if (!tags) return;
                const tagList = tags.split(',').map(t => t.trim());
                for (const tag of tagList) {
                    if (tag && !/^[#]?[\u4e00-\u9fa5a-zA-Z0-9_\u5904\u7406]+$/.test(tag)) {
                        errors.push(`${name}的标签 "${tag}" 格式不正确，标签只能包含中文、英文、数字和下划线`);
                    }
                }
            };

            // 验证 DailyPlanner
            if (config.dailyPlanner?.enabled) {
                validateNodeId(config.dailyPlanner.nodeId, 'DailyPlanner');
            }

            // 验证 Target
            if (config.target) {
                Object.entries(config.target).forEach(([key, value]) => {
                    if (value?.enabled) {
                        validateNodeId(value.nodeId, `Target-${key}`);
                        validateTags(value.tag, `Target-${key}`);
                    }
                });
            }

            // 验证 Collector
            if (config.collector?.enabled) {
                validateNodeId(config.collector.nodeId, 'Collector');
                validateTags(config.collector.tags, 'Collector');
            }

            return errors;
        }
    };

    // 添加基础样式
    GM_addStyle(`
        /* 颜色变量 */
        :root {
            --color-bg: #1a1d21;
            --color-bg-secondary: #2d3033;
            --color-border: #404040;
            --color-text: #ffffff;
            --color-text-secondary: #b0b0b0;
            --color-hover: #2a2d30;
            --color-section: #252729;
            --color-primary: #4a9eff;
            --color-primary-hover: #357dd4;
            --color-scrollbar-thumb: #404040;
            --color-scrollbar-track: #1a1d21;
            --color-error: #ff4d4f;
            --color-success: #52c41a;
            --color-warning: #faad14;
        }

        /* 深色主题 */
        :root[data-theme="dark"] {
            --color-bg: #1a1d21;
            --color-bg-secondary: #2d3033;
            --color-border: #404040;
            --color-text: #ffffff;
            --color-text-secondary: #b0b0b0;
            --color-hover: #2a2d30;
            --color-section: #252729;
            --color-primary: #4a9eff;
            --color-primary-hover: #357dd4;
        }

        /* 浅色主题 */
        :root[data-theme="light"] {
            --color-bg: #ffffff;
            --color-bg-secondary: #f5f5f5;
            --color-border: #d9d9d9;
            --color-text: #000000;
            --color-text-secondary: #595959;
            --color-hover: #f0f0f0;
            --color-section: #fafafa;
            --color-primary: #1890ff;
            --color-primary-hover: #096dd9;
            --color-scrollbar-thumb: #d9d9d9;
            --color-scrollbar-track: #f5f5f5;
        }

        /* 面板基础样式 */
        .wf-panel {
            position: fixed;
            right: -320px;
            top: 46px;
            height: calc(100vh - 46px);
            width: 320px;
            background: var(--color-bg);
            border-left: 1px solid var(--color-border);
            z-index: 100;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            flex-direction: column;
        }

        .wf-panel.visible {
            transform: translateX(-320px);
        }
        
        /* 切换按钮样式 */
        .wf-toggle {
            position: fixed;
            right: 20px;
            top: 60px;
            background: var(--color-bg);
            border: 1px solid var(--color-border);
            padding: 8px;
            border-radius: 50%;
            cursor: pointer;
            z-index: 101;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .wf-toggle:hover {
            background: var(--color-hover);
            transform: scale(1.1);
        }

        .wf-toggle.active {
             transform: translateX(-320px);
        }

        .wf-toggle.active:hover {
            transform: translateX(-320px) scale(1.1);
        }

        .toggle-arrow {
            width: 20px;
            height: 20px;
            color: var(--color-text-secondary);
            transition: transform 0.3s ease;
            opacity: 0.8;
        }

        .wf-toggle.active .toggle-arrow {
            transform: rotate(180deg);
        }

        /* 面板头部样式 */
        .panel-header {
            padding: 16px;
            border-bottom: 1px solid var(--color-border);
        }

        .panel-header h2 {
            margin: 0 0 16px 0;
            font-size: 20px;
            color: var(--color-text);
        }

        .version-tag {
            font-size: 12px;
            color: var(--color-text-secondary);
            margin-left: 8px;
        }

         /* 模式切换按钮样式 */
        .mode-switch {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
            background: var(--color-section);
            padding: 4px;
            border-radius: 4px;
        }

        .mode-btn {
            flex: 1;
            padding: 8px;
            border: none;
            background: transparent;
            color: var(--color-text-secondary);
            cursor: pointer;
            border-radius: 4px;
            transition: all 0.2s ease;
            font-size: 14px;
        }

        .mode-btn:hover {
            background: var(--color-hover);
            color: var(--color-text);
        }

        .mode-btn.active {
            background: var(--color-primary);
            color: #fff;
        }

       /* 链接样式 */
        .planner-links {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .planner-link {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            color: var(--color-text-secondary);
            text-decoration: none;
            border-radius: 4px;
            transition: all 0.2s ease;
        }

        .planner-link:hover {
            background: var(--color-hover);
            color: var(--color-text);
        }

        /* 内容区域样式 */
        .panel-content {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            scrollbar-width: thin;
            scrollbar-color: var(--color-scrollbar-thumb) var(--color-scrollbar-track);
            scroll-behavior: smooth;
            -webkit-overflow-scrolling: touch;
        }

        .panel-content::-webkit-scrollbar {
            width: 6px;
        }

        .panel-content::-webkit-scrollbar-track {
            background: var(--color-scrollbar-track);
            border-radius: 3px;
        }

        .panel-content::-webkit-scrollbar-thumb {
            background: var(--color-scrollbar-thumb);
            border-radius: 3px;
        }

       /* 配置面板样式 */
        .config-panel {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--color-bg);
            z-index: 200;
            transform: translateX(100%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            flex-direction: column;
        }

        .config-panel.visible {
            transform: translateX(0);
        }

        .config-panel-header {
            padding: 16px;
            border-bottom: 1px solid var(--color-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .config-panel-header h3 {
            margin: 0;
            font-size: 18px;
            color: var(--color-text);
        }

        .config-panel-close {
            background: none;
            border: none;
            color: var(--color-text-secondary);
            font-size: 24px;
            cursor: pointer;
            padding: 4px;
        }

        .config-panel-content {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
        }

       /* 配置组样式 */
        .config-section {
            margin-bottom: 24px;
        }

        .config-group {
            background: var(--color-bg-secondary);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
            display: grid;
            gap: 16px;
        }

        .group-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--color-border);
        }

        .group-content {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .config-item {
            display: grid;
            grid-template-columns: 120px 1fr;
            align-items: center;
            gap: 12px;
        }

        .config-item label {
            color: var(--color-text-secondary);
            font-size: 14px;
        }

        .config-item input[type="text"],
        .config-item select {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--color-border);
            border-radius: 4px;
            background: var(--color-bg);
            color: var(--color-text);
            font-size: 14px;
            transition: all 0.2s;
        }

        .config-item input[type="text"]:hover,
        .config-item select:hover {
            border-color: var(--color-primary);
        }

        .config-item input[type="text"]:focus,
        .config-item select:focus {
            border-color: var(--color-primary);
            outline: none;
            box-shadow: 0 0 0 2px rgba(74, 158, 255, 0.2);
        }

        .config-item input[type="checkbox"] {
            margin: 0;
        }

        /* 底部按钮样式 */
        .config-panel-footer,
        .clear-all-container {
            padding: 16px;
            border-top: 1px solid var(--color-border);
            display: flex;
            gap: 8px;
        }

        .config-btn,
        .clear-all-btn {
             padding: 8px 16px;
            border: 1px solid var(--color-border);
            border-radius: 4px;
            background: var(--color-bg);
            color: var(--color-text);
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .config-save {
            background: var(--color-primary);
            color: #fff;
            border: none;
        }

        .config-btn:hover,
        .clear-all-btn:hover {
            background: var(--color-hover);
            border-color: var(--color-primary);
        }

        .config-save:hover {
            background: var(--color-primary-hover);
        }

        /* Toast 样式 */
         .toast {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--color-bg-secondary);
            color: var(--color-text);
            padding: 12px 24px;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            z-index: 2000;
            animation: slideDown 0.3s ease;
        }

        .toast.error {
            background: var(--color-error);
            color: #fff;
        }

        .toast.success {
            background: var(--color-success);
            color: #fff;
        }

        .toast.warning {
            background: var(--color-warning);
            color: #fff;
        }

         @keyframes slideDown {
            from {
                transform: translate(-50%, -100%);
                opacity: 0;
            }
            to {
                transform: translate(-50%, 0);
                opacity: 1;
            }
        }

        /* 添加响应式支持 */
        @media (max-width: 768px) {
            .wf-panel {
                width: 100%;
                right: -100%;
                resize: none;
            }
            
            .wf-panel.visible {
                transform: translateX(-100%);
            }
            
            .config-item {
                grid-template-columns: 1fr;
            }
             .wf-toggle {
                width: 44px;
                height: 44px;
            }
        }

         /* 添加可访问性支持 */
        :focus-visible {
            outline: 2px solid var(--color-primary);
            outline-offset: 2px;
        }

        [role="button"] {
            cursor: pointer;
        }
       
       /* 添加加载状态样式 */
        .loading {
            position: relative;
            opacity: 0.7;
            pointer-events: none;
        }

        .loading::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 20px;
            height: 20px;
            margin: -10px 0 0 -10px;
            border: 2px solid var(--color-primary);
            border-top-color: transparent;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }
        /* 优化配置面关闭按钮 */
        .config-panel-close {
            padding: 8px;
            background: none;
            border: none;
            color: var(--color-text-secondary);
            font-size: 20px;
            cursor: pointer;
            border-radius: 4px;
            transition: all 0.2s;
        }

        .config-panel-close:hover {
            background: var(--color-hover);
            color: var(--color-text);
        }
        /* 添加动画效果 */
        @keyframes fadeIn {
            from {
                opacity: 0;
            }
            to {
                opacity: 1;
            }
        }

        @keyframes slideIn {
            from {
                transform: translateX(20px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        .reminder-item {
            animation: slideIn 0.3s ease;
        }

        .config-panel.visible {
            animation: fadeIn 0.3s ease;
        }
        /* 优化提醒样式 */
        .reminder-item {
            background: var(--color-bg-secondary);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 12px;
            display: grid;
            grid-template-columns: auto 1fr auto;
            gap: 12px;
            align-items: center;
            transition: all 0.2s;
        }

        .reminder-item:hover {
            transform: translateX(-4px);
            box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.1);
        }

         .reminder-checkbox-wrapper {
            display: flex;
            align-items: center;
        }

         .reminder-checkbox {
            width: 18px;
            height: 18px;
            border: 2px solid var(--color-border);
            border-radius: 3px;
            cursor: pointer;
            transition: all 0.2s;
        }

         .reminder-checkbox:checked {
            background: var(--color-primary);
            border-color: var(--color-primary);
        }

        .reminder-item-content {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .reminder-item-name {
            color: var(--color-text);
            font-size: 14px;
            line-height: 1.5;
            word-break: break-word;
        }

         .reminder-actions {
            display: flex;
            gap: 8px;
            opacity: 0;
            transition: opacity 0.2s;
        }

        .reminder-item:hover .reminder-actions {
            opacity: 1;
        }

        .reminder-action-btn {
            padding: 4px;
            background: none;
            border: none;
            color: var(--color-text-secondary);
            cursor: pointer;
            border-radius: 4px;
            transition: all 0.2s;
        }

        .reminder-action-btn:hover {
            background: var(--color-hover);
            color: var(--color-text);
        }

    `);

    // 面板切换函数
    function togglePanel() {
        if (!panel) return;
        
        const toggleBtn = document.querySelector('.wf-toggle');
        if (!toggleBtn) return;

        panel.classList.toggle('visible');
        toggleBtn.classList.toggle('active');
        
        // 更新面板位置
        if (panel.classList.contains('visible')) {
            panel.style.transform = 'translateX(-320px)';
        } else {
            panel.style.transform = 'none';
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

    // 创建面板
    function createPanel() {
        panel = document.createElement('div');
        panel.className = 'wf-panel';
        panel.innerHTML = `
            <div class="panel-header">
                <h2>
                    Workflowy<br/>
                    Forwarder Plus
                    <span class="version-tag">v${DEFAULT_CONFIG.version}</span>
                </h2>
                <div class="mode-switch">
                    <!-- 动态生成模式按钮 -->
                </div>
                <div class="planner-links">
                    <a href="#" class="planner-link today-link">Today's Plan</a>
                    <a href="#" class="planner-link scan-link">DailyPlanner</a>
                    <a href="#" class="planner-link work-link">Work</a>
                    <a href="#" class="planner-link personal-link">Personal</a>
                    <a href="#" class="planner-link temp-link">Temp</a>
                    <a href="#" class="planner-link collect-link">Collector</a>
                </div>
            </div>
            <div class="panel-content">
                <div class="reminder-list" id="reminder-list"></div>
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
                    <h3>设置</h3>
                    <button class="config-panel-close">×</button>
                </div>
                <div class="config-panel-content">
                    <!-- DailyPlanner 配置 -->
                    <div class="config-section">
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

                    <!-- Target 配置 -->
                    <div class="config-section">
                        <!-- Work -->
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

                        <!-- Personal -->
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

                        <!-- Temp -->
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

                    <!-- Collector 配置 -->
                    <div class="config-section">
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
                                    <label>复制格式</label>
                                    <select id="copy-format-collector" class="config-select">
                                        <option value="plain">纯文本</option>
                                        <option value="markdown">Markdown</option>
                                        <option value="opml">OPML</option>
                                    </select>
                                </div>
                                <div class="config-item">
                                    <label>
                                        <input type="checkbox" id="auto-complete-collector">
                                        自动完成
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="config-panel-footer">
                    <button class="config-save">保存设置</button>
                    <button class="config-reset">重置设置</button>
                </div>
            </div>

            <div class="clear-all-container">
                <button class="clear-all-btn" id="clear-all">清除当前节点</button>
            </div>
        `;
        document.body.appendChild(panel);
        return panel;
    }

    // 创建切换按钮
    function createToggleBtn() {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'wf-toggle';
        toggleBtn.innerHTML = `
            <svg class="toggle-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 18l-6-6 6-6"/>
            </svg>
        `;
        document.body.appendChild(toggleBtn);
        return toggleBtn;
    }

    // 设置事件监听器
    function setupEventListeners() {
        const toggleBtn = document.querySelector('.wf-toggle');
        if (!toggleBtn) return;

        // 切换按钮事件
        toggleBtn.addEventListener('click', togglePanel);

        // 键盘事件处理
        function handleKeyPress(event) {
            if (event.ctrlKey && event.key === '/') {
                event.preventDefault();
                togglePanel();
            } else if (event.key === 'Escape' && panel?.classList.contains('visible')) {
                togglePanel();
            }
        }

        document.addEventListener('keydown', handleKeyPress);

        // 配置面板事件
        setupConfigPanelEvents();
        
        // 模式切换事件
        setupModeEvents();
        
        // 清除按钮事件
        const clearAllBtn = document.getElementById('clear-all');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', clearAllReminders);
        }
    }

    // 配置面板事件设置
    function setupConfigPanelEvents() {
        const configTrigger = panel.querySelector('.config-trigger-btn');
        const configPanel = panel.querySelector('.config-panel');
        const configClose = panel.querySelector('.config-panel-close');
        const configSave = panel.querySelector('.config-save');
        const configReset = panel.querySelector('.config-reset');

        if (configTrigger && configPanel) {
            configTrigger.addEventListener('click', () => configPanel.classList.add('visible'));
        }

        if (configClose && configPanel) {
            configClose.addEventListener('click', () => configPanel.classList.remove('visible'));
        }

        if (configSave) {
            configSave.addEventListener('click', handleConfigSave);
        }

        if (configReset) {
            configReset.addEventListener('click', handleConfigReset);
        }
    }

    // 处理配置保存
    function handleConfigSave() {
        const configPanel = panel.querySelector('.config-panel');
        const newConfig = collectFormData();
        
        // 验证配置
        const errors = ConfigManager.validateConfig(newConfig);
        if (errors.length > 0) {
            console.error('配置验证失败:', errors);
            showToast(errors[0], true);
            return;
        }

        // 保存配置
        if (ConfigManager.saveConfig(newConfig)) {
            showToast('保存成功');
            configPanel?.classList.remove('visible');
            
            // 重新加载配置并更新UI
            loadConfig();
            updateModeButtons();
            
            // 如果当前有选中的模式，刷新当前模式
            const currentMode = localStorage.getItem('wf_current_mode');
            if (currentMode) {
                switchMode(currentMode);
            }
        } else {
            showToast('保存失败', true);
        }
    }

    // 处理配置重置
    function handleConfigReset() {
        const configPanel = panel.querySelector('.config-panel');
        if (confirm('确定要重置所有设置吗？')) {
            if (ConfigManager.resetConfig()) {
                loadConfig();
                showToast('重置成功');
                configPanel?.classList.remove('visible');
                updateModeButtons();
            } else {
                showToast('重置失败', true);
            }
        }
    }

    // 初始化函数
    function initPanel() {
        // 设置主题
        document.documentElement.setAttribute('data-theme', ConfigManager.getConfig().theme || 'dark');
        
        // 创建面板
        panel = createPanel();
        
        // 创建切换按钮
        createToggleBtn();
        
        // 设置事件监听
        setupEventListeners();
        
        // 加载已保存的提醒
        const savedReminders = localStorage.getItem('workflowy_reminders');
        if (savedReminders) {
            try {
                reminders = JSON.parse(savedReminders);
            } catch (error) {
                console.error('加载提醒失败:', error);
                reminders = {};
            }
        }

        // 加载配置并更新UI
        loadConfig();
        updateReminderList();

        // 设置面板事件监听
        setupPanelEvents();
    }

    // 添加面板事件监听函数
    function setupPanelEvents() {
        // 配置面板相关事件
        const configTrigger = panel.querySelector('.config-trigger-btn');
        const configPanel = panel.querySelector('.config-panel');
        const configClose = panel.querySelector('.config-panel-close');
        const configSave = panel.querySelector('.config-save');
        const configReset = panel.querySelector('.config-reset');
        const clearAllBtn = panel.querySelector('#clear-all');

        // 打开配置面板
        configTrigger?.addEventListener('click', () => {
            configPanel?.classList.add('visible');
        });

        // 关闭配置面板
        configClose?.addEventListener('click', () => {
            configPanel?.classList.remove('visible');
        });

        // 保存配置
        configSave?.addEventListener('click', () => {
            handleConfigSave();
        });

        // 重置配置
        configReset?.addEventListener('click', () => {
            if (confirm('确定要重置所有设置吗？')) {
                if (ConfigManager.resetConfig()) {
                    showToast('重置成功');
                    loadConfig();
                    configPanel?.classList.remove('visible');
                } else {
                    showToast('重置失败', true);
                }
            }
        });

        // 清除当前模式内容
        clearAllBtn?.addEventListener('click', () => {
            clearAllReminders();
        });

        // 模式切换相关事件
        setupModeEvents();

        // 链接点击事件
        setupLinkEvents();
    }

    // 添加链接事件监听函数
    function setupLinkEvents() {
        // Today's Plan 链接
        const todayLink = panel.querySelector('.today-link');
        todayLink?.addEventListener('click', (e) => {
            e.preventDefault();
            const config = ConfigManager.getConfig();
            if (!config.dailyPlanner.enabled || !config.dailyPlanner.nodeId) {
                showToast('请先配置 DailyPlanner', true);
                return;
            }
            // 处理今日计划
            handleTodayPlan();
        });

        // 其他链接的点击事件
        const links = panel.querySelectorAll('.planner-link:not(.today-link)');
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const href = link.getAttribute('href');
                if (href && href !== '#') {
                    window.location.href = href;
                }
            });
        });
    }

    // 处理今日计划
    function handleTodayPlan() {
        const config = ConfigManager.getConfig();
        const nodeId = config.dailyPlanner.nodeId;
        const node = WF.getItemById(nodeId);
        
        if (!node) {
            showToast('找不到目标节点', true);
            return;
        }

        try {
            // 创建今日计划节点
            const today = new Date();
            const dateStr = today.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).replace(/\//g, '-');
            
            const newNode = WF.createItem(node, `${dateStr} #01每日推进`);
            if (newNode) {
                WF.zoomTo(newNode);
                showToast('已创建今日计划');
            } else {
                showToast('创建计划失败', true);
            }
        } catch (error) {
            console.error('处理今日计划失败:', error);
            showToast('处理失败', true);
        }
    }

    // 等待 WorkFlowy 加载完成后初始化
    function waitForWF() {
        if (typeof WF !== 'undefined') {
            console.log('WorkFlowy API 加载完成');
            initPanel();
        } else {
            console.log('等待 WorkFlowy API...');
            setTimeout(waitForWF, 100);
        }
    }

    // 启动脚本
    waitForWF();

    // 添加模式切换相关函数
    function setupModeEvents() {
        // 添加模式选择限制
        const modeCheckboxes = ['enable-daily', 'enable-work', 'enable-personal', 'enable-temp', 'enable-collector'];
        modeCheckboxes.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.addEventListener('change', function() {
                    if (!handleModeSelection(this)) {
                        this.checked = !this.checked;
                    }
                    updateModeButtons(); // 更新模式按钮显示
                });
            }
        });

        // 初始化模式按钮
        updateModeButtons();

        // 恢复上次选择的模式
        const savedMode = localStorage.getItem('wf_current_mode') || 'daily';
        setTimeout(() => {
            const savedModeBtn = panel.querySelector(`#mode-${savedMode}`);
            if (savedModeBtn) {
                savedModeBtn.click();
            }
        }, 100);
    }

    // 更新模式按钮
    function updateModeButtons() {
        const config = ConfigManager.getConfig();
        const modeSwitch = panel.querySelector('.mode-switch');
        if (!modeSwitch) return;

        // 清空现有按钮
        modeSwitch.innerHTML = '';

        // 获取启用的模式
        const enabledModes = [];
        
        if (config.dailyPlanner.enabled) {
            enabledModes.push({
                id: 'daily',
                name: config.dailyPlanner.taskName || 'Daily',
                type: 'daily'
            });
        }
        
        if (config.target.work.enabled) {
            enabledModes.push({
                id: 'work',
                name: config.target.work.taskName || 'Work',
                type: 'work'
            });
        }
        
        if (config.target.personal.enabled) {
            enabledModes.push({
                id: 'personal',
                name: config.target.personal.taskName || 'Personal',
                type: 'personal'
            });
        }
        
        if (config.target.temp.enabled) {
            enabledModes.push({
                id: 'temp',
                name: config.target.temp.taskName || 'Temp',
                type: 'temp'
            });
        }
        
        if (config.collector.enabled) {
            enabledModes.push({
                id: 'collector',
                name: config.collector.taskName || 'Collector',
                type: 'collector'
            });
        }

        // 创建模式按钮
        enabledModes.forEach(mode => {
            const btn = document.createElement('button');
            btn.id = `mode-${mode.id}`;
            btn.className = 'mode-btn';
            btn.textContent = mode.name;
            
            const currentMode = localStorage.getItem('wf_current_mode');
            if (currentMode === mode.id) {
                btn.classList.add('active');
            }
            
            btn.addEventListener('click', () => {
                modeSwitch.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                switchMode(mode.id);
                updateLinks(mode.id);
                localStorage.setItem('wf_current_mode', mode.id);
            });
            
            modeSwitch.appendChild(btn);
        });

        // 更新链接显示
        updateLinks(localStorage.getItem('wf_current_mode'));
    }

    // 处理模式选择
    function handleModeSelection(checkbox) {
        const enabledModes = [
            'enable-daily',
            'enable-work',
            'enable-personal',
            'enable-temp',
            'enable-collector'
        ].filter(id => document.getElementById(id)?.checked);

        // 检查是否超过限制
        if (enabledModes.length > 3 && checkbox.checked) {
            showToast('最多只能启用3个模式');
            return false;
        }

        // 更新相关输入框状态
        const group = checkbox.closest('.config-group');
        if (group) {
            const inputs = group.querySelectorAll('input:not([type="checkbox"]), select');
            inputs.forEach(input => {
                input.disabled = !checkbox.checked;
            });
        }

        return true;
    }

    // 更新链接显示
    function updateLinks(mode) {
        const config = ConfigManager.getConfig();
        const links = {
            daily: [
                {
                    selector: '.today-link',
                    display: config.dailyPlanner.enabled,
                    href: '#',
                    text: "Today's Plan"
                },
                {
                    selector: '.scan-link',
                    display: config.dailyPlanner.enabled,
                    href: WF.getItemById(config.dailyPlanner.nodeId)?.getUrl() || '#',
                    text: config.dailyPlanner.taskName || 'Daily'
                }
            ],
            work: [
                {
                    selector: '.work-link',
                    display: config.target.work.enabled,
                    href: WF.getItemById(config.target.work.nodeId)?.getUrl() || '#',
                    text: config.target.work.taskName || 'Work'
                }
            ],
            personal: [
                {
                    selector: '.personal-link',
                    display: config.target.personal.enabled,
                    href: WF.getItemById(config.target.personal.nodeId)?.getUrl() || '#',
                    text: config.target.personal.taskName || 'Personal'
                }
            ],
            temp: [
                {
                    selector: '.temp-link',
                    display: config.target.temp.enabled,
                    href: WF.getItemById(config.target.temp.nodeId)?.getUrl() || '#',
                    text: config.target.temp.taskName || 'Temp'
                }
            ],
            collector: [
                {
                    selector: '.collect-link',
                    display: config.collector.enabled,
                    href: WF.getItemById(config.collector.nodeId)?.getUrl() || '#',
                    text: config.collector.taskName || 'Collector'
                }
            ]
        };

        const currentModeLinks = links[mode];
        if (currentModeLinks) {
            currentModeLinks.forEach(link => {
                const element = document.querySelector(link.selector);
                if (element) {
                    element.style.display = link.display ? 'flex' : 'none';
                    element.href = link.href;
                    element.textContent = link.text;
                }
            });
        }
    }

    // 修改 processMode 函数
    function processMode(mode, config) {
        const newReminders = {};
        const tempReminders = new Map();
        const processedIds = new Set();

        function processItem(item, depth = 0) {
            // 限制最大深度为10层
            if (depth >= 10) return;

            const id = item.getId();
            if (processedIds.has(id)) return;
            processedIds.add(id);

            if (!WF.getItemById(id)) return;

            const name = item.getNameInPlainText();
            const note = item.getNoteInPlainText();
            
            // 根据不同模式使用不同的标签
            let tag;
            if (mode === 'daily') {
                tag = '#01每日推进';  // DailyPlanner 默认标签
            } else if (mode === 'collector') {
                tag = config.tags;  // Collector 使用配置的 tags
            } else if (['work', 'personal', 'temp'].includes(mode)) {
                // target 模式使用配置的 tag
                tag = config.tag;
                // 如果没有配置标签，直接返回
                if (!tag) {
                    console.log(`${mode} 模式未配置标签`);
                    return;
                }
            }

            // 标签处理
            const tagList = tag.split(',').map(t => t.trim()).filter(t => t);
            if (tagList.length === 0) {
                console.log(`${mode} 模式标签列表为空`);
                return;
            }

            // 标准化标签（确保以#开头）
            const normalizedTags = tagList.map(t => t.startsWith('#') ? t : `#${t}`);
            
            // 检查是否匹配任何标签
            const matchedTag = normalizedTags.find(t => 
                name.includes(t) || note.includes(t)
            );

            if (!name.includes('#index') && !note.includes('#index')) {
                if (matchedTag) {
                    const reminderText = note.includes(matchedTag) ? note : name;
                    const normalizedContent = extractReminderContent(reminderText);
                    const element = item.getElement();
                    const hasMirrors = element?.closest('.project')?.classList.contains('hasMirrors');

                    const newReminder = {
                        id,
                        name: reminderText,
                        originalName: name,
                        hasNoteTag: note.includes(matchedTag),
                        time: Date.now(),
                        notified: false,
                        mode,
                        url: item.getUrl(),
                        hasMirrors,
                        completed: item.isCompleted(),
                        displayName: note.includes(matchedTag) ? `${name} ` : name,
                        matchedTag,
                        depth // 保存节点深度
                    };

                    // 只有当没有现有提醒，或者新提醒有镜像而现有提醒没有时，才更新
                    const existingReminder = tempReminders.get(normalizedContent);
                    if (!existingReminder || (hasMirrors && !existingReminder.hasMirrors)) {
                        tempReminders.set(normalizedContent, newReminder);
                        console.log(`${mode} 模式添加提醒 [深度${depth}]:`, newReminder);
                    }
                }

                // 递归处理子项，深度加1
                const children = item.getChildren();
                children.forEach(child => processItem(child, depth + 1));
            }
        }

        // 处理节点ID（支持多个节点）
        const nodeIds = config.nodeId ? config.nodeId.split(',').map(id => id.trim()) : [];
        for (const nodeId of nodeIds) {
            if (nodeId) {
                const targetNode = WF.getItemById(nodeId);
                if (targetNode) {
                    processItem(targetNode, 0); // 从第0层开始
                } else {
                    console.log(`找不到节点: ${nodeId}`);
                }
            }
        }

        // 将有效的提醒添加到newReminders
        for (const reminder of tempReminders.values()) {
            if (WF.getItemById(reminder.id)) {
                newReminders[reminder.id] = reminder;
            }
        }

        console.log(`${mode} 模式处理完成，找到 ${Object.keys(newReminders).length} 个提醒`);
        return filterRemovedItems(newReminders, mode);
    }

    // 切换模式函数
    function switchMode(mode) {
        const config = ConfigManager.getConfig();
        let modeConfig;

        // 清除所有按钮的激活状态
        panel.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        
        // 激活当前模式按钮
        const currentBtn = panel.querySelector(`#mode-${mode}`);
        if (currentBtn) {
            currentBtn.classList.add('active');
        }

        // 获取对应模式的配置
        switch(mode) {
            case 'daily':
                modeConfig = config.dailyPlanner;
                break;
            case 'work':
            case 'personal':
            case 'temp':
                modeConfig = config.target[mode];
                if (!modeConfig?.tag) {
                    showToast(`请先为 ${mode} 模式配置标签`);
                    return;
                }
                break;
            case 'collector':
                modeConfig = config.collector;
                if (!modeConfig?.tags) {
                    showToast('请先配置收集器标签');
                    return;
                }
                break;
            default:
                console.error('未知模式:', mode);
                return;
        }

        if (!modeConfig?.enabled) {
            showToast('该模式未启用');
            return;
        }

        if (!modeConfig.nodeId) {
            showToast('请先配置节点ID');
            return;
        }

        // 保存当前模式
        localStorage.setItem('wf_current_mode', mode);

        console.log(`切换到 ${mode} 模式，配置:`, modeConfig);

        // 处理当前模式的数据
        const processedReminders = processMode(mode, modeConfig);
        
        // 更新提醒列表
        updateReminderList(mode, processedReminders);
        
        // 更新链接显示
        updateLinks(mode);
    }

    // 更新提醒列表
    function updateReminderList(mode, processedReminders = null) {
        const listElement = document.getElementById('reminder-list');
        if (!listElement) return;

        // 如果没有提供处理过的提醒，则从现有提醒中过滤
        const currentReminders = processedReminders || 
            Object.entries(reminders)
                .filter(([_, r]) => r.mode === mode)
                .reduce((acc, [id, r]) => ({ ...acc, [id]: r }), {});

        if (Object.keys(currentReminders).length === 0) {
            listElement.innerHTML = '<div class="empty-state">暂无内容</div>';
            return;
        }

        const items = Object.values(currentReminders)
            .sort((a, b) => b.time - a.time)
            .map(reminder => createReminderItem(reminder))
            .join('');

        listElement.innerHTML = items;
        addEventListeners(listElement);

        // 更新全局提醒对象
        if (processedReminders) {
            reminders = {
                ...Object.fromEntries(
                    Object.entries(reminders).filter(([_, r]) => r.mode !== mode)
                ),
                ...processedReminders
            };
            saveReminders();
        }
    }

    // 创建提醒项
    function createReminderItem(reminder) {
        try {
            const node = WF.getItemById(reminder.id);
            if (!node) return '';

            const isCompleted = reminder.completed || false;
            let displayText = reminder.name;
            if (reminder.displayName) {
                displayText = reminder.displayName;
            }

            return `
                <div class="reminder-item ${reminder.hasMirrors ? 'has-mirrors' : ''}
                    ${isCompleted ? 'completed' : ''}"
                    data-id="${reminder.id}"
                    data-mode="${reminder.mode}">
                    <div class="reminder-checkbox-wrapper">
                        <input type="checkbox"
                            class="reminder-checkbox"
                            ${isCompleted ? 'checked' : ''}
                            data-id="${reminder.id}">
                    </div>
                    <div class="reminder-item-content">
                        <span class="reminder-item-name" onclick="WF.getItemById('${reminder.id}') && WF.zoomTo(WF.getItemById('${reminder.id}'))">${displayText}</span>
                        <div class="reminder-actions">
                            <button class="reminder-action-btn copy" data-content="${reminder.url}">复制</button>
                            <button class="reminder-action-btn remove" data-id="${reminder.id}">删除</button>
                        </div>
                    </div>
                </div>`;
        } catch (error) {
            console.error('创建提醒项失败:', error);
            return '';
        }
    }

    // 辅助函数
    function extractReminderContent(text) {
        return text
            .replace(/#remind/, '')
            .replace(/#提醒/, '')
            .replace(/#稍后处理/, '')
            .replace(/#01每日推进/, '')
            .trim();
    }

    function filterRemovedItems(newReminders, mode) {
        const removedItems = JSON.parse(localStorage.getItem(`workflowy_removed_${mode}`) || '[]');
        return Object.fromEntries(
            Object.entries(newReminders).filter(([id]) => !removedItems.includes(id))
        );
    }

    function saveReminders() {
        localStorage.setItem('workflowy_reminders', JSON.stringify(reminders));
    }

    // 添加收集表单数据的函数
    function collectFormData() {
        return {
            version: DEFAULT_CONFIG.version,
            theme: document.documentElement.getAttribute('data-theme') || 'dark',
            refreshInterval: DEFAULT_CONFIG.refreshInterval,
            dailyPlanner: {
                enabled: document.getElementById('enable-daily')?.checked || false,
                taskName: document.getElementById('task-daily')?.value || '',
                nodeId: document.getElementById('node-daily')?.value || ''
            },
            target: {
                work: {
                    enabled: document.getElementById('enable-work')?.checked || false,
                    taskName: document.getElementById('task-work')?.value || '',
                    nodeId: document.getElementById('node-work')?.value || '',
                    tag: document.getElementById('tag-work')?.value || ''
                },
                personal: {
                    enabled: document.getElementById('enable-personal')?.checked || false,
                    taskName: document.getElementById('task-personal')?.value || '',
                    nodeId: document.getElementById('node-personal')?.value || '',
                    tag: document.getElementById('tag-personal')?.value || ''
                },
                temp: {
                    enabled: document.getElementById('enable-temp')?.checked || false,
                    taskName: document.getElementById('task-temp')?.value || '',
                    nodeId: document.getElementById('node-temp')?.value || '',
                    tag: document.getElementById('tag-temp')?.value || ''
                }
            },
            collector: {
                enabled: document.getElementById('enable-collector')?.checked || false,
                taskName: document.getElementById('task-collector')?.value || '',
                nodeId: document.getElementById('node-collector')?.value || '',
                tags: document.getElementById('tag-collector')?.value || '',
                autoComplete: document.getElementById('auto-complete-collector')?.checked || false,
                copyFormat: document.getElementById('copy-format-collector')?.value || 'plain'
            }
        };
    }

    // 同时修改 loadConfig 函数以确保正确加载配置
    function loadConfig() {
        if (!panel) return;
        const config = ConfigManager.getConfig();
        
        // 设置表单值
        const setFormValue = (id, value, isCheckbox = false) => {
            const element = document.getElementById(id);
            if (element) {
                if (isCheckbox) {
                    element.checked = value;
                } else {
                    element.value = value || '';
                }
            }
        };

        // DailyPlanner
        setFormValue('enable-daily', config.dailyPlanner.enabled, true);
        setFormValue('task-daily', config.dailyPlanner.taskName);
        setFormValue('node-daily', config.dailyPlanner.nodeId);

        // Work
        setFormValue('enable-work', config.target.work.enabled, true);
        setFormValue('task-work', config.target.work.taskName);
        setFormValue('node-work', config.target.work.nodeId);
        setFormValue('tag-work', config.target.work.tag);

        // Personal
        setFormValue('enable-personal', config.target.personal.enabled, true);
        setFormValue('task-personal', config.target.personal.taskName);
        setFormValue('node-personal', config.target.personal.nodeId);
        setFormValue('tag-personal', config.target.personal.tag);

        // Temp
        setFormValue('enable-temp', config.target.temp.enabled, true);
        setFormValue('task-temp', config.target.temp.taskName);
        setFormValue('node-temp', config.target.temp.nodeId);
        setFormValue('tag-temp', config.target.temp.tag);

        // Collector
        setFormValue('enable-collector', config.collector.enabled, true);
        setFormValue('task-collector', config.collector.taskName);
        setFormValue('node-collector', config.collector.nodeId);
        setFormValue('tag-collector', config.collector.tags);
        setFormValue('auto-complete-collector', config.collector.autoComplete, true);
        setFormValue('copy-format-collector', config.collector.copyFormat);

        // 更新输入框状态
        ['daily', 'work', 'personal', 'temp', 'collector'].forEach(mode => {
            const checkbox = document.getElementById(`enable-${mode}`);
            if (checkbox) {
                const group = checkbox.closest('.config-group');
                if (group) {
                    const inputs = group.querySelectorAll('input:not([type="checkbox"]), select');
                    inputs.forEach(input => {
                        input.disabled = !checkbox.checked;
                    });
                }
            }
        });

        // 更新模式按钮
        updateModeButtons();
    }

    // 添加 Toast 提示函数
    function showToast(message, isError = false) {
        const toast = document.createElement('div');
        toast.className = `toast${isError ? ' error' : ''}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 2000);
    }

    // 添加清除提醒的函数
    function clearAllReminders() {
        if (!confirm('确定要清除当前模式的所有内容吗？')) {
            return;
        }

        const currentMode = localStorage.getItem('wf_current_mode') || 'daily';
        
        // 获取当前模式下的所有项目ID
        const currentModeItems = Object.entries(reminders)
            .filter(([_, r]) => r.mode === currentMode)
            .map(([id]) => id);

        // 添加到移除记录中
        const removedItems = JSON.parse(localStorage.getItem(`workflowy_removed_${currentMode}`) || '[]');
        const updatedRemovedItems = [...new Set([...removedItems, ...currentModeItems])];
        localStorage.setItem(`workflowy_removed_${currentMode}`, JSON.stringify(updatedRemovedItems));

        // 清除当前模式的提醒
        reminders = Object.fromEntries(
            Object.entries(reminders).filter(([_, r]) => r.mode !== currentMode)
        );
        
        saveReminders();
        updateReminderList();
        showToast('已清除当前模式的所有内容');
    }

    // 修改 addEventListeners 函数
    function addEventListeners(listElement) {
        // 复选框事件
        listElement.querySelectorAll('.reminder-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function(e) {
                e.stopPropagation();
                const id = this.dataset.id;
                const reminderItem = this.closest('.reminder-item');
                if (reminderItem) {
                    const isCompleted = this.checked;
                    reminderItem.classList.toggle('completed', isCompleted);

                    // 同步到 WorkFlowy
                    const node = WF.getItemById(id);
                    if (node) {
                        if (isCompleted) {
                            WF.completeItem(node);
                        } else {
                            WF.uncompleteItem(node);
                        }
                    }

                    // 更新本地状态
                    if (reminders[id]) {
                        reminders[id].completed = isCompleted;
                        saveReminders();
                    }
                }
            });
        });

        // 复制按钮事件
        listElement.querySelectorAll('.reminder-action-btn.copy').forEach(btn => {
            btn.addEventListener('click', async function(e) {
                e.stopPropagation();
                const url = this.dataset.content;
                try {
                    await navigator.clipboard.writeText(url);
                    showToast('已复制链接');
                } catch (error) {
                    console.error('复制失败:', error);
                    showToast('复制失败', true);
                }
            });
        });

        // 移除按钮事件
        listElement.querySelectorAll('.reminder-action-btn.remove').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const id = this.dataset.id;
                if (reminders[id]) {
                    const currentMode = localStorage.getItem('wf_current_mode') || 'daily';
                    const removedItems = JSON.parse(localStorage.getItem(`workflowy_removed_${currentMode}`) || '[]');
                    removedItems.push(id);
                    localStorage.setItem(`workflowy_removed_${currentMode}`, JSON.stringify(removedItems));

                    delete reminders[id];
                    saveReminders();

                    const reminderItem = this.closest('.reminder-item');
                    if (reminderItem) {
                        reminderItem.style.opacity = '0';
                        setTimeout(() => reminderItem.remove(), 300);
                    }
                    showToast('已移除');
                }
            });
        });
    }
})();