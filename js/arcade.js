const VW = 960;
const VH = 540;
const held = { left: false, right: false, up: false, down: false, jump: false };

/* Tekanan pertama sebuah tombol, dipisahkan dari status ditahan: permainan tap
   perlu tahu kapan tombolnya baru ditekan, bukan sedang ditahan. */
const edges = { jump: false, up: false };

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

function takeEdge(name) {
  if (!edges[name]) return false;
  edges[name] = false;
  return true;
}

/* Permainan tap menerima spasi, panah atas, sentuhan kanvas, dan tombol Lompat
   sebagai satu isyarat yang sama. */
function takeTap() {
  const tapped = edges.jump || edges.up;
  edges.jump = false;
  edges.up = false;
  return tapped;
}

function readBest(id) {
  try {
    const raw = localStorage.getItem("muyufar-best-" + id);
    return raw == null ? null : Number(raw);
  } catch {
    return null;
  }
}

function saveBest(id, value) {
  const lower = GAMES[id]?.lower;
  const prev = readBest(id);
  if (prev != null && !(lower ? value < prev : value > prev)) return false;
  try { localStorage.setItem("muyufar-best-" + id, String(value)); } catch { /* mode privat */ }
  return true;
}

function beginFrame(canvas, letterbox = "#05040a") {
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
  ctx.fillStyle = letterbox;
  ctx.fillRect(0, 0, pw, ph);
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, ox * dpr, oy * dpr);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  return ctx;
}

