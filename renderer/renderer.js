/*
 * @Description: 
 * @Author: FBZ
 * @Date: 2025-12-24 11:10:33
 * @LastEditors: FBZ
 * @LastEditTime: 2025-12-24 11:39:49
 */
const $list = document.getElementById("versionList");
const $sub = document.getElementById("subText");
const $refresh = document.getElementById("refreshBtn");

function setSub(text, isError = false) {
  $sub.textContent = text;
  $sub.style.color = isError ? "rgba(255,92,122,.95)" : "";
}

function render({ versions, current }) {
  $list.innerHTML = "";
  setSub(current ? `当前版本：${current}` : "未检测到当前版本（nvm 输出可能异常）");

  versions.forEach(ver => {
    const el = document.createElement("div");
    el.className = "item" + (ver === current ? " current" : "");
    el.innerHTML = `
      <div class="ver">${ver}</div>
      <div class="badge">${ver === current ? "当前" : "切换"}</div>
    `;

    el.addEventListener("click", async () => {
      if (ver === current) return;
      el.classList.add("loading");
      setSub(`正在切换到 ${ver}…`);

      try {
        const result = await window.nvmAPI.use(ver);
        render(result);
      } catch (e) {
        setSub(`切换失败：${e?.message || e}`, true);
      } finally {
        el.classList.remove("loading");
      }
    });

    $list.appendChild(el);
  });
}

async function refresh() {
  setSub("正在读取已安装版本…");
  try {
    const data = await window.nvmAPI.list();
    render(data);
  } catch (e) {
    setSub(`读取失败：${e?.message || e}`, true);
  }
}

$refresh.addEventListener("click", refresh);
refresh();


const $pinBtn = document.getElementById("pinBtn");
let pinned = false;

async function syncPinState() {
  pinned = await window.appAPI.getAlwaysOnTop();
  $pinBtn.textContent = `置顶：${pinned ? "开启" : "关闭"}`;
}

$pinBtn.addEventListener("click", async () => {
  pinned = await window.appAPI.setAlwaysOnTop(!pinned);
  $pinBtn.textContent = `置顶：${pinned ? "开启" : "关闭"}`;
});

syncPinState();
