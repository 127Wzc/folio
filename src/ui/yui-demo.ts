type Tone = "ok" | "warn" | "dim";
type EdgeKey = "m2t" | "t2m" | "t2f" | "f2c" | "f2s";

type Step = {
  stage: string;
  edge?: EdgeKey;
  text: string;
  tone?: Tone;
  meter: [number, number, number];
};

type Scene = { label: string; steps: Step[] };

const SCENES: Scene[] = [
  {
    label: "查本周新番",
    steps: [
      { stage: "model_decision", edge: "m2t", text: '提出 search_web("本周新番")', meter: [1, 1, 0] },
      { stage: "tool_execution", edge: "t2m", text: "返回 3 条结果，回填 tool 消息", tone: "ok", meter: [1, 2, 0] },
      { stage: "model_decision", edge: "m2t", text: "再次提出同一调用（参数相同）", meter: [2, 3, 0] },
      { stage: "tool_execution", edge: "t2f", text: "重复调用守卫 → 拦截，不执行", tone: "warn", meter: [2, 4, 1] },
      { stage: "finalizing", edge: "f2s", text: "无进展达到阈值 → 收尾", tone: "dim", meter: [2, 4, 1] },
      { stage: "completed_silent", text: "completed_silent：结果已投递，不再补文字", tone: "ok", meter: [2, 4, 1] },
    ],
  },
  {
    label: "发张猫图",
    steps: [
      { stage: "model_decision", edge: "m2t", text: '提出 image_search("猫")', meter: [1, 1, 0] },
      { stage: "tool_execution", edge: "t2m", text: "返回 6 个候选", tone: "ok", meter: [1, 2, 0] },
      { stage: "model_decision", edge: "m2t", text: "提出 send_image(候选 #3)", meter: [2, 3, 0] },
      { stage: "tool_execution", edge: "t2m", text: "图片已投递 · 标记为部分投递", tone: "ok", meter: [2, 4, 0] },
      { stage: "model_decision", edge: "m2t", text: "想再发一次同一张", meter: [3, 5, 0] },
      { stage: "tool_execution", edge: "t2f", text: "已投递守卫 → 拦截，不重复发送", tone: "warn", meter: [3, 6, 1] },
      { stage: "finalizing", edge: "f2c", text: "还缺一句说明 → finalReplyRequired", tone: "dim", meter: [3, 6, 1] },
      { stage: "completed", text: "completed：补一句「发好了」", tone: "ok", meter: [3, 6, 1] },
    ],
  },
  {
    label: "后台跑任务",
    steps: [
      { stage: "model_decision", edge: "m2t", text: "提出 run_task(日报汇总)", meter: [1, 1, 0] },
      { stage: "tool_execution", edge: "t2m", text: "已受理 · task_id = T-2041", tone: "ok", meter: [1, 2, 0] },
      { stage: "model_decision", edge: "m2t", text: "又想调用一次 run_task（重复排队）", meter: [2, 3, 0] },
      { stage: "tool_execution", edge: "t2f", text: "后台受理守卫 → 拦截", tone: "warn", meter: [2, 4, 1] },
      { stage: "finalizing", edge: "f2s", text: "受理即完成，收尾", tone: "dim", meter: [2, 4, 1] },
      { stage: "completed_silent", text: "completed_silent：不再补文字", tone: "ok", meter: [2, 4, 1] },
    ],
  },
  {
    label: "参数被截断",
    steps: [
      { stage: "model_decision", edge: "m2t", text: "提出 search_web(参数被截断)", meter: [1, 1, 0] },
      { stage: "tool_execution", edge: "t2f", text: "参数校验失败 → 不执行", tone: "warn", meter: [1, 2, 0] },
      { stage: "finalizing", edge: "f2c", text: "异常终态 → 收尾", tone: "dim", meter: [1, 2, 0] },
      { stage: "completed", text: "completed：说明失败原因", tone: "ok", meter: [1, 2, 0] },
    ],
  },
];

const NODES: { stage: string; x: number; y: number }[] = [
  { stage: "model_decision", x: 20, y: 40 },
  { stage: "tool_execution", x: 220, y: 40 },
  { stage: "finalizing", x: 420, y: 40 },
  { stage: "completed", x: 330, y: 150 },
  { stage: "completed_silent", x: 520, y: 150 },
];

const EDGES: { key: EdgeKey; d: string }[] = [
  { key: "m2t", d: "M162,57 L210,57" },
  { key: "t2m", d: "M226,70 C196,108 128,108 98,74" },
  { key: "t2f", d: "M362,57 L410,57" },
  { key: "f2c", d: "M458,74 C442,104 428,120 420,144" },
  { key: "f2s", d: "M524,74 C546,104 566,120 574,144" },
];

