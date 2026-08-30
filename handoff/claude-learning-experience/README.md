# claude/learning-experience 交接说明

## 一句话

第 1 章「AI 到底是什么」按新标准做完了，2 到 6 章还是旧结构。

## 拿到改动

    git fetch origin
    git switch claude/learning-experience
    node scripts/test-learning-experience.mjs

## 这个分支做了什么

内容全部集中在第 1 章。四个小节各带一个演示，练习不再堆在章末。

- 不用学操作，说人话就行 —— 过去/现在两种做法对比
- 四件今天就能上手的活 —— 场景卡
- AI 每写一个词，都是在猜 —— 逐词生成，可自己挑词看跑偏
- 关掉对话，它就把你忘了 —— 上下文窗口挤出 + 各模型窗口对照

新增六个演示渲染器（shift / concentric / timeline / typewriter /
context-window / context-scale）和 demoRenderers 注册表。

## 口径变更，接手前先看

**打开页面不等于正在看。**章节状态要读满 2 个小节才升为 in-progress，
由 markSectionRead 通过 IntersectionObserver 触发。改版前 markStarted
在页面加载瞬间触发，导致目录页六张卡同时显示「正在看」却又写「已看
0 / 6」，两个口径打架。

**章节可选块。**image、caseStudy、exercise、quickCheck 都改成可选，
契约里对应断言已加 if 判断。每章必须有 sections 和 takeaway。

**每小节都要有演示。**契约里有个 rebuiltChapters 白名单，目前只管
ai-basics。第 2 到 6 章按同样标准改完后，把 id 加进这个集合。

**三类语义配色。**蓝色是正文知识，黄色是动手互动，青色是只读的小知识。
demoShell 的 kind 字段控制，默认 hands-on。

## 数据准确性

上下文窗口对照表的数字来自各家官方文档，2026-08-30 抓取，页面上标注了
口径和日期。豆包只写了上下文窗口，输出上限没查到就没写。发现数字冲突的
那个型号直接没用。这些数字变化快，重新发布前建议再核一次。

第 6 章的数据红线部分只写通用原则并指向公司 IT 与合规，没有写入任何
具体内部规定、可用工具清单或价格。

## 还没做

- 2 到 6 章的内容重构
- 同步到交付目录 ~/Downloads/知识库/（需要 Downloads 目录权限）
