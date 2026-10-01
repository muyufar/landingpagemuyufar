// Versi di URL harus sama dengan yang di index.html: query pada <script> tidak
// menurun ke modul yang di-import, jadi arcade.js perlu nomornya sendiri.
import { initArcade } from "./arcade.js?v=20261002b";

const arcade = initArcade();
const threshold = document.querySelector(".threshold");
const gamePane = document.querySelector(".pane-game");
const systemPane = document.querySelector(".pane-system");
const veil = document.querySelector(".veil");
const shotDialog = document.getElementById("shot");
const shotImage = document.getElementById("shot-img");
const theme = document.querySelector('meta[name="theme-color"]');
const mobileQuery = window.matchMedia("(max-width: 860px)");
const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

const TITLES = {
  threshold: "Muhamad Yusuf, S.Kom — Dua Dunia",
  game: "Dunia Permainan — Muhamad Yusuf, S.Kom",
  system: "Dunia Sistem — Muhamad Yusuf, S.Kom"
};

const HASH = {
  threshold: "#gerbang",
  game: "#permainan",
  system: "#sistem"
};

let current = null;

function worldFromHash() {
  const hash = location.hash;
  if (hash.includes("sistem")) return "system";
  if (hash.includes("permainan")) return "game";
  return "threshold";
}

function syncSplit() {
  if (!threshold || mobileQuery.matches || current !== "threshold") return;
  const bounds = threshold.getBoundingClientRect();
  const gameBounds = gamePane.getBoundingClientRect();
  if (!bounds.width) return;
  const seam = gameBounds.right;
  const pct = ((seam - bounds.left) / bounds.width) * 100;
  threshold.style.setProperty("--split", `${pct}%`);
  document.querySelectorAll(".split-text").forEach((el) => {
    const box = el.getBoundingClientRect();
    if (!box.width) return;
    el.style.setProperty("--cut", `${((seam - box.left) / box.width) * 100}%`);
  });
}

function animateSplit() {
  const start = performance.now();
  const step = (now) => {
    syncSplit();
    if (now - start < 800) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function syncNav() {
  document.querySelectorAll(".world-nav [data-enter]").forEach((button) => {
    if (button.dataset.enter === current) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
}

function applyWorld(world) {
  current = world;
  document.body.dataset.world = world;
  document.title = TITLES[world];
  if (theme) theme.content = world === "system" ? "#efe8dc" : "#07060c";
  if (world !== "game") arcade.close();
  syncNav();
  window.scrollTo(0, 0);
  syncSplit();
}

function playVeil(world, done) {
  veil.dataset.to = world;
  veil.classList.remove("is-on");
  void veil.offsetWidth;
  veil.classList.add("is-on");
  window.setTimeout(done, 280);
  window.setTimeout(() => veil.classList.remove("is-on"), 760);
}

function go(world, push) {
  if (!world || world === current) return;
  const hash = HASH[world];
  const commit = () => {
    applyWorld(world);
    if (push) history.pushState({ world }, "", hash);
    else history.replaceState({ world }, "", hash);
  };
  if (reduceQuery.matches) commit();
  else playVeil(world, commit);
}

document.body.addEventListener("click", (event) => {
  const enter = event.target.closest("[data-enter]");
  if (enter) {
    event.preventDefault();
    go(enter.dataset.enter, true);
    return;
  }
  const scroll = event.target.closest("[data-scroll]");
  if (scroll) {
    document.getElementById(scroll.dataset.scroll)?.scrollIntoView({
      behavior: reduceQuery.matches ? "auto" : "smooth",
      block: "start"
    });
    return;
  }
  const shot = event.target.closest("[data-shot]");
  if (shot) {
    const img = shot.querySelector("img");
    shotImage.src = shot.dataset.shot;
    shotImage.alt = img ? img.alt : "";
    if (!shotDialog.open) shotDialog.showModal();
    return;
  }
  const game = event.target.closest("[data-game]");
  if (game && document.body.dataset.world === "game") arcade.open(game.dataset.game);
});

// Gambarnya dilepas saat ditutup supaya tangkapan lama tidak berkedip muncul
// sepersekian detik ketika dialognya dibuka lagi untuk gambar yang lain.
shotDialog.addEventListener("close", () => { shotImage.removeAttribute("src"); });
shotDialog.addEventListener("click", (event) => {
  if (event.target === shotDialog || event.target.id === "shot-close") shotDialog.close();
});

window.addEventListener("popstate", () => applyWorld(worldFromHash()));
window.addEventListener("resize", syncSplit);
gamePane.addEventListener("pointerenter", animateSplit);
gamePane.addEventListener("pointerleave", animateSplit);
systemPane.addEventListener("pointerenter", animateSplit);
systemPane.addEventListener("pointerleave", animateSplit);

document.querySelector(".skip").addEventListener("click", (event) => {
  event.preventDefault();
  const heading = document.querySelector(`[data-world-panel="${current}"] h1`);
  if (!heading) return;
  heading.setAttribute("tabindex", "-1");
  heading.focus();
});

const CATALOG = [
  { id: "kopi", name: "Kopi Arabika 250g", price: 48000, stock: 12, tone: "#6b3a2a" },
  { id: "beras", name: "Beras Premium 5kg", price: 76000, stock: 8, tone: "#c4a574" },
  { id: "minyak", name: "Minyak Goreng 2L", price: 36000, stock: 10, tone: "#d6a423" },
  { id: "gula", name: "Gula Pasir 1kg", price: 18000, stock: 14, tone: "#efe6d6" },
  { id: "teh", name: "Teh Melati", price: 15000, stock: 16, tone: "#5d7a48" },
  { id: "susu", name: "Susu UHT 1L", price: 22000, stock: 11, tone: "#d5dee8" },
  { id: "mie", name: "Mie Instan Dus", price: 42000, stock: 9, tone: "#e24b3b" },
  { id: "sabun", name: "Sabun Mandi", price: 12000, stock: 18, tone: "#7ea4c4" }
];

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0
});

const clockFormat = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta"
});

