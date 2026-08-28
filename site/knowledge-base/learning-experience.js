(function () {
  'use strict';

  var STORAGE_KEY = 'amersports-ai-beginner-session-v1';
  var STATUS_UNSEEN = 'unseen';
  var STATUS_STARTED = 'in-progress';
  var STATUS_SEEN = 'seen';

  var chapters = [
    {
      id: 'ai-basics',
      number: '01',
      title: '认识 AI',
      summary: '看懂 AI、生成式 AI、大模型与 Agent 的关系，用“预测下一个 Token”理解工作原理。',
      image: 'images/ai-concept.webp',
      caseStudy: {
        title: '为什么新对话不记得上次说过的事？',
        situation: '对话中的上下文像临时工作记忆，新对话通常需要重新提供必要背景。',
        lesson: '把关键背景放进当前任务，不把过去对话当作自动长期记忆。',
      },
      exercise: {
        type: 'token-and-concepts',
        title: '看看下一个 Token 可能是什么',
        instruction: '观察候选内容的概率，再把 AI、大模型与 Agent 放到正确关系中。',
      },
      quickCheck: [
        { question: '大模型生成回答时最接近哪种行为？', answer: '根据上下文预测后续 Token', explanation: '流畅输出来自连续预测，不等于模型已经查证事实。' },
      ],
      takeaway: {
        title: 'AI 概念关系图',
        items: ['Token', '上下文', '多模态', '幻觉', 'RAG', 'Prompt', '工作流', 'Agent'],
      },
    },
    {
      id: 'ai-boundaries',
      number: '02',
      title: '看清边界',
      summary: '知道 AI 擅长什么、不擅长什么，以及为什么“说得像真的”不等于正确。',
      image: 'images/ai-boundaries.webp',
      caseStudy: {
        title: '汇报里出现了原材料没有的增长数字',
        situation: 'AI 为了让叙述更完整，补出了一个看似合理的精确数字。',
        lesson: '精确数据、时效信息和内部信息都要回到可追溯来源核验。',
      },
      exercise: {
        type: 'hallucination-spotter',
        title: '幻觉侦探',
        instruction: '点击句子，区分“可以保留”“需要核验”和“需要修改”。',
      },
      quickCheck: [
        { question: '回答语气很自信时，可以省略哪一步？', answer: '不能因语气自信而省略核验', explanation: '表达流畅只是生成质量的一部分，关键事实仍需证据。' },
      ],
      takeaway: {
        title: 'AI 能力边界清单',
        items: ['放心交给 AI', '人机协作', '最终由人判断'],
      },
    },
    {
      id: 'ai-delegation',
      number: '03',
      title: '学会分工',
      summary: '判断一项工作应交给 AI、人机协作，还是必须由人负责。',
      image: 'images/ai-delegation.webp',
      caseStudy: {
        title: '一份月度汇报应该怎么分工？',
        situation: '数据整理、异常发现、优先级判断和跨部门建议的错误代价不同。',
        lesson: 'AI 可以整理和发散，人需要结合业务语境决定重点和行动。',
      },
      exercise: {
        type: 'delegation-sort',
        title: '任务分拣台',
        instruction: '把任务放入 AI、人机协作、人负责三栏，再对照判断理由。',
      },
      quickCheck: [
        { question: '哪类任务更适合先交给 AI？', answer: '目标清晰、结果可验证的整理与初稿任务', explanation: '任务越清晰、越容易检查，越适合委托给 AI。' },
      ],
      takeaway: {
        title: 'AI 任务分工五问',
        items: ['目标清晰吗', '结果可验证吗', '错误代价高吗', '需要多少业务语境', '最终谁负责'],
      },
    },
    {
      id: 'ai-prompting',
      number: '04',
      title: '把需求说清楚',
      summary: '用目标、背景、任务、输出要求四要素，把提示词变成可执行的工作 brief。',
      image: 'images/ai-prompt.webp',
      caseStudy: {
        title: '从“帮我写汇报”到可执行的任务说明',
        situation: '只给一句宽泛需求，AI 不知道对象、重点、材料边界和输出格式。',
        lesson: '先说清成功标准，再通过多轮反馈逐步校准结果。',
      },
      exercise: {
        type: 'prompt-builder',
        title: 'Prompt 拼装器',
        instruction: '填写四个字段，实时组合一份完整的任务说明。',
      },
      quickCheck: [
        { question: '第一版结果不理想时，最有帮助的做法是什么？', answer: '指出具体差距并说明如何修改', explanation: '具体反馈能让下一轮更接近目标，不必每次重新开始。' },
      ],
      takeaway: {
        title: '四要素 Prompt 模板',
        items: ['目标', '背景', '任务', '输出要求'],
      },
    },
    {
      id: 'ai-verification',
      number: '05',
      title: '验证结果',
      summary: '区分事实、推论和观点，查来源、对原文，用明确标准检查质量。',
      image: 'images/ai-verification.webp',
      caseStudy: {
        title: '“销量上升”能否直接证明“营销有效”？',
        situation: 'AI 把两个先后出现的现象直接写成因果结论，但材料没有排除其他因素。',
        lesson: '事实是材料已支持的内容，推论需要明确标注并补证据。',
      },
      exercise: {
        type: 'evidence-check',
        title: '事实、推论、观点与证据',
        instruction: '逐句标记回答性质，再把关键结论连回原文证据。',
      },
      quickCheck: [
        { question: '引用数量多，是否代表结论一定可信？', answer: '不一定，还要确认引用是否真实、相关并支持结论', explanation: '可追溯不只是有链接，还要对原文、时间口径和推理关系。' },
      ],
      takeaway: {
        title: 'AI 结果核验五步卡',
        items: ['查来源', '对原文', '看时间口径', '检查推理', '对照任务标准'],
      },
    },
    {
      id: 'ai-workflow',
      number: '06',
      title: '从对话走向工作流',
      summary: '拆任务、定义输入输出、设置检查点，把一次成功对话沉淀为可复用方法。',
      image: 'images/ai-workflow.webp',
      caseStudy: {
        title: '把每月重复的汇报从对话变成流程',
        situation: '每次都重新解释材料、步骤和格式，结果不稳定也难以复用。',
        lesson: '固定输入、步骤、人机分工、检查点和输出，再保存为模板。',
      },
      exercise: {
        type: 'workflow-builder',
        title: '工作流排序与检查点',
        instruction: '将步骤排序，标出 AI、人机协作与人负责，再加入人工检查点。',
      },
      quickCheck: [
        { question: '什么时候值得把一次对话沉淀为工作流？', answer: '同类任务会重复出现，且输入、步骤和输出可以被说清时', explanation: '重复性和可标准化是沉淀流程的两个重要信号。' },
      ],
      takeaway: {
        title: '个人 AI 工作流画布',
        items: ['拆任务', '定义输入输出', '明确分工', '设置检查点', '保存模板'],
      },
    },
  ];

  var aliases = {
    'ai-what': 'ai-basics',
    'ai-history': 'ai-basics',
    'prompt-basics': 'ai-prompting',
    'ai-other': 'ai-basics',
  };

  var chapterById = Object.create(null);
  for (var chapterIndex = 0; chapterIndex < chapters.length; chapterIndex += 1) {
    chapterById[chapters[chapterIndex].id] = chapters[chapterIndex];
  }

  var memoryState = null;

  function emptyState() {
    return Object.create(null);
  }

  function isPlainObject(value) {
    if (!value || Object.prototype.toString.call(value) !== '[object Object]') return false;
    var prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function sanitizeState(value) {
    var clean = emptyState();
    if (!isPlainObject(value)) return clean;
    for (var index = 0; index < chapters.length; index += 1) {
      var id = chapters[index].id;
      if (value[id] === STATUS_STARTED || value[id] === STATUS_SEEN) clean[id] = value[id];
    }
    return clean;
  }

  function readState() {
    if (memoryState !== null) return memoryState;
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      memoryState = sanitizeState(raw ? JSON.parse(raw) : {});
    } catch (error) {
      memoryState = emptyState();
    }
    return memoryState;
  }

  function writeState(state) {
    memoryState = sanitizeState(state);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(memoryState));
      return true;
    } catch (error) {
      return false;
    }
  }

  function isKnownChapter(id) {
    return typeof id === 'string' && Object.prototype.hasOwnProperty.call(chapterById, id);
  }

  function getStatus(id) {
    if (!isKnownChapter(id)) return STATUS_UNSEEN;
    return readState()[id] || STATUS_UNSEEN;
  }

  function markStarted(id) {
    if (!isKnownChapter(id)) return STATUS_UNSEEN;
    var state = readState();
    if (state[id] !== STATUS_SEEN && state[id] !== STATUS_STARTED) {
      state[id] = STATUS_STARTED;
      writeState(state);
    }
    return getStatus(id);
  }

  function markSeen(id) {
    if (!isKnownChapter(id)) return STATUS_UNSEEN;
    var state = readState();
    if (state[id] !== STATUS_SEEN) {
      state[id] = STATUS_SEEN;
      writeState(state);
    }
    return getStatus(id);
  }

  function nextIncomplete() {
    for (var index = 0; index < chapters.length; index += 1) {
      if (getStatus(chapters[index].id) !== STATUS_SEEN) return chapters[index].id;
    }
    return null;
  }

  function statusCopy(status) {
    if (status === STATUS_SEEN) return '看过';
    if (status === STATUS_STARTED) return '正在看';
    return '未看';
  }

  function actionCopy(status) {
    if (status === STATUS_SEEN) return '重新查看';
    if (status === STATUS_STARTED) return '继续学习';
    return '开始学习';
  }

  function cardChapterId(card) {
    var explicit = typeof card.getAttribute === 'function' ? card.getAttribute('data-chapter-id') : null;
    if (isKnownChapter(explicit)) return explicit;
    var href = typeof card.getAttribute === 'function' ? card.getAttribute('href') || '' : '';
    var match = /[?&]id=([^&#]+)/.exec(href);
    if (!match) return null;
    try {
      var candidate = decodeURIComponent(match[1]);
      return isKnownChapter(candidate) ? candidate : null;
    } catch (error) {
      return null;
    }
  }

  function initHub(root) {
    var scope = root || (typeof document !== 'undefined' ? document : null);
    if (!scope || typeof scope.querySelectorAll !== 'function') return false;
    var cards = scope.querySelectorAll('.learning-card');
    for (var index = 0; index < cards.length; index += 1) {
      var card = cards[index];
      var id = cardChapterId(card);
      if (!id) continue;
      var status = getStatus(id);
      if (typeof card.setAttribute === 'function') card.setAttribute('data-status', status);
      var statusNode = typeof card.querySelector === 'function' ? card.querySelector('.learning-status') : null;
      if (statusNode) statusNode.textContent = statusCopy(status);
      var actionNode = typeof card.querySelector === 'function' ? card.querySelector('.learning-card-action') : null;
      if (actionNode) actionNode.textContent = actionCopy(status);
    }

    var continueLink = typeof scope.querySelector === 'function' ? scope.querySelector('[data-learning-continue]') : null;
    var nextId = nextIncomplete();
    if (continueLink && nextId && typeof continueLink.setAttribute === 'function') {
      continueLink.setAttribute('href', 'detail.html?type=learn&id=' + encodeURIComponent(nextId));
    }

    var hash = typeof window !== 'undefined' && window.location ? window.location.hash : '';
    var returnedId = hash.indexOf('#chapter-') === 0 ? hash.slice(9) : '';
    if (isKnownChapter(returnedId)) {
      for (var cardIndex = 0; cardIndex < cards.length; cardIndex += 1) {
        if (cardChapterId(cards[cardIndex]) !== returnedId) continue;
        var returnedCard = cards[cardIndex];
        if (returnedCard.classList) returnedCard.classList.add('chapter-return-highlight');
        if (typeof returnedCard.scrollIntoView === 'function') returnedCard.scrollIntoView({ block: 'center', behavior: 'smooth' });
        if (typeof returnedCard.focus === 'function') returnedCard.focus({ preventScroll: true });
        if (typeof setTimeout === 'function') {
          setTimeout(function () {
            if (returnedCard.classList) returnedCard.classList.remove('chapter-return-highlight');
          }, 1800);
        }
        break;
      }
    }
    return true;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function resolveTarget(target) {
    if (target && typeof target === 'object' && 'innerHTML' in target) return target;
    if (typeof document === 'undefined') return null;
    if (typeof target === 'string' && typeof document.querySelector === 'function') return document.querySelector(target);
    if (typeof document.getElementById === 'function') return document.getElementById('learningExperience');
    return null;
  }

  function renderMovedNotice(target) {
    target.innerHTML = '<section class="lesson-moved" aria-labelledby="lessonMovedTitle">' +
      '<p class="lesson-kicker">AI 工具与资源</p>' +
      '<h1 id="lessonMovedTitle">该内容已移至 AI 工具与资源</h1>' +
      '<p>AI 公司、主流模型与外部学习资源现在统一收纳在资源页。</p>' +
      '<a class="lesson-primary-action" href="resources.html">前往 AI 工具与资源</a>' +
      '</section>';
  }

  function renderChapter(id, target) {
    var container = resolveTarget(target);
    if (!container) return false;
    if (id === 'ai-companies' || id === 'ai-models') {
      renderMovedNotice(container);
      return true;
    }

    var resolvedId = aliases[id] || id;
    var chapter = chapterById[resolvedId];
    if (!chapter) return false;
    markStarted(resolvedId);

    var items = chapter.takeaway.items.map(function (item) {
      return '<li>' + escapeHtml(item) + '</li>';
    }).join('');
    var nextId = null;
    for (var index = 0; index < chapters.length; index += 1) {
      if (chapters[index].id === resolvedId && chapters[index + 1]) nextId = chapters[index + 1].id;
    }
    var nextAction = nextId
      ? '<a class="lesson-primary-action" href="detail.html?type=learn&amp;id=' + encodeURIComponent(nextId) + '">下一章</a>'
      : '';

    container.innerHTML = '<article class="lesson" data-chapter-id="' + escapeHtml(resolvedId) + '">' +
      '<nav class="lesson-nav" aria-label="学习导航"><a href="learn.html#chapter-' + escapeHtml(resolvedId) + '">← 返回 AI 新手入门</a><span>' + escapeHtml(chapter.number) + ' / 06</span></nav>' +
      '<header class="lesson-header"><p class="lesson-kicker">轻量学习章节</p><h1>' + escapeHtml(chapter.title) + '</h1><p>' + escapeHtml(chapter.summary) + '</p></header>' +
      '<figure class="lesson-figure"><img src="' + escapeHtml(chapter.image) + '" alt=""><figcaption>' + escapeHtml(chapter.title) + '概念图</figcaption></figure>' +
      '<section class="lesson-case"><p class="lesson-section-label">工作案例</p><h2>' + escapeHtml(chapter.caseStudy.title) + '</h2><p>' + escapeHtml(chapter.caseStudy.situation) + '</p><p><strong>关键启发：</strong>' + escapeHtml(chapter.caseStudy.lesson) + '</p></section>' +
      '<section class="lesson-exercise" data-exercise-type="' + escapeHtml(chapter.exercise.type) + '"><p class="lesson-section-label">2–5 分钟小练习</p><h2>' + escapeHtml(chapter.exercise.title) + '</h2><p>' + escapeHtml(chapter.exercise.instruction) + '</p><div class="lesson-feedback" aria-live="polite"></div></section>' +
      '<section class="lesson-check"><p class="lesson-section-label">快速想一想</p><h2>' + escapeHtml(chapter.quickCheck[0].question) + '</h2><details><summary>查看思路</summary><p><strong>' + escapeHtml(chapter.quickCheck[0].answer) + '</strong></p><p>' + escapeHtml(chapter.quickCheck[0].explanation) + '</p></details></section>' +
      '<aside class="lesson-takeaway"><p class="lesson-section-label">本章带走</p><h2>' + escapeHtml(chapter.takeaway.title) + '</h2><ul>' + items + '</ul></aside>' +
      '<div class="lesson-actions"><button type="button" data-mark-seen>我看完了</button>' + nextAction + '<a href="learn.html#chapter-' + escapeHtml(resolvedId) + '">返回学习路径</a></div>' +
      '</article>';

    if (typeof container.querySelector === 'function') {
      var seenButton = container.querySelector('[data-mark-seen]');
      if (seenButton && typeof seenButton.addEventListener === 'function') {
        seenButton.addEventListener('click', function () {
          markSeen(resolvedId);
          seenButton.textContent = '已看过';
          seenButton.setAttribute('aria-pressed', 'true');
        });
      }
    }
    return true;
  }

  window.AIBeginner = {
    chapters: chapters,
    aliases: aliases,
    getStatus: getStatus,
    markStarted: markStarted,
    markSeen: markSeen,
    nextIncomplete: nextIncomplete,
    initHub: initHub,
    renderChapter: renderChapter,
  };
}());
