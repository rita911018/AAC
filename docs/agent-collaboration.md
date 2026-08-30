# Codex × Claude Code 协作机制

## 目标

两边可以并行修改，但必须让每次合并都能回答三件事：基于哪个版本、改了哪些文件、哪些验证已经通过。

## 分支与工作树

- `codex/ai-knowledge-base-redesign` 是整合分支，也是发布前唯一的验收来源。
- Codex 和 Claude Code 各自使用独立 worktree 与个人分支；不在同一个工作树里同时写文件。
- 根目录工作树只用于预览、验收和最终合入，不作为双方的共享编辑区。
- `main` 只接受经过验收的 PR，不直接改动。

建议的命名方式：

```text
codex/<topic>
claude/<topic>
```

## 文件责任边界

| 区域 | 默认负责人 | 规则 |
| --- | --- | --- |
| `learning-experience.js`、`learning-experience.css`、`learn.html` | Claude Code | 学习内容、章节顺序、演示组件由 Claude 维护 |
| `images/ai-basics-hero.svg` | Claude Code | 新增学习页资源要随学习源码一起交接 |
| `video.html`、`resources.html`、首页和资源页视觉 | Codex | 页面布局、封面、资源卡和视觉系统由 Codex 整合 |
| `style.css` | Codex 整合 | Claude 不复制整份 CSS；需要样式时提交明确 diff 或说明选择器 |
| `search.js` | 改动方提交，Codex 整合 | 内容索引必须与最终页面同步，避免整文件覆盖 |
| `scripts/test-*.mjs/cjs` | 随对应源码走 | 源码改动和契约测试必须成对合入 |
| `README.md`、`DELIVERY.md` | 整合时更新 | 只保留最终版本说明和验证结果 |

如果两边确实需要改同一个文件，先在交接说明里标记为“共享文件”，由整合方按代码块合并，禁止用整份快照覆盖另一方。

## 标准交接包

每次交接至少包含：

```text
SOURCE_COMMIT.txt      # 精确基线 SHA、分支名、工作树是否干净
CHANGED_FILES.txt      # 改动文件清单，区分修改/新增/删除
VALIDATION.txt         # 实际执行过的命令和结果
NON_CHANGED_FILES.txt  # 明确禁止整份复制覆盖的共享文件（可选）
```

交接包只提供改动文件或可审计 patch。整站快照仅作为阅读备份，不能直接覆盖整棵 `site/knowledge-base/`。

## 合并流程

1. 记录双方基线 SHA，先运行 `git worktree list` 与 `git status --short`。
2. 用 `git diff --name-status <base>..<branch>` 核对真实改动，不以文件夹时间戳判断改动。
3. 先合入源码，再合入对应测试；共享文件按 hunk 合并。
4. 若页面结构变了，同步更新页面契约；测试不是冲突时可以丢弃的附属文件。
5. 运行静态、运行时、无障碍、浏览器 QA；浏览器 QA 必须使用整合分支的本地服务。
6. 抽查桌面与移动截图，确认没有溢出、隐藏内容或旧页面回退。
7. 以一个整合提交或一个 PR 推送；整合分支通过验收后再合并到 `main`。

## 冲突裁决

- 内容/交互冲突：对应领域负责人优先，另一方保留不冲突的结构和安全修复。
- 视觉冲突：Codex 负责最终视觉一致性，但不得删除 Claude 的语义结构或可访问性标记。
- 测试冲突：以最终批准的页面行为为准，更新断言并在交接说明里写明原因。
- 不确定时保留两边改动，先让测试暴露差异，再做最小化裁决；不使用 `git reset --hard` 或整目录覆盖解决冲突。

## 发布门槛

整合分支至少通过：

```bash
node scripts/test-learning-experience.mjs
node scripts/test-task7.mjs
node scripts/test-task8.mjs site/knowledge-base
node scripts/verify-knowledge-base.mjs site/knowledge-base
node scripts/test-learning-browser.cjs
node scripts/test-task8-browser.cjs
```

最终提交说明必须包含：源码/资源变更、是否影响搜索与学习进度、浏览器 QA 尺寸，以及是否触及 `search.js`、`learning-experience.js`、`site.js`。