function freshStock() {
  return Object.fromEntries(CATALOG.map((item) => [item.id, item.stock]));
}

const shop = {
  stock: freshStock(),
  cart: [],
  code: "",
  discountRate: 0,
  note: "",
  tender: "",
  screen: "sale",
  tab: "kasir",
  history: [],
  closed: false,
  viewing: null
};

function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function itemById(id) {
  return CATALOG.find((item) => item.id === id);
}

function cartQty(id) {
  return shop.cart.find((line) => line.id === id)?.qty || 0;
}

function totals() {
  let sub = 0;
  for (const line of shop.cart) sub += itemById(line.id).price * line.qty;
  const discount = shop.discountRate ? Math.round(sub * shop.discountRate) : 0;
  return { sub, discount, total: sub - discount };
}

function revenue() {
  return shop.history.reduce((sum, receipt) => sum + receipt.total, 0);
}

function renderTerminal() {
  const root = document.getElementById("terminal");
  if (!root) return;
  const money = totals();
  const body = shop.tab === "riwayat" ? renderHistory() : renderSale(money);
  root.innerHTML = `
    <div class="term-screen">
      <header class="term-head">
        <div>
          <div class="term-brand">Kasir Seberang</div>
          <div class="term-tabs">
            <button type="button" data-act="tab-kasir" aria-current="${shop.tab === "kasir"}">Kasir</button>
            <button type="button" data-act="tab-riwayat" aria-current="${shop.tab === "riwayat"}">Riwayat</button>
          </div>
        </div>
        <div class="term-meta">
          <span data-clock>${esc(clockFormat.format(new Date()))} WIB</span>
          <span class="${shop.closed ? "shift-closed" : "shift-open"}">${shop.closed ? "Shift tutup" : "Shift buka"}</span>
        </div>
      </header>
      ${body}
      <footer class="term-foot">
        <span>${shop.history.length} transaksi</span>
        <span>Omzet ${esc(rupiah.format(revenue()))}</span>
      </footer>
    </div>
  `;
}

function renderSale(money) {
  if (shop.screen === "receipt" && shop.viewing) return renderReceipt(shop.viewing, true);
  if (shop.screen === "pay") return renderPay(money);
  const skus = CATALOG.map((item) => {
    const left = shop.stock[item.id] - cartQty(item.id);
    return `
      <button type="button" class="sku" data-act="add" data-id="${item.id}" ${shop.closed || left <= 0 ? "disabled" : ""}>
        <span class="swatch" style="background:${item.tone}"></span>
        <span>${esc(item.name)}<small>Stok ${left}</small></span>
        <span class="price">${esc(rupiah.format(item.price))}</span>
      </button>`;
  }).join("");
  const lines = shop.cart.length
    ? shop.cart.map((line) => {
      const item = itemById(line.id);
      return `
        <div class="line">
          <span>${esc(item.name)}<small> × ${line.qty}</small></span>
          <span class="stepper">
            <button type="button" data-act="minus" data-id="${line.id}" aria-label="Kurangi ${esc(item.name)}">−</button>
            <span>${esc(rupiah.format(item.price * line.qty))}</span>
            <button type="button" data-act="plus" data-id="${line.id}" aria-label="Tambah ${esc(item.name)}">+</button>
          </span>
        </div>`;
    }).join("")
    : `<p class="empty">Keranjang kosong. Pilih barang di kiri.</p>`;
  return `
    <div class="term-body">
      <div class="sku-list">${skus}</div>
      <div class="cart-pane">
        <h3>Keranjang</h3>
        ${lines}
        <form class="code-row" data-code-form>
          <input name="code" value="${esc(shop.code)}" placeholder="Kode, coba LABIRIN" autocomplete="off" ${shop.closed ? "disabled" : ""}>
          <button type="submit">Pakai</button>
        </form>
        <p class="note">${esc(shop.note)}</p>
        <div class="totals">
          <div><span>Subtotal</span><span>${esc(rupiah.format(money.sub))}</span></div>
          <div><span>Diskon</span><span>${esc(rupiah.format(money.discount))}</span></div>
          <div class="grand"><span>Total</span><span>${esc(rupiah.format(money.total))}</span></div>
        </div>
        <div class="term-actions">
          <button type="button" data-act="to-pay" ${shop.closed || !shop.cart.length ? "disabled" : ""}>Bayar</button>
          <button type="button" class="alt" data-act="clear-cart" ${shop.cart.length ? "" : "disabled"}>Kosongkan</button>
          <button type="button" class="alt" data-act="close-shift" ${shop.closed ? "disabled" : ""}>Tutup shift</button>
        </div>
      </div>
    </div>`;
}

