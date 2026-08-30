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
      title: 'AI 到底是什么',
      description: '你以前用过的软件都要你先学它，这个反过来。',
      image: { webp: 'images/ai-xiaoa-ch01.webp', fallback: 'images/ai-xiaoa-ch01.png', width: 1200, height: 800, alt: '小A站在固定软件按钮与自然语言结果之间，展示软件使用方式的变化', caption: '从学软件的规则，到直接说清楚你要什么' },
      sections: [
        {
          title: '不用学操作，说人话就行',
          paragraphs: ['过去四十年我们用软件，都是软件先摆出一堆固定的按钮和菜单，**你得先学会它的规则**。想做个数据透视表？先学在哪个菜单里、点几下、参数怎么填。学不会，这个功能对你就等于不存在。', '现在反过来了，**你说人话，它去办**。不用记菜单在哪，也不用学函数怎么写。你怎么跟同事交代，就怎么跟它说。', '**Word、Excel、SAP 要你去适应它们，AI 反过来适应你。**这一下换过来，有三件事跟着变了。'],
          bullets: [
            { term: '「不会用」这件事，意思变了', explain: '以前不会用是因为没学过操作。现在不会用，多半是**没说清楚要什么**。这对你是好事。说清楚要求这件事，你带团队、派活的时候天天在做，不用另学。' },
            { term: '它没有功能列表', explain: 'Excel 有明确的功能边界，AI 没有。你能想到怎么描述的活，都可以先丢给它试一次。试错成本就是几十秒。' },
            { term: '但它会出错，而且看不出来', explain: '固定按钮不会给你错的结果，最多是你点错了。AI 每次都是现造的，**造出来很顺，整段也可能是错的**。' },
          ],
          demo: {
            type: 'shift',
            title: '同一件事，两种做法',
            hint: '拿「把一小时会议录音整理成纪要」举例，看两边差在哪。',
            task: '把一小时的会议录音，整理成能发出去的纪要',
            sides: [
              {
                era: 'past', eraLabel: '过去 · 你学软件的规则',
                how: '你得自己会',
                steps: ['把录音听一遍，边听边记', '打开文档，自己想用什么结构', '手动分出决定、行动项、负责人', '调格式、对齐、加编号', '通读一遍，改错别字'],
                cost: '大约 40 分钟', note: '而且你得本来就知道纪要该长什么样',
              },
              {
                era: 'now', eraLabel: '现在 · 软件听你的话',
                how: '你说清楚就行',
                steps: ['把转写文字贴进去', '说一句：请整理成决定、行动项、负责人和待确认事项', '读一遍，核对事实和责任人', '不满意就说哪里不对，让它改'],
                cost: '大约 5 分钟', note: '但核对那一步不能省，它可能编',
              },
            ],
            punchline: '左边那 40 分钟里，打字只占一小部分。大头是**你得先知道纪要该长什么样**。右边把这一部分省了，代价在最后一步，结果得你自己核。',
          },
        },
        {
          title: '四件今天就能上手的活',
          paragraphs: ['下面四件事最容易上手，因为**材料你手上就有，结果你一眼能看出对不对**。点开看具体怎么说。'],
          bullets: [],
          scenes: [
            { icon: 'notes', title: '会议录音变纪要', input: '周会一小时的录音转写，两千多字，话题跳来跳去，中间还夹着闲聊', assist: '整理成决定、行动项、负责人', confirm: '事实对不对、责任人有没有搞错，确认了再发。', example: '可以和 AI 说：请把这段记录整理为决定、行动项、负责人和待确认事项。' },
            { icon: 'audience', title: '同一份材料，换个人讲', input: '总部发下来的 30 页季度报告，你只需要讲清其中和你们区相关的三页', assist: '按不同对象重讲一遍重点', confirm: '数字有没有讲错、对象和内容配不配。', example: '可以和 AI 说：请分别用给管理者和给新同事看的方式，讲清这份材料的三个重点。' },
            { icon: 'draft', title: '一个想法写成稿', input: '要说什么、给谁看、什么语气，你心里都想好了，就是一直没落成字', assist: '写成邮件、汇报或沟通稿初稿', confirm: '事实、语气，还有对外能不能这么说。', example: '可以和 AI 说：请把这个主题写成一封简洁邮件，先给结论，再列三项行动。' },
            { icon: 'repeat', title: '重复的活先打个底', input: '每周都要做一遍的库存汇总，步骤年年不变，就是费时间；手上有上两周做好的样例', assist: '先做一个模板或草稿出来', confirm: '规则、边界、异常情况都过一遍再用。', example: '可以和 AI 说：请根据这些重复步骤，起草一个可复用模板，并标出需要人工确认的位置。' },
          ],
        },
        {
          title: 'AI 每写一个词，都是在猜',
          paragraphs: ['你打完一句话，AI 开始回答。这中间它到底在干什么？', '它把你的话切成一个个碎片，然后根据前面所有内容，**猜下一个碎片最可能是什么**，猜完接上，再猜下一个。整篇回答就是这么一个词一个词长出来的。'],
          bullets: [
            { term: '那几个概率是从哪来的', explain: 'AI 训练的时候读过海量文字，哪个词后面常跟哪个词，统计过无数遍。所以「上季度的销售」后面接「增长」的概率高，接「下滑」的低。**这是语言习惯的统计，跟你们公司实际卖了多少没有关系。**你那份报表它没读过。' },
            { term: '你说什么，它都能接上', explain: '像相声演员接梗。你抛什么他都接得住，而且接得又快又溜。AI 的本事就是**让这段话顺下去**，至于这话是真是假，没有这个概念。所以「答得特别顺」，一点都不说明答得对。' },
            { term: 'AI 会一本正经地胡说', explain: '它的任务是让这句话**看起来像个答案**，至于这件事是真是假，不负责确认。没资料的时候照样能顺畅地写下去，编出一个不存在的数字或出处。而且编的时候语气和说真话时**一模一样**，你看不出来。' },
            { term: '让 AI 算账，它会算错', explain: '问它 7×8，答得对。这道题见过几百万遍，等于在背答案。换成 4783×926 就没背过，于是给你一个「看着像那么回事」的数字。**它从头到尾没做过一次计算**，只是在猜这串数字后面该跟什么。所以报表里的加总和百分比别让它心算，让它写公式，或者你自己按计算器。' },
          ],
          demo: {
            type: 'typewriter',
            title: '看它怎么编出一个数字',
            hint: '下面的百分比来自它训练时读过的文字统计，不是你们的销售数据。点一点，看它每一步怎么挑。',
            prompt: '帮我写一段跑鞋品类的季度回顾，给区域经理看。第一句先说北区：北区上季度的销售',
            steps: [
              { options: [{ word: '增长', p: 58 }, { word: '下滑', p: 27 }, { word: '持平', p: 15 }] },
              { options: [{ word: '了约', p: 62 }, { word: '幅度达', p: 28 }, { word: '明显', p: 10 }] },
              { options: [{ word: '12%', p: 38 }, { word: '18%', p: 34 }, { word: '23%', p: 28 }] },
              { options: [{ word: '，主要', p: 55 }, { word: '，其中', p: 30 }, { word: '。', p: 15 }] },
              { options: [{ word: '来自新店贡献', p: 52 }, { word: '由老客复购拉动', p: 31 }, { word: '受益于新品上市', p: 17 }] },
              { options: [{ word: '；', p: 60 }, { word: '。', p: 28 }, { word: '，', p: 12 }] },
              { options: [{ word: '其中越野跑系列', p: 46 }, { word: '尤其是轻量款', p: 33 }, { word: '华东门店', p: 21 }] },
              { options: [{ word: '贡献了近四成', p: 44 }, { word: '表现最为突出', p: 36 }, { word: '同比翻了一倍', p: 20 }] },
            ],
            verdictSmooth: '每一步都挑了概率最高的，读起来很顺，很像一份真的季度回顾。可是「12%」和「近四成」这两个数，是它一步步挑出来的。你手上那份报表里，可能根本没有这两个数字。',
            verdictOffTrack: '你挑了概率低的，整句话就歪到别处去了。它一次都没拦你，因为它手上只有「哪个词更像样」这一个标准，没有对错这个概念。',
          },
        },
        {
          title: '关掉对话，它就把你忘了',
          paragraphs: ['它能看到的，只有这一轮对话里的内容。**像同事帮你干活时手边摊开的那摞资料，资料一收走，他什么都不记得了。**（这摞资料有个术语叫「上下文」，你会经常听到。）', '而且这张桌子就那么大。你不停往上放新资料，最早那几张会被挤下去，从桌上掉到地上。它再也看不见了。你这边的感受就是**聊到后面它开始前后矛盾，把你刚否掉的方案又提一遍**。桌子这回事想明白了，下面三件事就跟着好办。'],
          bullets: [
            { term: '关掉重开，它就不认识你了', explain: '新开一个对话，等于换了个从没见过你的人。常用的背景（项目是什么、给谁看、有什么忌讳）建议存成一段文字，每次开新对话先贴一遍，比每次重讲快得多。' },
            { term: '最重要的话别放中间', explain: '就算还在桌上，它对**中间位置**的内容也最不上心，开头和结尾记得最牢。所以最关键的那条要求，放开头，或者在结尾再说一遍。' },
            { term: '它开始重复或跑题，就换一轮', explain: '这时候别硬掰，你越解释桌子越挤。把已经谈定的结论整理成几句话，新开对话贴进去，相当于给新同事一份交接文档。' },
          ],
          demo2: {
            type: 'context-scale',
            kind: 'note',
            title: '不同模型，桌子大小差很多',
            hint: 'Token 不等于字数。中文一个字通常算 1～2 个 Token。',
            models: [
              { name: 'Claude Haiku 4.5', tokens: 200000, label: '20 万 Token', note: '轻量快速档。大概装得下一本 15 万字的书。' },
              { name: '豆包 seed-2.1-pro · Kimi K2.7', tokens: 256000, label: '25.6 万 Token', note: '和上面一档接近。日常对话、单篇长文都够用。' },
              { name: 'Claude Opus 5 · GPT-5.6 · Gemini 3.7\nQwen3.8-Max · DeepSeek-V4 · Kimi K3', tokens: 1000000, label: '100 万 Token', note: '目前主流旗舰基本都在这一档，大概能装五六本长篇小说。' },
            ],
            footnote: '还有专门做长文本的档位，比如通义 Qwen-Long 到 1000 万 Token。那是长文本专用型号，通用旗舰没有这个能力。\n\n**桌子再大，中间那部分它照样最容易忽略。**关键要求还是要放开头或结尾。\n\n以上为 2026 年 8 月各家官方文档口径，**这些数字变得很快，用之前自己确认一下**。',
          },
          demo: {
            type: 'context-window',
            title: '看它把哪句话丢了',
            hint: '这张桌子只放得下 4 条。一直点「再聊一轮」，注意最后 AI 说了什么。',
            capacity: 4,
            turns: [
              { role: '你', text: '我们在做秋冬新品的门店培训方案。' },
              { role: '你', text: '重点是跑鞋，别提滑雪装备。' },
              { role: 'AI', text: '好的，聚焦跑鞋。建议分三个模块……' },
              { role: '你', text: '培训对象是店长，不是导购。' },
              { role: 'AI', text: '已调整为店长视角，增加了排班和陈列。' },
              { role: '你', text: '时间只有半天，砍掉一半内容。' },
              { role: 'AI', text: '好的，压缩到半天，保留核心三节……' },
              { role: '你', text: '再帮我加一段开场。' },
              { role: 'AI', text: '开场建议先讲滑雪系列的市场表现……' },
            ],
            consequence: '最后一条它又提滑雪装备了。因为「别提滑雪装备」那句已经被挤下桌，它是真的看不见这句话了。这不是不听话。',
          },
        },
      ],
      takeaway: {
        title: '这一章带走什么',
        template: 'AI 到底是什么\n\n它做的事，是根据你说的话一个词一个词往下猜。猜得又快又像样，从头到尾没查过任何资料。\n\n记住这三条就够了。\n\n一、它会编，而且你看不出来\n它编的时候，语气和说真话一模一样，你没法从「听起来怎么样」判断真假。数字、日期、人名、出处，见一个核一个，别管它说得多肯定。\n\n二、关掉对话它就忘了\n它只记得这一轮聊过的内容。常用的背景（项目是什么、给谁看、有什么忌讳）存成一段话，每次开新对话先贴一遍，比每次重讲快得多。\n\n三、它只管生成，不管对错\n东西是你发出去的，署名是你的，出了事也是你的。别的都能省，最后核对那一步不能省。',
      },
    },
    {
      id: 'ai-boundaries',
      number: '02',
      title: '哪些能信，哪些不能信',
      description: '它不是搜索引擎，也不会说「我不知道」。先搞清它会在哪儿骗你。',
      image: { webp: 'images/ai-xiaoa-ch02.webp', fallback: 'images/ai-xiaoa-ch02.png', width: 1200, height: 800, alt: '小A用放大镜检查回答卡片与来源文件，其中一份通过核验，另一份待确认', caption: '先看证据，再决定能不能信' },
      sections: [
        {
          title: '它不是搜索引擎',
          paragraphs: ['同一个问题问搜索和问 AI，你拿到的是两种完全不同的东西。搞混这一点，是新手踩坑最多的地方。', '搜索是图书管理员：你问他，他指给你「三楼第五排那本，第 82 页」，你自己去看，出处清清楚楚。AI 是把整个图书馆读完的人：你问他，他凭记忆直接给你结论——快得多，但他说不出是哪本书哪一页，而且可能记岔了。'],
          bullets: [],
          compare: [
            { role: '找搜索', title: '要出处、要最新', description: '实时数字、精确数据、法规条文、谁在什么时候说过什么——这些要能点开看原文。' },
            { role: '找 AI', title: '要理解、要改写', description: '把长材料提成要点、换个说法讲给不同对象、起草初稿、发散思路——这些没有标准答案，它很擅长。' },
            { role: '两个都用', title: '重要的事先查再写', description: '先用搜索找到原始来源，再让 AI 帮你组织和表达，最后你自己回原文核一遍关键数字。' },
          ],
          choice: {
            question: '你要给管理层解释一份刚发布的行业数据，还得保证数字准确。先找谁？',
            options: [
              { value: '找搜索', explanation: '对了一半。搜索能找到最新数字和原始出处，但「怎么讲给管理层听」还得再找 AI 帮忙组织。' },
              { value: '找 AI', explanation: '有风险。它可以帮你解释和改写，但刚发布的数字它多半不知道，硬答就会编——必须先去搜索核实。' },
              { value: '两个都用', explanation: '对。先搜索拿到原始来源和准确数字，再让 AI 按对象组织表达，最后你自己回原文核对数字和引用。' },
            ],
          },
        },
        {
          title: '它会一本正经地胡说',
          paragraphs: ['这件事有个专门的词叫「幻觉」。它不是故意骗你——它根本没有「我不知道」这个概念，只会顺着往下写。'],
          bullets: [
            { term: '像那种从不说「我不知道」的同事', explain: '你问他上季度北区增长多少，他不会说「我查一下」，他会很自信地给你一个数。听起来特别合理，但可能是编的。' },
            { term: '最要命的是：编的时候没有任何破绽', explain: '它胡说时的语气、流畅度、自信程度，和说真话时一模一样。你没法从「听起来怎么样」判断真假——只能回去核。' },
            { term: '顺口的编造，天然赢过诚实的犹豫', explain: '它学的是「像答案的话长什么样」。一个流畅完整的假答案，比一句「这个我不确定」更像答案，所以它更容易写出前者。' },
            { term: '越精确的东西越要小心', explain: '数字、日期、人名、引用、条文——这四五类最容易出问题。反过来，让它润色一段话、换个说法、起个名字，编不出什么大事。' },
          ],
        },
        {
          title: '那为什么有的 AI 能查到今天的新闻',
          paragraphs: ['因为它被允许「翻书」了。这个能力叫联网检索，技术上常被叫作 RAG，但你不用记这个词。'],
          bullets: [
            { term: '闭卷考 vs 开卷考', explain: '默认它是闭卷，只能靠记忆答题。开了检索就是允许它翻书——所以能查到今天的新闻，还能给你出处链接。' },
            { term: 'RAG 不是给 AI 补脑子，是给 AI 递资料', explain: '它没有变聪明，只是手边多了参考资料。同理，你把一份文件传给它，也是在递资料。' },
            { term: '但书本身要是错的，抄出来照样错', explain: '开卷不等于一定对。它翻到的可能是过期的、片面的、或者本来就写错的资料。给了出处，你还是得点开看一眼。' },
            { term: '怎么判断它是闭卷还是开卷', explain: '看它有没有给你可以点开的链接。给了链接就是查过的，没给就是凭记忆——凭记忆的那些，精确信息一律不能直接用。' },
          ],
        },
      ],
      caseStudy: {
        title: '汇报里出现了原材料没有的增长数字',
        situation: '你把一份销量表丢给它让它写汇报。它写出来的段落里有一句「同比增长 18%」——读起来很顺，但你翻遍原表也找不到这个数。它为了让叙述完整，自己补了一个看起来合理的数字。',
        lesson: '凡是原材料里没有的精确数字，一律当成它编的，直到你在原文里找到为止。',
      },
      exercise: {
        type: 'hallucination-spotter',
        title: '幻觉侦探',
        instruction: '下面三句话来自同一段 AI 生成的汇报。点一点，判断每句该怎么处理。',
        claims: [{ text: '原始表显示本月销量为 12,400 件。', category: '可以保留' }, { text: '本月同比增长 18%。', category: '需要核验' }, { text: '增长完全由新活动带来。', category: '需要修改' }],
      },
      quickCheck: [
        { question: '它答得特别自信流畅，能不能少核一步？', answer: '不能，自信是语气不是准确度', explanation: '它编造时的语气和说真话时完全一样，流畅度提供不了任何真假信号。' },
        { question: '哪种情况最该先去搜索而不是问它？', answer: '要最新数字、精确数据或者原始出处时', explanation: '这些要能点开看原文，而它给不出可追溯的出处。' },
      ],
      takeaway: {
        title: '这一章带走什么',
        items: ['搜索给你书架位置，它凭记忆给你结论', '它没有「我不知道」，只会顺着写', '数字、日期、人名、引用——见一个核一个', '有链接的是查过的，没链接的是猜的'],
        template: '什么时候找谁\n要出处、要最新 → 搜索\n要理解、要改写 → AI\n重要的事 → 先搜索找原文，再让 AI 组织，最后自己核一遍\n\n红灯词：精确数字、具体日期、人名、引用出处',
      },
    },
    {
      id: 'ai-prompting',
      number: '03',
      title: '话怎么说它才懂',
      description: '把它当一个聪明、但完全不了解你的新同事。',
      image: { webp: 'images/ai-xiaoa-ch03.webp', fallback: 'images/ai-xiaoa-ch03.png', width: 1200, height: 800, alt: '小A把四块信息拼成一张清晰的任务说明卡片', caption: '把目标、背景、格式和边界说清楚' },
      sections: [
        {
          title: '把它当入职第一天的新同事',
          paragraphs: ['一个名校毕业、很聪明、学东西极快的新人——但今天是他第一天上班。他不认识你的老板，不知道你们的口径，没见过你们的材料长什么样。', '而且每次新开对话，都是他的入职第一天。'],
          bullets: [
            { term: '你得先把背景给够', explain: '你不会对新人说「写个材料」就走开。你会告诉他给谁看、什么场合、有什么忌讳。对它也一样。' },
            { term: '「写专业一点」是句废话', explain: '新同事不知道你们这儿「专业」长什么样。是要严谨克制，还是要有点热度？是能用行业黑话，还是要说人话？你不说，他只能猜。' },
            { term: '关掉重开，得重讲一遍', explain: '不是他记性差，是又换了个第一天上班的人。常用背景存成一段，每次贴一遍。' },
          ],
        },
        {
          title: '四要素：像给同事派活一样交代',
          paragraphs: ['不用背什么咒语。你平时怎么给人派活，就怎么跟它说——把四样东西说全，返工次数会明显下降。'],
          bullets: [
            { term: '目标：为什么做、什么算成功', explain: '「下周三给区域经理开会用」。说了目标，它才知道该突出什么、省略什么。' },
            { term: '背景：给谁看、有什么材料、有什么忌讳', explain: '「这是上季度数据，只能用这里面的，别引用外部数字」。背景越具体，它猜得越少。' },
            { term: '任务：具体让它做什么', explain: '「提炼三个重点」，而不是「看一下」。动词要明确。' },
            { term: '输出要求：多长、什么格式、什么语气', explain: '「两百字以内、先给结论、不要小标题」。不说这条，它默认给你写三千字。' },
          ],
        },
        {
          title: '给背景，别给形容词',
          paragraphs: ['这是最省力也最容易忽略的一条。多数人第一版不满意，问题都出在这儿。'],
          bullets: [
            { term: '形容词是空的', explain: '「写得专业一点」「再高级一些」「口语化一点」——就像跟设计师说「做得高级点」，他不知道你要黑白极简还是烫金。' },
            { term: '背景是实的', explain: '换成「给管理层看、别用行业黑话、语气克制、控制在一页」，一次就对。' },
            { term: '最狠的一招：直接给范本', explain: '把你觉得写得好的那份旧材料贴给它，说「照这个风格来」。比说一百句都管用——就像新人问你周报怎么写，你直接甩他一份范本，比讲半小时快。' },
          ],
        },
        {
          title: '说不清要什么？让它来问你',
          paragraphs: ['新手最大的卡点其实不是不会提问，而是自己都还没想清楚要什么。这时候硬憋一个 prompt，只会得到一堆对谁都成立、但对你没用的万金油答案。', '破法很简单：反过来，让它先问你。'],
          bullets: [
            { term: '一句开场白就够', explain: '「我想做 X，但还没想清楚。先别急着给方案，先问我 5 个问题，问完再动手。」' },
            { term: '为什么有用', explain: '专家和新手的区别，就在于知道该问什么问题。让 AI 来问，等于借它的问题清单——它问的每一个，都在帮你砍掉一批不合适的方案。' },
            { term: '举个例子', explain: '你说「想做个店长培训方案，还没想清楚」，它会问你：培训谁、多少人、线上还是线下、有多少时间、要解决什么具体问题、怎么算成功。这六个问题，你自己一开始想不全。' },
            { term: '什么时候用', explain: '写东西、做方案、教学设计、做选择——凡是你脑子里还是一团的时候，都先让它问一轮。' },
          ],
        },
        {
          title: '别这么问',
          paragraphs: ['前面讲了该怎么做，这里是反过来的清单。这几个坑几乎人人都踩过。'],
          bullets: [
            { term: '一口气问五件事', explain: '它会挑着答，漏掉几个，而且每个都答得浅。一次问一件，比一次问五件跑得快、答得也准。' },
            { term: '把它当搜索引擎问实时数据', explain: '「今年双十一大促几号开始」——它多半会编一个日期给你。这类问题去搜索。' },
            { term: '连续追问却不给新信息', explain: '「不对，重写」「还是不行，再来」——它没有新信息，只会换个说法再错一遍。要给具体差在哪。' },
            { term: '问「你觉得我这个方案好吗」', explain: '它倾向于顺着你说。要真实反馈就换成「帮我挑三个漏洞」或者「站在反对方立场论证一遍」。' },
            { term: '一次性把 50 页材料全塞进去', explain: '关键信息容易被淹没在中间。先说清楚你要从里面拿什么，或者分段给。' },
            { term: '让它猜受众', explain: '「写个介绍」——写给客户、写给同事、写给老板，是三份完全不同的东西。' },
          ],
        },
      ],
      caseStudy: {
        title: '从「帮我写汇报」到一次就能用的初稿',
        situation: '同一份数据，第一次只说「帮我写个汇报」，拿回来是一篇面面俱到但抓不住重点的长文。第二次加上「给区域经理看、只讲三个重点和两个风险、一页以内、先给结论」，直接能用。',
        lesson: '差别不在它变聪明了，在于你把它需要的信息给全了。',
      },
      exercise: {
        type: 'prompt-builder',
        title: 'Prompt 拼装器',
        instruction: '填四个字段，看它怎么拼成一份完整的任务说明。每加一块信息，结果就清楚一级。',
        fields: ['目标', '背景', '任务', '输出要求'],
        reference: '目标：让管理层快速理解本月进展。背景：仅使用所附数据。任务：提炼三项进展与两项风险。输出要求：一页简报，标注数据来源。',
      },
      quickCheck: [
        { question: '第一版不满意，最有效的下一步是什么？', answer: '指出具体哪里不对，而不是让它重写', explanation: '它没有新信息就只会换个说法再错一遍。具体差距才能推进。' },
        { question: '完全没想清楚要什么的时候，该怎么开口？', answer: '让它先问你五个问题', explanation: '借它的问题清单，比自己硬憋一个模糊需求有效得多。' },
      ],
      takeaway: {
        title: '这一章带走什么',
        items: ['它是入职第一天的新同事，每次都是第一天', '目标、背景、任务、输出要求——缺哪个返工哪个', '给背景，别给形容词；有范本就直接甩范本', '想不清楚就让它先问你五个问题'],
        template: '四要素提问\n目标：____\n背景：____\n任务：____\n输出要求：____\n\n想不清楚时的开场白：\n我想做 ____，但还没想清楚。先别给方案，先问我 5 个问题。',
      },
    },
    {
      id: 'ai-verification',
      number: '04',
      title: '它给的东西怎么验',
      description: '在你署名发出去之前，有几步省不得。',
      image: { webp: 'images/ai-xiaoa-ch04.webp', fallback: 'images/ai-xiaoa-ch04.png', width: 1200, height: 800, alt: '小A拿着笔核对原始文件、AI 回答和检查清单', caption: '从原始材料走到可以署名的结论' },
      sections: [
        {
          title: '动手之前，让它先复述一遍',
          paragraphs: ['像开会散场前那句「我复述一下我的理解」。一句话的成本，省掉的是一整轮返工。'],
          bullets: [
            { term: '怎么说', explain: '「动手之前，先用你自己的话复述一遍我的要求，我确认了你再开始。」' },
            { term: '为什么有用', explain: '它复述错了，你现在改；复述对了，再让它动手。等它写完三千字你才发现方向不对，那三千字全白费。' },
            { term: '什么时候一定要用', explain: '任务复杂、材料多、或者你自己也是刚想明白的时候。简单活不用，让它直接干更快。' },
          ],
        },
        {
          title: '一段话里混着三种东西',
          paragraphs: ['AI 写出来的一段话，看着是连贯的一整段，其实里面混着性质完全不同的三种内容。分不开，你就会把它猜的当成查证过的。'],
          bullets: [
            { term: '事实：材料里能找到的', explain: '「北区上季度增长 12%」——这句要么在你给的表里，要么不在。不在就是它编的。' },
            { term: '推论：它自己接上去的', explain: '「说明新店选址策略见效」——听起来像结论，其实是它顺着写下来的。增长可能来自促销、来自季节、来自竞品关店，它没排除任何一个。' },
            { term: '观点：它给的建议', explain: '「建议明年加倍开店」——这是判断，不是发现。可以参考，但不能当成数据支持的结论。' },
            { term: '最危险的是中间那句', explain: '事实好核，观点一看就是建议，唯独推论最容易被当成结论用进汇报里。看到「说明」「意味着」「因此」这些词，停一下。' },
          ],
        },
        {
          title: '数字、日期、人名、引用——见一个核一个',
          paragraphs: ['不用整篇逐字核，抓这四类就够。它们的共同点是有标准答案，一核就知道对不对，而且错了最容易被人当场抓住。'],
          bullets: [
            { term: '四类红灯词', explain: '精确数字、具体日期、人名机构名、引用和出处。看到就停，回原文对一遍。' },
            { term: '坑：出处本身也可能是编的', explain: '你追问「出处是什么」，它会给你一个格式很正规、看起来很可信的出处——这个出处也可能是它编的。必须真的点开看。' },
            { term: '它给不出出处时怎么办', explain: '直接约定规则：「凡是你不确定的，标上待确认，不要编」。企业汇报里最危险的不是空白，是看起来很确定的假信息。' },
            { term: '核不动就别用', explain: '如果一个数字你既找不到来源、又没时间去查，那就删掉它，或者写成「据初步了解」。带着一个核不动的数字发出去，风险是你的。' },
          ],
        },
        {
          title: '答歪了，别重开，接着改',
          paragraphs: ['多数人第一版不满意就整个删掉重来。其实接着改更快，前提是你得说清楚哪儿不对。'],
          bullets: [
            { term: '说具体，别说「不行」', explain: '「第二段那个 18% 不在我给的表里，删掉」比「不行，重写」有效得多。像改下属的稿，圈出具体哪句。' },
            { term: '一次只改一件事', explain: '一口气提五个修改意见，它会顾此失彼。改完一处看一眼，再提下一处。' },
            { term: '改到第三轮还不对，回去补背景', explain: '这通常不是它的问题，是你一开始要求没说清。回到「话怎么说它才懂」那章，把四要素补全再来一次。' },
            { term: '改五六轮还不如自己写，就自己写', explain: '它是加速器，不是必须用的工具。判断标准很简单：你花在改上的时间，已经超过自己写的时间了吗。' },
          ],
        },
      ],
      caseStudy: {
        title: '「销量上升」能不能直接说成「营销有效」',
        situation: 'AI 把两件先后发生的事直接写成了因果：销量涨了，所以活动有效。但材料里没有排除促销、季节、竞品这些因素——它只是把两句话接在了一起。',
        lesson: '事实和推论要分开写。推论要么补上证据，要么标明这是推测。',
      },
      exercise: {
        type: 'evidence-check',
        title: '事实、推论、观点与证据',
        instruction: '逐句判断这是哪一种，再把关键结论连回它该有的证据。',
        claims: [{ text: '本月销量比上月上升。', kind: '事实', evidence: '销量表' }, { text: '上升主要是营销活动带来。', kind: '推论', evidence: '尚无足够证据' }, { text: '下月应加大投放。', kind: '观点', evidence: '需要结合成本和其他因素' }],
        evidenceOptions: ['销量表', '营销活动记录', '成本与渠道数据', '尚无足够证据', '需要结合成本和其他因素'],
        versions: [
          { label: '版本 A', text: '销量上升，所以营销活动有效，下月应加大投放。', usable: false, explanation: '把事实、归因和建议连成了一句确定结论，但中间那步没有证据。' },
          { label: '版本 B', text: '销量表显示本月销量上升；营销归因仍需补充活动与渠道证据，核验成本后再决定投放。', usable: true, explanation: '三种内容分开了，待验证的部分也标明了，每句都能追回去。' },
        ],
      },
      quickCheck: [
        { question: '它给了一个看起来很正规的出处，可以直接用吗？', answer: '不行，出处本身也可能是编的', explanation: '格式正规不等于真实存在。必须点开看到原文才算核过。' },
        { question: '一段话里最容易被误用的是哪一种内容？', answer: '推论', explanation: '它长得像结论，但没有证据支持，最容易被直接搬进汇报。' },
      ],
      takeaway: {
        title: '这一章带走什么',
        items: ['动手前让它复述一遍', '一段话里混着事实、推论、观点', '数字、日期、人名、引用——见一个核一个', '出处也可能是编的，要真的点开看'],
        template: '发出去之前的四问\n1. 这个数字在原材料里吗？\n2. 这句是事实、推论，还是建议？\n3. 出处我真的点开看过吗？\n4. 核不动的部分，我删了还是标注了？',
      },
    },
    {
      id: 'ai-delegation',
      number: '05',
      title: '哪些活能交给它',
      description: '两个问题定位一件事，剩下的照清单办。',
      image: { webp: 'images/ai-xiaoa-ch05.webp', fallback: 'images/ai-xiaoa-ch05.png', width: 1200, height: 800, alt: '小A把任务卡片分到自动处理、协助处理和人工判断的三个区域', caption: '把任务放进合适的协作通道' },
      sections: [
        {
          title: '先问两个问题',
          paragraphs: ['判断一件事能不能交给它，不用想太复杂。只问两个问题，就能定位到下面四个格子里的一个。'],
          bullets: [],
          quadrant: {
            xLabel: '有没有标准答案？',
            yLabel: '答错了，后果多大？',
            cells: [
              { tone: 'go', axis: '没有标准答案 · 代价小', title: '放心交', desc: '起名、润色、改语气、头脑风暴、列清单、写初稿、长文提要点、中译英。错了你一眼就看出来，改一下就行。' },
              { tone: 'warn', axis: '有标准答案 · 代价小', title: '核实后再用', desc: '数字、日期、人名、引用、时效信息。有标准答案意味着一核就知道对不对——核一下再用，别嫌麻烦。' },
              { tone: 'stop', axis: '有标准答案 · 代价大', title: '逐条核，核不动就别用', desc: '合同条款、财务数字、库存数据、法规要求。错一个数字可能就是一次赔付或者一次合规事故。' },
              { tone: 'stop', axis: '没有标准答案 · 代价大', title: '只当参考，你来定', desc: '给供应商的正式承诺、绩效评价、定价策略、组织决策。它可以帮你列选项、挑漏洞，但拍板的是你。' },
            ],
          },
        },
        {
          title: '照着这张清单办',
          paragraphs: ['把上面四个格子归成三档，落到你每天真在干的活上。'],
          bullets: [
            { term: '放心交：它做完你扫一眼就行', explain: '录音转文字、会议纪要初稿、中译英、长报告提三个要点、把一段话改成邮件口吻、给活动起十个名字、把散乱笔记整理成列表、统一表格格式。' },
            { term: '核实后用：它做完你要逐项对', explain: '从材料里提取数字做成表、写含数据的汇报段落、整理竞品信息、总结法规要点、做时间线。这类它很容易在细节上编，产出必须对着原文过一遍。' },
            { term: '只当参考：它出料，你出判断', explain: '分析业绩波动原因、写方案的思路部分、设计培训内容、准备跨部门沟通的说法。让它给三个角度，你挑一个，理由你自己想。' },
            { term: '必须你来：签字的、涉人的、定方向的', explain: '给供应商的正式回复、下属的绩效评语、定价和折扣决策、组织调整、任何要你署名负责的对外内容。这些它连初稿都要慎用——因为你很容易被它的措辞带偏。' },
          ],
        },
        {
          title: '要你签字的，它只能打底',
          paragraphs: ['最后这条是底线，跟前面的判断无关：不管一件事多简单、它做得多好，只要最后是你署名，责任就是你的。'],
          bullets: [
            { term: '谁发出去谁负责，工具不背锅', explain: '这跟你套模板写材料、用实习生的初稿是一个道理——署名的人对结果负责。「这是 AI 写的」不是一个能用的解释。' },
            { term: '猴掌的教训', explain: '有个老寓言：一只猴掌能实现你的愿望，它精确实现了每个愿望的字面含义，却带来灾难——因为愿望本身有歧义。外包了「怎么做」没问题，外包了「做什么」才是危险的。' },
            { term: '验证那一步，省不得', explain: '你可以把整理、改写、打底全交出去，省下的时间正好用来做只有你能做的那部分：判断这个结论对不对、这个口径能不能对外、这个风险要不要提。' },
          ],
        },
      ],
      caseStudy: {
        title: '一份月度汇报，四段活四种交法',
        situation: '整理数据（放心交）、找出异常（核实后用）、分析异常原因（只当参考）、决定下月优先级并发给管理层（必须你来）。同一份汇报，四段的交法完全不同。',
        lesson: '别整份交出去，也别整份自己写。按段落分，效率最高、风险最低。',
      },
      exercise: {
        type: 'delegation-sort',
        title: '任务分拣台',
        instruction: '把任务放进合适的那一栏，再看看判断理由对不对得上。',
        tasks: [{ text: '把销售表格统一格式', lane: 'AI' }, { text: '根据数据分析异常原因', lane: '人机协作' }, { text: '决定下月跨部门优先级', lane: '人负责' }],
      },
      quickCheck: [
        { question: '判断一件事能不能交给它，问哪两个问题？', answer: '有没有标准答案，答错了代价多大', explanation: '有标准答案就一定要核；代价大就一定要人拍板。' },
        { question: '一件事很简单，但最后要你签字，能全交给它吗？', answer: '不能，它只能打底', explanation: '简单不简单和责任归谁是两件事。署名的人对结果负责。' },
      ],
      takeaway: {
        title: '这一章带走什么',
        items: ['两个问题：有没有标准答案、错了代价多大', '放心交 / 核实后用 / 只当参考 / 必须你来', '一份活可以分段交，不用整份定夺', '要你签字的，它只能打底'],
        template: '交之前问两句\n1. 这件事有标准答案吗？（有 → 一定要核）\n2. 答错了后果多大？（大 → 一定要我拍板）\n\n分段交：\n整理部分 → 放心交\n含数字部分 → 核实后用\n判断部分 → 只当参考\n署名部分 → 必须我来',
      },
    },
    {
      id: 'ai-workflow',
      number: '06',
      title: '好用的那次，怎么让它下次还好用',
      description: '把一次成功写下来，再把不能碰的红线记住。',
      image: { webp: 'images/ai-xiaoa-ch06.webp', fallback: 'images/ai-xiaoa-ch06.png', width: 1200, height: 800, alt: '小A把一次成功对话整理成模板并连接到可复用的工作流', caption: '把一次成功，沉淀成下次还能复用的流程' },
      sections: [
        {
          title: '把一次成功写成菜谱',
          paragraphs: ['一次做成了不算本事，下次还能做成才算。区别就在于你有没有把过程写下来。', '像写菜谱：要什么料、分几步、出来什么样。不写，每次都是重新试一遍。'],
          bullets: [
            { term: '输入：这次我给了它什么', explain: '哪几份材料、什么背景、什么限制。把这次真正起作用的那几样列出来——通常比你以为的少。' },
            { term: '步骤：分了几次说', explain: '一次说清很少见，多数是分了两三轮。记下顺序：先要什么、再补什么、最后改什么。' },
            { term: '输出：长什么样算对', explain: '这次的结果为什么能用？是格式对了，还是长度对了，还是口径对了？写下来，下次直接当验收标准。' },
            { term: '存成一段可以直接贴的文字', explain: '不用做成什么系统。一个备忘录文件、一条钉钉收藏都行，下次开新对话直接贴进去。' },
          ],
        },
        {
          title: '检查点插在哪',
          paragraphs: ['像流水线上的质检工位。不是最后一道才检——那时候错已经带到底了，返工成本最高。'],
          bullets: [
            { term: '插在「下一步会放大这个错」的地方', explain: '数字进汇报之前、稿子发出去之前、结论进决策之前。这几个点过了，错误就开始滚雪球。' },
            { term: '一份汇报的典型检查点', explain: '提取完数字先对一遍原表（不然后面全建立在错数上）；写完初稿先看结论对不对（不然改的全是措辞）；发出去前看口径（不然收不回来）。' },
            { term: '别设太多', explain: '打断太频繁，人会形成「顺手点确认」的惯性，确认机制反而失效。两三个关键点比十个走过场的强。' },
            { term: '判断标准：这一步错了，后面能不能发现', explain: '能发现的就不用设卡；发现不了、或者发现时已经晚了的，必须设。' },
          ],
        },
        {
          title: '有四类东西绝对不能贴进去',
          paragraphs: ['这一节和效率无关，是底线。前面所有技巧都可以按情况取舍，这一条没有例外。'],
          bullets: [
            { term: '员工个人信息', explain: '姓名和薪酬、绩效、处分记录、家庭住址、证件号码绑在一起的任何内容。单独一个姓名不算，绑上这些就算。' },
            { term: '消费者个人信息', explain: '能认出具体某个人的东西：姓名、手机、邮箱、地址、支付信息、会员号、带这些字段的订单和退换货记录。' },
            { term: '健康和医疗信息', explain: '任何人的都不行，员工的、消费者的都一样。' },
            { term: '密码、密钥、接口凭证', explain: '包括数据库连接串、API key、后台账号。贴进去等于公开。' },
            { term: '订单和流量数据怎么用', explain: '可以用，但要先把能认出具体是谁的那几列删掉或者做匿名化。汇总过的、统计过的数据没问题。' },
            { term: '判断标准：默认你贴进去的东西可能被别人看到', explain: '不同产品的条款差别很大，企业版和个人版也不一样。稳妥的做法是按「会被看到」来决定贴什么。具体能用哪些工具、什么数据能进，以公司 IT 与合规政策为准，用之前先确认。' },
          ],
        },
      ],
      caseStudy: {
        title: '每月都要做的汇报，第三次开始不用重讲了',
        situation: '前两次每次都从头解释材料、口径和格式，结果还不稳定。第三次把输入、步骤、验收标准写成一段话存下来，之后每次贴一遍，十分钟出初稿。',
        lesson: '值得沉淀的信号有两个：这件事会重复出现，而且它的输入和输出说得清楚。',
      },
      exercise: {
        type: 'workflow-builder',
        title: '工作流排序与检查点',
        instruction: '把步骤排成合理顺序，标出每步谁来做，再想想检查点该插在哪。',
        steps: [{ text: '收集当月数据', owner: 'AI' }, { text: '提取变化与异常', owner: '人机协作' }, { text: '核对来源和口径', owner: '人负责', checkpoint: true }, { text: '生成汇报初稿', owner: 'AI' }, { text: '确定优先级并交付', owner: '人负责', checkpoint: true }],
        shuffleOrder: [3, 0, 4, 1, 2],
      },
      quickCheck: [
        { question: '什么样的活值得写成菜谱？', answer: '会重复出现，而且输入输出说得清楚', explanation: '只做一次的事不用沉淀；说不清输入输出的事也沉淀不了。' },
        { question: '哪一类信息绝对不能贴给 AI？', answer: '员工和消费者个人信息、健康信息、密码密钥', explanation: '这四类没有例外。订单流量数据要先去掉能认出具体是谁的字段。' },
      ],
      takeaway: {
        title: '这一章带走什么',
        items: ['写下输入、步骤、验收标准，下次直接贴', '检查点插在「下一步会放大这个错」的地方', '检查点别设太多，会变成顺手点确认', '四类红线：员工信息、消费者信息、健康信息、密钥'],
        template: '把这次成功存下来\n输入：____\n步骤：1.___ 2.___ 3.___\n验收标准：____\n检查点：____\n\n红线自查（贴进去之前）\n□ 有没有能认出具体某个人的信息？\n□ 有没有密码、密钥、连接串？\n□ 这个工具公司批准用了吗？',
      },
    },
  ];

  // 「小白三千问」：六章主线之外的常见问题速查。
  // 只放内部原创问答，不列外部工具与站点（那些统一由 resources.html 承接）。
  // 凡涉及公司政策、可用工具、数据口径，一律指向 IT 与合规，不在这里下结论。
  var faqGroups = [
    {
      id: 'usage',
      label: '会用篇',
      intro: '上手就会遇到的八个问题',
      items: [
        { q: '第一次用 AI 从哪开始', a: '从你手上最烦的一件小事开始。挑一件有现成材料、结果好检查的活，比如把一段会议记录整理成纪要。先看它做得怎么样，再决定要不要交更重的活。', tip: '别一上来就问它「你能做什么」，直接把活给它更快。' },
        { q: '第一句话该怎么问', a: '把四要素说全：目标、背景、任务、输出要求。比如「我要给区域经理做周度汇报，这是原始数据，请提炼三个重点，两百字以内」。四要素齐了，返工次数会明显下降，这一点在「把需求说清楚」那章有展开。' },
        { q: '怎么让它答得更好', a: '给它更多背景，而不是更多形容词。说清楚给谁看、什么场合、要多长、有什么不能提，比说「写得专业一点」有用得多。也可以让它先复述一遍你的要求，确认理解一致再动手。', tip: '把你觉得写得好的旧材料贴给它，让它照着这个风格来。' },
        { q: '答得不对怎么办', a: '别急着重开一轮，直接告诉它哪里不对。指出具体问题「第二段的数字不在我给的表里」，比说「不行，重写」有效得多。改三轮还是不对，多半是要求没说清，回去补背景。' },
        { q: '每次都要重说背景吗', a: '同一个对话里不用，换新对话就要。上下文像临时工作记忆，关掉重开它不会自动记得你上次说过什么。所以常用的背景建议存成一段文字，需要时直接贴上去。', tip: '给自己攒一张「项目背景卡」，每开新对话先贴一次。' },
        { q: '能不能上传文件', a: '多数助手可以，但先确认两件事。一是这个工具在公司是否被批准使用，二是文件里有没有不能外传的内容。具体口径以公司 IT 与合规政策为准，使用前请先确认。' },
        { q: '用中文问还是英文问', a: '你更顺手的那个就行，现在主流模型的中文都不弱。要产出英文材料就直接用英文提要求，别中文写完再让它翻译，绕一道容易走味。', tip: '可以中文说要求、指定输出英文，这样最省事。' },
        { q: '什么时候该换人做', a: '三种情况直接自己上：需要你签字负责的、要靠内部人际判断的、你自己都说不清要什么的。还有一种是改了五六轮还不如自己写，那就自己写。AI 是加速器，不是替你拿主意的人。' },
      ],
    },
    {
      id: 'concepts',
      label: '概念扫盲',
      intro: '常听到的词，用人话讲一遍',
      items: [
        { q: 'Token 是什么', a: '模型处理文字的最小单位，可以理解成字词的碎片。它把你的话切成 Token，再根据上下文一步步预测下一个最可能的 Token。长度限制和计费算的都是 Token 数，不是字数。' },
        { q: '上下文和上下文窗口', a: '上下文是这轮对话里它能看到的全部内容，像临时工作记忆；上下文窗口是这块记忆的容量上限。聊太长，早期内容会被挤出去，它就开始忘事、前后矛盾。新对话不等于自动记住过去。', tip: '发现它开始答非所问，就新开一轮，把关键背景重贴一遍。' },
        { q: '幻觉到底是什么', a: '它一本正经地编出不存在的内容，数字、引文、人名、出处都可能是假的。原因是它的目标是生成像答案的文本，不是逐条查证。输出流畅不代表已经查证，这一点在「看清边界」那章有展开。' },
        { q: '大模型是什么', a: '一个从海量文本里学到语言和知识模式的程序。它不是去数据库里查，而是根据上下文一步步预测下一个最可能的 Token。所以它擅长组织和表达，不天然擅长精确事实。' },
        { q: 'Agent 和聊天差在哪', a: 'Agent = 模型 + 目标 + 工具 + 执行与检查循环。聊天是你问一句它答一句，Agent 是你给一个目标，它自己分步骤、调工具、检查结果。省事的代价是你要更早把验收标准说清楚。' },
        { q: 'RAG 是什么', a: '让模型先去指定资料里检索，再根据查到的内容作答，相当于开卷考试。好处是能明显减少瞎编，还能给出处。前提是资料本身对、且是新的，垃圾进照样垃圾出。' },
        { q: '多模态是什么', a: '指它不只能读文字，还能看图、听音频、读表格和截图。实际用处是你可以直接把 PPT 截图、白板照片丢给它，让它整理成文字。但识别不等于理解，图里的关键数字仍要自己核一遍。' },
        { q: 'Prompt 就是提示词吗', a: '是，就是你发过去的那段话。别把它想成咒语，本质是一次任务交代，跟你给同事派活是一回事。目标、背景、任务、输出要求这四样说全，效果就出来了。' },
        { q: '跟它聊天算训练它吗', a: '一般不算。训练是厂商提前用海量数据把模型做出来，你日常的每次对话只是在使用这个已经做好的模型。但输入内容是否被留存，取决于产品设置和合同条款，以公司 IT 与合规政策为准。' },
      ],
    },
    {
      id: 'myths',
      label: '祛魅打假',
      intro: '传得最广的八个误会',
      items: [
        { q: 'AI 会取代我的工作吗', a: '短期更可能被取代的是任务，不是岗位。它能接走整理、改写、初稿这类环节，需要担责、协调、拍板的部分还在你手上。真正的差距会先出现在会用的人和不会用的人之间。', tip: '把你一周的活列出来，标出重复环节，先从那几件下手。' },
        { q: '它是真的懂我意思吗', a: '它是在根据上下文预测下一个最可能的 Token，不是像人那样理解。效果上常常像懂了，因为它见过大量类似表达。所以你说得模糊时，它会顺着猜，而不是停下来问你。' },
        { q: '它说得自信就是对的吗', a: '不是。自信是语言风格，不是准确度信号，它不会因为没把握就语气变虚。数字、日期、引用、人名这四类最容易出问题，必须回原始材料核对。' },
        { q: 'AGI 是不是快来了', a: '没有可靠答案，业内分歧很大，谁给你一个确切时间表都要打问号。对日常工作更实际的判断是：能力在变强，但需要人负责的那部分不会自动消失。与其押时间点，不如把手上的活先跑顺。' },
        { q: '它在偷偷学我的数据吗', a: '不同产品差别很大，企业版和个人版的条款通常不一样，不能一概而论。稳妥做法是默认「贴进去的东西可能会被别人看到」，据此决定贴什么。具体口径以公司 IT 与合规政策为准。' },
        { q: '越贵的模型越好吗', a: '不一定，要看活的类型。更强的推理适合复杂分析和多步骤任务；更快更浅的模型做整理、改写、翻译完全够用，还不用等。常见的浪费是用重武器去打调格式这种小活。', tip: '先用轻的试一次，不满意再换重的，比反过来省时间。' },
        { q: '它能预测未来帮我决策吗', a: '不能预测未来，它没有水晶球，只有过去的语言模式。但它可以帮你把决策做扎实：列选项、找反面论据、推演不同假设、挑你方案里的漏洞。结论和责任仍然是你的。' },
        { q: '提示词咒语有用吗', a: '有用的部分不是咒语，是它逼着你把要求说清楚了。「你是资深顾问」这类开场作用有限，真正起效的是背景、约束和输出格式。与其背模板，不如练四要素：目标、背景、任务、输出要求。' },
      ],
    },
    {
      id: 'cost_safety',
      label: '花钱与安全',
      intro: '花多少钱，什么绝对不能碰',
      items: [
        { q: '免费版够用吗', a: '日常整理、改写、答疑这类活，免费版通常够。会卡住的是长材料、复杂多步任务和使用次数限制。公司具体可用哪些工具、免费还是付费，以公司 IT 与合规政策为准，使用前请先确认。' },
        { q: '付费版贵在哪', a: '一般买三样：更强的推理、更大的上下文容量、更稳定的响应和额度。对普通用户最能感知的，往往是不用排队和能处理更长的材料。值不值，看你每周真正卡在这三点上的次数。' },
        { q: '为什么有时候特别慢', a: '常见三个原因：使用高峰排队、你的材料太长要处理的 Token 多、模型在做多步推理。不急就等一等，急的话把材料截短、任务拆小，通常立刻变快。', tip: '一次只问一件事，比一口气问五件跑得快，答得也更准。' },
        { q: '公司数据能贴进去吗', a: '取决于数据分级和你用的是哪个工具，不能一概而论。通用原则是：公开信息随便用，内部信息只在公司批准的工具里用，敏感信息不要贴。具体口径以公司 IT 与合规政策为准，使用前请先确认。' },
        { q: '哪些内容绝对不能输', a: '四类红线：员工个人信息、消费者个人信息、健康与医疗信息、密码密钥与连接串。订单和流量数据要先去掉能识别到个人的字段再用。这条没有例外，不确定就先问合规。' },
        { q: '生成的内容能直接发吗', a: '不能。把它当成同事交上来的初稿：事实要核、口径要对、语气要合场合，对外材料尤其如此。涉及法律、财务和人事影响的内容，发出去前必须有人复核并签字。' },
        { q: '出了错算谁的责任', a: '谁发出去谁负责，工具不承担责任。这跟你套模板写材料、用实习生的初稿是一个道理，署名的人对结果负责。所以验证这一步省不得，「验证结果」那章讲了怎么快速核。' },
      ],
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

  // 把一章拆成显式小节，用于左侧路径栏的 x/n 进度与「上次读到哪」。
  // 顺序必须和 renderChapter 里 DOM 的实际顺序一致。
  var sectionListCache = Object.create(null);

  function chapterSections(chapter) {
    if (!chapter) return [];
    var cached = safeOwnGet(sectionListCache, chapter.id);
    if (cached) return cached;
    var list = [];
    for (var index = 0; index < chapter.sections.length; index += 1) {
      list.push({ key: 'c' + index, title: chapter.sections[index].title });
    }
    // 案例/练习/自测都是可选块，只有真存在时才进目录，
    // 否则侧栏会列出页面上根本没有的小节。
    if (chapter.caseStudy) list.push({ key: 'case', title: '工作案例' });
    if (chapter.exercise) list.push({ key: 'ex', title: '动手练一练' });
    if (chapter.quickCheck) list.push({ key: 'qc', title: '快速想一想' });
    list.push({ key: 'ta', title: '带走要点' });
    sectionListCache[chapter.id] = list;
    return list;
  }

  function sectionKeySet(chapter) {
    var set = Object.create(null);
    var list = chapterSections(chapter);
    for (var index = 0; index < list.length; index += 1) set[list[index].key] = true;
    return set;
  }

  function sectionTitle(chapterId, key) {
    var list = chapterSections(safeOwnGet(chapterById, chapterId));
    for (var index = 0; index < list.length; index += 1) {
      if (list[index].key === key) return list[index].title;
    }
    return '';
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

  // 会话状态形状（v2）：
  //   s    章节状态       { [chapterId]: 'in-progress' | 'seen' }
  //   p    小节阅读进度   { [chapterId]: { r: [sectionKey], last: sectionKey } }
  //   last 上次停留的章节 chapterId
  // 仍然只写 sessionStorage：关闭标签页即重置，不建立长期学习档案。
  function sanitizeState(value) {
    var clean = emptyState();
    clean.s = Object.create(null);
    clean.p = Object.create(null);
    clean.last = null;
    if (!isPlainObject(value)) return clean;
    // v1 是扁平的 { [chapterId]: status }，读到旧数据时平滑升级。
    var legacy = !isPlainObject(value.s);
    var statusSource = legacy ? value : value.s;
    var progressSource = isPlainObject(value.p) ? value.p : null;
    for (var index = 0; index < chapters.length; index += 1) {
      var id = chapters[index].id;
      var status = safeOwnGet(statusSource, id);
      if (status === STATUS_STARTED || status === STATUS_SEEN) clean.s[id] = status;
      var progress = progressSource ? safeOwnGet(progressSource, id) : null;
      if (!isPlainObject(progress)) continue;
      var keys = sectionKeySet(chapters[index]);
      var read = [];
      if (Array.isArray(progress.r)) {
        for (var readIndex = 0; readIndex < progress.r.length; readIndex += 1) {
          var key = progress.r[readIndex];
          if (typeof key === 'string' && keys[key] === true && read.indexOf(key) < 0) read.push(key);
        }
      }
      var lastKey = typeof progress.last === 'string' && keys[progress.last] === true ? progress.last : null;
      if (read.length || lastKey) clean.p[id] = { r: read, last: lastKey };
    }
    if (isKnownChapter(value.last)) clean.last = value.last;
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
    return safeOwnGet(readState().s, id) || STATUS_UNSEEN;
  }

  function markStarted(id) {
    if (!isKnownChapter(id)) return STATUS_UNSEEN;
    var state = readState();
    if (state.s[id] !== STATUS_SEEN && state.s[id] !== STATUS_STARTED) {
      state.s[id] = STATUS_STARTED;
      writeState(state);
    }
    return getStatus(id);
  }

  function markSeen(id) {
    if (!isKnownChapter(id)) return STATUS_UNSEEN;
    var state = readState();
    if (state.s[id] !== STATUS_SEEN) {
      state.s[id] = STATUS_SEEN;
      writeState(state);
    }
    return getStatus(id);
  }

  // 记录「读到了哪个小节」。第一次读到正文第二节（或任意非首节）时，
  // 才把整章置为「正在看」——避免一打开页面就全部亮起「正在看」。
  function markSectionRead(id, key) {
    if (!isKnownChapter(id)) return;
    var chapter = safeOwnGet(chapterById, id);
    if (sectionKeySet(chapter)[key] !== true) return;
    var state = readState();
    var entry = safeOwnGet(state.p, id);
    if (!isPlainObject(entry)) {
      entry = { r: [], last: null };
      state.p[id] = entry;
    }
    var changed = false;
    if (entry.r.indexOf(key) < 0) {
      entry.r.push(key);
      changed = true;
    }
    if (entry.last !== key) {
      entry.last = key;
      changed = true;
    }
    if (state.last !== id) {
      state.last = id;
      changed = true;
    }
    if (entry.r.length >= 2 && state.s[id] !== STATUS_SEEN && state.s[id] !== STATUS_STARTED) {
      state.s[id] = STATUS_STARTED;
      changed = true;
    }
    if (changed) writeState(state);
  }

  function readSectionCount(id) {
    var entry = safeOwnGet(readState().p, id);
    return isPlainObject(entry) && Array.isArray(entry.r) ? entry.r.length : 0;
  }

  function totalSectionCount(id) {
    return chapterSections(safeOwnGet(chapterById, id)).length;
  }

  function lastSectionKey(id) {
    var entry = safeOwnGet(readState().p, id);
    return isPlainObject(entry) && typeof entry.last === 'string' ? entry.last : null;
  }

  function lastChapterId() {
    var last = readState().last;
    return isKnownChapter(last) ? last : null;
  }

  // 本次浏览是否已经动过任何一章。决定 learn.html 走「首次视图」还是「回访视图」。
  function touchedCount() {
    var count = 0;
    for (var index = 0; index < chapters.length; index += 1) {
      if (getStatus(chapters[index].id) !== STATUS_UNSEEN || readSectionCount(chapters[index].id) > 0) count += 1;
    }
    return count;
  }

  function hasSessionHistory() {
    return touchedCount() > 0;
  }

  // 回访时「继续」优先回到上次停留的那一章；否则给第一个没看完的章节。
  function resumeChapterId() {
    var last = lastChapterId();
    if (last && getStatus(last) !== STATUS_SEEN) return last;
    return nextIncomplete();
  }

  function nextIncomplete() {
    for (var index = 0; index < chapters.length; index += 1) {
      if (getStatus(chapters[index].id) !== STATUS_SEEN) return chapters[index].id;
    }
    return null;
  }

  // 契约固定为 未看 / 正在看 / 看过，不要改词。
  // 原来「一进页面就正在看」的问题出在 markStarted 的触发时机，已在 renderChapter 修正。
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

  // 卡片和路径栏统一显示 x/n 小节进度，对齐目录页与详情页的口径。
  function sectionRatioCopy(id) {
    return readSectionCount(id) + ' / ' + totalSectionCount(id);
  }

  function seenCount() {
    var count = 0;
    for (var index = 0; index < chapters.length; index += 1) {
      if (getStatus(chapters[index].id) === STATUS_SEEN) count += 1;
    }
    return count;
  }

  function actionCopy(status) {
    if (status === STATUS_SEEN) return '再看一遍';
    if (status === STATUS_STARTED) return '接着读';
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

  function setHidden(node, hidden) {
    if (!node) return;
    node.hidden = !!hidden;
  }

  // 目录页有两套视图：
  //   首次视图  —— 本次浏览还没动过任何一章：不摆 0/6 空进度，直接给一个起点。
  //   回访视图  —— 至少动过一章：给「接着读第 N 章」、总进度和上次停留位置。
  function renderHubHeader(scope, repeat) {
    if (!scope || typeof scope.querySelector !== 'function') return;
    var summary = scope.querySelector('[data-learning-summary]');
    var firstHint = scope.querySelector('[data-learning-first-hint]');
    var resumeNote = scope.querySelector('[data-learning-resume-note]');
    setHidden(summary, !repeat);
    setHidden(firstHint, repeat);

    var continueLink = scope.querySelector('[data-learning-continue]');
    var resumeId = repeat ? resumeChapterId() : chapters[0].id;
    if (continueLink && typeof continueLink.setAttribute === 'function') {
      if (resumeId) {
        continueLink.setAttribute('href', 'detail.html?type=learn&id=' + encodeURIComponent(resumeId));
        var resumeChapter = safeOwnGet(chapterById, resumeId);
        continueLink.textContent = repeat
          ? '接着读 · 第 ' + Number(resumeChapter.number) + ' 章 ' + resumeChapter.title
          : '从第 1 章开始';
      } else {
        continueLink.setAttribute('href', 'detail.html?type=learn&id=' + encodeURIComponent(chapters[0].id));
        continueLink.textContent = '六章都看完了，再看一遍';
      }
    }

    if (!resumeNote) return;  // 这行提示已从页面移除，保留分支以兼容旧结构
    var lastId = lastChapterId();
    var lastKey = lastId ? lastSectionKey(lastId) : null;
    if (repeat && lastId && lastKey) {
      var lastChapter = safeOwnGet(chapterById, lastId);
      resumeNote.textContent = '上次读到「' + lastChapter.title + ' · ' + sectionTitle(lastId, lastKey) + '」。';
      setHidden(resumeNote, false);
    } else {
      setHidden(resumeNote, true);
    }
  }

  function initHub(root) {
    var scope = root || (typeof document !== 'undefined' ? document : null);
    if (!scope || typeof scope.querySelectorAll !== 'function') return false;
    var repeat = hasSessionHistory();
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

      var progressNode = typeof card.querySelector === 'function' ? card.querySelector('[data-card-progress]') : null;
      if (progressNode) {
        var read = readSectionCount(id);
        var total = totalSectionCount(id);
        progressNode.textContent = read > 0 ? read + ' / ' + total + ' 节' : total + ' 节';
        progressNode.setAttribute('data-read', String(read));
        progressNode.setAttribute('data-total', String(total));
        progressNode.style.setProperty('--card-progress', total > 0 ? (read / total) : 0);
      }

      // 首次视图给第一章一个明确起点，避免六张同权重的卡片让人不知从哪开始。
      if (card.classList) {
        if (!repeat && index === 0) card.classList.add('learning-card-suggested');
        else card.classList.remove('learning-card-suggested');
      }
      var suggestNode = typeof card.querySelector === 'function' ? card.querySelector('[data-card-suggest]') : null;
      setHidden(suggestNode, repeat || index !== 0);
    }

    renderHubHeader(scope, repeat);
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

  // 「小白三千问」：分组标签 + 折叠问答。纯本地内容，无状态、无计分。
  function initFaq(root) {
    var scope = root || (typeof document !== 'undefined' ? document : null);
    if (!scope || typeof scope.querySelector !== 'function') return false;
    var mount = scope.querySelector('[data-faq-mount]');
    if (!mount) return false;
    var ownerDocument = mount.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (!ownerDocument || typeof ownerDocument.createElement !== 'function') return false;
    clearNode(mount);

    var tabs = element(ownerDocument, 'div', 'faq-tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', '小白三千问分组');
    var panels = element(ownerDocument, 'div', 'faq-panels');
    var buttons = [];
    var panelNodes = [];

    function activate(activeIndex) {
      for (var index = 0; index < buttons.length; index += 1) {
        var active = index === activeIndex;
        buttons[index].setAttribute('aria-selected', active ? 'true' : 'false');
        buttons[index].setAttribute('tabindex', active ? '0' : '-1');
        panelNodes[index].hidden = !active;
      }
    }

    for (var groupIndex = 0; groupIndex < faqGroups.length; groupIndex += 1) {
      (function (group, currentIndex) {
        var panelId = 'faq-panel-' + group.id;
        var tabId = 'faq-tab-' + group.id;

        var button = element(ownerDocument, 'button', 'faq-tab');
        button.setAttribute('type', 'button');
        button.setAttribute('role', 'tab');
        button.setAttribute('id', tabId);
        button.setAttribute('aria-controls', panelId);
        button.appendChild(element(ownerDocument, 'span', 'faq-tab-label', group.label));
        button.appendChild(element(ownerDocument, 'span', 'faq-tab-count', String(group.items.length) + ' 问'));
        button.addEventListener('click', function () { activate(currentIndex); });
        button.addEventListener('keydown', function (event) {
          var step = event.key === 'ArrowRight' ? 1 : (event.key === 'ArrowLeft' ? -1 : 0);
          if (!step) return;
          event.preventDefault();
          var nextIndex = (currentIndex + step + buttons.length) % buttons.length;
          activate(nextIndex);
          buttons[nextIndex].focus();
        });
        tabs.appendChild(button);
        buttons.push(button);

        var panel = element(ownerDocument, 'div', 'faq-panel');
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('id', panelId);
        panel.setAttribute('aria-labelledby', tabId);
        panel.appendChild(element(ownerDocument, 'p', 'faq-panel-intro', group.intro));
        var list = element(ownerDocument, 'div', 'faq-list');
        for (var itemIndex = 0; itemIndex < group.items.length; itemIndex += 1) {
          var item = group.items[itemIndex];
          var details = element(ownerDocument, 'details', 'faq-item');
          var summary = element(ownerDocument, 'summary', 'faq-question');
          summary.appendChild(element(ownerDocument, 'span', 'faq-question-text', item.q));
          details.appendChild(summary);
          details.appendChild(element(ownerDocument, 'p', 'faq-answer', item.a));
          if (item.tip) {
            var tip = element(ownerDocument, 'p', 'faq-tip');
            tip.appendChild(element(ownerDocument, 'span', 'faq-tip-label', '实操'));
            tip.appendChild(ownerDocument.createTextNode(item.tip));
            details.appendChild(tip);
          }
          list.appendChild(details);
        }
        panel.appendChild(list);
        panels.appendChild(panel);
        panelNodes.push(panel);
      }(faqGroups[groupIndex], groupIndex));
    }

    mount.appendChild(tabs);
    mount.appendChild(panels);
    activate(0);
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
        var sceneChevron = svgEl(ownerDocument, 'svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', class: 'lesson-scene-cue' });
        sceneChevron.appendChild(svgEl(ownerDocument, 'path', { d: 'M6 9l6 6 6-6' }));
        sceneButton.appendChild(sceneChevron);
        var panel = element(ownerDocument, 'div', 'lesson-scene-panel');
        panel.setAttribute('id', panelId);
        panel.setAttribute('data-scene-panel', String(currentSceneIndex));
        panel.hidden = currentSceneIndex !== 0;
        if (currentSceneIndex === 0) sceneButton.setAttribute('aria-expanded', 'true');
        var details = element(ownerDocument, 'dl', 'lesson-scene-details');
        // 用第二人称问句代替「输入材料 / AI 协助 / 人要确认」这类抽象名词，
        // 新手不用先建立一套术语模型才看得懂这张卡。
        var labels = ['你给它什么', '它帮你做到哪一步', '你必须自己检查什么'];
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

        });
        card.appendChild(sceneButton);
        card.appendChild(panel);
        grid.appendChild(card);
      }(scenes[sceneIndex], sceneIndex));
    }
    root.appendChild(grid);
  }

  // ===================== 小节级演示组件 =====================
  // 全部用 HTML/SVG 手写，不引外部图片：可点、可动、改文案不用重新导图，
  // 且自动契合蓝白无渐变基线，移动端也不会糊。

  function svgEl(ownerDocument, name, attrs) {
    var node = ownerDocument.createElementNS('http://www.w3.org/2000/svg', name);
    for (var key in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, key)) node.setAttribute(key, String(attrs[key]));
    }
    return node;
  }

  // 用 fieldset/legend 承载，屏幕阅读器能把整组控件当成一个有名字的整体；
  // 每个演示自带一个 polite 区域播报操作结果。
  function demoShell(ownerDocument, root, demo, extraClass) {
    // kind: 'hands-on'（默认，黄色，可点）或 'note'（青色，只读的小知识）
    var kind = demo.kind === 'note' ? 'note' : 'hands-on';
    var wrap = element(ownerDocument, 'fieldset', 'lesson-demo lesson-interaction ' + extraClass);
    wrap.setAttribute('data-demo-kind', kind);
    var legend = element(ownerDocument, 'legend', 'lesson-demo-title', demo.title || (kind === 'note' ? '小知识' : '动手试试'));
    wrap.appendChild(legend);
    if (demo.hint) wrap.appendChild(element(ownerDocument, 'p', 'lesson-demo-hint', demo.hint));
    var live = element(ownerDocument, 'p', 'lesson-demo-live sr-only');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('data-demo-live', '');
    wrap.appendChild(live);
    root.appendChild(wrap);
    return wrap;
  }

  function demoAnnounce(wrap, message) {
    var live = wrap.querySelector('[data-demo-live]');
    if (live && live.textContent !== message) live.textContent = message;
  }

  // 1) 同心圆：AI ⊃ 生成式 AI ⊃ 大模型，Agent 外接。点任意一层看说明。
  function renderConcentricDemo(ownerDocument, root, demo) {
    var wrap = demoShell(ownerDocument, root, demo, 'lesson-demo-concentric');
    var stage = element(ownerDocument, 'div', 'lesson-concentric-stage');

    var svg = svgEl(ownerDocument, 'svg', { viewBox: '0 0 360 300', role: 'img', 'aria-label': 'AI、生成式 AI、大模型的包含关系，以及外接的 Agent' });
    var rings = [
      { key: 'ai', r: 118, cx: 150, cy: 150, label: 'AI', ly: 52 },
      { key: 'genai', r: 84, cx: 150, cy: 168, label: '生成式 AI', ly: 108 },
      { key: 'llm', r: 46, cx: 150, cy: 190, label: '大模型', ly: 186 },
    ];
    var shapes = {};
    for (var i = 0; i < rings.length; i += 1) {
      var ring = rings[i];
      var circle = svgEl(ownerDocument, 'circle', { cx: ring.cx, cy: ring.cy, r: ring.r, 'data-ring': ring.key, class: 'lesson-ring' });
      svg.appendChild(circle);
      shapes[ring.key] = circle;
      var text = svgEl(ownerDocument, 'text', { x: ring.cx, y: ring.ly, 'data-ring-label': ring.key, class: 'lesson-ring-label' });
      text.textContent = ring.label;
      svg.appendChild(text);
    }
    // Agent 画在圈外，并用一条连线接到大模型——表示外接，不是包含
    var agentBox = svgEl(ownerDocument, 'rect', { x: 244, y: 214, width: 104, height: 44, rx: 10, 'data-ring': 'agent', class: 'lesson-ring lesson-ring-agent' });
    svg.appendChild(agentBox);
    shapes.agent = agentBox;
    var link = svgEl(ownerDocument, 'path', { d: 'M196 190 H244', class: 'lesson-ring-link' });
    svg.appendChild(link);
    var agentText = svgEl(ownerDocument, 'text', { x: 296, y: 241, 'data-ring-label': 'agent', class: 'lesson-ring-label' });
    agentText.textContent = 'Agent';
    svg.appendChild(agentText);
    stage.appendChild(svg);

    var panel = element(ownerDocument, 'div', 'lesson-concentric-panel');
    var panelTitle = element(ownerDocument, 'h4', 'lesson-concentric-title', '');
    var panelBody = element(ownerDocument, 'p', 'lesson-concentric-body', '');
    var panelExample = element(ownerDocument, 'p', 'lesson-concentric-example', '');
    panel.appendChild(panelTitle);
    panel.appendChild(panelBody);
    panel.appendChild(panelExample);
    stage.appendChild(panel);
    wrap.appendChild(stage);

    var buttons = element(ownerDocument, 'div', 'lesson-demo-buttons');
    var active = null;
    function select(key) {
      active = key;
      for (var ringKey in shapes) {
        if (Object.prototype.hasOwnProperty.call(shapes, ringKey)) {
          shapes[ringKey].setAttribute('data-active', ringKey === key ? 'true' : 'false');
        }
      }
      var labels = svg.querySelectorAll('[data-ring-label]');
      for (var li = 0; li < labels.length; li += 1) {
        labels[li].setAttribute('data-active', labels[li].getAttribute('data-ring-label') === key ? 'true' : 'false');
      }
      var chips = buttons.querySelectorAll('button');
      for (var ci = 0; ci < chips.length; ci += 1) {
        chips[ci].setAttribute('aria-pressed', chips[ci].getAttribute('data-ring-btn') === key ? 'true' : 'false');
      }
      var item = null;
      for (var ii = 0; ii < demo.layers.length; ii += 1) if (demo.layers[ii].key === key) item = demo.layers[ii];
      if (!item) return;
      demoAnnounce(wrap, '已选 ' + item.name + '：' + item.title);
      panelTitle.textContent = item.title;
      panelBody.textContent = item.body;
      panelExample.textContent = item.example || '';
      panelExample.hidden = !item.example;
    }

    for (var bi = 0; bi < demo.layers.length; bi += 1) {
      (function (layer) {
        var button = element(ownerDocument, 'button', 'lesson-demo-chip', layer.name);
        button.setAttribute('type', 'button');
        button.setAttribute('data-ring-btn', layer.key);
        button.addEventListener('click', function () { select(layer.key); });
        buttons.appendChild(button);
      }(demo.layers[bi]));
    }
    wrap.appendChild(buttons);

    for (var si = 0; si < demo.layers.length; si += 1) {
      (function (layer) {
        var target = shapes[layer.key];
        if (!target) return;
        target.setAttribute('tabindex', '0');
        target.setAttribute('role', 'button');
        target.addEventListener('click', function () { select(layer.key); });
        target.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(layer.key); }
        });
      }(demo.layers[si]));
    }
    select(demo.layers[0].key);
    return wrap;
  }

  // 2) 可点时间轴：五个节点，点一个讲清「这一步解决了什么、还差什么」
  function renderTimelineDemo(ownerDocument, root, demo) {
    var wrap = demoShell(ownerDocument, root, demo, 'lesson-demo-timeline');
    var track = element(ownerDocument, 'ol', 'lesson-timeline-track');
    var panel = element(ownerDocument, 'div', 'lesson-timeline-panel');
    var pYear = element(ownerDocument, 'p', 'lesson-timeline-era', '');
    var pTitle = element(ownerDocument, 'h4', 'lesson-timeline-title', '');
    var pSolved = element(ownerDocument, 'p', 'lesson-timeline-line', '');
    var pGap = element(ownerDocument, 'p', 'lesson-timeline-line', '');
    panel.appendChild(pYear);
    panel.appendChild(pTitle);
    panel.appendChild(pSolved);
    panel.appendChild(pGap);

    var nodeButtons = [];
    function select(index) {
      for (var i = 0; i < nodeButtons.length; i += 1) {
        nodeButtons[i].setAttribute('aria-pressed', i === index ? 'true' : 'false');
        nodeButtons[i].parentNode.setAttribute('data-state', i < index ? 'past' : (i === index ? 'current' : 'future'));
      }
      var node = demo.nodes[index];
      demoAnnounce(wrap, '已选 ' + node.name + '。');
      pYear.textContent = node.era;
      pTitle.textContent = node.name;
      clearNode(pSolved);
      pSolved.appendChild(element(ownerDocument, 'strong', '', '解决了：'));
      pSolved.appendChild(ownerDocument.createTextNode(node.solved));
      clearNode(pGap);
      pGap.appendChild(element(ownerDocument, 'strong', '', '还差什么：'));
      pGap.appendChild(ownerDocument.createTextNode(node.gap));
    }

    for (var i = 0; i < demo.nodes.length; i += 1) {
      (function (node, index) {
        var item = element(ownerDocument, 'li', 'lesson-timeline-node');
        var button = element(ownerDocument, 'button', 'lesson-timeline-button');
        button.setAttribute('type', 'button');
        button.appendChild(element(ownerDocument, 'span', 'lesson-timeline-dot', ''));
        button.appendChild(element(ownerDocument, 'span', 'lesson-timeline-name', node.name));
        button.addEventListener('click', function () { select(index); });
        item.appendChild(button);
        track.appendChild(item);
        nodeButtons.push(button);
      }(demo.nodes[i], i));
    }
    wrap.appendChild(track);
    wrap.appendChild(panel);
    select(demo.nodes.length - 1);
    return wrap;
  }

  // 3) 接话茬打字机：逐词生成，每步亮出候选和概率条。
  //    可以自动播，也可以自己挑词——挑个低概率的，句子会当场跑偏，
  //    这是让人「亲眼看见它在猜」最有效的方式。
  function renderTypewriterDemo(ownerDocument, root, demo) {
    var wrap = demoShell(ownerDocument, root, demo, 'lesson-demo-typewriter');

    var screen = element(ownerDocument, 'div', 'lesson-type-screen');
    var prompt = element(ownerDocument, 'p', 'lesson-type-prompt');
    prompt.appendChild(element(ownerDocument, 'span', 'lesson-type-tag', '你输入'));
    prompt.appendChild(ownerDocument.createTextNode(demo.prompt));
    screen.appendChild(prompt);
    var output = element(ownerDocument, 'p', 'lesson-type-output');
    var outputTag = element(ownerDocument, 'span', 'lesson-type-tag lesson-type-tag-ai', '它生成');
    output.appendChild(outputTag);
    var outputText = element(ownerDocument, 'span', 'lesson-type-text', '');
    output.appendChild(outputText);
    var caret = element(ownerDocument, 'span', 'lesson-type-caret', '');
    caret.setAttribute('aria-hidden', 'true');
    output.appendChild(caret);
    screen.appendChild(output);
    wrap.appendChild(screen);

    var stepLabel = element(ownerDocument, 'p', 'lesson-type-steplabel', '');
    wrap.appendChild(stepLabel);
    var candidates = element(ownerDocument, 'div', 'lesson-type-candidates');
    wrap.appendChild(candidates);

    var verdict = element(ownerDocument, 'p', 'lesson-type-verdict');
    wrap.appendChild(verdict);

    var actions = element(ownerDocument, 'div', 'lesson-demo-buttons');
    var autoButton = element(ownerDocument, 'button', 'lesson-demo-action', '自动生成');
    autoButton.setAttribute('type', 'button');
    var resetButton = element(ownerDocument, 'button', 'lesson-demo-chip', '重来一次');
    resetButton.setAttribute('type', 'button');
    actions.appendChild(autoButton);
    actions.appendChild(resetButton);
    wrap.appendChild(actions);

    var stepIndex = 0;
    var chosen = [];
    var timer = null;

    // 候选按钮每步重建，焦点要还回新一批的第一个；
    // 生成结束就落到「重来一次」，键盘用户不会被甩出这个演示。
    function restoreFocus() {
      var target = candidates.querySelector('.lesson-type-candidate') || resetButton;
      try {
        if (target && typeof target.focus === 'function') target.focus({ preventScroll: true });
      } catch (error) {}
    }

    function renderStep() {
      clearNode(candidates);
      outputText.textContent = chosen.join('');
      resetButton.hidden = chosen.length === 0;
      if (stepIndex >= demo.steps.length) {
        stepLabel.textContent = '生成结束。整句话是一个词一个词猜出来的，没有任何一步是去查资料。';
        caret.hidden = true;
        autoButton.disabled = true;
        var offTrack = false;
        for (var ci = 0; ci < chosen.length; ci += 1) if (demo.steps[ci] && chosen[ci] !== demo.steps[ci].options[0].word) offTrack = true;
        verdict.textContent = offTrack
          ? (demo.verdictOffTrack || '你挑了概率低的那个，句子就歪到别处去了——它不会拦你，因为它本来就只是在挑「下一个像样的词」。')
          : (demo.verdictSmooth || '每一步都挑了概率最高的，所以读起来很顺。但「顺」只说明它挑得稳，不说明这句话是真的。');
        verdict.hidden = false;
        return;
      }
      caret.hidden = false;
      verdict.hidden = true;
      var step = demo.steps[stepIndex];
      stepLabel.textContent = '第 ' + (stepIndex + 1) + ' 步 · 它在这几个词里挑一个接上去';
      for (var i = 0; i < step.options.length; i += 1) {
        (function (option) {
          var button = element(ownerDocument, 'button', 'lesson-type-candidate');
          button.setAttribute('type', 'button');
          button.appendChild(element(ownerDocument, 'span', 'lesson-type-word', option.word));
          var bar = element(ownerDocument, 'span', 'lesson-type-bar');
          bar.style.setProperty('--p', String(option.p / 100));
          button.appendChild(bar);
          button.appendChild(element(ownerDocument, 'span', 'lesson-type-prob', option.p + '%'));
          button.addEventListener('click', function () {
            chosen.push(option.word);
            stepIndex += 1;
            renderStep();
            restoreFocus();
            demoAnnounce(wrap, '已选「' + option.word + '」（' + option.p + '%）。' + (stepIndex >= demo.steps.length ? '生成结束。' : '继续挑下一个词。'));
            dispatchExerciseAttempt(wrap, '你亲手挑了一个词。它每一步都是这么干的。');
          });
          candidates.appendChild(button);
        }(step.options[i]));
      }
    }

    autoButton.addEventListener('click', function () {
      if (timer) return;
      timer = setInterval(function () {
        if (stepIndex >= demo.steps.length) {
          clearInterval(timer);
          timer = null;
          return;
        }
        chosen.push(demo.steps[stepIndex].options[0].word);
        stepIndex += 1;
        renderStep();
      }, 620);
      dispatchExerciseAttempt(wrap, '看完了一次逐词生成。');
    });
    resetButton.addEventListener('click', function () {
      if (timer) { clearInterval(timer); timer = null; }
      stepIndex = 0;
      chosen = [];
      autoButton.disabled = false;
      renderStep();
    });

    renderStep();
    return wrap;
  }

  // 4) 上下文窗口：不断加消息，最早的被挤出去变灰。
  //    比讲「上下文窗口有上限」有效得多——你能看见它把哪句话丢了。
  function renderContextWindowDemo(ownerDocument, root, demo) {
    var wrap = demoShell(ownerDocument, root, demo, 'lesson-demo-context');

    var meta = element(ownerDocument, 'p', 'lesson-context-meta');
    wrap.appendChild(meta);

    var deskFrame = element(ownerDocument, 'div', 'lesson-context-desk');
    deskFrame.setAttribute('data-capacity', String(demo.capacity));
    wrap.appendChild(deskFrame);

    var actions = element(ownerDocument, 'div', 'lesson-demo-buttons');
    var addButton = element(ownerDocument, 'button', 'lesson-demo-action', '再聊一轮');
    addButton.setAttribute('type', 'button');
    var resetButton = element(ownerDocument, 'button', 'lesson-demo-chip', '新开一个对话');
    resetButton.setAttribute('type', 'button');
    actions.appendChild(addButton);
    actions.appendChild(resetButton);
    wrap.appendChild(actions);

    var verdict = element(ownerDocument, 'p', 'lesson-context-verdict');
    wrap.appendChild(verdict);

    var turnIndex = 0;
    function render() {
      clearNode(deskFrame);
      var visible = demo.turns.slice(0, turnIndex);
      var dropped = Math.max(0, visible.length - demo.capacity);
      for (var i = 0; i < visible.length; i += 1) {
        var card = element(ownerDocument, 'div', 'lesson-context-card');
        card.setAttribute('data-state', i < dropped ? 'forgotten' : 'kept');
        card.appendChild(element(ownerDocument, 'span', 'lesson-context-role', visible[i].role));
        card.appendChild(element(ownerDocument, 'span', 'lesson-context-text', visible[i].text));
        if (i < dropped) card.appendChild(element(ownerDocument, 'span', 'lesson-context-badge', '已被挤出'));
        deskFrame.appendChild(card);
      }
      if (!visible.length) {
        deskFrame.appendChild(element(ownerDocument, 'p', 'lesson-context-empty', '桌上还什么都没有。点「再聊一轮」开始。'));
      }
      resetButton.hidden = visible.length === 0;
      meta.textContent = '桌面能摊开 ' + demo.capacity + ' 条 · 目前 ' + visible.length + ' 条'
        + (dropped ? ' · 最早的 ' + dropped + ' 条已经掉下去了' : '');
      addButton.disabled = turnIndex >= demo.turns.length;
      if (dropped > 0) {
        verdict.textContent = demo.consequence;
        verdict.hidden = false;
      } else {
        verdict.hidden = true;
      }
    }

    addButton.addEventListener('click', function () {
      if (turnIndex >= demo.turns.length) return;
      turnIndex += 1;
      render();
      demoAnnounce(wrap, meta.textContent);
      if (turnIndex > demo.capacity) dispatchExerciseAttempt(wrap, '你看见它把最早那条挤下去了。');
    });
    resetButton.addEventListener('click', function () {
      turnIndex = 0;
      render();
      verdict.hidden = true;
    });

    render();
    return wrap;
  }

  // 5) 同一件事，两种做法：左边是过去 40 年的软件（你学它的规则），
  //    右边是现在的 AI（它听你的话）。点任一边展开完整步骤。
  function renderShiftDemo(ownerDocument, root, demo) {
    var wrap = demoShell(ownerDocument, root, demo, 'lesson-demo-shift');
    var task = element(ownerDocument, 'p', 'lesson-shift-task');
    task.appendChild(element(ownerDocument, 'span', 'lesson-shift-tasklabel', '同一件事'));
    task.appendChild(ownerDocument.createTextNode(demo.task));
    wrap.appendChild(task);

    var grid = element(ownerDocument, 'div', 'lesson-shift-grid');
    for (var i = 0; i < demo.sides.length; i += 1) {
      (function (side) {
        var card = element(ownerDocument, 'article', 'lesson-shift-card');
        card.setAttribute('data-era', side.era);
        card.appendChild(element(ownerDocument, 'p', 'lesson-shift-era', side.eraLabel));
        card.appendChild(element(ownerDocument, 'h4', 'lesson-shift-how', side.how));
        var list = element(ownerDocument, 'ol', 'lesson-shift-steps');
        for (var si = 0; si < side.steps.length; si += 1) {
          list.appendChild(element(ownerDocument, 'li', '', side.steps[si]));
        }
        card.appendChild(list);
        var cost = element(ownerDocument, 'p', 'lesson-shift-cost');
        cost.appendChild(element(ownerDocument, 'strong', '', side.cost));
        cost.appendChild(ownerDocument.createTextNode(' · ' + side.note));
        card.appendChild(cost);
        grid.appendChild(card);
      }(demo.sides[i]));
    }
    wrap.appendChild(grid);

    var punch = element(ownerDocument, 'p', 'lesson-shift-punch');
    appendEmphasisText(ownerDocument, punch, demo.punchline);
    wrap.appendChild(punch);
    return wrap;
  }

  // 6) 上下文窗口对照：不同模型的桌子大小差很多。
  //    条形按相对长度画，让「差一个数量级」这件事看得见，而不是只读数字。
  function renderContextScaleDemo(ownerDocument, root, demo) {
    var wrap = demoShell(ownerDocument, root, demo, 'lesson-demo-scale');

    var max = 0;
    for (var i = 0; i < demo.models.length; i += 1) {
      if (demo.models[i].tokens > max) max = demo.models[i].tokens;
    }

    var list = element(ownerDocument, 'ul', 'lesson-scale-list');
    for (var index = 0; index < demo.models.length; index += 1) {
      var model = demo.models[index];
      var item = element(ownerDocument, 'li', 'lesson-scale-item');
      var nameNode = element(ownerDocument, 'span', 'lesson-scale-name', '');
      var nameLines = String(model.name).split('\n');
      for (var lineIndex = 0; lineIndex < nameLines.length; lineIndex += 1) {
        if (lineIndex) nameNode.appendChild(ownerDocument.createElement('br'));
        nameNode.appendChild(ownerDocument.createTextNode(nameLines[lineIndex]));
      }
      item.appendChild(nameNode);
      item.appendChild(element(ownerDocument, 'span', 'lesson-scale-value', model.label));
      var barWrap = element(ownerDocument, 'span', 'lesson-scale-bar');
      barWrap.style.setProperty('--w', String(model.tokens / max));
      item.appendChild(barWrap);
      item.appendChild(element(ownerDocument, 'span', 'lesson-scale-note', model.note));
      list.appendChild(item);
    }
    wrap.appendChild(list);

    if (demo.footnote) {
      var footParas = String(demo.footnote).split('\n\n');
      for (var footIndex = 0; footIndex < footParas.length; footIndex += 1) {
        var foot = element(ownerDocument, 'p', footIndex === 0 ? 'lesson-scale-foot' : 'lesson-scale-foot lesson-scale-foot-more');
        appendEmphasisText(ownerDocument, foot, footParas[footIndex]);
        wrap.appendChild(foot);
      }
    }
    return wrap;
  }

  var demoRenderers = Object.assign(Object.create(null), {
    shift: renderShiftDemo,
    'context-scale': renderContextScaleDemo,
    concentric: renderConcentricDemo,
    timeline: renderTimelineDemo,
    typewriter: renderTypewriterDemo,
    'context-window': renderContextWindowDemo,
  });

  // 信任四象限：两个判断维度（有没有标准答案 × 错了代价多大）交叉成四格。
  // 比「问自己三个问题」这类流程式判断更好用——看一眼就能定位。
  function appendTrustQuadrant(ownerDocument, root, quadrant) {
    var wrap = element(ownerDocument, 'div', 'lesson-quadrant');
    wrap.setAttribute('aria-label', '判断一件事能不能交给 AI 的四象限');

    var axes = element(ownerDocument, 'p', 'lesson-quadrant-axes');
    axes.appendChild(element(ownerDocument, 'span', 'lesson-quadrant-axis', quadrant.xLabel));
    axes.appendChild(element(ownerDocument, 'span', 'lesson-quadrant-axis', quadrant.yLabel));
    wrap.appendChild(axes);

    var grid = element(ownerDocument, 'div', 'lesson-quadrant-grid');
    for (var index = 0; index < quadrant.cells.length; index += 1) {
      var cell = quadrant.cells[index];
      var card = element(ownerDocument, 'article', 'lesson-quadrant-cell');
      card.setAttribute('data-tone', cell.tone);
      card.appendChild(element(ownerDocument, 'p', 'lesson-quadrant-axislabel', cell.axis));
      card.appendChild(element(ownerDocument, 'h3', 'lesson-quadrant-title', cell.title));
      card.appendChild(element(ownerDocument, 'p', 'lesson-quadrant-desc', cell.desc));
      grid.appendChild(card);
    }
    wrap.appendChild(grid);
    root.appendChild(wrap);
    return wrap;
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
    var nodeList = element(ownerDocument, 'div', 'lesson-concept-nodes');
    nodeList.setAttribute('role', 'group');
    nodeList.setAttribute('aria-label', 'AI、生成式 AI、大模型与 Agent 的关系');
    var scopeTrack = element(ownerDocument, 'div', 'lesson-concept-scope');
    scopeTrack.setAttribute('data-concept-scope', '');
    var agentBranch = element(ownerDocument, 'div', 'lesson-agent-branch');
    agentBranch.setAttribute('data-agent-branch', '');
    for (var nodeIndex = 0; nodeIndex < exercise.relationshipNodes.length; nodeIndex += 1) {
      (function (relationshipNode, currentNodeIndex) {
        var nodeItem = element(ownerDocument, 'div', 'lesson-concept-node-item');
        var nodeButton = interactionButton(ownerDocument, relationshipNode.label, 'data-concept-node', relationshipNode.label);
        nodeButton.className += ' lesson-concept-node';
        nodeButton.setAttribute('aria-pressed', 'false');
        nodeButton.addEventListener('click', function () {
          setChoiceState(nodeList.querySelectorAll('[data-concept-node]'), nodeButton);
          dispatchExerciseAttempt(root, relationshipNode.label + '：' + relationshipNode.explanation);
        });
        nodeItem.appendChild(nodeButton);
        if (currentNodeIndex < 3) {
          if (currentNodeIndex > 0) {
            var linkText = currentNodeIndex === 1 ? exercise.relationshipLabels.scope : exercise.relationshipLabels.foundation;
            var scopeLink = element(ownerDocument, 'span', 'lesson-concept-link', linkText);
            scopeLink.setAttribute('data-concept-link', currentNodeIndex === 1 ? 'scope' : 'foundation');
            scopeTrack.appendChild(scopeLink);
          }
          scopeTrack.appendChild(nodeItem);
        } else {
          agentBranch.appendChild(element(ownerDocument, 'p', 'lesson-agent-connector', '外接机制'));
          agentBranch.appendChild(nodeItem);
          var agentRelation = element(ownerDocument, 'p', 'lesson-agent-relation');
          agentRelation.setAttribute('data-agent-relation', '');
          agentRelation.textContent = exercise.relationshipLabels.agent;
          agentBranch.appendChild(agentRelation);
        }
      }(exercise.relationshipNodes[nodeIndex], nodeIndex));
    }
    nodeList.appendChild(scopeTrack);
    nodeList.appendChild(agentBranch);
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

  // 正文里允许用 **强调** 标出关键句。只支持这一种标记，
  // 用 createTextNode 逐段拼装，不走 innerHTML，避免引入注入面。
  function appendEmphasisText(ownerDocument, target, text) {
    var parts = String(text).split('**');
    for (var index = 0; index < parts.length; index += 1) {
      if (!parts[index]) continue;
      if (index % 2 === 1) target.appendChild(element(ownerDocument, 'strong', 'lesson-emphasis', parts[index]));
      else target.appendChild(ownerDocument.createTextNode(parts[index]));
    }
    return target;
  }

  function appendParagraphs(ownerDocument, target, paragraphs) {
    for (var index = 0; index < paragraphs.length; index += 1) {
      var paragraph = element(ownerDocument, 'p', '');
      appendEmphasisText(ownerDocument, paragraph, paragraphs[index]);
      target.appendChild(paragraph);
    }
  }

  // bullets 支持两种写法：
  //   '一句话'                       —— 旧写法，仍然可用
  //   { term: '短语', explain: '两三句展开' } —— 新写法，避免只给结论不给解释
  function appendBulletList(ownerDocument, target, items) {
    var list = element(ownerDocument, 'ul', 'lesson-bullets');
    for (var index = 0; index < items.length; index += 1) {
      var item = items[index];
      if (isPlainObject(item)) {
        var richItem = element(ownerDocument, 'li', 'lesson-bullet-rich');
        // 术语前加一个记号，纯文字堆叠读起来不舒服也分不出层级
        var bulletMark = svgEl(ownerDocument, 'svg', { viewBox: '0 0 20 20', 'aria-hidden': 'true', class: 'lesson-bullet-icon' });
        bulletMark.appendChild(svgEl(ownerDocument, 'circle', { cx: 10, cy: 10, r: 8.5 }));
        bulletMark.appendChild(svgEl(ownerDocument, 'path', { d: 'M6.4 10.2l2.5 2.5 4.7-5.1' }));
        richItem.appendChild(bulletMark);
        richItem.appendChild(element(ownerDocument, 'b', 'lesson-bullet-term', item.term));
        var explain = element(ownerDocument, 'span', 'lesson-bullet-explain', '');
        appendEmphasisText(ownerDocument, explain, item.explain);
        richItem.appendChild(explain);
        list.appendChild(richItem);
      } else {
        list.appendChild(element(ownerDocument, 'li', '', item));
      }
    }
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
      var current = chapter.id === resolvedId;
      if (current) {
        link.setAttribute('aria-current', 'page');
        identity.appendChild(element(ownerDocument, 'span', 'learning-path-current', '当前'));
      }
      link.appendChild(identity);
      // 每章右侧统一显示 x/n 小节，而不是「进行中/未看」这类无法量化的词。
      var ratio = element(ownerDocument, 'span', 'learning-path-status', sectionRatioCopy(chapter.id));
      ratio.setAttribute('data-learning-path-ratio', chapter.id);
      ratio.setAttribute('aria-label', chapter.title + '：已读 ' + sectionRatioCopy(chapter.id) + ' 节');
      link.appendChild(ratio);
      item.appendChild(link);
      // 只有当前章展开小节，其余保持收起，避免侧栏变成 40 多行的长清单。
      if (current) {
        var sections = chapterSections(chapter);
        var subList = element(ownerDocument, 'ol', 'learning-path-sublist');
        subList.setAttribute('data-learning-path-sublist', chapter.id);
        for (var subIndex = 0; subIndex < sections.length; subIndex += 1) {
          var subItem = element(ownerDocument, 'li', 'learning-path-subitem');
          subItem.setAttribute('data-learning-path-section', sections[subIndex].key);
          var subLink = element(ownerDocument, 'a', 'learning-path-sublink');
          subLink.setAttribute('href', '#' + sectionAnchorId(chapter.id, sections[subIndex].key));
          subLink.appendChild(element(ownerDocument, 'span', 'learning-path-tick', ''));
          subLink.appendChild(element(ownerDocument, 'span', 'learning-path-subname', sections[subIndex].title));
          subItem.appendChild(subLink);
          subList.appendChild(subItem);
        }
        item.appendChild(subList);
      }
      list.appendChild(item);
    }
    path.appendChild(list);
    return path;
  }

  function sectionAnchorId(chapterId, key) {
    return 'sec-' + chapterId + '-' + key;
  }

  function tagLessonSection(node, chapterId, key) {
    if (!node || typeof node.setAttribute !== 'function') return node;
    node.setAttribute('id', sectionAnchorId(chapterId, key));
    node.setAttribute('data-lesson-section', key);
    node.setAttribute('tabindex', '-1');
    return node;
  }

  // 小节读过的判定：标题滚进视口上半部分即算读过。
  // 没有 IntersectionObserver 的浏览器退化为 scroll 采样，两者行为一致。
  function observeLessonSections(article, chapterId, onRead) {
    if (!article || typeof article.querySelectorAll !== 'function') return;
    var nodes = article.querySelectorAll('[data-lesson-section]');
    if (!nodes.length) return;

    function markVisible(node) {
      var key = node.getAttribute('data-lesson-section');
      if (key) onRead(key);
    }

    if (typeof window !== 'undefined' && typeof window.IntersectionObserver === 'function') {
      var observer = new window.IntersectionObserver(function (entries) {
        for (var index = 0; index < entries.length; index += 1) {
          if (entries[index].isIntersecting) markVisible(entries[index].target);
        }
      }, { rootMargin: '0px 0px -55% 0px', threshold: 0 });
      for (var observeIndex = 0; observeIndex < nodes.length; observeIndex += 1) observer.observe(nodes[observeIndex]);
      return;
    }

    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    var sample = function () {
      var limit = (window.innerHeight || 0) * 0.45;
      for (var index = 0; index < nodes.length; index += 1) {
        if (typeof nodes[index].getBoundingClientRect !== 'function') continue;
        if (nodes[index].getBoundingClientRect().top <= limit) markVisible(nodes[index]);
      }
    };
    window.addEventListener('scroll', sample, { passive: true });
    sample();
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
      var item = items[itemIndex];
      var chapterId = item.getAttribute('data-learning-path-item');
      var chapter = safeOwnGet(chapterById, chapterId);
      if (!chapter) continue;
      item.setAttribute('data-status', getStatus(chapterId));
      var status = item.querySelector('.learning-path-status');
      if (status) {
        status.textContent = sectionRatioCopy(chapterId);
        status.setAttribute('aria-label', chapter.title + '：已读 ' + status.textContent + ' 节');
      }
      var entry = safeOwnGet(readState().p, chapterId);
      var read = isPlainObject(entry) && Array.isArray(entry.r) ? entry.r : [];
      var subItems = item.querySelectorAll('[data-learning-path-section]');
      for (var subIndex = 0; subIndex < subItems.length; subIndex += 1) {
        var key = subItems[subIndex].getAttribute('data-learning-path-section');
        var isRead = read.indexOf(key) >= 0;
        subItems[subIndex].setAttribute('data-read', isRead ? 'true' : 'false');
        var tick = subItems[subIndex].querySelector('.learning-path-tick');
        if (tick) tick.setAttribute('aria-label', isRead ? '已读' : '未读');
      }
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
    // 这里刻意不再调用 markStarted：打开页面 ≠ 正在看。
    // 章节状态由 markSectionRead 在真正读过 2 个小节后才升为「读到一半」。
    var wasVisited = readSectionCount(resolvedId) > 0;
    var resumeKey = lastSectionKey(resolvedId);
    var alreadySeen = getStatus(resolvedId) === STATUS_SEEN;
    var hostCard = container.parentNode;
    if (hostCard && typeof hostCard.className === 'string' && hostCard.className.split(/\s+/).indexOf('learning-detail-card') < 0) {
      hostCard.className += ' learning-detail-card';
    }
    // 学习详情页要用全站宽度，而不是单栏阅读页的 860px。
    var readingShell = hostCard && hostCard.parentNode ? hostCard.parentNode : null;
    if (readingShell && readingShell.classList && readingShell.classList.contains('reading-shell')) {
      readingShell.classList.add('learning-reading-shell');
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
    header.appendChild(element(ownerDocument, 'p', 'lesson-kicker', '第 ' + Number(chapter.number) + ' 章 · 共 ' + chapterSections(chapter).length + ' 节'));
    header.appendChild(element(ownerDocument, 'h1', '', chapter.title));
    header.appendChild(element(ownerDocument, 'p', '', chapter.description));
    article.appendChild(header);

    // 回到读过的章节时，给一个明确的续读入口，但不自动滚动——
    // 自动跳转会让人失去位置感，把选择权留给用户。
    var resumeBanner = null;
    if (alreadySeen || (wasVisited && resumeKey)) {
      resumeBanner = element(ownerDocument, 'aside', 'lesson-resume');
      resumeBanner.setAttribute('data-lesson-resume', '');
      var resumeText = element(ownerDocument, 'p', 'lesson-resume-text');
      if (alreadySeen) {
        resumeText.textContent = '这一章你在本次浏览里已经看过了。';
      } else {
        resumeText.textContent = '上次读到「' + sectionTitle(resolvedId, resumeKey) + '」。';
      }
      resumeBanner.appendChild(resumeText);
      var resumeActions = element(ownerDocument, 'div', 'lesson-resume-actions');
      if (alreadySeen) {
        var toTakeaway = element(ownerDocument, 'a', 'lesson-resume-link', '直接看要点');
        toTakeaway.setAttribute('href', '#' + sectionAnchorId(resolvedId, 'ta'));
        resumeActions.appendChild(toTakeaway);
      }
      if (resumeKey) {
        var toResume = element(ownerDocument, 'a', 'lesson-resume-link', alreadySeen ? '回到上次位置' : '跳到那里');
        toResume.setAttribute('href', '#' + sectionAnchorId(resolvedId, resumeKey));
        resumeActions.appendChild(toResume);
      }
      var fromTop = element(ownerDocument, 'button', 'lesson-resume-dismiss', '从头读起');
      fromTop.setAttribute('type', 'button');
      resumeActions.appendChild(fromTop);
      resumeBanner.appendChild(resumeActions);
      article.appendChild(resumeBanner);
      fromTop.addEventListener('click', function () {
        resumeBanner.hidden = true;
      });
    }

    // 章首图可选。矢量图优先：它和本章内容直接相关，改文案不用重新导图。
    if (chapter.heroSvg) {
      var heroFigure = element(ownerDocument, 'figure', 'lesson-figure lesson-figure-svg');
      var heroImg = element(ownerDocument, 'img', '');
      heroImg.setAttribute('src', chapter.heroSvg.src);
      heroImg.setAttribute('alt', chapter.heroSvg.alt);
      heroImg.setAttribute('loading', 'eager');
      heroFigure.appendChild(heroImg);
      if (chapter.heroSvg.caption) {
        var heroCap = element(ownerDocument, 'figcaption', '', chapter.heroSvg.caption);
        heroCap.setAttribute('aria-hidden', 'true');
        heroFigure.appendChild(heroCap);
      }
      article.appendChild(heroFigure);
    }
    if (chapter.image) {
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
    }

    var content = element(ownerDocument, 'div', 'lesson-content');
    for (var sectionIndex = 0; sectionIndex < chapter.sections.length; sectionIndex += 1) {
      var sectionData = chapter.sections[sectionIndex];
      var section = element(ownerDocument, 'section', 'lesson-core-section');
      tagLessonSection(section, resolvedId, 'c' + sectionIndex);
      section.appendChild(element(ownerDocument, 'h2', '', sectionData.title));
      appendParagraphs(ownerDocument, section, sectionData.paragraphs);
      appendBulletList(ownerDocument, section, sectionData.bullets);
      if (Array.isArray(sectionData.scenes)) appendCapabilityScenes(ownerDocument, section, sectionData.scenes);
      if (Array.isArray(sectionData.compare) && sectionData.choice) appendBoundaryComparison(ownerDocument, section, sectionData);
      if (sectionData.quadrant) appendTrustQuadrant(ownerDocument, section, sectionData.quadrant);
      // 小节级演示：每个小节都该有可看可玩的东西，正文只是骨架。
      var sectionDemos = [sectionData.demo, sectionData.demo2];
      for (var demoIndex = 0; demoIndex < sectionDemos.length; demoIndex += 1) {
        if (!sectionDemos[demoIndex]) continue;
        var demoRenderer = safeOwnGet(demoRenderers, sectionDemos[demoIndex].type);
        if (typeof demoRenderer === 'function') demoRenderer(ownerDocument, section, sectionDemos[demoIndex]);
      }
      content.appendChild(section);
    }
    article.appendChild(content);

    if (chapter.historyTimeline) {
      var historyDetails = element(ownerDocument, 'details', 'lesson-history');
      historyDetails.appendChild(element(ownerDocument, 'summary', '', chapter.historyTimeline.title));
      renderTimelineDemo(ownerDocument, historyDetails, chapter.historyTimeline);
      article.appendChild(historyDetails);
    }

    if (chapter.caseStudy) {
      var caseSection = element(ownerDocument, 'section', 'lesson-case');
      tagLessonSection(caseSection, resolvedId, 'case');
      caseSection.appendChild(element(ownerDocument, 'p', 'lesson-section-label', '工作案例'));
      caseSection.appendChild(element(ownerDocument, 'h2', '', chapter.caseStudy.title));
      caseSection.appendChild(element(ownerDocument, 'p', '', chapter.caseStudy.situation));
      var lesson = element(ownerDocument, 'p', '');
      lesson.appendChild(element(ownerDocument, 'strong', '', '关键启发：'));
      lesson.appendChild(ownerDocument.createTextNode(chapter.caseStudy.lesson));
      caseSection.appendChild(lesson);
      article.appendChild(caseSection);
    }

    var exerciseSection = null, feedback = null, revealExercise = null;
    if (chapter.exercise) {
      exerciseSection = element(ownerDocument, 'section', 'lesson-exercise');
      tagLessonSection(exerciseSection, resolvedId, 'ex');
      exerciseSection.setAttribute('data-exercise-type', chapter.exercise.type);
      exerciseSection.appendChild(element(ownerDocument, 'p', 'lesson-section-label', '2–5 分钟小练习'));
      exerciseSection.appendChild(element(ownerDocument, 'h2', '', chapter.exercise.title));
      exerciseSection.appendChild(element(ownerDocument, 'p', '', chapter.exercise.instruction));
      feedback = element(ownerDocument, 'div', 'lesson-feedback');
      feedback.setAttribute('aria-live', 'polite');
      exerciseSection.appendChild(feedback);
      var renderer = safeOwnGet(exerciseRenderers, chapter.exercise.type);
      if (typeof renderer === 'function') renderer(chapter.exercise, exerciseSection);
      var exerciseHelp = interactionFieldset(ownerDocument, '需要一点提示吗？', 'lesson-exercise-help');
      var exerciseReference = element(ownerDocument, 'p', 'lesson-exercise-reference', '先看任务目标，再对照材料、责任边界与证据。可以反复尝试，不必追求一次答对。');
      exerciseReference.setAttribute('data-exercise-reference', '');
      exerciseReference.hidden = true;
      exerciseHelp.appendChild(exerciseReference);
      revealExercise = element(ownerDocument, 'button', 'lesson-secondary-action', '查看参考思路');
      revealExercise.setAttribute('type', 'button');
      revealExercise.setAttribute('data-exercise-reveal', '');
      exerciseHelp.appendChild(revealExercise);
      exerciseSection.appendChild(exerciseHelp);
      article.appendChild(exerciseSection);
    }

    if (chapter.quickCheck) {
      var checkSection = element(ownerDocument, 'section', 'lesson-check');
      tagLessonSection(checkSection, resolvedId, 'qc');
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
    }

    var takeaway = element(ownerDocument, 'aside', 'lesson-takeaway');
    tagLessonSection(takeaway, resolvedId, 'ta');
    takeaway.appendChild(element(ownerDocument, 'p', 'lesson-section-label', '这一章你带走什么'));
    takeaway.appendChild(element(ownerDocument, 'h2', '', chapter.takeaway.title));
    if (chapter.takeaway.items) appendBulletList(ownerDocument, takeaway, chapter.takeaway.items);
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
    var nextActionRef = null;
    function setNextLocked(locked) {
      if (!nextActionRef) return;
      nextActionRef.setAttribute('data-next-locked', locked ? 'true' : 'false');
      nextActionRef.setAttribute('aria-disabled', locked ? 'true' : 'false');
      nextActionRef.textContent = locked ? '下一章（先确认看完）' : '下一章';
    }
    var actions = element(ownerDocument, 'div', 'lesson-actions');
    var seenButton = element(ownerDocument, 'button', '', getStatus(resolvedId) === STATUS_SEEN ? '已看过' : '我看完了');
    seenButton.setAttribute('type', 'button');
    seenButton.setAttribute('data-mark-seen', '');
    if (getStatus(resolvedId) === STATUS_SEEN) seenButton.setAttribute('aria-pressed', 'true');
    actions.appendChild(seenButton);
    if (nextId) {
      var nextAction = element(ownerDocument, 'a', 'lesson-primary-action', '下一章');
      nextAction.setAttribute('href', 'detail.html?type=learn&id=' + encodeURIComponent(nextId));
      actions.appendChild(nextAction);
      // 要先确认「我看完了」才能进下一章。链接始终可见（不是分数门槛，
      // 只是一次完成确认），但在确认前点击会把你带回上面那个按钮。
      nextActionRef = nextAction;
      setNextLocked(getStatus(resolvedId) !== STATUS_SEEN);
      nextAction.addEventListener('click', function (event) {
        if (nextAction.getAttribute('data-next-locked') !== 'true') return;
        event.preventDefault();
        liveStatus.textContent = '先点上面的「我看完了」，再进入下一章。';
        try {
          if (typeof seenButton.scrollIntoView === 'function') seenButton.scrollIntoView({ block: 'center', behavior: returnScrollBehavior() });
          if (typeof seenButton.focus === 'function') seenButton.focus({ preventScroll: true });
        } catch (error) {}
      });
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
      if (feedback && feedback.textContent !== message) feedback.textContent = message;
      if (liveStatus.textContent !== message) liveStatus.textContent = message;
    }

    // 练习不再单独堆在章末，所以小节里的演示互动同样算「有意义的推进」，
    // 玩过任意一个演示就可以确认看完。
    article.addEventListener('learning-exercise-attempt', function (event) {
      // 只解锁「我看完了」，不把提示写到章末状态条——那句话该留在演示里
      seenButton.disabled = false;
    });

    observeLessonSections(article, resolvedId, function (key) {
      var before = readSectionCount(resolvedId);
      markSectionRead(resolvedId, key);
      if (readSectionCount(resolvedId) === before) return;
      refreshLearningPaths(layout);
      // 读到最后一节（带走要点）也算一次有意义的推进，允许标记看完。
      if (key === 'ta' && seenButton.disabled) {
        enableCompletion('已读到本章要点。可以把这一章记为看过，也可以回上面再做一次练习。');
      }
    });
    if (revealExercise) revealExercise.addEventListener('click', function () {
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
    if (exerciseSection) exerciseSection.addEventListener('learning-exercise-attempt', function (event) {
      var message = event && event.detail && event.detail.message
        ? event.detail.message
        : '已完成一次练习尝试。你可以继续调整，也可以把本章记为看过。';
      enableCompletion(message);
    });
    var checkItems = chapter.quickCheck ? checkSection.querySelectorAll('details') : [];
    for (var itemIndex = 0; itemIndex < checkItems.length; itemIndex += 1) {
      checkItems[itemIndex].addEventListener('toggle', function (event) {
        if (event.currentTarget.open) enableCompletion('已查看快速自测思路，你可以继续尝试或记为看过。');
      });
    }
    seenButton.addEventListener('click', function () {
      // 主动标记看完时补齐小节进度，否则侧栏会停在 3/7 而章节已是「已看」，两个口径打架。
      var allSections = chapterSections(chapter);
      for (var sectionKeyIndex = 0; sectionKeyIndex < allSections.length; sectionKeyIndex += 1) {
        markSectionRead(resolvedId, allSections[sectionKeyIndex].key);
      }
      markSeen(resolvedId);
      setNextLocked(false);
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
    faqGroups: faqGroups,
    getStatus: getStatus,
    markStarted: markStarted,
    markSeen: markSeen,
    markSectionRead: markSectionRead,
    chapterSections: chapterSections,
    readSectionCount: readSectionCount,
    totalSectionCount: totalSectionCount,
    lastSectionKey: lastSectionKey,
    lastChapterId: lastChapterId,
    hasSessionHistory: hasSessionHistory,
    resumeChapterId: resumeChapterId,
    nextIncomplete: nextIncomplete,
    initHub: initHub,
    initFaq: initFaq,
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
