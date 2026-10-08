(function () {
    'use strict';

    // 配置由同目录 config.js 提供，避免助手代码和部署参数混在一起。
    var config = Object.assign({
        backendOrigin: 'https://j2agent.jerryt92.top',
        assistantId: 'knowledge_qa_assistant',
        knowledgeCollection: 'kb_j2agent_docs',
        apiKey: ''
    }, window.ResumeAiConfig || {});
    var state = { contextId: '', ws: null, busy: false, messages: [], stickToBottom: true, activeAssistant: null };
    var els = {};
    var initialized = false;
    var revealPending = false;
    var welcomeText = String(config.welcomeMessage || '你好，我是 J2Agent 技术问答助手。可以问我 Agent、RAG、MCP 或 Java 平台工程相关问题。');

    function byId(id) { return document.getElementById(id); }
    function wsOrigin(origin) { return origin.replace(/^http/, 'ws').replace(/\/+$/, ''); }
    function authQuery(params) {
        if (config.apiKey) params.set('authorization', config.apiKey);
        return params.toString();
    }
    function escapeHtml(value) {
        return String(value || '').replace(/[&<>'"]/g, function (char) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char];
        });
    }
    function isAllowedLink(value) {
        try {
            var protocol = new URL(value, window.location.href).protocol;
            return protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:' || protocol === 'tel:';
        } catch (_) {
            return false;
        }
    }
    function sanitizeMarkdownHtml(html) {
        var allowed = new Set(['A', 'BLOCKQUOTE', 'BR', 'CODE', 'DEL', 'EM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR', 'LI', 'OL', 'P', 'PRE', 'STRONG', 'TABLE', 'TBODY', 'TD', 'TH', 'THEAD', 'TR', 'UL']);
        var template = document.createElement('template');
        template.innerHTML = html;
        Array.prototype.slice.call(template.content.querySelectorAll('*')).forEach(function (element) {
            if (!allowed.has(element.tagName)) {
                element.replaceWith(document.createTextNode(element.textContent || ''));
                return;
            }
            Array.prototype.slice.call(element.attributes).forEach(function (attribute) {
                if (element.tagName === 'A' && (attribute.name === 'href' || attribute.name === 'title')) return;
                element.removeAttribute(attribute.name);
            });
            if (element.tagName === 'A') {
                var href = element.getAttribute('href');
                if (!href || !isAllowedLink(href)) element.removeAttribute('href');
                else {
                    element.setAttribute('target', '_blank');
                    element.setAttribute('rel', 'noopener noreferrer');
                }
            }
        });
        return template.innerHTML;
    }
    function renderMarkdown(value) {
        if (window.marked && typeof window.marked.parse === 'function') {
            return sanitizeMarkdownHtml(window.marked.parse(String(value || ''), { gfm: true, breaks: true }));
        }
        return escapeHtml(value).replace(/\n/g, '<br>');
    }
    function setStatus(text, isError) {
        els.status.textContent = text || '';
        els.status.classList.toggle('is-error', Boolean(isError));
    }
    function isNearBottom() {
        return els.messages.scrollHeight - els.messages.scrollTop - els.messages.clientHeight < 48;
    }
    function updateScrollButton() {
        els.scrollBottom.hidden = state.stickToBottom || !state.messages.length;
    }
    function scrollToEnd(force) {
        if (!force && !state.stickToBottom) return;
        requestAnimationFrame(function () {
            if (!force && !state.stickToBottom) return;
            els.messages.scrollTop = els.messages.scrollHeight;
            requestAnimationFrame(function () {
                if (force || state.stickToBottom) els.messages.scrollTop = els.messages.scrollHeight;
                state.stickToBottom = isNearBottom();
                updateScrollButton();
            });
        });
    }
    function addMessage(role, content, streaming) {
        var row = document.createElement('div');
        row.className = 'resume-ai-row ' + role;
        var node = document.createElement('div');
        node.className = 'resume-ai-message ' + role + (streaming ? ' is-streaming' : '');
        node.innerHTML = role === 'assistant' ? renderMarkdown(content) : escapeHtml(content);
        row.appendChild(node);
        els.messages.appendChild(row);
        scrollToEnd(true);
        return node;
    }
    function addCopyAction(node) {
        if (!node.dataset.content || node.dataset.copyAdded) return;
        node.dataset.copyAdded = 'true';
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'resume-ai-copy';
        button.textContent = '复制';
        button.addEventListener('click', function () {
            var content = node.dataset.content || '';
            if (!content) return;
            navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(content) : null;
            button.textContent = '已复制';
            setTimeout(function () { button.textContent = '复制'; }, 1200);
        });
        node.parentNode.appendChild(button);
    }
    function renderWelcome() {
        els.messages.innerHTML = '';
        var welcome = document.createElement('div');
        welcome.className = 'resume-ai-welcome';
        var orb = document.createElement('span');
        orb.className = 'resume-ai-welcome-orb';
        orb.setAttribute('aria-hidden', 'true');
        var text = document.createElement('p');
        text.className = 'resume-ai-welcome-text';
        text.textContent = welcomeText;
        welcome.appendChild(orb);
        welcome.appendChild(text);
        els.messages.appendChild(welcome);
        var questions = Array.isArray(config.demoQuestions) ? config.demoQuestions.filter(function (item) {
            return typeof item === 'string' && item.trim();
        }).slice(0, 4) : [];
        if (!questions.length) return;
        var quick = document.createElement('div');
        quick.className = 'resume-ai-quick-questions';
        questions.forEach(function (question) {
            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'resume-ai-hot-item';
            button.textContent = question;
            button.addEventListener('click', function () {
                if (state.busy) return;
                els.input.value = question;
                send();
            });
            quick.appendChild(button);
        });
        els.messages.appendChild(quick);
    }
    function setBusy(busy) {
        state.busy = busy;
        els.panel.dataset.busy = String(busy);
        els.input.disabled = busy;
        els.send.classList.toggle('is-busy', busy);
        els.send.setAttribute('aria-label', busy ? '停止生成' : '发送');
        els.send.innerHTML = busy
            ? '<span class="resume-ai-send-stop-square" aria-hidden="true"></span>'
            : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h12M13 6l6 6-6 6"/></svg>';
    }
    async function getContextId() {
        if (state.contextId) return state.contextId;
        var response = await fetch(config.backendOrigin + '/v1/rest/j2agent/context/id?' + authQuery(new URLSearchParams()), {
            cache: 'no-store', credentials: 'omit'
        });
        if (!response.ok) throw new Error('context/id HTTP ' + response.status);
        var body = await response.json();
        var id = body.contextId || (body.data && body.data.contextId);
        if (!id) throw new Error('context/id response missing contextId');
        state.contextId = String(id);
        return state.contextId;
    }
    function closeSocket() {
        if (state.ws) {
            state.ws.onopen = state.ws.onmessage = state.ws.onerror = state.ws.onclose = null;
            try { state.ws.close(1000, 'client close'); } catch (_) {}
            state.ws = null;
        }
    }
    function finishTurn(preserveStatus) {
        closeSocket();
        if (state.activeAssistant) {
            state.activeAssistant.classList.remove('is-streaming');
            state.activeAssistant = null;
        }
        setBusy(false);
        if (!preserveStatus) setStatus('');
    }
    function applyEvent(event, node) {
        var payload = event.payload || {};
        if (event.eventType === 'MESSAGE') {
            var message = payload.message || {};
            var next = payload.snapshot ? (payload.answerContent || '') : (node.dataset.content || '') + (message.role === 'assistant' ? (message.content || '') : '');
            node.dataset.content = next;
            if (next) node.innerHTML = renderMarkdown(next);
            scrollToEnd(false);
        }
        if (event.state === 'FAILED') {
            var error = payload.errorMessage || '暂时无法连接助手，请稍后重试。';
            if (!node.dataset.content) node.textContent = error;
            setStatus(error, true);
            node.classList.remove('is-streaming');
            finishTurn(true);
        } else if (event.state === 'COMPLETED' || event.state === 'CANCELLED' || (event.state === 'IDLE' && event.eventType !== 'SYSTEM')) {
            node.classList.remove('is-streaming');
            addCopyAction(node);
            finishTurn();
        }
    }
    async function send() {
        var content = els.input.value.trim();
        if (!content || state.busy) return;
        els.input.value = '';
        // 首次发送时移除欢迎语与快捷问题，避免与用户气泡处于同一滚动层而发生重叠。
        if (!state.messages.length) els.messages.innerHTML = '';
        state.stickToBottom = true;
        state.messages.push({ index: state.messages.length, role: 'user', content: content });
        addMessage('user', content);
        var assistant = addMessage('assistant', '正在连接助手…', true);
        assistant.dataset.content = '';
        state.activeAssistant = assistant;
        setBusy(true);
        setStatus('正在创建会话…');
        try {
            var contextId = await getContextId();
            var params = new URLSearchParams({ 'context-id': contextId, 'agent-id': config.assistantId, 'locale': 'zh_CN' });
            var socket = new WebSocket(wsOrigin(config.backendOrigin) + '/ws/rest/j2agent/chat?' + authQuery(params));
            state.ws = socket;
            socket.onopen = function () {
                setStatus('');
                socket.send(JSON.stringify({
                    contextId: contextId,
                    messages: [{ index: state.messages[state.messages.length - 1].index, role: 'user', content: content }],
                    retrievalKb: true,
                    systemPrompt: 'GENERAL_ASSISTANT',
                    knowledgeCollections: [config.knowledgeCollection]
                }));
            };
            socket.onmessage = function (message) { try { applyEvent(JSON.parse(message.data), assistant); } catch (_) {} };
            socket.onerror = function () { setStatus('暂时无法连接助手，请稍后重试。', true); };
            socket.onclose = function () {
                if (state.busy && state.ws === socket) {
                    if (!assistant.dataset.content) assistant.textContent = '暂时无法连接助手，请稍后重试。';
                    assistant.classList.remove('is-streaming');
                    setStatus('暂时无法连接助手，请稍后重试。', true);
                    finishTurn(true);
                }
            };
        } catch (_) {
            assistant.textContent = '暂时无法连接助手，请稍后重试。';
            setStatus('请检查网络或访客接口配置。', true);
            finishTurn(true);
        }
    }
    function stop() {
        if (!state.busy) return;
        var contextId = state.contextId;
        if (state.activeAssistant && !state.activeAssistant.dataset.content) {
            state.activeAssistant.textContent = '已停止生成。';
        }
        setStatus('已停止生成。');
        finishTurn(true);
        if (contextId) {
            var params = new URLSearchParams({ 'context-id': contextId, 'agent-id': config.assistantId });
            fetch(config.backendOrigin + '/v1/rest/j2agent/chat/stop?' + authQuery(params), {
                method: 'POST', credentials: 'omit'
            }).catch(function () { /* 本地停止仍然生效 */ });
        }
    }
    function reset() {
        stop(); state.contextId = ''; state.messages = []; state.stickToBottom = true;
        renderWelcome();
        updateScrollButton();
        setStatus(''); els.input.focus();
    }
    function open() { els.backdrop.hidden = false; els.panel.hidden = false; requestAnimationFrame(function () { els.panel.classList.add('is-open'); }); els.input.focus(); }
    function close() { els.panel.classList.remove('is-open'); els.backdrop.hidden = true; els.panel.hidden = true; }
    function initializeUi() {
        if (initialized) return;
        initialized = true;
        els.trigger.addEventListener('click', open);
        byId('resume-ai-close').addEventListener('click', close);
        els.backdrop.addEventListener('click', close);
        byId('resume-ai-new').addEventListener('click', reset);
        els.messages.addEventListener('scroll', function () {
            state.stickToBottom = isNearBottom();
            updateScrollButton();
        }, { passive: true });
        els.scrollBottom.addEventListener('click', function () {
            state.stickToBottom = true;
            scrollToEnd(true);
        });
        els.form.addEventListener('submit', function (event) {
            event.preventDefault();
            if (state.busy) stop(); else send();
        });
        els.input.addEventListener('keydown', function (event) { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } });
        document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && !els.panel.hidden) close(); });
        renderWelcome();
        updateScrollButton();
    }
    function init() {
        els = { trigger: byId('resume-ai-trigger'), backdrop: byId('resume-ai-backdrop'), panel: byId('resume-ai-panel'), messages: byId('resume-ai-messages'), scrollBottom: byId('resume-ai-scroll-bottom'), status: byId('resume-ai-status'), input: byId('resume-ai-input'), form: byId('resume-ai-form'), send: byId('resume-ai-send') };
        if (revealPending || !document.body.classList.contains('resume-locked')) reveal();
    }
    document.addEventListener('DOMContentLoaded', init);
    window.ResumeAi = {
        reveal: function () {
            if (!els.trigger) { revealPending = true; return; }
            initializeUi();
            els.trigger.hidden = false;
        },
        hide: function () { if (els.trigger) els.trigger.hidden = true; closeSocket(); },
        destroy: closeSocket
    };
}());
