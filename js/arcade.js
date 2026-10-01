const VW = 960;
const VH = 540;
const held = { left: false, right: false, up: false, down: false, jump: false };
let jumpEdge = false;

const KEYS = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
  a: "left",
  d: "right",
  w: "up",
  s: "down",
  " ": "jump"
};

function readBest(id) {
  try {
    const raw = localStorage.getItem("muyufar-best-" + id);
    return raw == null ? null : Number(raw);
  } catch {
    return null;
  }
}

function writeBest(id, value, better) {
  const prev = readBest(id);
  if (prev == null || better(value, prev)) {
    try { localStorage.setItem("muyufar-best-" + id, String(value)); } catch { /* private mode */ }
    return true;
  }
  return false;
}

function beginFrame(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pw = Math.max(1, rect.width);
  const ph = Math.max(1, rect.height);
  const bw = Math.floor(pw * dpr);
  const bh = Math.floor(ph * dpr);
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  const ctx = canvas.getContext("2d");
  const scale = Math.min(pw / VW, ph / VH);
  const ox = (pw - VW * scale) / 2;
  const oy = (ph - VH * scale) / 2;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#05040a";
  ctx.fillRect(0, 0, pw, ph);
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, ox * dpr, oy * dpr);
  return ctx;
}

function loopGame(update, draw) {
  let running = true;
  let raf = 0;
  let last = performance.now();
  const frame = (now) => {
    if (!running) return;
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (!document.hidden) {
      update(dt);
      draw();
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return {
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    }
  };
}

function mountTuyul(canvas, ui) {
  ui.innerHTML = `<p class="help">Spasi, panah atas, atau tombol Lompat. Arwah kecil memberi skor. Menabrak rintangan mengakhiri lari.</p><p class="status">Lari.</p><button type="button" data-restart>Main lagi</button>`;
  const status = ui.querySelector(".status");
  const ground = 456;
  let y = ground;
  let vy = 0;
  let scroll = 0;
  let speed = 340;
  let score = 0;
  let alive = true;
  let grace = 0.7;
  let spawn = 0.4;
  let blink = 0;
  let buffer = 0;
  const obstacles = [];
  const orbs = [];

  const reset = () => {
    y = ground;
    vy = 0;
    scroll = 0;
    speed = 340;
    score = 0;
    alive = true;
    grace = 0.7;
    spawn = 0.4;
    obstacles.length = 0;
    orbs.length = 0;
    status.textContent = "Lari.";
  };
  reset();

  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  const update = (dt) => {
    if (!alive) return;
    grace -= dt;
    blink += dt;
    if (jumpEdge) {
      buffer = 0.14;
      jumpEdge = false;
    }
    buffer -= dt;
    speed = Math.min(620, speed + dt * 8);
    scroll += speed * dt;
    score += speed * dt * 0.045;
    vy += 2100 * dt;
    y += vy * dt;
    if (y > ground) { y = ground; vy = 0; }
    if (buffer > 0 && y >= ground - 1) {
      vy = -780;
      buffer = 0;
    }

    spawn -= dt;
    if (spawn <= 0) {
      const flying = Math.random() < 0.34;
      obstacles.push({
        x: VW + 20,
        w: flying ? 54 : 36 + Math.random() * 18,
        h: flying ? 28 : 48 + Math.random() * 48,
        flying
      });
      if (Math.random() < 0.72) {
        orbs.push({ x: VW + 160, y: ground - (Math.random() < 0.5 ? 36 : 120), r: 10 });
      }
      spawn = Math.max(0.72, 1.45 - score / 1800);
    }

    const player = { x: 176, y: y - 46, w: 26, h: 40 };
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.x -= speed * dt;
      const box = o.flying
        ? { x: o.x + 6, y: ground - 128, w: o.w - 12, h: 22 }
        : { x: o.x + 8, y: ground - o.h, w: o.w - 14, h: o.h - 4 };
      if (grace <= 0 && hit(player, box)) {
        alive = false;
        const finalScore = Math.floor(score);
        const best = writeBest("tuyul", finalScore, (a, b) => a > b);
        status.textContent = `Tertangkap. Skor ${finalScore}.${best ? " Catatan baru." : ""}`;
      }
      if (o.x < -80) obstacles.splice(i, 1);
    }
    for (let i = orbs.length - 1; i >= 0; i--) {
      const o = orbs[i];
      o.x -= speed * dt;
      const box = { x: o.x - 8, y: o.y - 8, w: 16, h: 16 };
      if (hit(player, box)) {
        score += 40;
        orbs.splice(i, 1);
      } else if (o.x < -20) orbs.splice(i, 1);
    }
  };

  const draw = () => {
    const ctx = beginFrame(canvas);
    const sky = ctx.createLinearGradient(0, 0, 0, VH);
    sky.addColorStop(0, "#140818");
    sky.addColorStop(1, "#2a1024");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = "#f3e2b0";
    ctx.beginPath();
    ctx.arc(760, 90, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#140818";
    ctx.beginPath();
    ctx.arc(774, 84, 22, 0, Math.PI * 2);
    ctx.fill();

    const hill = (color, base, amp, factor) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, VH);
      for (let x = 0; x <= VW; x += 16) {
        const yy = base + Math.sin((x + scroll * factor) * 0.008) * amp;
        ctx.lineTo(x, yy);
      }
      ctx.lineTo(VW, VH);
      ctx.fill();
    };
    hill("#1a1028", 390, 28, 0.15);
    hill("#120816", 430, 18, 0.35);
    ctx.fillStyle = "#09060d";
    ctx.fillRect(0, ground, VW, VH - ground);
    ctx.fillStyle = "#e7c36a";
    ctx.fillRect(0, ground, VW, 3);

    for (const o of orbs) {
      ctx.fillStyle = "#8ef6ea";
      ctx.shadowColor = "#8ef6ea";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(o.x, o.y + Math.sin(scroll * 0.02 + o.x) * 4, o.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    for (const o of obstacles) {
      const top = o.flying ? ground - 128 : ground - o.h;
      const height = o.flying ? 22 : o.h;
      ctx.fillStyle = o.flying ? "#c9b8ff" : "#3a2444";
      ctx.fillRect(o.x, top, o.w, height);
      if (!o.flying) {
        ctx.fillStyle = "#ff4d6d";
        ctx.fillRect(o.x + o.w * 0.35, top + 10, 6, 6);
      }
    }

    const bob = Math.sin(scroll * 0.05) * 3;
    const px = 168;
    const py = y - 58 + bob;
    ctx.fillStyle = "#241433";
    ctx.beginPath();
    ctx.ellipse(px + 18, py + 34, 22, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff4d6d";
    ctx.fillRect(px + 4, py + 50, 10, 8);
    ctx.fillRect(px + 22, py + 50, 10, 8);
    const eyeOpen = Math.sin(blink * 3) > 0.92 ? 1 : 5;
    ctx.fillStyle = "#f7f3ea";
    ctx.fillRect(px + 8, py + 24, 6, eyeOpen);
    ctx.fillRect(px + 22, py + 24, 6, eyeOpen);

    ctx.fillStyle = "#f4efe8";
    ctx.font = "600 28px Syne, sans-serif";
    ctx.fillText(String(Math.floor(score)), 28, 48);
    if (!alive) {
      ctx.fillStyle = "rgba(0,0,0,.45)";
      ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = "#f4efe8";
      ctx.font = "700 54px Syne, sans-serif";
      ctx.fillText("Tertangkap", 28, 250);
    }
  };

  const handle = loopGame(update, draw);
  return { stop: handle.stop, reset };
}

function carveMaze(cols, rows) {
  const cells = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ n: true, e: true, s: true, w: true }))
  );
  const seen = Array.from({ length: rows }, () => Array(cols).fill(false));
  const stack = [[0, 0]];
  seen[0][0] = true;
  const dirs = [[0, -1, "n", "s"], [1, 0, "e", "w"], [0, 1, "s", "n"], [-1, 0, "w", "e"]];
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const options = dirs.filter(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      return nx >= 0 && ny >= 0 && nx < cols && ny < rows && !seen[ny][nx];
    });
    if (!options.length) {
      stack.pop();
      continue;
    }
    const [dx, dy, wall, opp] = options[Math.floor(Math.random() * options.length)];
    const nx = x + dx;
    const ny = y + dy;
    cells[y][x][wall] = false;
    cells[ny][nx][opp] = false;
    seen[ny][nx] = true;
    stack.push([nx, ny]);
  }
  return cells;
}

