type Shot = { key: string; label: string; src: string; caption: string };

const SHOTS: Shot[] = [
  {
    key: "library",
    label: "我的图库",
    src: "shots/my-files.jpg",
    caption: "分类筛选、内联标签编辑、批量操作 —— 图库是第一入口，标签就地可改。",
  },
  {
    key: "detail",
    label: "图片详情",
    src: "shots/image-detail.jpg",
    caption: "AI 描述、标签来源（AI / 用户）、主体纠正入口，全部落在同一张详情页。",
  },
  {
    key: "search",
    label: "图片探索",
    src: "shots/search.jpg",
    caption: "用一句话检索：文本先转向量，再按余弦相似度召回，支持按标签收窄。",
  },
  {
    key: "tags",
    label: "标签管理",
    src: "shots/tags.jpg",
    caption: "三级标签体系、来源追踪与使用统计，删除被主体引用的标签会被拦截。",
  },
];

type Query = { q: string; results: { title: string; tags: string; score: number; hue: number }[] };

const QUERIES: Query[] = [
  {
    q: "海边日落",
    results: [
      { title: "海平面上的暖色天空", tags: "日落 · 海面 · 逆光", score: 0.93, hue: 24 },
      { title: "沙滩与退潮的纹理", tags: "沙滩 · 纹理 · 俯拍", score: 0.86, hue: 40 },
      { title: "黄昏时分的城市天际线", tags: "城市 · 黄昏 · 远景", score: 0.78, hue: 8 },
    ],
  },
  {
    q: "赛博朋克街道",
    results: [
      { title: "雨夜霓虹招牌的窄巷", tags: "霓虹 · 雨夜 · 街道", score: 0.95, hue: 280 },
      { title: "便利店冷光下的路人", tags: "夜景 · 冷光 · 人物", score: 0.87, hue: 210 },
      { title: "高架桥下的车流光轨", tags: "长曝光 · 车流 · 城市", score: 0.81, hue: 320 },
    ],
  },
  {
    q: "白色小猫",
    results: [
      { title: "窗台上的白色长毛猫", tags: "猫 · 室内 · 柔光", score: 0.94, hue: 44 },
      { title: "毛毯上蜷缩的幼猫", tags: "幼猫 · 毛毯 · 特写", score: 0.85, hue: 30 },
      { title: "雪地里的小型犬", tags: "犬 · 雪地 · 户外", score: 0.62, hue: 200 },
    ],
  },
];

export function mountImgtagDemo(root: HTMLElement): void {
  root.innerHTML = `
    <div class="demo">
      <div class="demo-head">
        <span class="dot"></span>界面实录 · 开源版本
        <span class="demo-note">截图来自 ImgTag 仓库 docs/screenshots</span>
      </div>
      <div class="demo-body">
        <div class="tabs">
          ${SHOTS.map(
            (s, i) =>
              `<button class="chip ${i === 0 ? "active" : ""}" data-shot="${s.key}">${s.label}</button>`
          ).join("")}
        </div>
        <div class="shot-wrap"><img id="imgtag-shot" src="${SHOTS[0].src}" alt="${SHOTS[0].caption}" /></div>
        <p class="shot-cap" id="imgtag-cap">${SHOTS[0].caption}</p>

        <div class="query-demo">
          <div class="query-row">
            <span class="mono dim" style="align-self:center;margin-right:4px">语义检索</span>
            ${QUERIES.map(
              (q, i) =>
                `<button class="chip ghost ${i === 0 ? "active" : ""}" data-q="${i}">${q.q}</button>`
            ).join("")}
          </div>
          <div class="results" id="imgtag-results"></div>
          <p class="mono dim" style="font-size:10px">示意数据 · 相似度为余弦分数，缩略图为占位色块</p>
        </div>
      </div>
    </div>`;

  const img = root.querySelector<HTMLImageElement>("#imgtag-shot")!;
  const cap = root.querySelector<HTMLElement>("#imgtag-cap")!;
  const results = root.querySelector<HTMLElement>("#imgtag-results")!;

  root.querySelectorAll<HTMLButtonElement>("[data-shot]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const shot = SHOTS.find((s) => s.key === btn.dataset.shot)!;
      img.src = shot.src;
      img.alt = shot.caption;
      cap.textContent = shot.caption;
      root.querySelectorAll<HTMLButtonElement>("[data-shot]").forEach((b) =>
        b.classList.toggle("active", b === btn)
      );
    });
  });

  const renderQuery = (idx: number) => {
    const q = QUERIES[idx];
    results.innerHTML = q.results
      .map(
        (r) => `
        <div class="result">
          <div class="thumb" style="background:
            radial-gradient(120% 120% at 20% 15%, hsl(${r.hue} 85% 62% / .95), hsl(${
          (r.hue + 40) % 360
        } 70% 34% / .9) 45%, #0b0f18 100%)"></div>
          <div>
            <div class="rt">${r.title}</div>
            <div class="rtags">${r.tags}</div>
          </div>
          <div class="score">${r.score.toFixed(2)}</div>
          <div class="bar"><i></i></div>
        </div>`
      )
      .join("");

    const rows = Array.from(results.querySelectorAll<HTMLElement>(".result"));
    rows.forEach((row, i) => {
      setTimeout(() => {
        row.classList.add("show");
        const bar = row.querySelector<HTMLElement>(".bar i")!;
        bar.style.width = `${q.results[i].score * 100}%`;
      }, 80 + i * 110);
    });
  };

  root.querySelectorAll<HTMLButtonElement>("[data-q]").forEach((btn) => {
    btn.addEventListener("click", () => {
      root.querySelectorAll<HTMLButtonElement>("[data-q]").forEach((b) =>
        b.classList.toggle("active", b === btn)
      );
      renderQuery(Number(btn.dataset.q));
    });
  });

  renderQuery(0);
}
