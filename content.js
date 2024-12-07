// 定义常量和全局变量
const MODE_NODES = {
    scan: '8220a888febe',  // DailyPlanner节点
    follow: ['6280897d3c65', '3b7e610683fe'],  // Target模式的两个节点
    collect: '17cfc44d9b20'  // Collector节点
};

const SCRIPT_VERSION = '3.5.12';
let reminders = {};
let currentMode = 'scan';
let visitedItems = [];

// 替换 GM_notification
function showNotification(text, title) {
    chrome.runtime.sendMessage({
        type: 'notification',
        title: title || 'WorkFlowy Reminder',
        message: text
    });
}

// 使用 chrome.storage 替换 localStorage
function saveReminders() {
    chrome.storage.local.set({ 'workflowy_reminders': reminders });
}

function loadReminders() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['workflowy_reminders', 'workflowy_visited_items'], (result) => {
            reminders = result.workflowy_reminders || {};
            visitedItems = result.workflowy_visited_items || [];
            resolve();
        });
    });
}

// WorkFlowy状态同步函数
function syncWorkflowyState(itemId, completed) {
    const item = WF.getItemById(itemId);
    if (item) {
        WF.editGroup(() => {
            if (item.isCompleted() !== completed) {
                WF.completeItem(item);
            }
        });
    }
}

// 定期同步检查函数
function synchronizeWorkflowyStates() {
    Object.entries(reminders).forEach(([id, reminder]) => {
        const item = WF.getItemById(id);
        if (item) {
            const workflowyCompleted = item.isCompleted();
            if (reminder.completed !== workflowyCompleted) {
                reminder.completed = workflowyCompleted;
                saveReminders();
                updateReminderList();
            }
        }
    });
}

// 等待 WorkFlowy API 加载
function waitForWF() {
    if(typeof WF !== 'undefined') {
        console.log('WorkFlowy API 加载完成');
        loadReminders().then(() => {
            initReminder();
            setInterval(synchronizeWorkflowyStates, 5000);
        });
    } else {
        console.log('等待 WorkFlowy API...');
        setTimeout(waitForWF, 100);
    }
}

// 键盘快捷键处理
function handleKeyPress(event) {
    if (event.ctrlKey && event.key === '/') {
        setTimeout(() => {
            togglePanel();
            showShortcutToast();
        }, 50);
    }
}

