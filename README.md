# WorkFlowy Forwarder Plus

WorkFlowy 增强工具，提供任务管理、提醒、标签筛选等功能。

## 项目结构

```
workflowy-forwarder/
├── test/                    # 测试和开发
│   ├── demo/               # 功能演示
│   └── Demo-setting/       # 设置面板开发
├── dist/                    # 构建输出
├── main.js                  # 主程序
└── build.js                 # 构建脚本
```

## 开发状态

### 当前开发重点
- 设置面板基础功能
- 数据存储方案
- UI 交互逻辑

### 开发计划
1. Phase 1: 设置面板（进行中）
   - [x] 基础界面
   - [x] 配置存储
   - [ ] 数据同步
   - [ ] 界面交互

2. Phase 2: 功能整合
   - [ ] 与主程序对接
   - [ ] 测试和调试
   - [ ] 文档更新

## 使用说明

### 安装
1. 安装 Tampermonkey
2. 安装脚本

### 基本操作
- 打开/关闭面板: Ctrl + /
- 设置: 点击面板右上角图标

## 开发指南

### 本地开发
1. 克隆仓库
2. 在 test/demo 下开发新功能
3. 使用 build.js 构建

### 测试
- 在 test/demo 目录下创建测试用例
- 使用油猴的开发者模式测试

## 许可证
MIT License