
// 背景脚本 - 处理插件的后台逻辑
class BackgroundManager {
    constructor() {
        this.init();
    }

    init() {
        // 插件安装时的初始化
        chrome.runtime.onInstalled.addListener(() => {
            this.initializeStorage();
        });

        // 监听书签变化
        chrome.bookmarks.onCreated.addListener((id, bookmark) => {
            this.syncBookmarkChanges();
        });

        chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
            this.syncBookmarkChanges();
        });

        chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
            this.syncBookmarkChanges();
        });
    }

    async initializeStorage() {
        // 初始化默认分组
        const result = await chrome.storage.sync.get(['bookmarkGroups', 'customBookmarks']);
        
        if (!result.bookmarkGroups) {
            await chrome.storage.sync.set({
                bookmarkGroups: ['其他', '工作', '学习', '娱乐', '工具', '社交']
            });
        }

        if (!result.customBookmarks) {
            await chrome.storage.sync.set({
                customBookmarks: []
            });
        }
    }

    async syncBookmarkChanges() {
        // 当Chrome原生书签发生变化时，可以在这里同步更新
        // 这里可以添加更复杂的同步逻辑
        console.log('书签发生变化，同步更新...');
    }
}

// 初始化背景管理器
new BackgroundManager();
