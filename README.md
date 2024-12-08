# WorkFlowy Forwarder

一个用于 WorkFlowy 的浏览器扩展，提供侧边栏功能来展示和管理节点。

## 项目结构
workflowy-forwarder/Forwarder-ChromeExtension/
├── manifest.json # 扩展配置文件
├── content.js # 主要的内容脚本，处理面板UI和事件
├── api.js # WorkFlowy API 处理脚本
└── icons/ # 扩展图标
  ├── icon16.png
  ├── icon48.png
  └── icon128.png


## 功能说明

- 在页面右侧提供一个可切换的侧边栏面板
- 显示 WorkFlowy 的第一个节点内容
- 支持点击节点跳转到对应位置
- 提供刷新按钮更新节点内容

## 技术实现

- 使用 Chrome Extension Manifest V3
- 通过 Content Script 注入面板 UI
- 使用自定义事件进行通信
- 通过独立的 API 脚本访问 WorkFlowy API

## 文件说明

- `manifest.json`: 扩展的配置文件，定义权限和资源
- `content.js`: 实现面板 UI 和交互逻辑
- `api.js`: 处理与 WorkFlowy API 的交互
- `icons/`: 存放扩展的图标文件

## 安装和使用

1. 在 Chrome 中打开扩展管理页面 (`chrome://extensions/`)
2. 启用开发者模式
3. 点击"加载已解压的扩展程序"
4. 选择项目文件夹

## 使用方法

1. 访问 WorkFlowy 网站
2. 点击右侧中间的切换按钮显示/隐藏面板
3. 面板中显示第一个节点的内容
4. 点击刷新按钮更新内容
5. 点击节点可跳转到对应位置

## 开发说明

- 使用 `!important` 确保样式优先级
- 通过自定义事件处理通信
- 使用 `web_accessible_resources` 注入 API 脚本
- 采用 Promise 等待 WorkFlowy API 就绪

## 注意事项

- 需要在 WorkFlowy 页面上使用
- 依赖 WorkFlowy 的 API
- 需要适当的浏览器权限