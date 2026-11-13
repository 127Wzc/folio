import * as THREE from "three";

type Disposable = { dispose(): void };

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  uniform float uPixelRatio;
  uniform vec2 uMouse;
  uniform float uSize;

  attribute float aScale;
  attribute float aSeed;
  attribute float aTint;

  varying float vTint;
  varying float vFade;
  varying float vPulse;

  void main() {
    vec3 p = position;
    float r = length(p.xz);

    float spin = uTime * (0.055 + 0.13 / (1.0 + r * 0.55));
    float c = cos(spin);
    float s = sin(spin);
    p.xz = mat2(c, -s, s, c) * p.xz;

    float wave = sin(uTime * 0.55 + aSeed * 6.2831 + r * 0.75);
    p.y += wave * (0.14 + 0.22 / (1.0 + r * 0.3));

    float breathe = 1.0 + uScroll * 0.18;
    p.xz *= breathe;

    p.x += uMouse.x * (0.18 + r * 0.035);
    p.y += uMouse.y * (0.18 + r * 0.035);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float dist = max(0.001, -mv.z);
    gl_PointSize = aScale * uSize * uPixelRatio * (22.0 / dist);

    vTint = aTint;
    vFade = smoothstep(52.0, 9.0, dist) * smoothstep(3.0, 8.0, dist);
    vPulse = 0.72 + 0.28 * sin(uTime * 1.4 + aSeed * 12.0);
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uOpacity;

  varying float vTint;
  varying float vFade;
  varying float vPulse;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    float core = smoothstep(0.5, 0.0, d);
    float glow = pow(core, 2.6);

    vec3 col = mix(uColorA, uColorB, vTint);
    float a = (glow * 0.85 + core * 0.22) * vFade * uOpacity * vPulse;

    gl_FragColor = vec4(col, a);
  }
