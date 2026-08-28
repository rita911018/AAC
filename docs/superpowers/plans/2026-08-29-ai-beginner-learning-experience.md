# AI 新手入门学习体验 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 AI 新手入门改造成 1 个学习目录与 6 个轻量章节详情，每章包含案例、互动和无压力自测，并在当前浏览会话内记录“未看 / 正在看 / 看过”。

**Architecture:** `learn.html` 成为静态可读的学习目录；`detail.html` 继续承载详情路由，并把 `type=learn` 的新章节委托给独立的 `learning-experience.js` 渲染。样式集中在 `learning-experience.css`，章节内容、会话状态和六个互动组件集中在一个受控命名空间中；搜索与旧 URL 通过显式映射保持兼容。

**Tech Stack:** 静态 HTML、CSS、原生 JavaScript、`sessionStorage`（失败时无存储降级）、Node.js 静态契约测试、Playwright/本机 Chromium 浏览器 QA、ImageGen 生成位图、WebP 优化。

---

## 文件结构

- Create: `site/knowledge-base/learning-experience.css` — 学习目录、章节阅读、互动、状态与响应式样式。
- Create: `site/knowledge-base/learning-experience.js` — 六章数据、安全会话状态、目录初始化、详情渲染、互动与返回逻辑。
- Create: `scripts/test-learning-experience.mjs` — 内容边界、路由、状态、资产、无渐变与旧链接兼容的静态契约。
- Create: `scripts/test-learning-browser.cjs` — 章节状态、六类互动、返回、存储异常、键盘与四视口浏览器契约。
- Create: `site/knowledge-base/images/ai-boundaries.png` and `.webp` — 看清边界插画。
- Create: `site/knowledge-base/images/ai-delegation.png` and `.webp` — 学会分工插画。
- Create: `site/knowledge-base/images/ai-verification.png` and `.webp` — 验证结果插画。
- Create: `site/knowledge-base/images/ai-workflow.png` and `.webp` — 工作流插画。
- Create: `site/knowledge-base/images/ai-concept.webp` — 现有认识 AI 插画的优化版本。
- Create: `site/knowledge-base/images/ai-history.webp` — 现有时间线插画的优化版本。
- Create: `site/knowledge-base/images/ai-prompt.webp` — 现有 Prompt 插画的优化版本。
- Modify: `site/knowledge-base/learn.html` — 删除百科与外部资源长页，建立六章学习目录。
- Modify: `site/knowledge-base/detail.html` — 注册六个学习路由与旧路由别名，挂载学习详情渲染器。
- Modify: `site/knowledge-base/search.js` — 用六个新章节替换旧的公司、模型、长时间线搜索项。
- Modify: `site/knowledge-base/progress.html` — 移除持久化 localStorage 叙述，改为兼容入口并指向学习目录。
- Modify: `site/knowledge-base/index.html`, `video.html`, `resources.html` — 页脚“我的学习进度”改为“继续学习”，指向 `learn.html`。
- Modify: `scripts/test-task8-browser.cjs` — 把学习目录、六个新章节和旧学习 URL 加入全站路线与四视口回归矩阵。

### Task 1: 定义学习体验静态契约

**Files:**
- Create: `scripts/test-learning-experience.mjs`
- Test: `site/knowledge-base/learn.html`
- Test: `site/knowledge-base/detail.html`
- Test: `site/knowledge-base/search.js`
- Test: `site/knowledge-base/progress.html`

- [x] **Step 1: 写章节与边界的失败契约**

测试必须明确断言：

```js
const chapterIds = [
  'ai-basics',
  'ai-boundaries',
  'ai-delegation',
  'ai-prompting',
  'ai-verification',
  'ai-workflow',
];
const titles = [
  '认识 AI',
  '看清边界',
  '学会分工',
  '把需求说清楚',
  '验证结果',
  '从对话走向工作流',
];
```

契约还需检查：

