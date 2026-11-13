type Kind = "retry" | "throttle" | "success" | "quiet";

type Ev = { t: number; acct: number; kind: Kind; sku: string; note?: string };

type Account = { name: string; proxy: string };

const ACCOUNTS: Account[] = [
  { name: "账号 A", proxy: "P-07" },
  { name: "账号 B", proxy: "P-11" },
  { name: "账号 C", proxy: "P-03" },
];

const PHASES = [
  { from: 0, to: 15, label: "快抢 · 200ms" },
  { from: 15, to: 30, label: "前期 · 递增" },
  { from: 30, to: 50, label: "回流 · 5s" },
  { from: 50, to: 60, label: "补货静默" },
];

const COLORS = {
  retry: "#9c968b",
  throttle: "#d8a15f",
  success: "#a9c3a1",
  quiet: "#a9c3a1",
};

const DURATION = 60;
/** 压缩比：1 秒画面 ≈ 15 秒真实时间 */
const TIME_SCALE = 15;

function buildEvents(mode: "serial" | "concurrent"): Ev[] {
  const evs: Ev[] = [];
  const push = (t: number, acct: number, kind: Kind, sku: string, note?: string) =>
    evs.push({ t, acct, kind, sku, note });

  for (let t = 0.6; t < 15; t += 0.95) push(t, 0, "retry", "SKU-1042");
  if (mode === "concurrent") {
    for (let t = 1.1; t < 15; t += 1.35) push(t, 0, "retry", "SKU-2087");
  }
  for (let t = 15.4; t < 30; t += 1.9) push(t, 0, t % 3 < 1 ? "throttle" : "retry", "SKU-1042");
  for (let t = 30.5; t < 50; t += 4.6) push(t, 0, "retry", "SKU-1042");
  push(50.4, 0, "retry", "SKU-1042", "补货窗口");
  push(51.6, 0, "retry", "SKU-1042", "补货窗口");
  push(52.8, 0, "success", "SKU-1042");

  for (let t = 0.9; t < 15; t += 1.15) push(t, 1, "retry", "SKU-2087");
  for (let t = 15.2; t < 30; t += 2.2) push(t, 1, "retry", "SKU-2087");
  for (let t = 30.2; t < 50; t += 5.1)
    push(t, 1, t > 40 && t < 44.5 ? "throttle" : "retry", "SKU-2087");
  push(55.2, 1, "retry", "SKU-2087");

  for (let t = 1.4; t < 15; t += 1.5) push(t, 2, "retry", "SKU-3310");
  for (let t = 15.6; t < 30; t += 2.8) push(t, 2, "retry", "SKU-3310");
  for (let t = 30.8; t < 50; t += 6.2) push(t, 2, "retry", "SKU-3310");
  push(58.4, 2, "success", "SKU-3310");

  return evs.sort((a, b) => a.t - b.t);
}

