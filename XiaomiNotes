// ———————— 小米笔记导出脚本 (含一键复制兼容版) ————————

(async function () {
    const CONFIG = {
        orderType: 1, 
        fileName: "小米笔记导出_含复制功能.html"
    };

    console.log("🚀 脚本已启动...");

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
        let entries = [];
        let syncTag = "";
        let more = true;
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
                let title = "无标题";
                try { title = JSON.parse(entry.extraInfo).title || "无标题"; } catch (e) {}
                results.push({ title, date: list[i].createDate, content: entry.content });
                if ((i + 1) % 10 === 0) console.log(`进度: ${i + 1}/${list.length}`);
            } catch (e) { console.error(`失败 ID: ${list[i].id}`, e); }
        }
        return results;
    }

    const list = await getList();
    if (!list.length) return alert("未找到笔记！");
    const fullData = await getDetails(list);
    fullData.sort((a, b) => CONFIG.orderType === 1 ? b.date - a.date : a.date - b.date);

    // --- 构建 HTML 结构 ---
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>小米笔记备份</title>
    <style>
        body { font-family: sans-serif; background: #f4f7f9; padding: 20px; color: #333; }
        .container { max-width: 800px; margin: 0 auto; }
        .note { background: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); position: relative; }
        .meta { color: #999; font-size: 12px; margin-bottom: 8px; }
        .title { font-size: 18px; font-weight: bold; margin-bottom: 12px; color: #000; padding-right: 80px; }
        .content { line-height: 1.6; word-wrap: break-word; white-space: pre-wrap; border-top: 1px dashed #eee; padding-top: 15px; }
        img { max-width: 100%; height: auto; display: block; margin: 10px 0; border-radius: 4px; }
        
        /* 按钮样式 */
        .copy-btn {
            position: absolute; top: 20px; right: 20px;
            padding: 6px 12px; background: #007aff; color: #fff;
            border: none; border-radius: 4px; cursor: pointer; font-size: 13px;
            transition: background 0.2s;
        }
        .copy-btn:hover { background: #005ecb; }
        .copy-btn.success { background: #4cd964; }
    </style>
    <script>
        // 核心兼容性复制函数
        function copyNote(btn) {
            const noteElement = btn.parentElement;
            // 获取正文内容（包括标题和日期）
            const title = noteElement.querySelector('.title').innerText;
            const date = noteElement.querySelector('.meta').innerText;
            const content = noteElement.querySelector('.content').innerText;
            const fullText = title + "\\n" + date + "\\n\\n" + content;

            // 备选方案：老式传统复制方法
            function fallbackCopy(text) {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                // 确保不可见但存在于 DOM 中
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "0";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand('copy');
                    showSuccess();
                } catch (err) {
                    alert('复制失败，请手动选择复制');
                }
                document.body.removeChild(textArea);
            }

            function showSuccess() {
                const oldText = btn.innerText;
                btn.innerText = "已复制 √";
                btn.classList.add('success');
                setTimeout(() => {
                    btn.innerText = oldText;
                    btn.classList.remove('success');
                }, 1500);
            }

            // 优先尝试现代 API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(fullText).then(showSuccess).catch(() => fallbackCopy(fullText));
            } else {
                fallbackCopy(fullText);
            }
        }
    </script>
    </head><body><div class="container">
    <h2 style="text-align:center">📦 小米笔记图文备份</h2>`;

    fullData.forEach(item => {
        html += `
        <div class="note">
            <button class="copy-btn" onclick="copyNote(this)">一键复制</button>
            <div class="meta">日期: ${formatDate(item.date)}</div>
            <div class="title">${item.title}</div>
            <div class="content">${item.content}</div>
        </div>`;
    });

    html += `</div></body></html>`;

    downloadFile(html, CONFIG.fileName);
    console.log("✅ 导出完成！");
})();
