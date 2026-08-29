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
      description: '理解 AI、生成式 AI、大模型与 Agent 的关系。',
      image: { webp: 'images/ai-concept.webp', fallback: 'images/ai-concept.png', width: 1200, height: 800, alt: 'AI 与大模型概念关系插画', caption: '图解四个概念如何连接' },
      sections: [
        {
          title: '先看 AI 能做什么',
          paragraphs: ['先从熟悉的工作现场看能力，再理解背后的原理。AI 可以帮你整理、解释、改写和打底，但结果仍需要人确认。'],
          bullets: [],
          scenes: [
            { icon: 'notes', title: '会议内容变清晰', input: '录音转写或零散笔记', assist: '整理为结构化会议纪要', confirm: '确认事实、行动项和责任人，再决定是否发送。', example: '可直接交代：请把这段记录整理为决定、行动项、负责人和待确认事项。' },
            { icon: 'audience', title: '同一材料讲重点', input: '一份长报告或一组公开数据', assist: '按不同对象解释重点与影响', confirm: '核对数字、来源和对象是否匹配。', example: '可直接交代：请分别用给管理者和新同事看的方式，解释这份材料的三个重点。' },
            { icon: 'draft', title: '一个主题写成稿', input: '一个主题、必要背景和语气要求', assist: '改写成邮件、汇报或沟通稿初稿', confirm: '确认事实、语气和最终对外口径。', example: '可直接交代：请把这个主题改写成一封简洁邮件，先给结论，再列三项行动。' },
            { icon: 'repeat', title: '重复工作先打底', input: '重复步骤、样例和期望输出', assist: '先生成模板或小工具草稿', confirm: '检查规则、边界和异常情况后再使用。', example: '可直接交代：请根据这些重复步骤，先起草一个可复用模板，并标出需要人工确认的位置。' },
          ],
        },
        {
          title: '先把四个概念放对位置',
          paragraphs: ['AI 是让机器完成智能任务的大范围；生成式 AI 专门生成文字、图像等新内容；大模型是它的一类核心能力；Agent 则在模型外加上目标拆解、工具调用与执行循环。'],
          bullets: ['AI：最大的能力范围', '生成式 AI：创造新内容', '大模型：从海量数据中学会模式', 'Agent：模型 + 工具 + 执行循环'],
        },
        {
          title: '大模型在做什么',
          paragraphs: ['大模型会把内容切成 Token，根据当前上下文一步步预测下一个最可能的 Token。它在预训练阶段学习通用模式，在每次对话中则使用你当下提供的上下文来回答。'],
          bullets: ['上下文像临时工作记忆', '新对话不等于自动记住过去', '输出流畅不代表已经查证'],
        },
      ],
      history: {
        title: '可选：五个节点看懂 AI 演进',
        image: { webp: 'images/ai-history.webp', fallback: 'images/ai-history.png', width: 1200, height: 800, alt: 'AI 发展历程插画' },
        nodes: ['规则系统', '机器学习', '深度学习', '大模型', 'Agent'],
      },
      caseStudy: {
        title: '为什么新对话不记得上次说过的事？',
        situation: '对话中的上下文像临时工作记忆，新对话通常需要重新提供必要背景。',
        lesson: '把关键背景放进当前任务，不把过去对话当作自动长期记忆。',
      },
      exercise: {
        type: 'token-and-concepts',
        title: '看看下一个 Token 可能是什么',
        instruction: '观察候选内容的概率，再把 AI、大模型与 Agent 放到正确关系中。',
        candidates: [{ label: '初稿', probability: 52 }, { label: '摘要', probability: 31 }, { label: '图表', probability: 17 }],
        relationshipNodes: [
          { label: 'AI', explanation: 'AI 是让机器完成智能任务的最大能力范围。' },
          { label: '生成式 AI', explanation: '生成式 AI 是 AI 的一部分，重点是生成文字、图像等新内容。' },
          { label: '大模型', explanation: '大模型从大量数据中学习模式，可为生成式 AI 提供核心能力。' },
          { label: 'Agent', explanation: 'Agent = 模型 + 目标 + 工具 + 执行与检查循环。它不是简单变大的模型。' },
        ],
        relationshipJudgment: {
          statement: 'Agent 只是会写更长文本的大模型',
          options: ['对', '不对'],
          answer: '不对',
          explanation: 'Agent = 模型 + 目标 + 工具 + 执行与检查循环。它会围绕目标调用工具并检查进展。',
        },
        steps: ['切分 Token', '读取上下文', '预测候选', '选择下一个 Token', '重复直到完成'],
        stepExplanations: ['把输入拆成模型可处理的小单位。', '结合当前对话和材料理解临时语境。', '为多个可能的后续 Token 分配概率。', '按概率与生成策略选择一个 Token。', '把新 Token 放回上下文，继续预测直到完成。'],
      },
      quickCheck: [
        { question: '大模型生成回答时最接近哪种行为？', answer: '根据上下文预测后续 Token', explanation: '流畅输出来自连续预测，不等于模型已经查证事实。' },
        { question: '为什么新对话里常要重新提供背景？', answer: '当前上下文是临时工作记忆', explanation: '不要把上次对话当成必然保留的长期记忆。' },
      ],
      takeaway: {
        title: 'AI 概念关系图与 8 个工作必懂词',
        items: ['Token', '上下文', '多模态', '幻觉', 'RAG', 'Prompt', '工作流', 'Agent'],
        template: 'AI 概念关系\nAI → 生成式 AI → 大模型\nAgent = 大模型 + 目标拆解 + 工具 + 执行循环\n必懂词：Token、上下文、多模态、幻觉、RAG、Prompt、工作流、Agent',
      },
    },
    {
      id: 'ai-boundaries',
      number: '02',
      title: '看清边界',
      description: '知道 AI 擅长什么、不擅长什么，以及为什么流畅不等于正确。',
      image: { webp: 'images/ai-boundaries.webp', fallback: 'images/ai-boundaries.png', width: 1200, height: 800, alt: '人员核验 AI 回答证据的插画', caption: '核验答案背后的证据' },
      sections: [
        { title: 'AI 擅长加速，人擅长把关', paragraphs: ['AI 很适合整理、改写、提取、归纳、生成初稿、发散思路和寻找模式。涉及事实确认、业务取舍、正式承诺和高代价判断时，人必须把关。'], bullets: ['可直接加速：整理、改写、初稿', '需要人机协作：分析、创作、决策准备', '最终由人决定：承诺、审批、高代价选择'] },
        {
          title: '搜索找来源，AI 组织与生成',
          paragraphs: ['先判断要找原始来源，还是要理解和表达。重要事实通常需要两者配合，最后仍由人回到来源确认。'],
          bullets: [],
          compare: [
            { role: '搜索', title: '找事实与出处', description: '实时事实、精确数字和原始出处，优先搜索或联网核对。' },
            { role: 'AI', title: '解释与生成', description: '解释、改写、归纳和生成初稿，可以先请 AI 协助。' },
            { role: '两者配合', title: '重要事实先查再写', description: 'AI 帮助理解和组织，但要回到原始来源确认重要事实。' },
          ],
          choice: {
            question: '要解释刚发布的公开数据，同时确保数字准确，该找谁？',
            options: [
              { value: '搜索', explanation: '搜索适合先找到最新数字和原始出处；如果还要面向对象解释，可再请 AI 协助组织。' },
              { value: 'AI', explanation: 'AI 可以解释和改写，但刚发布的数字仍要回到实时搜索结果与原始来源确认。' },
              { value: '两者配合', explanation: '先用搜索找到最新原始来源，再让 AI 帮助解释，最后由人核对数字和引用。' },
            ],
          },
        },
        { title: '“说得像真的”为什么还会错', paragraphs: ['模型的目标是生成像答案的文本，不是主动查证每个事实。缺少资料时，它仍可能给出流畅、自信但无来源的内容。'], bullets: ['精确数字要找原始来源', '时效信息要确认日期', '内部信息要提供当前材料'] },
      ],
      caseStudy: {
        title: '汇报里出现了原材料没有的增长数字',
        situation: 'AI 为了让叙述更完整，补出了一个看似合理的精确数字。',
        lesson: '精确数据、时效信息和内部信息都要回到可追溯来源核验。',
      },
      exercise: {
        type: 'hallucination-spotter',
        title: '幻觉侦探',
        instruction: '点击句子，区分“可以保留”“需要核验”和“需要修改”。',
        claims: [{ text: '原始表显示本月销量为 12,400 件。', category: '可以保留' }, { text: '本月同比增长 18%。', category: '需要核验' }, { text: '增长完全由新活动带来。', category: '需要修改' }],
      },
      quickCheck: [
        { question: '回答语气很自信时，可以省略哪一步？', answer: '不能因语气自信而省略核验', explanation: '表达流畅只是生成质量的一部分，关键事实仍需证据。' },
        { question: '哪类信息最应该立即回到原文？', answer: '精确数字、时效信息和内部数据', explanation: '这些内容一旦错误，很容易影响汇报与决策。' },
      ],
      takeaway: {
        title: 'AI 能力边界清单',
        items: ['绿：整理、改写、提取、初稿', '黄：分析、创作、决策准备', '红：承诺、审批、高代价判断'],
        template: '边界检查\n绿：可以交给 AI 加速的环节：____\n黄：需要人机协作的环节：____\n红：必须由人判断的环节：____',
      },
    },
    {
      id: 'ai-delegation',
      number: '03',
      title: '学会分工',
      description: '判断一项工作应交给 AI、人机协作，还是必须由人负责。',
      image: { webp: 'images/ai-delegation.webp', fallback: 'images/ai-delegation.png', width: 1200, height: 800, alt: '人与 AI 通过三条通道分工的插画', caption: '把任务放进合适的协作通道' },
      sections: [
        { title: '三种分工方式', paragraphs: ['不是每项工作都要“全交给 AI”。有些任务可以委托，有些适合往返协作，有些必须保留在人手中。'], bullets: ['AI：格式化、整理、提取、初稿、方案发散', '人机协作：分析、汇报、决策准备、内容创作', '人负责：战略选择、优先级、对外口径、审批签字、利益协调'] },
        { title: '分工前先问五个问题', paragraphs: ['一项任务越清晰、越容易检查、错误代价越低，越适合交给 AI。当任务依赖大量业务语境或涉及明确责任，人应该保留主导权。'], bullets: ['目标清晰吗？', '结果可验证吗？', '错误代价高吗？', '需要多少业务语境？', '最终责任归谁？'] },
      ],
      caseStudy: {
        title: '一份月度汇报应该怎么分工？',
        situation: '数据整理、异常发现、优先级判断和跨部门建议的错误代价不同。',
        lesson: 'AI 可以整理和发散，人需要结合业务语境决定重点和行动。',
      },
      exercise: {
        type: 'delegation-sort',
        title: '任务分拣台',
        instruction: '把任务放入 AI、人机协作、人负责三栏，再对照判断理由。',
        tasks: [{ text: '把销售表格统一格式', lane: 'AI' }, { text: '根据数据分析异常原因', lane: '人机协作' }, { text: '决定下月跨部门优先级', lane: '人负责' }],
      },
      quickCheck: [
        { question: '哪类任务更适合先交给 AI？', answer: '目标清晰、结果可验证的整理与初稿任务', explanation: '任务越清晰、越容易检查，越适合委托给 AI。' },
        { question: '月度汇报的优先级判断应由谁主导？', answer: '由人结合业务语境主导', explanation: 'AI 可以辅助整理选项，但最终判断与交付仍由人负责。' },
      ],
      takeaway: {
        title: 'AI 任务分工五问',
        items: ['目标清晰吗', '结果可验证吗', '错误代价高吗', '需要多少业务语境', '最终谁负责'],
        template: 'AI 任务分工五问\n1. 目标清晰吗？\n2. 结果可验证吗？\n3. 错误代价高吗？\n4. 需要多少业务语境？\n5. 最终谁负责？',
      },
    },
    {
      id: 'ai-prompting',
      number: '04',
      title: '把需求说清楚',
      description: '用目标、背景、任务、输出要求四要素，把提示词变成可执行的工作 brief。',
      image: { webp: 'images/ai-prompt.webp', fallback: 'images/ai-prompt.png', width: 1024, height: 1024, alt: '人员与 AI 整理提示词信息的插画', caption: '四个要素组成清晰工作 brief' },
      sections: [
        { title: '提示词就是一份工作 brief', paragraphs: ['不用追求神奇口令。像给同事交代任务一样，把目标、背景、具体任务和输出要求说清楚。'], bullets: ['目标：为什么做，什么算成功', '背景：对象、材料和必要语境', '任务：要 AI 具体做什么', '输出要求：格式、长度、语气和限制'] },
        { title: '用多轮协作逐步校准', paragraphs: ['可以补充一个好示例，也可以约定不确定时先提问。第一版不理想时，指出具体差距、给出修改标准，不必每次重新开始。'], bullets: ['先要结构', '再补信息', '对照标准检查', '针对差距修改'] },
      ],
      caseStudy: {
        title: '从“帮我写汇报”到可执行的任务说明',
        situation: '只给一句宽泛需求，AI 不知道对象、重点、材料边界和输出格式。',
        lesson: '先说清成功标准，再通过多轮反馈逐步校准结果。',
      },
      exercise: {
        type: 'prompt-builder',
        title: 'Prompt 拼装器',
        instruction: '填写四个字段，实时组合一份完整的任务说明。',
        fields: ['目标', '背景', '任务', '输出要求'],
        reference: '目标：让管理层快速理解本月进展。背景：仅使用所附数据。任务：提炼三项进展与两项风险。输出要求：一页简报，标注数据来源。',
      },
      quickCheck: [
        { question: '第一版结果不理想时，最有帮助的做法是什么？', answer: '指出具体差距并说明如何修改', explanation: '具体反馈能让下一轮更接近目标，不必每次重新开始。' },
        { question: '除了四要素，哪种信息能进一步减少猜测？', answer: '好示例或不确定时的处理规则', explanation: '示例能表达期望，处理规则能让 AI 在信息不足时先提问。' },
      ],
      takeaway: {
        title: '四要素 Prompt 模板',
        items: ['目标', '背景', '任务', '输出要求'],
        template: '四要素 Prompt\n目标：____\n背景：____\n任务：____\n输出要求：____\n如果信息不足，请先向我提问。',
      },
    },
    {
      id: 'ai-verification',
      number: '05',
      title: '验证结果',
      description: '区分事实、推论和观点，查来源、对原文，用明确标准检查质量。',
      image: { webp: 'images/ai-verification.webp', fallback: 'images/ai-verification.png', width: 1200, height: 800, alt: '原始材料、AI 回答与核验清单的插画', caption: '从原文到结论的核验路径' },
      sections: [
        { title: '先区分回答里的三种内容', paragraphs: ['事实是材料直接支持的内容；推论是基于事实做的解释；观点是一种判断或建议。三者都可以有，但不应该混在一起写成“已经证明”。'], bullets: ['事实：可回到原文', '推论：需说明推理链', '观点：需标注判断角度'] },
        { title: '五步核验，再检查可用性', paragraphs: ['先查来源、对原文、看时间口径、检查推理关系，再对照任务标准。最后用准确、完整、相关、清晰、可追溯五项检查是否可交付。'], bullets: ['“写得完整”不等于真实', '“引用很多”不等于支持结论', 'AI 可以辅助分析，最终判断与交付仍由人负责'] },
      ],
      caseStudy: {
        title: '“销量上升”能否直接证明“营销有效”？',
        situation: 'AI 把两个先后出现的现象直接写成因果结论，但材料没有排除其他因素。',
        lesson: '事实是材料已支持的内容，推论需要明确标注并补证据。',
      },
      exercise: {
        type: 'evidence-check',
        title: '事实、推论、观点与证据',
        instruction: '逐句标记回答性质，再把关键结论连回原文证据。',
        claims: [{ text: '本月销量比上月上升。', kind: '事实', evidence: '销量表' }, { text: '上升主要是营销活动带来。', kind: '推论', evidence: '尚无足够证据' }, { text: '下月应加大投放。', kind: '观点', evidence: '需要结合成本和其他因素' }],
        evidenceOptions: ['销量表', '营销活动记录', '成本与渠道数据', '尚无足够证据', '需要结合成本和其他因素'],
        versions: [
          { label: '版本 A', text: '销量上升，所以营销活动有效，下月应加大投放。', usable: false, explanation: '把事实、归因和建议连成了确定结论，但没有补足证据。' },
          { label: '版本 B', text: '销量表显示本月销量上升；营销归因仍需补充活动与渠道证据，核验成本后再决定投放。', usable: true, explanation: '区分了事实、待验证推论与后续判断，关键结论也能继续追溯。' },
        ],
      },
      quickCheck: [
        { question: '引用数量多，是否代表结论一定可信？', answer: '不一定，还要确认引用是否真实、相关并支持结论', explanation: '可追溯不只是有链接，还要对原文、时间口径和推理关系。' },
        { question: '“销量上升，所以营销活动有效”属于什么？', answer: '尚需证据的推论', explanation: '销量上升是事实，但归因还要排除促销、季节或渠道变化等其他因素。' },
      ],
      takeaway: {
        title: 'AI 结果核验五步卡',
        items: ['查来源', '对原文', '看时间口径', '检查推理', '对照任务标准'],
        template: 'AI 结果核验五步\n1. 来源在哪里？\n2. 原文真正说了什么？\n3. 时间和统计口径一致吗？\n4. 推理关系成立吗？\n5. 结果符合任务标准吗？',
      },
    },
    {
      id: 'ai-workflow',
      number: '06',
      title: '从对话走向工作流',
      description: '拆任务、定义输入输出、设置检查点，把一次成功对话沉淀为可复用方法。',
      image: { webp: 'images/ai-workflow.webp', fallback: 'images/ai-workflow.png', width: 1200, height: 800, alt: '对话、模板、工作流与 Agent 四阶段插画', caption: '把一次对话沉淀为可复用流程' },
      sections: [
        { title: '从一次成功，到稳定复用', paragraphs: ['一次对话解决临时问题；Prompt 模板让同类任务可以重复使用；工作流则固定输入、步骤、检查点与输出。'], bullets: ['对话：一次临时解决', '模板：复用任务说明', '工作流：固定过程与检查点', 'Agent：在明确边界内调用工具、循环执行'] },
        { title: '沉淀一条工作流的五步', paragraphs: ['先拆任务，再定义每步的输入输出，明确 AI、人机协作和人负责的边界，在关键节点加人工检查，最后保存为模板。'], bullets: ['拆任务', '定义输入输出', '明确分工', '设置检查点', '保存模板'] },
      ],
      caseStudy: {
        title: '把每月重复的汇报从对话变成流程',
        situation: '每次都重新解释材料、步骤和格式，结果不稳定也难以复用。',
        lesson: '固定输入、步骤、人机分工、检查点和输出，再保存为模板。',
      },
      exercise: {
        type: 'workflow-builder',
        title: '工作流排序与检查点',
        instruction: '将步骤排序，标出 AI、人机协作与人负责，再加入人工检查点。',
        steps: [{ text: '收集当月数据', owner: 'AI' }, { text: '提取变化与异常', owner: '人机协作' }, { text: '核对来源和口径', owner: '人负责', checkpoint: true }, { text: '生成汇报初稿', owner: 'AI' }, { text: '确定优先级并交付', owner: '人负责', checkpoint: true }],
        shuffleOrder: [3, 0, 4, 1, 2],
      },
      quickCheck: [
        { question: '什么时候值得把一次对话沉淀为工作流？', answer: '同类任务会重复出现，且输入、步骤和输出可以被说清时', explanation: '重复性和可标准化是沉淀流程的两个重要信号。' },
        { question: 'Agent 和普通对话的重要区别是什么？', answer: 'Agent 会在明确边界内围绕目标调用工具并循环执行', explanation: '边界、工具和检查点比“自动化”三个字更重要。' },
      ],
      takeaway: {
        title: '个人 AI 工作流画布',
        items: ['拆任务', '定义输入输出', '明确分工', '设置检查点', '保存模板'],
        template: '个人 AI 工作流画布\n目标：____\n输入：____\n步骤：1.___ 2.___ 3.___\nAI 负责：____\n人工判断点：____\n输出与最终交付：____',
      },
    },
  ];

  var aliases = Object.assign(Object.create(null), {
    'ai-what': 'ai-basics',
    'ai-history': 'ai-basics',
    'prompt-basics': 'ai-prompting',
    'ai-other': 'ai-basics',
  });

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

  function safeOwnGet(object, key) {
    if (!object || (typeof object !== 'object' && typeof object !== 'function') || typeof key !== 'string') return undefined;
    try {
      return Object.prototype.hasOwnProperty.call(object, key) ? object[key] : undefined;
    } catch (error) {
      return undefined;
    }
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

  function pathStatusCopy(status) {
    if (status === STATUS_SEEN) return '已看';
    if (status === STATUS_STARTED) return '进行中';
    return '未看';
  }

  function seenCount() {
    var count = 0;
    for (var index = 0; index < chapters.length; index += 1) {
      if (getStatus(chapters[index].id) === STATUS_SEEN) count += 1;
    }
    return count;
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

  function returnScrollBehavior() {
    try {
      if (typeof window !== 'undefined' && typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'auto';
    } catch (error) {
      return 'smooth';
    }
    return 'smooth';
  }

  function updateSessionSummary(scope) {
    if (!scope || typeof scope.querySelector !== 'function') return;
    var currentSeenCount = seenCount();
    var countNode = scope.querySelector('[data-learning-seen-count]');
    if (countNode) {
      countNode.textContent = String(currentSeenCount);
      return;
    }
    var summaryNode = scope.querySelector('[data-learning-summary]');
    if (summaryNode) summaryNode.textContent = '已看 ' + currentSeenCount + ' / ' + chapters.length;
  }

  function copyToolTemplate(button) {
    var card = null;
    if (button && typeof button.closest === 'function') {
      card = button.closest('.learning-tool-card') || button.closest('.lesson-takeaway');
    }
    if (!card || typeof card.querySelector !== 'function') return;
    var source = card.querySelector('[data-template-content]');
    var feedback = card.querySelector('[data-copy-feedback]');
    if (!source || !feedback) return;
    if (button.disabled) return;

    var templateText = source.textContent || '';
    var copyToken = (button.__learningCopyToken || 0) + 1;
    var settled = false;
    button.__learningCopyToken = copyToken;
    button.disabled = true;
    if (typeof button.setAttribute === 'function') button.setAttribute('aria-busy', 'true');
    feedback.textContent = '';

    function showCopyFallback(card, value) {
      var fallback = card.querySelector('[data-copy-fallback]');
      if (!fallback) {
        var ownerDocument = card.ownerDocument || (typeof document !== 'undefined' ? document : null);
        if (!ownerDocument || typeof ownerDocument.createElement !== 'function' || typeof card.appendChild !== 'function') return;
        fallback = ownerDocument.createElement('textarea');
        fallback.className = 'tool-copy-fallback';
        fallback.readOnly = true;
        fallback.setAttribute('readonly', '');
        fallback.setAttribute('data-copy-fallback', '');
        fallback.setAttribute('aria-label', '手动复制模板');
        card.appendChild(fallback);
      }
      fallback.value = value;
      fallback.hidden = false;
      try {
        if (typeof fallback.focus === 'function') fallback.focus();
        if (typeof fallback.select === 'function') fallback.select();
        else if (typeof fallback.setSelectionRange === 'function') fallback.setSelectionRange(0, value.length);
      } catch (error) {
        try {
          if (typeof fallback.setSelectionRange === 'function') fallback.setSelectionRange(0, value.length);
        } catch (selectionError) {}
      }
    }

    function hideCopyFallback() {
      var fallback = card.querySelector('[data-copy-fallback]');
      if (fallback) fallback.hidden = true;
    }

    function announce(message) {
      if (typeof setTimeout === 'function') {
        setTimeout(function () {
          if (button.__learningCopyToken === copyToken) feedback.textContent = message;
        }, 0);
      } else if (button.__learningCopyToken === copyToken) {
        feedback.textContent = message;
      }
    }

    function finishCopy(succeeded) {
      if (settled || button.__learningCopyToken !== copyToken) return;
      settled = true;
      if (succeeded) hideCopyFallback();
      else showCopyFallback(card, templateText);
      announce(succeeded ? '已复制' : '请手动复制');
      button.disabled = false;
      if (typeof button.removeAttribute === 'function') button.removeAttribute('aria-busy');
      else if (typeof button.setAttribute === 'function') button.setAttribute('aria-busy', 'false');
    }

    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
        finishCopy(false);
        return;
      }
      var result = navigator.clipboard.writeText(templateText);
      if (result && typeof result.then === 'function') {
        result.then(function () { finishCopy(true); }, function () { finishCopy(false); });
      } else {
        finishCopy(true);
      }
    } catch (error) {
      finishCopy(false);
    }
  }

  function bindCopyTools(scope) {
    if (!scope || typeof scope.querySelectorAll !== 'function') return;
    var buttons = scope.querySelectorAll('[data-copy-template]');
    for (var index = 0; index < buttons.length; index += 1) {
      (function (button) {
        if (!button || typeof button.addEventListener !== 'function' ||
          (typeof button.getAttribute === 'function' && button.getAttribute('data-copy-bound') === 'true')) return;
        if (typeof button.setAttribute === 'function') button.setAttribute('data-copy-bound', 'true');
        button.addEventListener('click', function () { copyToolTemplate(button); });
      }(buttons[index]));
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
    updateSessionSummary(scope);
    bindCopyTools(scope);

    var hash = typeof window !== 'undefined' && window.location ? window.location.hash : '';
    var returnedId = hash.indexOf('#chapter-') === 0 ? hash.slice(9) : '';
    if (isKnownChapter(returnedId)) {
      for (var cardIndex = 0; cardIndex < cards.length; cardIndex += 1) {
        if (cardChapterId(cards[cardIndex]) !== returnedId) continue;
        var returnedCard = cards[cardIndex];
        if (returnedCard.classList) returnedCard.classList.add('chapter-return-highlight');
        if (typeof returnedCard.scrollIntoView === 'function') {
          returnedCard.scrollIntoView({ block: 'center', behavior: returnScrollBehavior() });
        }
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
    if (target && typeof target === 'object' && ('innerHTML' in target || typeof target.appendChild === 'function')) return target;
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

  function canonicalizeLearningUrl(originalId, resolvedId) {
    if (originalId === resolvedId || typeof history === 'undefined' || typeof location === 'undefined') return;
    try {
      var replaceState = history.replaceState;
      if (typeof replaceState !== 'function') return;
      var url = new URL(location.href);
      url.searchParams.set('type', 'learn');
      url.searchParams.set('id', resolvedId);
      replaceState.call(history, history.state || null, '', url.pathname + url.search + url.hash);
    } catch (error) {}
  }

  function clearNode(node) {
    if (typeof node.replaceChildren === 'function') node.replaceChildren();
    else if ('textContent' in node) node.textContent = '';
  }

  function element(ownerDocument, name, className, text) {
    var node = ownerDocument.createElement(name);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function interactionFieldset(ownerDocument, legendText, className) {
    var fieldset = element(ownerDocument, 'fieldset', 'lesson-interaction' + (className ? ' ' + className : ''));
    fieldset.appendChild(element(ownerDocument, 'legend', '', legendText));
    return fieldset;
  }

  function interactionButton(ownerDocument, text, hook, value) {
    var button = element(ownerDocument, 'button', 'lesson-choice', text);
    button.setAttribute('type', 'button');
    button.setAttribute(hook, '');
    if (value !== undefined) button.setAttribute('data-choice-value', String(value));
    return button;
  }

  function setChoiceState(group, activeButton) {
    for (var index = 0; index < group.length; index += 1) {
      var selected = group[index] === activeButton;
      group[index].setAttribute('aria-pressed', selected ? 'true' : 'false');
      if (group[index].classList) group[index].classList.toggle('is-selected', selected);
    }
  }

  function dispatchExerciseAttempt(root, message) {
    if (!root) return;
    root.setAttribute('data-exercise-attempted', 'true');
    var feedback = typeof root.querySelector === 'function' ? root.querySelector('.lesson-feedback') : null;
    if (feedback) feedback.textContent = message;
    var ownerDocument = root.ownerDocument || (typeof document !== 'undefined' ? document : null);
    try {
      var view = ownerDocument && ownerDocument.defaultView;
      var event = view && typeof view.CustomEvent === 'function'
        ? new view.CustomEvent('learning-exercise-attempt', { bubbles: true, detail: { message: message } })
        : { type: 'learning-exercise-attempt', detail: { message: message } };
      if (event && typeof root.dispatchEvent === 'function') root.dispatchEvent(event);
    } catch (error) {}
  }

  function appendCapabilityScenes(ownerDocument, root, scenes) {
    var grid = element(ownerDocument, 'div', 'lesson-scene-grid');
    for (var sceneIndex = 0; sceneIndex < scenes.length; sceneIndex += 1) {
      (function (scene, currentSceneIndex) {
        var card = element(ownerDocument, 'article', 'lesson-scene-card');
        card.setAttribute('data-scene-card', String(currentSceneIndex));
        var sceneButton = element(ownerDocument, 'button', 'lesson-scene-toggle');
        sceneButton.setAttribute('type', 'button');
        sceneButton.setAttribute('data-scene-toggle', String(currentSceneIndex));
        sceneButton.setAttribute('aria-expanded', 'false');
        var panelId = 'lesson-scene-panel-' + currentSceneIndex;
        sceneButton.setAttribute('aria-controls', panelId);
        var icon = element(ownerDocument, 'span', 'lesson-scene-icon');
        icon.setAttribute('data-scene-icon', scene.icon);
        icon.setAttribute('aria-hidden', 'true');
        sceneButton.appendChild(icon);
        sceneButton.appendChild(element(ownerDocument, 'span', 'lesson-scene-title', scene.title));
        sceneButton.appendChild(element(ownerDocument, 'span', 'lesson-scene-cue', '查看现场'));
        var panel = element(ownerDocument, 'div', 'lesson-scene-panel');
        panel.setAttribute('id', panelId);
        panel.setAttribute('data-scene-panel', String(currentSceneIndex));
        panel.hidden = true;
        var details = element(ownerDocument, 'dl', 'lesson-scene-details');
        var labels = ['输入材料', 'AI 协助', '人要确认'];
        var values = [scene.input, scene.assist, scene.confirm];
        for (var detailIndex = 0; detailIndex < labels.length; detailIndex += 1) {
          details.appendChild(element(ownerDocument, 'dt', '', labels[detailIndex]));
          details.appendChild(element(ownerDocument, 'dd', '', values[detailIndex]));
        }
        panel.appendChild(details);
        var sceneExample = element(ownerDocument, 'p', 'lesson-scene-example');
        sceneExample.textContent = scene.example;
        panel.appendChild(sceneExample);
        sceneButton.addEventListener('click', function () {
          var expanded = sceneButton.getAttribute('aria-expanded') !== 'true';
          sceneButton.setAttribute('aria-expanded', expanded ? 'true' : 'false');
          panel.hidden = !expanded;
          sceneButton.querySelector('.lesson-scene-cue').textContent = expanded ? '收起现场' : '查看现场';
        });
        card.appendChild(sceneButton);
        card.appendChild(panel);
        grid.appendChild(card);
      }(scenes[sceneIndex], sceneIndex));
    }
    root.appendChild(grid);
  }

  function appendBoundaryComparison(ownerDocument, root, sectionData) {
    var comparison = element(ownerDocument, 'div', 'lesson-boundary-compare');
    comparison.setAttribute('aria-label', '搜索、AI 与两者配合的用途对比');
    for (var compareIndex = 0; compareIndex < sectionData.compare.length; compareIndex += 1) {
      var compareItem = sectionData.compare[compareIndex];
      var card = element(ownerDocument, 'article', 'lesson-boundary-card');
      card.setAttribute('data-boundary-role', compareItem.role);
      card.appendChild(element(ownerDocument, 'p', 'lesson-boundary-role', compareItem.role));
      card.appendChild(element(ownerDocument, 'h3', '', compareItem.title));
      card.appendChild(element(ownerDocument, 'p', '', compareItem.description));
      comparison.appendChild(card);
    }
    root.appendChild(comparison);

    var choiceFieldset = interactionFieldset(ownerDocument, sectionData.choice.question, 'lesson-boundary-choice');
    var choiceRow = element(ownerDocument, 'div', 'lesson-choice-row');
    var boundaryFeedback = element(ownerDocument, 'p', 'lesson-boundary-feedback');
    boundaryFeedback.setAttribute('data-boundary-feedback', '');
    boundaryFeedback.setAttribute('aria-live', 'polite');
    for (var optionIndex = 0; optionIndex < sectionData.choice.options.length; optionIndex += 1) {
      (function (option) {
        var button = interactionButton(ownerDocument, option.value, 'data-boundary-choice', option.value);
        button.setAttribute('aria-pressed', 'false');
        button.addEventListener('click', function () {
          setChoiceState(choiceRow.querySelectorAll('[data-boundary-choice]'), button);
          boundaryFeedback.textContent = option.explanation;
        });
        choiceRow.appendChild(button);
      }(sectionData.choice.options[optionIndex]));
    }
    choiceFieldset.appendChild(choiceRow);
    choiceFieldset.appendChild(boundaryFeedback);
    root.appendChild(choiceFieldset);
  }

  function appendFlowSteps(ownerDocument, root, steps, explanations) {
    var flow = element(ownerDocument, 'ol', 'lesson-model-flow');
    flow.setAttribute('aria-label', '大模型生成内容的五个步骤');
    for (var index = 0; index < steps.length; index += 1) {
      var item = element(ownerDocument, 'li', '');
      var button = element(ownerDocument, 'button', 'lesson-flow-step');
      button.setAttribute('type', 'button');
      button.setAttribute('data-flow-step', String(index));
      button.setAttribute('aria-expanded', 'false');
      button.appendChild(element(ownerDocument, 'span', 'lesson-flow-number', String(index + 1)));
      button.appendChild(element(ownerDocument, 'span', '', steps[index]));
      var explanation = element(ownerDocument, 'p', 'lesson-flow-explanation', explanations[index]);
      explanation.setAttribute('data-flow-explanation', String(index));
      explanation.hidden = true;
      (function (flowButton, flowExplanation, stepName) {
        flowButton.addEventListener('click', function () {
          var expanded = flowButton.getAttribute('aria-expanded') !== 'true';
          flowButton.setAttribute('aria-expanded', expanded ? 'true' : 'false');
          flowExplanation.hidden = !expanded;
          dispatchExerciseAttempt(root, stepName + '：' + flowExplanation.textContent);
        });
      }(button, explanation, steps[index]));
      item.appendChild(button);
      item.appendChild(explanation);
      flow.appendChild(item);
    }
    root.appendChild(flow);
  }

  function renderTokenPrediction(exercise, root) {
    var ownerDocument = root.ownerDocument;
    var fieldset = interactionFieldset(ownerDocument, '“请把月度数据整理成一份……”下一个 Token 可能是什么？');
    fieldset.appendChild(element(ownerDocument, 'p', 'lesson-interaction-note', '模型会给多个候选分配概率，再继续生成；这里没有考试式的唯一操作。'));
    var options = element(ownerDocument, 'div', 'lesson-choice-row');
    for (var index = 0; index < exercise.candidates.length; index += 1) {
      (function (candidate) {
        var button = interactionButton(ownerDocument, candidate.label + ' · ' + candidate.probability + '%', 'data-token-option', candidate.label);
        button.setAttribute('aria-pressed', 'false');
        button.addEventListener('click', function () {
          setChoiceState(options.querySelectorAll('[data-token-option]'), button);
          dispatchExerciseAttempt(root, candidate.label + ' 是一个候选。概率表示模型此刻的预测倾向，不代表事实已经核验。');
        });
        options.appendChild(button);
      }(exercise.candidates[index]));
    }
    fieldset.appendChild(options);
    root.appendChild(fieldset);

    var conceptMap = element(ownerDocument, 'div', 'lesson-concept-map');
    conceptMap.appendChild(element(ownerDocument, 'h3', '', '四个概念怎么连接'));
    conceptMap.appendChild(element(ownerDocument, 'p', '', '依次点开节点：前三个表示范围与能力关系，Agent 则是在模型外加入行动机制。'));
    var nodeList = element(ownerDocument, 'ol', 'lesson-concept-nodes');
    for (var nodeIndex = 0; nodeIndex < exercise.relationshipNodes.length; nodeIndex += 1) {
      (function (relationshipNode) {
        var nodeItem = element(ownerDocument, 'li', '');
        var nodeButton = interactionButton(ownerDocument, relationshipNode.label, 'data-concept-node', relationshipNode.label);
        nodeButton.className += ' lesson-concept-node';
        nodeButton.setAttribute('aria-pressed', 'false');
        nodeButton.addEventListener('click', function () {
          setChoiceState(nodeList.querySelectorAll('[data-concept-node]'), nodeButton);
          dispatchExerciseAttempt(root, relationshipNode.label + '：' + relationshipNode.explanation);
        });
        nodeItem.appendChild(nodeButton);
        nodeList.appendChild(nodeItem);
      }(exercise.relationshipNodes[nodeIndex]));
    }
    conceptMap.appendChild(nodeList);

    var judgment = exercise.relationshipJudgment;
    var judgmentFieldset = interactionFieldset(ownerDocument, judgment.statement, 'lesson-concept-judgment');
    judgmentFieldset.setAttribute('data-concept-judgment-group', '');
    judgmentFieldset.appendChild(element(ownerDocument, 'p', 'lesson-interaction-note', '选一个判断，立即看解释；不计分，可以重试。'));
    var judgmentOptions = element(ownerDocument, 'div', 'lesson-choice-row');
    for (var judgmentIndex = 0; judgmentIndex < judgment.options.length; judgmentIndex += 1) {
      (function (option) {
        var judgmentButton = interactionButton(ownerDocument, option, 'data-concept-judgment', option);
        judgmentButton.setAttribute('aria-pressed', 'false');
        judgmentButton.addEventListener('click', function () {
          setChoiceState(judgmentOptions.querySelectorAll('[data-concept-judgment]'), judgmentButton);
          var lead = option === judgment.answer ? '不对，理解到位。' : '这个说法容易混淆能力边界。';
          dispatchExerciseAttempt(root, lead + judgment.explanation);
        });
        judgmentOptions.appendChild(judgmentButton);
      }(judgment.options[judgmentIndex]));
    }
    judgmentFieldset.appendChild(judgmentOptions);
    conceptMap.appendChild(judgmentFieldset);
    root.appendChild(conceptMap);
    appendFlowSteps(ownerDocument, root, exercise.steps, exercise.stepExplanations);
  }

  function renderEvidenceSpotter(exercise, root) {
    var ownerDocument = root.ownerDocument;
    var categories = ['可以保留', '需要核验', '需要修改'];
    for (var index = 0; index < exercise.claims.length; index += 1) {
      (function (claim, claimIndex) {
        var fieldset = interactionFieldset(ownerDocument, '判断 ' + (claimIndex + 1) + '：' + claim.text);
        var options = element(ownerDocument, 'div', 'lesson-choice-row');
        for (var categoryIndex = 0; categoryIndex < categories.length; categoryIndex += 1) {
          (function (category) {
            var button = interactionButton(ownerDocument, category, 'data-claim-choice', category);
            button.setAttribute('data-claim-index', String(claimIndex));
            button.setAttribute('aria-pressed', 'false');
            button.addEventListener('click', function () {
              setChoiceState(options.querySelectorAll('[data-claim-choice]'), button);
              var explanation = claim.category === '可以保留'
                ? '原始材料直接支持这句话，可以保留并带上来源。'
                : claim.category === '需要核验'
                  ? '精确数字或时效信息要回到原始来源核验。'
                  : '材料不足以支持这个强因果结论，需要改成谨慎表达。';
              dispatchExerciseAttempt(root, (category === claim.category ? '思路一致。' : '可以换个角度再看。') + explanation);
            });
            options.appendChild(button);
          }(categories[categoryIndex]));
        }
        fieldset.appendChild(options);
        root.appendChild(fieldset);
      }(exercise.claims[index], index));
    }
  }

  function renderDelegationSorter(exercise, root) {
    var ownerDocument = root.ownerDocument;
    var lanes = ['AI', '人机协作', '人负责'];
    for (var index = 0; index < exercise.tasks.length; index += 1) {
      (function (task, taskIndex) {
        var fieldset = interactionFieldset(ownerDocument, '任务 ' + (taskIndex + 1) + '：' + task.text);
        var options = element(ownerDocument, 'div', 'lesson-choice-row lesson-lane-row');
        for (var laneIndex = 0; laneIndex < lanes.length; laneIndex += 1) {
          (function (lane) {
            var button = interactionButton(ownerDocument, lane, 'data-sort-choice', lane);
            button.setAttribute('data-task-index', String(taskIndex));
            button.setAttribute('aria-pressed', 'false');
            button.addEventListener('click', function () {
              setChoiceState(options.querySelectorAll('[data-sort-choice]'), button);
              var explanation = task.lane === 'AI'
                ? '这项工作目标明确、结果容易检查，适合先让 AI 加速。'
                : task.lane === '人机协作'
                  ? 'AI 可以提供分析线索，人要结合业务语境判断。'
                  : '这项工作涉及优先级与责任，需要由人主导。';
              dispatchExerciseAttempt(root, (lane === task.lane ? '这个分工很合适。' : '还可以重新分工。') + explanation);
            });
            options.appendChild(button);
          }(lanes[laneIndex]));
        }
        fieldset.appendChild(options);
        root.appendChild(fieldset);
      }(exercise.tasks[index], index));
    }
  }

  function renderPromptBuilder(exercise, root) {
    var ownerDocument = root.ownerDocument;
    var fieldset = interactionFieldset(ownerDocument, '填写四要素，拼出你的工作 brief', 'lesson-prompt-builder');
    var formGrid = element(ownerDocument, 'div', 'lesson-prompt-fields');
    var preview = element(ownerDocument, 'pre', 'lesson-prompt-preview');
    var hasAnnouncedInput = false;
    preview.setAttribute('data-prompt-preview', '');

    function updatePreview() {
      var lines = [];
      var fields = formGrid.querySelectorAll('[data-prompt-field]');
      var hasMeaningfulInput = false;
      for (var fieldIndex = 0; fieldIndex < fields.length; fieldIndex += 1) {
        lines.push(fields[fieldIndex].getAttribute('data-prompt-field') + '：' + fields[fieldIndex].value);
        if (fields[fieldIndex].value.trim()) hasMeaningfulInput = true;
      }
      preview.textContent = lines.join('\n');
      if (!hasAnnouncedInput && hasMeaningfulInput) {
        hasAnnouncedInput = true;
        dispatchExerciseAttempt(root, '任务说明已开始拼装，你可以继续补充和调整。');
      }
    }

    for (var index = 0; index < exercise.fields.length; index += 1) {
      var label = element(ownerDocument, 'label', 'lesson-prompt-field');
      label.appendChild(element(ownerDocument, 'span', '', exercise.fields[index]));
      var input = index === 1 || index === 2 ? element(ownerDocument, 'textarea', '') : element(ownerDocument, 'input', '');
      if (input.tagName === 'INPUT') input.setAttribute('type', 'text');
      input.setAttribute('data-prompt-field', exercise.fields[index]);
      input.setAttribute('placeholder', '写下' + exercise.fields[index]);
      input.addEventListener('input', updatePreview);
      label.appendChild(input);
      formGrid.appendChild(label);
    }
    fieldset.appendChild(formGrid);
    fieldset.appendChild(element(ownerDocument, 'p', 'lesson-interaction-note', '实时拼装结果（你的输入只会作为文字显示）'));
    fieldset.appendChild(preview);
    var reference = element(ownerDocument, 'details', 'lesson-exercise-reference');
    reference.appendChild(element(ownerDocument, 'summary', '', '看看一个完整示例'));
    reference.appendChild(element(ownerDocument, 'p', '', exercise.reference));
    fieldset.appendChild(reference);
    root.appendChild(fieldset);
  }

  function renderClaimClassifier(exercise, root) {
    var ownerDocument = root.ownerDocument;
    var kinds = ['事实', '推论', '观点'];
    for (var index = 0; index < exercise.claims.length; index += 1) {
      (function (claim, claimIndex) {
        var fieldset = interactionFieldset(ownerDocument, '句子 ' + (claimIndex + 1) + '：' + claim.text);
        var options = element(ownerDocument, 'div', 'lesson-choice-row');
        for (var kindIndex = 0; kindIndex < kinds.length; kindIndex += 1) {
          (function (kind) {
            var button = interactionButton(ownerDocument, kind, 'data-claim-kind', kind);
            button.setAttribute('data-claim-index', String(claimIndex));
            button.setAttribute('aria-pressed', 'false');
            button.addEventListener('click', function () {
              setChoiceState(options.querySelectorAll('[data-claim-kind]'), button);
              dispatchExerciseAttempt(root, (kind === claim.kind ? '分类合理。' : '可以再对照定义。') + '接下来请为这句话主动选择证据。');
            });
            options.appendChild(button);
          }(kinds[kindIndex]));
        }
        fieldset.appendChild(options);

        if (claimIndex === 1) {
          var evidenceTitle = element(ownerDocument, 'p', 'lesson-evidence-label', '关键归因：连接一条最合适的证据');
          fieldset.appendChild(evidenceTitle);
          var evidenceOptions = element(ownerDocument, 'div', 'lesson-choice-row lesson-evidence-options');
          evidenceOptions.setAttribute('role', 'group');
          evidenceOptions.setAttribute('aria-label', '为关键归因句选择证据');
          for (var evidenceIndex = 0; evidenceIndex < exercise.evidenceOptions.length; evidenceIndex += 1) {
            (function (evidenceOption) {
              var evidenceButton = interactionButton(ownerDocument, evidenceOption, 'data-evidence-choice', evidenceOption);
              evidenceButton.setAttribute('data-claim-index', String(claimIndex));
              evidenceButton.setAttribute('aria-pressed', 'false');
              evidenceButton.addEventListener('click', function () {
                setChoiceState(evidenceOptions.querySelectorAll('[data-evidence-choice]'), evidenceButton);
                dispatchExerciseAttempt(root, (evidenceOption === claim.evidence ? '证据连接合理。' : '这条证据还不能完整支持句子。') + '建议连接：' + claim.evidence + '。');
              });
              evidenceOptions.appendChild(evidenceButton);
            }(exercise.evidenceOptions[evidenceIndex]));
          }
          fieldset.appendChild(evidenceOptions);
        }
        root.appendChild(fieldset);
      }(exercise.claims[index], index));
    }

    var versionFieldset = interactionFieldset(ownerDocument, '比较两个版本：哪一个更适合直接进入下一步工作？', 'lesson-version-compare');
    var versionOptions = element(ownerDocument, 'div', 'lesson-version-options');
    for (var versionIndex = 0; versionIndex < exercise.versions.length; versionIndex += 1) {
      (function (version) {
        var versionCard = element(ownerDocument, 'div', 'lesson-version-card');
        versionCard.appendChild(element(ownerDocument, 'b', '', version.label));
        versionCard.appendChild(element(ownerDocument, 'p', '', version.text));
        var versionButton = interactionButton(ownerDocument, '选择' + version.label, 'data-version-choice', version.label);
        versionButton.setAttribute('aria-pressed', 'false');
        versionButton.addEventListener('click', function () {
          setChoiceState(versionOptions.querySelectorAll('[data-version-choice]'), versionButton);
          dispatchExerciseAttempt(root, (version.usable ? '这个版本更可用。' : '这个版本还需要补充。') + version.explanation);
        });
        versionCard.appendChild(versionButton);
        versionOptions.appendChild(versionCard);
      }(exercise.versions[versionIndex]));
    }
    versionFieldset.appendChild(versionOptions);
    root.appendChild(versionFieldset);
  }

  function renderWorkflowSorter(exercise, root) {
    var ownerDocument = root.ownerDocument;
    var steps = [];
    for (var index = 0; index < exercise.shuffleOrder.length; index += 1) {
      var sourceIndex = exercise.shuffleOrder[index];
      steps.push({
        key: String(sourceIndex),
        text: exercise.steps[sourceIndex].text,
        owner: exercise.steps[sourceIndex].owner,
        checkpoint: Boolean(exercise.steps[sourceIndex].checkpoint),
        userOwner: null,
        userCheckpoint: null,
      });
    }
    var fieldset = interactionFieldset(ownerDocument, '排列月度汇报步骤，并检查分工与人工检查点', 'lesson-workflow-builder');
    var list = element(ownerDocument, 'ol', 'lesson-workflow-list');
    var recommendedOrder = exercise.steps.map(function (step) { return step.text; });
    fieldset.appendChild(list);
    root.appendChild(fieldset);

    function renderList(focusKey, focusAction) {
      clearNode(list);
      for (var stepIndex = 0; stepIndex < steps.length; stepIndex += 1) {
        (function (step, currentIndex) {
          var item = element(ownerDocument, 'li', 'lesson-workflow-step');
          item.setAttribute('data-step-key', step.key);
          var copy = element(ownerDocument, 'div', 'lesson-workflow-copy');
          copy.appendChild(element(ownerDocument, 'b', '', step.text));
          item.appendChild(copy);
          var actions = element(ownerDocument, 'div', 'lesson-workflow-actions');
          var up = interactionButton(ownerDocument, '上移', 'data-workflow-move', 'up');
          var down = interactionButton(ownerDocument, '下移', 'data-workflow-move', 'down');
          up.setAttribute('data-step-key', step.key);
          down.setAttribute('data-step-key', step.key);
          up.setAttribute('data-focus-action', 'up');
          down.setAttribute('data-focus-action', 'down');
          up.disabled = currentIndex === 0;
          down.disabled = currentIndex === steps.length - 1;
          function move(direction, button) {
            var targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
            if (targetIndex < 0 || targetIndex >= steps.length) return;
            var swap = steps[targetIndex];
            steps[targetIndex] = steps[currentIndex];
            steps[currentIndex] = swap;
            renderList(step.key, button.getAttribute('data-focus-action'));
            var currentOrder = steps.map(function (orderedStep) { return orderedStep.text; });
            var orderMatches = currentOrder.join('\n') === recommendedOrder.join('\n');
            dispatchExerciseAttempt(root, (orderMatches ? '顺序合理。' : '当前顺序还可以再调整。') + '稳定工作流要让输入、分析、核验和交付依次衔接。');
          }
          up.addEventListener('click', function () { move('up', up); });
          down.addEventListener('click', function () { move('down', down); });
          actions.appendChild(up);
          actions.appendChild(down);

          var owners = ['AI', '人机协作', '人负责'];
          var ownerGroup = element(ownerDocument, 'div', 'lesson-workflow-owner');
          ownerGroup.setAttribute('role', 'group');
          ownerGroup.setAttribute('aria-label', step.text + ' · 分工');
          ownerGroup.appendChild(element(ownerDocument, 'span', 'lesson-workflow-question', '这一步谁负责？'));
          for (var ownerIndex = 0; ownerIndex < owners.length; ownerIndex += 1) {
            (function (owner) {
              var ownerButton = interactionButton(ownerDocument, owner, 'data-workflow-owner', owner);
              ownerButton.setAttribute('data-step-key', step.key);
              ownerButton.setAttribute('aria-label', step.text + ' · 分工：' + owner);
              ownerButton.setAttribute('aria-pressed', step.userOwner === owner ? 'true' : 'false');
              if (step.userOwner === owner && ownerButton.classList) ownerButton.classList.add('is-selected');
              ownerButton.addEventListener('click', function () {
                step.userOwner = owner;
                setChoiceState(ownerGroup.querySelectorAll('[data-workflow-owner]'), ownerButton);
                dispatchExerciseAttempt(root, '已选择责任分工。再判断是否需要人工检查点，然后核对这一环节。');
              });
              ownerGroup.appendChild(ownerButton);
            }(owners[ownerIndex]));
          }
          actions.appendChild(ownerGroup);

          var checkpointGroup = element(ownerDocument, 'div', 'lesson-workflow-checkpoints');
          checkpointGroup.setAttribute('role', 'group');
          checkpointGroup.setAttribute('aria-label', step.text + ' · 人工检查点');
          checkpointGroup.appendChild(element(ownerDocument, 'span', 'lesson-workflow-question', '需要人工检查吗？'));
          var checkpointChoices = [{ label: '需要', value: true }, { label: '不需要', value: false }];
          for (var checkpointIndex = 0; checkpointIndex < checkpointChoices.length; checkpointIndex += 1) {
            (function (choice) {
              var checkpointButton = interactionButton(ownerDocument, choice.label, 'data-workflow-checkpoint', choice.value ? 'true' : 'false');
              checkpointButton.setAttribute('data-step-key', step.key);
              checkpointButton.setAttribute('aria-label', step.text + ' · 人工检查点：' + choice.label);
              checkpointButton.setAttribute('aria-pressed', step.userCheckpoint === choice.value ? 'true' : 'false');
              if (step.userCheckpoint === choice.value && checkpointButton.classList) checkpointButton.classList.add('is-selected');
              checkpointButton.addEventListener('click', function () {
                step.userCheckpoint = choice.value;
                setChoiceState(checkpointGroup.querySelectorAll('[data-workflow-checkpoint]'), checkpointButton);
                dispatchExerciseAttempt(root, '已选择检查点设置。完成责任分工后，可以核对这一环节。');
              });
              checkpointGroup.appendChild(checkpointButton);
            }(checkpointChoices[checkpointIndex]));
          }
          actions.appendChild(checkpointGroup);

          var result = element(ownerDocument, 'p', 'lesson-workflow-result');
          result.setAttribute('data-workflow-result', '');
          result.hidden = true;
          var checkButton = interactionButton(ownerDocument, '核对这一环节', 'data-workflow-check', step.key);
          checkButton.setAttribute('data-step-key', step.key);
          checkButton.addEventListener('click', function () {
            if (step.userOwner === null || step.userCheckpoint === null) {
              dispatchExerciseAttempt(root, '先选择责任分工与是否需要人工检查，再核对建议。');
              return;
            }
            var ownerMatches = step.userOwner === step.owner;
            var checkpointMatches = step.userCheckpoint === step.checkpoint;
            result.hidden = false;
            result.textContent = '建议：' + step.owner + '负责；' + (step.checkpoint ? '设置人工检查点。' : '无需单独设置人工检查点。');
            dispatchExerciseAttempt(root, (ownerMatches && checkpointMatches ? '你的设置与建议一致。' : '可以对照建议继续调整。') + result.textContent);
          });
          actions.appendChild(checkButton);
          actions.appendChild(result);
          item.appendChild(actions);
          list.appendChild(item);
        }(steps[stepIndex], stepIndex));
      }
      if (focusKey !== undefined && focusAction) {
        var focusTarget = list.querySelector('[data-step-key="' + focusKey + '"][data-focus-action="' + focusAction + '"]');
        try {
          if (focusTarget && typeof focusTarget.focus === 'function') focusTarget.focus({ preventScroll: true });
        } catch (error) {}
      }
    }
    renderList();

    var orderCheck = interactionButton(ownerDocument, '核对步骤顺序', 'data-workflow-check-order', 'order');
    orderCheck.addEventListener('click', function () {
      var currentOrder = steps.map(function (orderedStep) { return orderedStep.text; });
      var orderMatches = currentOrder.join('\n') === recommendedOrder.join('\n');
      dispatchExerciseAttempt(root, orderMatches ? '步骤顺序合理，接下来核对每一步的分工与检查点。' : '顺序还可以调整：先收集输入，再分析、核验、形成初稿并由人确定交付。');
    });
    fieldset.appendChild(orderCheck);
  }

  var exerciseRenderers = {
    'token-and-concepts': renderTokenPrediction,
    'hallucination-spotter': renderEvidenceSpotter,
    'delegation-sort': renderDelegationSorter,
    'prompt-builder': renderPromptBuilder,
    'evidence-check': renderClaimClassifier,
    'workflow-builder': renderWorkflowSorter,
  };

  function appendParagraphs(ownerDocument, target, paragraphs) {
    for (var index = 0; index < paragraphs.length; index += 1) {
      target.appendChild(element(ownerDocument, 'p', '', paragraphs[index]));
    }
  }

  function appendBulletList(ownerDocument, target, items) {
    var list = element(ownerDocument, 'ul', 'lesson-bullets');
    for (var index = 0; index < items.length; index += 1) list.appendChild(element(ownerDocument, 'li', '', items[index]));
    target.appendChild(list);
    return list;
  }

  function appendPathProgress(ownerDocument, target, mobile) {
    if (mobile) target.appendChild(ownerDocument.createTextNode('六章目录 · '));
    target.appendChild(ownerDocument.createTextNode('本次浏览已看 '));
    var count = element(ownerDocument, 'span', '', String(seenCount()));
    count.setAttribute('data-learning-path-count', '');
    target.appendChild(count);
    target.appendChild(ownerDocument.createTextNode(' / ' + chapters.length));
  }

  function renderLearningPath(ownerDocument, resolvedId, mobile) {
    if (!ownerDocument || typeof ownerDocument.createElement !== 'function' || !isKnownChapter(resolvedId)) return null;
    var path = element(ownerDocument, mobile ? 'details' : 'aside', mobile ? 'learning-path-disclosure' : 'learning-path-rail');
    path.setAttribute('data-learning-path', mobile ? 'mobile' : 'desktop');
    if (mobile) {
      var summary = element(ownerDocument, 'summary', 'learning-path-summary');
      appendPathProgress(ownerDocument, summary, true);
      path.appendChild(summary);
    } else {
      path.setAttribute('aria-label', 'AI 新手入门学习路径');
      path.appendChild(element(ownerDocument, 'h2', 'learning-path-title', 'AI 新手入门'));
      var progress = element(ownerDocument, 'p', 'learning-path-progress');
      appendPathProgress(ownerDocument, progress, false);
      path.appendChild(progress);
    }

    var back = element(ownerDocument, 'a', 'learning-path-return', '返回学习目录');
    back.setAttribute('href', 'learn.html#chapter-' + encodeURIComponent(resolvedId));
    path.appendChild(back);

    var list = element(ownerDocument, 'ol', 'learning-path-list');
    for (var index = 0; index < chapters.length; index += 1) {
      var chapter = chapters[index];
      var item = element(ownerDocument, 'li', 'learning-path-item');
      item.setAttribute('data-learning-path-item', chapter.id);
      var link = element(ownerDocument, 'a', 'learning-path-link');
      link.setAttribute('href', 'detail.html?type=learn&id=' + encodeURIComponent(chapter.id));
      var identity = element(ownerDocument, 'span', 'learning-path-identity');
      identity.appendChild(element(ownerDocument, 'span', 'learning-path-number', chapter.number));
      identity.appendChild(element(ownerDocument, 'span', 'learning-path-name', chapter.title));
      if (chapter.id === resolvedId) {
        link.setAttribute('aria-current', 'page');
        identity.appendChild(element(ownerDocument, 'span', 'learning-path-current', '当前'));
      }
      link.appendChild(identity);
      var status = element(ownerDocument, 'span', 'learning-path-status', pathStatusCopy(getStatus(chapter.id)));
      status.setAttribute('aria-label', chapter.title + '：' + status.textContent);
      link.appendChild(status);
      item.appendChild(link);
      list.appendChild(item);
    }
    path.appendChild(list);
    return path;
  }

  function refreshLearningPaths(scope) {
    if (!scope || typeof scope.querySelectorAll !== 'function') return;
    var countNodes = scope.querySelectorAll('[data-learning-path-count]');
    var currentSeenCount = String(seenCount());
    for (var countIndex = 0; countIndex < countNodes.length; countIndex += 1) {
      countNodes[countIndex].textContent = currentSeenCount;
    }
    var items = scope.querySelectorAll('[data-learning-path-item]');
    for (var itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
      var chapterId = items[itemIndex].getAttribute('data-learning-path-item');
      var status = items[itemIndex].querySelector('.learning-path-status');
      var chapter = safeOwnGet(chapterById, chapterId);
      if (!status || !chapter) continue;
      status.textContent = pathStatusCopy(getStatus(chapterId));
      status.setAttribute('aria-label', chapter.title + '：' + status.textContent);
    }
  }

  function createLessonNav(ownerDocument, chapter, resolvedId, bottom) {
    var nav = element(ownerDocument, 'nav', bottom ? 'lesson-nav lesson-nav-bottom' : 'lesson-nav');
    nav.setAttribute('aria-label', bottom ? '本章底部导航' : '学习导航');
    var back = element(ownerDocument, 'a', '', '← 返回 AI 新手入门');
    back.setAttribute('href', 'learn.html#chapter-' + encodeURIComponent(resolvedId));
    var progress = element(ownerDocument, 'span', 'lesson-progress', chapter.number + ' / 06');
    progress.setAttribute('aria-label', '第 ' + Number(chapter.number) + ' 章，共 6 章');
    nav.appendChild(back);
    nav.appendChild(progress);
    return nav;
  }

  function renderUnknownNotice(target) {
    var ownerDocument = target.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (!ownerDocument || typeof ownerDocument.createElement !== 'function') return false;
    clearNode(target);
    var section = element(ownerDocument, 'section', 'lesson-moved');
    section.appendChild(element(ownerDocument, 'p', 'lesson-kicker', '轻量学习'));
    section.appendChild(element(ownerDocument, 'h1', '', '暂未找到这一章'));
    section.appendChild(element(ownerDocument, 'p', '', '可以返回学习路径，从六个入门章节中重新选择。'));
    var back = element(ownerDocument, 'a', 'lesson-primary-action', '返回 AI 新手入门');
    back.setAttribute('href', 'learn.html');
    section.appendChild(back);
    target.appendChild(section);
    return true;
  }

  function renderChapter(id, target) {
    var container = resolveTarget(target);
    if (!container) return false;
    if (id === 'ai-companies' || id === 'ai-models') {
      renderMovedNotice(container);
      return true;
    }

    var alias = safeOwnGet(aliases, id);
    var resolvedId = typeof alias === 'string' ? alias : id;
    var chapter = safeOwnGet(chapterById, resolvedId);
    if (!chapter) return renderUnknownNotice(container);
    canonicalizeLearningUrl(id, resolvedId);
    markStarted(resolvedId);
    var hostCard = container.parentNode;
    if (hostCard && typeof hostCard.className === 'string' && hostCard.className.split(/\s+/).indexOf('learning-detail-card') < 0) {
      hostCard.className += ' learning-detail-card';
    }
    var ownerDocument = container.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (!ownerDocument || typeof ownerDocument.createElement !== 'function') return false;
    clearNode(container);

    var nextId = null;
    for (var index = 0; index < chapters.length; index += 1) {
      if (chapters[index].id === resolvedId && chapters[index + 1]) nextId = chapters[index + 1].id;
    }

    var layout = element(ownerDocument, 'div', 'learning-detail-layout');
    layout.appendChild(renderLearningPath(ownerDocument, resolvedId, true));
    layout.appendChild(renderLearningPath(ownerDocument, resolvedId, false));
    var article = element(ownerDocument, 'article', 'lesson');
    article.setAttribute('data-chapter-id', resolvedId);
    article.appendChild(createLessonNav(ownerDocument, chapter, resolvedId, false));

    var header = element(ownerDocument, 'header', 'lesson-header');
    header.appendChild(element(ownerDocument, 'p', 'lesson-kicker', '轻量学习章节'));
    header.appendChild(element(ownerDocument, 'h1', '', chapter.title));
    header.appendChild(element(ownerDocument, 'p', '', chapter.description));
    article.appendChild(header);

    var figure = element(ownerDocument, 'figure', 'lesson-figure');
    var picture = element(ownerDocument, 'picture', '');
    var source = element(ownerDocument, 'source', '');
    source.setAttribute('srcset', chapter.image.webp);
    source.setAttribute('type', 'image/webp');
    var image = element(ownerDocument, 'img', '');
    image.setAttribute('src', chapter.image.fallback);
    image.setAttribute('alt', chapter.image.alt);
    image.setAttribute('width', String(chapter.image.width));
    image.setAttribute('height', String(chapter.image.height));
    image.setAttribute('loading', 'eager');
    picture.appendChild(source);
    picture.appendChild(image);
    figure.appendChild(picture);
    var figcaption = element(ownerDocument, 'figcaption', '', chapter.image.caption);
    figcaption.setAttribute('aria-hidden', 'true');
    figure.appendChild(figcaption);
    article.appendChild(figure);

    var content = element(ownerDocument, 'div', 'lesson-content');
    for (var sectionIndex = 0; sectionIndex < chapter.sections.length; sectionIndex += 1) {
      var sectionData = chapter.sections[sectionIndex];
      var section = element(ownerDocument, 'section', 'lesson-core-section');
      section.appendChild(element(ownerDocument, 'h2', '', sectionData.title));
      appendParagraphs(ownerDocument, section, sectionData.paragraphs);
      appendBulletList(ownerDocument, section, sectionData.bullets);
      if (Array.isArray(sectionData.scenes)) appendCapabilityScenes(ownerDocument, section, sectionData.scenes);
      if (Array.isArray(sectionData.compare) && sectionData.choice) appendBoundaryComparison(ownerDocument, section, sectionData);
      content.appendChild(section);
    }
    article.appendChild(content);

    if (chapter.history) {
      var historyDetails = element(ownerDocument, 'details', 'lesson-history');
      historyDetails.appendChild(element(ownerDocument, 'summary', '', chapter.history.title));
      var historyPicture = element(ownerDocument, 'picture', '');
      var historySource = element(ownerDocument, 'source', '');
      historySource.setAttribute('srcset', chapter.history.image.webp);
      historySource.setAttribute('type', 'image/webp');
      var historyImage = element(ownerDocument, 'img', '');
      historyImage.setAttribute('src', chapter.history.image.fallback);
      historyImage.setAttribute('alt', chapter.history.image.alt);
      historyImage.setAttribute('width', String(chapter.history.image.width));
      historyImage.setAttribute('height', String(chapter.history.image.height));
      historyImage.setAttribute('loading', 'lazy');
      historyPicture.appendChild(historySource);
      historyPicture.appendChild(historyImage);
      historyDetails.appendChild(historyPicture);
      appendBulletList(ownerDocument, historyDetails, chapter.history.nodes);
      article.appendChild(historyDetails);
    }

    var caseSection = element(ownerDocument, 'section', 'lesson-case');
    caseSection.appendChild(element(ownerDocument, 'p', 'lesson-section-label', '工作案例'));
    caseSection.appendChild(element(ownerDocument, 'h2', '', chapter.caseStudy.title));
    caseSection.appendChild(element(ownerDocument, 'p', '', chapter.caseStudy.situation));
    var lesson = element(ownerDocument, 'p', '');
    lesson.appendChild(element(ownerDocument, 'strong', '', '关键启发：'));
    lesson.appendChild(ownerDocument.createTextNode(chapter.caseStudy.lesson));
    caseSection.appendChild(lesson);
    article.appendChild(caseSection);

    var exerciseSection = element(ownerDocument, 'section', 'lesson-exercise');
    exerciseSection.setAttribute('data-exercise-type', chapter.exercise.type);
    exerciseSection.appendChild(element(ownerDocument, 'p', 'lesson-section-label', '2–5 分钟小练习'));
    exerciseSection.appendChild(element(ownerDocument, 'h2', '', chapter.exercise.title));
    exerciseSection.appendChild(element(ownerDocument, 'p', '', chapter.exercise.instruction));
    var feedback = element(ownerDocument, 'div', 'lesson-feedback');
    feedback.setAttribute('aria-live', 'polite');
    exerciseSection.appendChild(feedback);
    var renderer = safeOwnGet(exerciseRenderers, chapter.exercise.type);
    if (typeof renderer === 'function') renderer(chapter.exercise, exerciseSection);
    var exerciseHelp = interactionFieldset(ownerDocument, '需要一点提示吗？', 'lesson-exercise-help');
    var exerciseReference = element(ownerDocument, 'p', 'lesson-exercise-reference', '先看任务目标，再对照材料、责任边界与证据。可以反复尝试，不必追求一次答对。');
    exerciseReference.setAttribute('data-exercise-reference', '');
    exerciseReference.hidden = true;
    exerciseHelp.appendChild(exerciseReference);
    var revealExercise = element(ownerDocument, 'button', 'lesson-secondary-action', '查看参考思路');
    revealExercise.setAttribute('type', 'button');
    revealExercise.setAttribute('data-exercise-reveal', '');
    exerciseHelp.appendChild(revealExercise);
    exerciseSection.appendChild(exerciseHelp);
    article.appendChild(exerciseSection);

    var checkSection = element(ownerDocument, 'section', 'lesson-check');
    checkSection.appendChild(element(ownerDocument, 'p', 'lesson-section-label', '快速想一想'));
    checkSection.appendChild(element(ownerDocument, 'h2', '', '不计分，对照思路就好'));
    for (var checkIndex = 0; checkIndex < chapter.quickCheck.length; checkIndex += 1) {
      var check = chapter.quickCheck[checkIndex];
      var details = element(ownerDocument, 'details', 'lesson-check-item');
      details.appendChild(element(ownerDocument, 'summary', '', check.question));
      var answer = element(ownerDocument, 'p', '');
      answer.appendChild(element(ownerDocument, 'strong', '', check.answer));
      details.appendChild(answer);
      details.appendChild(element(ownerDocument, 'p', '', check.explanation));
      checkSection.appendChild(details);
    }
    article.appendChild(checkSection);

    var takeaway = element(ownerDocument, 'aside', 'lesson-takeaway');
    takeaway.appendChild(element(ownerDocument, 'p', 'lesson-section-label', '这一章你带走什么'));
    takeaway.appendChild(element(ownerDocument, 'h2', '', chapter.takeaway.title));
    appendBulletList(ownerDocument, takeaway, chapter.takeaway.items);
    var template = element(ownerDocument, 'pre', 'lesson-template', chapter.takeaway.template);
    template.setAttribute('tabindex', '0');
    template.setAttribute('data-template-content', '');
    takeaway.appendChild(template);
    if (resolvedId === 'ai-delegation' || resolvedId === 'ai-prompting' || resolvedId === 'ai-verification' || resolvedId === 'ai-workflow') {
      var takeawayActions = element(ownerDocument, 'div', 'lesson-takeaway-actions');
      var copyButton = element(ownerDocument, 'button', 'lesson-secondary-action', '复制模板');
      copyButton.setAttribute('type', 'button');
      copyButton.setAttribute('data-copy-template', '');
      copyButton.setAttribute('data-lesson-copy', '');
      var copyFeedback = element(ownerDocument, 'span', 'tool-copy-feedback');
      copyFeedback.setAttribute('data-copy-feedback', '');
      copyFeedback.setAttribute('aria-live', 'polite');
      takeawayActions.appendChild(copyButton);
      takeawayActions.appendChild(copyFeedback);
      takeaway.appendChild(takeawayActions);
    }
    article.appendChild(takeaway);

    var liveStatus = element(ownerDocument, 'p', 'lesson-status-live');
    liveStatus.setAttribute('aria-live', 'polite');
    liveStatus.setAttribute('data-lesson-status', '');
    article.appendChild(liveStatus);
    var actions = element(ownerDocument, 'div', 'lesson-actions');
    var seenButton = element(ownerDocument, 'button', '', getStatus(resolvedId) === STATUS_SEEN ? '已看过' : '我看完了');
    seenButton.setAttribute('type', 'button');
    seenButton.setAttribute('data-mark-seen', '');
    if (getStatus(resolvedId) !== STATUS_SEEN) seenButton.disabled = true;
    else seenButton.setAttribute('aria-pressed', 'true');
    actions.appendChild(seenButton);
    if (nextId) {
      var nextAction = element(ownerDocument, 'a', 'lesson-primary-action', '下一章');
      nextAction.setAttribute('href', 'detail.html?type=learn&id=' + encodeURIComponent(nextId));
      actions.appendChild(nextAction);
    }
    var returnAction = element(ownerDocument, 'a', '', '返回学习路径');
    returnAction.setAttribute('href', 'learn.html#chapter-' + encodeURIComponent(resolvedId));
    actions.appendChild(returnAction);
    article.appendChild(actions);
    article.appendChild(createLessonNav(ownerDocument, chapter, resolvedId, true));
    layout.appendChild(article);
    container.appendChild(layout);
    bindCopyTools(article);

    function enableCompletion(message) {
      seenButton.disabled = false;
      if (feedback.textContent !== message) feedback.textContent = message;
    }
    revealExercise.addEventListener('click', function () {
      exerciseReference.hidden = false;
      enableCompletion('已查看参考思路。你可以继续尝试，也可以把本章记为看过。');
      revealExercise.disabled = true;
      var moveFocusToCompletion = function () {
        try {
          if (typeof seenButton.scrollIntoView === 'function') seenButton.scrollIntoView({ block: 'center', behavior: 'auto' });
        } catch (error) {}
        try {
          if (typeof seenButton.focus === 'function') seenButton.focus({ preventScroll: true });
        } catch (error) {}
      };
      try {
        if (typeof setTimeout === 'function') setTimeout(moveFocusToCompletion, 0);
        else moveFocusToCompletion();
      } catch (error) {
        moveFocusToCompletion();
      }
    });
    exerciseSection.addEventListener('learning-exercise-attempt', function (event) {
      var message = event && event.detail && event.detail.message
        ? event.detail.message
        : '已完成一次练习尝试。你可以继续调整，也可以把本章记为看过。';
      enableCompletion(message);
    });
    var checkItems = checkSection.querySelectorAll('details');
    for (var itemIndex = 0; itemIndex < checkItems.length; itemIndex += 1) {
      checkItems[itemIndex].addEventListener('toggle', function (event) {
        if (event.currentTarget.open) enableCompletion('已查看快速自测思路，你可以继续尝试或记为看过。');
      });
    }
    seenButton.addEventListener('click', function () {
      markSeen(resolvedId);
      seenButton.textContent = '已看过';
      seenButton.setAttribute('aria-pressed', 'true');
      liveStatus.textContent = '本章已记为看过。你可以继续下一章，也可以随时返回学习路径。';
      refreshLearningPaths(layout);
    });
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
    renderLearningPath: renderLearningPath,
    renderTokenPrediction: renderTokenPrediction,
    renderEvidenceSpotter: renderEvidenceSpotter,
    renderDelegationSorter: renderDelegationSorter,
    renderPromptBuilder: renderPromptBuilder,
    renderClaimClassifier: renderClaimClassifier,
    renderWorkflowSorter: renderWorkflowSorter,
  };
}());