- `learn.html` 恰好 6 张章节卡，顺序、标题与详情 URL 精确；
- 状态文案只允许 `未看 / 正在看 / 看过`，不含 `未通过 / 结业 / 评分 / 综合实战`；
- 页面没有 AI 公司、模型入口、课程、视频或博主目录；
- `learning-experience.js` 只使用 `sessionStorage`，不使用 `localStorage`；
- 六章数据各有 `caseStudy`、`exercise`、`quickCheck`、`takeaway`；
- 新旧章节 URL 映射存在；
- 四张新图的 PNG/WebP 都存在，且所有本地引用不越界；
- CSS/HTML/本地 SVG 不含 gradient；
- 搜索索引只展示六个新学习章节，旧公司与模型条目不再标为“入门”；
- `progress.html` 不再宣称长期本地存储。

- [x] **Step 2: 运行静态契约并确认 RED**

Run:

```bash
node scripts/test-learning-experience.mjs
```

Expected: FAIL，首个错误为 `learn hub must contain exactly six chapter cards`。

- [x] **Step 3: 对契约做 mutation 自检**

至少构造以下临时变异并确认测试能捕获：第七张卡、章节顺序交换、`localStorage`、隐藏“未通过”、重新加入 AI 公司入口、缺少案例、删除 PNG 或 WebP、在 CSS 中加入 `linear-gradient`、搜索仍指向 `ai-models`。

- [x] **Step 4: 检查并提交**

Run:

```bash
node --check scripts/test-learning-experience.mjs
git diff --check
```

Expected: PASS；真实页面仍因未实施而 RED。

Commit:

```bash
git add scripts/test-learning-experience.mjs
git commit -m "test: define AI beginner learning contract"
```

### Task 2: 建立学习运行时与会话状态

**Files:**
- Create: `site/knowledge-base/learning-experience.js`
- Create: `site/knowledge-base/learning-experience.css`
- Modify: `scripts/test-learning-experience.mjs`

- [x] **Step 1: 补会话状态失败测试**

测试应要求下列 API 和固定状态：

```js
window.AIBeginner = {
  chapters,
  aliases,
  getStatus,
  markStarted,
  markSeen,
  nextIncomplete,
  initHub,
  renderChapter,
};
```

状态只能是 `unseen / in-progress / seen`，存储 key 为：

```js
const STORAGE_KEY = 'amersports-ai-beginner-session-v1';
```

- [x] **Step 2: 实现安全的 sessionStorage 降级**

实现必须校验章节 ID、状态 shape，并在 get/set 抛错时返回空状态而不阻断页面：

```js
function readState() {
  try {
    var raw = sessionStorage.getItem(STORAGE_KEY);
    var parsed = raw ? JSON.parse(raw) : {};
    var clean = {};
    for (var i = 0; i < chapterIds.length; i++) {
      var id = chapterIds[i];
      if (parsed[id] === 'in-progress' || parsed[id] === 'seen') clean[id] = parsed[id];
    }
    return clean;
  } catch (error) {
    return {};
  }
}

function writeState(state) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    return false;
  }
}
```

`markStarted` 不得把 `seen` 降级；`markSeen` 只写允许的章节。

- [x] **Step 3: 建立六章 metadata 与别名**

新 ID 与旧 URL 映射：

```js
var aliases = {
  'ai-what': 'ai-basics',
  'ai-history': 'ai-basics',
  'prompt-basics': 'ai-prompting',
  'ai-other': 'ai-basics',
};
```

`ai-companies` 与 `ai-models` 不复制内容；详情页显示“该内容已移至 AI 工具与资源”并提供 `resources.html` 链接。

- [x] **Step 4: 建立基础样式变量和 reduced-motion**

CSS 至少包括 `.learning-hub`、`.learning-card`、`.learning-status`、`.lesson-nav`、`.lesson-figure`、`.lesson-case`、`.lesson-exercise`、`.lesson-check`、`.lesson-takeaway`、`.lesson-actions`，并提供：

```css
@media (prefers-reduced-motion: reduce) {
  .learning-card,
  .lesson-token,
  .lesson-feedback,
  .chapter-return-highlight {
    scroll-behavior: auto;
    transition: none;
    animation: none;
  }
}
```

不得出现渐变。

