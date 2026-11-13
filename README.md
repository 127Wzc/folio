# Warden·Cusp · Folio

个人作品集：单页 + hash 路由的案例详情（`#/case/<id>`），Three.js 首屏，纯静态产物。

线上：<https://127wzc.github.io/folio/>

## 本地开发

```bash
npm install
npm run dev      # http://localhost:5180
npm run build    # 类型检查 + 产物到 dist/
```

## 部署

产物是纯静态的 `dist/`：`base: "./"`，根域和子路径都能放；路由是 hash 模式，不需要 SPA 回退规则。

- **GitHub Pages**：推到 `main` 自动发布（`.github/workflows/deploy.yml`，仓库 Pages 的 Source 选 GitHub Actions）；
- **Vercel / Netlify**：直接导入仓库，`vercel.json`、`netlify.toml` 已写好构建命令与输出目录，不用手填。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/127Wzc/folio&project-name=warden-cusp-folio&repository-name=folio)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/127Wzc/folio)

缓存头三处一致：`/assets/*` 一年 `immutable`（文件名带 hash）、`/shots/*` 一周、`/index.html` 不缓存。

## 文件结构

```
folio/
├─ index.html              # 页面骨架：首屏 / 项目列表 / 联系
├─ src/
│  ├─ main.ts              # 入口：列表渲染、滚动进度、进场动画、短语轮播
│  ├─ style.css            # 样式入口，只有 @import
│  ├─ styles/              # tokens / shell / page / projects / case / demos / responsive
│  ├─ data/
│  │  ├─ projects.ts       # ★ 作品内容源
│  │  └─ quotes.ts         # 页尾轮播短语
│  ├─ three/hero.ts        # 首屏粒子与星环
│  └─ ui/
│     ├─ render.ts         # 列表与详情模板
│     ├─ case-overlay.ts   # 案例路由、滚动锁、演示挂载
│     └─ *-demo.ts         # 案例内的交互演示
├─ public/shots/           # 截图：列表缩略图与详情大图共用
├─ vercel.json / netlify.toml / .nvmrc
└─ .github/workflows/deploy.yml
```

## 加一个新作品

只改 `src/data/projects.ts`，往 `PROJECTS` 里 push 一个对象：

```ts
{
  id: "new-one", no: "04", name: "项目名", title: "详情页标题",
  blurb: "一句话说明（列表里一行）",
  tags: [{ text: "开源 · MIT", cls: "tag-open" }],
  points: ["亮点一", "亮点二"],
  meta: [["角色", "独立开发"], ["技术", "…"], ["状态", "…"]],
  highlights: [{ k: "KEY", title: "小标题", desc: "两三句技术取舍" }],
  stats: [{ v: "3", l: "说明" }],
  visual: { src: "shots/xxx.jpg", alt: "…" },   // 截图放 public/shots/
  demo: "imgtag",                                // 可选，见 src/ui/
}
```

- 列表、详情页、上下篇都按数组顺序自动生成，不用动布局和 CSS；
- 需要交互演示：在 `src/ui/` 加一个 `*-demo.ts`，到 `case-overlay.ts` 的 `DEMOS` 里注册，`demo` 字段填对应 key；
- `notesTitle` / `notes` 可选，详情页会多一节技术选型；
- 私有项目用合成数据的截图，开源项目用真实界面。
