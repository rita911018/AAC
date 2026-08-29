# AAC 社群知识库站点协作规约（AGENTS）

本规则用于 `AAC社群` 仓库的站点协作。

## 一、仓库与发布边界
- 站点源文件统一放在 `site/knowledge-base/`。
- 网站发布产物通过 GitHub Actions 自动部署到 GitHub Pages（不依赖本地 VPS，不需要额外网关）。
- 允许多人并行开发，但请只在自己的分支上改 `site/knowledge-base/**`。

## 二、协作规则（给人和 Agent）
1. 每次接手前先读：`AGENTS.md`。
2. 新需求/修改先在个人分支完成。
3. 不要在 `main` 直接改代码。
4. 修改后在分支提交一次完整变更（避免拆成大量碎片 commit）。
5. 每次 PR 必须说明：
   - 修改了哪些页面/资源
   - 改动意图
   - 是否影响搜索、图片、学习进度脚本
6. 合并到 `main` 后自动触发部署，默认约 1~2 分钟可见。

## 三、协作流程（推荐）
```bash
# 1. 拉最新
git checkout main && git pull

# 2. 建议使用任务分支
git switch -c feat/<任务名>

# 3. 修改站点文件
# 示例：
nvim site/knowledge-base/index.html

# 4. 提交并推送

git add site/knowledge-base
git commit -m "feat: 更新知识库首页"
git push -u origin HEAD

# 5. 开 PR，等待审核后合并 main
```

## 四、GitHub Pages 发布机制
- 发布配置文件：`.github/workflows/deploy-knowledge-base.yml`
- 触发条件：`main` 分支 push 时自动部署。
- 部署后 URL 见 Actions 输出日志或仓库 Settings → Pages。
- 如需回滚：
  1) 还原到历史提交（`git revert`）
  2) push 到 main，工作流自动重跑。

## 五、更新检查（最小约束）
- 本地预览：
  ```bash
  cd site/knowledge-base
  python -m http.server 4173
  # 打开 http://localhost:4173
  ```
- 发布前至少确认：
  - 能打开首页、学习页、视频页、资源页、详情页、进度页
  - 图片、CSS、JS、内部跳转链接正常
  - 搜索与学习进度脚本未报错

## 六、对外协作注意
- 不要上传敏感信息与私密账号文件。
- 页面资源优先复用现有文件，不新增重型框架。
- 如果你要改动交互核心（search.js / site.js / learning-experience.js），请同步在 PR 里附变更说明。

## 七、安全护城河（攻击面控制）
- 站点是纯静态资源，主要风险集中在前端输入、外链与仓库权限，不依赖数据库。
- 所有协作者 PR 必须写明是否触及：`search.js`、`learning-experience.js`、`site.js`。
- 禁止新增不确定来源的第三方 JS，新增外部资源前需写明来源与版本。
- 外链必须统一使用 HTTPS；`target="_blank"` 链接必须加 `rel="noopener noreferrer"`。
- 任何 API key、token、账号密码、身份证明文件或隐私数据不得提交到仓库前端文件。

## 八、发布前安全红线（合并 main 前必检）
- 站点内不得出现未转义写入 HTML 的用户数据（重点检查 `innerHTML`/`insertAdjacentHTML` 使用）。
- `search.js`、`site.js` 修改后必须手工完成：搜索、页面跳转、进度统计三条链路验证。
- 不得引入可执行的动态拼接脚本（禁止 `eval`、`new Function`、字符串拼接注入脚本）。
- 图片、脚本、样式和本地链接必须有文件存在校验，防止路径篡改导致的页面空白。
- 本次发布仅允许 `main` 上的一个版本范围生效，如有异常，立即 `git revert` 回退发布。

## 九、安全协作约定
- 合并前至少一名维护者评审，确认安全红线通过后再合并。
- 发布前，维护者执行 `AGENTS.md` 的“更新检查”与“发布前安全红线”。
- 发现高风险异常（可疑链接、异常脚本、异常依赖）时，先冻结发布、回滚并重开复盘。

## 十、安全文档
- 详细处理流程见 [SECURITY.md](SECURITY.md)。
