# 亚玛芬 AI 知识库（蓝白版）

本仓库托管了 AAC 社群的 HTML 知识库站点源码，并通过 GitHub Pages 对外发布，面向任何可访问 GitHub 的用户，无需本地 VPN。

## 站点路径
- 页面源码：`site/knowledge-base/`
- 部署状态：见仓库 `Settings -> Pages`

## 快速更新流程
1. 从 `main` 拉新分支。
2. 修改 `site/knowledge-base` 下的文件。
3. `git commit` 并创建 PR。
4. 合并后由 GitHub Actions 自动部署。

## 本地预览
```bash
cd site/knowledge-base
python -m http.server 4173
# 访问 http://localhost:4173
```

## 协作
- 任何协作者优先阅读 [`AGENTS.md`](AGENTS.md)。
- 维护者发布机制与回滚策略详见 `AGENTS.md`。
- 安全约束与发布红线详见 [`SECURITY.md`](SECURITY.md)。

## 安全与发布约束
- 发布前必须完成：
  - `AGENTS.md` 的“更新检查”。
  - `AGENTS.md` 的“发布前安全红线”。
  - `SECURITY.md` 的风险处置流程（如有异常先回滚复核）。

## GitHub 保护分支（主分支安全）的一次性配置

当前仓库尚未检测到可用的 GitHub 登录与远端绑定，先用命令做配置（需先授权）：

```bash
# 1) 先登录 GitHub（重置/补齐 token）
gh auth logout -h github.com -u rita911018 || true
gh auth login

# 2) 绑定远端（示例）
git remote add origin git@github.com:<owner>/<repo>.git
git push -u origin main

# 3) 应用主分支保护（默认 main，可改其他分支）
chmod +x scripts/setup-branch-protection.sh
bash scripts/setup-branch-protection.sh <owner>/<repo> main
```

建议参数设置：
- 禁止直接推送 main（必须通过 PR）
- 至少 1 人审批通过后可合并
- 启用严格历史（建议开启）
- 禁止 force push / delete branch