- [x] **Step 5: 运行契约并提交**

Run:

```bash
node scripts/test-learning-experience.mjs
node scripts/verify-knowledge-base.mjs site/knowledge-base
git diff --check
```

Expected: 静态契约继续 RED 在 hub 尚未有六卡；全站 verifier PASS。

Commit:

```bash
git add site/knowledge-base/learning-experience.js site/knowledge-base/learning-experience.css scripts/test-learning-experience.mjs
git commit -m "feat: add beginner learning runtime"
```

### Task 3: 把 learn.html 改成六章学习目录

**Files:**
- Modify: `site/knowledge-base/learn.html`
- Modify: `site/knowledge-base/search.js`
- Modify: `site/knowledge-base/progress.html`
- Modify: `site/knowledge-base/index.html`
- Modify: `site/knowledge-base/video.html`
- Modify: `site/knowledge-base/resources.html`
- Test: `scripts/test-learning-experience.mjs`

- [x] **Step 1: 用契约锁定目录的静态可读性**

即使 JavaScript 关闭，`learn.html` 也必须包含 6 张真实 `<a class="learning-card">`，每张有 H2/H3、说明与操作文案。每张卡 URL 使用：

```text
detail.html?type=learn&id=ai-basics
detail.html?type=learn&id=ai-boundaries
detail.html?type=learn&id=ai-delegation
detail.html?type=learn&id=ai-prompting
detail.html?type=learn&id=ai-verification
detail.html?type=learn&id=ai-workflow
```

- [x] **Step 2: 精简学习页**

删除原公司、模型、视频博主、长时间线、完整术语与结业测验区，同时删除只服务这些旧区块的 inline CSS、脚本、筛选器和测试数据。Hero 文案改为：

```text
AI 新手入门
从看懂 AI 到会协作，用六个轻量章节掌握分工、表达与判断。每章都有案例和小练习，无需技术背景。
```

目录区标题：`选择一个章节，轻松开始`。保留小A Hero `<picture>` 和 WebP 优先加载。

- [x] **Step 3: 初始化目录状态与返回定位**

`initHub()` 应：

- 根据 session 状态更新 `未看 / 正在看 / 看过`；
- 将“继续学习”指向第一个非 `seen` 章节；
- 读取 `#chapter-<id>`，滚动、聚焦并短暂添加 `.chapter-return-highlight`；
- 存储异常时保留静态文案与所有链接。

- [x] **Step 4: 更新搜索与旧进度入口**

搜索新增六章精确链接；“我的学习进度”改为“本次学习进度”，目标 `learn.html`。`progress.html` 改为兼容说明页：说明进度只在本次标签会话有效，并提供 `进入 AI 新手入门` CTA。全站页脚将 `progress.html` 链接改为 `learn.html`，文案为 `继续学习`。

- [x] **Step 5: 运行测试并提交**

Run:

```bash
node scripts/test-learning-experience.mjs
node scripts/test-home-mascot-entry.mjs
node scripts/verify-knowledge-base.mjs site/knowledge-base
git diff --check
```

Expected: 学习契约只在详情六章尚未注册处 RED；其余 PASS。

Commit:

```bash
git add site/knowledge-base/learn.html site/knowledge-base/search.js site/knowledge-base/progress.html site/knowledge-base/index.html site/knowledge-base/video.html site/knowledge-base/resources.html
git commit -m "feat: turn beginner page into learning path"
```

### Task 4: 生成并准备四张章节插画

**Files:**
- Create: `site/knowledge-base/images/ai-boundaries.png`
- Create: `site/knowledge-base/images/ai-boundaries.webp`
- Create: `site/knowledge-base/images/ai-delegation.png`
- Create: `site/knowledge-base/images/ai-delegation.webp`
- Create: `site/knowledge-base/images/ai-verification.png`
- Create: `site/knowledge-base/images/ai-verification.webp`
- Create: `site/knowledge-base/images/ai-workflow.png`
- Create: `site/knowledge-base/images/ai-workflow.webp`
- Create: `site/knowledge-base/images/ai-concept.webp`
- Create: `site/knowledge-base/images/ai-history.webp`
- Create: `site/knowledge-base/images/ai-prompt.webp`
- Test: `scripts/test-learning-experience.mjs`