`;

function gauss(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function createHeroScene(canvas: HTMLCanvasElement): Disposable {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = window.matchMedia("(max-width: 720px)").matches;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.8));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 120);
  camera.position.set(0, 2.6, 9.4);
  camera.lookAt(0, 0, 0);

  const group = new THREE.Group();
  scene.add(group);

  /* ---------- galaxy particles ---------- */
  const COUNT = small ? 6000 : 13000;
  const positions = new Float32Array(COUNT * 3);
  const scales = new Float32Array(COUNT);
  const seeds = new Float32Array(COUNT);
  const tints = new Float32Array(COUNT);
  const ARMS = 3;

  for (let i = 0; i < COUNT; i++) {
    const t = Math.pow(Math.random(), 0.62);
    const r = 2.2 + t * 12.5;
    const arm = i % ARMS;
    const angle = (arm / ARMS) * Math.PI * 2 + r * 0.42 + gauss() * (0.55 - t * 0.28);

    const x = Math.cos(angle) * r + gauss() * 0.28;
    const z = Math.sin(angle) * r + gauss() * 0.28;
    const y = gauss() * (0.32 + (1 - t) * 0.85);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    scales[i] = 0.5 + Math.pow(Math.random(), 2.4) * 2.6;
    seeds[i] = Math.random();
    tints[i] = Math.min(1, Math.max(0, (r - 2.4) / 12 + gauss() * 0.12));
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geo.setAttribute("aTint", new THREE.BufferAttribute(tints, 1));

  const uniforms = {
    uTime: { value: 0 },
    uScroll: { value: 0 },
    uPixelRatio: { value: renderer.getPixelRatio() },
    uSize: { value: small ? 1.0 : 1.1 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uOpacity: { value: 1 },
    uColorA: { value: new THREE.Color("#c8ae86") },
    uColorB: { value: new THREE.Color("#544f47") },
  };

  const points = new THREE.Points(
    geo,
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    })
  );
  points.frustumCulled = false;
  group.add(points);

  /* ---------- wireframe core ---------- */
  const coreGroup = new THREE.Group();
  coreGroup.position.set(4.6, 0.05, -1.0);
  if (small) {
    coreGroup.position.set(0.6, 2.6, -3.2);
    coreGroup.scale.setScalar(0.55);
  }
  group.add(coreGroup);

  const coreGeo = new THREE.IcosahedronGeometry(1.55, 1);
  const coreEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(coreGeo),
    new THREE.LineBasicMaterial({
      color: new THREE.Color("#c8ae86"),
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  coreGroup.add(coreEdges);

  const shellEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.75, 0)),
    new THREE.LineBasicMaterial({
      color: new THREE.Color("#544f47"),
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  shellEdges.rotation.set(0.6, 0.3, 0.1);
  coreGroup.add(shellEdges);

  coreGeo.dispose();

  /* ---------- tech labels orbiting the core ---------- */
  type Cat = "backend" | "frontend" | "data" | "ai" | "ops";

  const CAT_COLOR: Record<Cat, string> = {
    backend: "rgba(200,174,134,0.95)",
    frontend: "rgba(169,182,160,0.95)",
    data: "rgba(179,167,196,0.95)",
    ai: "rgba(216,161,95,0.98)",
    ops: "rgba(141,138,131,0.9)",
  };

  const RINGS: { r: number; y: number; speed: number; items: { text: string; cat: Cat }[] }[] = [
    {
      r: 2.35, y: -1.15, speed: 1,
      items: [
        { text: "Java", cat: "backend" },
        { text: "Python", cat: "backend" },
        { text: "TypeScript", cat: "frontend" },
        { text: "SQLite", cat: "data" },
      ],
    },
    {
      r: 2.95, y: 0.05, speed: -0.8,
      items: [
        { text: "Spring Boot", cat: "backend" },
        { text: "FastAPI", cat: "backend" },
        { text: "Vue 3", cat: "frontend" },
        { text: "PostgreSQL", cat: "data" },
        { text: "Redis", cat: "data" },
      ],
    },
    {
      r: 3.55, y: 1.2, speed: 0.62,
      items: [
        { text: "MCP", cat: "ai" },
        { text: "RAG", cat: "ai" },
        { text: "OpenAI API", cat: "ai" },
        { text: "Docker", cat: "ops" },
        { text: "Kubernetes", cat: "ops" },
        { text: "Linux", cat: "ops" },
      ],
    },
  ];

  const labelGroup = new THREE.Group();
  labelGroup.position.copy(coreGroup.position);
  if (small) labelGroup.scale.setScalar(0.62);
  group.add(labelGroup);

  const labelSprites: THREE.Sprite[] = [];
  const ringGroups: { g: THREE.Group; speed: number }[] = [];
  const disposables: { dispose(): void }[] = [];

  const makeLabel = (text: string, cat: Cat): THREE.Sprite => {
    const dpr = 2;
    const font = '500 26px "SF Mono", ui-monospace, Menlo, monospace';
    const pad = 12;
    const measure = document.createElement("canvas").getContext("2d")!;
    measure.font = font;
    const w = Math.ceil(measure.measureText(text).width) + pad * 2;
    const h = 40;

    const c = document.createElement("canvas");
    c.width = w * dpr;
    c.height = h * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.font = font;
    ctx.textBaseline = "middle";
    ctx.fillStyle = CAT_COLOR[cat];
    ctx.fillText(text, pad, h / 2 + 1);

    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;

    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.9 });
    const sprite = new THREE.Sprite(mat);
    const baseScale = new THREE.Vector2(w / 138, h / 138);
    sprite.scale.set(baseScale.x, baseScale.y, 1);
    sprite.userData = { cat, baseScale };
    disposables.push(tex, mat);
    return sprite;
  };

  RINGS.forEach((ring) => {
    const g = new THREE.Group();
    g.position.y = ring.y;
    const orbitPts = Array.from({ length: 96 }, (_, i) => {
      const a = (i / 96) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * ring.r, 0, Math.sin(a) * ring.r);
    });
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
    const orbitLine = new THREE.LineLoop(
      orbitGeo,
      new THREE.LineBasicMaterial({
        color: new THREE.Color("#8d8a83"),
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      })
    );
    g.add(orbitLine);
    disposables.push(orbitGeo, orbitLine.material as THREE.Material);

    ring.items.forEach((item, i) => {
      const sprite = makeLabel(item.text, item.cat);
      const a = (i / ring.items.length) * Math.PI * 2;
      sprite.position.set(Math.cos(a) * ring.r, 0, Math.sin(a) * ring.r);
      sprite.userData.phase = (i / ring.items.length) * Math.PI * 2;
      g.add(sprite);
      labelSprites.push(sprite);
    });
    labelGroup.add(g);
    ringGroups.push({ g, speed: ring.speed });
  });

  /* ---------- interaction state ---------- */
  let hoverCat: Cat | null = null;
  let hoveredSprite: THREE.Sprite | null = null;

  const tip = document.getElementById("stack-tip");
  // canvas 尺寸与提示宽度缓存：提示每帧都要定位，不能逐帧读布局
  let viewW = canvas.clientWidth || window.innerWidth;
  let viewH = canvas.clientHeight || window.innerHeight;
  let tipW = 0;
  const anchor = new THREE.Vector3();
  const anchorNdc = new THREE.Vector3();
  const CAT_NAME: Record<Cat, string> = {
    backend: "后端 · Java / Python",
    frontend: "前端 · Vue 3 / TypeScript",
    data: "数据 · PostgreSQL / Redis / SQLite",
    ai: "AI · MCP / RAG / OpenAI API",
    ops: "运维 · Docker / K8s / Linux",
  };

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let scroll = 0;
  const clock = new THREE.Clock();

  const onPointer = (e: PointerEvent) => {
    // 用 canvas 自己的盒子换算 NDC：canvas 只覆盖首屏，不是整个窗口
    const rect = canvas.getBoundingClientRect();
    pointer.tx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.ty = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

  };
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("mousemove", onPointer as EventListener, { passive: true });


  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    viewW = w;
    viewH = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    uniforms.uPixelRatio.value = renderer.getPixelRatio();
  };
  resize();
  window.addEventListener("resize", resize);

  let visible = true;
  const onVisibility = () => {
    visible = !document.hidden;
    if (visible) clock.getDelta();
  };
  document.addEventListener("visibilitychange", onVisibility);

  const target = new THREE.Vector3(0, 0, 0);
  const camTarget = new THREE.Vector3();

  const tick = () => {
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;

    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3.2);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3.2);

    uniforms.uTime.value = time;
    uniforms.uScroll.value = scroll;
    uniforms.uMouse.value.set(pointer.x * 0.6, pointer.y * 0.45);

    const intro = Math.min(1, time / 2.2);
    uniforms.uOpacity.value = intro * 0.6;

    group.rotation.z = Math.sin(time * 0.05) * 0.06;
    group.rotation.x = 0.1 + pointer.y * 0.05;

    ringGroups.forEach((r) => {
      r.g.rotation.y += dt * 0.12 * r.speed;
    });
    labelGroup.rotation.x = Math.sin(time * 0.12) * 0.1;
    coreGroup.rotation.y += dt * 0.14;

    labelGroup.updateMatrixWorld(true);
    const wp = new THREE.Vector3();

    // hover 检测：把每个标签投影到屏幕，做椭圆命中测试，取最近的一个
    let hovered: THREE.Sprite | null = null;
    let bestScore = Infinity;
    let labelBottom = 0;
    const fovRad = (camera.fov * Math.PI) / 180;
    const proj = new THREE.Vector3();
    const camPos = camera.position;

    labelSprites.forEach((sp) => {
      sp.getWorldPosition(wp);
      proj.copy(wp).project(camera);
      if (proj.z > 1) return;

      // 标签环在屏幕上的最低点，用来给提示条定位
      labelBottom = Math.max(labelBottom, (-proj.y * 0.5 + 0.5) * viewH);

      const distToCam = camPos.distanceTo(wp);
      const viewSpan = 2 * Math.tan(fovRad / 2) * distToCam;
      // NDC 半宽/半高：世界尺寸 / 该距离处的视口尺寸
      const halfW = sp.scale.x / (viewSpan * camera.aspect);
      const halfH = sp.scale.y / viewSpan;

      const nx = (proj.x - pointer.tx) / halfW;
      const ny = (proj.y - pointer.ty) / halfH;
      // 迟滞：标签在自转，已经选中的那个给 1.35 倍容差，避免光标没动却闪断
      const pad = sp === hoveredSprite ? 1.35 : 1;
      if (Math.abs(nx) <= pad && Math.abs(ny) <= pad) {
        const score = nx * nx + ny * ny;
        if (score < bestScore) {
          bestScore = score;
          hovered = sp;
        }
      }
    });

    hoveredSprite = hovered;
    const nextCat = hovered ? ((hovered as THREE.Sprite).userData.cat as Cat) : null;
    if (nextCat !== hoverCat) {
      hoverCat = nextCat;
      document.body.style.cursor = hoverCat ? "pointer" : "";
      if (tip) {
        tip.textContent = hoverCat ? CAT_NAME[hoverCat] : "";
        tip.classList.toggle("on", !!hoverCat);
        tipW = tip.offsetWidth || 0;
      }
    }

    // 分类提示：横向对齐球心，纵向挂在标签环下沿，越界时收进首屏
    if (tip && hoverCat) {
      coreGroup.getWorldPosition(anchor);
      anchorNdc.copy(anchor).project(camera);
      const cx = (anchorNdc.x * 0.5 + 0.5) * viewW;
      const half = (tipW || 140) / 2;
      const x = Math.min(Math.max(cx, half + 14), viewW - half - 14);
      const y = Math.min(labelBottom + 24, viewH - 34);
      tip.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translateX(-50%)`;
    }

    const k = Math.min(1, dt * 9);
    labelSprites.forEach((sp) => {
      sp.position.y = Math.sin(time * 0.7 + (sp.userData.phase as number)) * 0.07;
      sp.getWorldPosition(wp);
      const depth = Math.min(1, Math.max(0, (wp.z + 5.2) / 10.4));

      let targetOpacity = 0.62 + depth * 0.38;
      let targetScale = 1;
      if (hoverCat) {
        if (sp.userData.cat === hoverCat) {
          targetOpacity = Math.max(targetOpacity, 0.9);
          targetScale = 1.22;
        } else {
          targetOpacity *= 0.2;
          targetScale = 0.94;
        }
      }

      const mat = sp.material as THREE.SpriteMaterial;
      mat.opacity += (targetOpacity - mat.opacity) * k;

      const base = sp.userData.baseScale as THREE.Vector2;
      sp.scale.x += (base.x * targetScale - sp.scale.x) * k;
      sp.scale.y += (base.y * targetScale - sp.scale.y) * k;
    });
    coreGroup.rotation.x = Math.sin(time * 0.18) * 0.22 + scroll * 0.4;
    shellEdges.rotation.y -= dt * 0.08;

    camTarget.set(
      pointer.x * 0.95,
      2.6 + pointer.y * 0.55,
      9.4
    );
    camera.position.lerp(camTarget, Math.min(1, dt * 2.2));
    target.set(0, 0, 0);
    camera.lookAt(target);

    renderer.render(scene, camera);
  };

  if (reduced) {
    // single static frame
    uniforms.uOpacity.value = 1;
    renderer.render(scene, camera);
  } else {
    renderer.setAnimationLoop(tick);
  }

  return {
    dispose() {
      renderer.setAnimationLoop(null);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("mousemove", onPointer as EventListener);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      geo.dispose();
      coreEdges.geometry.dispose();
      (coreEdges.material as THREE.Material).dispose();
      shellEdges.geometry.dispose();
      disposables.forEach((d) => d.dispose());
      (shellEdges.material as THREE.Material).dispose();
      (points.material as THREE.Material).dispose();
      renderer.dispose();
    },
  };
}
