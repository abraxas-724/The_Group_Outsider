# 贡献与编辑约定（前端分类）

为保持代码可维护性，所有页面应遵循以下约定：

1) 严禁内联代码
- 不使用 <style> 与内联 style 属性；样式放入对应 CSS 文件。
- 不使用 <script> 内联与 HTML 事件属性（如 onclick、onmouseover）；行为放入对应 JS 文件，并用 addEventListener 绑定。

2) 目录与命名
- 页面专属资源：与页面同级，命名为：
  - 页面名-inline.css
  - 页面名-inline.js
  示例：about us/lzh/soon.html → soon-inline.css / soon-inline.js
- 站点共享资源：使用全站 css/ 与 js/ 目录下已有结构（engine/、systems/、components/ 等）。

3) 引用顺序
- 先引 CSS 再引 JS；JS 放在 body 末尾。
- 若 JS 依赖引擎模块，使用相对路径并确保模块为 ES Module 或 UMD 形式。

4) 可访问性与语义
- 使用语义化标签（header/main/section/footer）。
- 避免仅靠颜色表达信息；图片添加 alt。

5) 代码风格
- 保持两空格缩进；结尾换行；去除行尾空格。
- Class 命名建议以页面作用域前缀或 BEM。(示例：hero__title, sl-btn--ghost)

6) 变更清单
- 编辑 HTML：同时在同级创建/更新 *-inline.css 与 *-inline.js。
- 若替换了内联事件，改为 JS 文件内 addEventListener 绑定。

附：工具
- tools/check-inline.ps1：扫描 HTML 是否仍包含 <style>、内联事件或内联脚本。
