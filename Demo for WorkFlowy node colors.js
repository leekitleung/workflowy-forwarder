// ==UserScript==
// @name         WorkFlowy Color Detector
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Detect WorkFlowy node colors from DOM
// @author       You
// @match        https://workflowy.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function getNodeColor(element) {
        // 检查所有可能包含颜色信息的元素
        const nameEl = element.querySelector('.name');
        const contentEl = element.querySelector('.content');
        const projectEl = element.querySelector('.project');

        // 收集所有相关元素的类名
        const classNames = [
            nameEl?.className || '',
            contentEl?.className || '',
            projectEl?.className || '',
            element.className || ''
        ].join(' ');

        // 查找颜色类（通常以 c- 开头）
        const colorClass = classNames.split(' ').find(cls => cls.startsWith('c-'));
        
        return {
            colorClass,
            allClasses: classNames,
            elementClasses: element.className,
            nameClasses: nameEl?.className,
            contentClasses: contentEl?.className,
            projectClasses: projectEl?.className
        };
    }

    function findColoredNodes(node) {
        if (!node) return;

        const element = node.getElement();
        if (element) {
            const colorInfo = getNodeColor(element);
            console.log('Node Color Info:', {
                name: node.getNameInPlainText(),
                ...colorInfo
            });
        }

        // 递归处理子节点
        const children = node.getChildren();
        children.forEach(findColoredNodes);
    }

    function waitForWF() {
        return new Promise((resolve) => {
            const check = () => {
                if (typeof WF !== 'undefined' && WF.currentItem()) {
                    setTimeout(resolve, 1000);
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    async function init() {
        try {
            await waitForWF();
            console.log('🔍 Starting DOM-based color detection...');
            
            const root = WF.currentItem();
            if (root) {
                findColoredNodes(root);
            }
            
        } catch (error) {
            console.error('Error:', error);
        }
    }

    init();
})();