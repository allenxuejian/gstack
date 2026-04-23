# ui-skill · 完整提问模板（≥10 问）

用 `AskUserQuestion` 一次问完。上游有 PRD `ui_brief` 时跳过大部分。

---

## 必问 4 条

### Q1 · 起点上下文
```
问题：有设计系统 / UI kit / Figma / 现有截图 / 代码库可参考吗？
选项：
- 有：<路径 / URL>
- 有截图但没设计系统（附上）
- 从零开始，按最佳实践来
- 用 `frontend-design` / `brand-guidelines` 已有 skill 的资源
```

### Q2 · 变体维度
```
问题：哪个轴你最关心？（决定变体怎么拉开差距）
选项：
- 视觉新颖（色彩 / 质感 / 肌理）
- 交互新颖（novel UX / micro-interaction）
- 文案语气（formal / playful / empathetic）
- 布局 / 层次（信息架构差异）
- 混合（每个维度都给一版）
```

### Q3 · 保真度
```
问题：要什么形式？
选项：
- 多方案并排画布（design_canvas · 静态对比）
- 一体化可点击原型（含 flow 切换）
- 只要关键屏（单屏 3 变体）
- 带 Tweaks 面板的"交互实验"
```

### Q4 · Tweaks 范围
```
问题：哪些值你想事后能调？
选项：
- 只要色彩 / 字号（最简）
- + 密度 / 间距
- + 文案 / feature flags
- 你判断后默认加几个有趣的
```

---

## 特化 4 条

### Q5 · 发散程度
```
问题：变体要保守还是大胆？
选项：
- 保守：所有变体都"按章法走"
- 混合：一半稳妥 + 一半新奇
- 大胆：novel UX / 不寻常布局（Recommended for 探索）
- 极端：故意挑衅（看看用户反应）
```

### Q6 · 设备 / 媒介
```
问题：主要设备？
选项：
- 桌面端浏览器
- 移动端（iOS frame / Android frame）
- 平板 / 大屏
- 跨设备都要
```

### Q7 · 状态完整度
```
问题：要覆盖哪些状态？
选项：
- 只 default（最简）
- default + loading + error（基础）
- 全套：default / loading / empty / error / success / disabled（Recommended）
- 按 PRD `states` 字段定
```

### Q8 · 动效
```
问题：要不要动效？
选项：
- 无（纯静态设计）
- CSS transition（hover / click 基础反馈）
- 用 `starters/animations.jsx` 做时间线动画
- 视频级动画（需用 popmotion 兜底）
```

---

## 补充 2 条凑 10

### Q9 · 交付形式
```
问题：除了 prototype.html，还要什么？
选项：
- 只要 HTML + handoff.yaml
- + 可切换 Tweaks 面板（UI 演示）
- + 打印 PDF（做 review 用）
- + Canva / PPT 导出（给非技术 stakeholder）
```

### Q10 · 下游动作
```
问题：这份原型下一步？
选项：
- 直接切 dev-skill 实现（需要 handoff.yaml 完整）
- 先做用户测试（导出 clickable 原型）
- 做汇报（deck / pdf 导出）
- 暂存，等更多 PRD 信息
```

---

## 决策树

```
上游有 prd.yaml 且 ui_brief schema valid?
  ├─ 是 → 只问缺口 4 条（Tweaks 具体键 / 发散程度 / 最关心的变体轴 / 保真度）
  └─ 否 → 
      ├─ 用户给了截图 / Figma 链接? 
      │   └─ 是 → 问必问 4 条即可
      │   └─ 否 → 问必问 4 + 特化 4（共 8 个）
      └─ 复杂多屏 flow? → 加 Q9 Q10 凑 10
```

---

## Claude Design 原文对照

> 「总是确认起点和产品上下文——UI kit、设计系统、代码库等。没有就让用户附上。没有上下文开始设计一定做出烂设计。」

我们的 Q1 完全对齐这一条。

> 「启动新项目问至少 10 个问题」

必问 4 + 特化 4 + 补充 2 = 10 ✓
