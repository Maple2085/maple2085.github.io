/**
 * 🚀 XIAOMI NOTES ULTIMATE EXPORTER (GEEK EDITION)
 * ------------------------------------------------
 * @version 3.0.0
 * @author Gemini Assistant
 * @features ConsoleUI, DarkMode, Search, Glassmorphism, SafeStop
 */

(async function() {
    // ==========================================
    // 1. 配置与工具 (CONFIG & UTILS)
    // ==========================================
    const CONFIG = {
        fileName: `小米笔记_极客版_${new Date().toISOString().slice(0,10)}.html`,
        delay: 350, // 请求间隔(ms)，防止封控
        batchLimit: 200 // 单次请求条数
    };

    // 全局状态
    const STATE = {
        stopSignal: false,
        total: 0,
        current: 0,
        startTime: Date.now()
    };

    // 极客风控制台工具
    const UI = {
        banner: () => {
            console.clear();
            console.log(`%c
███    ███ ██ ██      ███    ██  ██████  ████████ ███████ 
████  ████ ██ ██      ████   ██ ██    ██    ██    ██      
██ ████ ██ ██ ██      ██ ██  ██ ██    ██    ██    ███████ 
██  ██  ██ ██ ██      ██  ██ ██ ██    ██    ██         ██ 
██      ██ ██ ██      ██   ████  ██████     ██    ███████ 
            `, "color: #FF6900; font-weight: bold;");
            console.log(`%c :: GEEK EDITION :: %c v3.0 Ready `, "background:#333;color:#fff;border-radius:3px;", "color:#888");
        },
        log: (msg, type = 'info') => {
            const colors = { info: '#00B0FF', success: '#00E676', warn: '#FFEA00', error: '#FF1744' };
            const icon = { info: 'ℹ️', success: '✅', warn: '⚠️', error: '❌' };
            console.log(`%c${icon[type]} [${new Date().toLocaleTimeString()}] %c${msg}`, `font-size:12px`, `color:${colors[type]}; font-family: monospace;`);
        },
        progress: (current, total, detail = "") => {
            const percent = total > 0 ? Math.floor((current / total) * 100) : 0;
            const barLength = 20;
            const filled = Math.floor((percent / 100) * barLength);
            const bar = "█".repeat(filled) + "░".repeat(barLength - filled);
            console.log(`%c[${bar}] ${percent}% %c ${detail}`, "color: #FF6900", "color: #999");
        }
    };

    // 挂载屏幕上的“紧急停止”按钮
    const createStopButton = () => {
        const btn = document.createElement("button");
        Object.assign(btn.style, {
            position: "fixed", top: "15px", right: "15px", zIndex: "999999",
            background: "rgba(255, 59, 48, 0.9)", color: "white", backdropFilter: "blur(10px)",
            border: "none", borderRadius: "8px", padding: "10px 20px",
            fontFamily: "system-ui", fontWeight: "600", boxShadow: "0 4px 15px rgba(255,59,48,0.4)",
            cursor: "pointer", transition: "all 0.2s"
        });
        btn.innerHTML = `<span>🛑 停止并保存</span> <span id="xm_counter" style="font-size:0.9em;opacity:0.8;margin-left:5px">(0)</span>`;
        btn.onclick = () => {
            STATE.stopSignal = true;
            btn.innerHTML = "⏳ 正在打包数据...";
            btn.style.background = "#8E8E93";
            UI.log("用户触发停止信号，正在终止任务...", "warn");
        };
        document.body.appendChild(btn);
        return btn;
    };

    const updateCounter = (num) => {
        const el = document.getElementById("xm_counter");
        if(el) el.innerText = `(${num})`;
    };

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    // ==========================================
    // 2. 核心逻辑 (CORE LOGIC)
    // ==========================================
    
    // 获取列表（支持分页与中断）
    async function fetchList() {
        let entries = [];
        let syncTag = "";
        let more = true;
        let page = 1;

        UI.log("开始扫描笔记列表...", "info");

        while (more && !STATE.stopSignal) {
            try {
                const url = `https://i.mi.com/note/full/page/?ts=${Date.now()}&limit=${CONFIG.batchLimit}${syncTag ? '&syncTag='+syncTag : ''}`;
                const res = await fetch(url).then(r => r.json());
                
                if (res.data && res.data.entries) {
                    const batch = res.data.entries;
                    if (batch.length === 0) break; // 防死循环

                    entries = entries.concat(batch);
                    syncTag = res.data.syncTag;
                    
                    UI.log(`Page ${page}: 扫描到 ${batch.length} 条索引`, "info");
                    updateCounter(entries.length);
                    
                    if (!syncTag) more = false;
                    page++;
                    await sleep(CONFIG.delay);
                } else {
                    more = false;
                }
            } catch (e) {
                UI.log("列表获取中断: " + e.message, "error");
                more = false;
            }
        }
        return entries;
    }

    // 获取详情（带进度条）
    async function fetchDetails(list) {
        const results = [];
        STATE.total = list.length;
        
        UI.log(`索引扫描完成，准备下载 ${STATE.total} 条笔记详情...`, "success");

        for (let i = 0; i < list.length; i++) {
            if (STATE.stopSignal) break;

            try {
                const res = await fetch(`https://i.mi.com/note/note/${list[i].id}/?ts=${Date.now()}`).then(r => r.json());
                const entry = res.data.entry;
                let title = "无标题笔记";
                try { 
                    const extra = JSON.parse(entry.extraInfo);
                    if(extra.title) title = extra.title;
                } catch (e) {}

                // 数据清洗
                const content = entry.content || "";
                // 简单的预览摘要 (取前50字)
                const snippet = content.replace(/<[^>]+>/g, "").slice(0, 30).replace(/\n/g, " ") + "...";

                results.push({
                    id: list[i].id,
                    title: title,
                    date: list[i].createDate,
                    content: content,
                    folderId: entry.folderId
                });

                STATE.current++;
                updateCounter(`${STATE.current}/${STATE.total}`);
                
                // 极客流式日志：每5条打印一次，或者最后一条
                if (i % 5 === 0 || i === list.length - 1) {
                    UI.progress(i + 1, list.length, `正在获取: ${title.slice(0,10)}`);
                }

                if (i % 20 === 0) await sleep(CONFIG.delay * 1.5); // 动态延时

            } catch (e) {
                UI.log(`跳过损坏笔记 ID: ${list[i].id}`, "warn");
            }
        }
        return results;
    }

    // ==========================================
    // 3. 生成器 (HTML GENERATOR)
    // ==========================================
    const generateHTML = (data) => {
        // 按时间倒序
        data.sort((a, b) => b.date - a.date);
        
        const count = data.length;
        const dateStr = new Date().toLocaleDateString();

        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>小米笔记归档 (${count})</title>
<style>
:root {
    --bg-color: #F5F5F7;
    --sidebar-bg: rgba(255, 255, 255, 0.85);
    --card-bg: #FFFFFF;
    --text-primary: #1D1D1F;
    --text-secondary: #86868B;
    --accent-color: #007AFF;
    --border-color: rgba(0,0,0,0.1);
    --highlight: #FFF3CD;
}
@media (prefers-color-scheme: dark) {
    :root {
        --bg-color: #000000;
        --sidebar-bg: rgba(28, 28, 30, 0.85);
        --card-bg: #1C1C1E;
        --text-primary: #F5F5F7;
        --text-secondary: #86868B;
        --accent-color: #0A84FF;
        --border-color: rgba(255,255,255,0.1);
        --highlight: #3A3A3C;
    }
}
* { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
body {
    margin: 0; padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
    background-color: var(--bg-color);
    color: var(--text-primary);
    display: flex; height: 100vh; overflow: hidden;
}
/* Layout */
.app-container { display: flex; width: 100%; height: 100%; }
.sidebar {
    width: 320px; flex-shrink: 0; display: flex; flex-direction: column;
    background: var(--sidebar-bg);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border-right: 1px solid var(--border-color);
    z-index: 10;
}
.main-content {
    flex: 1; overflow-y: auto; scroll-behavior: smooth;
    padding: 40px 60px; position: relative;
}
/* Sidebar Elements */
.sidebar-header {
    padding: 20px; border-bottom: 1px solid var(--border-color);
}
.app-title { font-size: 20px; font-weight: 700; margin-bottom: 5px; }
.app-subtitle { font-size: 13px; color: var(--text-secondary); }
.search-box {
    margin-top: 15px; position: relative;
}
.search-input {
    width: 100%; padding: 8px 30px; border-radius: 8px; border: none;
    background: rgba(120, 120, 128, 0.1); color: var(--text-primary);
    font-size: 14px; outline: none; transition: background 0.2s;
}
.search-input:focus { background: rgba(120, 120, 128, 0.2); }
.search-icon { position: absolute; left: 8px; top: 8px; color: var(--text-secondary); font-size: 14px; }
.note-list { overflow-y: auto; flex: 1; padding: 10px; }
.list-item {
    padding: 12px 15px; border-radius: 8px; cursor: pointer;
    margin-bottom: 5px; transition: background 0.2s;
}
.list-item:hover { background: rgba(120, 120, 128, 0.1); }
.list-item.active { background: var(--accent-color); color: white; }
.list-item.active .list-date { color: rgba(255,255,255,0.8); }
.list-title { font-size: 14px; font-weight: 600; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.list-date { font-size: 12px; color: var(--text-secondary); }

/* Main Card */
.note-card {
    max-width: 800px; margin: 0 auto 50px auto;
    background: var(--card-bg);
    border-radius: 18px;
    padding: 40px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    transition: transform 0.3s, background-color 0.5s;
}
.note-header { margin-bottom: 30px; border-bottom: 1px solid var(--border-color); padding-bottom: 20px; position: relative; }
.note-title { font-size: 28px; font-weight: 800; line-height: 1.2; margin: 0 0 10px 0; }
.note-meta { font-size: 13px; color: var(--text-secondary); display: flex; gap: 15px; }
.copy-btn {
    position: absolute; right: 0; top: 0;
    background: rgba(120, 120, 128, 0.1); border: none;
    width: 32px; height: 32px; border-radius: 50%;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
}
.copy-btn:hover { background: var(--accent-color); color: white; }
.note-body {
    font-size: 17px; line-height: 1.6; color: var(--text-primary);
    white-space: pre-wrap; overflow-wrap: break-word;
}
.note-body img {
    max-width: 100%; border-radius: 12px; margin: 20px 0;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}
/* Animation */
@keyframes flash {
    0% { background-color: var(--card-bg); }
    50% { background-color: var(--highlight); transform: scale(1.02); }
    100% { background-color: var(--card-bg); transform: scale(1); }
}
.flash-anim { animation: flash 0.6s ease-in-out; }

/* Responsive Mobile */
@media (max-width: 768px) {
    .sidebar { position: fixed; left: -100%; height: 100%; width: 85%; transition: 0.3s; box-shadow: 10px 0 30px rgba(0,0,0,0.2); }
    .sidebar.open { left: 0; }
    .main-content { padding: 20px; padding-top: 70px; }
    .mobile-menu { display: block; position: fixed; top: 15px; left: 15px; z-index: 20; padding: 10px; background: var(--card-bg); border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); cursor: pointer;} 
    .note-card { padding: 25px; }
}
@media (min-width: 769px) { .mobile-menu { display: none; } }
</style>
</head>
<body>

<div class="mobile-menu" onclick="toggleSidebar()">☰ 目录</div>

<div class="app-container">
    <div class="sidebar" id="sidebar">
        <div class="sidebar-header">
            <div class="app-title">Notes Archive</div>
            <div class="app-subtitle">生成于 ${dateStr} • 共 ${count} 条</div>
            <div class="search-box">
                <span class="search-icon">🔍</span>
                <input type="text" class="search-input" placeholder="搜索标题..." oninput="filterList(this.value)">
            </div>
        </div>
        <div class="note-list" id="noteList">
            <!-- JS Generated List -->
        </div>
    </div>

    <div class="main-content">
        ${data.map((note, index) => `
        <div class="note-card" id="note-${note.id}">
            <div class="note-header">
                <h1 class="note-title">${note.title || '无标题'}</h1>
                <div class="note-meta">
                    <span>📅 ${new Date(note.date).toLocaleString()}</span>
                    <span>📝 ${note.content.length} 字</span>
                </div>
                <button class="copy-btn" title="复制内容" onclick="copyContent('${note.id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
            </div>
            <div class="note-body">${note.content}</div>
        </div>
        `).join('')}
        <div style="text-align:center; color: var(--text-secondary); margin-top:50px; padding-bottom: 50px;">
            End of Archive
        </div>
    </div>
</div>

<script>
// Data for Sidebar
const notes = ${JSON.stringify(data.map(n => ({id: n.id, title: n.title, date: n.date})))};

// Init Sidebar
const listEl = document.getElementById('noteList');
function renderList(items) {
    listEl.innerHTML = items.map(n => {
        const d = new Date(n.date);
        const dateFmt = d.getFullYear() + '/' + (d.getMonth()+1) + '/' + d.getDate();
        return \`<div class="list-item" onclick="scrollToNote('\${n.id}')">
            <div class="list-title">\${n.title || '无标题'}</div>
            <div class="list-date">\${dateFmt}</div>
        </div>\`;
    }).join('');
}
renderList(notes);

// Filter Logic
function filterList(keyword) {
    const k = keyword.toLowerCase();
    const filtered = notes.filter(n => (n.title || '').toLowerCase().includes(k));
    renderList(filtered);
}

// Scroll & Highlight Logic
function scrollToNote(id) {
    const el = document.getElementById('note-' + id);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // 移除旧动画，确保每次都能触发
        el.classList.remove('flash-anim');
        void el.offsetWidth;
        // 使用 IntersectionObserver 检测滚动完成
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                el.classList.add('flash-anim');
                observer.disconnect();
                if(window.innerWidth <= 768) toggleSidebar();
            }
        }, { threshold: 0 }); // 只要进入视口就触发
        observer.observe(el);
    }
}

// Mobile Toggle
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// Copy Logic
function copyContent(id) {
    const card = document.getElementById('note-' + id);
    const title = card.querySelector('.note-title').innerText;
    const date = card.querySelector('.note-meta span').innerText;
    const body = card.querySelector('.note-body').innerText;
    
    const text = \`\${title}\\n\${date}\\n------------------\\n\${body}\`;
    
    navigator.clipboard.writeText(text).then(() => {
        alert('已复制到剪贴板');
    });
}
</script>
</body>
</html>`;
    };

    const downloadFile = (content, filename) => {
        const blob = new Blob([content], { type: "text/html;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    };

    // ==========================================
    // 4. 执行流程 (EXECUTION)
    // ==========================================
    UI.banner();
    const stopBtn = createStopButton();

    try {
        const list = await fetchList();
        
        if (list.length > 0) {
            const finalData = await fetchDetails(list);
            
            UI.log(`正在生成 High-Performance HTML 文件...`, "info");
            const html = generateHTML(finalData);
            
            downloadFile(html, CONFIG.fileName);
            UI.log(`SUCCESS! 文件已导出: ${CONFIG.fileName}`, "success");
            console.log("%c 任务完成。请检查下载文件夹。 ", "background: #00E676; color: white; padding: 4px; border-radius: 4px;");
        } else {
            UI.log("未找到任何笔记，任务结束。", "warn");
        }

    } catch (e) {
        UI.log("运行时严重错误: " + e.message, "error");
    } finally {
        if(stopBtn) stopBtn.remove();
    }

})();
