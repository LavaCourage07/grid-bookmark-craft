class NewTabBookmarkManager {
    constructor() {
        this.bookmarks = [];
        this.currentFilter = 'all';
        this.currentEditBookmark = null;
        this.currentView = 'grid';
        this.sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        this.currentTheme = localStorage.getItem('bookmarkTheme') || 'light';
        this.init();
    }

    async init() {
        this.initTheme();
        this.initSidebar();
        await this.loadBookmarks();
        this.setupEventListeners();
        this.renderBookmarks();
        this.setupSearch();
    }

    initTheme() {
        document.body.setAttribute('data-theme', this.currentTheme);
        this.updateThemeIcon();
    }

    initSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (this.sidebarCollapsed) {
            sidebar.classList.add('collapsed');
        }
        this.updateSidebarToggleIcon();
    }

    updateThemeIcon() {
        const themeBtn = document.getElementById('themeToggle');
        const isDark = this.currentTheme === 'dark';
        
        themeBtn.innerHTML = isDark ? 
            `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>` :
            `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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

    updateSidebarToggleIcon() {
        const toggleBtn = document.getElementById('sidebarToggle');
        const isCollapsed = this.sidebarCollapsed;
        
        toggleBtn.innerHTML = isCollapsed ?
            `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="9" y1="18" x2="21" y2="6"></line>
                <line x1="21" y1="18" x2="9" y2="6"></line>
            </svg>` :
            `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>`;
    }

    async loadBookmarks() {
        try {
            // 加载自定义书签
            const result = await chrome.storage.sync.get(['customBookmarks', 'bookmarkGroups']);
            this.bookmarks = result.customBookmarks || [];
            this.groups = result.bookmarkGroups || ['其他', '工作', '学习', '娱乐'];
            
            // 也加载Chrome原生书签作为补充
            const chromeBookmarks = await this.loadChromeBookmarks();
            this.bookmarks = [...this.bookmarks, ...chromeBookmarks];
            
            this.renderGroupFilters();
        } catch (error) {
            console.error('加载书签失败:', error);
        }
    }

    async loadChromeBookmarks() {
        try {
            const bookmarkTree = await chrome.bookmarks.getTree();
            const bookmarks = [];
            
            const extractBookmarks = (nodes, group = '其他') => {
                nodes.forEach(node => {
                    if (node.url) {
                        bookmarks.push({
                            id: node.id,
                            title: node.title,
                            url: node.url,
                            group: group,
                            isChrome: true,
                            favicon: `https://www.google.com/s2/favicons?domain=${new URL(node.url).hostname}&sz=32`
                        });
                    } else if (node.children) {
                        extractBookmarks(node.children, node.title || '其他');
                    }
                });
            };
            
            extractBookmarks(bookmarkTree);
            return bookmarks;
        } catch (error) {
            console.error('加载Chrome书签失败:', error);
            return [];
        }
    }

    setupEventListeners() {
        // 主题切换
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // 侧边栏切换
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            this.toggleSidebar();
        });

        // 视图切换
        document.getElementById('gridView').addEventListener('click', () => {
            this.setView('grid');
        });

        document.getElementById('listView').addEventListener('click', () => {
            this.setView('list');
        });

        // 导入按钮
        document.getElementById('importBtn').addEventListener('click', () => {
            this.importBookmarks();
        });

        // 关闭模态框
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeEditModal();
        });

        // 保存编辑
        document.getElementById('saveEdit').addEventListener('click', () => {
            this.saveEdit();
        });

        // 删除书签
        document.getElementById('deleteBookmark').addEventListener('click', () => {
            this.deleteBookmark();
        });

        // 取消编辑
        document.getElementById('cancelEdit').addEventListener('click', () => {
            this.closeEditModal();
        });

        // 点击模态框外部关闭
        document.getElementById('editModal').addEventListener('click', (e) => {
            if (e.target.id === 'editModal') {
                this.closeEditModal();
            }
        });
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('bookmarkTheme', this.currentTheme);
        document.body.setAttribute('data-theme', this.currentTheme);
        this.updateThemeIcon();
    }

    toggleSidebar() {
        this.sidebarCollapsed = !this.sidebarCollapsed;
        localStorage.setItem('sidebarCollapsed', this.sidebarCollapsed);
        
        const sidebar = document.getElementById('sidebar');
        if (this.sidebarCollapsed) {
            sidebar.classList.add('collapsed');
        } else {
            sidebar.classList.remove('collapsed');
        }
        
        this.updateSidebarToggleIcon();
    }

    setView(view) {
        this.currentView = view;
        
        // 更新按钮状态
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`${view}View`).classList.add('active');
        
        // 重新渲染书签
        this.renderBookmarks();
    }

    renderGroupFilters() {
        const container = document.getElementById('groupFilters');
        const uniqueGroups = [...new Set(this.bookmarks.map(b => b.group))];
        
        // 更新全部书签计数
        document.getElementById('allCount').textContent = this.bookmarks.length;
        
        container.innerHTML = '';
        uniqueGroups.forEach(group => {
            const count = this.bookmarks.filter(b => b.group === group).length;
            const button = document.createElement('button');
            button.className = 'filter-btn';
            button.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>${group}</span>
                <span class="count">${count}</span>
            `;
            button.dataset.group = group;
            button.addEventListener('click', () => this.filterBookmarksBy(group));
            container.appendChild(button);
        });
    }

    filterBookmarksBy(group) {
        // 更新活跃状态
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (group === 'all') {
            document.querySelector('[data-group="all"]').classList.add('active');
            document.getElementById('currentGroupTitle').textContent = '全部书签';
        } else {
            document.querySelector(`[data-group="${group}"]`).classList.add('active');
            document.getElementById('currentGroupTitle').textContent = group;
        }
        
        this.currentFilter = group;
        this.renderBookmarks();
    }

    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        let searchTimeout;
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchBookmarks(e.target.value);
            }, 300);
        });
    }

    searchBookmarks(query) {
        const filteredBookmarks = this.bookmarks.filter(bookmark => {
            const matchesQuery = !query || 
                bookmark.title.toLowerCase().includes(query.toLowerCase()) ||
                bookmark.url.toLowerCase().includes(query.toLowerCase());
            
            const matchesGroup = this.currentFilter === 'all' || bookmark.group === this.currentFilter;
            
            return matchesQuery && matchesGroup;
        });
        
        this.renderBookmarks(filteredBookmarks);
    }

    renderBookmarks(bookmarksToRender = null) {
        const container = document.getElementById('bookmarksContainer');
        const bookmarks = bookmarksToRender || this.getFilteredBookmarks();
        
        if (bookmarks.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }
        
        // 设置容器类名
        container.className = this.currentView === 'grid' ? 'bookmarks-container' : 'bookmarks-container';
        
        if (this.currentView === 'grid') {
            container.innerHTML = `<div class="bookmarks-grid">${bookmarks.map(bookmark => this.createBookmarkHTML(bookmark)).join('')}</div>`;
        } else {
            container.innerHTML = `<div class="bookmarks-list">${bookmarks.map(bookmark => this.createBookmarkListHTML(bookmark)).join('')}</div>`;
        }
        
        // 绑定事件
        this.bindBookmarkEvents(container, bookmarks);
    }

    bindBookmarkEvents(container, bookmarks) {
        container.querySelectorAll('.bookmark-card, .bookmark-list-item').forEach(card => {
            const bookmarkId = card.dataset.id;
            const bookmark = bookmarks.find(b => b.id === bookmarkId);
            
            // 点击打开链接
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.bookmark-actions')) {
                    window.open(bookmark.url, '_blank');
                }
            });
            
            // 编辑按钮
            const editBtn = card.querySelector('.edit-btn');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openEditModal(bookmark);
                });
            }
        });
    }

    getFilteredBookmarks() {
        if (this.currentFilter === 'all') {
            return this.bookmarks;
        }
        return this.bookmarks.filter(bookmark => bookmark.group === this.currentFilter);
    }

    createBookmarkHTML(bookmark) {
        const domain = new URL(bookmark.url).hostname;
        const isCustom = !bookmark.isChrome;
        
        return `
            <div class="bookmark-card" data-id="${bookmark.id}">
                <div class="bookmark-header">
                    <img class="bookmark-favicon" src="${bookmark.favicon}" alt="" onerror="this.style.display='none'">
                    <div class="bookmark-title">${bookmark.title}</div>
                    ${isCustom ? `
                        <div class="bookmark-actions">
                            <button class="action-btn edit-btn" title="编辑">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                        </div>
                    ` : ''}
                </div>
                <div class="bookmark-url">${domain}</div>
                <div class="bookmark-group">${bookmark.group}</div>
            </div>
        `;
    }

    createBookmarkListHTML(bookmark) {
        const domain = new URL(bookmark.url).hostname;
        const isCustom = !bookmark.isChrome;
        
        return `
            <div class="bookmark-list-item" data-id="${bookmark.id}">
                <img class="bookmark-favicon" src="${bookmark.favicon}" alt="" onerror="this.style.display='none'">
                <div class="bookmark-list-content">
                    <div class="bookmark-title">${bookmark.title}</div>
                    <div class="bookmark-url">${domain}</div>
                </div>
                <div class="bookmark-group">${bookmark.group}</div>
                ${isCustom ? `
                    <div class="bookmark-actions">
                        <button class="action-btn edit-btn" title="编辑">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    getEmptyStateHTML() {
        return `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
                <h3>还没有书签</h3>
                <p>使用插件快速添加书签，或者批量导入现有书签</p>
            </div>
        `;
    }

    openEditModal(bookmark) {
        this.currentEditBookmark = bookmark;
        
        // 填充表单
        document.getElementById('editTitle').value = bookmark.title;
        document.getElementById('editUrl').value = bookmark.url;
        
        // 加载分组选项
        const select = document.getElementById('editGroup');
        select.innerHTML = '';
        this.groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group;
            option.textContent = group;
            if (group === bookmark.group) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        
        // 显示模态框
        document.getElementById('editModal').style.display = 'flex';
    }

    closeEditModal() {
        document.getElementById('editModal').style.display = 'none';
        this.currentEditBookmark = null;
    }

    async saveEdit() {
        if (!this.currentEditBookmark) return;
        
        const title = document.getElementById('editTitle').value.trim();
        const url = document.getElementById('editUrl').value.trim();
        const group = document.getElementById('editGroup').value;
        
        if (!title || !url) {
            alert('请填写标题和网址');
            return;
        }
        
        // 更新书签
        this.currentEditBookmark.title = title;
        this.currentEditBookmark.url = url;
        this.currentEditBookmark.group = group;
        this.currentEditBookmark.favicon = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`;
        
        // 保存到存储
        await this.saveBookmarksToStorage();
        
        // 刷新显示
        this.renderBookmarks();
        this.renderGroupFilters();
        this.closeEditModal();
        
        this.showMessage('书签已更新', 'success');
    }

    async deleteBookmark() {
        if (!this.currentEditBookmark) return;
        
        if (!confirm('确定要删除这个书签吗？')) return;
        
        // 从列表中移除
        this.bookmarks = this.bookmarks.filter(b => b.id !== this.currentEditBookmark.id);
        
        // 保存到存储
        await this.saveBookmarksToStorage();
        
        // 刷新显示
        this.renderBookmarks();
        this.renderGroupFilters();
        this.closeEditModal();
        
        this.showMessage('书签已删除', 'success');
    }

    async saveBookmarksToStorage() {
        const customBookmarks = this.bookmarks.filter(b => !b.isChrome);
        await chrome.storage.sync.set({ customBookmarks });
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
        try {
            const text = await file.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            const links = doc.querySelectorAll('a[href]');
            
            const newBookmarks = [];
            links.forEach(link => {
                const url = link.getAttribute('href');
                const title = link.textContent.trim();
                
                if (url && title && url.startsWith('http')) {
                    newBookmarks.push({
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                        title,
                        url,
                        group: '其他',
                        createdAt: new Date().toISOString(),
                        favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`
                    });
                }
            });

            if (newBookmarks.length > 0) {
                // 智能去重
                const uniqueBookmarks = [];
                newBookmarks.forEach(newBookmark => {
                    const exists = this.bookmarks.some(existing => 
                        existing.url === newBookmark.url && existing.group === newBookmark.group
                    );
                    if (!exists) {
                        uniqueBookmarks.push(newBookmark);
                    }
                });
                
                this.bookmarks = [...this.bookmarks, ...uniqueBookmarks];
                await this.saveBookmarksToStorage();
                
                this.renderBookmarks();
                this.renderGroupFilters();
                this.showMessage(`成功导入 ${uniqueBookmarks.length} 个书签`, 'success');
            } else {
                this.showMessage('未找到有效的书签链接', 'error');
            }
        } catch (error) {
            console.error('导入书签失败:', error);
            this.showMessage('导入失败，请重试', 'error');
        }
    }

    showMessage(message, type = 'success') {
        const messageDiv = document.createElement('div');
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'};
            color: white;
            padding: 12px 20px;
            border-radius: 12px;
            font-size: 14px;
            z-index: 1001;
            box-shadow: 0 4px 16px ${type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new NewTabBookmarkManager();
});
