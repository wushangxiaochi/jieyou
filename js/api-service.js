// api-service.js - API服务与对话历史管理

// Markdown格式转换服务
const MarkdownService = {
    // 格式化Markdown文本为HTML
    formatMarkdown(text) {
        if (!text) return '';

        // 处理代码块 ```code```，需要先处理代码块，否则会影响其他替换
        text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

        // 处理行内代码 `code`
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

        // 处理标题，确保更严格的匹配规则，必须在行首
        text = text.replace(/^(#{1,6})\s+(.*?)$/gm, function(_, hashes, content) {
            const level = Math.min(hashes.length + 2, 6); // h3-h6
            return `<h${level} class="md-heading" style="color: var(--primary-color); font-weight: 600; font-size: 1.1em;">${content.trim()}</h${level}>`;
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
};

// 对话历史管理器
const ConversationManager = {
    // 对话历史
    history: {
        // 基础信息
        theme: '',         // 主题
        supplement: '',    // 补充主题
        details: '',       // 用户详细问题
        numbers: '',       // 用户选择的三个数字

        // 对话历史
        queries: [],       // 用户的追问数组
        results: [],       // 系统的回答数组

        // 控制参数
        MAX_QUERIES: 3,    // 最大追问次数
        currentQueryIndex: 0, // 当前追问索引
        solution: '',      // 解决方案
        
        // Step 5相关
        tipsQueries: [],        // 解忧Tips追问数组
        tipsResults: [],        // 解忧Tips回答数组
        MAX_TIPS_QUERIES: 3,    // 解忧Tips最大追问次数
        currentTipsIndex: 0     // 解忧Tips当前追问索引
    },
    
    // 整体运势解忧历史
    complete_history: {
        // 基础信息
        theme: '',         // 主题
        supplement: '',    // 补充主题
        details: '',       // 用户详细问题
        profile: '',       // 用户基本信息(出生日期等)

        // 对话历史
        queries: [],       // 用户的追问数组
        results: [],       // 系统的回答数组

        // 控制参数
        MAX_QUERIES: 3,    // 最大追问次数
        currentQueryIndex: 0, // 当前追问索引
        solution: '',      // 解决方案
        
        // Step 5相关
        tipsQueries: [],        // 解忧Tips追问数组
        tipsResults: [],        // 解忧Tips回答数组
        MAX_TIPS_QUERIES: 3,    // 解忧Tips最大追问次数
        currentTipsIndex: 0     // 解忧Tips当前追问索引
    },

    // 初始化对话历史
    initHistory() {
        this.resetHistory();
        
        // 设置基础信息
        this.history.theme = AppCore.AppState.currentTheme;
        this.history.supplement = AppCore.AppState.themeDetail || '';
        this.history.details = AppCore.AppState.userDetails;
        this.history.numbers = AppCore.AppState.numbers;
        
        console.log('Initialized conversation history:', this.history);
        return this;
    },
    
    // 初始化整体运势解忧对话历史
    initCompleteHistory() {
        this.resetCompleteHistory();
        
        // 设置基础信息
        this.complete_history.theme = AppCore.AppState.currentTheme;
        this.complete_history.supplement = AppCore.AppState.themeDetail || '';
        this.complete_history.details = AppCore.AppState.userDetails;
        this.complete_history.profile = AppCore.AppState.profile;
        
        console.log('Initialized complete conversation history:', this.complete_history);
        return this;
    },

    // 重置对话历史
    resetHistory() {
        this.history.theme = '';
        this.history.supplement = '';
        this.history.details = '';
        this.history.numbers = '';
        this.history.queries = [];
        this.history.results = [];
        this.history.currentQueryIndex = 0;
        this.history.solution = '';
        
        // 重置Step 5相关数据
        this.history.tipsQueries = [];
        this.history.tipsResults = [];
        this.history.currentTipsIndex = 0;
        
        return this;
    },
    
    // 重置整体运势解忧对话历史
    resetCompleteHistory() {
        this.complete_history.theme = '';
        this.complete_history.supplement = '';
        this.complete_history.details = '';
        this.complete_history.profile = '';
        this.complete_history.queries = [];
        this.complete_history.results = [];
        this.complete_history.currentQueryIndex = 0;
        this.complete_history.solution = '';
        
        // 重置Step 5相关数据
        this.complete_history.tipsQueries = [];
        this.complete_history.tipsResults = [];
        this.complete_history.currentTipsIndex = 0;
        
        return this;
    },

    // 添加用户提问
    addQuery(query) {
        this.history.queries.push(query);
        return this;
    },

    // 添加系统回答
    addResult(result) {
        this.history.results.push(result);
        return this;
    },

    // 获取当前对话索引
    getCurrentIndex() {
        return this.history.currentQueryIndex;
    },

    // 增加当前对话索引
    incrementIndex() {
        this.history.currentQueryIndex++;
        return this;
    },

    // 检查是否达到最大追问次数
    hasReachedMaxQueries() {
        console.log(`检查追问次数: 当前=${this.history.currentQueryIndex}, 最大=${this.history.MAX_QUERIES}`);
        return this.history.currentQueryIndex >= this.history.MAX_QUERIES;
    },

    // 设置解决方案
    setSolution(solution) {
        this.history.solution = solution;
        return this;
    },

    // 获取解决方案
    getSolution() {
        return this.history.solution;
    },

    // 添加Tips追问
    addTipsQuery(query) {
        this.history.tipsQueries.push(query);
        return this;
    },

    // 添加Tips回答
    addTipsResult(result) {
        this.history.tipsResults.push(result);
        return this;
    },

    // 获取当前Tips索引
    getCurrentTipsIndex() {
        return this.history.currentTipsIndex;
    },

    // 增加当前Tips索引
    incrementTipsIndex() {
        this.history.currentTipsIndex++;
        return this;
    },

    // 检查是否达到最大Tips追问次数
    hasReachedMaxTipsQueries() {
        console.log(`检查Tips追问次数: 当前=${this.history.currentTipsIndex}, 最大=${this.history.MAX_TIPS_QUERIES}`);
        return this.history.currentTipsIndex >= this.history.MAX_TIPS_QUERIES;
    },

    // 整体运势解忧方案相关方法
    // 添加用户提问到整体运势解忧历史
    addCompleteQuery(query) {
        this.complete_history.queries.push(query);
        return this;
    },

    // 添加系统回答到整体运势解忧历史
    addCompleteResult(result) {
        this.complete_history.results.push(result);
        return this;
    },

    // 获取当前整体运势解忧对话索引
    getCurrentCompleteIndex() {
        return this.complete_history.currentQueryIndex;
    },

    // 增加当前整体运势解忧对话索引
    incrementCompleteIndex() {
        this.complete_history.currentQueryIndex++;
        return this;
    },

    // 检查是否达到最大整体运势解忧追问次数
    hasReachedMaxCompleteQueries() {
        console.log(`检查整体运势解忧追问次数: 当前=${this.complete_history.currentQueryIndex}, 最大=${this.complete_history.MAX_QUERIES}`);
        
        // 当前的查询索引表示已经完成的查询数量
        // 首次追问时currentQueryIndex为0，追问一次后会变为1
        // 因此需要与MAX_QUERIES进行比较，而不是大于等于
        return this.complete_history.currentQueryIndex >= this.complete_history.MAX_QUERIES;
    },

    // 设置整体运势解忧解决方案
    setCompleteSolution(solution) {
        this.complete_history.solution = solution;
        return this;
    }
};

// DeepSeek API调用服务
const DeepSeekAPIService = {
    // API配置
    config: {
        apiKey: "Bearer sk-10f27c9913054c138a23c756cd4f5381", // 请替换为实际的API Key
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        model: 'deepseek-r1'
    },

    // 调用DeepSeek API
    async callAPI(messages) {
        try {
            console.log('🚀 调用DeepSeek API');

            const response = await fetch(`${this.config.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.config.apiKey
                },
                body: JSON.stringify({
                    model: this.config.model,
                    messages: messages,
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

            console.log('✅ API连接成功，开始接收流式响应');
            return response;
        } catch (error) {
            console.error('❌ DeepSeek API调用失败:', error);
            throw error;
        }
    },

    // 处理流式响应
    async processStreamResponse(response, onReasoningUpdate, onAnswerUpdate, onComplete, onError) {
        try {
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let fullReasoningContent = '';
            let fullAnswerContent = '';
            let isFirstChunk = true;
            let hasReasoningContent = false;
            let hasAnswerContent = false;

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
                                break;
                            }

                            // 正常解析JSON数据
                            const data = JSON.parse(trimmedData);
                            if (data.choices && data.choices.length > 0) {
                                const delta = data.choices[0].delta;

                                // 处理思考过程(reasoning_content字段)
                                if (delta.reasoning_content) {
                                    if (!hasReasoningContent) {
                                        console.log('📝 开始接收思考过程');
                                        hasReasoningContent = true;
                                    }
                                    fullReasoningContent += delta.reasoning_content;
                                    if (onReasoningUpdate) {
                                        onReasoningUpdate(fullReasoningContent, isFirstChunk);
                                    }
                                    isFirstChunk = false;
                                }

                                // 处理正式回复(content字段)
                                if (delta.content) {
                                    if (!hasAnswerContent) {
                                        console.log('💬 开始接收正式回答');
                                        hasAnswerContent = true;
                                    }
                                    fullAnswerContent += delta.content;
                                    if (onAnswerUpdate) {
                                        onAnswerUpdate(fullAnswerContent, isFirstChunk);
                                    }
                                    isFirstChunk = false;
                                }
                            }
                        } catch (e) {
                            console.error('❌ 解析SSE数据失败:', e.message);
                        }
                    } else if (line.trim() === '[DONE]') {
                        break;
                    }
                }
            }

            console.log('✅ 流式响应完成:', {
                思考过程: fullReasoningContent.length > 0 ? `${fullReasoningContent.length}字符` : '无',
                正式回答: fullAnswerContent.length > 0 ? `${fullAnswerContent.length}字符` : '无'
            });

            // 完成处理
            if (onComplete) {
                onComplete({
                    reasoning: fullReasoningContent,
                    answer: fullAnswerContent,
                    combined: fullReasoningContent && fullAnswerContent ?
                             `**思考历程**\n${fullReasoningContent}\n\n**回答**\n${fullAnswerContent}` :
                             fullAnswerContent || fullReasoningContent
                });
            }

        } catch (error) {
            console.error('❌ 处理流式响应失败:', error);
            if (onError) {
                onError(error);
            }
        }
    }
};

// API服务
const ApiService = {
    // 构建数字起卦初始提示词 - messages格式
    buildInitialPrompt() {
        const { theme, supplement, details, numbers } = ConversationManager.history;

        const messages = [{
            role: "user",
            content: `用户想咨询"${theme}${supplement}"方面的问题，遇到的困扰是："${details}"，选择的三个数字是：${numbers}。请运用数字起卦方法中后天八卦的相关理论，用这三个数字占卜一卦，帮用户解读卦象，并根据咨询方向和困扰做针对性的深入解读，注意最后要鼓励用户，给予积极的正能量。`
        }];

        console.log('📋 构建数字起卦初始提示词:', { 主题: theme + supplement, 数字: numbers });
        return messages;
    },

    // 构建数字起卦追问提示词 - messages格式
    buildFollowUpPrompt() {
        const { theme, supplement, details, numbers, queries, results, currentQueryIndex } = ConversationManager.history;

        const messages = [];

        // 系统提示
        messages.push({
            role: "system",
            content: `你是一位专业的数字起卦师，擅长运用后天八卦理论为用户解读卦象。用户想咨询${theme}${supplement}方面的问题，使用数字${numbers}进行起卦，遇到的困扰：${details}。请基于卦象理论给出专业建议。`
        });

        // 添加初始解读
        if (results[0]) {
            messages.push({
                role: "assistant",
                content: results[0]
            });
        }

        // 添加历史对话
        for (let i = 0; i < currentQueryIndex; i++) {
            if (queries[i]) {
                messages.push({
                    role: "user",
                    content: queries[i]
                });
            }
            if (results[i + 1]) {
                messages.push({
                    role: "assistant",
                    content: results[i + 1]
                });
            }
        }

        // 添加当前问题
        messages.push({
            role: "user",
            content: `${queries[currentQueryIndex]}。请基于之前的卦象解读，针对这个问题给出专业建议，保持积极正能量的引导，与之前的解读保持一致性。`
        });

        console.log('📋 构建数字起卦追问提示词:', { 当前问题: queries[currentQueryIndex] });
        return messages;
    },

    // 构建数字起卦解忧Tips提示词 - messages格式
    buildTipsPrompt() {
        const { theme, supplement, details, numbers, queries, results } = ConversationManager.history;

        const messages = [];

        // 系统提示
        messages.push({
            role: "system",
            content: `你是一位温暖的生活导师，擅长通过具体可行的小建议帮助用户改善心情。用户通过数字起卦${numbers}咨询了${theme}${supplement}方面的问题：${details}。现在需要你基于之前的卦象解读，提供5条左右具体的解忧小建议。`
        });

        // 添加初始卦象解读
        if (results[0]) {
            messages.push({
                role: "assistant",
                content: results[0]
            });
        }

        // 添加Step4的对话历史
        for (let i = 0; i < Math.min(queries.length, results.length - 1); i++) {
            if (queries[i]) {
                messages.push({
                    role: "user",
                    content: queries[i]
                });
            }
            if (results[i + 1]) {
                messages.push({
                    role: "assistant",
                    content: results[i + 1]
                });
            }
        }

        // 请求Tips
        messages.push({
            role: "user",
            content: `根据之前的卦象解读和我们的交流，请给我提供5条左右具体的解忧小建议。可以从以下方面选择：幸运色、幸运数字、妆容建议、穿搭建议、宜情小物、适宜运动、书籍推荐、自媒体博主推荐等。每条建议2-3句话，要简洁明了且富有同理心，目的是转移不良情绪并给予积极的行动指南。`
        });

        console.log('📋 构建数字起卦解忧Tips提示词');
        return messages;
    },

    // 构建数字起卦解忧Tips追问提示词 - messages格式
    buildTipsFollowUpPrompt() {
        const { theme, supplement, details, numbers, queries, results, tipsQueries, tipsResults, currentTipsIndex } = ConversationManager.history;

        const messages = [];

        // 系统提示
        messages.push({
            role: "system",
            content: `你是一位温暖的生活导师，之前为用户提供了基于数字起卦${numbers}的解忧建议。用户咨询${theme}${supplement}问题：${details}。现在用户对解忧建议有进一步的疑问，请继续提供帮助。`
        });

        // 添加初始卦象解读
        if (results[0]) {
            messages.push({
                role: "assistant",
                content: results[0]
            });
        }

        // 添加Step4对话历史
        for (let i = 0; i < Math.min(queries.length, results.length - 1); i++) {
            if (queries[i]) {
                messages.push({
                    role: "user",
                    content: queries[i]
                });
            }
            if (results[i + 1]) {
                messages.push({
                    role: "assistant",
                    content: results[i + 1]
                });
            }
        }

        // 添加初始Tips
        messages.push({
            role: "user",
            content: "请给我一些解忧小建议"
        });

        if (tipsResults[0]) {
            messages.push({
                role: "assistant",
                content: tipsResults[0]
            });
        }

        // 添加Tips追问历史
        for (let i = 0; i < currentTipsIndex; i++) {
            if (tipsQueries[i]) {
                messages.push({
                    role: "user",
                    content: tipsQueries[i]
                });
            }
            if (tipsResults[i + 1]) {
                messages.push({
                    role: "assistant",
                    content: tipsResults[i + 1]
                });
            }
        }

        // 添加当前Tips追问
        messages.push({
            role: "user",
            content: `${tipsQueries[currentTipsIndex]}。请继续为我提供积极的建议，保持与之前卦象解读和解忧Tips的一致性。`
        });

        console.log('📋 构建数字起卦Tips追问提示词:', { 当前问题: tipsQueries[currentTipsIndex] });
        return messages;
    },

    // 构建整体运势解忧初始提示词 - messages格式
    buildCompleteInitialPrompt() {
        const { theme, supplement, details, profile } = ConversationManager.complete_history;

        const messages = [{
            role: "user",
            content: `用户想咨询"${theme}${supplement}"方面的问题，遇到的困扰是："${details}"，用户的基本信息是：${profile}。请运用八字命理的相关理论，结合用户的信息和需求，帮用户做深度的解读，注意最后要鼓励用户，给予积极的正能量。`
        }];

        console.log('📋 构建整体运势初始提示词:', { 主题: theme + supplement, 个人信息: profile });
        return messages;
    },

    // 构建整体运势解忧追问提示词 - messages格式
    buildCompleteFollowUpPrompt() {
        const { theme, supplement, details, profile, queries, results, currentQueryIndex } = ConversationManager.complete_history;

        const messages = [];

        // 系统提示
        messages.push({
            role: "system",
            content: `你是一位专业的八字命理师，擅长结合传统八字理论为用户提供人生指导。用户想咨询${theme}${supplement}方面的问题，基本信息：${profile}，遇到的困扰：${details}。请基于八字命理理论，结合用户信息给出专业建议。`
        });

        // 添加初始解读
        if (results[0]) {
            messages.push({
                role: "assistant",
                content: results[0]
            });
        }

        // 添加历史对话
        for (let i = 0; i < currentQueryIndex; i++) {
            if (queries[i]) {
                messages.push({
                    role: "user",
                    content: queries[i]
                });
            }
            if (results[i + 1]) {
                messages.push({
                    role: "assistant",
                    content: results[i + 1]
                });
            }
        }

        // 添加当前问题
        messages.push({
            role: "user",
            content: `${queries[currentQueryIndex]}。请根据我的八字和之前的解读，针对这个问题给出专业建议，保持前后一致性。`
        });

        console.log('📋 构建整体运势追问提示词:', { 当前问题: queries[currentQueryIndex] });
        return messages;
    },

    // 构建整体运势解忧Tips提示词 - messages格式
    buildCompleteTipsPrompt() {
        const { theme, supplement, details, profile, queries, results } = ConversationManager.complete_history;

        const messages = [];

        // 系统提示
        messages.push({
            role: "system",
            content: `你是一位温暖的生活导师，擅长结合八字命理为用户提供具体可行的生活建议。用户基本信息：${profile}，咨询${theme}${supplement}问题：${details}。现在需要你基于之前的八字解读，提供具体的解忧小建议。`
        });

        // 添加初始八字解读
        if (results[0]) {
            messages.push({
                role: "assistant",
                content: results[0]
            });
        }

        // 添加Step4对话历史
        for (let i = 0; i < Math.min(queries.length, results.length - 1); i++) {
            if (queries[i]) {
                messages.push({
                    role: "user",
                    content: queries[i]
                });
            }
            if (results[i + 1]) {
                messages.push({
                    role: "assistant",
                    content: results[i + 1]
                });
            }
        }

        // 请求Tips
        messages.push({
            role: "user",
            content: `根据我的八字和之前的解读，请给我提供5条左右具体的解忧小建议。可以从以下方面选择：幸运色、幸运数字、妆容建议、穿搭建议、宜情小物、适宜运动、书籍推荐、自媒体博主推荐等。每条建议要符合我的八字特点，2-3句话为宜，富有同理心、提供情绪价值，目的是转移不良情绪并给予积极的行动指南。`
        });

        console.log('📋 构建整体运势解忧Tips提示词');
        return messages;
    },

    // 构建整体运势解忧Tips追问提示词 - messages格式
    buildCompleteTipsFollowUpPrompt() {
        const { theme, supplement, details, profile, queries, results, tipsQueries, tipsResults, currentTipsIndex } = ConversationManager.complete_history;

        const messages = [];

        // 系统提示
        messages.push({
            role: "system",
            content: `你是一位温暖的生活导师，之前为用户提供了基于八字命理的解忧建议。用户基本信息：${profile}，咨询${theme}${supplement}问题：${details}。现在用户对解忧建议有进一步的疑问，请继续提供帮助。`
        });

        // 添加初始八字解读
        if (results[0]) {
            messages.push({
                role: "assistant",
                content: results[0]
            });
        }

        // 添加Step4对话历史
        for (let i = 0; i < Math.min(queries.length, results.length - 1); i++) {
            if (queries[i]) {
                messages.push({
                    role: "user",
                    content: queries[i]
                });
            }
            if (results[i + 1]) {
                messages.push({
                    role: "assistant",
                    content: results[i + 1]
                });
            }
        }

        // 添加初始Tips
        messages.push({
            role: "user",
            content: "请给我一些解忧小建议"
        });

        if (tipsResults[0]) {
            messages.push({
                role: "assistant",
                content: tipsResults[0]
            });
        }

        // 添加Tips追问历史
        for (let i = 0; i < currentTipsIndex; i++) {
            if (tipsQueries[i]) {
                messages.push({
                    role: "user",
                    content: tipsQueries[i]
                });
            }
            if (tipsResults[i + 1]) {
                messages.push({
                    role: "assistant",
                    content: tipsResults[i + 1]
                });
            }
        }

        // 添加当前Tips追问
        messages.push({
            role: "user",
            content: `${tipsQueries[currentTipsIndex]}。请根据我的八字和过往解读，针对这个问题给出专业、符合八字特点的回答，保持前后一致性，注意与之前提供的解忧小Tips建议保持一致。`
        });

        console.log('📋 构建整体运势Tips追问提示词:', { 当前问题: tipsQueries[currentTipsIndex] });
        return messages;
    },

    // 添加整体运势解忧Tips追问
    addCompleteTipsQuery(query) {
        ConversationManager.complete_history.tipsQueries.push(query);
        return this;
    },

    // 添加整体运势解忧Tips回答
    addCompleteTipsResult(result) {
        ConversationManager.complete_history.tipsResults.push(result);
        return this;
    },

    // 获取当前整体运势解忧Tips索引
    getCurrentCompleteTipsIndex() {
        return ConversationManager.complete_history.currentTipsIndex;
    },

    // 增加当前整体运势解忧Tips索引
    incrementCompleteTipsIndex() {
        ConversationManager.complete_history.currentTipsIndex++;
        return this;
    },

    // 检查是否达到最大整体运势解忧Tips追问次数
    hasReachedMaxCompleteTipsQueries() {
        console.log(`检查整体运势解忧Tips追问次数: 当前=${ConversationManager.complete_history.currentTipsIndex}, 最大=${ConversationManager.complete_history.MAX_TIPS_QUERIES}`);
        return ConversationManager.complete_history.currentTipsIndex >= ConversationManager.complete_history.MAX_TIPS_QUERIES;
    },

    // 调用DeepSeek API - 新版本使用真实API
    async callDeepSeekApi(messages, onReasoningUpdate, onAnswerUpdate, onComplete, onError) {
        try {
            console.log('调用DeepSeek API，messages:', messages);

            // 调用真实的DeepSeek API
            const response = await DeepSeekAPIService.callAPI(messages);

            // 处理流式响应
            await DeepSeekAPIService.processStreamResponse(
                response,
                onReasoningUpdate,
                onAnswerUpdate,
                onComplete,
                onError
            );

        } catch (error) {
            console.error('DeepSeek API调用失败:', error);
            if (onError) {
                onError(error);
            } else {
                throw error;
            }
        }
    },

    // 简化版API调用（向后兼容）
    async callDeepSeekApiSimple(messages) {
        return new Promise((resolve, reject) => {
            this.callDeepSeekApi(
                messages,
                // onReasoningUpdate
                () => {
                    // 思考过程更新，暂时不处理
                },
                // onAnswerUpdate
                () => {
                    // 答案更新，暂时不处理
                },
                // onComplete
                (result) => {
                    resolve(result.combined || result.answer || result.reasoning);
                },
                // onError
                (error) => {
                    reject(error);
                }
            );
        });
    },

    // 模拟DeepSeek API调用
    mockDeepSeekApiCall(prompt) {
        console.log('Mock API call with prompt:', prompt);
        
        // 根据不同场景返回不同的模拟结果
        if (prompt.includes('运用数字起卦方法')) {
            // 初始解读
            return `根据您提供的数字${ConversationManager.history.numbers}，我为您占卜出的是"坎卦"。

坎卦象征着水，代表着险难与隐藏的机遇。在${ConversationManager.history.theme}方面，您目前确实面临一些挑战，感到压力与不确定性。水既能载舟，也能覆舟，这暗示着当前困境中蕴含着转机。

针对您提到的"${ConversationManager.history.details}"，卦象显示：
1. 您当前处于一个需要谨慎决策的阶段，感到犹豫不决是正常的
2. 外界环境确实存在一些不确定因素，使您感到焦虑
3. 在坎卦中，中爻为阳，表示内心仍有坚定的力量可以仰仗

建议：
- 保持冷静和耐心，不要急于求成
- 寻求值得信任的人的建议和支持
- 相信自己的内在智慧，它会引导您穿越难关

请记住，水总是能找到出路，无论多么险阻的山谷。这个卦象提醒您，困难是暂时的，只要保持坚韧和灵活，必将迎来柳暗花明的一天。`;
        } else if (prompt.includes('解忧小Tips') || prompt.includes('解忧小建议')) {
            // 解忧Tips
            const tipsMockResponses = [
                `根据您的卦象和问题，我为您准备了几条解忧小Tips：

1. 幸运色：深蓝色，象征坎卦中水的智慧与深度，建议在工作环境中增加这个颜色元素，有助于增强思考能力和冷静决策。

2. 幸运数字：6，在易经中代表阴爻，有助于平衡您当前略显紧张的状态。可以在日常生活中多留意这个数字的出现。

3. 穿搭建议：选择深蓝或黑色为主色调的服装，搭配少量明亮色彩点缀，展现沉稳与内在力量，增强自信感。

4. 宜情小物：一个小型流水摆件或水晶装饰放在工作空间，可以帮助调节情绪，提醒自己像水一样保持灵活适应的态度。

5. 书籍推荐：《活法》（稻盛和夫著），讲述如何在困境中保持正确心态；或《反脆弱》，探讨如何从压力中获益成长。

希望这些建议能帮助您调整状态，以更积极的心态面对当前的挑战。记住，像水一样，总能找到前进的方向。`,

                `您的问题很好，我再补充几条针对性的建议：

1. 自媒体推荐：可以关注"X博士"，他的内容关于职场心理学和压力管理，与您当前面临的困境很契合。

2. 日常习惯：每晚睡前10分钟写感恩日记，记录当天3件值得感谢的事情，有助于培养积极思维模式。

3. 环境调整：在工作区域放置一些绿色植物，研究表明它们能减轻压力，改善心情，提高专注力。

4. 人际交往：学习"深度倾听"技巧，在与同事交流时真正专注于对方的表达，这往往能改善人际关系。

5. 运动建议：尝试太极或瑜伽等注重呼吸和冥想的活动，每天15-20分钟，帮助释放压力，找回内心平静。

这些小建议都与坎卦所象征的"内省"和"智慧"相呼应，希望能帮助您走出当前困境。`,

                `非常理解您的顾虑，再分享几个可能对您有帮助的建议：

1. 心理调适：尝试"5-4-3-2-1"感官练习，当感到焦虑时识别周围的事物，这个简单练习能迅速将您拉回当下，缓解焦虑。

2. 职场技巧：建立"成就文件夹"，收集您的工作成就和积极反馈，当自信心受挫时翻阅，提醒自己的能力和价值。

3. 人际沟通：采用"三明治法则"给出反馈，即在批评意见前后各加一层肯定，能有效减少工作中的冲突。

4. 时间管理：尝试番茄工作法，每专注工作25分钟后休息5分钟，能提高效率，减少压力感和拖延倾向。

5. 营养建议：增加富含Omega-3的食物摄入，如深海鱼类、核桃等，研究表明这些食物对缓解压力和焦虑有积极作用。

坎卦提醒我们，每个低谷都孕育着上升的机会。希望这些建议助您度过挑战期。`
            ];

            // 如果是Tips追问，返回第2或第3条回答
            if (prompt.includes('用户追问') || prompt.includes('用户现在的问题')) {
                const index = (ConversationManager.history.currentTipsIndex % (tipsMockResponses.length - 1)) + 1;
                return tipsMockResponses[index];
            } else {
                // 首次Tips请求，返回第1条回答
                return tipsMockResponses[0];
            }
        } else {
            // 普通追问解读
            const followUpResponses = [
                `您的问题很有洞察力。结合坎卦的含义和您的情况，确实可以更深入地解读。

水的特性是向下流动，寻找最低点，这暗示着在当前阶段，您需要保持谦逊的态度，不要急于追求表面的成功。有时候，看似退步的选择，实际上是在为未来的跃升积蓄力量。

坎卦中的重水意象提醒您，现在可能是反思和内省的好时机。水能映照万物，却很少被人注意自身的价值，这提示您可能需要重新认识自我价值，而不仅仅依赖外界的认可。

请相信，当您经历了这段"山重水复疑无路"的阶段后，必然会迎来"柳暗花明又一村"的喜悦。坚持下去，答案就在前方等着您。`,
                
                `这个问题触及了坎卦的另一层含义。坎为中男，代表中年男子所具有的智慧与担当。无论您的实际年龄或性别如何，这个卦象都在提醒您，成长必然伴随着责任和考验。

在具体的${ConversationManager.history.theme}方面，当前的困难实际上是一种磨砺，是让您成长为更坚强、更有智慧的人的必经之路。就像水能够穿石，不是因为力量强大，而是因为持之以恒。

另外，坎卦也象征着心的澄明。当外界环境复杂多变时，保持内心的清明就显得尤为重要。建议您在这段时期多进行冥想或者其他能够平静心灵的活动，这将帮助您找到面对困境的智慧。

相信自己，这段考验终将成为您人生中宝贵的财富。`,
                
                `坎卦与您提出的这个问题有着深刻的联系。在易经中，坎为水，为陷阱，但同时也代表着智慧与机遇。

您可能感到当前处于低谷，但请记住，正是在最深的山谷中，我们才能找到最珍贵的宝藏。坎卦提醒我们，看似危险的处境往往蕴含着转机。

从实际行动层面，建议您：
1. 不要急于做出重大决定，给自己足够的时间思考
2. 寻求专业人士或长辈的建议，他们的经验可能对您有所启发
3. 保持警觉但不要过度焦虑，理性分析当前形势

最后，请记住一句古语："山不过来，我就过去"。困难无法改变，那就改变我们面对困难的态度。我相信，凭借您的智慧和勇气，必定能够化险为夷，迎来新的机遇。`
            ];
            
            const index = ConversationManager.history.currentQueryIndex % followUpResponses.length;
            return followUpResponses[index];
        }
    },

    // 模拟整体运势解忧的API调用返回
    mockCompleteApiCall(prompt) {
        console.log('Mock Complete Project API call with prompt:', prompt);
        
        // 根据不同场景返回不同的模拟结果
        if (prompt.includes('运用八字命理的相关理论')) {
            // 初始解读
            const profile = ConversationManager.complete_history.profile;
            let birthYear = "未知年份";
            
            // 尝试从profile中提取年份
            const yearMatch = profile.match(/(\d{4})年/);
            if (yearMatch) {
                birthYear = yearMatch[1];
            }
            
            return `根据您提供的出生信息"${profile}"，我为您进行了八字解读。

您出生于${birthYear}年，天干地支组合为"甲子"年。在${ConversationManager.complete_history.theme}方面，您的八字显示：

命局特点：
1. 日主偏弱，需要财星和印星的滋养
2. 八字中水多而旺，代表智慧和灵活性，这是您的优势
3. 缺少火元素，可能导致动力和激情不足

针对您提到的"${ConversationManager.complete_history.details}"，八字分析显示：
1. 近期您处于"甲申"大运，流年逢"丙子"，水旺之象明显
2. 这段时期确实容易感到压力，思绪较多，决策容易犹豫
3. 好消息是，明年将迎来"丁丑"年，有火土相生之象，能提升您的信心和执行力

建议：
- 在居家环境增加红色、橙色等暖色调装饰，补充火元素
- 多进行户外活动，尤其是在阳光下活动，补充阳气
- 佩戴红玛瑙、红纹石等首饰有助于平衡能量场

请记住，八字只是参考，真正决定命运的是您自己的选择和行动。当前的困境是暂时的，您的八字命盘显示明年会有明显好转。保持信心，积极行动，相信自己一定能度过难关！`;
        } else if (prompt.includes('请继续解答用户的问题') || prompt.includes('用户现在的问题是')) {
            // 追问解读
            return `您提出的这个问题非常重要。结合您的八字命盘分析：

在您的八字中，正财星被水气冲克，这确实反映出您在${ConversationManager.complete_history.theme}方面可能遇到的挑战。但值得注意的是，您命盘中的偏财星较为有力，这表明：

1. 您可能在固定工作之外，有发展副业或创新项目的潜力
2. 当前感到的压力部分来自于您对自我的高要求，八字显示您性格中有完美主义倾向
3. 从时间上看，从今年9月开始，辰戌相冲的压力会逐渐减轻

具体建议：
- 利用您八字中的水元素智慧，尝试创新的工作方法或思路
- 从现在到年底是您调整的关键期，可以尝试"凡事先做70%，再完善"的工作策略
- 可以寻找属火的贵人帮助，他们会给您带来意想不到的支持

相信随着时间推移，特别是进入明年春季，您将感受到明显的转机。您的八字显示内心有很强的韧性，这是您最宝贵的财富，请相信自己一定能创造更好的未来！`;
        } else if (prompt.includes('解忧小Tips') || prompt.includes('解忧小建议')) {
            // Tips解读
            return `根据您的八字命理分析，为您准备了几条解忧小Tips：

1. 幸运色：红色和橙色，可以补充您八字中缺乏的火元素，建议在工作和生活环境中适当增加这些色彩，有助于提升信心和决断力。

2. 幸运数字：3和9，在易经中代表离卦(火)和离卦变爻，有助于激发您内在的热情和创造力。

3. 穿搭建议：选择暖色调或明亮色彩的服装，特别是带有红色、橙色或紫色元素的，能帮助您在重要场合展现自信和魅力。

4. 宜情小物：一块红玛瑙或红纹石饰品，放在随身包中或作为首饰佩戴，有助于平衡您八字中的能量。

5. 适宜运动：阳光下的户外活动，如晨跑、徒步或太极，这些活动能帮助您吸收阳气，增强气场。

6. 书籍推荐：《活出生命的意义》，这本书探讨如何在困境中找到意义和希望，与您当前的状态非常契合。

希望这些小建议能帮助您缓解压力，找到更多生活的乐趣和平衡！`;
        }
        
        // 默认回复
        return `感谢您的问题。基于您的八字命盘，我想进一步分享一些针对${ConversationManager.complete_history.theme}方面的见解：

您的命盘显示近期确实有一些挑战，但同时也蕴含着不少机遇。八字中的某些组合预示着您在面对困难时往往能找到创新的解决方案。

关于您提到的问题，建议您：
1. 充分发挥自身优势，特别是您八字中所显示的洞察力和适应能力
2. 近期可以尝试调整作息，特别是在早上6-8点这个时辰多做规划
3. 人际关系方面，寻找属金的贵人可能会对您有所帮助

记住，命运掌握在自己手中。即使八字有所预示，但您的主动选择和积极态度才是改变未来的关键。我相信您有能力克服当前的困境，迎来更美好的明天！`;
    }
};

// 导出模块
window.ConversationManager = ConversationManager;
window.ApiService = ApiService; 