function renderPay(money) {
  return `
    <div class="sheet">
      <h3>Pembayaran</h3>
      <p>Total ${esc(rupiah.format(money.total))}. Transaksi belum memotong stok sampai pembayaran utuh.</p>
      <div class="pay-box">
        <div class="pay-row">
          <input name="tender" inputmode="numeric" placeholder="Uang diterima" value="${esc(shop.tender)}">
          <button type="button" data-act="pay-cash">Bayar tunai</button>
        </div>
        <div class="term-actions">
          <button type="button" data-act="pay-qris">Bayar QRIS</button>
          <button type="button" class="alt" data-act="back-sale">Kembali</button>
        </div>
        <p class="note">${esc(shop.note)}</p>
      </div>
    </div>`;
}

function renderReceipt(receipt, fromSale) {
  const rows = receipt.lines.map((line) => `<div><span>${esc(line.name)} × ${line.qty}</span><span>${esc(rupiah.format(line.amount))}</span></div>`).join("");
  return `
    <div class="sheet">
      <article class="receipt">
        <h3>Kasir Seberang</h3>
        <p class="center">Demonstrasi · ${esc(receipt.when)}</p>
        ${rows}
        <hr>
        <div><span>Diskon</span><span>${esc(rupiah.format(receipt.discount))}</span></div>
        <div><span>Total</span><strong>${esc(rupiah.format(receipt.total))}</strong></div>
        <div><span>${esc(receipt.method)}</span><span>${esc(rupiah.format(receipt.paid))}</span></div>
        <div><span>Kembali</span><span>${esc(rupiah.format(receipt.change))}</span></div>
      </article>
      <div class="term-actions">
        ${fromSale ? `<button type="button" class="primary" data-act="new-sale">Transaksi baru</button>` : `<button type="button" class="alt" data-act="tab-riwayat">Kembali ke riwayat</button>`}
      </div>
    </div>`;
}

function renderHistory() {
  if (shop.viewing && shop.screen === "receipt") return renderReceipt(shop.viewing, false);
  const list = shop.history.length
    ? shop.history.map((receipt, index) => `
      <button type="button" class="history-item" data-act="open-receipt" data-index="${index}">
        <span>${esc(receipt.when)} · ${esc(receipt.method)}</span>
        <span>${esc(rupiah.format(receipt.total))}</span>
      </button>`).join("")
    : `<p class="empty">Belum ada struk pada shift ini.</p>`;
  return `
    <div class="sheet">
      <h3>Riwayat shift</h3>
      ${list}
      <div class="totals">
        <div class="grand"><span>Omzet</span><span>${esc(rupiah.format(revenue()))}</span></div>
      </div>
      <div class="term-actions">
        ${shop.closed
          ? `<button type="button" data-act="open-shift">Buka shift baru</button>`
          : `<button type="button" class="alt" data-act="close-shift">Tutup shift</button>`}
      </div>
      <p class="note">${shop.closed ? "Shift tertutup. Stok dan riwayat terkunci sampai shift baru." : ""}</p>
    </div>`;
}

function applyCode() {
  const code = shop.code.trim().toUpperCase();
  if (!code) {
    shop.discountRate = 0;
    shop.note = "Tanpa kode diskon.";
    return;
  }
  if (code === "LABIRIN") {
    shop.discountRate = 0.1;
    shop.note = "LABIRIN dipakai. Diskon 10%.";
    return;
  }
  shop.discountRate = 0;
  shop.note = "Kode tidak dikenal.";
}