// Toast 提示
function showShortcutToast() {
    let toast = document.getElementById('shortcut-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'shortcut-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = '面板已切换 (Ctrl + /)';
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// 节点颜色处理相关函数
function getNodeColorInfo(node) {
    try {
        const content = node.getName();
        if (!content) return null;

        const colorMatch = content.match(/class="colored ((?:c-|bc-)[a-z]+)"/);
        if (!colorMatch) return null;

        const colorClass = colorMatch[1];
        
        if (colorClass.startsWith('bc-')) {
            return {
                type: 'highlight',
                colorClass: colorClass
            };
        } else if (colorClass.startsWith('c-')) {
            const textColorMap = {
                'c-red': '#d32f2f',
                'c-orange': '#ef6c00',
                'c-yellow': '#f9a825',
                'c-green': '#388e3c',
                'c-blue': '#1e88e5',
                'c-purple': '#7b1fa2',
                'c-pink': '#e91e63',    // 粉色
                'c-sky': '#00bcd4',     // 天蓝色
                'c-teal': '#009688',    // 青色
                'c-gray': '#757575'     // 灰色
            };
            return {
                type: 'colored',
                colorClass: colorClass,
                color: textColorMap[colorClass] || '#000000'
            };
        }
    } catch (error) {
        console.error('获取节点颜色信息失败:', error);
    }
    return null;
}

function getColorStyle(node) {
    try {
        const colorInfo = getNodeColorInfo(node);
        if (!colorInfo) return { style: '', class: '' };

        let colorStyle = '';
        let colorClass = '';

        if (colorInfo.type === 'colored') {
            colorClass = 'colored';
            colorStyle = `
                --text-color: ${colorInfo.color};
                --node-color: ${colorInfo.color}1a;
                --node-border-color: ${colorInfo.color}33;
                --node-color-hover: ${colorInfo.color}26;
                --node-border-color-hover: ${colorInfo.color}40;
                --actions-bg-hover: ${colorInfo.color}0d; /* 5% 透明度 */
            `;
        } else if (colorInfo.type === 'highlight') {
            colorClass = 'highlighted';
            const bgColorMap = {
                'bc-red': 'rgba(211, 47, 47, 0.2)',
                'bc-orange': 'rgba(239, 108, 0, 0.2)',
                'bc-yellow': 'rgba(249, 168, 37, 0.2)',
                'bc-green': 'rgba(56, 142, 60, 0.2)',
                'bc-blue': 'rgba(30, 136, 229, 0.2)',
                'bc-purple': 'rgba(123, 31, 162, 0.2)',
                'bc-pink': 'rgba(233, 30, 99, 0.2)',    // 粉色
                'bc-sky': 'rgba(0, 188, 212, 0.2)',     // 天蓝色
                'bc-teal': 'rgba(0, 150, 136, 0.2)',    // 青色
                'bc-gray': 'rgba(117, 117, 117, 0.2)'   // 灰色
            };
            const backgroundColor = bgColorMap[colorInfo.colorClass];
            const [r, g, b] = backgroundColor.match(/\d+/g);
            colorStyle = `
                --node-color: ${backgroundColor};
                --node-border-color: ${backgroundColor.replace('0.2', '0.3')};
                --node-color-hover: rgba(${r}, ${g}, ${b}, 0.25);
                --node-border-color-hover: rgba(${r}, ${g}, ${b}, 0.35);
                --actions-bg-hover: rgba(${r}, ${g}, ${b}, 0.1);
            `;
        }

        return { style: colorStyle, class: colorClass };
    } catch (error) {
        console.error('获取颜色样式失败:', error);
        return { style: '', class: '' };
    }
}

function updateCardsColor() {
    const cards = document.querySelectorAll('.reminder-item');
    cards.forEach(card => {
        const id = card.dataset.id;
        if (!id) return;

        const node = WF.getItemById(id);
        if (!node) return;

        const colorInfo = getNodeColorInfo(node);
        if (!colorInfo) return;

        const computedStyle = window.getComputedStyle(colorInfo.element);
        
        if (colorInfo.type === 'text') {
            const color = computedStyle.color;
            card.style.setProperty('--text-color', color);
            card.style.setProperty('--node-color', color.replace('rgb', 'rgba').replace(')', ', 0.2)'));
        } else if (colorInfo.type === 'highlight') {
            const bgColor = computedStyle.backgroundColor;
            card.style.setProperty('--node-color', bgColor.replace('rgb', 'rgba').replace(')', ', 0.3)'));
        }
    });
}

// 面板切换
function togglePanel() {
    const panel = document.querySelector('.reminder-panel');
    const toggleBtn = document.querySelector('.reminder-toggle');
    const content = document.getElementById('content');

    if (panel && toggleBtn) {
        panel.classList.toggle('visible');
        toggleBtn.classList.toggle('active');
        if (content) {
            content.style.paddingRight = panel.classList.contains('visible') ? '319px' : '0';
        }
    }
}

// 提醒项创建和事件处理函数
function createReminderItem(reminder) {
    try {
        const node = WF.getItemById(reminder.id);
        if (!node) return '';

        const isCompleted = reminder.completed || false;
        let displayText = reminder.name;
        if (reminder.mode === 'follow' && reminder.displayName) {
            displayText = reminder.displayName;
        }

        // 获取颜色信息
        const colorInfo = getNodeColorInfo(node);
        let colorStyle = '';
        let colorClass = '';
        
        if (colorInfo) {
            if (colorInfo.type === 'colored') {
                colorClass = 'colored';
                colorStyle = `
                    --text-color: ${colorInfo.color};
                    --node-color: ${colorInfo.color}1a;
                    --node-border-color: ${colorInfo.color}33;
                `;
            } else if (colorInfo.type === 'highlight') {
                colorClass = 'highlighted';
                const bgColorMap = {
                    'bc-red': 'rgba(211, 47, 47, 0.2)',
                    'bc-orange': 'rgba(239, 108, 0, 0.2)',
                    'bc-yellow': 'rgba(249, 168, 37, 0.2)',
                    'bc-green': 'rgba(56, 142, 60, 0.2)',
                    'bc-blue': 'rgba(30, 136, 229, 0.2)',
                    'bc-purple': 'rgba(123, 31, 162, 0.2)'
                };
                const backgroundColor = bgColorMap[colorInfo.colorClass];
                colorStyle = `
                    --node-color: ${backgroundColor};
                    --node-border-color: ${backgroundColor.replace('0.2', '0.3')};
                `;
            }
        }

        // 确保URL包含完整域名
        const fullUrl = reminder.url.startsWith('http') ?
            reminder.url :
            `https://workflowy.com${reminder.url}`;

        return `
            <div class="reminder-item ${reminder.hasMirrors ? 'has-mirrors' : ''}
                ${isCompleted ? 'completed' : ''} ${colorClass}"
                data-id="${reminder.id}"
                data-mode="${reminder.mode}"
                style="${colorStyle}">
                <div class="reminder-checkbox-wrapper">
                    <input type="checkbox"
                        class="reminder-checkbox"
                        ${isCompleted ? 'checked' : ''}
                        data-id="${reminder.id}">
                </div>
                <div class="reminder-item-content">
                    <span class="reminder-item-name" onclick="WF.getItemById('${reminder.id}') && WF.zoomTo(WF.getItemById('${reminder.id}'))">${displayText}</span>

                    <div class="reminder-actions">
                        <button class="reminder-action-btn copy" data-content="${fullUrl}">
                        </button>
                        <button class="reminder-action-btn remove" data-id="${reminder.id}">
                        </button>
                    </div>
                </div>
            </div>`;
    } catch (error) {
        console.error('创建提醒项失败:', error);
        return '';
    }
}

function createCollectModeItem(reminder) {
    const isCompleted = reminder.completed || false;
    const parentName = cleanContent(reminder.name || '');
    let childrenContent = '';

    if (reminder.childrenContent) {
        childrenContent = reminder.childrenContent
            .split('\n')
            .map(line => {
                // 保持原有缩进结构，但统一使用破折号
                const indentMatch = line.match(/^(\s*)/);
                const indent = indentMatch ? indentMatch[1] : '';
                const content = line.trim().replace(/^[-•]\s*/, '');
                return `${indent}- ${content}`;
            })
            .filter(line => line.trim())
            .join('\n');
    }

    return `
        <div class="reminder-item collect-mode ${isCompleted ? 'completed' : ''}"
                data-id="${reminder.id}"
                data-mode="${reminder.mode}">

            ${parentName ? `<div class="parent-title">${parentName}</div>` : ''}
            <div class="children-content">
                <div class="reminder-checkbox-wrapper">
                    <input type="checkbox"
                        class="reminder-checkbox"
                        ${isCompleted ? 'checked' : ''}
                        data-id="${reminder.id}">
                </div>
            ${childrenContent ?
                `<div class="children-content-item">${childrenContent}</div>` :
                `<div class="single-content-item">${parentName}</div>`
            }
            </div>
            <div class="reminder-actions">
                <button class="reminder-action-btn open" data-id="${reminder.id}">

                </button>
                <button class="reminder-action-btn remove" data-id="${reminder.id}">

                </button>
            </div>
        </div>`;
}

// 事件监听器添加
function addEventListeners(listElement) {
    // Checkbox事件
    listElement.querySelectorAll('.reminder-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            const reminderItem = this.closest('.reminder-item');
            if (reminderItem) {
                const isCompleted = this.checked;
                reminderItem.classList.toggle('completed', isCompleted);

                // 同步到 WorkFlowy
                syncWorkflowyState(id, isCompleted);

                // 更新本地状态
                const reminder = reminders[id];
                if (reminder) {
                    reminder.completed = isCompleted;
                    saveReminders();
                }
            }
        });
    });

    // 复制链接按钮事件
    listElement.querySelectorAll('.reminder-action-btn.copy').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            const reminderItem = this.closest('.reminder-item');
            const id = reminderItem.dataset.id;
            const mode = reminderItem.dataset.mode;
            const reminder = reminders[id];
            
            if (!reminder) return;
            
            try {
                const node = WF.getItemById(id);
                if (!node) return;
                
                let copied = false;
                
                // 根据不同模式处理复制
                if (mode === 'collect') {
                    // 收集模式的复制处理
                    const htmlContent = node.getName();
                    const plainContent = node.getNameInPlainText();
                    
                    if (htmlContent.includes('<a href=')) {
                        // 处理带链接的HTML内容
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = htmlContent.replace(/#稍后处理/g, '').trim();
                        const anchor = tempDiv.querySelector('a');
                        
                        if (anchor) {
                            const title = anchor.textContent;
                            const url = anchor.href;
                            
                            // 构造OPML格式
                            const opmlContent = `<?xml version="1.0"?>
                            <opml version="2.0">
                                <head>
                                    <title>${title}</title>
                                </head>
                                <body>
                                    <outline text="${title}" _note="&lt;a href=&quot;${url}&quot;&gt;${url}&lt;/a&gt;"/>
                                </body>
                            </opml>`;
                            
                            await navigator.clipboard.writeText(opmlContent);
                            copied = true;
                        }
                    }
                } else {
                    // dailyplanner和target模式复制卡片链接
                    const url = node.getUrl();
                    if (url) {
                        // 确保URL包含完整域名
                        const fullUrl = url.startsWith('http') ? 
                            url : 
                            `https://workflowy.com${url}`;
                        
                        await navigator.clipboard.writeText(fullUrl);
                        copied = true;
                    }
                }
                
                if (copied) {
                    showFeedback(this, '已复制');
                } else {
                    showFeedback(this, '复制失败');
                }
            } catch (error) {
                console.error('复制失败:', error);
                showFeedback(this, '复制失败');
            }
        });
    });

    // 移除按钮事件
    listElement.querySelectorAll('.reminder-action-btn.remove').forEach(handleRemoveButton);

    // 打开按钮事件（收集模式特有）
    listElement.querySelectorAll('.reminder-action-btn.open').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            const item = WF.getItemById(id);
            if (item) {
                WF.zoomTo(item);
            }
        });
    });
}

