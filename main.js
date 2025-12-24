// main.js
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { execFile } = require("child_process");

let win;

function execCmd(command, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      "cmd.exe",
      ["/d", "/s", "/c", command],
      { windowsHide: true, ...options },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve({ stdout, stderr });
      }
    );
  });
}

async function isAdmin() {
  try {
    // NET SESSION 需要管理员权限，否则会返回非 0
    await execCmd("NET SESSION >NUL 2>&1");
    return true;
  } catch {
    return false;
  }
}

async function relaunchAsAdmin() {
  // 让当前 exe 以管理员权限重新启动
  const exe = process.execPath;
  const args = process.argv.slice(1); // 保留参数（开发阶段可能包含脚本路径等）
  const argStr = args.map(a => `"${a.replaceAll('"', '\\"')}"`).join(" ");

  // PowerShell 提权启动
  const ps = [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    `Start-Process -FilePath "${exe}" -ArgumentList '${argStr}' -Verb RunAs`
  ];

  return new Promise((resolve, reject) => {
    execFile("powershell.exe", ps, { windowsHide: true }, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 420,
    height: 560,
    resizable: true,
    useContentSize: true,
    backgroundColor: "#08182D",
    title: "NVM 一键切换",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true
    }
  });

  // 隐藏菜单栏（Alt 也不会唤出）
  win.setMenuBarVisibility(false);
  win.setAutoHideMenuBar(true);

  win.loadFile(path.join(__dirname, "renderer/index.html"));
}

function parseNvmList(output) {
  // Windows nvm 的输出一般类似：
  //   * 20.11.1 (Currently using 64-bit executable)
  //     18.20.3
  //     16.20.2
  const lines = output.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const versions = [];
  let current = null;

  for (const line of lines) {
    // 版本行可能带 * 或带括号说明
    const m = line.match(/^(\*?\s*)?v?(\d+\.\d+\.\d+)(\s+.*)?$/);
    if (!m) continue;

    const ver = m[2];
    versions.push(ver);
    if (line.startsWith("*")) current = ver;
  }

  // 去重 + 简单按 semver 降序（避免字符串排序错乱）
  const uniq = Array.from(new Set(versions));
  uniq.sort((a, b) => {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
      if (pa[i] !== pb[i]) return pb[i] - pa[i];
    }
    return 0;
  });

  return { versions: uniq, current };
}

ipcMain.handle("nvm:list", async () => {
  // 你说的 nvm ls 也许可用，但 Windows nvm 官方是 nvm list
  const { stdout } = await execCmd("nvm list");
  return parseNvmList(stdout);
});

ipcMain.handle("nvm:use", async (_evt, version) => {
  // 关键：如果主进程已是管理员，这里不会再弹 UAC
  await execCmd(`nvm use ${version}`);
  // 切换后再读一次，刷新高亮
  const { stdout } = await execCmd("nvm list");
  return parseNvmList(stdout);
});

ipcMain.handle("win:set-always-on-top", (_e, flag) => {
  if (!win) return false;
  win.setAlwaysOnTop(!!flag, "screen-saver"); // 置顶层级更稳定
  return win.isAlwaysOnTop();
});

ipcMain.handle("win:get-always-on-top", () => {
  if (!win) return false;
  return win.isAlwaysOnTop();
});

app.whenReady().then(async () => {
  // 启动即提权：只弹一次 UAC
  const admin = await isAdmin();
  if (!admin) {
    try {
      await relaunchAsAdmin();
    } catch (e) {
      // 用户点了“否”或系统拒绝
      // 这里你可以选择继续以普通权限运行，但 nvm use 会失败或弹 UAC
    }
    app.quit();
    return;
  }

  createWindow();
});

app.on("window-all-closed", () => {
  app.quit();
});
