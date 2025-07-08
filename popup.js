class BookmarkManager {
    constructor() {
        this.currentTheme = localStorage.getItem('bookmarkTheme') || 'light';
        this.init();
    }

    async init() {
        this.initTheme();
        await this.loadCurrentPage();
        await this.loadGroups();
        this.bindEvents();
    }

    initTheme() {
        document.body.setAttribute('data-theme', this.currentTheme);
        this.updateThemeIcon();
    }

    updateThemeIcon() {
        const themeBtn = document.getElementById('themeToggle');
        const isDark = this.currentTheme === 'dark';
        
        themeBtn.innerHTML = isDark ? 
            `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>` :
            `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>`;
    }

    async loadCurrentPage() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            document.getElementById('pageTitle').textContent = tab.title;
            document.getElementById('pageUrl').textContent = tab.url;
            document.getElementById('bookmarkTitle').value = tab.title;
            document.getElementById('bookmarkUrl').value = tab.url;
            
            // 加载页面图标
            const favicon = document.getElementById('pageFavicon');
            if (tab.favIconUrl) {
                favicon.src = tab.favIconUrl;
                favicon.style.display = 'block';
            } else {
                // 使用默认图标服务
                const domain = new URL(tab.url).hostname;
                favicon.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
                favicon.style.display = 'block';
            }
        } catch (error) {
            console.error('获取当前页面信息失败:', error);
        }
    }

    async loadGroups() {
        try {
            const result = await chrome.storage.sync.get(['bookmarkGroups']);
            const groups = result.bookmarkGroups || ['其他', '工作', '学习', '娱乐'];
            const select = document.getElementById('bookmarkGroup');
            
            select.innerHTML = '';
            groups.forEach(group => {
                const option = document.createElement('option');
                option.value = group;
                option.textContent = group;
                select.appendChild(option);
            });

            // 添加新建分组选项
            const newOption = document.createElement('option');
            newOption.value = '新建分组';
            newOption.textContent = '+ 新建分组';
            select.appendChild(newOption);
        } catch (error) {
            console.error('加载分组失败:', error);
        }
    }

    bindEvents() {
        // 主题切换
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // 添加书签按钮
        document.getElementById('addBookmark').addEventListener('click', () => {
            document.getElementById('bookmarkForm').style.display = 'block';
        });

        // 取消添加
        document.getElementById('cancelBookmark').addEventListener('click', () => {
            document.getElementById('bookmarkForm').style.display = 'none';
        });

        // 保存书签
        document.getElementById('saveBookmark').addEventListener('click', () => {
            this.saveBookmark();
        });

        // 分组选择变化
        document.getElementById('bookmarkGroup').addEventListener('change', (e) => {
            const newGroupInput = document.getElementById('newGroup');
            if (e.target.value === '新建分组') {
                newGroupInput.style.display = 'block';
                newGroupInput.focus();
            } else {
                newGroupInput.style.display = 'none';
            }
        });

        // 打开书签管理页
        document.getElementById('openNewtab').addEventListener('click', () => {
            chrome.tabs.create({ url: 'chrome://newtab/' });
            window.close();
        });

        // 批量导入
        document.getElementById('importBookmarks').addEventListener('click', () => {
            this.importBookmarks();
        });
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('bookmarkTheme', this.currentTheme);
        document.body.setAttribute('data-theme', this.currentTheme);
        this.updateThemeIcon();
    }

    async saveBookmark() {
        const title = document.getElementById('bookmarkTitle').value.trim();
        const url = document.getElementById('bookmarkUrl').value.trim();
        let group = document.getElementById('bookmarkGroup').value;
        const newGroup = document.getElementById('newGroup').value.trim();

        if (!title || !url) {
            alert('请填写标题和网址');
            return;
        }

        if (group === '新建分组' && newGroup) {
            group = newGroup;
            await this.addNewGroup(group);
        }

        try {
            const bookmark = {
                id: Date.now().toString(),
                title,
                url,
                group,
                createdAt: new Date().toISOString(),
                favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`
            };

            await this.saveBookmarkToStorage(bookmark);
            
            // 显示成功消息
            this.showSuccessMessage('书签已保存');
            
            // 关闭表单
            document.getElementById('bookmarkForm').style.display = 'none';
            
        } catch (error) {
            console.error('保存书签失败:', error);
            alert('保存失败，请重试');
        }
    }

    async saveBookmarkToStorage(bookmark) {
        const result = await chrome.storage.sync.get(['customBookmarks']);
        const bookmarks = result.customBookmarks || [];
        
        // 智能去重
        const existingIndex = bookmarks.findIndex(b => 
            b.url === bookmark.url && b.group === bookmark.group
        );
        
        if (existingIndex !== -1) {
            bookmarks[existingIndex] = bookmark;
        } else {
            bookmarks.push(bookmark);
        }
        
        await chrome.storage.sync.set({ customBookmarks: bookmarks });
    }

    async addNewGroup(groupName) {
        const result = await chrome.storage.sync.get(['bookmarkGroups']);
        const groups = result.bookmarkGroups || ['其他', '工作', '学习', '娱乐'];
        
        if (!groups.includes(groupName)) {
            groups.push(groupName);
            await chrome.storage.sync.set({ bookmarkGroups: groups });
        }
    }

    showSuccessMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 12px;
            font-size: 14px;
            z-index: 1000;
            box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 2000);
    }

    importBookmarks() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.html';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.parseBookmarkFile(file);
            }
        };
        input.click();
    }

    async parseBookmarkFile(file) {
        const text = await file.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const links = doc.querySelectorAll('a[href]');
        
        const bookmarks = [];
        links.forEach(link => {
            const url = link.getAttribute('href');
            const title = link.textContent.trim();
            
            if (url && title && url.startsWith('http')) {
                bookmarks.push({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    title,
                    url,
                    group: '其他',
                    createdAt: new Date().toISOString(),
                    favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`
                });
            }
        });

        if (bookmarks.length > 0) {
            const result = await chrome.storage.sync.get(['customBookmarks']);
            const existingBookmarks = result.customBookmarks || [];
            
            // 智能去重
            const uniqueBookmarks = [];
            bookmarks.forEach(newBookmark => {
                const exists = existingBookmarks.some(existing => 
                    existing.url === newBookmark.url && existing.group === newBookmark.group
                );
                if (!exists) {
                    uniqueBookmarks.push(newBookmark);
                }
            });
            
            const allBookmarks = [...existingBookmarks, ...uniqueBookmarks];
            await chrome.storage.sync.set({ customBookmarks: allBookmarks });
            
            this.showSuccessMessage(`成功导入 ${uniqueBookmarks.length} 个书签`);
        } else {
            alert('未找到有效的书签链接');
        }
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new BookmarkManager();
});
