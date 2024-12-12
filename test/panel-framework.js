// ==UserScript==
// @name         WorkFlowy Forwarder Plus - Panel Framework
// @namespace    http://tampermonkey.net/
// @version      0.0.3
// @description  Basic panel framework for WorkFlowy Forwarder Plus
// @author       Namkit
// @match        https://workflowy.com/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

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
                    <span class="version-tag">v0.0.3</span>
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
                    <!-- 主题设置 -->
                    <div class="config-section">
                        <div class="section-header">
                            <h3>主题设置</h3>
                        </div>
                        <div class="config-group">
                            <button class="theme-toggle">
                                <i class="theme-icon">🌙</i>
                                <span class="theme-text">切换主题</span>
                            </button>
                        </div>
                    </div>

                    <!-- 其他设置部分将从 Demo-setting-panel.html 中逐步添加 -->
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