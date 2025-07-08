// core.js - 核心功能模块

// 全局状态管理
const AppState = {
    // 用户信息
    currentTheme: '',         // 用户选择的主题
    themeDetail: '',          // 用户的主题补充内容
    chatStep: 0,              // 当前聊天步骤
    userDetails: '',          // 用户的具体问题
    currentThemes: [],        // 用户选择的多个主题
    scheme: '',               // 记录解忧方案
    numbers: '',              // 记录用户选择的三个数字
    profile: '',              // 用户的基本信息（出生日期等）

    // 函数引用
    handleNumbersInput: null,
    handleNumbersInputKeyPress: null,

    // 初始化状态
    init() {
        this.resetState();
        return this;
    },

    // 重置状态
    resetState() {
        this.currentTheme = '';
        this.themeDetail = '';
        this.chatStep = 0;
        this.userDetails = '';
        this.currentThemes = [];
        this.scheme = '';
        this.numbers = '';
        this.profile = '';
        this.handleNumbersInput = null;
        this.handleNumbersInputKeyPress = null;
        return this;
    }
};

// DOM元素引用
const UI = {
    chatMessages: null,
    chatInput: null,
    sendButton: null,
    exampleDropdown: null,
    exampleList: null,
    closeDropdownBtn: null,
    backButton: null,

    // 初始化DOM引用
    init() {
        this.chatMessages = document.querySelector('.chat-messages');
        this.chatInput = document.querySelector('.chat-input input');
        this.sendButton = document.querySelector('.chat-input button');
        this.exampleDropdown = document.getElementById('example-dropdown');
        this.exampleList = document.querySelector('.example-list');
        this.closeDropdownBtn = document.querySelector('.close-dropdown');
        this.backButton = document.getElementById('back-button');
        return this;
    }
};

// UI操作工具
const UIUtil = {
    // 添加消息到聊天框
    addMessage(type, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = `<p>${content}</p>`;
        
        messageDiv.appendChild(messageContent);
        UI.chatMessages.appendChild(messageDiv);
        
        // 自动滚动到底部
        UI.chatMessages.scrollTop = UI.chatMessages.scrollHeight;
    },

    // 显示输入中指示器
    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'system-typing';
        typingDiv.innerHTML = `
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
        `;
        UI.chatMessages.appendChild(typingDiv);
        UI.chatMessages.scrollTop = UI.chatMessages.scrollHeight;
    },

    // 移除输入中指示器
    removeTypingIndicator() {
        const typingIndicator = document.querySelector('.system-typing');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    },

    // 隐藏示例问下拉框
    hideExampleDropdown() {
        UI.exampleDropdown.classList.remove('active');
    }
};

// 辅助函数
const Helpers = {
    // Enter键按下时发送消息
    handleKeyPress(e) {
        if (e.key === 'Enter') {
            ChatManager.sendMessage();
        }
    },

    // 验证数字输入
    validateNumbersInput(input) {
        console.log('Validating input:', input);
        
        // 移除所有空格和非数字分隔符
        const cleanInput = input.replace(/\s+/g, '');
        
        // 尝试提取数字 - 支持多种分隔符
        const numbers = cleanInput.split(/[,，、.。;；:：\s]+/);
        console.log('Extracted numbers:', numbers);
        
        // 检查是否有足够的数字
        if (numbers.length < 3) {
            console.log('Not enough numbers');
            return false;
        }
        
        // 过滤出有效的数字（1-9）
        const validNumbers = numbers.filter(num => {
            const parsed = parseInt(num, 10);
            return !isNaN(parsed) && parsed >= 1 && parsed <= 9;
        });
        console.log('Valid numbers:', validNumbers);
        
        // 检查是否恰好有3个有效数字
        return validNumbers.length === 3;
    }
};

// 初始化聊天页面
function initChatPage() {
    // 初始化UI和AppState
    UI.init();
    
    // 清空聊天内容
    UI.chatMessages.innerHTML = '';
    
    // 从localStorage获取用户选择的主题和补充内容
    try {
        AppState.currentThemes = JSON.parse(localStorage.getItem('selectedThemes') || '["事业"]');
    } catch (e) {
        AppState.currentThemes = ['事业']; // 默认主题
    }
    AppState.currentTheme = AppState.currentThemes[0]; 
    AppState.themeDetail = localStorage.getItem('themeDetail') || '';
    
    // 重置聊天步骤和状态
    AppState.chatStep = 0;
    AppState.scheme = '';
    AppState.numbers = '';
    AppState.userDetails = '';

    // 重置对话历史
    ConversationManager.resetHistory();

    // 移除所有可能存在的旧的事件监听器
    setupEventListeners();

    // 开始聊天的第一步
    ChatSteps.startChatStep1();
}

// 设置事件监听器
function setupEventListeners() {
    // 移除所有可能存在的事件监听器
    UI.sendButton.removeEventListener('click', ChatManager.sendMessage);
    UI.sendButton.removeEventListener('click', ChatSteps.showSchemeSelectionReminder);
    UI.sendButton.removeEventListener('click', AppState.handleNumbersInput);
    UI.chatInput.removeEventListener('keypress', Helpers.handleKeyPress);
    UI.chatInput.removeEventListener('keypress', AppState.handleNumbersInputKeyPress);
    
    // 根据当前步骤绑定对应的事件监听器
    if (AppState.chatStep === 0 || AppState.chatStep === 1) {
        // Step 1: 初始状态或用户详情输入阶段，使用基本消息处理器
        UI.sendButton.addEventListener('click', ChatManager.sendMessage);
        UI.chatInput.addEventListener('keypress', Helpers.handleKeyPress);
    } else if (AppState.chatStep === 2) {
        // Step 2: 解忧方案选择阶段
        UI.sendButton.addEventListener('click', ChatSteps.showSchemeSelectionReminder);
        UI.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                ChatSteps.showSchemeSelectionReminder();
            }
        });
    }
    // 其他步骤的事件绑定由各自的模块处理
    
    // 确保下拉框关闭按钮事件始终存在
    if (UI.closeDropdownBtn) {
        UI.closeDropdownBtn.addEventListener('click', UIUtil.hideExampleDropdown);
    }
}

// 导出模块
window.AppCore = {
    AppState,
    UI,
    UIUtil,
    Helpers,
    initChatPage,
    setupEventListeners
}; 