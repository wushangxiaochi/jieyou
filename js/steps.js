// steps.js - 基础步骤管理模块

// 聊天管理器
const ChatManager = {
    // 发送消息
    sendMessage() {
        const message = AppCore.UI.chatInput.value.trim();
        if (message === '') return;
        
        // 添加用户消息
        AppCore.UIUtil.addMessage('user', message);
        
        // 保存用户详情
        AppCore.AppState.userDetails = message;
        localStorage.setItem('userDetails', AppCore.AppState.userDetails);
        
        // 清空输入框
        AppCore.UI.chatInput.value = '';
        
        // 检查当前步骤，决定下一步操作
        if (AppCore.AppState.chatStep === 1) {
            // 从步骤1进入步骤2
            ChatSteps.proceedToStep2();
        } else {
            // 如果不是步骤1的消息，则不应该使用这个处理器
            console.warn('sendMessage called in unexpected step:', AppCore.AppState.chatStep);
        }
    }
};

// 示例问题配置（备用）
const defaultExamplesConfig = {
    '事业': [
        '我该如何进一步提升自己的职业能力？',
        '最近工作压力很大，有什么方法可以缓解？',
        '我该不该考虑换一份工作？',
        '如何与同事保持良好的关系？'
    ],
    '子女': [
        '如何帮助孩子提高学习兴趣？',
        '孩子叛逆期该如何与他/她沟通？',
        '如何平衡工作和陪伴孩子的时间？',
        '孩子交友问题让我担忧，该怎么办？'
    ],
    '财富': [
        '如何制定合理的理财计划？',
        '近期适合进行什么样的投资？',
        '如何在不影响生活质量的情况下存钱？',
        '我该如何偿还债务并重建财务状况？'
    ],
    '父母': [
        '如何照顾年迈的父母又不影响自己的生活？',
        '与父母有代沟，如何有效沟通？',
        '父母健康问题让我担忧，该如何安排？',
        '父母不支持我的决定，该怎么办？'
    ],
    '婚姻': [
        '如何让长期婚姻保持新鲜感？',
        '夫妻之间有了矛盾该如何化解？',
        '婚后与对方家人相处有困难，怎么办？',
        '我该如何了解自己是否准备好结婚了？'
    ],
    '健康': [
        '如何保持良好的作息习惯？',
        '工作忙碌，如何安排时间锻炼？',
        '长期焦虑影响健康，有什么调节方法？',
        '如何改善睡眠质量？'
    ]
};

