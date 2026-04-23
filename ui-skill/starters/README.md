# UI Skill · Starter Components

类比 Claude Design 原 prompt 的 `copy_starter_component` 工具——这里是 Kevin 的"脚手架零件库"。**不要手搓 device frame / deck shell / 动画 stage**，直接拷合适的 starter 开干。

## 使用

```
Claude: （Step 3 计划阶段决定用哪个 starter）
Claude: Read ~/.claude/skills/gstack/ui-skill/starters/<starter>.jsx
Claude: 基于它写自己的 prototype.html
```

---

## 可用 starter

| 文件 | 用途 | 场景 |
|------|------|------|
| `design_canvas.jsx` | 多方案并排画布 | 2+ 静态方案对比展示 |
| `deck_stage.js` | 幻灯片外壳 | 演示 / review / 做 PPT |
| `ios_frame.jsx` | iOS 设备壳 | 移动端 iOS 设计 |
| `android_frame.jsx` | Android 设备壳 | 移动端 Android 设计 |
| `tweaks_panel.jsx` | Tweaks 控制面板 UI | 暴露可调旋钮 |

---

## 要点

- Claude Design 原文：「用启动组件搬现成脚手架，而不是手搓 device frame / deck shell / 演示网格」
- Kind names 有 extension · 普通 JS 用 `<script src>` 加载，JSX 用 `<script type="text/babel" src>` 加载
- 扩展名传准 · 写错或漏掉都会失败

---

## 未来补充

- `animations.jsx` · 时间线动画引擎（`<Stage>` / `<Sprite>` / `useTime()` / `useSprite()` / Easing）
- `desktop_window.jsx` · macOS / Windows 窗口壳
- `mobile_keyboard.jsx` · iOS / Android 键盘覆盖层

**按需添加** · YAGNI 原则 · 用到再加。