function mountMaze(canvas, ui) {
  ui.innerHTML = `<p class="help">Panah atau WASD. Kumpulkan dua H dan satu O, lalu masuk ke pintu kanan bawah.</p><p class="status">Labirin terbuka.</p><button type="button" data-restart>Labirin baru</button>`;
  const status = ui.querySelector(".status");
  const cols = 12;
  const rows = 8;
  let cells = [];
  let px = 0;
  let py = 0;
  let items = [];
  let time = 0;
  let won = false;
  let cooldown = 0;

  const placeItems = () => {
    const spots = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if ((x !== 0 || y !== 0) && (x !== cols - 1 || y !== rows - 1)) spots.push([x, y]);
      }
    }
    for (let i = spots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [spots[i], spots[j]] = [spots[j], spots[i]];
    }
    items = [
      { x: spots[0][0], y: spots[0][1], kind: "H", taken: false },
      { x: spots[1][0], y: spots[1][1], kind: "H", taken: false },
      { x: spots[2][0], y: spots[2][1], kind: "O", taken: false }
    ];
  };

  const reset = () => {
    cells = carveMaze(cols, rows);
    px = 0;
    py = 0;
    time = 0;
    won = false;
    cooldown = 0;
    placeItems();
    status.textContent = "Cari H, H, dan O.";
  };
  reset();

  const tryMove = (dx, dy) => {
    const cell = cells[py][px];
    if (dx === 1 && cell.e) return;
    if (dx === -1 && cell.w) return;
    if (dy === 1 && cell.s) return;
    if (dy === -1 && cell.n) return;
    const nx = px + dx;
    const ny = py + dy;
    if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return;
    px = nx;
    py = ny;
    for (const item of items) {
      if (!item.taken && item.x === px && item.y === py) item.taken = true;
    }
    const haveH = items.filter((item) => item.kind === "H" && item.taken).length;
    const haveO = items.filter((item) => item.kind === "O" && item.taken).length;
    if (px === cols - 1 && py === rows - 1) {
      if (haveH === 2 && haveO === 1) {
        won = true;
        const best = writeBest("maze", time, (a, b) => a < b);
        status.textContent = `H₂O terbentuk dalam ${time.toFixed(1)} dtk.${best ? " Catatan baru." : ""}`;
      } else {
        status.textContent = "Pintu masih tertutup. Unsur belum lengkap.";
      }
    }
  };

  const update = (dt) => {
    if (won) return;
    time += dt;
    cooldown -= dt;
    if (cooldown > 0) return;
    let dx = 0;
    let dy = 0;
    if (held.left) dx = -1;
    else if (held.right) dx = 1;
    else if (held.up) dy = -1;
    else if (held.down) dy = 1;
    if (dx || dy) {
      tryMove(dx, dy);
      cooldown = 0.13;
    }
  };

  const draw = () => {
    const ctx = beginFrame(canvas);
    ctx.fillStyle = "#071412";
    ctx.fillRect(0, 0, VW, VH);
    const cell = 52;
    const ox = (VW - cols * cell) / 2;
    const oy = 78;
    ctx.strokeStyle = "#9ff2d0";
    ctx.lineWidth = 3;
    ctx.shadowColor = "rgba(159,242,208,.45)";
    ctx.shadowBlur = 8;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const c = cells[y][x];
        const x0 = ox + x * cell;
        const y0 = oy + y * cell;
        ctx.beginPath();
        if (c.n) { ctx.moveTo(x0, y0); ctx.lineTo(x0 + cell, y0); }
        if (c.e) { ctx.moveTo(x0 + cell, y0); ctx.lineTo(x0 + cell, y0 + cell); }
        if (c.s) { ctx.moveTo(x0, y0 + cell); ctx.lineTo(x0 + cell, y0 + cell); }
        if (c.w) { ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + cell); }
        ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#e7c36a";
    ctx.fillRect(ox + (cols - 1) * cell + 14, oy + (rows - 1) * cell + 14, 24, 24);

    for (const item of items) {
      if (item.taken) continue;
      const cx = ox + item.x * cell + cell / 2;
      const cy = oy + item.y * cell + cell / 2;
      ctx.fillStyle = item.kind === "H" ? "#8ef6ea" : "#ffb15a";
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#071412";
      ctx.font = "700 14px Syne, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(item.kind, cx, cy + 5);
    }

    ctx.fillStyle = "#f4efe8";
    ctx.beginPath();
    ctx.arc(ox + px * cell + cell / 2, oy + py * cell + cell / 2, 9, 0, Math.PI * 2);
    ctx.fill();

    const haveH = items.filter((item) => item.kind === "H" && item.taken).length;
    const haveO = items.filter((item) => item.kind === "O" && item.taken).length;
    ctx.textAlign = "left";
    ctx.font = "600 26px Syne, sans-serif";
    ctx.fillStyle = "#f4efe8";
    ctx.fillText(`H ${haveH}/2    O ${haveO}/1    ${time.toFixed(1)} dtk`, 28, 42);
    if (won) {
      ctx.font = "700 48px Syne, sans-serif";
      ctx.fillText("H₂O terbentuk", 28, 250);
    }
  };

  const handle = loopGame(update, draw);
  return { stop: handle.stop, reset };
}

