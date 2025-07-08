document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const homePage = document.getElementById('home-page');
    const chatPage = document.getElementById('chat-page');
    const themeItems = document.querySelectorAll('.theme-item');
    const supplementInput = document.getElementById('supplement-input');
    const startButton = document.getElementById('start-button');
    const backButton = document.getElementById('back-button');
    const sendButton = document.getElementById('send-button');
    const chatInput = document.querySelector('.chat-input input');
    const chatMessages = document.querySelector('.chat-messages');
    
    // App State
    const state = {
        selectedThemes: [],
        supplement: '',
    };
    
    // Check if start button should be enabled
    function updateStartButton() {
        if (state.selectedThemes.length > 0 || state.supplement.trim() !== '') {
            startButton.classList.remove('disabled');
        } else {
            startButton.classList.add('disabled');
        }
    }
    
    // Theme selection
    themeItems.forEach(item => {
        item.addEventListener('click', () => {
            // 修改为多选逻辑
            item.classList.toggle('selected');
            
            const theme = item.getAttribute('data-theme');
            
            if (item.classList.contains('selected')) {
                if (!state.selectedThemes.includes(theme)) {
                    state.selectedThemes.push(theme);
                }
            } else {
                state.selectedThemes = state.selectedThemes.filter(t => t !== theme);
            }
            
            updateStartButton();
        });
    });
    
    // Supplement input
    supplementInput.addEventListener('input', (e) => {
        state.supplement = e.target.value;
        updateStartButton();
    });
    
    // Start button
    startButton.addEventListener('click', () => {
        if (!startButton.classList.contains('disabled')) {
            // 保存主题和补充内容
            localStorage.setItem('selectedThemes', JSON.stringify(state.selectedThemes));
            localStorage.setItem('themeDetail', state.supplement);
            
            // 清空现有的聊天记录（重要）
            document.querySelector('.chat-messages').innerHTML = '';
            
            // 切换到聊天页面并初始化聊天
            homePage.classList.remove('active');
            chatPage.classList.add('active');
            
            // 使用新的模块化结构初始化聊天
            AppCore.initChatPage();
        }
    });
    
    // Back button
    backButton.addEventListener('click', () => {
        // 只负责页面切换
        document.getElementById('chat-page').classList.remove('active');
        document.getElementById('home-page').classList.add('active');
        
        // 完全重置所有AppState
        if (window.AppCore && window.AppCore.AppState) {
            AppCore.AppState.resetState();
        }
        
        // 重置模块状态
        if (window.NumbersProject) {
            try {
                NumbersProject.reset();
            } catch (e) {
                console.warn('Error resetting NumbersProject:', e);
            }
        }
        
        if (window.CompleteProject) {
            try {
                CompleteProject.reset();
            } catch (e) {
                console.warn('Error resetting CompleteProject:', e);
            }
        }
        
        if (window.ConversationManager) {
            ConversationManager.resetHistory();
        }
        
        // 移除所有可能存在的事件监听器
        if (window.AppCore && window.AppCore.UI) {
            const { UI } = AppCore;
            if (UI.sendButton) {
                UI.sendButton.removeEventListener('click', ChatManager.sendMessage);
                UI.sendButton.removeEventListener('click', ChatSteps.showSchemeSelectionReminder);
                UI.sendButton.removeEventListener('click', AppCore.AppState.handleNumbersInput);
            }
            if (UI.chatInput) {
                UI.chatInput.removeEventListener('keypress', AppCore.Helpers.handleKeyPress);
                UI.chatInput.removeEventListener('keypress', AppCore.AppState.handleNumbersInputKeyPress);
            }
        }
    });
});