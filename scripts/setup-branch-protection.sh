#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "用法: $0 <owner/repo> [branch]"
  echo "示例: $0 rita911018/aac-community main"
  exit 1
fi

REPO="$1"
BRANCH="${2:-main}"
PROTECTION_FILE="$(mktemp)"

cat > "$PROTECTION_FILE" <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": []
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1,
    "require_last_push_approval": false,
    "bypass_pull_request_allowances": {
      "users": [],
      "teams": [],
      "apps": []
    }
  },
  "required_signatures": false,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": false,
  "allow_fork_syncing": true
}
EOF

trap 'rm -f "$PROTECTION_FILE"' EXIT

gh api \
  --method PUT \
  "repos/${REPO}/branches/${BRANCH}/protection" \
  --input "$PROTECTION_FILE"

echo "Branch protection 已应用到 ${REPO}:${BRANCH}"
echo "约束：1 个审批人 + 严格提交历史 + 禁止 force push/删除分支 + 管理员受约束"
