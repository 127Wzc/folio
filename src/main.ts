import { initCaseOverlay } from "./ui/case-overlay";
import { renderProjects } from "./ui/render";
import { QUOTES, QUOTE_INTERVAL } from "./data/quotes";

/* ---------- content ---------- */
const list = document.getElementById("project-list");
if (list) renderProjects(list);

/* ---------- background scene ---------- */
const canvas = document.getElementById("bg") as HTMLCanvasElement | null;
if (canvas) {
  // three.js 单独成块，晚于首屏内容加载，避免拖慢卡片渲染
  import("./three/hero")
    .then(({ createHeroScene }) => createHeroScene(canvas))
    .catch((err) => {
      console.warn("WebGL unavailable, using static background", err);
      canvas.style.display = "none";
      document.body.style.background =
        "radial-gradient(900px 600px at 50% 20%, rgba(216,161,95,0.12), transparent 70%), radial-gradient(700px 500px at 20% 80%, rgba(226,203,164,0.08), transparent 70%), #0a0a0b";
    });
}

/* ---------- nav + progress ---------- */
const nav = document.getElementById("nav");
const progressBar = document.getElementById("progress-bar");

const onScroll = () => {
  const y = window.scrollY;
  nav?.classList.toggle("scrolled", y > 24);
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  if (progressBar) progressBar.style.width = `${Math.min(100, (y / max) * 100)}%`;
};
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ---------- reveal ---------- */
const revealTargets = document.querySelectorAll<HTMLElement>(
  ".intro-name, .intro-role, .project, .contact-quote, .contact-links"
);
revealTargets.forEach((el, i) => {
  el.classList.add("reveal");
  el.style.transitionDelay = `${Math.min(120, (i % 4) * 70)}ms`;
});

const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
);
revealTargets.forEach((el) => io.observe(el));

/* ---------- quote rotation ---------- */
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const rotateQuotes = (el: HTMLElement | null, offset = 0) => {
  if (!el || !QUOTES.length) return;
  let qi = offset % QUOTES.length;
  el.textContent = QUOTES[qi];
  if (reducedMotion || QUOTES.length < 2) return;
  const FADE = 360;
  window.setInterval(() => {
    if (document.hidden) return;
    el.classList.add("is-out");
    window.setTimeout(() => {
      qi = (qi + 1) % QUOTES.length;
      el.textContent = QUOTES[qi];
      el.classList.remove("is-out");
    }, FADE);
  }, QUOTE_INTERVAL);
};

// 只在页尾轮播
rotateQuotes(document.getElementById("contact-quote"));

/* ---------- case overlay ---------- */
initCaseOverlay();