function mountOffroad(canvas, ui) {
  ui.innerHTML = `<p class="help">Panah kiri dan kanan, atau A dan D. Jangan sentuh batu. Jalan menarik mobil ke luar tikungan.</p><p class="status">Lampu menyala.</p><button type="button" data-restart>Main lagi</button>`;
  const status = ui.querySelector(".status");
  let distance = 0;
  let speed = 0;
  let lane = 0;
  let alive = true;
  let grace = 1;
  const rocks = [];
  let spawn = 1.2;

  const reset = () => {
    distance = 0;
    speed = 0;
    lane = 0;
    alive = true;
    grace = 1;
    spawn = 1.2;
    rocks.length = 0;
    status.textContent = "Jalan gelap. Tetap di jalur.";
  };
  reset();

  const curveAt = (z) => Math.sin(z * 0.035) * 0.85 + Math.sin(z * 0.012 + 1.7) * 0.45;

  const update = (dt) => {
    if (!alive) return;
    grace -= dt;
    const steer = (held.left ? -1 : 0) + (held.right ? 1 : 0);
    speed = Math.min(22, speed + dt * 6);
    distance += speed * dt * 1.6;
    lane += steer * dt * 1.35;
    lane -= curveAt(distance) * dt * speed * 0.02;
    lane = Math.max(-1.45, Math.min(1.45, lane));
    if (grace <= 0 && Math.abs(lane) > 1) alive = false;
    spawn -= dt;
    if (spawn <= 0) {
      rocks.push({ ahead: 13, lane: Math.random() * 1.3 - 0.65 });
      spawn = Math.max(0.55, 1.35 - distance * 0.001);
    }
    for (let i = rocks.length - 1; i >= 0; i--) {
      const rock = rocks[i];
      rock.ahead -= speed * dt * 0.55;
      if (grace <= 0 && rock.ahead < 0.7 && rock.ahead > 0.05 && Math.abs(rock.lane - lane) < 0.24) {
        alive = false;
      }
      if (rock.ahead < -0.4) rocks.splice(i, 1);
    }
    if (!alive) {
      const meters = Math.floor(distance);
      const best = writeBest("offroad", meters, (a, b) => a > b);
      status.textContent = `Keluar jalur pada ${meters} m.${best ? " Catatan baru." : ""}`;
    }
  };

  const horizon = 214;
  const yAt = (ahead) => {
    const persp = 1 / (ahead + 0.45);
    const near = 1 / 0.45;
    const far = 1 / 14.45;
    const t = (persp - far) / (near - far);
    return horizon + t * (VH - 8 - horizon);
  };
  const halfAt = (ahead) => {
    const persp = 1 / (ahead + 0.45);
    return persp * 150;
  };

  const roadPoint = (ahead, offset) => {
    let bend = 0;
    const steps = 28;
    for (let s = steps; s >= 1; s--) {
      const sample = ahead + s * 0.45;
      bend += curveAt(distance + sample) * 3.2;
    }
    return {
      x: VW / 2 + bend + offset * halfAt(ahead),
      y: yAt(ahead),
      half: halfAt(ahead)
    };
  };

  const draw = () => {
    const ctx = beginFrame(canvas);
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, "#070814");
    sky.addColorStop(1, "#2a1840");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VW, horizon);
    ctx.fillStyle = "#f0e2c0";
    ctx.beginPath();
    ctx.arc(760, 78, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#120e0b";
    ctx.fillRect(0, horizon, VW, VH - horizon);

    for (let i = 48; i >= 1; i--) {
      const far = i * 0.28;
      const near = (i - 1) * 0.28;
      const a = roadPoint(far, -lane);
      const b = roadPoint(near, -lane);
      const shoulder = i % 4 < 2 ? "#6a3a22" : "#4e2b18";
      const asphalt = i % 2 === 0 ? "#3a3228" : "#2a241c";
      ctx.fillStyle = shoulder;
      ctx.beginPath();
      ctx.moveTo(a.x - a.half * 1.18, a.y);
      ctx.lineTo(a.x + a.half * 1.18, a.y);
      ctx.lineTo(b.x + b.half * 1.18, b.y);
      ctx.lineTo(b.x - b.half * 1.18, b.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = asphalt;
      ctx.beginPath();
      ctx.moveTo(a.x - a.half, a.y);
      ctx.lineTo(a.x + a.half, a.y);
      ctx.lineTo(b.x + b.half, b.y);
      ctx.lineTo(b.x - b.half, b.y);
      ctx.closePath();
      ctx.fill();
      if (i % 5 === 0) {
        ctx.fillStyle = "rgba(231,195,106,.75)";
        ctx.fillRect(b.x - 2, b.y, 4, Math.max(2, a.y - b.y));
      }
    }

    for (const rock of rocks) {
      if (rock.ahead < 0.15 || rock.ahead > 13) continue;
      const point = roadPoint(rock.ahead, -lane + rock.lane);
      const size = Math.max(6, point.half * 0.18);
      ctx.fillStyle = "#0c0a08";
      ctx.beginPath();
      ctx.ellipse(point.x, point.y, size, size * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const light = ctx.createRadialGradient(VW / 2, VH * 0.92, 10, VW / 2, VH * 0.92, 280);
    light.addColorStop(0, "rgba(255, 220, 160, 0.28)");
    light.addColorStop(1, "rgba(255, 220, 160, 0)");
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.moveTo(VW / 2 - 26, VH * 0.9);
    ctx.lineTo(VW / 2 + 26, VH * 0.9);
    ctx.lineTo(VW / 2 + 180, horizon + 20);
    ctx.lineTo(VW / 2 - 180, horizon + 20);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#1a120c";
    ctx.fillRect(VW / 2 - 28, VH * 0.78, 56, 34);
    ctx.fillStyle = "#c4552a";
    ctx.fillRect(VW / 2 - 30, VH * 0.8, 8, 6);
    ctx.fillRect(VW / 2 + 22, VH * 0.8, 8, 6);
    ctx.fillStyle = "#8ef6ea";
    ctx.fillRect(VW / 2 - 16, VH * 0.8, 12, 8);
    ctx.fillRect(VW / 2 + 4, VH * 0.8, 12, 8);

    ctx.fillStyle = "#f4efe8";
    ctx.font = "600 28px Syne, sans-serif";
    ctx.fillText(`${Math.floor(distance)} m`, 28, 46);
    if (!alive) {
      ctx.fillStyle = "rgba(0,0,0,.45)";
      ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = "#f4efe8";
      ctx.font = "700 52px Syne, sans-serif";
      ctx.fillText("Keluar jalur", 28, 250);
    }
  };

  const handle = loopGame(update, draw);
  return { stop: handle.stop, reset };
}

const GAMES = {
  tuyul: { title: "Lari Tuyul", mount: mountTuyul },
  maze: { title: "Labirin H₂O", mount: mountMaze },
  offroad: { title: "Jalur Gelap", mount: mountOffroad }
};

function releaseAll() {
  held.left = false;
  held.right = false;
  held.up = false;
  held.down = false;
  held.jump = false;
  jumpEdge = false;
}

export function formatBest(id) {
  const value = readBest(id);
  if (value == null || Number.isNaN(value)) return "Belum ada catatan";
  if (id === "maze") return `Waktu terbaik ${value.toFixed(1)} dtk`;
  if (id === "offroad") return `Jarak terbaik ${Math.floor(value)} m`;
  return `Skor terbaik ${Math.floor(value)}`;
}

export function initArcade() {
  const dialog = document.getElementById("stage");
  const canvas = document.getElementById("stage-canvas");
  const ui = document.getElementById("stage-ui");
  const title = document.getElementById("stage-title");
  let current = null;
  let currentId = "";

  const refresh = () => {
    document.querySelectorAll("[data-best]").forEach((node) => {
      node.textContent = formatBest(node.dataset.best);
    });
  };

  const start = (id) => {
    current?.stop();
    currentId = id;
    title.textContent = GAMES[id].title;
    dialog.dataset.game = id;
    releaseAll();
    current = GAMES[id].mount(canvas, ui);
  };

  document.getElementById("stage-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    current?.stop();
    current = null;
    releaseAll();
    refresh();
  });
  ui.addEventListener("click", (event) => {
    if (event.target.closest("[data-restart]") && currentId) start(currentId);
  });

  dialog.querySelectorAll("[data-hold]").forEach((button) => {
    const name = button.dataset.hold;
    const down = (event) => {
      event.preventDefault();
      try { button.setPointerCapture?.(event.pointerId); } catch { /* synthetic clicks */ }
      if (name === "jump") {
        if (!held.jump) jumpEdge = true;
        held.jump = true;
      } else held[name] = true;
    };
    const up = () => {
      held[name] = false;
    };
    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointercancel", up);
  });

  window.addEventListener("keydown", (event) => {
    if (!dialog.open) return;
    const name = KEYS[event.key];
    if (!name) return;
    if (event.key === " " && document.activeElement?.tagName === "BUTTON") return;
    event.preventDefault();
    if (event.repeat && name !== "jump") {
      held[name] = true;
      return;
    }
    if (event.repeat) return;
    if (name === "jump" || name === "up") {
      if (dialog.dataset.game === "tuyul") {
        if (!held.jump) jumpEdge = true;
        held.jump = true;
        return;
      }
    }
    held[name] = true;
  });
  window.addEventListener("keyup", (event) => {
    const name = KEYS[event.key];
    if (!name) return;
    if ((name === "jump" || name === "up") && dialog.dataset.game === "tuyul") held.jump = false;
    else held[name] = false;
  });

  canvas.addEventListener("pointerdown", () => {
    if (dialog.dataset.game !== "tuyul") return;
    if (!held.jump) jumpEdge = true;
    held.jump = true;
  });
  window.addEventListener("pointerup", () => {
    if (dialog.dataset.game === "tuyul") held.jump = false;
  });

  refresh();
  return {
    refresh,
    open(id) {
      if (!GAMES[id]) return;
      if (!dialog.open) dialog.showModal();
      start(id);
    },
    close() {
      if (dialog.open) dialog.close();
    }
  };
}
