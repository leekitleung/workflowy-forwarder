# WorkFlowy Forwarder Plus

一个增强WorkFlowy使用体验的油猴脚本，提供任务追踪、提醒和快速导航功能。

## 开发状态


### 待实现功能
[ ]拆分代码完成
[ ]自定义亮色/暗色主题
[ ]自定义节点顺序
[ ]自定义快捷链接
[ ]自定义快捷键
[ ]自定义节点
[ ]自定义标签
[ ]自定义刷新
[ ]自定义打开面板后的默认模式

## 功能特点

### 1. 多模式支持
- **DailyPlanner模式**: 按时间块组织和追踪任务
- **Collector模式**: 收集和整理待处理项

### 2. 自定义配置
- 亮色/暗色主题切换
- 自定义节点和标签
- 自定义快捷键
- 自定义快捷链接
- 自定义刷新间隔

### 3. 界面功能
- 侧边面板显示任务列表
- 快速导航到今日计划
- 任务状态同步
- 复制任务链接
- 批量操作支持

## 安装

1. 确保已安装 [Tampermonkey](https://www.tampermonkey.net/)
2. [点击这里](${GITHUB_URLS.raw}) 安装脚本

## 使用说明

### 基本操作
- **打开/关闭面板**: Ctrl + /
- **切换模式**: 点击面板顶部的模式按钮
- **打开设置**: 点击面板右上角的设置图标

### 模式说明

#### DailyPlanner模式
- 显示时间块内的任务
- 自动按时间排序
- 支持任务状态同步

#### Target模式
- 追踪带有 #01每日推进 标签的任务
- 支持多节点任务追踪
- 显示镜像节点标记

#### Collector模式
- 收集带有 #稍后处理 标签的内容
- 支持批量处理
- 保持原有层级结构

### 自定义设置

#### 主题设置
- 支持亮色/暗色主题
- 可自定义颜色方案

#### 节点设置
- 自定义各模式的根节点
- 支持多节点配置

#### 快捷键设置
- 自定义面板开关快捷键
- 自定义功能快捷键

#### 功能设置
- 调整刷新间隔
- 配置通知选项
- 设置自动完成

## 开发说明

### 项目结构
/
  ├── src/                  # 源代码目录
  │   ├── main.js          # 主程序
  │   ├── config.js        # 配置管理
  │   ├── settings.js      # 设置面板
  │   ├── styles.js        # 样式定义
  ├── dist/                # 发布目录
  │   └── bundle.user.js   # 合并后的脚本
  ├── .github/             # GitHub配置
  │   └── workflows/       # GitHub Actions
  ├── build.js            # 构建脚本
  ├── package.json        # 项目配置
  ├── .gitignore          # Git忽略配置
  ├── LICENSE             # MIT许可证
  └── README.md           # 项目文档

### 开发流程
1. 开发
   - 在 src/ 目录下开发各个模块
   - 使用 ES6 模块系统进行开发
   - 保持代码分离和组织

2. 构建
   - 运行 build.js 进行代码合并
   - 自动处理模块依赖
   - 生成油猴脚本格式

3. 测试
   - build.js 包含测试功能
   - 提供开发时的实时预览
   - 支持热重载开发

## 更新日志

### v4.0.0
- 添加配置系统
- 支持主题切换
- 添加设置面板
- 优化性能和稳定性

### v3.5.12
- 修复已知问题
- 改进用户体验

## 贡献指南

欢迎提交 Issue 和 Pull Request。

MIT License