document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');

    // 添加Markdown格式转换函数
    function formatMarkdown(text) {
        if (!text) return '';
        
        // 处理代码块 ```code```，需要先处理代码块，否则会影响其他替换
        text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        
        // 处理行内代码 `code`
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // 处理标题，确保更严格的匹配规则，必须在行首
        text = text.replace(/^(#{1,6})\s+(.*?)$/gm, function(match, hashes, content) {
            const level = Math.min(hashes.length + 2, 6); // h3-h6
            return `<h${level} class="md-heading" style="color: var(--highlight-color); font-weight: 600; font-size: 1.1em;">${content.trim()}</h${level}>`;
        });
        
        // 处理粗体 **text**，使用非贪婪匹配
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // 处理斜体 *text*，使用非贪婪匹配，并排除已替换的粗体情况
        text = text.replace(/\*([^\*]+)\*/g, '<em>$1</em>');
        
        // 先清理可能存在的多余列表标记，避免双重列表
        text = text.replace(/<\/?[ou]l>|<li>/gi, '');
        
        // 收集所有列表项，统一处理
        const lines = text.split('\n');
        let processedLines = [];
        let inOrderedList = false;
        let inUnorderedList = false;
        let listBuffer = [];
        let previousLineWasList = false;
        let currentListStartsAt = 1; // 追踪有序列表的起始数字
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // 检查是否是有序列表项
            if (/^\d+\.\s+(.*)$/.test(line)) {
                // 提取列表项的序号
                const numberMatch = line.match(/^(\d+)\.\s+(.*)/);
                const itemNumber = numberMatch ? parseInt(numberMatch[1]) : 1;
                
                // 如果之前在无序列表中，先结束无序列表
                if (inUnorderedList) {
                    processedLines.push('<ul>' + listBuffer.join('') + '</ul>');
                    listBuffer = [];
                    inUnorderedList = false;
                }
                
                // 如果不在有序列表中，或者前一行不是列表项，开始一个新的有序列表
                if (!inOrderedList) {
                    inOrderedList = true;
                    listBuffer = [];
                    currentListStartsAt = itemNumber; // 记录新列表的起始序号
                }
                
                // 把列表项添加到缓冲区
                const content = line.replace(/^\d+\.\s+(.*)$/, '$1');
                listBuffer.push(`<li>${content}</li>`);
                previousLineWasList = true;
            }
            // 检查是否是无序列表项
            else if (/^[-*]\s+(.*)$/.test(line)) {
                // 如果之前在有序列表中，先结束有序列表
                if (inOrderedList) {
                    // 指定起始序号，确保序列保持一致
                    processedLines.push(`<ol start="${currentListStartsAt}">` + listBuffer.join('') + '</ol>');
                    listBuffer = [];
                    inOrderedList = false;
                }
                
                // 如果不在无序列表中，开始一个新的无序列表
                if (!inUnorderedList) {
                    inUnorderedList = true;
                    listBuffer = [];
                }
                
                // 把列表项添加到缓冲区，统一使用disc样式
                listBuffer.push('<li>' + line.replace(/^[-*]\s+(.*)$/, '$1') + '</li>');
                previousLineWasList = true;
            }
            // 如果不是列表项，结束之前可能开始的列表
            else {
                if (inOrderedList) {
                    processedLines.push(`<ol start="${currentListStartsAt}">` + listBuffer.join('') + '</ol>');
                    listBuffer = [];
                    inOrderedList = false;
                }
                if (inUnorderedList) {
                    processedLines.push('<ul>' + listBuffer.join('') + '</ul>');
                    listBuffer = [];
                    inUnorderedList = false;
                }
                
                processedLines.push(line);
                previousLineWasList = false;
            }
        }
        
        // 处理最后一个列表（如果有）
        if (inOrderedList) {
            processedLines.push(`<ol start="${currentListStartsAt}">` + listBuffer.join('') + '</ol>');
        }
        if (inUnorderedList) {
            processedLines.push('<ul>' + listBuffer.join('') + '</ul>');
        }
        
        text = processedLines.join('\n');
        
        // 处理链接 [text](url)
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        // 处理水平线，支持更多格式：--- 或 *** 或 ___，但减少使用
        text = text.replace(/^(\-{3,}|\*{3,}|_{3,})$/gm, '<hr class="subtle-hr">');
        
        // 减少段落和换行符，避免过多空白
        // 合并多个换行符为最多两个换行符
        text = text.replace(/\n{3,}/g, '\n\n');
        
        // 处理段落，确保段落间距适中
        text = text.replace(/\n\n/g, '</p><p>');
        
        // 处理换行，确保在块级元素后不添加额外的<br>
        text = text.replace(/\n(?![<\/])/g, ' '); // 替换为空格而不是<br>，减少换行
        
        // 确保内容在段落中
        if (!text.startsWith('<')) {
            text = `<p>${text}</p>`;
        }
        
        // 修复由于处理段落导致的多余标签
        text = text.replace(/<p><\/p>/g, '');
        
        // 清理可能出现的空段落
        text = text.replace(/<p>\s*<\/p>/g, '');
        
        // 减少连续的<br>标签
        text = text.replace(/<br\s*\/?>\s*<br\s*\/?>/g, '<br>');
        
        return text;
    }

    const conversationHistory = {
        messages: [], // 存储 { role: 'user'/'assistant', content: '...' } 格式的消息
        MAX_TURNS: 6, // 用户提问+机器人回答算一轮
        currentTurn: 0,

        addMessage: function(role, content) {
            this.messages.push({ role, content });
            if (role === 'assistant') {
                this.currentTurn++;
            }
        },

        canContinue: function() {
            return this.currentTurn < this.MAX_TURNS;
        },

        // 初始提示词：{用户想咨询${ queries:[] }，请解答}
        generateInitialPrompt: function(userQuery) {
            // 构建符合DeepSeek API期望的messages格式
            return [
                { role: "user", content: `用户想咨询"${userQuery}"，请解答。` }
            ];
        },

        // 追问提示词：{以下是之前的对话历史： 用户：${queries[0]} 系统：${results[0]} ... 用户：${queries[]} 请继续解答用户的问题，并与之前的回答保持一致性}
        generateFollowUpPrompt: function(currentUserQuery) {
            let historyForPrompt = [];
            // DeepSeek API通常期望历史消息的格式为 [{role: "user", content: "..."}, {role: "assistant", content: "..."}, ...]
            this.messages.forEach(msg => {
                historyForPrompt.push({ role: msg.role, content: msg.content });
            });
            historyForPrompt.push({ role: "user", content: `请继续解答用户的问题："${currentUserQuery}"，并与之前的回答保持一致性。` });
            return historyForPrompt;
        }
    };

    function displayMessage(sender, text) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');

        const senderName = sender === 'user' ? '您' : '悟空';
        
        const messageContent = document.createElement('div');
        messageContent.classList.add('message-content');
        
        // 添加内容渲染
        if (sender === 'user') {
            messageContent.innerHTML = `<span class="message-sender">${senderName}</span>${text.replace(/\n/g, '<br>')}`;
        } else {
            messageContent.innerHTML = `<span class="message-sender">${senderName}</span>${formatMarkdown(text)}`;
        }

        messageElement.appendChild(messageContent);
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight; // 自动滚动到底部
    }
    

    async function callDeepSeekAPI(promptMessages) {
        try {
            const apiKey = "Bearer sk-10f27c9913054c138a23c756cd4f5381";
            const baseURL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
            
            // 使用原生fetch API直接调用DeepSeek API
            const response = await fetch(`${baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': apiKey
                },
                body: JSON.stringify({
                    model: 'deepseek-r1',
                    messages: promptMessages,
                    stream: true
                }),
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `API请求失败: ${response.status} ${response.statusText}`);
            }
            
            // 确保响应是可读流
            if (!response.body) {
                throw new Error('响应中没有数据流');
            }
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let fullContent = '';
            let answerContent = ''; // 添加变量保存回答内容
            let isFirstChunk = true;
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                // 解码二进制数据为文本
                const chunk = decoder.decode(value, { stream: true });
                
                // 处理SSE格式的数据
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data:')) {
                        try {
                            // 检查是否是[DONE]消息
                            const trimmedData = line.substring(5).trim();
                            if (trimmedData === '[DONE]') {
                                // 这是结束标记，不需要解析为JSON
                                break;
                            }
                            
                            // 正常解析JSON数据
                            const data = JSON.parse(trimmedData);
                            if (data.choices && data.choices.length > 0) {
                                const delta = data.choices[0].delta;
                                
                                // 处理思考过程(reasoning_content字段)
                                // 当API返回包含reasoning_content时，表示这是机器人的思考过程
                                if (delta.reasoning_content) {
                                    // 如果是第一个数据块，需要先移除'正在思考中'的提示消息
                                    if (isFirstChunk) {
                                        // 查找所有机器人消息，获取最后一条
                                        const thinkingMessages = document.querySelectorAll('.message.bot-message');
                                        const lastMessage = thinkingMessages[thinkingMessages.length - 1];
                                        
                                        // 如果最后一条消息是'正在思考中'提示，则移除它
                                        if (lastMessage && lastMessage.textContent.includes('悟空正在思考中')) {
                                            chatMessages.removeChild(lastMessage);
                                        }
                                        
                                        // 创建新的机器人消息容器，用于显示思考过程
                                        const messageElement = document.createElement('div');
                                        messageElement.classList.add('message', 'bot-message');
                                        
                                        // 创建消息内容容器，设置HTML结构
                                        const messageContent = document.createElement('div');
                                        messageContent.classList.add('message-content');
                                        messageContent.innerHTML = `
                                            <span class="message-sender">悟空</span>
                                            <div class="reasoning-content">
                                                <span class="reasoning-title">思考历程</span>
                                                ${formatMarkdown(delta.reasoning_content)}
                                            </div>
                                        `;
                                        
                                        messageElement.appendChild(messageContent);
                                        chatMessages.appendChild(messageElement);
                                        isFirstChunk = false;
                                    }
                                    
                                    fullContent += delta.reasoning_content;
                                    
                                    // 更新最后一条消息内容
                                    const messages = document.querySelectorAll('.message.bot-message');
                                    const lastMessage = messages[messages.length - 1];
                                    
                                    if (lastMessage) {
                                        lastMessage.querySelector('.message-content').innerHTML = 
                                            `<span class="message-sender">悟空</span>
                                            <div class="reasoning-content">
                                                <span class="reasoning-title">思考历程</span>
                                                ${formatMarkdown(fullContent)}
                                            </div>`;
                                        
                                        // 检查是否已有回答内容，如果有则添加
                                        if (answerContent) {
                                            // 查找是否已存在回答区域
                                            let existingAnswer = lastMessage.querySelector('.answer-content');
                                            if (!existingAnswer) {
                                                // 如果不存在，则创建并添加回答区域
                                                const answerDiv = document.createElement('div');
                                                answerDiv.classList.add('answer-content');
                                                answerDiv.innerHTML = formatMarkdown(answerContent);
                                                lastMessage.querySelector('.message-content').appendChild(answerDiv);
                                            } else {
                                                // 如果已存在，更新内容
                                                existingAnswer.innerHTML = formatMarkdown(answerContent);
                                            }
                                        }
                                    }
                                } 
                                // 处理正式回复(content字段，即answerContent)
                                // 当API返回包含content时，表示这是机器人的正式回答
                                else if (delta.content) {
                                    // 累积回答内容
                                    answerContent += delta.content;
                                    
                                    // 如果是第一个数据块，需要先移除'正在思考中'的提示消息
                                    if (isFirstChunk) {
                                        // 查找所有机器人消息，获取最后一条
                                        const thinkingMessages = document.querySelectorAll('.message.bot-message');
                                        const lastMessage = thinkingMessages[thinkingMessages.length - 1];
                                        
                                        // 如果最后一条消息是'正在思考中'提示，则移除它
                                        if (lastMessage && lastMessage.textContent.includes('悟空正在思考中')) {
                                            chatMessages.removeChild(lastMessage);
                                        }
                                        
                                        // 创建新的机器人消息容器，用于显示正式回复
                                        const messageElement = document.createElement('div');
                                        messageElement.classList.add('message', 'bot-message');
                                        
                                        // 创建消息内容容器，设置HTML结构
                                        const messageContent = document.createElement('div');
                                        messageContent.classList.add('message-content');
                                        
                                        // 检查是否有思考过程
                                        if (fullContent) {
                                            messageContent.innerHTML = `
                                                <span class="message-sender">悟空</span>
                                                <div class="reasoning-content">
                                                    <span class="reasoning-title">思考历程</span>
                                                    ${formatMarkdown(fullContent)}
                                                </div>
                                                <div class="answer-content" id="answer-${Date.now()}">${formatMarkdown(delta.content)}</div>
                                            `;
                                        } else {
                                            // 如果没有思考过程，则只显示回答
                                            messageContent.innerHTML = `
                                                <span class="message-sender">悟空</span>
                                                <div class="answer-content" id="answer-${Date.now()}">${formatMarkdown(delta.content)}</div>
                                            `;
                                        }
                                        
                                        messageElement.appendChild(messageContent);
                                        chatMessages.appendChild(messageElement);
                                        isFirstChunk = false;
                                    } else {
                                        // 更新最后一条消息内容
                                        const messages = document.querySelectorAll('.message.bot-message');
                                        const lastMessage = messages[messages.length - 1];
                                        
                                        if (lastMessage) {
                                            // 获取回答内容元素或创建一个新的
                                            let answerElement = lastMessage.querySelector('.answer-content');
                                            
                                            if (!answerElement) {
                                                // 如果不存在回答区域，创建一个
                                                answerElement = document.createElement('div');
                                                answerElement.classList.add('answer-content');
                                                lastMessage.querySelector('.message-content').appendChild(answerElement);
                                            }
                                            
                                            // 使用累积的完整回答内容重新格式化
                                            answerElement.innerHTML = formatMarkdown(answerContent);
                                            
                                            chatMessages.scrollTop = chatMessages.scrollHeight;
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            console.error('解析SSE数据失败:', e, line);
                        }
                    } else if (line.trim() === '[DONE]') {
                        // 这是一个替代方式来检测[DONE]标记
                        break;
                    }
                }
            }
            
            // 在函数结束时返回思考过程和回答内容的组合
            return fullContent && answerContent ? 
                   `**思考历程**\n${fullContent}\n\n**回答**\n${answerContent}` : 
                   answerContent || fullContent;
        } catch (error) {
            console.error('API调用失败:', error);
            throw error;
        }
    }

    async function handleUserInput() {
        const userText = userInput.value.trim();
        if (!userText) return;

        if (!conversationHistory.canContinue() && conversationHistory.currentTurn > 0) {
            displayMessage('bot', '贫僧法力已尽，不能再续。若有新问，请刷新页面重新开始。');
            userInput.value = '';
            userInput.disabled = true;
            sendButton.disabled = true;
            return;
        }

        displayMessage('user', userText);
        conversationHistory.addMessage('user', userText);
        userInput.value = '';
        userInput.disabled = true;
        sendButton.disabled = true;

        let promptForAPI;
        if (conversationHistory.currentTurn === 0 && conversationHistory.messages.length === 1) { // 首次提问
            promptForAPI = conversationHistory.generateInitialPrompt(userText);
        } else {
            promptForAPI = conversationHistory.generateFollowUpPrompt(userText);
        }

        // 模拟显示思考中
        const thinkingMessage = document.createElement('div');
        thinkingMessage.classList.add('message', 'bot-message');
        thinkingMessage.innerHTML = `<div class="message-content"><span class="message-sender">悟空</span>悟空正在思考中... <i class="fas fa-spinner fa-spin"></i></div>`;
        chatMessages.appendChild(thinkingMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            const botReply = await callDeepSeekAPI(promptForAPI);
            
            // 防止多次添加消息 - 如果流式处理已经添加了消息，就不需要再次调用displayMessage
            const messages = document.querySelectorAll('.message.bot-message');
            const lastMessage = messages[messages.length - 1];
            if (!lastMessage || (lastMessage && lastMessage.textContent.includes('悟空正在思考中'))) {
                chatMessages.removeChild(thinkingMessage); // 移除思考中消息
                displayMessage('bot', botReply);
            } else {
                // 流式处理已经添加了消息内容，不需要再添加
                if (document.body.contains(thinkingMessage)) {
                    chatMessages.removeChild(thinkingMessage);
                }
            }
            
            conversationHistory.addMessage('assistant', botReply);
        } catch (error) {
            console.error('API调用失败:', error);
            chatMessages.removeChild(thinkingMessage); // 移除思考中消息
            displayMessage('bot', `唉，贫僧心绪不宁，无法回应您的问题。错误详情: ${error.message || '未知错误'}`);
            console.log('完整错误对象:', error);
        }

        userInput.disabled = false;
        sendButton.disabled = false;
        userInput.focus();

        if (!conversationHistory.canContinue()) {
            userInput.placeholder = '对话已达上限，请刷新开始新对话';
            userInput.disabled = true;
            sendButton.disabled = true;
        }
    }

    sendButton.addEventListener('click', handleUserInput);
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            handleUserInput();
        }
    });

    // 初始欢迎消息
    displayMessage('bot', '我是您的智能助手，有什么问题可以问我');
});