function checkout(method, paid) {
  const money = totals();
  if (!shop.cart.length || money.total < 0) return;
  if (paid < money.total) {
    shop.note = "Uang kurang. Penjualan belum terjadi.";
    return;
  }
  for (const line of shop.cart) {
    if (shop.stock[line.id] < line.qty) {
      shop.note = "Stok berubah. Periksa keranjang.";
      return;
    }
  }
  for (const line of shop.cart) shop.stock[line.id] -= line.qty;
  const receipt = {
    when: clockFormat.format(new Date()) + " WIB",
    method,
    lines: shop.cart.map((line) => {
      const item = itemById(line.id);
      return { name: item.name, qty: line.qty, amount: item.price * line.qty };
    }),
    discount: money.discount,
    total: money.total,
    paid,
    change: paid - money.total
  };
  shop.history.unshift(receipt);
  shop.viewing = receipt;
  shop.cart = [];
  shop.tender = "";
  shop.note = "";
  shop.screen = "receipt";
  shop.tab = "kasir";
}

function onTerminalClick(event) {
  const button = event.target.closest("[data-act]");
  if (!button || button.disabled) return;
  const act = button.dataset.act;
  const id = button.dataset.id;
  if (act === "add" || act === "plus") {
    const item = itemById(id);
    const line = shop.cart.find((entry) => entry.id === id);
    const qty = line ? line.qty : 0;
    if (qty >= shop.stock[id]) {
      shop.note = "Stok tidak cukup.";
    } else if (line) line.qty += 1;
    else shop.cart.push({ id, qty: 1 });
  } else if (act === "minus") {
    const line = shop.cart.find((entry) => entry.id === id);
    if (!line) return;
    line.qty -= 1;
    if (line.qty <= 0) shop.cart = shop.cart.filter((entry) => entry !== line);
  } else if (act === "clear-cart") {
    shop.cart = [];
  } else if (act === "to-pay") {
    shop.screen = "pay";
    shop.note = "";
  } else if (act === "back-sale" || act === "new-sale") {
    shop.screen = "sale";
    shop.viewing = null;
    shop.note = "";
  } else if (act === "pay-qris") {
    checkout("QRIS", totals().total);
  } else if (act === "pay-cash") {
    const input = document.querySelector(".term-screen input[name='tender']");
    const amount = Number(String(input?.value || shop.tender).replace(/\D/g, ""));
    shop.tender = input?.value || "";
    if (!amount) shop.note = "Isi uang yang diterima.";
    else checkout("Tunai", amount);
  } else if (act === "tab-kasir") {
    shop.tab = "kasir";
    if (shop.screen === "receipt") shop.screen = "sale";
    shop.viewing = null;
  } else if (act === "tab-riwayat") {
    shop.tab = "riwayat";
    shop.screen = "sale";
    shop.viewing = null;
  } else if (act === "open-receipt") {
    shop.viewing = shop.history[Number(button.dataset.index)];
    shop.screen = "receipt";
  } else if (act === "close-shift") {
    if (shop.cart.length) {
      shop.note = "Selesaikan atau kosongkan keranjang sebelum menutup shift.";
    } else {
      shop.closed = true;
      shop.tab = "riwayat";
      shop.note = "";
    }
  } else if (act === "open-shift") {
    shop.closed = false;
    shop.history = [];
    shop.cart = [];
    shop.stock = freshStock();
    shop.discountRate = 0;
    shop.code = "";
    shop.note = "Shift baru. Stok kembali ke awal.";
    shop.tab = "kasir";
    shop.screen = "sale";
    shop.viewing = null;
  }
  renderTerminal();
}

function onTerminalInput(event) {
  if (event.target.name === "code") shop.code = event.target.value;
  if (event.target.name === "tender") shop.tender = event.target.value;
}

function onTerminalSubmit(event) {
  const form = event.target.closest("[data-code-form]");
  if (!form) return;
  event.preventDefault();
  const input = form.querySelector("input[name='code']");
  shop.code = input.value;
  applyCode();
  renderTerminal();
}

const terminal = document.getElementById("terminal");
terminal.addEventListener("click", onTerminalClick);
terminal.addEventListener("input", onTerminalInput);
terminal.addEventListener("submit", onTerminalSubmit);
renderTerminal();
window.setInterval(() => {
  const node = document.querySelector("[data-clock]");
  if (node) node.textContent = `${clockFormat.format(new Date())} WIB`;
}, 10000);

const initial = worldFromHash();
applyWorld(initial);
history.replaceState({ world: initial }, "", HASH[initial]);
document.fonts?.ready.then(() => syncSplit());
