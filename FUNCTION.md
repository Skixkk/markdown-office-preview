# VSCode 插件：Markdown → Pandoc + LibreOffice 基于PDF预览Word排版效果

> 面向人群：学生、科研、公文文书撰写；核心思路：
> **MD编辑（左）→ pandoc转docx（可配置模板）→ libreoffice(soffice) 将docx导出PDF →VSCode内置PDF预览面板渲染PDF，模拟Word排版实时预览**
> 区别于普通MD预览：完全复用pandoc模板、Word样式、公文格式、参考文献、页码页眉、目录，和最终导出docx/PDF成品一致，而不是web的markdown样式。

如果您使用 LaTeX 或 能快速书写 LaTeX，可以尝试直接 LaTeX

## 整体架构

```Text
[VSCode 左侧编辑器] Markdown(.md)
        ↓（保存/实时防抖触发）
【插件核心】
1. 读取插件settings：pandoc路径、libreoffice(soffice)路径、pandoc模板文件、pandoc额外参数
2. 自动探测本机 pandoc / soffice.exe 路径，找不到时提示配置
3. pandoc 执行：md → docx（支持自定义reference-doc模板，公文/学位论文模板）
4. soffice.exe 调用：docx → PDF
        ↓
[VSCode 右侧预览面板] PDF预览（模拟Word最终排版效果）
```

> 核心亮点：**不直接渲染MD HTML，而是走 pandoc+LibreOffice 生成PDF，PDF作为预览载体，所见即最终导出成品（docx/PDF）**
> ，完美适配公文、论文复杂排版（页眉页脚、分栏、自动目录、参考文献、页码、中文字体）

## 功能清单

> 1. 自动探测 pandoc / soffice
> 2. 命令打开预览webview
> 3. 文档修改防抖触发 pandoc md→docx
> 4. soffice docx→pdf
> 5. webview嵌入VSCode内置pdf预览
> 6. 同名文件检测、覆盖提示
> 7. 错误弹窗提示（pandoc不存在、模板不存在、转换失败）

## 关键细节说明（针对公文、科研论文场景）

## 4.1 pandoc reference-doc 模板机制

> 这是满足公文/学位论文样式核心：

1. 先用Word制作好标准模板docx：设置中文字体、行距、首行缩进、标题样式、页眉页脚、页码、页面边距
2. 在插件配置填写 `referenceDocPath`，pandoc生成docx时直接复用这个模板的全部样式>

> 学生：毕业论文模板；文书：政府公文标准模板（仿宋_GB2312，28磅行距，页边距等）

## 4.2 文件覆盖策略

> 当前逻辑：直接覆盖同目录同名 `.docx` / `.pdf`
> 可增强：

- 弹窗询问：`${filename}.docx已存在，是否覆盖？`
- 增加配置开关：`autoOverwrite: boolean`

## 4.3 自动探测逻辑说明

1. 优先读取插件settings中填写的pandocPath/sofficePath
2. 没有填写，则尝试调用系统PATH内的`pandoc --version`和`soffice --version`
3. 都失败，弹窗提示：安装软件，或者手动填写路径到插件设置>

> Windows默认 soffice 常见路径：`C:\Program Files\LibreOffice\program\soffice.exe`

## 4.4 为什么用LibreOffice soffice转PDF，而不是pandoc直接导出PDF

- pandoc直接导出PDF依赖LaTeX，对中文公文、复杂Word样式兼容性差，字体麻烦
- 走 pandoc → docx → soffice导出PDF：**完全模拟Word渲染结果**，和你交付的docx文件排版1:
  1，页眉页脚、域、表格、图片位置和Word一致，非常适合公文、科研文书。>

> 代价：需要安装LibreOffice。

## 5. 使用流程

1. 安装 pandoc + LibreOffice
2. 在vscode插件设置：可手动填写pandoc路径、soffice路径、reference-doc模板
3. 打开`.md`文件，命令面板执行 `> Open Pandoc Word Preview(PDF)`
4. 左侧编辑markdown，停止输入800ms后，自动执行转换，右侧PDF预览刷新
5. 直接产出docx（可给别人用Word打开）+ PDF，预览就是最终成品效果

## 6. 现存局限 & 可扩展优化

### 局限

1. 转换有一定耗时，大md长论文会慢；
2. 依赖外部二进制 pandoc、LibreOffice，用户需要手动安装；
3. 图片相对路径需要注意，pandoc路径解析问题。

### 扩展功能（可选）

1. 增加侧边栏选择内置模板（公文模板、本科论文、硕士论文模板），一键加载reference-doc
2. 增加导出按钮，单独导出docx / PDF
3. 进度条：右下角状态栏展示 pandoc转换中
4. 错误日志面板，把pandoc/soffice的stderr输出到插件输出面板，方便调试模板语法
5. 增加忽略文件配置，比如`<!-- no-preview -->`标记不触发转换
6. 切换PDF缩放，页面翻页同步滚动

## 项目定位

> VSCode插件，**不使用web前端渲染markdown**，而是通过pandoc生成docx，再调用LibreOffice导出PDF，利用PDF预览模拟Word真实排版，适合公文、科研论文，支持自定义Word
> reference-doc模板，所见即交付成品。
