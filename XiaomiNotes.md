(async function () {
    const CONFIG = { orderType: 1, fileName: "小米笔记_精致版.html" };
    const formatDate = (ts) => {
        const d = new Date(ts);
        const p = (n) => n.toString().padStart(2, "0");
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
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

    async function getList() {
        let entries = []; let syncTag = ""; let more = true;
        while (more) {
            const url = `https://i.mi.com/note/full/page/?ts=${Date.now()}&limit=200${syncTag ? '&syncTag='+syncTag : ''}`;
            const res = await fetch(url).then(r => r.json());
            if (res.data && res.data.entries) {
                entries = entries.concat(res.data.entries);
                syncTag = res.data.syncTag;
                if (res.data.entries.length < 200 || !syncTag) more = false;
            } else { more = false; }
        }
        return entries;
    }

    async function getDetails(list) {
        const results = [];
        for (let i = 0; i < list.length; i++) {
            try {
                const res = await fetch(`https://i.mi.com/note/note/${list[i].id}/?ts=${Date.now()}`).then(r => r.json());
                const entry = res.data.entry;
                let title = "";
                try { title = JSON.parse(entry.extraInfo).title; } catch (e) {}
                results.push({ id: list[i].id, title: title || "未命名笔记", date: list[i].createDate, content: entry.content });
                if ((i + 1) % 10 === 0) console.log(`进度: ${i + 1}/${list.length}`);
            } catch (e) { console.error(`失败 ID: ${list[i].id}`, e); }
        }
        return results;
    }

    const list = await getList();
    if (!list.length) return alert("未找到笔记！");
    const fullData = await getDetails(list);
    fullData.sort((a, b) => CONFIG.orderType === 1 ? b.date - a.date : a.date - b.date);

    let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>小米笔记精致备份</title>
    <style>
        :root {
            --primary-blue: #007AFF;
            --success-green: #34C759;
            --error-red: #FF3B30;
        }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
            background: #F2F2F7; margin: 0; padding: 0; color: #1C1C1E; overflow-x: hidden; 
        }
        
        /* 顶部栏 */
        .top-bar {
            position: fixed; top: 0; width: 100%; height: 60px;
            background: rgba(255,255,255,0.8); backdrop-filter: blur(10px);
            display: flex; align-items: center; padding: 0 20px;
            box-shadow: 0 1px 0 rgba(0,0,0,0.05); z-index: 100;
        }
        .menu-btn { font-size: 24px; cursor: pointer; color: var(--primary-blue); font-weight: bold; }
        .top-title { margin-left: 15px; font-weight: 600; font-size: 18px; }

        /* 侧边栏 */
        .sidebar {
            position: fixed; top: 0; left: -300px; width: 300px; height: 100%;
            background: #fff; z-index: 200; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex; flex-direction: column;
        }
        .sidebar.open { transform: translateX(300px); }
        .sidebar-header { padding: 25px 20px; font-size: 20px; font-weight: 700; border-bottom: 1px solid #F2F2F7; }
        .sidebar-list { overflow-y: auto; flex: 1; }
        .sidebar-item { 
            padding: 15px 20px; border-bottom: 1px solid #F2F2F7; cursor: pointer;
        }
        .sidebar-item:active { background: #E5E5EA; }
        .sidebar-item .s-date { font-size: 11px; color: #8E8E93; display: block; margin-bottom: 4px; }
        .sidebar-item .s-title { 
            display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; 
            font-size: 14px; color: #3A3A3C; font-weight: 500;
        }

        /* 遮罩 */
        .overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.3); display: none; z-index: 150;
        }
        .overlay.show { display: block; }

        /* 主体内容 */
        .container { max-width: 800px; margin: 80px auto 40px; padding: 0 16px; }
        .note { 
            background: #fff; border-radius: 16px; padding: 24px; 
            margin-bottom: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); 
            position: relative; scroll-margin-top: 80px; 
            transition: background 0.5s ease;
        }
        
        /* 标题样式强化 */
        .title { 
            font-size: 24px; font-weight: 800; line-height: 1.25; 
            color: #000; margin: 0 0 8px 0; padding-right: 80px;
            word-break: break-all;
        }
        .meta { color: #8E8E93; font-size: 13px; margin-bottom: 20px; font-weight: 400; }
        .content { 
            line-height: 1.7; border-top: 1px solid #F2F2F7; padding-top: 18px;
            white-space: pre-wrap; overflow-wrap: break-word; font-size: 16px; color: #2C2C2E;
        }
        img { max-width: 100% !important; height: auto !important; display: block; margin: 15px 0; border-radius: 10px; }
        
        /* 复制按钮精致化 */
        .copy-btn {
            position: absolute; top: 24px; right: 24px;
            padding: 6px 14px; background: var(--primary-blue); color: #fff;
            border: none; border-radius: 20px; cursor: pointer; font-size: 12px;
            font-weight: 600; transition: all 0.2s ease;
            box-shadow: 0 2px 6px rgba(0,122,255,0.2);
        }
        .copy-btn:active { transform: scale(0.95); opacity: 0.8; }
        .copy-btn.success { background: var(--success-green); box-shadow: 0 2px 6px rgba(52,199,89,0.2); }
        .copy-btn.error { background: var(--error-red); box-shadow: 0 2px 6px rgba(255,59,48,0.2); }
        
        /* 延迟触发的高亮提示 */
        .highlight-flash { background: #FFF9C4 !important; }
    </style>
    </head><body>
    
    <div class="top-bar">
        <div class="menu-btn" onclick="toggleMenu()">☰</div>
        <div class="top-title">笔记库 (${fullData.length})</div>
    </div>

    <div class="overlay" id="overlay" onclick="toggleMenu()"></div>

    <nav class="sidebar" id="sidebar">
        <div class="sidebar-header">目录导航</div>
        <div class="sidebar-list">`;

    fullData.forEach((item, index) => {
        html += `
        <div class="sidebar-item" onclick="handleNav('note-${index}')">
            <span class="s-date">${formatDate(item.date)}</span>
            <span class="s-title">${item.title}</span>
        </div>`;
    });

    html += `</div></nav><div class="container">`;

    fullData.forEach((item, index) => {
        html += `
        <div class="note" id="note-${index}">
            <button class="copy-btn" onclick="copyNote(this)">复制</button>
            <h1 class="title">${item.title}</h1>
            <div class="meta">${formatDate(item.date)}</div>
            <div class="content">${item.content}</div>
        </div>`;
    });

    html += `</div>
    <script>
        function toggleMenu() {
            const sb = document.getElementById('sidebar');
            const ov = document.getElementById('overlay');
            sb.classList.toggle('open');
            ov.classList.toggle('show');
        }

        // 处理导航定位
        function handleNav(id) {
            toggleMenu();
            const el = document.getElementById(id);
            
            // 1. 平滑滚动
            el.scrollIntoView({ behavior: 'smooth' });

            // 2. 核心逻辑：监听滚动停止
            let isScrolling;
            window.addEventListener('scroll', function scrollEnd() {
                window.clearTimeout(isScrolling);
                isScrolling = setTimeout(function() {
                    // 滚动停止后执行闪烁
                    el.classList.add('highlight-flash');
                    setTimeout(() => el.classList.remove('highlight-flash'), 1000);
                    window.removeEventListener('scroll', scrollEnd);
                }, 100);
            }, false);
        }

        function copyNote(btn) {
            const note = btn.parentElement;
            const text = note.querySelector('.title').innerText + "\\n" + 
                         note.querySelector('.meta').innerText + "\\n\\n" + 
                         note.querySelector('.content').innerText;
            
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed"; textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.select();
            
            const setBtnState = (state, text, icon) => {
                btn.innerText = icon + " " + text;
                btn.className = 'copy-btn ' + state;
                setTimeout(() => {
                    btn.innerText = "复制";
                    btn.className = 'copy-btn';
                }, 2000);
            };

            try {
                const successful = document.execCommand('copy');
                if(successful) setBtnState('success', '已复制', '✅');
                else setBtnState('error', '失败', '❌');
            } catch (err) {
                setBtnState('error', '失败', '❌');
            }
            document.body.removeChild(textArea);
        }
    </script>
    </body></html>`;
    
    downloadFile(html, CONFIG.fileName);
})();
