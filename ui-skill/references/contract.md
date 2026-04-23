# ui-skill · 完整契约清单

> **Kevin 环境专属 CRITICAL**（Opus subagent / 失败升级 / PRD 上游契约）统一在 `~/.claude/skills/gstack/_shared/kevin-personal-constraints.md`。本文只列通用 UI 规则 + Claude Design 继承 + skill 特有 CRITICAL。
> 分享给别人时删掉 `_shared/` 引用即可。

每条契约带 **Why** + **How to apply**。大部分直接继承 Claude Design 原 prompt。

---

## 产品契约

### MUST

- **MUST pinned React + Babel 版本 + integrity hashes。**
  - Why: 不锁版本 + 不对 integrity 就会随时被 CDN 改动弄崩。Claude Design 原文：「**NEVER** 用未锁版本 (e.g. `react@18`)」。
  - How: `templates/prototype.html` 起手就是正确的 script tags，直接拷贝。
  ```html
  <script src="https://unpkg.com/react@18.3.1/umd/react.development.js"
          integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L"
          crossorigin="anonymous"></script>
  ```

- **MUST 每屏 ≥3 variations 在多维度。**
  - Why: Claude Design 原文：「目标不是给用户完美方案，是探索尽可能多原子变体让用户混搭」。
  - How: 变体要在**多个维度**（视觉 / 交互 / 文案 / 布局）而不是 3 个换色版本。

- **MUST 全局 style 对象按组件命名。**
  - Why: Claude Design 原文：「**CRITICAL**: 重名 style 对象一定会导致故障」。
  - How: `const terminalStyles = {...}` / `const cardStyles = {...}`；**NEVER** `const styles = {...}`。

- **MUST 多个 `<script type="text/babel">` 要挂 window 共享。**
  - Why: 每个 babel script 独立作用域，不挂就访问不到。
  - How: 组件文件末尾 `Object.assign(window, { Terminal, Line, ... });`

- **MUST 用户改版作为 Tweaks 加到原文件。**
  - Why: Claude Design 原文：「单主文件 + 可切换永远优于一堆散文件」。
  - How: 拿已有文件改；不要生成 v2 / v3 文件，除非用户明确要对比。

- **MUST 先 copy_starter_component 等价物拿脚手架。**
  - Why: device frame / deck shell / 动画 stage 都是轮子，重写就是浪费。
  - How: 从 `starters/` 拷合适的（design_canvas 做并排 / deck_stage 做幻灯片 / ios_frame 做移动端壳）。

- **MUST 产出 handoff.yaml 通过 schema 校验。**
  - Why: 双向契约门禁。没有合法 handoff dev-skill 不能启动。
  - How: harness 自动 validate 对 `_shared/schemas/handoff-schema.yaml`。

- **MUST Tweaks defaults 块必须是合法 JSON。**
  - Why: Claude Design 原文：「标记之间的块必须是合法 JSON（key 和字符串都用双引号）」。
  - How:
  ```js
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "primaryColor": "#D97757",
    "fontSize": 16,
    "dark": false
  }/*EDITMODE-END*/;
  ```

- **MUST 页面持久化状态（deck / video）到 localStorage。**
  - Why: Claude Design 原文：「幻灯片 / 视频这类内容要把播放位置持久化，用户频繁刷新时不丢位置」。
  - How: slide 索引 / 视频 currentTime 变了就写 localStorage，加载时读回。

- **MUST 缺素材时画占位符。**
  - Why: Claude Design 原文：「高保真设计里，得体占位符远胜拙劣真货」。
  - How: 不会的 icon 画 SVG 盒子 + 标签；不会的 image 画 solid 带 label。

### NEVER

- **NEVER 从零 mock 整个产品。**
  - Why: Claude Design 原文：「从零白嫖一整个产品是最后的退路，结果肯定差」。
  - How: 没上下文 → AskUserQuestion 要截图 / Figma / 代码库；别猜。

- **NEVER 发明新配色。**
  - Why: 凭空色彩一定不协调。Claude Design 原文：「优先用 brand / 设计系统里的颜色；太受限就用 oklch 与现有和谐」。
  - How: 若用户有品牌色用品牌色；没有就 oklch() 基于一个锚点生成。

- **NEVER 加 title 屏 / loading 屏。**
  - Why: 浪费用户时间。Claude Design 原文：「克制在 HTML 页面里加'标题卡'的冲动」。
  - How: 直接进入内容。如果一定要欢迎，做成内容的一部分而不是单独一屏。

- **NEVER 用 `scrollIntoView`。**
  - Why: Claude Design 原文：「会把宿主 web app 搞乱」。
  - How: 用 DOM 其它 scroll 方法（`scrollTo` / 手动计算偏移）。

- **NEVER 用 `type="module"`。**
  - Why: Claude Design 原文：「不要在 script 上用 `type="module"` — 会搞坏东西」。
  - How: 保留默认 script 类型。

- **NEVER 写 `const styles = {}`。**
  - Why: 多文件引入时名字冲突 = 全崩。
  - How: `const cardStyles = {}` / `const buttonStyles = {}` 按组件命名。

- **NEVER 整包拷贝 >20 文件的资源目录。**
  - Why: Claude Design 原文 HR-4：「做针对拷贝，或者先写你的文件再按依赖拷资产」。
  - How: 只拷你真正 import 的。

- **NEVER 写 >1000 行文件。**
  - Why: Claude Design 原文 HR-5。
  - How: 拆成多个 JSX + 主文件汇总 import。

- **NEVER 只拿截图凭空还原设计。**
  - Why: Claude Design 原文：「Claude 基于代码而非截图去还原/修改界面时效果更好」。
  - How: 有代码要代码，有 Figma 要 Figma；实在只有截图再上截图。

### CRITICAL

- **CRITICAL 不复刻受版权保护的设计。**
  - Why: Claude Design 原文明文：「除非用户邮箱域名属于该公司，否则不得复刻其标志性 UI」。
  - How: 用户明确说「按 Stripe 样式做」+ 邮箱非 @stripe.com → 做**受启发**的版本，不做像素级还原；且在 handoff.yaml 记录「inspired by X, not a replica」。

- **CRITICAL pinned 版本和 integrity 不能改。**
  - Why: 改了可能被 CDN 供应 bad bytes。
  - How: 直接用 `templates/prototype.html` 里的那组，不要升级。

- **CRITICAL 上游 PRD 的 ui_brief 不满足 schema 时必须阻塞。**
  - Why: 契约违反 = 下游白做。
  - How: Step 1 启动时先 validate；不合格调 AskUserQuestion 通知用户先修 PRD。

**其余 CRITICAL（失败升级 / Opus subagent）见 `_shared/kevin-personal-constraints.md`。**
