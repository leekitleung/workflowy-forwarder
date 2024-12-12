// ==UserScript==
// @name         WorkFlowy Forwarder Plus - Panel Framework
// @namespace    http://tampermonkey.net/
// @version      0.0.2
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
            background: #2B3135;
            border-left: 1px solid #5c6062;
            z-index: 100;
            transition: transform 0.3s ease;
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
            background: #2B3135;
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
            background: #363b3f;
        }

        .wf-toggle.active .toggle-arrow {
            transform: rotate(180deg);
        }

        .toggle-arrow {
            width: 20px;
            height: 20px;
            color: #9EA1A2;
            transition: transform 0.3s ease;
            opacity: 0.8;
        }

        .wf-toggle:hover .toggle-arrow {
            opacity: 1;
        }
    `);

    function togglePanel() {
        const panel = document.querySelector('.wf-panel');
        const toggleBtn = document.querySelector('.wf-toggle');
        
        if (panel && toggleBtn) {
            panel.classList.toggle('visible');
            toggleBtn.classList.toggle('active');
        }
    }

    function handleKeyPress(event) {
        if (event.ctrlKey && event.key === '/') {
            setTimeout(() => {
                togglePanel();
            }, 50);
        }
    }

    function initPanel() {
        // 创建面板元素
        const panel = document.createElement('div');
        panel.className = 'wf-panel';
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

        // 添加点击事件
        toggleBtn.onclick = togglePanel;

        // 添加键盘快捷键监听
        document.addEventListener('keydown', handleKeyPress, false);
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