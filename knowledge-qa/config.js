// J2Agent 问答配置。部署前只需要替换 apiKey 的占位符。
// 此文件独立于简历密文，方便更新服务地址、助手或授权信息。
window.ResumeAiConfig = {
    backendOrigin: 'https://j2agent.jerryt92.top',
    assistantId: 'knowledge_qa_assistant',
    knowledgeCollection: 'kb_j2agent_docs',
    apiKey: 'apikey-AaBdvlwzdxaRhWgPAzuuAQ.VK5_2xz0_Nim6pBCMMITqki-xhQLopMaVQusncMm1QE'
,
    // 助手首次打开时展示的欢迎语。
    welcomeMessage: '你好，我是问答助手。可以问我各种项目的相关问题。',
    // 欢迎语下方的快捷提问；可按需增删或修改。
    demoQuestions: [
        'J2Agent 支持哪些 Agent 扩展方式？',
        '如何通过 MCP 和 Skills 扩展能力？',
        'RAG 混合检索如何实现？'
    ]
};
