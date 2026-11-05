// J2Agent 问答配置。部署前只需要替换 apiKey 的占位符。
// 此文件独立于简历密文，方便更新服务地址、助手或授权信息。
window.ResumeAiConfig = {
    backendOrigin: 'https://j2agent.jerryt92.top',
    assistantId: 'knowledge_qa_assistant',
    // 知识库集合列表，可继续添加多个集合名称。
    knowledgeCollections: ['my_cv_knowledge', 'kb_j2agent_docs'],
    apiKey: 'apikey-AaGrrVlXdbGv6uTEREobEQ.Hqj_PKR1OUOsnbOyPzAUOc8N6ZWxIu6Q2ClzpPT2zOo'
,
    // 助手首次打开时展示的欢迎语。
    welcomeMessage: '你好，我是项目问答助手。可以问我各种项目的相关问题。',
    // 欢迎语下方的快捷提问；每批随机展示最多 4 条，超过 4 条时可点击“换一批”。
    demoQuestions: [
        'J2Agent 的整体架构和代码模块是怎么划分的？',
        'J2Agent 的 RAG 混合检索为什么要做分数归一化？',
        'J2Agent 的 MCP 和 Skills 有什么区别，分别适合什么场景？',
        'J2Agent 聊天断线后，后台任务和 snapshot 是怎么恢复的？',
        'J2Agent 的插件 Agent 是如何打包、注册和热重载的？',
        'SNMP 批量发现任务是如何做到可取消、可观测的？',
        'SNMP GETBULK 返回顺序异常时，平台怎么定位和兼容？',
        '拓扑系统的 topo_symbol 是如何表达节点、链路、站点和 GIS 坐标的？',
        '告警 Trap 链路如何防止队列 OOM，并保证同一设备的消息有序？',
        '跨 NAT 远程运维为什么选择 SSH 会话 + Netty HTTP 代理？',
        '三节点高可用部署中 LVS、Keepalived 和进程故障转移分别负责什么？',
        '网管智能体平台一次对话从 WebSocket 到模型/工具的执行链路是什么？',
        '智能报表 Agent 是如何限制只读 SQL、schema 和查询范围的？',
        '告警根因分析为什么要用 Neo4j 图查询，而不是直接让模型看告警？',
        'AIGC 图像生成任务的状态机和提交/执行链路是怎样设计的？',
        'Redis Stream 的 PEL 回收、孤儿任务扫描和对账 Worker 如何配合？',
        '微信内容审核失败、超时或回调丢失时，生成任务怎么处理？',
        'AIGC 平台的额度账本和模型 Provider 路由是如何设计的？',
        '3D 画廊从无人机视频到 Web 模型加载的完整管线是什么？',
        'PhotoTransfer 的 Live Photo 去重键和暂停恢复机制是怎么实现的？'
    ]
};
