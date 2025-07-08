
// 内容脚本 - 在网页中注入的脚本
class ContentManager {
    constructor() {
        this.init();
    }

    init() {
        // 添加快捷键支持
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+B 快速添加书签
            if (e.ctrlKey && e.shiftKey && e.key === 'B') {
                e.preventDefault();
                this.quickAddBookmark();
            }
        });

        // 添加右键菜单功能（需要在manifest中声明）
        this.setupContextMenu();
    }

    async quickAddBookmark() {
        const bookmark = {
            title: document.title,
            url: window.location.href,
            group: '其他',
            createdAt: new Date().toISOString(),
            favicon: this.getFavicon()
        };

        try {
            // 发送消息给background script
            chrome.runtime.sendMessage({
                action: 'addBookmark',
                bookmark: bookmark
            });

            // 显示成功提示
            this.showNotification('书签已添加！');
        } catch (error) {
            console.error('添加书签失败:', error);
            this.showNotification('添加失败，请重试', 'error');
        }
    }

    getFavicon() {
        const favicon = document.querySelector('link[rel="icon"]') || 
                      document.querySelector('link[rel="shortcut icon"]');
        
        if (favicon) {
            return favicon.href;
        }
        
        return `https://www.google.com/s2/favicons?domain=${window.location.hostname}&sz=32`;
    }

    showNotification(message, type = 'success') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : '#f44336'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            transition: all 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // 3秒后自动消失
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    setupContextMenu() {
        // 这里可以添加右键菜单的逻辑
        // 由于需要在background script中设置，这里主要是响应消息
    }
}

// 初始化内容管理器
new ContentManager();
