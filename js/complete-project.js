// complete-project.js - 结合整体运势解忧方案模块

// 结合整体运势解忧方案管理
const CompleteProject = {
    // Step 3: 获取用户基本信息
    proceedToCompleteStep3() {
        console.log('Proceeding to Complete Project Step 3');
        AppCore.AppState.chatStep = 3;
        
        // 显示系统消息
        setTimeout(() => {
            AppCore.UIUtil.showTypingIndicator();
            
            setTimeout(() => {
                AppCore.UIUtil.removeTypingIndicator();
                
                // 请求用户输入基本信息
                AppCore.UIUtil.addMessage('system', '好的，请输入您的基本信息：公历/农历+出生日期+出生时间+性别+年龄，如：公历1990年1月1日12:00，女，35岁');
                
                // 设置输入监听
                this.setupProfileInput();
            }, 1500);
        }, 500);
    },

    // 设置输入监听
    setupProfileInput() {
        // 移除所有可能存在的事件监听器，特别是Step 2的事件监听器
        this.removeAllEventListeners();
        
        // 添加新的事件监听器
        const handleProfileInput = () => {
            const profileInfo = AppCore.UI.chatInput.value.trim();
            if (profileInfo === '') return;
            
            // 添加用户消息
            AppCore.UIUtil.addMessage('user', profileInfo);
            
            // 清空输入框
            AppCore.UI.chatInput.value = '';
            
            // 验证输入信息
            if (this.validateProfileInfo(profileInfo)) {
                // 保存用户信息
                AppCore.AppState.profile = profileInfo;
                
                // 进入Step 4
                this.proceedToCompleteStep4();
            } else {
                // 显示提示信息
                setTimeout(() => {
                    AppCore.UIUtil.addMessage('system', '<span class="input-hint">请您输入正确的出生信息：公历/农历+出生日期+出生时间+性别+年龄，如：公历1990年1月1日12:00，女，35岁</span>');
                }, 500);
            }
        };
        
        // 绑定事件
        AppCore.UI.sendButton.addEventListener('click', handleProfileInput);
        AppCore.UI.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleProfileInput();
            }
        });
    },

    // 验证用户输入的出生信息
    validateProfileInfo(info) {
        // 检查是否包含公历或农历
        const hasCalendarType = /公历|农历/.test(info);
        
        // 检查是否包含出生日期（简单验证年月日格式）
        const hasBirthDate = /\d{4}年\d{1,2}月\d{1,2}日/.test(info);
        
        console.log(`验证出生信息: 包含历法=${hasCalendarType}, 包含出生日期=${hasBirthDate}`);
        
        return hasCalendarType && hasBirthDate;
    },

    // Step 4: 初始化整体运势解忧对话
    proceedToCompleteStep4() {
        console.log('Proceeding to Complete Project Step 4');
        AppCore.AppState.chatStep = 4;
        
        // 准备对话历史数据
        ConversationManager.initCompleteHistory();
        console.log('初始化整体运势解忧对话历史，当前追问次数:', ConversationManager.getCurrentCompleteIndex());
        
        // 显示正在解读提示
        this.showStepFourInitialMessage();
    },
    
    // 显示Step 4初始消息
    showStepFourInitialMessage() {
        console.log('显示Step 4初始消息，准备整体运势解忧API调用');
        
        // 保存this引用
        const self = this;
        
        // 发送正在解读的消息
        setTimeout(() => {
            AppCore.UIUtil.showTypingIndicator();

            // 调用真实的DeepSeek API
            setTimeout(async () => {
                console.log('🎯 整体运势 - 开始初始解读');

                try {
                    const messages = ApiService.buildCompleteInitialPrompt();

                    // 调用DeepSeek API并处理流式响应
                    await ApiService.callDeepSeekApi(
                        messages,
                        // onReasoningUpdate - 处理思考过程
                        (reasoning, isFirst) => {
                            if (isFirst) {
                                AppCore.UIUtil.removeTypingIndicator();
                                // 创建消息容器
                                const messageDiv = document.createElement('div');
                                messageDiv.className = 'message system';
                                messageDiv.innerHTML = `
                                    <div class="message-content">
                                        <div class="reasoning-content">
                                            <span class="reasoning-title">思考历程</span>
                                            ${MarkdownService.formatMarkdown(reasoning)}
                                        </div>
                                    </div>
                                `;
                                AppCore.UI.chatMessages.appendChild(messageDiv);
                                AppCore.UI.chatMessages.scrollTop = AppCore.UI.chatMessages.scrollHeight;
                            } else {
                                // 更新思考过程内容
                                const messages = document.querySelectorAll('.message.system');
                                const lastMessage = messages[messages.length - 1];
                                if (lastMessage) {
                                    const reasoningDiv = lastMessage.querySelector('.reasoning-content');
                                    if (reasoningDiv) {
                                        reasoningDiv.innerHTML = `
                                            <span class="reasoning-title">思考历程</span>
                                            ${MarkdownService.formatMarkdown(reasoning)}
                                        `;
                                    }
                                }
                                AppCore.UI.chatMessages.scrollTop = AppCore.UI.chatMessages.scrollHeight;
                            }
                        },
                        // onAnswerUpdate - 处理正式回答
                        (answer) => {
                            const messages = document.querySelectorAll('.message.system');
                            const lastMessage = messages[messages.length - 1];
                            if (lastMessage) {
                                let answerDiv = lastMessage.querySelector('.answer-content');
                                if (!answerDiv) {
                                    answerDiv = document.createElement('div');
                                    answerDiv.className = 'answer-content';
                                    lastMessage.querySelector('.message-content').appendChild(answerDiv);
                                }
                                answerDiv.innerHTML = MarkdownService.formatMarkdown(answer);
                                AppCore.UI.chatMessages.scrollTop = AppCore.UI.chatMessages.scrollHeight;
                            }
                        },
                        // onComplete - 完成处理
                        (result) => {
                            console.log('初始API调用完成，结果:', result);

                            // 保存结果到对话历史
                            ConversationManager.addCompleteResult(result.combined || result.answer || result.reasoning);

                            // 显示解忧小Tips胶囊
                            self.showTipsButton();

                            // 设置输入框事件监听
                            self.setupStepFourInput();

                            console.log('初始API调用完成，已设置事件监听器');
                        },
                        // onError - 错误处理
                        (error) => {
                            console.error('初始API调用失败:', error);
                            AppCore.UIUtil.removeTypingIndicator();
                            AppCore.UIUtil.addMessage('system', `抱歉，解读过程中出现了问题：${error.message || '未知错误'}。请稍后重试。`);
                        }
                    );
                } catch (error) {
                    console.error('初始API调用异常:', error);
                    AppCore.UIUtil.removeTypingIndicator();
                    AppCore.UIUtil.addMessage('system', `抱歉，解读过程中出现了问题：${error.message || '未知错误'}。请稍后重试。`);
                }
            }, 1000);
        }, 500);
    },
    
    // 设置Step 4输入监听
    setupStepFourInput() {
        console.log('Setting up Step 4 input listeners for CompleteProject');
        
        // 移除所有可能存在的事件监听器
        this.removeAllEventListeners();
        
        // 保存handleCompleteInput方法的引用
        const boundHandleCompleteInput = this.handleCompleteInput.bind(this);
        
        // 为输入添加keypress事件
        const keyPressHandler = (e) => {
            if (e.key === 'Enter') {
                boundHandleCompleteInput();
            }
        };
        
        // 绑定事件
        AppCore.UI.sendButton.addEventListener('click', boundHandleCompleteInput);
        AppCore.UI.chatInput.addEventListener('keypress', keyPressHandler);
        
        console.log('Step 4 input listeners have been set up');
    },
    
    // 处理整体运势解忧方案的用户追问
    handleCompleteInput() {
        console.log('Handling user follow-up input in Complete Project Step 4');
        
        // 确保当前在Step 4
        if (AppCore.AppState.chatStep !== 4) {
            console.warn('handleCompleteInput called but not in Step 4, current step:', AppCore.AppState.chatStep);
            return;
        }
        
        const message = AppCore.UI.chatInput.value.trim();
        if (message === '') return;
        
        // 添加用户消息
        AppCore.UIUtil.addMessage('user', message);
        
        // 保存用户追问
        ConversationManager.addCompleteQuery(message);
        
        // 清空输入框
        AppCore.UI.chatInput.value = '';
        
        // 检查是否达到最大追问次数
        if (ConversationManager.hasReachedMaxCompleteQueries()) {
            // 达到最大次数，提示用户
            setTimeout(() => {
                AppCore.UIUtil.addMessage('system', '您的追问次数已达上限，建议您查看解忧小Tips或重新开始。');
                this.showTipsButton();
            }, 500);
            return;
        }
        
        // 显示正在解读提示
        setTimeout(() => {
            AppCore.UIUtil.showTypingIndicator();

            // 调用真实的DeepSeek API
            setTimeout(async () => {
                console.log('🎯 整体运势 - 处理追问');

                try {
                    const messages = ApiService.buildCompleteFollowUpPrompt();

                    // 调用DeepSeek API并处理流式响应
                    await ApiService.callDeepSeekApi(
                        messages,
                        // onReasoningUpdate - 处理思考过程
                        (reasoning, isFirst) => {
                            if (isFirst) {
                                AppCore.UIUtil.removeTypingIndicator();
                                // 创建消息容器
                                const messageDiv = document.createElement('div');
                                messageDiv.className = 'message system';
                                messageDiv.innerHTML = `
                                    <div class="message-content">
                                        <div class="reasoning-content">
                                            <span class="reasoning-title">思考历程</span>
                                            ${MarkdownService.formatMarkdown(reasoning)}
                                        </div>
                                    </div>
                                `;
                                AppCore.UI.chatMessages.appendChild(messageDiv);
                                AppCore.UI.chatMessages.scrollTop = AppCore.UI.chatMessages.scrollHeight;
                            } else {
                                // 更新思考过程内容
                                const messages = document.querySelectorAll('.message.system');
                                const lastMessage = messages[messages.length - 1];
                                if (lastMessage) {
                                    const reasoningDiv = lastMessage.querySelector('.reasoning-content');
                                    if (reasoningDiv) {
                                        reasoningDiv.innerHTML = `
                                            <span class="reasoning-title">思考历程</span>
                                            ${MarkdownService.formatMarkdown(reasoning)}
                                        `;
                                    }
                                }
                                AppCore.UI.chatMessages.scrollTop = AppCore.UI.chatMessages.scrollHeight;
                            }
                        },
                        // onAnswerUpdate - 处理正式回答
                        (answer) => {
                            const messages = document.querySelectorAll('.message.system');
                            const lastMessage = messages[messages.length - 1];
                            if (lastMessage) {
                                let answerDiv = lastMessage.querySelector('.answer-content');
                                if (!answerDiv) {
                                    answerDiv = document.createElement('div');
                                    answerDiv.className = 'answer-content';
                                    lastMessage.querySelector('.message-content').appendChild(answerDiv);
                                }
                                answerDiv.innerHTML = MarkdownService.formatMarkdown(answer);
                                AppCore.UI.chatMessages.scrollTop = AppCore.UI.chatMessages.scrollHeight;
                            }
                        },
                        // onComplete - 完成处理
                        (result) => {
                            console.log('追问API调用完成，结果:', result);

                            // 保存结果
                            ConversationManager.addCompleteResult(result.combined || result.answer || result.reasoning);

                            // 增加追问索引
                            ConversationManager.incrementCompleteIndex();

                            // 显示"解忧小Tips"胶囊
                            this.showTipsButton();

                            console.log('Follow-up response completed, current query index:',
                                ConversationManager.getCurrentCompleteIndex());
                        },
                        // onError - 错误处理
                        (error) => {
                            console.error('追问API调用失败:', error);
                            AppCore.UIUtil.removeTypingIndicator();
                            AppCore.UIUtil.addMessage('system', `抱歉，解读过程中出现了问题：${error.message || '未知错误'}。请稍后重试。`);
                        }
                    );
                } catch (error) {
                    console.error('追问API调用异常:', error);
                    AppCore.UIUtil.removeTypingIndicator();
                    AppCore.UIUtil.addMessage('system', `抱歉，解读过程中出现了问题：${error.message || '未知错误'}。请稍后重试。`);
                }
            }, 1000);
        }, 500);
    },
    
    // 显示"解忧小Tips"按钮
    showTipsButton() {
        const capsulesDiv = document.createElement('div');
        capsulesDiv.className = 'function-capsules';
        
        const tipsCapsule = document.createElement('div');
        tipsCapsule.className = 'function-capsule';
        const tipsButton = document.createElement('button');
        tipsButton.textContent = '解忧小Tips';
        tipsButton.addEventListener('click', () => {
            // 设置solution字段
            ConversationManager.setCompleteSolution('GiveMeTips');
            
            // 进入Step 5
            this.proceedToCompleteStep5();
        });
        tipsCapsule.appendChild(tipsButton);
        
        capsulesDiv.appendChild(tipsCapsule);
        AppCore.UI.chatMessages.appendChild(capsulesDiv);
        
        // 自动滚动到底部
        AppCore.UI.chatMessages.scrollTop = AppCore.UI.chatMessages.scrollHeight;
    },

    // Step 5: 整体运势解忧的最终阶段
    proceedToCompleteStep5() {
        console.log('Proceeding to Complete Project Step 5');
        AppCore.AppState.chatStep = 5;
        
        // 移除所有现有的事件监听器
        this.removeAllEventListeners();
        
        // 显示正在生成解忧Tips的提示
        setTimeout(() => {
            AppCore.UIUtil.showTypingIndicator();

            // 调用真实的DeepSeek API
            setTimeout(async () => {
                console.log('🎯 整体运势 - 生成解忧Tips');

                try {
                    const messages = ApiService.buildCompleteTipsPrompt();

                    // 调用DeepSeek API并处理流式响应
                    await ApiService.callDeepSeekApi(
                        messages,
                        // onReasoningUpdate - 处理思考过程
                        (reasoning, isFirst) => {
                            if (isFirst) {
                                AppCore.UIUtil.removeTypingIndicator();
                                // 创建消息容器
                                const messageDiv = document.createElement('div');
                                messageDiv.className = 'message system';
                                messageDiv.innerHTML = `
                                    <div class="message-content">
                                        <div class="reasoning-content">
                                            <span class="reasoning-title">思考历程</span>
                                            ${MarkdownService.formatMarkdown(reasoning)}
                                        </div>
                                    </div>
                                `;
                                AppCore.UI.chatMessages.appendChild(messageDiv);
                                AppCore.UI.chatMessages.scrollTop = AppCore.UI.chatMessages.scrollHeight;
                            } else {
                                // 更新思考过程内容
                                const messages = document.querySelectorAll('.message.system');
                                const lastMessage = messages[messages.length - 1];
                                if (lastMessage) {
                                    const reasoningDiv = lastMessage.querySelector('.reasoning-content');
                                    if (reasoningDiv) {
                                        reasoningDiv.innerHTML = `
                                            <span class="reasoning-title">思考历程</span>
                                            ${MarkdownService.formatMarkdown(reasoning)}
                                        `;
                                    }
                                }
                                AppCore.UI.chatMessages.scrollTop = AppCore.UI.chatMessages.scrollHeight;
                            }
                        },
                        // onAnswerUpdate - 处理正式回答
                        (answer) => {
                            const messages = document.querySelectorAll('.message.system');
                            const lastMessage = messages[messages.length - 1];
                            if (lastMessage) {
                                let answerDiv = lastMessage.querySelector('.answer-content');
                                if (!answerDiv) {
                                    answerDiv = document.createElement('div');
                                    answerDiv.className = 'answer-content';
                                    lastMessage.querySelector('.message-content').appendChild(answerDiv);
                                }
                                answerDiv.innerHTML = MarkdownService.formatMarkdown(answer);
                                AppCore.UI.chatMessages.scrollTop = AppCore.UI.chatMessages.scrollHeight;
                            }
                        },
                        // onComplete - 完成处理
                        (result) => {
                            console.log('Tips API调用完成，结果:', result);

                            // 保存结果到Tips历史
                            ApiService.addCompleteTipsResult(result.combined || result.answer || result.reasoning);

                            // 设置事件监听器处理Tips追问
                            this.setupStepFiveTipsListeners();
                        },
                        // onError - 错误处理
                        (error) => {
                            console.error('Tips API调用失败:', error);
                            AppCore.UIUtil.removeTypingIndicator();
                            AppCore.UIUtil.addMessage('system', `抱歉，获取解忧Tips时出现了问题：${error.message || '未知错误'}。请稍后重试。`);
                        }
                    );
                } catch (error) {
                    console.error('Tips API调用异常:', error);
                    AppCore.UIUtil.removeTypingIndicator();
                    AppCore.UIUtil.addMessage('system', `抱歉，获取解忧Tips时出现了问题：${error.message || '未知错误'}。请稍后重试。`);
                }
            }, 1000);
        }, 500);
    },
    
    // 设置Step 5 Tips事件监听器
    setupStepFiveTipsListeners() {
        console.log('Setting up Step 5 Tips listeners for CompleteProject');
        
        // 移除所有可能存在的事件监听器
        this.removeAllEventListeners();
        
        // 先检查是否已达到最大Tips追问次数
        if (ApiService.hasReachedMaxCompleteTipsQueries()) {
            console.log('已达到最大Tips追问次数，绑定特殊处理函数');
            
            // 如果已达到最大追问次数，添加特殊处理函数
            const handleMaxTipsQueries = () => {
                const message = AppCore.UI.chatInput.value.trim();
                if (message === '') return;
                
                // 显示用户消息
                AppCore.UIUtil.addMessage('user', message);
                
                // 清空输入框
                AppCore.UI.chatInput.value = '';
                
                // 显示最终提示消息
                setTimeout(() => {
                    AppCore.UIUtil.addMessage('system', '感谢您的使用，祝您天天好心情！');
                }, 500);
            };
            
            // 绑定事件
            AppCore.UI.sendButton.addEventListener('click', handleMaxTipsQueries);
            AppCore.UI.chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleMaxTipsQueries();
                }
            });
        } else {
            // 正常Tips追问处理函数
            const boundHandleTipsInput = this.handleStepFiveTipsInput.bind(this);
            
            // 绑定事件
            AppCore.UI.sendButton.addEventListener('click', boundHandleTipsInput);
            AppCore.UI.chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    boundHandleTipsInput();
                }
            });
            
            console.log('Step 5 Tips事件监听器设置完成，当前Tips追问次数:', ApiService.getCurrentCompleteTipsIndex());
        }
    },
    
    // 处理Step 5 Tips用户输入
    handleStepFiveTipsInput() {
        console.log('处理用户Tips追问，当前步骤:', AppCore.AppState.chatStep);
        
        // 确保当前在Step 5
        if (AppCore.AppState.chatStep !== 5) {
            console.warn('handleStepFiveTipsInput called but not in Step 5, current step:', AppCore.AppState.chatStep);
            return;
        }
        
        const message = AppCore.UI.chatInput.value.trim();
        if (message === '') return;
        
        // 添加用户消息
        AppCore.UIUtil.addMessage('user', message);
        
        // 保存用户Tips追问
        ApiService.addCompleteTipsQuery(message);
        
        // 清空输入框
        AppCore.UI.chatInput.value = '';
        
        // 检查是否达到最大Tips追问次数
        if (ApiService.hasReachedMaxCompleteTipsQueries()) {
            // 达到最大次数，提示用户
            setTimeout(() => {
                AppCore.UIUtil.addMessage('system', '感谢您的使用，祝您天天好心情！');
                
                // 重新设置事件监听器，确保下一次用户输入也会收到相同的提示
                this.setupStepFiveTipsListeners();
            }, 500);
            return;
        }
        
        // 显示正在生成回答提示
        setTimeout(() => {
            AppCore.UIUtil.showTypingIndicator();

            // 调用真实的DeepSeek API
            setTimeout(async () => {
                console.log('🎯 整体运势 - 处理Tips追问');

                try {
                    const messages = ApiService.buildCompleteTipsFollowUpPrompt();

                    // 调用DeepSeek API并处理流式响应
                    await ApiService.callDeepSeekApi(
                        messages,
                        // onReasoningUpdate - 处理思考过程
                        (reasoning, isFirst) => {
                            if (isFirst) {
                                AppCore.UIUtil.removeTypingIndicator();
                                // 创建消息容器
                                const messageDiv = document.createElement('div');
                                messageDiv.className = 'message system';
                                messageDiv.innerHTML = `
                                    <div class="message-content">
                                        <div class="reasoning-content">
                                            <span class="reasoning-title">思考历程</span>
                                            ${MarkdownService.formatMarkdown(reasoning)}
                                        </div>
                                    </div>
                                `;
                                AppCore.UI.chatMessages.appendChild(messageDiv);
                                AppCore.UI.chatMessages.scrollTop = AppCore.UI.chatMessages.scrollHeight;
                            } else {
                                // 更新思考过程内容
                                const messages = document.querySelectorAll('.message.system');
                                const lastMessage = messages[messages.length - 1];
                                if (lastMessage) {
                                    const reasoningDiv = lastMessage.querySelector('.reasoning-content');
                                    if (reasoningDiv) {
                                        reasoningDiv.innerHTML = `
                                            <span class="reasoning-title">思考历程</span>
                                            ${MarkdownService.formatMarkdown(reasoning)}
                                        `;
                                    }
                                }
                                AppCore.UI.chatMessages.scrollTop = AppCore.UI.chatMessages.scrollHeight;
                            }
                        },
                        // onAnswerUpdate - 处理正式回答
                        (answer) => {
                            const messages = document.querySelectorAll('.message.system');
                            const lastMessage = messages[messages.length - 1];
                            if (lastMessage) {
                                let answerDiv = lastMessage.querySelector('.answer-content');
                                if (!answerDiv) {
                                    answerDiv = document.createElement('div');
                                    answerDiv.className = 'answer-content';
                                    lastMessage.querySelector('.message-content').appendChild(answerDiv);
                                }
                                answerDiv.innerHTML = MarkdownService.formatMarkdown(answer);
                                AppCore.UI.chatMessages.scrollTop = AppCore.UI.chatMessages.scrollHeight;
                            }
                        },
                        // onComplete - 完成处理
                        (result) => {
                            console.log('Tips追问API调用完成，结果:', result);

                            // 保存结果
                            ApiService.addCompleteTipsResult(result.combined || result.answer || result.reasoning);

                            // 增加Tips追问索引
                            ApiService.incrementCompleteTipsIndex();

                            console.log(`用户Tips追问后，当前追问次数增加为: ${ApiService.getCurrentCompleteTipsIndex()}`);

                            // 如果已达到最大追问次数，显示重新开始按钮
                            if (ApiService.hasReachedMaxCompleteTipsQueries()) {
                                this.showRestartOption();
                            }

                            // 重新设置事件监听器，以处理最大追问次数检查
                            this.setupStepFiveTipsListeners();
                        },
                        // onError - 错误处理
                        (error) => {
                            console.error('Tips追问API调用失败:', error);
                            AppCore.UIUtil.removeTypingIndicator();
                            AppCore.UIUtil.addMessage('system', `抱歉，解读过程中出现了问题：${error.message || '未知错误'}。请稍后重试。`);

                            // 重新设置事件监听器
                            this.setupStepFiveTipsListeners();
                        }
                    );
                } catch (error) {
                    console.error('Tips追问API调用异常:', error);
                    AppCore.UIUtil.removeTypingIndicator();
                    AppCore.UIUtil.addMessage('system', `抱歉，解读过程中出现了问题：${error.message || '未知错误'}。请稍后重试。`);

                    // 重新设置事件监听器
                    this.setupStepFiveTipsListeners();
                }
            }, 1000);
        }, 500);
    },
    
    // 显示重新开始的选项
    showRestartOption() {
        const capsulesDiv = document.createElement('div');
        capsulesDiv.className = 'function-capsules';
        
        // 重新开始
        const restartCapsule = document.createElement('div');
        restartCapsule.className = 'function-capsule';
        const restartButton = document.createElement('button');
        restartButton.textContent = '重新开始';
        restartButton.addEventListener('click', () => {
            // 返回首页
            AppCore.UIUtil.addMessage('user', '重新开始');
            document.getElementById('chat-page').classList.remove('active');
            document.getElementById('home-page').classList.add('active');
        });
        restartCapsule.appendChild(restartButton);
        
        capsulesDiv.appendChild(restartCapsule);
        AppCore.UI.chatMessages.appendChild(capsulesDiv);
        
        // 自动滚动到底部
        AppCore.UI.chatMessages.scrollTop = AppCore.UI.chatMessages.scrollHeight;
    },
    
    // 移除所有事件监听器
    removeAllEventListeners() {
        console.log('Removing all event listeners for CompleteProject');
        
        // 移除常见的事件监听器
        AppCore.UI.sendButton.removeEventListener('click', ChatManager.sendMessage);
        AppCore.UI.sendButton.removeEventListener('click', ChatSteps.showSchemeSelectionReminder);
        AppCore.UI.chatInput.removeEventListener('keypress', AppCore.Helpers.handleKeyPress);
        
        // 重置完成后清空所有事件
        try {
            // 复制原始元素
            const oldSendButton = AppCore.UI.sendButton;
            const oldChatInput = AppCore.UI.chatInput;
            
            // 创建新元素
            const newSendButton = oldSendButton.cloneNode(true);
            const newChatInput = oldChatInput.cloneNode(true);
            
            // 替换元素
            oldSendButton.parentNode.replaceChild(newSendButton, oldSendButton);
            oldChatInput.parentNode.replaceChild(newChatInput, oldChatInput);
            
            // 更新引用
            AppCore.UI.sendButton = newSendButton;
            AppCore.UI.chatInput = newChatInput;
            
            console.log('Event listeners cleared by replacing elements');
        } catch (e) {
            console.warn('Error clearing event listeners by replacement:', e);
            console.log('Falling back to manual event listener removal');
            
            // 备用方法：手动尝试移除常见的事件处理函数
            try {
                // 尝试移除可能存在的handleProfileInput
                const setupProfileInputFn = this.setupProfileInput;
                if (setupProfileInputFn) {
                    const handleProfileInputFn = setupProfileInputFn.handleProfileInput;
                    if (handleProfileInputFn) {
                        AppCore.UI.sendButton.removeEventListener('click', handleProfileInputFn);
                    }
                }
                
                // 尝试移除handleCompleteInput
                if (this.handleCompleteInput) {
                    AppCore.UI.sendButton.removeEventListener('click', this.handleCompleteInput);
                    AppCore.UI.sendButton.removeEventListener('click', this.handleCompleteInput.bind(this));
                }
            } catch (e2) {
                console.warn('Error in fallback event listener removal:', e2);
            }
        }
    },
    
    // 重置状态
    reset() {
        console.log('Resetting Complete Project state');
        
        // 移除所有事件监听器
        this.removeAllEventListeners();
        
        return this;
    }
};

// 导出模块
window.CompleteProject = CompleteProject; 