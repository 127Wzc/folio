import { PROJECTS, type Project } from "../data/projects";

function projectRow(p: Project): string {
  return `<li class="project" data-case="${p.id}" tabindex="0" role="button" aria-label="打开案例：${p.title}">
    <span class="p-no">${p.no}</span>
    <span class="p-thumb"><img src="${p.visual.src}" alt="" loading="lazy" /></span>
    <span class="p-body">
      <span class="p-name">${p.name}</span>
      <span class="p-desc">${p.blurb}</span>
    </span>
    <span class="p-meta">${p.tags.slice(0, 2).map((t) => t.text).join(" / ")}</span>
    <span class="p-arrow" aria-hidden="true">↗</span>
  </li>`;
}

export function renderProjects(container: HTMLElement): void {
  container.innerHTML = PROJECTS.map(projectRow).join("");
}

export function renderCaseShell(p: Project): string {
  const idx = PROJECTS.findIndex((x) => x.id === p.id);
  const prev = PROJECTS[(idx - 1 + PROJECTS.length) % PROJECTS.length];
  const next = PROJECTS[(idx + 1) % PROJECTS.length];
  const hasNotes = !!p.notes?.length;
  const n = (i: number) => String(i).padStart(2, "0");
  const statsNo = hasNotes ? 4 : 3;

  return `<div class="case-shell">
    <div class="case-top">
      <button class="case-back" data-close>← 返回</button>
      <span class="case-crumb">${p.no} / 0${PROJECTS.length} · ${p.name.toUpperCase()}</span>
    </div>

    <header class="case-hero">
      <p class="eyebrow">${p.no} / 0${PROJECTS.length} · CASE</p>
      <h1>${p.title}</h1>
      <p class="case-lede">${p.blurb}</p>
      <div class="case-tags">${p.tags
        .map((t) => `<span class="tag ${t.cls ?? ""}">${t.text}</span>`)
        .join("")}</div>
      <dl class="case-meta">${p.meta
        .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
        .join("")}</dl>
    </header>

    <div class="case-visual">
      <img src="${p.visual.src}" alt="${p.visual.alt}" />
    </div>

    <section class="case-section">
      <h2><span>${n(1)}</span>亮点</h2>
      <div class="hl-grid">${p.highlights
        .map(
          (h) => `<div class="panel">
            <span class="k">${h.k}</span>
            <h3>${h.title}</h3>
            <p>${h.desc}</p>
          </div>`
        )
        .join("")}</div>
    </section>

    <section class="case-section">
      <h2><span>${n(2)}</span>演示</h2>
      <div id="demo-slot"></div>
    </section>

    ${
      hasNotes
        ? `<section class="case-section">
      <h2><span>${n(3)}</span>${p.notesTitle ?? "补充"}</h2>
      <div class="note-grid">${p.notes!
        .map(
          (x) => `<div class="note">
            <h3>${x.title}</h3>
            <p>${x.desc}</p>
          </div>`
        )
        .join("")}</div>
    </section>`
        : ""
    }

    <section class="case-section">
      <h2><span>${n(statsNo)}</span>结果</h2>
      <div class="stats">${p.stats
        .map((s) => `<div class="stat"><b>${s.v}</b><span>${s.l}</span></div>`)
        .join("")}</div>
    </section>

    ${
      p.note
        ? `<section class="case-section">
      <div class="callout"><span class="ico">◆</span><div><strong>脱敏说明 · </strong>${p.note}</div></div>
    </section>`
        : ""
    }

    <div class="case-nav">
      <button data-go="${prev.id}">← ${prev.no} ${prev.name}</button>
      <button data-go="${next.id}">${next.no} ${next.name} →</button>
    </div>
  </div>`;
}