function addCollectModeEventListeners(listElement) {
    // 处理复选框的点击事件
    listElement.querySelectorAll('.reminder-checkbox').forEach(checkbox => {
        checkbox.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            const reminderItem = this.closest('.reminder-item');
            if (reminderItem) {
                const isCompleted = this.checked;
                reminderItem.classList.toggle('completed', isCompleted);
                syncWorkflowyState(id, isCompleted);
                const reminder = reminders[id];
                if (reminder) {
                    reminder.completed = isCompleted;
                    saveReminders();
                }
            }
        });
    });

    // 辅助函数：处理富文本内容
    function processRichText(item, isParent = false) {
        const nodeData = item.data;
        let processedContent = (nodeData.nm || '').trim();
        
        // 处理特殊格式：日期时间|内容
        const splitContent = processedContent.match(/^([\d-]+\s+[\d:]+)\s*\|\s*(.+)$/);
        if (splitContent && !isParent) {
            processedContent = splitContent[2];
        }
        
        // 处理标签和内容
        processedContent = processedContent
            // 移除 #稍后处理 标签
            .replace(/#稍后处理/g, '')
            
            // 只对非父节点移除日期时间
            .replace(isParent ? '' : /\d{4}-\d{1,2}-\d{1,2}\s+\d{2}:\d{2}/g, '')
            // 移除其他 HTML span 标签
            .replace(/<span[^>]*>(.*?)<\/span>/g, '$1')
            // 处理链接
            .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, (match, url, text) => {
                if (text === url || text === url + ' »') {
                    return url;
                }
                return `${text.replace(' »', '')} ${url}`;
            })
            // 移除多余空格
            .replace(/\s+/g, ' ')
            .trim();
    
        // 处理内嵌的链接
        if (nodeData.ct) {
            const contentLinks = Array.isArray(nodeData.ct) ? nodeData.ct : [];
            contentLinks.forEach(link => {
                if (link.url) {
                    const linkText = link.text || new URL(link.url).hostname;
                    if (linkText === link.url) {
                        processedContent = processedContent.replace(link.url, link.url);
                    } else {
                        processedContent = processedContent.replace(link.url, `${linkText} ${link.url}`);
                    }
                }
            });
        }
    
        return processedContent;
    }
    
    const processChildrenWithIndent = (children, level = 1) => {
        return children
            .map(child => {
                const content = processRichText(child, false); // 子节点不保留时间戳
                // 跳过空内容
                if (!content.trim()) return '';
                
                const indent = '  '.repeat(level);
                const childContent = `${indent}- ${content}`;

                const grandChildren = child.getChildren();
                if (grandChildren.length > 0) {
                    const nestedContent = processChildrenWithIndent(grandChildren, level + 1);
                    return nestedContent ? `${childContent}\n${nestedContent}` : childContent;
                }

                return childContent;
            })
            .filter(line => line.trim()) // 过滤空行
            .join('\n');
    };

    // 内容区域点击事件
    listElement.querySelectorAll('.collect-mode .children-content, .collect-mode .single-content').forEach(content => {
        content.addEventListener('click', async function(e) {
            if (e.target.closest('.reminder-checkbox-wrapper')) return;
            
            e.stopPropagation();
            const reminderItem = this.closest('.reminder-item');
            const id = reminderItem.dataset.id;
            const reminder = reminders[id];
    
            if (!reminder) return;
    
            try {
                const wfItem = WF.getItemById(id);
                const children = wfItem.getChildren();
                let copied = false;
    
                // 处理单节点情况（情况三）
                if (children.length === 0) {
                    // 获取原始HTML内容和纯文本内容
                    const htmlContent = wfItem.getName();
                    const plainContent = wfItem.getNameInPlainText();
                    
                    // 检查是否以日期时间格式开头，并且包含分隔符 |
                    const dateTimeMatch = plainContent.match(/^\d{4}-\d{1,2}-\d{1,2}\s+\d{1,2}:\d{2}\s+\|\s+(.+)$/);
                    
                    if (dateTimeMatch) {
                        // 处理带日期时间格式的内容
                        processedContent = dateTimeMatch[1].replace(/#稍后处理/g, '').trim();
                    } else if (htmlContent.includes('<a href=')) {
                        // 如果是带链接的HTML内容，提取链接和文本
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = htmlContent.replace(/#稍后处理/g, '').trim();
                        const anchor = tempDiv.querySelector('a');
                        
                        if (anchor) {
                            const title = anchor.textContent;
                            const url = anchor.href;
                            
                            // 构造OPML格式，将链接放在note部分
                            const opmlContent = `<?xml version="1.0"?>
                            <opml version="2.0">
                                <head>
                                    <title>${title}</title>
                                </head>
                                <body>
                                    <outline text="${title}" _note="&lt;a href=&quot;${url}&quot;&gt;${url}&lt;/a&gt;"/>
                                </body>
                            </opml>`;
                            
                            try {
                                await navigator.clipboard.writeText(opmlContent);
                                copied = true;
                            } catch (error) {
                                console.error('复制失败:', error);
                                copied = false;
                            }
                        } else {
                            // 如果没有找到链接，使用普通文本
                            await navigator.clipboard.writeText(plainContent.replace(/#稍后处理/g, '').trim());
                            copied = true;
                        }
                    } else {
                        // 普通文本内容
                        await navigator.clipboard.writeText(plainContent.replace(/#稍后处理/g, '').trim());
                        copied = true;
                    }
                }
                // 处理多节点情况
                else {
                    const parentContent = wfItem.getNameInPlainText().trim();
                    const firstChildContent = children[0].getNameInPlainText().trim();
                    const isFirstChildSameAsParent = firstChildContent === parentContent;
                    const isParentDateTime = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(parentContent);
                    
                    // 获取除第一个节点外的所有子节点（如果父子内容相同）
                    const relevantChildren = isFirstChildSameAsParent ? children.slice(1) : children;
                    
                    // 检查是否存在"标题："和"链接："格式
                    const titleNode = relevantChildren.find(child => 
                        child.getNameInPlainText().startsWith('标题：'));
                    const linkNode = relevantChildren.find(child => 
                        child.getNameInPlainText().startsWith('链接：'));

                    // 如果存在标题和链接节点（情况一或情况四的第一种）
                    if (titleNode && linkNode) {
                        const title = titleNode.getNameInPlainText().replace(/^标题[：:]\s*/, '').trim();
                        const url = linkNode.getNameInPlainText().replace(/^链接[：:]\s*/, '').trim();
                        
                        // 直接构造OPML格式的文本
                        const opmlContent = `<?xml version="1.0"?>
                        <opml version="2.0">
                            <head>
                                <title>${title}</title>
                            </head>
                            <body>
                                <outline text="${title}" _note="&lt;a href=&quot;${url}&quot;&gt;${url}&lt;/a&gt;"/>
                            </body>
                        </opml>`;
                    
                        try {
                            await navigator.clipboard.writeText(opmlContent);
                            copied = true;
                        } catch (error) {
                            console.error('复制失败:', error);
                            showFeedback(this, '复制失败');
                        }
                    }
                    // 处理普通文本和链接混合的情况（情况二或情况四的第二种）
                    else {
                        let contentToCopy = '';
                        
                        for (const child of relevantChildren) {
                            const htmlContent = child.getName();
                            const plainContent = child.getNameInPlainText();
                            
                            if (htmlContent.includes('<a href=')) {
                                // 处理带链接的HTML内容
                                const tempDiv = document.createElement('div');
                                tempDiv.innerHTML = htmlContent.replace(/#稍后处理/g, '').trim();
                                const anchor = tempDiv.querySelector('a');
                                
                                if (anchor) {
                                    const title = anchor.textContent;
                                    const url = anchor.href;
                                    
                                    // 使用OPML格式，与单节点处理保持一致
                                    const opmlContent = `<?xml version="1.0"?>
                                    <opml version="2.0">
                                        <head>
                                            <title>${title}</title>
                                        </head>
                                        <body>
                                            <outline text="${title}" _note="&lt;a href=&quot;${url}&quot;&gt;${url}&lt;/a&gt;"/>
                                        </body>
                                    </opml>`;
                                    
                                    contentToCopy += (contentToCopy ? '\n' : '') + opmlContent;
                                } else {
                                    contentToCopy += (contentToCopy ? '\n' : '') + 
                                                plainContent.replace(/#稍后处理/g, '').trim();
                                }
                            } else {
                                // 处理普通文本内容
                                contentToCopy += (contentToCopy ? '\n' : '') + 
                                            plainContent.replace(/#稍后处理/g, '').trim();
                            }
                        }
                        
                        if (contentToCopy.trim()) {
                            await navigator.clipboard.writeText(contentToCopy);
                            copied = true;
                        }
                    }
                }

                if (copied) {
                    showFeedback(this, '已复制');
                    const checkbox = reminderItem.querySelector('.reminder-checkbox');
                    if (checkbox && !checkbox.checked) {
                        checkbox.checked = true;
                        reminderItem.classList.add('completed');
                        reminder.completed = true;
                        saveReminders();
                        syncWorkflowyState(id, true);
                    }
                }
            } catch (error) {
                console.error('复制操作失败:', error);
                showFeedback(this, '复制失败');
            }
        });
    });

    // 使用通用事件监听器处理其他功能
    addEventListeners(listElement);
}

// 初始化函数
function initReminder() {
    // 创建提醒面板
    const panel = document.createElement('div');
    panel.className = 'reminder-panel';
    panel.innerHTML = `
        <div class="panel-header">
            <h1>
                Workflowy<br/>
                Forwarder Plus
                <span class="version-tag">v${SCRIPT_VERSION}</span>
            </h1>
            <div class="mode-switch">
                <button class="mode-btn active" id="scan-reminders">DailyPlanner</button>
                <button class="mode-btn" id="follow-reminders">Target</button>
                <button class="mode-btn" id="collect-reminders">Collector</button>
            </div>
            <div class="planner-links">
                <div class="planner-links-row">
                    <a href="#" class="planner-link today-link" id="goto-today">
                        Today's Plan
                    </a>
                    <a href="https://workflowy.com/#/${MODE_NODES.scan}" class="planner-link scan-link">
                        DailyPlanner
                    </a>
                </div>
                <div class="follow-links-wrapper">
                    <a href="https://workflowy.com/#/${MODE_NODES.follow[0]}" class="planner-link follow-link">
                        ForwardLogs
                    </a>
                    <a href="https://workflowy.com/#/${MODE_NODES.follow[1]}" class="planner-link follow-link">
                        Working
                    </a>
                </div>
                <a href="https://workflowy.com/#/${MODE_NODES.collect}" class="planner-link collect-link">
                    Collector
                </a>
            </div>

        </div>
        <div class="panel-content">
            <div class="reminder-list" id="reminder-list"></div>
        </div>
        <div class="clear-all-container">
            <button class="clear-all-btn" id="clear-all">清除当前节点</button>
        </div>
    `;

    document.body.appendChild(panel);

// 添加面板切换按钮 - 这部分需要确保在正确位置
const toggleBtn = document.createElement('button');
toggleBtn.className = 'reminder-toggle';
toggleBtn.innerHTML = `
    <svg aria-hidden="true" focusable="false" class="toggle-arrow" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
        <path fill="currentColor" d="M4.7 244.7c-6.2 6.2-6.2 16.4 0 22.6l176 176c6.2 6.2 16.4 6.2 22.6 0s6.2-16.4 0-22.6L54.6 272 432 272c8.8 0 16-7.2 16-16s-7.2-16-16-16L54.6 240 203.3 91.3c6.2-6.2 6.2-16.4 0-22.6s-16.4-6.2-22.6 0l-176 176z"></path>
    </svg>
`;
document.body.appendChild(toggleBtn);

// 添加点击事件
toggleBtn.onclick = togglePanel;

// 添加键盘快捷键监听
document.addEventListener('keydown', handleKeyPress, false);

document.getElementById('goto-today').onclick = (e) => {
    e.preventDefault();
    
    try {
        // 缓存今天的时间戳
        const todayKey = new Date().toDateString();
        const cachedNode = sessionStorage.getItem(todayKey);
        
        if (cachedNode) {
            // 尝试���用缓存的节点ID
            try {
                const node = WF.getItemById(cachedNode);
                if (node) {
                    WF.zoomTo(node);
                    return;
                }
            } catch (e) {
                sessionStorage.removeItem(todayKey);
            }
        }

        // 获取日历根节点
        const calendarNode = WF.getItemById(WF.shortIdToId('35a73627730b'));
        if (!calendarNode) {
            WF.showMessage('未找到日历节点', true);
            return;
        }

        // 优化的时间戳获取函数
        const parser = new DOMParser();
        function getMsFromItemName(item) {
            const name = item.getName();
            // 快速检查是否包含time标签
            if (!name.includes('<time')) return null;
            
            const time = parser.parseFromString(name, 'text/html').querySelector("time");
            if (!time) return null;
            
            const ta = time.attributes;
            if (!ta || !ta.startyear || ta.starthour || ta.endyear) return null;
            
            return Date.parse(`${ta.startyear.value}/${ta.startmonth.value}/${ta.startday.value}`);
        }

        // 优化的查找函数：增加年份预检查
        function findFirstMatchingItem(targetTimestamp, parent) {
            // 获取节点名称
            const name = parent.getName();
            
            // 快速预检查：如果节点名包含年份信息，检查是否匹配
            const currentYear = new Date(targetTimestamp).getFullYear();
            if (name.includes('Plan of') && !name.includes(currentYear.toString())) {
                return null;
            }
            
            // 检查当前节点
            const nodeTimestamp = getMsFromItemName(parent);
            if (nodeTimestamp === targetTimestamp) return parent;
            
            // 递归检查子节点
            for (let child of parent.getChildren()) {
                const match = findFirstMatchingItem(targetTimestamp, child);
                if (match) return match;
            }
            
            return null;
        }

        // 获取今天凌晨的时间戳
        const todayTimestamp = new Date((new Date).setHours(0,0,0,0)).valueOf();
        
        // 查找匹配今天日期的节点
        const found = findFirstMatchingItem(todayTimestamp, calendarNode);

        if (found) {
            // 缓存找到的节点ID
            sessionStorage.setItem(todayKey, found.getId());
            WF.zoomTo(found);
        } else {
            WF.showMessage('未找到今天的日期节点', true);
        }
    } catch (error) {
        console.error('导航到今天的日期时出错:', error);
        WF.showMessage('导航失败', true);
    }
};

// 清理已删除节点
function cleanDeletedNodes(mode) {
    const currentReminders = { ...reminders };
    let hasChanges = false;

    // 检查每个提醒项
    for (const [id, reminder] of Object.entries(currentReminders)) {
        if (reminder.mode === mode) {
            try {
                // 尝试获取节点，如果节点不存在会抛出异常
                const node = WF.getItemById(id);
                if (!node) {
                    // 如果节点不存在，删除这个提醒
                    delete reminders[id];
                    hasChanges = true;
                }
            } catch (e) {
                // 如果获取节点时出错，说明节点已被删除
                delete reminders[id];
                hasChanges = true;
            }
        }
    }

    // 如果有变更，保存更新后的提醒列表
    if (hasChanges) {
        saveReminders();
        // 更新显示
        updateReminderList();
    }
}

// 辅助函数
function extractReminderContent(text) {
    return normalizeReminderText(text
        .replace(/#remind/, '')
        .replace(/#提醒/, '')
        .replace(/#稍后处理/, '')
        .replace(/#01每日推进/, '')
        .trim());
}

function normalizeReminderText(text) {
    return text.trim().replace(/\s+/g, ' ');
}

// 清除所有提醒
function clearAllReminders() {
    const currentModeItems = Object.entries(reminders)
        .filter(([_, r]) => r.mode === currentMode)
        .map(([id]) => id);

    chrome.storage.local.get(`workflowy_removed_${currentMode}`, (result) => {
        const removedItems = result[`workflowy_removed_${currentMode}`] || [];
        const updatedRemovedItems = [...new Set([...removedItems, ...currentModeItems])];
        
        chrome.storage.local.set({
            [`workflowy_removed_${currentMode}`]: updatedRemovedItems
        });

        reminders = Object.fromEntries(
            Object.entries(reminders).filter(([_, r]) => r.mode !== currentMode)
        );
        saveReminders();
        updateReminderList();
    });
}

// 启动应用
console.log('WorkFlowy Forward Plus 扩展加载中...');
waitForWF();

// 导出需要的函数供其他模块使用
export {
    showNotification,
    saveReminders,
    loadReminders,
    syncWorkflowyState,
    updateCardsColor
};