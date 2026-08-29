# AAC 知识库站点更新申请

## 变更范围
- 页面：
- 资源：
- 脚本：
- 是否影响核心交互：
  - [ ] search.js
  - [ ] site.js
  - [ ] learning-experience.js

## 验证与检查
- [ ] 本地预览通过：主页、learn、video、resources、detail、progress
- [ ] 搜索可用（打开、输入、跳转）
- [ ] 进度页交互正常
- [ ] 所有页面引用文件存在（CSS/JS/图片/跳转）
- [ ] 外链 `target=_blank` 已含 `noopener noreferrer`

## 安全红线（强制）
- [ ] 未新增/未放大任何未授权第三方脚本
- [ ] 未提交敏感数据（密钥、token、账号信息）
- [ ] 未在外部输入场景直接拼接 `innerHTML`
- [ ] 未新增可疑 `eval` / `Function` 类动态执行逻辑

## 审核人确认
- 评审人已确认安全红线与功能回归通过
