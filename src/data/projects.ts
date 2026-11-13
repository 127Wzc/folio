export type Visual = { src: string; alt: string; dim?: boolean };

export type Project = {
  id: string;
  no: string;
  name: string;
  title: string;
  blurb: string;
  tags: { text: string; cls?: string }[];
  points: string[];
  meta: [string, string][];
  highlights: { k: string; title: string; desc: string }[];
  stats: { v: string; l: string }[];
  notesTitle?: string;
  notes?: { title: string; desc: string }[];
  visual: Visual;
  demo: "yui" | "wan" | "imgtag";
  note?: string;
};

export const PROJECTS: Project[] = [
  {
    id: "yui",
    no: "01",
    name: "yui-chat",
    title: "AI 群聊 Agent",
    blurb:
      "TRSS-Yunzai 的 AI 插件：多供应商模型、群记忆与工具循环，配一套 Web 管理台。",
    tags: [
      { text: "开源 · TypeScript", cls: "tag-open" },
      { text: "Agent" },
      { text: "群聊机器人" },
    ],
    points: [
      "五阶段状态机 + 执行运行时，管住重复调用与预算",
      "群记忆按日增量提炼，AI 整理后逐项审核",
      "任务选模 + 失败回退，配置与日志同后台",
    ],
    meta: [
      ["角色", "独立开发"],
      ["形态", "Yunzai 插件 + 管理台"],
      ["技术", "TypeScript · SQLite · MCP"],
      ["状态", "开源"],
    ],
    highlights: [
      {
        k: "AGENT LOOP",
        title: "工具循环的状态机",
        desc:
          "model_decision / tool_execution / finalizing / completed / completed_silent 五个阶段，配执行运行时管额度、重复调用守卫与无进展判断。",
      },
      {
        k: "MEMORY",
        title: "记忆与知识",
        desc:
          "个人记忆与群记忆分开存，独立模型混合召回，按日增量提炼，AI 整理后逐项审核；知识库按需检索。",
      },
      {
        k: "ROUTING",
        title: "模型路由与管理台",
        desc:
          "按任务选模、失败回退、流式输出与上下文压缩；配置、权限、对话测试、调用日志在同一个后台。",
      },
    ],
    notesTitle: "技术选型",
    notes: [
      {
        title: "不写死 Thought / Action 文本",
        desc: "直接消费各家模型的 tool_calls，换供应商不用重写提示词；循环只认结构化的停止原因与调用列表。",
      },
      {
        title: "状态机，不是工作流引擎",
        desc: "只在单次请求内收敛，不做跨进程持久化；completed 只代表模型步骤结束，业务成功看工具状态与投递回执。",
      },
      {
        title: "工具统一走 registry",
        desc: "每个工具声明 category / risk / policy，鉴权、超时与 agent signal 在运行时统一注入，业务代码不碰权限。",
      },
      {
        title: "三重预算",
        desc: "轮次、每轮工具调用数、token 上限同时约束，超限强制进 finalizing，避免模型在工具循环里空转。",
      },
    ],
    stats: [
      { v: "5", l: "阶段状态机" },
      { v: "3", l: "层职责拆分" },
      { v: "1", l: "套管理台" },
    ],
    visual: {
      src: "shots/yui-runtime-overview.jpg",
      alt: "yui-chat Web 管理台首页",
      dim: true,
    },
    demo: "yui",
  },
  {
    id: "wan",
    no: "02",
    name: "采集与任务编排系统",
    title: "采集与任务编排系统",
    blurb:
      "把采集、多账号调度、代理治理和日志收进一个运行时。展示版为合成数据。",
    tags: [
      { text: "私有 · 脱敏演示", cls: "tag-private" },
      { text: "Python" },
      { text: "FastAPI" },
    ],
    points: [
      "代理按账号独占，服务重启后归属仍保留",
      "快抢 / 前期 / 回流 / 补货四段节奏",
      "启动冻结参数，进度落库，重启不重跑",
    ],
    meta: [
      ["角色", "架构 / 后端 / 前端"],
      ["形态", "CLI + Web 管理端"],
      ["技术", "FastAPI · Vue 3 · SQLite"],
      ["状态", "私有 · 脱敏"],
    ],
    highlights: [
      {
        k: "PROXY",
        title: "账号级代理独占",
        desc:
          "一条代理在有效期内只归一个账号，归属写入数据库，重启后仍保留；代理不足时等待补充，不退回直连。",
      },
      {
        k: "RETRY",
        title: "四段重试节奏",
        desc:
          "快抢固定间隔，前期递增、强限流退避，15 分钟后进回流；确认提前下架的目标单独走补货监控，每分钟最后 10 秒静默预留。",
      },
      {
        k: "STATE",
        title: "冻结参数与断点",
        desc:
          "启动冻结账号参数，运行中改配置只影响下次；成功进度落库，服务重启不自动重跑，结束记录失败也先释放资源。",
      },
    ],
    notesTitle: "为什么保留 CLI",
    notes: [
      {
        title: "无人值守",
        desc: "Web 是可视化入口，CLI 是服务器上的入口：一条命令跑一次，cron 或别的脚本直接调，不用开浏览器。",
      },
      {
        title: "同一份配置",
        desc: "CLI 与 Web 都走 ConfigManager，读同一份 .env 默认值加 SQLite 覆盖值，不存在网页改了、命令行没生效。",
      },
      {
        title: "排障可复现",
        desc: "出问题时把启动命令贴出来就能复现同一组参数；任务、账号执行记录和日志写进同一张表。",
      },
    ],
    stats: [
      { v: "4", l: "段重试节奏" },
      { v: "5", l: "配置命名空间" },
      { v: "1", l: "进程跑多账号" },
    ],
    visual: {
      src: "shots/wan-overview.jpg",
      alt: "采集与任务编排系统 · 任务总览（脱敏）",
      dim: true,
    },
    demo: "wan",
    note:
      "私有项目，展示版不连接任何真实目标：站点、域名、接口、令牌、商品与订单全部替换为合成数据，演示只播预置任务的时间轴与日志。",
  },
  {
    id: "imgtag",
    no: "03",
    name: "ImgTag",
    title: "ImgTag",
    blurb:
      "视觉模型生成标签，pgvector 做语义检索，人工纠正再反哺标签体系。",
    tags: [
      { text: "开源 · MIT", cls: "tag-open" },
      { text: "FastAPI" },
      { text: "pgvector" },
    ],
    points: [
      "三级标签 + 来源追踪，AI 与人工分开",
      "主体纠正触发向量重建，不被自动覆盖",
      "本地 / S3 多端点存储与自动备份",
    ],
    meta: [
      ["角色", "全栈 / 独立开发"],
      ["形态", "Web 应用 + 外部 API"],
      ["技术", "FastAPI · PostgreSQL/pgvector · Vue 3"],
      ["状态", "开源 · MIT"],
    ],
    highlights: [
      {
        k: "TAXONOMY",
        title: "标签体系与来源",
        desc:
          "三级标签带来源标记（AI / 用户）与使用统计，模型迭代时可以只重算 AI 部分，不覆盖人工结论。",
      },
      {
        k: "MEMORY",
        title: "主体记忆与纠正",
        desc:
          "人物、地标、动物等主体词典；人工确认后挂接主名称标签并触发向量重建，且不会被后续自动匹配覆盖。",
      },
      {
        k: "GOVERNANCE",
        title: "建议—审批与存储",
        desc:
          "非上传者只能提建议，管理员审批后落地并同步重建向量；本地与 S3 兼容端点并存，可自动备份。",
      },
    ],
    stats: [
      { v: "3", l: "级标签体系" },
      { v: "3", l: "种部署镜像" },
      { v: "3", l: "种接入方式" },
    ],
    visual: {
      src: "shots/search.jpg",
      alt: "ImgTag 图片探索页面",
    },
    demo: "imgtag",
  },
];

export const projectById = (id: string) => PROJECTS.find((p) => p.id === id);
