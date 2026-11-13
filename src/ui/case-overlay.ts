import { projectById } from "../data/projects";
import { renderCaseShell } from "./render";
import { mountWanDemo } from "./wan-demo";
import { mountImgtagDemo } from "./imgtag-demo";
import { mountYuiDemo } from "./yui-demo";

const root = document.getElementById("case-root") as HTMLElement;
const DEMOS = {
  yui: mountYuiDemo,
  wan: mountWanDemo,
  imgtag: mountImgtagDemo,
};

let activeId: string | null = null;
let savedScroll = 0;

function open(id: string, push = true): void {
  const p = projectById(id);
  if (!p || activeId === id) return;

  if (!activeId) {
    savedScroll = window.scrollY;
    document.body.style.top = `-${savedScroll}px`;
    document.body.classList.add("locked");
  }

  activeId = id;
  root.innerHTML = renderCaseShell(p);
  root.classList.add("open");
  root.setAttribute("aria-hidden", "false");
  root.scrollTop = 0;

  if (push) {
    const hash = `#/case/${id}`;
    if (location.hash !== hash) history.pushState({ case: id }, "", hash);
  }

  root.querySelectorAll<HTMLElement>("[data-close]").forEach((b) =>
    b.addEventListener("click", () => close())
  );
  root.querySelectorAll<HTMLElement>("[data-go]").forEach((b) =>
    b.addEventListener("click", () => {
      const target = b.dataset.go;
      if (target) open(target, true);
    })
  );

  requestAnimationFrame(() => {
    const slot = root.querySelector<HTMLElement>("#demo-slot");
    if (slot) DEMOS[p.demo](slot);
    root.setAttribute("tabindex", "-1");
    root.focus({ preventScroll: true });
  });
}

function close(push = true): void {
  if (!activeId) return;
  activeId = null;
  root.classList.remove("open");
  root.setAttribute("aria-hidden", "true");
  root.innerHTML = "";
  document.body.classList.remove("locked");
  document.body.style.top = "";
  window.scrollTo(0, savedScroll);

  if (push) history.pushState(null, "", location.pathname + location.search);
}

function syncFromHash(): void {
  const m = location.hash.match(/^#\/case\/([a-z0-9-]+)$/i);
  if (m) open(m[1].toLowerCase(), false);
  else if (activeId) close(false);
}

export function initCaseOverlay(): void {
  document.querySelectorAll<HTMLElement>("[data-case]").forEach((card) => {
    const id = card.dataset.case!;
    card.addEventListener("click", () => open(id));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open(id);
      }
    });
  });

  root.addEventListener("click", (e) => {
    if (e.target === root) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && activeId) close();
  });

  window.addEventListener("popstate", syncFromHash);
  window.addEventListener("hashchange", syncFromHash);

  if (location.hash.startsWith("#/case/")) syncFromHash();
}