- [x] **Step 1: 阅读 imagegen 技能并检查参考图**

使用 built-in ImageGen。先用 `view_image` 检查三张参考图，再在每个 built-in ImageGen 调用中通过 `referenced_image_paths` 传入最小必要参考图。参考图角色：

- `images/ai-concept.png` — 主风格参考；
- `images/ai-prompt.png` — 人物比例与扁平线条参考；
- `images/ai-history.png` — 横向构图参考。

- [x] **Step 2: 逐张生成，不批量复用同一提示词**

四个 prompt 共用约束：

```text
Use case: scientific-educational
Asset type: AI beginner course chapter illustration
Style/medium: clean flat editorial illustration matching the supplied blue-and-white reference images; thin navy outlines; simple rounded geometric forms; generous negative space
Color palette: white, pale blue, bright #2563EB blue, deep navy #0E2144 only
Constraints: no gradients; no embedded words, letters, numbers, logos, watermarks or UI screenshots; no photorealism; no 3D rendering
Composition/framing: landscape 3:2, centered educational scene, readable at small web size
```

各自主体：

1. Boundaries: `an AI assistant presents a polished answer panel while a human examines the evidence with a magnifying glass; several claims connect to source cards and one claim has a visibly broken evidence line`.
2. Delegation: `a human and a friendly abstract AI assistant route task cards through three clear parallel lanes: AI work, collaboration, and human decision; visual balance, no text labels`.
3. Verification: `source document cards on the left, an AI answer in the center, and a human checklist with connected evidence markers on the right; emphasis on traceability`.
4. Workflow: `four connected stages represented only by icons and scenes: conversation bubble, reusable template card, linked workflow steps, and a bounded AI agent using tools; include a clear human checkpoint`.

- [x] **Step 3: 检查输出并保存到项目**

逐张用 `view_image` 检查：风格、无文字、无渐变、无水印、主体清晰。复制最终 PNG 到上述项目路径；不要覆盖现有图片。

- [x] **Step 4: 优化 WebP**

使用可用的图像工具为四张新图和三张现有图生成最长边不超过 1200px 的 WebP；目标每张小于 180KB。PNG 作为 fallback，WebP 作为 `<source>`。

- [x] **Step 5: 运行资产与视觉契约**

Run:

```bash
node scripts/test-learning-experience.mjs
node scripts/verify-knowledge-base.mjs site/knowledge-base
git diff --check
```

Expected: 四张新图与三张优化图的资产、尺寸、体积和无渐变契约 PASS；整体学习契约继续精确 RED 在详情页尚未注册六章。全站 verifier PASS。

- [x] **Step 6: 提交**

```bash
git add site/knowledge-base/images/ai-boundaries.* site/knowledge-base/images/ai-delegation.* site/knowledge-base/images/ai-verification.* site/knowledge-base/images/ai-workflow.* site/knowledge-base/images/ai-concept.webp site/knowledge-base/images/ai-history.webp site/knowledge-base/images/ai-prompt.webp
git commit -m "feat: add beginner learning illustrations"
```

### Task 5: 注册六个章节并建立详情阅读骨架

**Files:**
- Modify: `site/knowledge-base/detail.html`
- Modify: `site/knowledge-base/learning-experience.js`
- Modify: `site/knowledge-base/learning-experience.css`
- Test: `scripts/test-learning-experience.mjs`

- [x] **Step 1: 在 detail.html 注册六个结构为 learning 的章节**

每个 `CONFIG.learn.subs` 使用 `structure:'learning'`，meta 分别为 `约 8 分钟 / 约 7 分钟 / 约 8 分钟 / 约 10 分钟 / 约 9 分钟 / 约 8 分钟`。在现有 switch 增加：

```js
case 'learning':
  titleEl.textContent = '轻量学习';
  noteEl.textContent = 'LEARN · TRY · REVIEW';
  window.AIBeginner.renderChapter(id, bodyEl);
  break;
```