// 聊天步骤管理
const ChatSteps = {
    // 初始化
    init() {
        // 确保examplesConfig存在
        if (typeof window.examplesConfig === 'undefined') {
            console.log('examplesConfig not found, using default');
            window.examplesConfig = defaultExamplesConfig;
        }
        return this;
    },
    
    // Step 1: 显示欢迎消息和功能胶囊
    startChatStep1() {
        // 初始化
        this.init();
        
        AppCore.AppState.chatStep = 1;
        
        // 重置事件监听器，确保正确的消息处理流程
        AppCore.setupEventListeners();
        
        // 显示系统消息
        setTimeout(() => {
            AppCore.UIUtil.showTypingIndicator();
            
            setTimeout(() => {
                AppCore.UIUtil.removeTypingIndicator();
                
                // 构建欢迎消息，支持多个主题
                let welcomeMessage = `看到您选择了<span class="highlight">${AppCore.AppState.currentThemes.join('、')}</span>`;
                if (AppCore.AppState.themeDetail) {
                    welcomeMessage += ` <span class="highlight">${AppCore.AppState.themeDetail}</span>`;
                }
                welcomeMessage += `主题，可以告诉我您的具体心事吗？您可以这样问：`;
                
                AppCore.UIUtil.addMessage('system', welcomeMessage);
                
                // 显示功能胶囊
                this.showFunctionCapsules();
            }, 1500);
        }, 500);
    },

    // 显示功能胶囊
    showFunctionCapsules() {
        const capsulesDiv = document.createElement('div');
        capsulesDiv.className = 'function-capsules';
        
        // 示例问胶囊
        const exampleCapsule = document.createElement('div');
        exampleCapsule.className = 'function-capsule';
        const exampleButton = document.createElement('button');
        exampleButton.textContent = '示例问';
        exampleButton.addEventListener('click', this.showExampleDropdown);
        exampleCapsule.appendChild(exampleButton);
        
        // 不了，继续胶囊
        const skipCapsule = document.createElement('div');
        skipCapsule.className = 'function-capsule';
        const skipButton = document.createElement('button');
        skipButton.textContent = '不了，继续';
        skipButton.addEventListener('click', () => {
            console.log('Skip button clicked');
            const inputField = AppCore.UI.chatInput;
            if (inputField) {
                inputField.value = '不了，继续';
                console.log('Input field filled with: 不了，继续');
                // 自动发送这条消息
                setTimeout(() => {
                    // 触发发送按钮点击事件
                    AppCore.UI.sendButton.click();
                }, 100);
            } else {
                console.error('Chat input field not found');
            }
            // 进入Step 2
            this.proceedToStep2();
        });
        skipCapsule.appendChild(skipButton);
        
        capsulesDiv.appendChild(exampleCapsule);
        capsulesDiv.appendChild(skipCapsule);
        AppCore.UI.chatMessages.appendChild(capsulesDiv);
        
        // 自动滚动到底部
        AppCore.UI.chatMessages.scrollTop = AppCore.UI.chatMessages.scrollHeight;
    },

    // 显示示例问下拉框
    showExampleDropdown() {
        console.log('showExampleDropdown function called');
        
        // 确保examplesConfig存在
        if (typeof window.examplesConfig === 'undefined') {
            console.log('examplesConfig not found in showExampleDropdown, using default');
            window.examplesConfig = defaultExamplesConfig;
        }
        
        console.log('exampleDropdown element:', AppCore.UI.exampleDropdown);
        console.log('exampleList element:', AppCore.UI.exampleList);
        console.log('Current themes:', AppCore.AppState.currentThemes);

        if (!AppCore.UI.exampleDropdown || !AppCore.UI.exampleList) {
            console.error("Dropdown elements not found!");
            return;
        }

        // 清空下拉框内容
        AppCore.UI.exampleDropdown.innerHTML = '';
        
        // 创建头部
        const header = document.createElement('div');
        header.className = 'dropdown-header';
        header.innerHTML = `
            <h3>推荐问法</h3>
            <button class="close-dropdown"><i class="fas fa-times"></i></button>
        `;
        AppCore.UI.exampleDropdown.appendChild(header);
        
        // 添加关闭按钮事件
        const closeBtn = header.querySelector('.close-dropdown');
        closeBtn.addEventListener('click', AppCore.UIUtil.hideExampleDropdown);
        
        // 如果有多个主题，创建标签栏
        if (AppCore.AppState.currentThemes.length > 1) {
            const tabsContainer = document.createElement('div');
            tabsContainer.className = 'tabs-container';
            AppCore.UI.exampleDropdown.appendChild(tabsContainer);
            
            // 为每个主题创建标签
            AppCore.AppState.currentThemes.forEach((theme, index) => {
                const tab = document.createElement('div');
                tab.className = 'tab';
                if (index === 0) tab.classList.add('active');
                tab.textContent = theme;
                tab.dataset.theme = theme;
                tab.addEventListener('click', (e) => {
                    // 切换标签
                    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                    e.target.classList.add('active');
                    
                    // 更新显示的问法列表
                    ChatSteps.showThemeExamples(theme);
                });
                tabsContainer.appendChild(tab);
            });
        }
        
        // 创建问法列表容器
        const listContainer = document.createElement('div');
        listContainer.className = 'example-list-container';
        AppCore.UI.exampleDropdown.appendChild(listContainer);
        
        // 显示第一个主题的问法
        ChatSteps.showThemeExamples(AppCore.AppState.currentThemes[0]);
        
        // 显示下拉框
        AppCore.UI.exampleDropdown.classList.add('active');
        console.log('Dropdown should be active now.');
    },

    // 显示特定主题的问法（支持分页）
    showThemeExamples(theme) {
        const listContainer = document.querySelector('.example-list-container');
        if (!listContainer) return;

        listContainer.innerHTML = '';

        // 使用全局的examplesConfig或默认配置
        const examplesConfig = window.examplesConfig || defaultExamplesConfig;
        const examples = examplesConfig[theme] || [];
        console.log(`Examples for theme ${theme}:`, examples);

        if (examples.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'empty-examples';
            emptyDiv.textContent = '暂无推荐问法';
            listContainer.appendChild(emptyDiv);
            return;
        }

        // 分页设置
        const itemsPerPage = 4;
        const totalPages = Math.ceil(examples.length / itemsPerPage);
        let currentPage = 0;

        // 创建分页容器
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'pagination-container';

        // 创建问法列表容器
        const examplesGrid = document.createElement('div');
        examplesGrid.className = 'examples-grid';

        // 显示当前页的问法
        function showPage(pageIndex) {
            examplesGrid.innerHTML = '';
            const startIndex = pageIndex * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, examples.length);

            for (let i = startIndex; i < endIndex; i++) {
                const example = examples[i];
                const exampleCard = document.createElement('div');
                exampleCard.className = 'example-card';
                exampleCard.innerHTML = `
                    <div class="example-text">${example}</div>
                    <div class="example-icon"><i class="fas fa-arrow-right"></i></div>
                `;

                exampleCard.addEventListener('click', () => {
                    console.log('Example clicked:', example);
                    const inputField = AppCore.UI.chatInput;
                    if (inputField) {
                        inputField.value = example;
                        console.log('Input field filled with:', example);
                        AppCore.UIUtil.hideExampleDropdown();
                        inputField.focus();

                        // 点击效果
                        exampleCard.style.transform = 'scale(0.95)';
                        setTimeout(() => exampleCard.style.transform = '', 150);
                    } else {
                        console.error('Chat input field not found');
                    }
                });

                examplesGrid.appendChild(exampleCard);
            }

            // 更新分页指示器
            updatePagination();
        }

        // 更新分页指示器
        function updatePagination() {
            paginationContainer.innerHTML = '';

            if (totalPages <= 1) return;

            // 上一页按钮
            const prevBtn = document.createElement('button');
            prevBtn.className = 'pagination-btn prev-btn';
            prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
            prevBtn.disabled = currentPage === 0;
            prevBtn.addEventListener('click', () => {
                if (currentPage > 0) {
                    currentPage--;
                    showPage(currentPage);
                }
            });
            paginationContainer.appendChild(prevBtn);

            // 页码指示器
            for (let i = 0; i < totalPages; i++) {
                const pageIndicator = document.createElement('div');
                pageIndicator.className = 'page-indicator';
                if (i === currentPage) pageIndicator.classList.add('active');
                pageIndicator.addEventListener('click', () => {
                    currentPage = i;
                    showPage(currentPage);
                });
                paginationContainer.appendChild(pageIndicator);
            }

            // 下一页按钮
            const nextBtn = document.createElement('button');
            nextBtn.className = 'pagination-btn next-btn';
            nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
            nextBtn.disabled = currentPage === totalPages - 1;
            nextBtn.addEventListener('click', () => {
                if (currentPage < totalPages - 1) {
                    currentPage++;
                    showPage(currentPage);
                }
            });
            paginationContainer.appendChild(nextBtn);
        }

        // 组装界面
        listContainer.appendChild(examplesGrid);
        listContainer.appendChild(paginationContainer);

        // 显示第一页
        showPage(0);
    },

    // 进入Step 2 - 选择解忧方案
    proceedToStep2() {
        console.log('Proceeding to Step 2');
        AppCore.AppState.chatStep = 2;
        
        // 显示系统消息
        setTimeout(() => {
            AppCore.UIUtil.showTypingIndicator();
            
            setTimeout(() => {
                AppCore.UIUtil.removeTypingIndicator();
                
                // 构建消息内容
                let message = '感谢您的分享。';
                if (AppCore.AppState.userDetails && AppCore.AppState.userDetails !== '不了，继续') {
                    message += '我已经了解了您的困扰，';
                }
                message += '请选择一种解忧方案：';
                
                AppCore.UIUtil.addMessage('system', message);
                
                // 显示功能胶囊
                this.showSchemeSelectionCapsules();
                
                // 修改发送消息行为
                AppCore.UI.sendButton.removeEventListener('click', ChatManager.sendMessage);
                AppCore.UI.chatInput.removeEventListener('keypress', AppCore.Helpers.handleKeyPress);
                
                AppCore.UI.sendButton.addEventListener('click', this.showSchemeSelectionReminder);
                AppCore.UI.chatInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.showSchemeSelectionReminder();
                    }
                });
            }, 1500);
        }, 500);
    },

    // 显示解忧方案选择胶囊
    showSchemeSelectionCapsules() {
        const capsulesDiv = document.createElement('div');
        capsulesDiv.className = 'function-capsules';
        
        // 数字起卦解忧
        const numbersCapsule = document.createElement('div');
        numbersCapsule.className = 'function-capsule';
        const numbersButton = document.createElement('button');
        numbersButton.textContent = '数字起卦解忧';
        numbersButton.addEventListener('click', () => {
            // 记录选择的方案
            AppCore.AppState.scheme = 'NumbersProject';
            AppCore.UIUtil.addMessage('user', '数字起卦解忧');
            
            // 进入Step 3
            NumbersProject.proceedToNumbersStep3();
        });
        numbersCapsule.appendChild(numbersButton);
        
        // 结合整体运势解忧
        const completeCapsule = document.createElement('div');
        completeCapsule.className = 'function-capsule';
        const completeButton = document.createElement('button');
        completeButton.textContent = '结合整体运势解忧';
        completeButton.addEventListener('click', () => {
            // 记录选择的方案
            AppCore.AppState.scheme = 'CompleteProject';
            AppCore.UIUtil.addMessage('user', '结合整体运势解忧');
            
            // 进入Step 3
            CompleteProject.proceedToCompleteStep3();
        });
        completeCapsule.appendChild(completeButton);
        
        capsulesDiv.appendChild(numbersCapsule);
        capsulesDiv.appendChild(completeCapsule);
        AppCore.UI.chatMessages.appendChild(capsulesDiv);
        
        // 自动滚动到底部
        AppCore.UI.chatMessages.scrollTop = AppCore.UI.chatMessages.scrollHeight;
    },

    // 显示方案选择提醒
    showSchemeSelectionReminder() {
        // 只有在Step 2才显示方案选择提醒
        if (AppCore.AppState.chatStep !== 2) {
            return;
        }
        
        const message = AppCore.UI.chatInput.value.trim();
        if (message === '') return;
        
        // 清空输入框
        AppCore.UI.chatInput.value = '';
        
        // 显示提醒消息
        setTimeout(() => {
            AppCore.UIUtil.addMessage('system', '请从上方选择一种解忧方案，而不是输入文字。');
        }, 300);
    },

    // 进入Step 3 - 根据不同方案
    proceedToStep3() {
        AppCore.AppState.chatStep = 3;
        
        // 恢复正常发送消息行为
        AppCore.UI.sendButton.removeEventListener('click', this.showSchemeSelectionReminder);
        AppCore.UI.chatInput.removeEventListener('keypress', AppCore.Helpers.handleKeyPress);
        
        if (AppCore.AppState.scheme === 'NumbersProject') {
            // 进入数字起卦解忧Step 3
            NumbersProject.proceedToNumbersStep3();
        } else if (AppCore.AppState.scheme === 'CompleteProject') {
            // 进入结合整体运势解忧Step 3
            CompleteProject.proceedToCompleteStep3();
        }
    }
};

// 导出模块
window.ChatManager = ChatManager;
window.ChatSteps = ChatSteps; 