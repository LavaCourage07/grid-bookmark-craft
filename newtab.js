class NewTabBookmarkManager {
    constructor() {
        this.bookmarks = [];
        this.currentFilter = 'all';
        this.currentEditBookmark = null;
        this.currentView = 'grid';
        
        // 临时修复：强制重置侧边栏为展开状态
        localStorage.removeItem('sidebarCollapsed');
        this.sidebarCollapsed = false;
        
        this.currentTheme = localStorage.getItem('bookmarkTheme') || 'light';
        
        // 添加调试信息
        console.log('侧边栏初始状态:', this.sidebarCollapsed);
        
        this.init();
    }

    async init() {
        // 强制确保侧边栏展开
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.remove('collapsed');
        
        this.initTheme();
        this.initSidebar();
        await this.loadBookmarks();
        this.setupEventListeners();
        this.renderBookmarks();
        this.setupSearch();
        this.addAnimationDelays();
        
        // 再次确保侧边栏状态正确
        setTimeout(() => {
            console.log('最终检查侧边栏状态:', this.sidebarCollapsed);
            if (!this.sidebarCollapsed) {
                sidebar.classList.remove('collapsed');
            }
        }, 100);
    }

    initTheme() {
        document.body.setAttribute('data-theme', this.currentTheme);
        this.updateThemeIcon();
    }

    initSidebar() {
        const sidebar = document.getElementById('sidebar');
        console.log('初始化侧边栏，折叠状态:', this.sidebarCollapsed);
        
        if (this.sidebarCollapsed) {
            sidebar.classList.add('collapsed');
        } else {
            sidebar.classList.remove('collapsed');
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
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <line x1="7" y1="7" x2="17" y2="17"></line>
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
                        try {
                            const domain = new URL(node.url).hostname;
                            bookmarks.push({
                                id: node.id,
                                title: node.title,
                                url: node.url,
                                group: group,
                                isChrome: true,
                                favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
                            });
                        } catch (error) {
                            // 如果URL解析失败，跳过这个书签
                            console.warn('跳过无效URL的书签:', node.url);
                        }
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

        // 新增分组按钮
        document.getElementById('addGroupBtn').addEventListener('click', () => {
            this.openAddGroupModal();
        });

        // 全部分组按钮点击事件
        document.querySelector('[data-group="all"]').addEventListener('click', () => {
            this.filterBookmarksBy('all');
        });

        // 编辑书签模态框事件
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeEditModal();
        });

        document.getElementById('saveEdit').addEventListener('click', () => {
            this.saveEdit();
        });

        document.getElementById('deleteBookmark').addEventListener('click', () => {
            this.deleteBookmark();
        });

        document.getElementById('cancelEdit').addEventListener('click', () => {
            this.closeEditModal();
        });

        // 新增分组模态框事件
        document.getElementById('closeAddGroupModal').addEventListener('click', () => {
            this.closeAddGroupModal();
        });

        document.getElementById('saveNewGroup').addEventListener('click', () => {
            this.saveNewGroup();
        });

        document.getElementById('cancelAddGroup').addEventListener('click', () => {
            this.closeAddGroupModal();
        });

        // 点击模态框外部关闭
        document.getElementById('editModal').addEventListener('click', (e) => {
            if (e.target.id === 'editModal') {
                this.closeEditModal();
            }
        });

        document.getElementById('addGroupModal').addEventListener('click', (e) => {
            if (e.target.id === 'addGroupModal') {
                this.closeAddGroupModal();
            }
        });
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('bookmarkTheme', this.currentTheme);
        document.body.setAttribute('data-theme', this.currentTheme);
        this.updateThemeIcon();
        
        // 添加主题切换动画
        document.body.style.transition = 'all 0.5s ease';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 500);
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
        
        // 添加反馈动画
        const toggleBtn = document.getElementById('sidebarToggle');
        if (this.sidebarCollapsed) {
            // 当侧边栏折叠时，按钮是固定定位的
            toggleBtn.style.transform = 'scale(0.8)';
        } else {
            // 当侧边栏展开时，按钮是绝对定位的
            toggleBtn.style.transform = 'translateY(-50%) scale(0.8)';
        }
        
        setTimeout(() => {
            if (this.sidebarCollapsed) {
                toggleBtn.style.transform = '';
            } else {
                toggleBtn.style.transform = 'translateY(-50%)';
            }
        }, 150);
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
        
        // 添加视图切换动画
        const container = document.getElementById('bookmarksContainer');
        container.style.opacity = '0';
        container.style.transform = 'translateY(10px)';
        setTimeout(() => {
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
        }, 150);
    }

    renderGroupFilters() {
        const container = document.getElementById('groupFilters');
        
        // 获取所有分组（包括空分组）
        const bookmarkGroups = [...new Set(this.bookmarks.map(b => b.group))];
        const allGroups = [...new Set([...this.groups, ...bookmarkGroups])];
        
        // 更新全部书签计数
        document.getElementById('allCount').textContent = this.bookmarks.length;
        
        container.innerHTML = '';
        allGroups.forEach(group => {
            const count = this.bookmarks.filter(b => b.group === group).length;
            const button = document.createElement('button');
            button.className = 'filter-btn';
            button.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
                <span class="group-name">${group}</span>
                <span class="count">${count}</span>
                <div class="group-actions">
                    <button class="group-action-btn delete-group-btn" data-group="${group}" title="删除分组">
                        ×
                    </button>
                </div>
            `;
            button.dataset.group = group;
            
            // 分组筛选事件
            button.addEventListener('click', (e) => {
                if (!e.target.classList.contains('delete-group-btn')) {
                    this.filterBookmarksBy(group);
                }
            });
            
            // 删除分组事件
            const deleteBtn = button.querySelector('.delete-group-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteGroup(group);
            });
            
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
            const groupBtn = document.querySelector(`[data-group="${group}"]`);
            if (groupBtn) {
                groupBtn.classList.add('active');
                document.getElementById('currentGroupTitle').textContent = group;
            }
        }
        
        this.currentFilter = group;
        
        // 添加调试信息
        const filteredBookmarks = this.getFilteredBookmarks();
        console.log(`切换到分组: ${group}, 找到 ${filteredBookmarks.length} 个书签`);
        
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
            container.innerHTML = `<div class="bookmarks-grid">${bookmarks.map((bookmark, index) => this.createBookmarkHTML(bookmark, index)).join('')}</div>`;
        } else {
            container.innerHTML = `<div class="bookmarks-list">${bookmarks.map((bookmark, index) => this.createBookmarkListHTML(bookmark, index)).join('')}</div>`;
        }
        
        // 绑定事件
        this.bindBookmarkEvents(container, bookmarks);
        
        // 添加动画延迟
        this.addAnimationDelays();
    }

    addAnimationDelays() {
        // 为书签卡片添加动画延迟
        document.querySelectorAll('.bookmark-card').forEach((card, index) => {
            card.style.setProperty('--card-index', index);
        });
        
        document.querySelectorAll('.bookmark-list-item').forEach((item, index) => {
            item.style.setProperty('--item-index', index);
        });
        
        // 为表单字段添加动画延迟
        document.querySelectorAll('.form-group').forEach((group, index) => {
            group.style.setProperty('--field-index', index);
        });
    }

    bindBookmarkEvents(container, bookmarks) {
        container.querySelectorAll('.bookmark-card, .bookmark-list-item').forEach(card => {
            const bookmarkId = card.dataset.id;
            const bookmark = bookmarks.find(b => b.id === bookmarkId);
            
            // 点击打开链接
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.bookmark-actions')) {
                    // 添加点击动画
                    card.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        card.style.transform = '';
                        window.open(bookmark.url, '_blank');
                    }, 100);
                }
            });
            
            // 编辑按钮
            const editBtn = card.querySelector('.edit-btn');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openEditModal(bookmark);
                    
                    // 添加按钮点击动画
                    editBtn.style.transform = 'scale(0.8) rotate(180deg)';
                    setTimeout(() => {
                        editBtn.style.transform = '';
                    }, 200);
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

    createBookmarkHTML(bookmark, index = 0) {
        let domain = '';
        try {
            domain = new URL(bookmark.url).hostname;
        } catch (error) {
            domain = bookmark.url;
        }
        
        const isCustom = !bookmark.isChrome;
        
        return `
            <div class="bookmark-card" data-id="${bookmark.id}" style="--card-index: ${index}">
                <div class="bookmark-header">
                    <div class="bookmark-favicon">
                        <img src="${bookmark.favicon}" alt="" 
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                             style="width: 20px; height: 20px; border-radius: 4px;">
                        <div style="display: none; width: 20px; height: 20px; background: var(--bg-accent); border-radius: 4px; align-items: center; justify-content: center; font-size: 10px; color: var(--text-muted);">
                            ${bookmark.title.charAt(0).toUpperCase()}
                        </div>
                    </div>
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

    createBookmarkListHTML(bookmark, index = 0) {
        let domain = '';
        try {
            domain = new URL(bookmark.url).hostname;
        } catch (error) {
            domain = bookmark.url;
        }
        
        const isCustom = !bookmark.isChrome;
        
        return `
            <div class="bookmark-list-item" data-id="${bookmark.id}" style="--item-index: ${index}">
                <div class="bookmark-favicon">
                    <img src="${bookmark.favicon}" alt="" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                         style="width: 20px; height: 20px; border-radius: 4px;">
                    <div style="display: none; width: 20px; height: 20px; background: var(--bg-accent); border-radius: 4px; align-items: center; justify-content: center; font-size: 10px; color: var(--text-muted);">
                        ${bookmark.title.charAt(0).toUpperCase()}
                    </div>
                </div>
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
                <h3 style="margin-top: 2px;">暂无书签</h3>
                <p style="margin-top: 10px;">使用插件快速添加书签，或者批量导入现有书签</p>
            </div>
        `;
    }

    openEditModal(bookmark) {
        this.currentEditBookmark = bookmark;
        
        console.log('打开编辑模态框，书签:', bookmark.title, '分组:', bookmark.group);
        
        // 填充表单
        document.getElementById('editTitle').value = bookmark.title;
        document.getElementById('editUrl').value = bookmark.url;
        
        // 获取所有分组（包括Chrome书签分组）
        const bookmarkGroups = [...new Set(this.bookmarks.map(b => b.group))];
        const allGroups = [...new Set([...this.groups, ...bookmarkGroups])];
        
        console.log('所有可用分组:', allGroups);
        
        // 渲染自定义下拉组件选项
        this.renderCustomSelectOptions(allGroups, bookmark.group);
        
        // 显示模态框
        const modal = document.getElementById('editModal');
        modal.style.display = 'flex';
        
        // 添加打开动画
        const modalContent = modal.querySelector('.modal-content');
        modalContent.style.transform = 'scale(0.8) translateY(20px)';
        modalContent.style.opacity = '0';
        
        setTimeout(() => {
            modalContent.style.transform = 'scale(1) translateY(0)';
            modalContent.style.opacity = '1';
            // 聚焦到标题输入框
            document.getElementById('editTitle').focus();
            document.getElementById('editTitle').select();
        }, 10);
        
        // 添加键盘事件监听
        this.addModalKeyboardEvents();
        
        // 绑定自定义下拉组件事件
        setTimeout(() => {
            this.bindCustomSelectEvents();
        }, 50);
        
        // 重新添加动画延迟
        setTimeout(() => {
            this.addAnimationDelays();
        }, 100);
    }

    renderCustomSelectOptions(groups, selectedGroup) {
        const optionsContainer = document.getElementById('editGroupOptions');
        const selectedText = document.querySelector('#editGroup .selected-text');
        
        if (!optionsContainer || !selectedText) {
            console.error('找不到自定义下拉组件元素');
            return;
        }
        
        // 清空选项
        optionsContainer.innerHTML = '';
        
        // 设置选中的文本
        selectedText.textContent = selectedGroup;
        
        console.log('渲染下拉选项，选中分组:', selectedGroup);
        console.log('可用分组:', groups);
        
        // 添加选项
        groups.forEach(group => {
            const option = document.createElement('div');
            option.className = 'custom-select-option';
            option.setAttribute('data-value', group);
            option.textContent = group;
            
            if (group === selectedGroup) {
                option.classList.add('selected');
                console.log('设置选中选项:', group);
            }
            
            optionsContainer.appendChild(option);
        });
        
        console.log('下拉选项渲染完成，总共', groups.length, '个选项');
    }

    bindCustomSelectEvents() {
        const customSelect = document.getElementById('editGroup');
        if (!customSelect) return;
        
        const dropdown = customSelect.querySelector('.custom-select-dropdown');
        const selectedText = customSelect.querySelector('.selected-text');
        const optionsContainer = customSelect.querySelector('.custom-select-options');
        
        // 移除之前的事件监听器
        const newCustomSelect = customSelect.cloneNode(true);
        customSelect.parentNode.replaceChild(newCustomSelect, customSelect);
        
        // 重新获取元素
        const updatedCustomSelect = document.getElementById('editGroup');
        const updatedDropdown = updatedCustomSelect.querySelector('.custom-select-dropdown');
        const updatedSelectedText = updatedCustomSelect.querySelector('.selected-text');
        const updatedOptionsContainer = updatedCustomSelect.querySelector('.custom-select-options');
        
        // 点击显示区域显示/隐藏下拉框
        const displayArea = updatedCustomSelect.querySelector('.custom-select-display');
        displayArea.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleCustomSelect(updatedCustomSelect);
        });
        
        // 使用事件委托方式绑定选项点击事件
        updatedOptionsContainer.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('选项容器被点击，目标元素:', e.target);
            
            if (e.target.classList.contains('custom-select-option')) {
                const value = e.target.getAttribute('data-value');
                const text = e.target.textContent;
                
                console.log('选择了选项:', value, text);
                
                // 更新显示的文本
                updatedSelectedText.textContent = text;
                
                // 更新选中状态
                updatedOptionsContainer.querySelectorAll('.custom-select-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                e.target.classList.add('selected');
                
                // 关闭下拉框
                this.closeCustomSelect(updatedCustomSelect);
                
                console.log('选项已更新，当前选中:', text);
            }
        });
        
        // 阻止下拉框内的点击事件冒泡
        updatedDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // 点击外部关闭下拉框
        const outsideClickHandler = (e) => {
            if (!updatedCustomSelect.contains(e.target)) {
                this.closeCustomSelect(updatedCustomSelect);
            }
        };
        
        document.addEventListener('click', outsideClickHandler);
        
        // 键盘事件
        updatedCustomSelect.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggleCustomSelect(updatedCustomSelect);
            } else if (e.key === 'Escape') {
                this.closeCustomSelect(updatedCustomSelect);
            }
        });
        
        // 保存事件处理器引用以便后续清理
        updatedCustomSelect._outsideClickHandler = outsideClickHandler;
    }

    toggleCustomSelect(customSelect) {
        const isOpen = customSelect.classList.contains('open');
        
        console.log('切换下拉框状态，当前:', isOpen ? '打开' : '关闭');
        
        if (isOpen) {
            this.closeCustomSelect(customSelect);
        } else {
            this.openCustomSelect(customSelect);
        }
    }

    openCustomSelect(customSelect) {
        customSelect.classList.add('open');
        customSelect.setAttribute('tabindex', '0');
        customSelect.focus();
        
        console.log('下拉框已打开');
    }

    closeCustomSelect(customSelect) {
        customSelect.classList.remove('open');
        customSelect.removeAttribute('tabindex');
        
        console.log('下拉框已关闭');
    }

    addModalKeyboardEvents() {
        const modal = document.getElementById('editModal');
        
        // 移除之前的事件监听器
        modal.removeEventListener('keydown', this.handleModalKeydown);
        
        // 添加新的事件监听器
        this.handleModalKeydown = (e) => {
            if (e.key === 'Escape') {
                this.closeEditModal();
            } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                // Ctrl+Enter 或 Cmd+Enter 保存
                this.saveEdit();
            }
        };
        
        modal.addEventListener('keydown', this.handleModalKeydown);
    }

    closeEditModal() {
        const modal = document.getElementById('editModal');
        const modalContent = modal.querySelector('.modal-content');
        
        // 关闭自定义下拉组件
        const customSelect = document.getElementById('editGroup');
        if (customSelect) {
            this.closeCustomSelect(customSelect);
            
            // 清理事件监听器
            if (customSelect._outsideClickHandler) {
                document.removeEventListener('click', customSelect._outsideClickHandler);
                customSelect._outsideClickHandler = null;
            }
        }
        
        // 添加关闭动画
        modalContent.style.transform = 'scale(0.9) translateY(10px)';
        modalContent.style.opacity = '0';
        
        setTimeout(() => {
            modal.style.display = 'none';
            this.currentEditBookmark = null;
        }, 200);
    }

    async saveEdit() {
        if (!this.currentEditBookmark) return;
        
        const title = document.getElementById('editTitle').value.trim();
        const url = document.getElementById('editUrl').value.trim();
        
        // 从自定义下拉组件获取选中的分组
        const selectedText = document.querySelector('#editGroup .selected-text');
        const group = selectedText ? selectedText.textContent : '其他';
        
        if (!title || !url) {
            // 添加错误动画
            const titleInput = document.getElementById('editTitle');
            const urlInput = document.getElementById('editUrl');
            
            if (!title) {
                titleInput.classList.add('animate-shake');
                setTimeout(() => titleInput.classList.remove('animate-shake'), 500);
            }
            if (!url) {
                urlInput.classList.add('animate-shake');
                setTimeout(() => urlInput.classList.remove('animate-shake'), 500);
            }
            
            this.showMessage('请填写标题和网址', 'error');
            return;
        }
        
        // 验证URL格式
        try {
            new URL(url);
        } catch (error) {
            const urlInput = document.getElementById('editUrl');
            urlInput.classList.add('animate-shake');
            setTimeout(() => urlInput.classList.remove('animate-shake'), 500);
            
            this.showMessage('请输入有效的网址格式', 'error');
            return;
        }
        
        // 检查是否有实际更改
        const hasChanges = 
            this.currentEditBookmark.title !== title ||
            this.currentEditBookmark.url !== url ||
            this.currentEditBookmark.group !== group;
        
        if (!hasChanges) {
            this.closeEditModal();
            this.showMessage('没有检测到更改', 'error');
            return;
        }
        
        try {
            // 更新书签
            this.currentEditBookmark.title = title;
            this.currentEditBookmark.url = url;
            this.currentEditBookmark.group = group;
            
            // 更新favicon（如果URL发生了变化）
            try {
                const domain = new URL(url).hostname;
                this.currentEditBookmark.favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
            } catch (faviconError) {
                console.warn('无法生成favicon URL:', faviconError);
            }
            
            // 保存到存储
            await this.saveBookmarksToStorage();
            
            // 刷新显示
            this.renderBookmarks();
            this.renderGroupFilters();
            this.closeEditModal();
            
            this.showMessage('书签已更新', 'success');
            
        } catch (error) {
            console.error('保存书签失败:', error);
            this.showMessage('保存失败，请重试', 'error');
        }
    }

    async deleteBookmark() {
        if (!this.currentEditBookmark) return;
        
        // 显示确认删除模态框
        this.showConfirmDeleteModal(this.currentEditBookmark);
    }

    showConfirmDeleteModal(bookmark) {
        // 填充书签信息
        const bookmarkInfo = document.getElementById('deleteBookmarkInfo');
        bookmarkInfo.textContent = `${bookmark.title} (${bookmark.url})`;
        
        // 显示模态框
        const modal = document.getElementById('confirmDeleteModal');
        modal.style.display = 'flex';
        
        // 添加打开动画
        const modalContent = modal.querySelector('.modal-content');
        modalContent.style.transform = 'scale(0.8) translateY(20px)';
        modalContent.style.opacity = '0';
        
        setTimeout(() => {
            modalContent.style.transform = 'scale(1) translateY(0)';
            modalContent.style.opacity = '1';
        }, 10);
        
        // 绑定确认删除事件
        this.bindConfirmDeleteEvents(bookmark);
    }

    bindConfirmDeleteEvents(bookmark) {
        const confirmBtn = document.getElementById('confirmDelete');
        const cancelBtn = document.getElementById('cancelDelete');
        const closeBtn = document.getElementById('closeConfirmDeleteModal');
        const modal = document.getElementById('confirmDeleteModal');
        
        // 移除之前的事件监听器
        confirmBtn.removeEventListener('click', this.handleConfirmDelete);
        cancelBtn.removeEventListener('click', this.handleCancelDelete);
        closeBtn.removeEventListener('click', this.handleCancelDelete);
        modal.removeEventListener('keydown', this.handleDeleteModalKeydown);
        
        // 确认删除
        this.handleConfirmDelete = async () => {
            // 从列表中移除
            this.bookmarks = this.bookmarks.filter(b => b.id !== bookmark.id);
            
            // 保存到存储
            await this.saveBookmarksToStorage();
            
            // 刷新显示
            this.renderBookmarks();
            this.renderGroupFilters();
            
            // 关闭所有模态框
            this.closeConfirmDeleteModal();
            this.closeEditModal();
            
            this.showMessage('书签已删除', 'success');
        };
        
        // 取消删除
        this.handleCancelDelete = () => {
            this.closeConfirmDeleteModal();
        };
        
        // 键盘事件
        this.handleDeleteModalKeydown = (e) => {
            if (e.key === 'Escape') {
                this.closeConfirmDeleteModal();
            } else if (e.key === 'Enter') {
                this.handleConfirmDelete();
            }
        };
        
        // 绑定事件
        confirmBtn.addEventListener('click', this.handleConfirmDelete);
        cancelBtn.addEventListener('click', this.handleCancelDelete);
        closeBtn.addEventListener('click', this.handleCancelDelete);
        modal.addEventListener('keydown', this.handleDeleteModalKeydown);
    }

    closeConfirmDeleteModal() {
        const modal = document.getElementById('confirmDeleteModal');
        const modalContent = modal.querySelector('.modal-content');
        
        // 添加关闭动画
        modalContent.style.transform = 'scale(0.9) translateY(10px)';
        modalContent.style.opacity = '0';
        
        setTimeout(() => {
            modal.style.display = 'none';
        }, 200);
    }

    openAddGroupModal() {
        document.getElementById('newGroupName').value = '';
        const modal = document.getElementById('addGroupModal');
        modal.style.display = 'flex';
        
        // 添加打开动画
        const modalContent = modal.querySelector('.modal-content');
        modalContent.style.transform = 'scale(0.8) translateY(20px)';
        modalContent.style.opacity = '0';
        
        setTimeout(() => {
            modalContent.style.transform = 'scale(1) translateY(0)';
            modalContent.style.opacity = '1';
            document.getElementById('newGroupName').focus();
        }, 10);
    }

    closeAddGroupModal() {
        const modal = document.getElementById('addGroupModal');
        const modalContent = modal.querySelector('.modal-content');
        
        // 添加关闭动画
        modalContent.style.transform = 'scale(0.9) translateY(10px)';
        modalContent.style.opacity = '0';
        
        setTimeout(() => {
            modal.style.display = 'none';
        }, 200);
    }

    async saveNewGroup() {
        const groupName = document.getElementById('newGroupName').value.trim();
        
        if (!groupName) {
            const input = document.getElementById('newGroupName');
            input.classList.add('animate-shake');
            setTimeout(() => {
                input.classList.remove('animate-shake');
            }, 500);
            
            this.showMessage('请输入分组名称', 'error');
            return;
        }
        
        if (this.groups.includes(groupName)) {
            const input = document.getElementById('newGroupName');
            input.classList.add('animate-shake');
            setTimeout(() => {
                input.classList.remove('animate-shake');
            }, 500);
            
            this.showMessage('分组已存在', 'error');
            return;
        }
        
        console.log('添加分组前:', this.groups);
        
        // 添加到分组列表
        this.groups.push(groupName);
        
        console.log('添加分组后:', this.groups);
        
        // 保存到存储
        await chrome.storage.sync.set({ bookmarkGroups: this.groups });
        
        console.log('分组已保存到存储');
        
        // 刷新显示
        this.renderGroupFilters();
        this.closeAddGroupModal();
        
        this.showMessage('分组已添加', 'success');
    }

    async deleteGroup(groupName) {
        if (groupName === '其他') {
            this.showMessage('默认分组不能删除', 'error');
            return;
        }
        
        if (!confirm(`确定要删除分组"${groupName}"吗？该分组下的书签将移动到"其他"分组。`)) return;
        
        // 将该分组下的书签移动到"其他"分组
        this.bookmarks.forEach(bookmark => {
            if (bookmark.group === groupName && !bookmark.isChrome) {
                bookmark.group = '其他';
            }
        });
        
        // 从分组列表中移除
        this.groups = this.groups.filter(g => g !== groupName);
        
        // 保存到存储
        await Promise.all([
            chrome.storage.sync.set({ bookmarkGroups: this.groups }),
            this.saveBookmarksToStorage()
        ]);
        
        // 如果当前筛选的是被删除的分组，切换到全部
        if (this.currentFilter === groupName) {
            this.filterBookmarksBy('all');
        }
        
        // 刷新显示
        this.renderBookmarks();
        this.renderGroupFilters();
        
        this.showMessage('分组已删除', 'success');
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
                    const newBookmark = {
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                        title,
                        url,
                        group: '其他',
                        createdAt: new Date().toISOString(),
                        favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`
                    };
                    newBookmarks.push(newBookmark);
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
            animation: messageSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            transform: translateX(100%);
        `;
        
        // 添加消息动画样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes messageSlideIn {
                from {
                    opacity: 0;
                    transform: translateX(100%) scale(0.8);
                }
                to {
                    opacity: 1;
                    transform: translateX(0) scale(1);
                }
            }
            @keyframes messageSlideOut {
                from {
                    opacity: 1;
                    transform: translateX(0) scale(1);
                }
                to {
                    opacity: 0;
                    transform: translateX(100%) scale(0.8);
                }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(messageDiv);
        
        // 动画进入
        setTimeout(() => {
            messageDiv.style.transform = 'translateX(0)';
        }, 10);
        
        // 动画退出
        setTimeout(() => {
            messageDiv.style.animation = 'messageSlideOut 0.3s ease-in';
            messageDiv.style.transform = 'translateX(100%)';
            setTimeout(() => {
                messageDiv.remove();
                style.remove();
            }, 300);
        }, 2700);
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 立即确保侧边栏展开
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.remove('collapsed');
        console.log('DOMContentLoaded: 强制展开侧边栏');
    }
    
    new NewTabBookmarkManager();
    
    // 延迟再次检查
    setTimeout(() => {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('collapsed')) {
            sidebar.classList.remove('collapsed');
            console.log('延迟检查: 再次强制展开侧边栏');
        }
    }, 200);
});