在 inline renderer 之前加载 `learning-experience.js`，head 中加载 `learning-experience.css`。

- [x] **Step 2: 为章节数据写完整结构**

每章对象必须包含：

```js
{
  id: 'ai-basics',
  number: '01',
  title: '认识 AI',
  description: '理解 AI、生成式 AI、大模型与 Agent 的关系。',
  image: { webp: 'images/ai-concept.webp', fallback: 'images/ai-concept.png', alt: 'AI 与大模型概念关系插画' },
  sections: [],
  caseStudy: {},
  exercise: {},
  quickCheck: [],
  takeaway: {},
}
```

六章字段使用以下完整映射，不加入安全负责独立章节或综合实战：

| ID | 标题 | 主图 | 案例 | 互动 | 带走模板 |
|---|---|---|---|---|---|
| `ai-basics` | 认识 AI | `ai-concept`；折叠背景用 `ai-history` | 新对话为何不会自动记住上次输入 | Token 候选概率、概念关系、五步原理 | AI 概念关系图与 8 术语 |
| `ai-boundaries` | 看清边界 | `ai-boundaries` | 汇报出现原材料不存在的增长数字 | 幻觉侦探：可以保留 / 需要核验 / 需要修改 | AI 能力边界红黄绿清单 |
| `ai-delegation` | 学会分工 | `ai-delegation` | 月度汇报的数据整理、分析、判断和行动建议 | AI / 人机协作 / 人负责三栏分拣 | AI 任务分工五问 |
| `ai-prompting` | 把需求说清楚 | `ai-prompt` | “帮我写工作汇报”逐步变成完整 brief | 目标、背景、任务、输出要求拼装器 | 四要素 Prompt 与反馈句式 |
| `ai-verification` | 验证结果 | `ai-verification` | 销量上升被错误归因于营销活动 | 事实 / 推论 / 观点及证据连接 | AI 结果核验五步卡 |
| `ai-workflow` | 从对话走向工作流 | `ai-workflow` | 每月汇报从一次对话沉淀成流程 | 步骤排序、分工与人工检查点 | 个人 AI 工作流画布 |

每章正文依次覆盖设计文档对应章节列出的全部“核心内容”；快速自测只围绕本章案例和核心内容，不扩展新的公司、模型、安全或外部资源知识。

- [x] **Step 3: 建立详情导航与“我看完了”**

章节顶部与底部都提供：

```html
<a href="learn.html#chapter-ai-basics">返回 AI 新手入门</a>
<span aria-label="第 1 章，共 6 章">01 / 06</span>
```

进入详情调用 `markStarted(id)`；练习完成或查看解释后启用 `我看完了`。点击后调用 `markSeen(id)`，更新状态 live region，但不拦截下一章。最后一章不显示下一章按钮。

- [x] **Step 4: 处理旧学习 URL**

旧别名在渲染前转到新章并使用 `history.replaceState` 保持当前页面；`ai-companies` / `ai-models` 显示 moved card，不渲染旧内容，不复制外部资源目录。

- [x] **Step 5: 运行测试并提交**

Run:

```bash
node scripts/test-learning-experience.mjs
node scripts/test-task7.mjs
node scripts/test-task8.mjs
node scripts/verify-knowledge-base.mjs site/knowledge-base
git diff --check
```

Expected: PASS，浏览器交互测试尚未创建。

Commit:

```bash
git add site/knowledge-base/detail.html site/knowledge-base/learning-experience.js site/knowledge-base/learning-experience.css
git commit -m "feat: add six beginner learning chapters"
```

### Task 6: 实现六组轻交互与无压力自测

**Files:**
- Create: `scripts/test-learning-browser.cjs`
- Modify: `site/knowledge-base/learning-experience.js`
- Modify: `site/knowledge-base/learning-experience.css`

- [x] **Step 1: 写浏览器 RED 契约**

启动本地静态服务器后，浏览器测试必须覆盖：

