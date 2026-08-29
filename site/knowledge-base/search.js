/* 亚玛芬 AI 知识库 · 全局搜索（共享脚本）
   依赖：页面顶栏需存在 #searchInput / #searchDrop / #searchWrap */
(function(){
  var SEARCH_INDEX = [
    /* 页面 */
    { t:'AI 新手入门', d:'六个轻量章节：认识、边界、分工、表达、验证与工作流', tag:'板块', href:'learn.html' },
    { t:'录播回放', d:'公司内部 AI 培训回放：Copilot 高阶培训 / 财务专场 / 线上精选', tag:'板块', href:'video.html' },
    { t:'AI 工具与资源', d:'工具 / 课程 / 博主 / 论文 四类资源导航', tag:'板块', href:'resources.html' },
    { t:'本次学习进度', d:'返回六章学习路径，继续本次标签会话中的学习', tag:'功能', href:'learn.html' },
    /* 学习模块 */
    { t:'认识 AI', d:'理解 AI、生成式 AI、大模型与 Agent 的关系', tag:'入门', href:'detail.html?type=learn&id=ai-basics' },
    { t:'看清边界', d:'理解 AI 的能力边界与幻觉，学会识别需要核验的内容', tag:'入门', href:'detail.html?type=learn&id=ai-boundaries' },
    { t:'学会分工', d:'区分 AI 执行、人机协作与必须由人负责的任务', tag:'入门', href:'detail.html?type=learn&id=ai-delegation' },
    { t:'把需求说清楚', d:'用目标、背景、任务、输出要求四要素表达需求', tag:'入门', href:'detail.html?type=learn&id=ai-prompting' },
    { t:'验证结果', d:'区分事实、推论与观点，把结论连回原文证据', tag:'入门', href:'detail.html?type=learn&id=ai-verification' },
    { t:'从对话走向工作流', d:'拆任务、设检查点，把一次对话沉淀为可复用流程', tag:'入门', href:'detail.html?type=learn&id=ai-workflow' },
    /* 录播 */
    { t:'Copilot 高阶培训录播', d:'公司内部 Copilot 进阶培训回放', tag:'回放', href:'https://amersportsonline.sharepoint.com/sites/amersportsaicommunity/SitePages/Copilot%E9%AB%98%E9%98%B6%E5%9F%B9%E8%AE%85%E5%BD%95%E6%92%AD.aspx', ext:1 },
    { t:'Copilot 财务专场培训', d:'面向财务场景的 Copilot 专场培训回放', tag:'回放', href:'https://amersportsonline.sharepoint.com/sites/amersportsaicommunity/SitePages/Copilot%E8%B4%A2%E5%8A%A1%E4%B8%93%E5%9C%BA%E5%9F%B9%E8%AE%AD.aspx', ext:1 },
    { t:'Copilot 线上精选课程', d:'Copilot 线上精选课程合集', tag:'回放', href:'https://amersportsonline.sharepoint.com/sites/amersportsaicommunity/SitePages/Copilot%E7%BA%BF%E4%B8%8A%E7%B2%BE%E9%80%89%E8%AF%BE%E7%A8%8B.aspx', ext:1 },
    /* 工具 */
    { t:'小A · 公司内部 AI 助手', d:'接入公司数据的内部 AI 助手，日常问答首选。进入 Portal 后，点击右侧「小A智助」打开助手', tag:'工具', href:'https://portal.amersports.cn/portal/indexs', ext:1 },
    { t:'ChatGPT', d:'OpenAI 出品，综合能力全面的 AI 助手', tag:'工具', href:'https://chatgpt.com', ext:1 },
    { t:'Claude', d:'Anthropic 出品，长文写作与编程体验优秀', tag:'工具', href:'https://claude.ai', ext:1 },
    { t:'Gemini', d:'Google 出品，与搜索/办公套件深度整合', tag:'工具', href:'https://gemini.google.com', ext:1 },
    { t:'Perplexity', d:'AI 搜索，回答附引用来源', tag:'工具', href:'https://www.perplexity.ai', ext:1 },
    { t:'DeepSeek V4 Pro', d:'最新 V4 Pro 推理能力强、免费额度友好', tag:'工具', href:'https://chat.deepseek.com', ext:1 },
    { t:'Kimi K3', d:'最新 K3，长文档阅读与推理突出，丢 PDF 直接提问', tag:'工具', href:'https://kimi.moonshot.cn', ext:1 },
    { t:'智谱 GLM 5.3', d:'智谱 AI 出品，最新 GLM 5.3，开源闭源并行，Agent 能力突出', tag:'工具', href:'https://chatglm.cn', ext:1 },
    { t:'豆包', d:'字节出品，语音对话与写作易上手', tag:'工具', href:'https://www.doubao.com', ext:1 },
    { t:'通义千问 Qwen 3.8 Max', d:'阿里最新 3.8 Max，与钉钉文档结合紧密', tag:'工具', href:'https://tongyi.aliyun.com', ext:1 },
    /* 编程 / 开发 Agent */
    { t:'OpenAI Codex', d:'OpenAI 的编程 Agent，读代码库、自动改代码、跑测试', tag:'编程', href:'https://openai.com/codex/', ext:1 },
    { t:'Claude Code', d:'Anthropic 的终端编程 CLI，命令行里写代码重构排查', tag:'编程', href:'https://www.anthropic.com/claude-code', ext:1 },
    { t:'WorkBuddy（小布）', d:'通用 AI 助手，写代码、做文档、跑命令、自动化', tag:'编程·办公', href:'index.html' },
    /* 课程 / 博主 / 论文 */
    { t:'AI For Everyone（吴恩达）', d:'非技术背景最佳入门课', tag:'课程', href:'https://www.coursera.org/learn/ai-for-everyone', ext:1 },
    { t:'ChatGPT Prompt Engineering', d:'DeepLearning.AI 提示词短课', tag:'课程', href:'https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/', ext:1 },
    { t:'Andrej Karpathy', d:'前 OpenAI/Tesla AI 负责人，YouTube 大模型科普', tag:'博主', href:'https://www.youtube.com/@AndrejKarpathy', ext:1 },
    { t:'李沐', d:'亚马逊首席科学家，论文精读与动手教程', tag:'博主', href:'https://space.bilibili.com/1567748478', ext:1 },
    { t:'数字生命卡兹克', d:'AI 写作/数字生命方向微信公众号', tag:'博主', href:'https://weixin.sogou.com/weixin?type=2&query=%E6%95%B0%E5%AD%97%E7%94%9F%E5%91%BD%E5%8D%A1%E5%85%B9%E5%85%8B', ext:1 },
    { t:'新智元', d:'AI 产业新闻微信公众号', tag:'博主', href:'https://weixin.sogou.com/weixin?type=2&query=%E6%96%B0%E6%99%BA%E5%85%83', ext:1 },
    { t:'赛博禅心', d:'LLM 工程化/提示词/Agent 实操微信公众号', tag:'博主', href:'https://weixin.sogou.com/weixin?type=2&query=%E8%B5%9B%E5%8D%9A%E7%A6%85%E5%BF%83', ext:1 },
    { t:'Datawhale', d:'国内知名 AI 学习社区 · 免费教程/组队学习', tag:'博主', href:'https://www.datawhale.cn/', ext:1 },
    { t:'雷锋网', d:'老牌科技/AI 资讯', tag:'博主', href:'https://www.leiphone.com/', ext:1 },
    { t:'DeepTech 深科技', d:'MIT Technology Review 中国版 · 深度科技报道', tag:'博主', href:'https://weixin.sogou.com/weixin?type=2&query=DeepTech%E6%B7%B1%E7%A7%91%E6%8A%80', ext:1 },
    { t:'Attention Is All You Need', d:'Transformer 开山之作（2017）', tag:'论文', href:'https://arxiv.org/abs/1706.03762', ext:1 },
    { t:'斯坦福 AI Index Report', d:'全球 AI 发展最全年度数据报告', tag:'论文', href:'https://aiindex.stanford.edu/', ext:1 },
    /* AI 网闸（外部嵌入式资源） */
    { t:'AI 日报', d:'AI 行业每日精选动态（外部站点 · 嵌入式浏览）', tag:'AI 网闸', href:'https://aihot.virxact.com/daily', ext:1 },
    { t:'WaytoAGI · AI 知识库', d:'高质量 AI 知识库与导航（外部站点 · 嵌入式浏览）', tag:'AI 网闸', href:'https://www.waytoagi.com/zh', ext:1 },
    /* 新概念 / 行业动态 */
    { t:'AI Agent · Harness 框架', d:'Agent 自主规划+执行任务；Harness 是治理 Agent 行为的工程框架', tag:'新概念', href:'detail.html?type=learn&id=ai-workflow' },
    { t:'具身智能（Embodied AI）', d:'人形机器人 + VLA 模型，让 AI 操控物理世界', tag:'行业动态', href:'detail.html?type=resources&id=reading' },
    { t:'推理模型（Reasoning Model）', d:'OpenAI o 系列 / DeepSeek-R1 · 慢思考范式', tag:'新概念', href:'detail.html?type=learn&id=ai-basics' },
    { t:'OnePod · 技术播客', d:'AI 与技术主题的播客节目，持续更新', tag:'播客', href:'https://onepod.site/', ext:1 }
  ];

  // 规范化：去空格 + 标点 + 转小写，便于模糊匹配
  function norm(s){
    return String(s==null?'':s).toLowerCase().replace(/[\s\p{P}\p{S}]+/gu,'');
  }
  // 字符子序列匹配（兜底）
  function fuzzy(text, q){
    if(!q) return true;
    var ti=0;
    for(var i=0;i<q.length;i++){
      var c=q[i];
      while(ti<text.length && text[ti]!==c) ti++;
      if(ti>=text.length) return false;
      ti++;
    }
    return true;
  }

  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }

  function render(list){
    var drop = document.getElementById('searchDrop');
    if(!drop) return;
    if(!list.length){ drop.innerHTML = '<div class="search-empty">没有找到相关结果，试试更短或更模糊的关键词</div>'; drop.style.display='block'; return; }
    var html = '';
    for(var i=0;i<list.length;i++){
      var it = list[i];
      html += '<a class="search-item" href="' + it.href + '"' + (it.ext?' target="_blank" rel="noopener"':'') + '>' +
        '<span class="si-tag">' + esc(it.tag) + '</span><span class="si-body"><b>' + esc(it.t) + '</b><small>' + esc(it.d) + '</small></span></a>';
    }
    drop.innerHTML = html;
    drop.style.display = 'block';
  }

  function doSearch(raw){
    raw = (raw||'').trim();
    if(!raw){ document.getElementById('searchDrop').style.display='none'; return; }
    var q = norm(raw);
    var res = [];
    // 第一轮：规范化后的子串包含
    for(var i=0;i<SEARCH_INDEX.length;i++){
      var it = SEARCH_INDEX[i];
      var hay = norm(it.t) + ' ' + norm(it.d) + ' ' + norm(it.tag);
      if(hay.indexOf(q)>-1){ res.push(it); if(res.length>=8) break; }
    }
    // 第二轮：模糊（子序列）兜底
    if(res.length<8){
      var seen = {};
      for(var j=0;j<res.length;j++) seen[res[j].href] = 1;
      for(var k=0;k<SEARCH_INDEX.length;k++){
        var it2 = SEARCH_INDEX[k];
        if(seen[it2.href]) continue;
        var hay2 = norm(it2.t) + ' ' + norm(it2.d) + ' ' + norm(it2.tag);
        if(fuzzy(hay2, q)){ res.push(it2); if(res.length>=8) break; }
      }
    }
    render(res);
  }

  function init(){
    var input = document.getElementById('searchInput');
    var wrap = document.getElementById('searchWrap');
    var drop = document.getElementById('searchDrop');
    if(!input || !drop) return;

    input.addEventListener('input', function(){ doSearch(this.value); });
    input.addEventListener('focus', function(){ if(this.value) doSearch(this.value); });
    document.addEventListener('click', function(e){
      if(wrap && !wrap.contains(e.target)) drop.style.display='none';
    });
    document.addEventListener('keydown', function(e){
      if((e.metaKey || e.ctrlKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); input.focus(); }
      if(e.key==='Escape'){ drop.style.display='none'; input.blur(); }
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