function mmss(compressed: number): string {
  const real = compressed * TIME_SCALE;
  const m = Math.floor(real / 60);
  const s = Math.floor(real % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function mountWanDemo(root: HTMLElement): void {
  root.innerHTML = `
    <div class="demo">
      <div class="demo-head">
        <span class="dot"></span>调度时间轴 · 合成数据
        <span class="demo-note">1 秒画面 ≈ 15 秒真实时间 · 目标 / 订单 / 代理均为虚构</span>
      </div>
      <div class="demo-body">
        <div class="demo-controls">
          <button class="chip active" data-act="toggle">暂停</button>
          <button class="chip active" data-mode="serial">串行</button>
          <button class="chip ghost" data-mode="concurrent">并发</button>
          <button class="chip" data-act="reset">重置</button>
        </div>
        <canvas id="wan-timeline"></canvas>
        <div class="wan-log" id="wan-log"></div>
      </div>
    </div>`;

  const canvas = root.querySelector<HTMLCanvasElement>("#wan-timeline")!;
  const logEl = root.querySelector<HTMLElement>("#wan-log")!;
  const ctx = canvas.getContext("2d")!;

  let mode: "serial" | "concurrent" = "serial";
  let events = buildEvents(mode);
  let t = 0;
  let playing = true;
  let last = performance.now();
  let cursor = 0;
  let raf = 0;

  const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.floor(w * dpr());
    canvas.height = Math.floor(h * dpr());
    ctx.setTransform(dpr(), 0, 0, dpr(), 0, 0);
  };

  const resetLog = () => {
    logEl.innerHTML = "";
    cursor = 0;
  };

  const pushLog = (html: string) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    logEl.appendChild(div);
    while (logEl.children.length > 7) logEl.removeChild(logEl.firstElementChild!);
  };

  const logFor = (ev: Ev) => {
    const acc = ACCOUNTS[ev.acct];
    const stamp = `<span class="t">[T+${mmss(ev.t)}]</span>`;
    if (ev.kind === "success") {
      return `${stamp} ${acc.name} · <span class="ok">下单成功 · ORD-${88230 + ev.acct}</span> · ${ev.sku} · 代理 ${acc.proxy}`;
    }
    if (ev.kind === "throttle") {
      return `${stamp} ${acc.name} · <span class="warn">强限流 → 退避 ${(1 + Math.floor(ev.t) % 3)}s</span> · ${ev.sku}`;
    }
    const ms = ev.t < 15 ? "200ms" : ev.t < 30 ? "递增" : "5000ms";
    const tag = ev.note ? ` · <span class="warn">${ev.note}</span>` : "";
    return `${stamp} ${acc.name} · 重试 ${ms} · ${ev.sku}${tag} · 代理 ${acc.proxy} 独占`;
  };

  const draw = () => {
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    ctx.clearRect(0, 0, W, H);

    const padL = 62;
    const padR = 16;
    const padT = 34;
    const padB = 26;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const rowH = plotH / ACCOUNTS.length;
    const x = (v: number) => padL + (v / DURATION) * plotW;

    // phase bands
    PHASES.forEach((p) => {
      const isQuiet = p.label === "补货静默";
      ctx.fillStyle = isQuiet ? "rgba(169,195,161,0.10)" : "rgba(255,255,255,0.022)";
      ctx.fillRect(x(p.from), padT - 16, x(p.to) - x(p.from) - 2, plotH + 16);
      ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillStyle = isQuiet ? "rgba(169,195,161,0.85)" : "rgba(139,150,168,0.75)";
      ctx.textAlign = "left";
      ctx.fillText(p.label, x(p.from) + 8, padT - 6);
    });

    // quiet window dashed border
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(169,195,161,0.5)";
    ctx.strokeRect(x(50) + 0.5, padT - 14.5, x(60) - x(50) - 3, plotH + 13);
    ctx.restore();

    // grid
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let s = 0; s <= DURATION; s += 5) {
      ctx.beginPath();
      ctx.moveTo(Math.round(x(s)) + 0.5, padT - 14);
      ctx.lineTo(Math.round(x(s)) + 0.5, padT + plotH);
      ctx.stroke();
    }

    // rows
    ACCOUNTS.forEach((acc, i) => {
      const cy = padT + rowH * i + rowH / 2;
      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.beginPath();
      ctx.moveTo(padL, cy + 0.5);
      ctx.lineTo(W - padR, cy + 0.5);
      ctx.stroke();

      ctx.textAlign = "right";
      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillStyle = "rgba(233,238,247,0.9)";
      ctx.fillText(acc.name, padL - 10, cy - 3);
      ctx.fillStyle = "rgba(139,150,168,0.65)";
      ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(acc.proxy, padL - 10, cy + 12);
    });

    // events
    events.forEach((ev) => {
      const cx = x(ev.t);
      const cy = padT + rowH * ev.acct + rowH / 2;
      const passed = ev.t <= t;
      const alpha = passed ? 1 : 0.14;

      if (ev.kind === "success") {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = COLORS.success;
        ctx.shadowBlur = passed ? 16 : 0;
        ctx.fillStyle = COLORS.success;
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (passed) {
          ctx.fillStyle = "rgba(169,195,161,0.9)";
          ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace";
          ctx.textAlign = "left";
          ctx.fillText("OK", cx + 9, cy + 3);
        }
      } else {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = COLORS[ev.kind];
        const hgt = ev.kind === "throttle" ? 14 : 10;
        ctx.fillRect(cx - 1, cy - hgt / 2, 2.2, hgt);
        ctx.restore();
      }
    });

    // playhead
    const px = x(t);
    const grad = ctx.createLinearGradient(0, padT - 16, 0, padT + plotH);
    grad.addColorStop(0, "rgba(216,161,95,0)");
    grad.addColorStop(0.5, "rgba(169,195,161,0.9)");
    grad.addColorStop(1, "rgba(216,161,95,0)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(px, padT - 16);
    ctx.lineTo(px, padT + plotH);
    ctx.stroke();

    // time label
    ctx.fillStyle = "rgba(169,195,161,0.85)";
    ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textAlign = "center";
    ctx.fillText(`T+${mmss(t)}`, Math.min(W - padR - 30, Math.max(padL + 26, px)), H - 8);
  };

  const loop = (now: number) => {
    const dt = Math.min(0.06, (now - last) / 1000);
    last = now;

    if (playing) {
      t += dt * 1.35;
      if (t >= DURATION) {
        t = 0;
        resetLog();
      }
      while (cursor < events.length && events[cursor].t <= t) {
        pushLog(logFor(events[cursor]));
        cursor++;
      }
    }
    draw();
    raf = requestAnimationFrame(loop);
  };

  root.querySelectorAll<HTMLButtonElement>(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.act === "toggle") {
        playing = !playing;
        btn.textContent = playing ? "暂停" : "播放";
        btn.classList.toggle("active", playing);
      } else if (btn.dataset.act === "reset") {
        t = 0;
        resetLog();
        playing = true;
        const toggle = root.querySelector<HTMLButtonElement>('[data-act="toggle"]')!;
        toggle.textContent = "暂停";
        toggle.classList.add("active");
      } else if (btn.dataset.mode) {
        mode = btn.dataset.mode as "serial" | "concurrent";
        events = buildEvents(mode);
        t = 0;
        resetLog();
        root.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((b) =>
          b.classList.toggle("active", b.dataset.mode === mode)
        );
      }
    });
  });

  resize();
  window.addEventListener("resize", resize);
  raf = requestAnimationFrame(loop);

  // stop drawing when the overlay is removed
  const observer = new MutationObserver(() => {
    if (!document.body.contains(canvas)) {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