- 六章都能打开，顶部标题与 `NN / 06` 正确；
- 进入后状态为 `正在看`；
- 完成互动或查看答案后 `我看完了` 可用；
- 点击后状态为 `看过`，返回目录定位原卡片；
- 答错不出现“不及格/未通过”，仍可点击下一章；
- sessionStorage get/set/JSON 异常时页面无错误、链接仍可用；
- 关闭并建立新 browser context 后进度为空；
- 键盘可操作所有控件，焦点在重渲染后保留。

- [x] **Step 2: 实现六类交互**

函数边界固定为：

```js
renderTokenPrediction(exercise, root)
renderEvidenceSpotter(exercise, root)
renderDelegationSorter(exercise, root)
renderPromptBuilder(exercise, root)
renderClaimClassifier(exercise, root)
renderWorkflowSorter(exercise, root)
```

要求：

- 不用 HTML5 drag-only；分拣与排序必须同时提供按钮点选；
- 反馈由 `aria-live="polite"` 播报；
- 不使用 `innerHTML` 注入用户输入，Prompt 拼装器使用 `textContent` / value；
- 题目可无限重试；
- 正误之外总有简短解释；
- “我看完了”不依赖满分。

- [x] **Step 3: 实现四份复制模板**

复制动作优先 `navigator.clipboard.writeText`，失败时显示可选中的 `<textarea>`，不得静默失败。模板为：AI 任务分工五问、四要素 Prompt、结果核验五步、个人 AI 工作流画布。

- [x] **Step 4: 跑四视口交互测试**

Run:

```bash
node scripts/test-learning-browser.cjs
```

Expected: PASS at 1440 / 820 / 560 / 390，且无横向溢出。

- [x] **Step 5: 提交**

```bash
git add scripts/test-learning-browser.cjs site/knowledge-base/learning-experience.js site/knowledge-base/learning-experience.css
git commit -m "feat: add beginner chapter interactions"
```

### Task 7: 全站回归、视觉 QA 与交付

**Files:**
- Modify: `scripts/test-task8-browser.cjs`
- Modify: `site/knowledge-base/*` only for defects revealed by tests
- Update: `docs/superpowers/plans/2026-08-29-ai-beginner-learning-experience.md` checkboxes

- [x] **Step 1: 运行完整静态回归**

Run:

```bash
node scripts/test-learning-experience.mjs
node scripts/test-home-mascot-entry.mjs
node scripts/test-task7.mjs
node scripts/test-task8.mjs
node scripts/verify-knowledge-base.mjs site/knowledge-base
git diff --check
```

Expected: all PASS。

- [x] **Step 2: 运行完整浏览器回归**

Run:

```bash
node scripts/test-learning-browser.cjs
node scripts/test-task8-browser.cjs
```

Expected: all PASS at 1440 / 820 / 560 / 390；六章、首页、视频、资源、旧 detail URL 与 progress compatibility route 都可访问。

- [x] **Step 3: 目视检查截图**

检查学习目录与六章在四视口下：

- 主图不裁切关键主体；
- 文字与插画比例协调；
- 无横向溢出；
- 返回与下一章按钮不重叠；
- 互动反馈不跳版；
- 蓝白、无渐变、正文足够大；
- reduced motion 模式无位移动画但功能完整。

- [x] **Step 4: 建立交付前备份并同步**

先备份 `/Users/rita/Downloads/知识库/` 到其 `backups/knowledge-base-backup-YYYYMMDD-HHMMSS/`，更新 `backups/VERSIONS.md`；再使用排除 `backups/` 的精确同步，把 `site/knowledge-base/` 交付到 `/Users/rita/Downloads/知识库/`。不得删除或覆盖已有备份。

- [x] **Step 5: 对交付目录重新运行验证**

在交付目录启动静态服务器，重新运行静态与浏览器套件；用 `rsync -aicn --delete --exclude 'backups/'` 确认源与交付无差异，并确认服务器进程已停止。

- [x] **Step 6: 最终提交**

```bash
git add scripts/test-task8-browser.cjs docs/superpowers/plans/2026-08-29-ai-beginner-learning-experience.md
git commit -m "test: verify beginner learning experience"
```
