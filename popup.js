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
        
        // 监听存储变化，实时更新分组列表
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync' && (changes.bookmarkGroups || changes.customBookmarks)) {
                console.log('检测到分组数据变化，重新加载分组列表');
                this.loadGroups();
            }
        });
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
            const result = await chrome.storage.sync.get(['bookmarkGroups', 'customBookmarks']);
            const predefinedGroups = result.bookmarkGroups || ['其他', '工作', '学习', '娱乐'];
            const customBookmarks = result.customBookmarks || [];
            
            console.log('预定义分组:', predefinedGroups);
            console.log('现有书签数量:', customBookmarks.length);
            
            // 从现有自定义书签中提取分组
            const customBookmarkGroups = [...new Set(customBookmarks.map(b => b.group))];
            console.log('从自定义书签中提取的分组:', customBookmarkGroups);
            
            // 加载Chrome原生书签的分组
            const chromeBookmarkGroups = await this.loadChromeBookmarkGroups();
            console.log('从Chrome书签中提取的分组:', chromeBookmarkGroups);
            
            // 合并所有分组：预定义分组 + 自定义书签分组 + Chrome书签分组
            const allGroups = [...new Set([...predefinedGroups, ...customBookmarkGroups, ...chromeBookmarkGroups])];
            console.log('合并后的所有分组:', allGroups);
            
            // 生成自定义下拉选项
            this.renderCustomSelectOptions(allGroups);
            
            console.log('分组选项已加载完成');
        } catch (error) {
            console.error('加载分组失败:', error);
        }
    }

    renderCustomSelectOptions(groups) {
        const optionsContainer = document.getElementById('customSelectOptions');
        optionsContainer.innerHTML = '';
        
        // 添加常规分组选项
        groups.forEach(group => {
            const option = document.createElement('div');
            option.className = 'custom-select-option';
            option.textContent = group;
            option.setAttribute('data-value', group);
            
            // 默认选中"其他"
            if (group === '其他') {
                option.classList.add('selected');
                document.querySelector('.selected-text').textContent = group;
            }
            
            optionsContainer.appendChild(option);
        });
        
        // 添加新建分组选项
        const newGroupOption = document.createElement('div');
        newGroupOption.className = 'custom-select-option new-group';
        newGroupOption.textContent = '+ 新建分组';
        newGroupOption.setAttribute('data-value', '新建分组');
        optionsContainer.appendChild(newGroupOption);
        
        // 绑定事件
        this.bindCustomSelectEvents();
    }

    bindCustomSelectEvents() {
        const customSelect = document.getElementById('bookmarkGroup');
        const trigger = customSelect.querySelector('.custom-select-display');
        const options = customSelect.querySelector('.custom-select-options');
        const selectText = customSelect.querySelector('.selected-text');
        const newGroupInput = document.getElementById('newGroup');
        
        if (!trigger || !options || !selectText) {
            console.error('找不到自定义下拉组件的必要元素');
            return;
        }
        
        // 点击触发器显示/隐藏下拉列表
        trigger.onclick = (e) => {
            e.stopPropagation();
            const isOpen = customSelect.classList.contains('open');
            
            // 关闭其他可能打开的下拉框
            document.querySelectorAll('.custom-select.open').forEach(el => {
                if (el !== customSelect) {
                    el.classList.remove('open');
                }
            });
            
            if (isOpen) {
                customSelect.classList.remove('open');
            } else {
                customSelect.classList.add('open');
            }
        };
        
        // 点击选项
        options.onclick = (e) => {
            e.stopPropagation();
            
            if (e.target.classList.contains('custom-select-option')) {
                const value = e.target.getAttribute('data-value');
                const text = e.target.textContent;
                
                // 更新选中状态
                options.querySelectorAll('.custom-select-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                e.target.classList.add('selected');
                
                // 更新显示文本
                selectText.textContent = text;
                
                // 处理新建分组
                if (value === '新建分组') {
                    newGroupInput.style.display = 'block';
                    newGroupInput.focus();
                } else {
                    newGroupInput.style.display = 'none';
                }
                
                // 关闭下拉框
                customSelect.classList.remove('open');
            }
        };
        
        // 点击外部关闭下拉框
        document.onclick = (e) => {
            if (!customSelect.contains(e.target)) {
                customSelect.classList.remove('open');
            }
        };
        
        // 阻止下拉框内的点击冒泡
        customSelect.onclick = (e) => {
            e.stopPropagation();
        };
    }

    getSelectedGroup() {
        const selectedOption = document.querySelector('.custom-select-option.selected');
        if (selectedOption) {
            return selectedOption.getAttribute('data-value');
        }
        
        // 如果没有选中项，返回显示的文本或默认值
        const selectText = document.querySelector('.selected-text');
        if (selectText && selectText.textContent.trim() !== '') {
            return selectText.textContent.trim();
        }
        
        return '其他';
    }

    async loadChromeBookmarkGroups() {
        try {
            const bookmarkTree = await chrome.bookmarks.getTree();
            const groups = new Set();
            
            const extractGroups = (nodes, parentTitle = '其他') => {
                nodes.forEach(node => {
                    if (node.url) {
                        // 这是一个书签，使用父文件夹名称作为分组
                        if (parentTitle && parentTitle !== 'Bookmarks bar' && parentTitle !== 'Other bookmarks') {
                            groups.add(parentTitle);
                        } else if (parentTitle === 'Bookmarks bar') {
                            groups.add('书签栏');
                        }
                    } else if (node.children) {
                        // 这是一个文件夹，递归处理
                        const folderName = node.title || '其他';
                        extractGroups(node.children, folderName);
                    }
                });
            };
            
            extractGroups(bookmarkTree);
            return Array.from(groups).filter(group => group && group !== '其他');
        } catch (error) {
            console.error('加载Chrome书签分组失败:', error);
            return [];
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
        let group = this.getSelectedGroup();
        const newGroup = document.getElementById('newGroup').value.trim();

        if (!title || !url) {
            alert('请填写标题和网址');
            return;
        }

        if (group === '新建分组' && newGroup) {
            group = newGroup;
            await this.addNewGroup(group);
        }

        // 尝试从URL获取favicon
        let favicon = '';
        try {
            const domain = new URL(url).hostname;
            favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
        } catch (e) {
            // 使用默认图标
            favicon = '';
        }

        const bookmark = {
            id: Date.now().toString(),
            title,
            url,
            group,
            favicon,
            addedAt: new Date().toISOString()
        };

        await this.saveBookmarkToStorage(bookmark);
        this.showSuccessMessage('书签已保存');
        document.getElementById('bookmarkForm').style.display = 'none';
        
        // 重新加载分组列表
        await this.loadGroups();
    }

    async saveBookmarkToStorage(bookmark) {
        try {
            const result = await chrome.storage.sync.get(['customBookmarks']);
            const bookmarks = result.customBookmarks || [];
            bookmarks.push(bookmark);
            await chrome.storage.sync.set({ customBookmarks: bookmarks });
        } catch (error) {
            console.error('保存书签失败:', error);
            throw error;
        }
    }

    async addNewGroup(groupName) {
        try {
            const result = await chrome.storage.sync.get(['bookmarkGroups']);
            const groups = result.bookmarkGroups || ['其他', '工作', '学习', '娱乐'];
            if (!groups.includes(groupName)) {
                groups.push(groupName);
                await chrome.storage.sync.set({ bookmarkGroups: groups });
            }
        } catch (error) {
            console.error('添加新分组失败:', error);
        }
    }

    showSuccessMessage(message) {
        // 创建消息元素
        const messageEl = document.createElement('div');
        messageEl.className = 'success-message';
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(messageEl);

        // 3秒后移除消息
        setTimeout(() => {
            messageEl.remove();
        }, 3000);
    }

    importBookmarks() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.html,.json';
        input.style.display = 'none';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const bookmarks = await this.parseBookmarkFile(file);
                    if (bookmarks.length > 0) {
                        this.showSuccessMessage(`成功导入 ${bookmarks.length} 个书签`);
                        await this.loadGroups();
                    }
                } catch (error) {
                    console.error('导入失败:', error);
                    alert('导入失败，请检查文件格式');
                }
            }
        };
        
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }

    async parseBookmarkFile(file) {
        const text = await file.text();
        const bookmarks = [];
        
        // 解析HTML书签文件
        if (file.name.endsWith('.html')) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            const links = doc.querySelectorAll('a[href]');
            
            links.forEach(link => {
                const bookmark = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    title: link.textContent.trim() || 'Untitled',
                    url: link.href,
                    group: '其他',
                    favicon: '',
                    addedAt: new Date().toISOString()
                };
                bookmarks.push(bookmark);
            });
        }
        
        // 解析JSON书签文件
        if (file.name.endsWith('.json')) {
            const data = JSON.parse(text);
            if (Array.isArray(data)) {
                data.forEach(item => {
                    if (item.title && item.url) {
                        const bookmark = {
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                            title: item.title,
                            url: item.url,
                            group: item.group || '其他',
                            favicon: item.favicon || '',
                            addedAt: new Date().toISOString()
                        };
                        bookmarks.push(bookmark);
                    }
                });
            }
        }
        
        // 保存到存储
        if (bookmarks.length > 0) {
            const result = await chrome.storage.sync.get(['customBookmarks']);
            const existingBookmarks = result.customBookmarks || [];
            const allBookmarks = [...existingBookmarks, ...bookmarks];
            await chrome.storage.sync.set({ customBookmarks: allBookmarks });
        }
        
        return bookmarks;
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new BookmarkManager();
}); 