const NODE_W = 140;
const NODE_H = 34;

function fsmMarkup(): string {
  return `<svg class="fsm" viewBox="0 0 680 200" role="img" aria-label="Agent 状态机">
    <defs>
      <marker id="fsm-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0,0 L8,4 L0,8 z" fill="context-stroke"></path>
      </marker>
    </defs>
    ${EDGES.map(
      (e) =>
        `<path class="edge" data-edge="${e.key}" d="${e.d}" marker-end="url(#fsm-arrow)"></path>`
    ).join("")}
    ${NODES.map(
      (n) => `<g class="node" data-stage="${n.stage}">
        <rect x="${n.x}" y="${n.y}" width="${NODE_W}" height="${NODE_H}" rx="9"></rect>
        <text x="${n.x + NODE_W / 2}" y="${n.y + NODE_H / 2 + 1}">${n.stage}</text>
      </g>`
    ).join("")}
  </svg>`;
}

export function mountYuiDemo(root: HTMLElement): void {
  root.innerHTML = `
    <div class="demo">
      <div class="demo-head">
        <span class="dot"></span>工具循环 · 状态流转
        <span class="demo-note">四段示例回放 · 预算与守卫按真实规则简化</span>
      </div>
      <div class="demo-body">
        <div class="demo-controls">
          <button class="chip active" data-act="play">重播</button>
          ${SCENES.map(
            (s, i) => `<button class="chip ${i === 0 ? "active" : ""}" data-scene="${i}">${s.label}</button>`
          ).join("")}
        </div>
        <div class="fsm-wrap">${fsmMarkup()}</div>
        <div class="fsm-meters">
          <span>轮次 <b id="m-round">0/6</b></span>
          <span>工具调用 <b id="m-calls">0/12</b></span>
          <span>无进展 <b id="m-np">0/3</b></span>
        </div>
        <div class="loop-log" id="yui-log"></div>
      </div>
    </div>`;

  const log = root.querySelector<HTMLElement>("#yui-log")!;
  const nodes = Array.from(root.querySelectorAll<SVGGElement>(".node"));
  const edges = Array.from(root.querySelectorAll<SVGPathElement>(".edge"));
  const mRound = root.querySelector<HTMLElement>("#m-round")!;
  const mCalls = root.querySelector<HTMLElement>("#m-calls")!;
  const mNp = root.querySelector<HTMLElement>("#m-np")!;

  let scene = 0;
  let timers: number[] = [];

  const clear = () => {
    timers.forEach((t) => clearTimeout(t));
    timers = [];
  };

  const reset = () => {
    clear();
    log.innerHTML = "";
    nodes.forEach((n) => n.classList.remove("on"));
    edges.forEach((e) => e.classList.remove("on"));
    mRound.textContent = "0/6";
    mCalls.textContent = "0/12";
    mNp.textContent = "0/3";
  };

  const apply = (step: Step, i: number) => {
    nodes.forEach((n) => n.classList.toggle("on", n.dataset.stage === step.stage));
    edges.forEach((e) => e.classList.toggle("on", e.dataset.edge === step.edge));
    mRound.textContent = `${step.meter[0]}/6`;
    mCalls.textContent = `${step.meter[1]}/12`;
    mNp.textContent = `${step.meter[2]}/3`;

    const line = document.createElement("div");
    line.className = "loop-line";
    if (step.tone) line.classList.add(step.tone);
    line.innerHTML = `<span class="t">${String(i + 1).padStart(2, "0")}</span><span class="st">${
      step.stage
    }</span>${step.text}`;
    log.appendChild(line);
    requestAnimationFrame(() => line.classList.add("show"));
  };

  const play = () => {
    reset();
    const steps = SCENES[scene].steps;
    steps.forEach((step, i) => {
      timers.push(window.setTimeout(() => apply(step, i), 260 + i * 880));
    });
  };

  root.querySelector<HTMLButtonElement>('[data-act="play"]')!.addEventListener("click", play);

  root.querySelectorAll<HTMLButtonElement>("[data-scene]").forEach((btn) => {
    btn.addEventListener("click", () => {
      scene = Number(btn.dataset.scene);
      root.querySelectorAll<HTMLButtonElement>("[data-scene]").forEach((b) =>
        b.classList.toggle("active", b === btn)
      );
      play();
    });
  });

  play();
}