function loopGame(update, draw) {
  let running = true;
  let raf = 0;
  let last = performance.now();
  const frame = (now) => {
    if (!running) return;
    /* Batas bawah nol bukan kehati-hatian kosong: stempel waktu frame pertama
       bisa mendahului performance.now() saat loop ini dibuat, dan dt negatif
       membuat posisi berjalan mundur ke angka negatif. */
    const dt = Math.max(0, Math.min(0.033, (now - last) / 1000));
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

function shell(ui, help, restart) {
  ui.innerHTML = `<p class="help"></p><p class="status"></p><button type="button" data-restart></button>`;
  ui.querySelector(".help").textContent = help;
  ui.querySelector("[data-restart]").textContent = restart;
  return ui.querySelector(".status");
}

function hit(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function panel(ctx, text, sub) {
  ctx.fillStyle = "rgba(4,3,8,.62)";
  ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = "#f4efe8";
  ctx.font = "700 54px Syne, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, VW / 2, VH / 2 - 6);
  if (sub) {
    ctx.font = "500 22px 'Public Sans', sans-serif";
    ctx.fillStyle = "rgba(244,239,232,.78)";
    ctx.fillText(sub, VW / 2, VH / 2 + 34);
  }
  ctx.textAlign = "left";
}

/* ------------------------------------------------------------------ *
 * 1. Monusa AR — pindai penanda, monumen berdiri di atasnya
 * ------------------------------------------------------------------ */

const MONUMEN = [
  {
    kota: "JAKARTA",
    nama: "Monumen Nasional",
    fakta: "Tingginya 132 meter. Lidah api di puncaknya berlapis emas."
  },
  {
    kota: "YOGYAKARTA",
    nama: "Tugu Pal Putih",
    fakta: "Berdiri di satu garis lurus antara Merapi, Keraton, dan Laut Selatan."
  },
  {
    kota: "SURABAYA",
    nama: "Suro dan Boyo",
    fakta: "Hiu suro dan buaya boyo, dua nama yang menjadi nama kotanya."
  }
];

function drawPenanda(ctx, x, y, w, h, kota, index) {
  ctx.fillStyle = "#3b3570";
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = "#0f9391";
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h * 0.42, w * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0d6f72";
  ctx.beginPath();
  ctx.ellipse(x + w * 0.42, y + h * 0.62, w * 0.24, h * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d8ebe8";
  const lamb = [[0.5, 0.2], [0.5, 0.26], [0.34, 0.18]][index];
  ctx.fillRect(x + w * lamb[0] - 3, y + h * lamb[1], 6, h * 0.3);
  ctx.restore();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + 8, y + h - 26, w - 16, 20);
  ctx.fillStyle = "#3b3570";
  ctx.font = "700 13px Syne, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(kota, x + w / 2, y + h - 11);
  ctx.textAlign = "left";
}

function drawMonumen(ctx, index, cx, baseY, s) {
  ctx.save();
  ctx.translate(cx, baseY);
  if (index === 0) {
    ctx.fillStyle = "#cfc6b6";
    ctx.beginPath();
    ctx.moveTo(-46 * s, 0);
    ctx.lineTo(46 * s, 0);
    ctx.lineTo(34 * s, -16 * s);
    ctx.lineTo(-34 * s, -16 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-7 * s, -112 * s, 14 * s, 96 * s);
    ctx.fillStyle = "#e7c36a";
    ctx.beginPath();
    ctx.moveTo(0, -140 * s);
    ctx.lineTo(10 * s, -112 * s);
    ctx.lineTo(-10 * s, -112 * s);
    ctx.closePath();
    ctx.fill();
  } else if (index === 1) {
    ctx.fillStyle = "#e4ded2";
    for (let i = 0; i < 3; i++) {
      const w = (40 - i * 9) * s;
      ctx.fillRect(-w, -10 * s * (i + 1), w * 2, 10 * s);
    }
    ctx.fillRect(-13 * s, -74 * s, 26 * s, 44 * s);
    ctx.fillRect(-18 * s, -84 * s, 36 * s, 12 * s);
    ctx.beginPath();
    ctx.moveTo(0, -132 * s);
    ctx.lineTo(9 * s, -84 * s);
    ctx.lineTo(-9 * s, -84 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#e7c36a";
    ctx.beginPath();
    ctx.arc(0, -92 * s, 6 * s, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#b9a7a7";
    ctx.beginPath();
    ctx.moveTo(-10 * s, 0);
    ctx.quadraticCurveTo(-34 * s, -54 * s, -2 * s, -96 * s);
    ctx.quadraticCurveTo(14 * s, -66 * s, 16 * s, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#eceef0";
    ctx.beginPath();
    ctx.moveTo(26 * s, -16 * s);
    ctx.quadraticCurveTo(-6 * s, -48 * s, -14 * s, -112 * s);
    ctx.quadraticCurveTo(22 * s, -92 * s, 40 * s, -34 * s);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-14 * s, -112 * s);
    ctx.lineTo(10 * s, -132 * s);
    ctx.lineTo(6 * s, -104 * s);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function mountMonusa(canvas, ui) {
  const status = shell(ui, "Panah atau WASD menggeser bingkai pindai. Tahan bingkai di atas penanda sampai penuh.", "Pindai lagi");
  /* Kotak ini sekaligus area pindai dan bentuk yang digambar — keduanya harus
     sama persis, kalau tidak bingkai terasa meleset dari penandanya. */
  const kartu = [
    { x: 122, y: 298, w: 148, h: 148 },
    { x: 406, y: 298, w: 148, h: 148 },
    { x: 690, y: 298, w: 148, h: 148 }
  ];
  let rx = 0;
  let ry = 0;
  let waktu = 0;
  let selesai = false;
  let pesan = 0;
  let pesanIdx = 0;

  const reset = () => {
    rx = VW / 2;
    ry = 372;
    waktu = 0;
    selesai = false;
    pesan = 0;
    kartu.forEach((k) => { k.maju = 0; k.kunci = false; });
    status.textContent = "Tiga penanda menunggu.";
  };
  reset();

  const update = (dt) => {
    if (selesai) return;
    waktu += dt;
    pesan -= dt;
    const dx = (held.right ? 1 : 0) - (held.left ? 1 : 0);
    const dy = (held.down ? 1 : 0) - (held.up ? 1 : 0);
    rx = Math.max(90, Math.min(VW - 90, rx + dx * 360 * dt));
    ry = Math.max(230, Math.min(VH - 54, ry + dy * 360 * dt));

    kartu.forEach((k, i) => {
      const di = rx > k.x && rx < k.x + k.w && ry > k.y && ry < k.y + k.h;
      if (k.kunci) return;
      k.maju = Math.max(0, Math.min(1, k.maju + (di ? dt * 0.8 : -dt * 0.5)));
      if (k.maju >= 1) {
        k.kunci = true;
        pesan = 3.4;
        pesanIdx = i;
      }
    });

    if (kartu.every((k) => k.kunci)) {
      selesai = true;
      const t = Number(waktu.toFixed(1));
      const baru = saveBest("monusa", t);
      status.textContent = `Tiga monumen dikenali dalam ${t} dtk.${baru ? " Catatan baru." : ""}`;
    }
  };

  const draw = () => {
    const ctx = beginFrame(canvas);
    ctx.fillStyle = "#2b2b31";
    ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = "#3a3a42";
    ctx.fillRect(0, 272, VW, VH - 272);
    ctx.fillStyle = "rgba(255,255,255,.03)";
    for (let y = 0; y < VH; y += 4) ctx.fillRect(0, y, VW, 1);

    kartu.forEach((k, i) => {
      const cx = k.x + k.w / 2;
      ctx.fillStyle = "rgba(0,0,0,.35)";
      ctx.fillRect(k.x + 5, k.y + 7, k.w, k.h);
      drawPenanda(ctx, k.x, k.y, k.w, k.h, MONUMEN[i].kota, i);

      if (k.kunci) {
        const bob = Math.sin(waktu * 2 + i) * 5;
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = "#8ef6ea";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx, k.y + 14, 54, 14, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        drawMonumen(ctx, i, cx, k.y + 16 + bob, 1.05);
        ctx.fillStyle = "#8ef6ea";
        ctx.font = "600 14px 'Public Sans', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(MONUMEN[i].nama, cx, k.y + k.h + 26);
        ctx.textAlign = "left";
      } else if (k.maju > 0) {
        ctx.strokeStyle = "#8ef6ea";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(cx, k.y + k.h / 2, 60, -Math.PI / 2, -Math.PI / 2 + k.maju * Math.PI * 2);
        ctx.stroke();
      }
    });

    const r = 66;
    ctx.strokeStyle = "#f4efe8";
    ctx.lineWidth = 3;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      ctx.beginPath();
      ctx.moveTo(rx + sx * r, ry + sy * r - sy * 22);
      ctx.lineTo(rx + sx * r, ry + sy * r);
      ctx.lineTo(rx + sx * r - sx * 22, ry + sy * r);
      ctx.stroke();
    }

    ctx.fillStyle = "#f4efe8";
    ctx.font = "600 22px Syne, sans-serif";
    ctx.fillText(`${kartu.filter((k) => k.kunci).length}/3 penanda`, 28, 44);
    ctx.font = "500 16px 'Public Sans', sans-serif";
    ctx.fillStyle = "rgba(244,239,232,.6)";
    ctx.fillText(`${waktu.toFixed(1)} dtk`, 28, 68);

    if (pesan > 0 && !selesai) {
      ctx.fillStyle = "rgba(10,10,14,.82)";
      ctx.fillRect(60, 86, VW - 120, 56);
      ctx.fillStyle = "#f4efe8";
      ctx.font = "500 18px 'Public Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(MONUMEN[pesanIdx].fakta, VW / 2, 120);
      ctx.textAlign = "left";
    }
    if (selesai) panel(ctx, "Semua dikenali", `${waktu.toFixed(1)} detik`);
  };

  const handle = loopGame(update, draw);
  return { stop: handle.stop, reset };
}

/* ------------------------------------------------------------------ *
 * 2. Sipesia 3D — menembak kuman sambil menyusuri saluran cerna
 * ------------------------------------------------------------------ */

const ORGAN = [
  {
    nama: "Rongga mulut",
    langit: ["#3a1118", "#71222c"],
    fakta: "Setelah melalui rongga mulut, makanan berbentuk bolus masuk ke dalam tekak (faring)."
  },
  {
    nama: "Gigi",
    langit: ["#2a1a06", "#7d5a12"],
    fakta: "Karies gigi, salah satu penyakit gigi yang disebabkan oleh bakteri."
  },
  {
    nama: "Lambung",
    langit: ["#0f2a12", "#357a25"],
    fakta: "Cairan hijau ini ialah asam klorida (HCl) yang membuat ruang lambung bersifat asam, pH 1–3."
  }
];

function mountSipesia(canvas, ui) {
  const status = shell(ui, "Panah atas dan bawah menggeser pemain. Spasi atau tombol Lompat menembak. Bersihkan tujuh kuman tiap organ.", "Mulai lagi");
  const peluru = [];
  const kuman = [];
  let py = VH / 2;
  let organ = 0;
  let bersih = 0;
  let nyawa = 3;
  let total = 0;
  let spawn = 1;
  let waktu = 0;
  let fakta = 0;
  let habis = false;

  const reset = () => {
    peluru.length = 0;
    kuman.length = 0;
    py = VH / 2;
    organ = 0;
    bersih = 0;
    nyawa = 3;
    total = 0;
    spawn = 0.9;
    waktu = 0;
    fakta = 0;
    habis = false;
    status.textContent = "Masuk ke rongga mulut.";
  };
  reset();

  const update = (dt) => {
    if (habis) return;
    waktu += dt;
    fakta -= dt;
    if (held.up) py -= 300 * dt;
    if (held.down) py += 300 * dt;
    py = Math.max(140, Math.min(VH - 60, py));

    if (takeTap()) peluru.push({ x: 196, y: py - 30 });

    spawn -= dt;
    if (spawn <= 0) {
      kuman.push({
        x: VW + 30,
        y: 160 + Math.random() * (VH - 220),
        f: Math.random() * 6,
        v: 90 + organ * 26 + Math.random() * 50
      });
      spawn = Math.max(0.55, 1.3 - total * 0.02);
    }

    for (let i = peluru.length - 1; i >= 0; i--) {
      peluru[i].x += 720 * dt;
      if (peluru[i].x > VW + 20) peluru.splice(i, 1);
    }

    for (let i = kuman.length - 1; i >= 0; i--) {
      const k = kuman[i];
      k.x -= k.v * dt;
      k.f += dt * 3;
      const box = { x: k.x - 18, y: k.y - 18 + Math.sin(k.f) * 10, w: 36, h: 36 };
      let kena = false;
      for (let j = peluru.length - 1; j >= 0; j--) {
        if (hit({ x: peluru[j].x, y: peluru[j].y - 3, w: 16, h: 6 }, box)) {
          peluru.splice(j, 1);
          kena = true;
          break;
        }
      }
      if (kena) {
        kuman.splice(i, 1);
        total += 1;
        bersih += 1;
        if (bersih >= 7) {
          bersih = 0;
          if (organ < ORGAN.length - 1) {
            organ += 1;
            fakta = 4;
            status.textContent = `Lanjut ke ${ORGAN[organ].nama.toLowerCase()}.`;
          } else {
            habis = true;
            const baru = saveBest("sipesia", total);
            status.textContent = `Saluran cerna bersih. ${total} kuman.${baru ? " Catatan baru." : ""}`;
          }
        }
        continue;
      }
      if (k.x < 180 && Math.abs(k.y - py + 24) < 48) {
        kuman.splice(i, 1);
        nyawa -= 1;
        if (nyawa <= 0) {
          habis = true;
          const baru = saveBest("sipesia", total);
          status.textContent = `Terinfeksi. ${total} kuman.${baru ? " Catatan baru." : ""}`;
        }
        continue;
      }
      if (k.x < -40) kuman.splice(i, 1);
    }
  };

  const draw = () => {
    const ctx = beginFrame(canvas);
    const o = ORGAN[organ];
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, o.langit[0]);
    g.addColorStop(1, o.langit[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);

    ctx.fillStyle = "rgba(0,0,0,.22)";
    for (let i = 0; i < 5; i++) {
      const x = ((i * 240 - waktu * 40) % (VW + 300)) - 150;
      ctx.beginPath();
      ctx.ellipse(x, VH, 170, 90, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + 120, 92, 150, 72, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const k of kuman) {
      const y = k.y + Math.sin(k.f) * 10;
      ctx.fillStyle = "#b7e24a";
      ctx.beginPath();
      ctx.ellipse(k.x, y, 18, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#b7e24a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(k.x - 6, y - 14);
      ctx.lineTo(k.x - 10, y - 26);
      ctx.moveTo(k.x + 6, y - 14);
      ctx.lineTo(k.x + 11, y - 26);
      ctx.stroke();
      ctx.fillStyle = "#1d3208";
      ctx.fillRect(k.x - 7, y - 3, 4, 5);
      ctx.fillRect(k.x + 3, y - 3, 4, 5);
    }

    ctx.fillStyle = "#8ef6ea";
    for (const p of peluru) ctx.fillRect(p.x, p.y - 3, 16, 6);

    ctx.fillStyle = "#1d2338";
    ctx.fillRect(152, py - 26, 26, 52);
    ctx.fillStyle = "#dfe3ea";
    ctx.fillRect(150, py - 28, 30, 30);
    ctx.fillStyle = "#15131a";
    ctx.beginPath();
    ctx.arc(165, py - 46, 20, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f0cfae";
    ctx.beginPath();
    ctx.arc(165, py - 42, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#15131a";
    ctx.fillRect(159, py - 46, 4, 5);
    ctx.fillRect(170, py - 46, 4, 5);
    ctx.fillStyle = "#cfd8dd";
    ctx.fillRect(176, py - 34, 26, 10);
    ctx.fillStyle = "#1f7e84";
    ctx.fillRect(192, py - 36, 10, 14);

    ctx.fillStyle = "#f4efe8";
    ctx.font = "600 22px Syne, sans-serif";
    ctx.fillText(o.nama, 28, 44);
    ctx.font = "500 16px 'Public Sans', sans-serif";
    ctx.fillStyle = "rgba(244,239,232,.72)";
    ctx.fillText(`Kuman ${total}   ·   Organ ${organ + 1}/3`, 28, 68);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < nyawa ? "#ff4d6d" : "rgba(255,255,255,.18)";
      ctx.fillRect(VW - 40 - i * 26, 30, 18, 18);
    }

    if (fakta > 0 && !habis) {
      ctx.fillStyle = "rgba(6,8,6,.8)";
      ctx.fillRect(70, 92, VW - 140, 54);
      ctx.fillStyle = "#f4efe8";
      ctx.font = "500 17px 'Public Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(ORGAN[organ - 1 < 0 ? 0 : organ - 1].fakta, VW / 2, 124);
      ctx.textAlign = "left";
    }
    if (habis) panel(ctx, nyawa > 0 ? "Bersih" : "Terinfeksi", `${total} kuman ditembak`);
  };

  const handle = loopGame(update, draw);
  return { stop: handle.stop, reset };
}

/* ------------------------------------------------------------------ *
 * 3. Rocket Captain Jarwo — jet pack, satu tombol
 * ------------------------------------------------------------------ */

function mountJarwo(canvas, ui) {
  const status = shell(ui, "Spasi, panah atas, sentuh layar, atau tombol Lompat untuk menyalakan jet pack. Hindari roket.", "Terbang lagi");
  const roket = [];
  let y = 220;
  let vy = 0;
  let meter = 0;
  let spawn = 1;
  let api = 0;
  let hidup = true;
  let mulai = false;
  const air = 470;

  const reset = () => {
    roket.length = 0;
    y = 220;
    vy = 0;
    meter = 0;
    spawn = 1.1;
    api = 0;
    hidup = true;
    mulai = false;
    status.textContent = "Tap untuk lepas landas.";
  };
  reset();

  const selesai = (sebab) => {
    hidup = false;
    const m = Math.floor(meter);
    const baru = saveBest("jarwo", m);
    status.textContent = `${sebab} pada ${m} M.${baru ? " Catatan baru." : ""}`;
  };

  const update = (dt) => {
    if (!hidup) return;
    // Jarwo menggantung di tempat sampai tap pertama menyalakan jet pack-nya.
    if (!mulai) {
      if (!(takeTap() || held.jump)) return;
      mulai = true;
      vy = -340;
      api = 0.16;
      status.textContent = "Jarwo lepas landas.";
    }
    meter += dt * 9;
    api = Math.max(0, api - dt);
    /* Satu tap adalah satu semburan utuh, bukan dorongan sekejap sebesar dt —
       kalau di-skala waktu frame, tapnya nyaris tidak mengangkat apa pun.
       Menahan tombol tetap menambah daya dorong, karena ini jet pack. */
    if (takeTap()) {
      vy = -340;
      api = 0.16;
    } else if (held.jump) {
      vy -= 1500 * dt;
      api = 0.14;
    }
    vy += 900 * dt;
    vy = Math.max(-420, Math.min(620, vy));
    y += vy * dt;
    if (y < 40) { y = 40; vy = 0; }
    if (y > air - 18) { y = air - 18; selesai("Jatuh ke air"); }

    spawn -= dt;
    if (spawn <= 0) {
      roket.push({ x: VW + 40, y: 70 + Math.random() * (air - 140), v: 230 + Math.random() * 180 });
      spawn = Math.max(0.5, 1.25 - meter * 0.004);
    }
    for (let i = roket.length - 1; i >= 0; i--) {
      const r = roket[i];
      r.x -= r.v * dt;
      if (hit({ x: 196, y: y - 16, w: 30, h: 32 }, { x: r.x, y: r.y - 8, w: 46, h: 16 })) selesai("Tertabrak roket");
      if (r.x < -70) roket.splice(i, 1);
    }
  };

  const draw = () => {
    const ctx = beginFrame(canvas, "#2aa7ae");
    ctx.fillStyle = "#3fb9bd";
    ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = "#f2f6f5";
    for (let i = 0; i < 4; i++) {
      const x = ((i * 310 - meter * 6) % (VW + 260)) - 130;
      ctx.beginPath();
      ctx.ellipse(x, 60 + i * 17, 46, 17, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 38, 60 + i * 17, 32, 13, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const bukit = (warna, base, amp, faktor) => {
      ctx.fillStyle = warna;
      ctx.beginPath();
      ctx.moveTo(0, VH);
      for (let x = 0; x <= VW; x += 20) {
        ctx.lineTo(x, base + Math.sin((x + meter * faktor * 30) * 0.009) * amp);
      }
      ctx.lineTo(VW, VH);
      ctx.fill();
    };
    bukit("#8bc34a", 392, 30, 0.4);
    bukit("#5ba03a", 428, 22, 0.8);
    ctx.fillStyle = "#2a8fae";
    ctx.fillRect(0, air, VW, VH - air);

    for (const r of roket) {
      ctx.fillStyle = "#f4f4f4";
      ctx.fillRect(r.x + 8, r.y - 7, 30, 14);
      ctx.fillStyle = "#e5564f";
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x + 10, r.y - 7);
      ctx.lineTo(r.x + 10, r.y + 7);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(r.x + 36, r.y - 11, 8, 8);
      ctx.fillRect(r.x + 36, r.y + 3, 8, 8);
    }

    const bx = 196;
    if (api > 0) {
      ctx.fillStyle = "#ffb15a";
      ctx.beginPath();
      ctx.moveTo(bx + 4, y + 16);
      ctx.lineTo(bx + 16, y + 16);
      ctx.lineTo(bx + 10, y + 34 + Math.random() * 8);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "#7a2f2f";
    ctx.fillRect(bx - 2, y - 10, 12, 26);
    ctx.fillStyle = "#2b2b33";
    ctx.fillRect(bx + 8, y - 12, 18, 28);
    ctx.fillStyle = "#e8b48c";
    ctx.beginPath();
    ctx.arc(bx + 22, y - 18, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1d1a16";
    ctx.beginPath();
    ctx.arc(bx + 20, y - 23, 10, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#6f7d84";
    ctx.fillRect(VW - 180, 34, 64, 34);
    ctx.fillStyle = "#1c232a";
    ctx.font = "700 22px Syne, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.floor(meter)} M`, VW - 148, 58);
    ctx.textAlign = "left";
    if (!hidup) panel(ctx, "Jatuh", `${Math.floor(meter)} meter`);
  };

  const handle = loopGame(update, draw);
  return { stop: handle.stop, reset };
}

/* ------------------------------------------------------------------ *
 * 4. Dark Offroad — siluet 2D, makin jauh makin banyak poinnya
 * ------------------------------------------------------------------ */

const PITA = [
  { langit: "#6a3597", jauh: "#4a2170", dekat: "#30124d" },
  { langit: "#19b79a", jauh: "#0e8c77", dekat: "#076152" },
  { langit: "#4f7fd4", jauh: "#3a5fa8", dekat: "#27417a" },
  { langit: "#c2494f", jauh: "#99353d", dekat: "#6d222a" }
];

function mountOffroad(canvas, ui) {
  const status = shell(ui, "Panah kanan menambah gas, panah kiri mengerem. Di udara, kiri dan kanan memutar badan. Mendarat miring berarti terguling.", "Main lagi");
  const tanah = (x) =>
    372 + Math.sin(x * 0.0062) * 54 + Math.sin(x * 0.0139 + 1.3) * 30 + Math.sin(x * 0.0031 + 2.6) * 20;
  const koin = [];
  let x = 0;
  let y = 0;
  let vy = 0;
  let laju = 0;
  let sudut = 0;
  let udara = false;
  let skor = 0;
  let hidup = true;
  let berikut = 0;

  const reset = () => {
    koin.length = 0;
    x = 0;
    y = tanah(0);
    vy = 0;
    laju = 0;
    sudut = 0;
    udara = false;
    skor = 0;
    hidup = true;
    berikut = 400;
    status.textContent = "Lampu menyala. Gas pelan-pelan.";
  };
  reset();

  const kemiringan = (px) => Math.atan2(tanah(px + 12) - tanah(px - 12), 24);

  const update = (dt) => {
    if (!hidup) return;
    const gas = (held.right ? 1 : 0) - (held.left ? 1 : 0);
    const naik = Math.sin(kemiringan(x));
    laju += (gas * 230 - naik * 320 - laju * 0.5) * dt;
    laju = Math.max(0, Math.min(430, laju));
    x += laju * dt;
    skor = Math.max(skor, Math.floor(x / 10));

    const dasar = tanah(x);
    if (udara) {
      vy += 1500 * dt;
      y += vy * dt;
      sudut += ((held.left ? -1 : 0) + (held.right ? 1 : 0)) * 2.4 * dt;
      if (y >= dasar) {
        const miring = kemiringan(x);
        if (Math.abs(sudut - miring) > 1.05) {
          hidup = false;
          const baru = saveBest("offroad", skor);
          status.textContent = `Terguling pada ${skor} m.${baru ? " Catatan baru." : ""}`;
        }
        y = dasar;
        vy = 0;
        udara = false;
        sudut = miring;
      }
    } else {
      y = dasar;
      sudut = kemiringan(x);
      const depan = tanah(x + laju * 0.05);
      if (depan - dasar > 7 && laju > 180) {
        udara = true;
        vy = -laju * 0.42;
      }
    }

    while (berikut < x + 1400) {
      koin.push({ x: berikut, y: tanah(berikut) - 56 });
      berikut += 210 + Math.random() * 180;
    }
    for (let i = koin.length - 1; i >= 0; i--) {
      if (Math.abs(koin[i].x - x) < 26 && Math.abs(koin[i].y - y) < 72) {
        skor += 10;
        koin.splice(i, 1);
      } else if (koin[i].x < x - 300) koin.splice(i, 1);
    }
  };

  const draw = () => {
    const ctx = beginFrame(canvas, "#000");
    const pita = PITA[Math.floor(x / 2600) % PITA.length];
    const cam = x - 300;
    ctx.fillStyle = pita.langit;
    ctx.fillRect(0, 0, VW, VH);

    ctx.fillStyle = pita.jauh;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let i = 0; i <= 16; i++) {
      ctx.lineTo(i * 60, i % 2 ? 54 + ((i * 37) % 40) : 16);
    }
    ctx.lineTo(VW, 0);
    ctx.fill();

    // Siluet monumen: kaki lebar, batang menjulang, puncak runcing.
    const menara = (mx, tinggi, lebar) => {
      ctx.fillRect(mx - lebar, 400 - tinggi * 0.16, lebar * 2, tinggi * 0.16 + 40);
      ctx.beginPath();
      ctx.moveTo(mx - lebar * 0.46, 400 - tinggi * 0.16);
      ctx.lineTo(mx - lebar * 0.2, 400 - tinggi * 0.78);
      ctx.lineTo(mx, 400 - tinggi);
      ctx.lineTo(mx + lebar * 0.2, 400 - tinggi * 0.78);
      ctx.lineTo(mx + lebar * 0.46, 400 - tinggi * 0.16);
      ctx.closePath();
      ctx.fill();
    };
    ctx.fillStyle = pita.dekat;
    for (let i = 0; i < 7; i++) {
      const mx = ((i * 230 - cam * 0.28) % (VW + 460)) - 230;
      menara(mx, 120 + ((i * 53) % 110), 26 + ((i * 17) % 22));
    }

    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.moveTo(0, VH);
    for (let sx = 0; sx <= VW; sx += 8) ctx.lineTo(sx, tanah(cam + sx));
    ctx.lineTo(VW, VH);
    ctx.fill();

    for (const k of koin) {
      const kx = k.x - cam;
      if (kx < -30 || kx > VW + 30) continue;
      ctx.fillStyle = "#e7c36a";
      ctx.beginPath();
      ctx.ellipse(kx, k.y, 11, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#b68f2c";
      ctx.beginPath();
      ctx.ellipse(kx, k.y, 5, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(x - cam, y);
    ctx.rotate(sudut);
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.moveTo(-44, -18);
    ctx.lineTo(-20, -40);
    ctx.lineTo(18, -40);
    ctx.lineTo(44, -18);
    ctx.lineTo(44, -6);
    ctx.lineTo(-44, -6);
    ctx.closePath();
    ctx.fill();
    for (const wx of [-26, 26]) {
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(wx, 0, 19, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pita.langit;
      ctx.beginPath();
      ctx.arc(wx, 0, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.fillStyle = "#46c7d6";
    ctx.fillRect(22, 24, 84, 36);
    ctx.fillStyle = "#06222a";
    ctx.font = "700 22px Syne, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(skor), 64, 50);
    ctx.textAlign = "left";
    if (!hidup) panel(ctx, "Terguling", `${skor} poin`);
  };

  const handle = loopGame(update, draw);
  return { stop: handle.stop, reset };
}

/* ------------------------------------------------------------------ *
 * 5. Labirin Kimia — kumpulkan unsur, pintunya dijaga satu soal
 * ------------------------------------------------------------------ */

const UNSUR = ["Be", "C", "Mg", "Mn", "Li", "Ca", "Na", "K"];

const SOAL = [
  {
    petunjuk: "Dalam satu golongan, dari atas ke bawah jari-jari atom bertambah; dalam satu periode, dari kiri ke kanan berkurang.",
    soal: "Di antara unsur berikut, mana yang jari-jari atomnya paling besar?",
    pilihan: ["Na", "Li", "K", "Rb"],
    benar: 3
  },
  {
    petunjuk: "Logam golongan 1 makin ke bawah makin ganas bertemu air.",
    soal: "Unsur mana yang paling reaktif terhadap air?",
    pilihan: ["Mg", "K", "C", "Be"],
    benar: 1
  },
  {
    petunjuk: "Banyak lambang unsur diambil dari nama Latinnya.",
    soal: "Fe adalah lambang unsur apa?",
    pilihan: ["Fosfor", "Besi", "Fluor", "Timah"],
    benar: 1
  }
];

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

function mountKimia(canvas, ui) {
  const status = shell(ui, "Panah atau WASD menyusuri labirin. Kumpulkan tiga unsur di papan atas, lalu ke pintu kuning. Di soal, panah atas dan bawah memilih, Lompat menjawab.", "Labirin baru");
  const cols = 12;
  const rows = 8;
  let cells = [];
  let px = 0;
  let py = 0;
  let butir = [];
  let waktu = 0;
  let jeda = 0;
  let menang = false;
  let soal = null;
  let pilih = 0;
  let salah = 0;

  const reset = () => {
    cells = carveMaze(cols, rows);
    px = 0;
    py = 0;
    waktu = 0;
    jeda = 0;
    menang = false;
    soal = null;
    pilih = 0;
    salah = 0;
    const spots = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if ((x || y) && (x !== cols - 1 || y !== rows - 1)) spots.push([x, y]);
      }
    }
    for (let i = spots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [spots[i], spots[j]] = [spots[j], spots[i]];
    }
    const pilihan = [...UNSUR].sort(() => Math.random() - 0.5).slice(0, 6);
    butir = pilihan.map((nama, i) => ({
      x: spots[i][0],
      y: spots[i][1],
      nama,
      wajib: i < 3,
      ambil: false
    }));
    status.textContent = "Cari tiga unsur yang diminta.";
  };
  reset();

  const kurang = () => butir.filter((b) => b.wajib && !b.ambil).length;

  const geser = (dx, dy) => {
    const c = cells[py][px];
    if ((dx === 1 && c.e) || (dx === -1 && c.w) || (dy === 1 && c.s) || (dy === -1 && c.n)) return;
    const nx = px + dx;
    const ny = py + dy;
    if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return;
    px = nx;
    py = ny;
    for (const b of butir) if (!b.ambil && b.x === px && b.y === py) b.ambil = true;
    if (px === cols - 1 && py === rows - 1) {
      if (kurang() === 0) {
        soal = SOAL[Math.floor(Math.random() * SOAL.length)];
        pilih = 0;
      } else {
        status.textContent = `Pintu terkunci. Kurang ${kurang()} unsur.`;
      }
    }
  };

  const update = (dt) => {
    if (menang) return;
    waktu += dt;
    jeda -= dt;
    if (soal) {
      if (jeda > 0) return;
      if (held.up || held.down) {
        pilih = (pilih + (held.up ? 3 : 1)) % 4;
        jeda = 0.17;
      }
      if (takeEdge("jump")) {
        if (pilih === soal.benar) {
          menang = true;
          const t = Number(waktu.toFixed(1));
          const baru = saveBest("kimia", t);
          status.textContent = `Keluar dalam ${t} dtk.${baru ? " Catatan baru." : ""}`;
        } else {
          salah += 1;
          soal = SOAL[Math.floor(Math.random() * SOAL.length)];
          pilih = 0;
          jeda = 0.3;
          status.textContent = `Belum tepat. Soal diganti. Salah ${salah}×.`;
        }
      }
      return;
    }
    if (jeda > 0) return;
    let dx = 0;
    let dy = 0;
    if (held.left) dx = -1;
    else if (held.right) dx = 1;
    else if (held.up) dy = -1;
    else if (held.down) dy = 1;
    if (dx || dy) {
      geser(dx, dy);
      jeda = 0.13;
    }
  };

  const draw = () => {
    const ctx = beginFrame(canvas);
    ctx.fillStyle = "#0b2f2b";
    ctx.fillRect(0, 0, VW, VH);
    const sel = 52;
    const ox = (VW - cols * sel) / 2;
    const oy = 84;
    ctx.strokeStyle = "#9ff2d0";
    ctx.lineWidth = 3;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const c = cells[y][x];
        const x0 = ox + x * sel;
        const y0 = oy + y * sel;
        ctx.beginPath();
        if (c.n) { ctx.moveTo(x0, y0); ctx.lineTo(x0 + sel, y0); }
        if (c.e) { ctx.moveTo(x0 + sel, y0); ctx.lineTo(x0 + sel, y0 + sel); }
        if (c.s) { ctx.moveTo(x0, y0 + sel); ctx.lineTo(x0 + sel, y0 + sel); }
        if (c.w) { ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + sel); }
        ctx.stroke();
      }
    }
    ctx.fillStyle = kurang() === 0 ? "#e7c36a" : "rgba(231,195,106,.3)";
    ctx.fillRect(ox + (cols - 1) * sel + 13, oy + (rows - 1) * sel + 13, 26, 26);

    ctx.textAlign = "center";
    for (const b of butir) {
      if (b.ambil) continue;
      const cx = ox + b.x * sel + sel / 2;
      const cy = oy + b.y * sel + sel / 2;
      ctx.fillStyle = b.wajib ? "#8ef6ea" : "#5a7f78";
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#071412";
      ctx.font = "700 13px Syne, sans-serif";
      ctx.fillText(b.nama, cx, cy + 5);
    }
    ctx.textAlign = "left";

    ctx.fillStyle = "#f4efe8";
    ctx.beginPath();
    ctx.arc(ox + px * sel + sel / 2, oy + py * sel + sel / 2, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "600 20px Syne, sans-serif";
    ctx.fillStyle = "#f4efe8";
    let hx = 28;
    for (const b of butir.filter((n) => n.wajib)) {
      ctx.fillStyle = b.ambil ? "#8ef6ea" : "rgba(244,239,232,.35)";
      ctx.fillText(b.nama, hx, 46);
      hx += 54;
    }
    ctx.fillStyle = "rgba(244,239,232,.7)";
    ctx.font = "500 16px 'Public Sans', sans-serif";
    ctx.fillText(`${waktu.toFixed(1)} dtk`, VW - 110, 44);

    if (soal) {
      ctx.fillStyle = "rgba(5,16,14,.9)";
      ctx.fillRect(60, 60, VW - 120, VH - 120);
      ctx.textAlign = "center";
      ctx.fillStyle = "#8ef6ea";
      ctx.font = "500 15px 'Public Sans', sans-serif";
      const kata = soal.petunjuk.split(" ");
      let baris = "";
      let ly = 110;
      for (const k of kata) {
        if ((baris + k).length > 72) { ctx.fillText(baris, VW / 2, ly); baris = ""; ly += 22; }
        baris += k + " ";
      }
      ctx.fillText(baris, VW / 2, ly);
      ctx.fillStyle = "#f4efe8";
      ctx.font = "600 24px Syne, sans-serif";
      ctx.fillText(soal.soal, VW / 2, ly + 52);
      soal.pilihan.forEach((p, i) => {
        const bx = VW / 2 - 200 + (i % 2) * 200;
        const by = ly + 86 + Math.floor(i / 2) * 58;
        ctx.fillStyle = i === pilih ? "#8ef6ea" : "rgba(255,255,255,.1)";
        ctx.fillRect(bx, by, 180, 44);
        ctx.fillStyle = i === pilih ? "#071412" : "#f4efe8";
        ctx.font = "600 19px 'Public Sans', sans-serif";
        ctx.fillText(p, bx + 90, by + 29);
      });
      ctx.textAlign = "left";
    }
    if (menang) panel(ctx, "Pintu terbuka", `${waktu.toFixed(1)} detik`);
  };

  const handle = loopGame(update, draw);
  return { stop: handle.stop, reset };
}

/* ------------------------------------------------------------------ *
 * 6. Ninja Spring — satu tombol, duri di atas dan di bawah
 * ------------------------------------------------------------------ */

function mountNinja(canvas, ui) {
  const status = shell(ui, "Spasi, panah atas, sentuh layar, atau tombol Lompat untuk memantul. Lewati celah di antara duri.", "Lompat lagi");
  const gerbang = [];
  const lebar = 58;
  /* Satu lompatan mengangkat ninja 68 px, dan tubuhnya 22 px dari titik tengah.
     Bukaan harus lebih lebar daripada busur itu, kalau tidak apex lompatan
     selalu menyerempet duri atas betapa pun rapinya pemain menekan tombol. */
  const bukaan = 205;
  let y = VH / 2;
  let vy = 0;
  let skor = 0;
  let koin = 0;
  let jarak = 0;
  let hidup = true;
  let mulai = false;
  let celahAkhir = VH / 2;

  /* Celah berikutnya bergeser dari celah sebelumnya, tidak diacak bebas: dengan
     jarak antar gerbang hanya 1,35 detik, lompatan acak sejauh setengah layar
     tidak mungkin dikejar siapa pun. */
  const celahBerikut = () => {
    celahAkhir = Math.max(150, Math.min(VH - 170, celahAkhir + (Math.random() - 0.5) * 150));
    return celahAkhir;
  };

  const reset = () => {
    gerbang.length = 0;
    y = VH / 2;
    vy = 0;
    skor = 0;
    koin = 0;
    jarak = 0;
    hidup = true;
    mulai = false;
    /* Gerbang pertama sengaja sejajar titik start: kalau celahnya diacak juga,
       pemain bisa dihadapkan pada bukaan yang mustahil dicapai dari awal. */
    celahAkhir = VH / 2;
    for (let i = 0; i < 4; i++) {
      gerbang.push({ x: 700 + i * 310, celah: i === 0 ? VH / 2 : celahBerikut(), lewat: false, koin: Math.random() < 0.6 });
    }
    status.textContent = "Tap untuk mulai memantul.";
  };
  reset();

  const update = (dt) => {
    if (!hidup) return;
    /* Dunia diam sampai tap pertama. Kalau gravitasi sudah bekerja lebih dulu,
       pemain kehilangan ketinggian sebelum sempat menyentuh apa pun. */
    if (!mulai) {
      if (!takeTap()) return;
      mulai = true;
      vy = -430;
      status.textContent = "Mantul.";
    }
    jarak += dt * 230;
    if (takeTap()) vy = -430;
    vy += 1350 * dt;
    y += vy * dt;
    // Langit-langit menahan, bukan membunuh; yang mematikan hanya lantai dan duri.
    if (y < 24) { y = 24; vy = 0; }
    if (y > VH - 62) {
      hidup = false;
      const baru = saveBest("ninja", skor);
      status.textContent = `Jatuh ke tanah. Skor ${skor}.${baru ? " Catatan baru." : ""}`;
      return;
    }
    for (const g of gerbang) {
      g.x -= 230 * dt;
      if (g.x < -lebar - 40) {
        g.x += 4 * 310;
        g.celah = celahBerikut();
        g.lewat = false;
        g.koin = Math.random() < 0.6;
      }
      const dalam = 196 + 22 > g.x && 196 - 22 < g.x + lebar;
      if (dalam && (y - 22 < g.celah - bukaan / 2 || y + 22 > g.celah + bukaan / 2)) {
        hidup = false;
        const baru = saveBest("ninja", skor);
        status.textContent = `Kena duri. Skor ${skor}.${baru ? " Catatan baru." : ""}`;
        return;
      }
      if (!g.lewat && g.x + lebar < 196 - 22) {
        g.lewat = true;
        skor += 1;
      }
      if (g.koin && Math.abs(g.x + lebar / 2 - 196) < 24 && Math.abs(g.celah - y) < 30) {
        g.koin = false;
        koin += 1;
        skor += 2;
      }
    }
  };

  const draw = () => {
    const ctx = beginFrame(canvas, "#1d2535");
    ctx.fillStyle = "#dedede";
    ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = "#cfcfcf";
    for (let i = 0; i < 6; i++) {
      const x = ((i * 190 - jarak * 0.25) % (VW + 220)) - 110;
      ctx.beginPath();
      ctx.moveTo(x, VH - 46);
      ctx.lineTo(x + 56, VH - 180);
      ctx.lineTo(x + 112, VH - 46);
      ctx.closePath();
      ctx.fill();
    }

    for (const g of gerbang) {
      ctx.fillStyle = "#b8461a";
      const atas = g.celah - bukaan / 2;
      const bawah = g.celah + bukaan / 2;
      for (let t = 0; t < atas; t += 34) {
        ctx.beginPath();
        ctx.moveTo(g.x, t);
        ctx.lineTo(g.x + lebar, t + 17);
        ctx.lineTo(g.x, t + 34);
        ctx.closePath();
        ctx.fill();
      }
      for (let t = bawah; t < VH - 40; t += 34) {
        ctx.beginPath();
        ctx.moveTo(g.x + lebar, t);
        ctx.lineTo(g.x, t + 17);
        ctx.lineTo(g.x + lebar, t + 34);
        ctx.closePath();
        ctx.fill();
      }
      if (g.koin) {
        ctx.fillStyle = "#e7b53a";
        ctx.beginPath();
        ctx.arc(g.x + lebar / 2, g.celah, 12, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = "#e07a1f";
    ctx.fillRect(0, VH - 40, VW, 40);

    ctx.fillStyle = "#f6f1e6";
    ctx.beginPath();
    ctx.arc(196, y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1d2535";
    ctx.beginPath();
    ctx.arc(196, y, 22, Math.PI * 0.86, Math.PI * 2.14);
    ctx.fill();
    ctx.fillRect(174, y - 7, 44, 13);
    ctx.fillStyle = "#f6f1e6";
    ctx.fillRect(186, y - 5, 7, 9);
    ctx.fillRect(199, y - 5, 7, 9);
    ctx.fillStyle = "#1d2535";
    ctx.fillRect(188, y - 3, 4, 5);
    ctx.fillRect(201, y - 3, 4, 5);
    // Ikat kepala merah yang berkibar ke belakang: tanpa ini ninjanya
    // terbaca sebagai gumpalan gelap begitu saja.
    ctx.fillStyle = "#c2332b";
    ctx.fillRect(174, y - 11, 44, 5);
    const kibar = Math.sin(jarak / 16) * 5;
    ctx.beginPath();
    ctx.moveTo(176, y - 11);
    ctx.lineTo(150, y - 20 + kibar);
    ctx.lineTo(154, y - 8 + kibar);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#1d2535";
    ctx.fillRect(0, 0, 150, 42);
    ctx.fillRect(VW - 120, 0, 120, 42);
    ctx.fillStyle = "#e7c36a";
    ctx.font = "700 22px Syne, sans-serif";
    ctx.fillText(`◉ ${koin}`, 20, 29);
    ctx.textAlign = "center";
    ctx.fillText(String(skor), VW - 60, 29);
    ctx.textAlign = "left";
    if (!hidup) panel(ctx, "Kena duri", `Skor ${skor}`);
  };

  const handle = loopGame(update, draw);
  return { stop: handle.stop, reset };
}

/* ------------------------------------------------------------------ *
 * 7. Tuyul The Adventure 2D — lari di gua dunia gaib
 * ------------------------------------------------------------------ */

function mountTuyul2d(canvas, ui) {
  const status = shell(ui, "Spasi, panah atas, sentuh layar, atau tombol Lompat. Koin menambah poin, tiga kali tertabrak berarti selesai.", "Main lagi");
  const dasar = 452;
  const rintang = [];
  const koin = [];
  let y = dasar;
  let vy = 0;
  let geser = 0;
  let laju = 320;
  let meter = 0;
  let uang = 0;
  let nyawa = 3;
  let kebal = 0;
  let spawn = 0.8;
  let hidup = true;

  const reset = () => {
    rintang.length = 0;
    koin.length = 0;
    y = dasar;
    vy = 0;
    geser = 0;
    laju = 320;
    meter = 0;
    uang = 0;
    nyawa = 3;
    kebal = 1;
    spawn = 0.8;
    hidup = true;
    status.textContent = "Keluar dari dunia gaib.";
  };
  reset();

  const update = (dt) => {
    if (!hidup) return;
    kebal -= dt;
    laju = Math.min(600, laju + dt * 9);
    geser += laju * dt;
    meter += laju * dt * 0.05;
    if (takeTap() && y >= dasar - 1) vy = -760;
    vy += 2050 * dt;
    y = Math.min(dasar, y + vy * dt);
    if (y >= dasar) vy = 0;

    spawn -= dt;
    if (spawn <= 0) {
      const gantung = Math.random() < 0.34;
      rintang.push({ x: VW + 30, gantung, w: gantung ? 40 : 34 + Math.random() * 20, h: gantung ? 74 : 44 + Math.random() * 40 });
      if (Math.random() < 0.7) koin.push({ x: VW + 150, y: dasar - (Math.random() < 0.5 ? 40 : 128) });
      spawn = Math.max(0.68, 1.4 - meter / 1600);
    }

    const aku = { x: 172, y: y - 44, w: 30, h: 42 };
    for (let i = rintang.length - 1; i >= 0; i--) {
      const r = rintang[i];
      r.x -= laju * dt;
      const kotak = r.gantung
        ? { x: r.x + 8, y: dasar - 168, w: r.w - 16, h: r.h }
        : { x: r.x + 6, y: dasar - r.h, w: r.w - 12, h: r.h - 4 };
      if (kebal <= 0 && hit(aku, kotak)) {
        nyawa -= 1;
        kebal = 1.3;
        if (nyawa <= 0) {
          hidup = false;
          const m = Math.floor(meter);
          const baru = saveBest("tuyul2d", m);
          status.textContent = `Tertangkap pada ${m} M, ${uang} koin.${baru ? " Catatan baru." : ""}`;
        }
      }
      if (r.x < -80) rintang.splice(i, 1);
    }
    for (let i = koin.length - 1; i >= 0; i--) {
      const k = koin[i];
      k.x -= laju * dt;
      if (hit(aku, { x: k.x - 12, y: k.y - 12, w: 24, h: 24 })) {
        uang += 1;
        meter += 12;
        koin.splice(i, 1);
      } else if (k.x < -30) koin.splice(i, 1);
    }
  };

  const draw = () => {
    const ctx = beginFrame(canvas);
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, "#0a1a1c");
    g.addColorStop(0.55, "#133034");
    g.addColorStop(1, "#07100f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);

    ctx.fillStyle = "#061012";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let x = 0; x <= VW; x += 48) {
      ctx.lineTo(x, 34 + Math.sin((x + geser * 0.2) * 0.02) * 16 + ((x * 7) % 22));
      ctx.lineTo(x + 24, 8);
    }
    ctx.lineTo(VW, 0);
    ctx.fill();

    for (let i = 0; i < 4; i++) {
      const x = ((i * 260 - geser * 0.35) % (VW + 300)) - 150;
      ctx.strokeStyle = "rgba(180,200,190,.18)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, 40);
      ctx.lineTo(x, 150);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, 176, 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, 176, 9, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = "#0a1512";
    ctx.fillRect(0, dasar, VW, VH - dasar);
    ctx.fillStyle = "#6f8f2e";
    ctx.beginPath();
    ctx.moveTo(0, dasar);
    for (let x = 0; x <= VW; x += 24) {
      ctx.lineTo(x, dasar - 4 - Math.abs(Math.sin((x + geser) * 0.03)) * 8);
    }
    ctx.lineTo(VW, dasar + 12);
    ctx.lineTo(0, dasar + 12);
    ctx.fill();

    for (const k of koin) {
      ctx.fillStyle = "#e7c36a";
      ctx.beginPath();
      ctx.ellipse(k.x, k.y + Math.sin(geser * 0.02 + k.x) * 4, 11, 13, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const r of rintang) {
      if (r.gantung) {
        ctx.strokeStyle = "#6b6b60";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(r.x + r.w / 2, dasar - 240);
        ctx.lineTo(r.x + r.w / 2, dasar - 168);
        ctx.stroke();
        ctx.fillStyle = "#5c6b55";
        ctx.fillRect(r.x + 6, dasar - 168, r.w - 12, r.h);
        ctx.fillStyle = "#2a2f26";
        ctx.fillRect(r.x + 12, dasar - 158, 6, 7);
        ctx.fillRect(r.x + r.w - 18, dasar - 158, 6, 7);
      } else {
        ctx.fillStyle = "#2f2a22";
        ctx.beginPath();
        ctx.arc(r.x + r.w / 2, dasar - r.h / 2, r.h / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#4a4336";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(r.x + r.w / 2, dasar - r.h / 2, r.h / 2 - 5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (kebal <= 0 || Math.floor(kebal * 12) % 2 === 0) {
      const bob = Math.sin(geser * 0.05) * 3;
      const px = 186;
      const py = y - 26 + bob;
      ctx.save();
      ctx.shadowColor = "rgba(200,255,245,.85)";
      ctx.shadowBlur = 26;
      ctx.fillStyle = "#f3fbf8";
      ctx.beginPath();
      ctx.ellipse(px, py - 12, 19, 23, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(px - 12, py + 6);
      ctx.quadraticCurveTo(px, py + 30, px + 12, py + 6);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "#1b2b2a";
      ctx.fillRect(px - 8, py - 16, 4, 7);
      ctx.fillRect(px + 4, py - 16, 4, 7);
    }

    const kotak = (x, w, teks) => {
      ctx.fillStyle = "rgba(8,14,13,.82)";
      ctx.fillRect(x, 22, w, 34);
      ctx.fillStyle = "#8ef6ea";
      ctx.font = "600 19px Syne, sans-serif";
      ctx.fillText(teks, x + 14, 45);
    };
    kotak(24, 104, `◉ ${uang}`);
    kotak(140, 96, `♥ ${nyawa}`);
    kotak(VW - 150, 126, `${Math.floor(meter)} M`);
    if (!hidup) panel(ctx, "Tertangkap", `${Math.floor(meter)} meter · ${uang} koin`);
  };

  const handle = loopGame(update, draw);
  return { stop: handle.stop, reset };
}

/* ------------------------------------------------------------------ *
 * 8. Tuyul The Adventure 3D — rumah hantu, cari keris lalu keluar
 * ------------------------------------------------------------------ */

const DENAH = [
  "###############",
  "#.....#.......#",
  "#.###.#.#####.#",
  "#.#...#.....#.#",
  "#.#.#######.#.#",
  "#...#.....#...#",
  "###.#.###.#.###",
  "#.....#.....#.D",
  "###############"
];

function mountTuyul3d(canvas, ui) {
  const status = shell(ui, "Panah atau WASD. Cahaya tuyul hanya sejauh beberapa langkah. Ambil keris, lalu cari pintu di kanan bawah.", "Masuk lagi");
  const SEL = 60;
  const OX = (VW - DENAH[0].length * SEL) / 2;
  const OY = (VH - DENAH.length * SEL) / 2;
  const tembok = (cx, cy) => DENAH[cy]?.[cx] === "#";
  const bebas = [];
  for (let y = 0; y < DENAH.length; y++) {
    for (let x = 0; x < DENAH[y].length; x++) {
      if (DENAH[y][x] === ".") bebas.push([x, y]);
    }
  }

  let px = 0;
  let py = 0;
  let keris = null;
  let punya = false;
  let waktu = 0;
  let selesai = false;
  let tertangkap = false;
  const hantu = { x: 0, y: 0, tx: 0, ty: 0 };

  const kePiksel = (cx, cy) => [OX + cx * SEL + SEL / 2, OY + cy * SEL + SEL / 2];

  const acakJauh = (fx, fy) => {
    const jauh = bebas.filter(([x, y]) => Math.hypot(x - fx, y - fy) > 6);
    return (jauh.length ? jauh : bebas)[Math.floor(Math.random() * (jauh.length || bebas.length))];
  };

  const reset = () => {
    [px, py] = kePiksel(1, 1);
    keris = acakJauh(1, 1);
    punya = false;
    waktu = 0;
    selesai = false;
    tertangkap = false;
    const [hx, hy] = acakJauh(1, 1);
    [hantu.x, hantu.y] = kePiksel(hx, hy);
    hantu.tx = hantu.x;
    hantu.ty = hantu.y;
    status.textContent = "Rumahnya gelap. Cari kerisnya.";
  };
  reset();

  const bisa = (nx, ny) => {
    const r = 15;
    for (const [dx, dy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
      const cx = Math.floor((nx + dx - OX) / SEL);
      const cy = Math.floor((ny + dy - OY) / SEL);
      if (tembok(cx, cy)) return false;
    }
    return true;
  };

  const update = (dt) => {
    if (selesai) return;
    waktu += dt;
    const dx = (held.right ? 1 : 0) - (held.left ? 1 : 0);
    const dy = (held.down ? 1 : 0) - (held.up ? 1 : 0);
    const n = Math.hypot(dx, dy) || 1;
    const sx = px + (dx / n) * 180 * dt;
    const sy = py + (dy / n) * 180 * dt;
    if (bisa(sx, py)) px = sx;
    if (bisa(px, sy)) py = sy;

    if (!punya && keris) {
      const [kx, ky] = kePiksel(keris[0], keris[1]);
      if (Math.hypot(px - kx, py - ky) < 26) {
        punya = true;
        status.textContent = "Keris di tangan. Pintu di kanan bawah.";
      }
    }

    const jarakHantu = Math.hypot(px - hantu.x, py - hantu.y);
    const kejar = jarakHantu < 190;
    if (kejar) {
      hantu.tx = px;
      hantu.ty = py;
    } else if (Math.hypot(hantu.x - hantu.tx, hantu.y - hantu.ty) < 12) {
      const [wx, wy] = bebas[Math.floor(Math.random() * bebas.length)];
      [hantu.tx, hantu.ty] = kePiksel(wx, wy);
    }
    const hd = Math.hypot(hantu.tx - hantu.x, hantu.ty - hantu.y) || 1;
    const laju = (kejar ? 128 : 74) * dt;
    const hx = hantu.x + ((hantu.tx - hantu.x) / hd) * laju;
    const hy = hantu.y + ((hantu.ty - hantu.y) / hd) * laju;
    if (bisa(hx, hantu.y)) hantu.x = hx; else hantu.tx = hantu.x;
    if (bisa(hantu.x, hy)) hantu.y = hy; else hantu.ty = hantu.y;

    if (jarakHantu < 24) {
      selesai = true;
      tertangkap = true;
      status.textContent = "Dukunnya menemukanmu lebih dulu.";
    }

    const [ex, ey] = kePiksel(DENAH[0].length - 1, 7);
    if (punya && Math.hypot(px - ex, py - ey) < 34) {
      selesai = true;
      const t = Number(waktu.toFixed(1));
      const baru = saveBest("tuyul3d", t);
      status.textContent = `Bebas dalam ${t} dtk.${baru ? " Catatan baru." : ""}`;
    }
  };

  const draw = () => {
    const ctx = beginFrame(canvas);
    ctx.fillStyle = "#0d1016";
    ctx.fillRect(0, 0, VW, VH);
    for (let y = 0; y < DENAH.length; y++) {
      for (let x = 0; x < DENAH[y].length; x++) {
        const c = DENAH[y][x];
        const x0 = OX + x * SEL;
        const y0 = OY + y * SEL;
        if (c === "#") {
          ctx.fillStyle = "#273047";
          ctx.fillRect(x0, y0, SEL, SEL);
          ctx.fillStyle = "#1b2133";
          ctx.fillRect(x0 + 3, y0 + 3, SEL - 6, SEL - 6);
        } else {
          ctx.fillStyle = (x + y) % 2 ? "#161b26" : "#131824";
          ctx.fillRect(x0, y0, SEL, SEL);
        }
        if (c === "D") {
          ctx.fillStyle = punya ? "#e7c36a" : "#5a4a24";
          ctx.fillRect(x0 + 10, y0 + 6, SEL - 20, SEL - 12);
        }
      }
    }

    if (!punya && keris) {
      const [kx, ky] = kePiksel(keris[0], keris[1]);
      ctx.strokeStyle = "#d9c08a";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(kx - 10, ky + 12);
      ctx.quadraticCurveTo(kx + 6, ky, kx - 4, ky - 14);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(220,200,255,.85)";
    ctx.beginPath();
    ctx.ellipse(hantu.x, hantu.y - 4, 15, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4a1020";
    ctx.fillRect(hantu.x - 7, hantu.y - 10, 5, 6);
    ctx.fillRect(hantu.x + 2, hantu.y - 10, 5, 6);

    ctx.save();
    ctx.shadowColor = "rgba(190,255,245,.9)";
    ctx.shadowBlur = 22;
    ctx.fillStyle = "#f2fbf7";
    ctx.beginPath();
    ctx.ellipse(px, py, 13, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    /* Gelapnya berhenti di 0.82, bukan nyaris pekat: rumah hantu harus menakutkan
       tetapi pemain tetap perlu melihat dinding dan pintu keluarnya. */
    const cahaya = ctx.createRadialGradient(px, py, 30, px, py, 330);
    cahaya.addColorStop(0, "rgba(5,6,10,0)");
    cahaya.addColorStop(0.45, "rgba(5,6,10,.3)");
    cahaya.addColorStop(1, "rgba(5,6,10,.82)");
    ctx.fillStyle = cahaya;
    ctx.fillRect(0, 0, VW, VH);

    ctx.fillStyle = "#f4efe8";
    ctx.font = "600 20px Syne, sans-serif";
    ctx.fillText(punya ? "Keris: ada" : "Keris: belum", 28, 40);
    ctx.fillStyle = "rgba(244,239,232,.66)";
    ctx.font = "500 16px 'Public Sans', sans-serif";
    ctx.fillText(`${waktu.toFixed(1)} dtk`, 28, 64);
    if (selesai) panel(ctx, tertangkap ? "Tertangkap" : "Bebas", tertangkap ? "Dukun lebih cepat" : `${waktu.toFixed(1)} detik`);
  };

  const handle = loopGame(update, draw);
  return { stop: handle.stop, reset };
}

/* ------------------------------------------------------------------ */

const GAMES = {
  monusa: {
    title: "Monusa AR",
    mount: mountMonusa,
    lower: true,
    best: (v) => `Waktu terbaik ${v.toFixed(1)} dtk`
  },
  sipesia: {
    title: "Sipesia 3D",
    mount: mountSipesia,
    best: (v) => `Kuman terbanyak ${Math.floor(v)}`
  },
  jarwo: {
    title: "Rocket Captain Jarwo",
    mount: mountJarwo,
    best: (v) => `Jarak terbaik ${Math.floor(v)} M`
  },
  offroad: {
    title: "Dark Offroad",
    mount: mountOffroad,
    best: (v) => `Poin terbaik ${Math.floor(v)}`
  },
  kimia: {
    title: "Labirin Kimia",
    mount: mountKimia,
    lower: true,
    best: (v) => `Waktu terbaik ${v.toFixed(1)} dtk`
  },
  ninja: {
    title: "Ninja Spring",
    mount: mountNinja,
    best: (v) => `Skor terbaik ${Math.floor(v)}`
  },
  tuyul2d: {
    title: "Tuyul The Adventure 2D",
    mount: mountTuyul2d,
    best: (v) => `Jarak terbaik ${Math.floor(v)} M`
  },
  tuyul3d: {
    title: "Tuyul The Adventure 3D",
    mount: mountTuyul3d,
    lower: true,
    best: (v) => `Waktu terbaik ${v.toFixed(1)} dtk`
  }
};

function releaseAll() {
  held.left = false;
  held.right = false;
  held.up = false;
  held.down = false;
  held.jump = false;
  edges.jump = false;
  edges.up = false;
}

export function formatBest(id) {
  const value = readBest(id);
  if (value == null || Number.isNaN(value)) return "Belum ada catatan";
  return GAMES[id] ? GAMES[id].best(value) : String(value);
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
    /* Fokus dipindah ke kanvas karena showModal() menaruhnya di tombol pertama,
       dan selama fokus ada di tombol, spasi menekan tombol itu — bukan melompat. */
    canvas.focus({ preventScroll: true });
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
      try { button.setPointerCapture?.(event.pointerId); } catch { /* klik sintetis */ }
      if (!held[name] && (name === "jump" || name === "up")) edges[name] = true;
      held[name] = true;
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
    if (event.repeat) {
      held[name] = true;
      return;
    }
    if (name === "jump" || name === "up") edges[name] = true;
    held[name] = true;
  });
  window.addEventListener("keyup", (event) => {
    const name = KEYS[event.key];
    if (name) held[name] = false;
  });

  canvas.addEventListener("pointerdown", () => {
    if (!held.jump) edges.jump = true;
    held.jump = true;
  });
  window.addEventListener("pointerup", () => {
    held.jump = false;
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
