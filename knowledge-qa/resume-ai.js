(function () {
    'use strict';

    // 配置由同目录 config.js 提供，避免助手代码和部署参数混在一起。
    var config = Object.assign({
        backendOrigin: '',
        assistantId: '',
        knowledgeCollections: [],
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
    function errorDetail(error) {
        if (error == null) return '';
        if (typeof error === 'object') {
            var detail = errorDetail(error.errorMessage || error.message || error.detail || error.error || error.data);
            return error.code != null ? '错误码 ' + error.code + (detail ? '：' + detail : '') : detail;
        }
        var detail = String(error);
        // 异常信息可能含有带授权参数的 URL，展示前隐藏当前密钥。
        if (config.apiKey) {
            detail = detail.split(config.apiKey).join('[已隐藏]');
            detail = detail.split(encodeURIComponent(config.apiKey)).join('[已隐藏]');
        }
        return detail;
    }
    function failTurn(node, message) {
        var detail = errorDetail(message) || '请求失败，服务未返回具体错误。';
        if (!node.dataset.content) node.textContent = detail;
        setStatus(detail, true);
        finishTurn(true);
        scrollToEnd(false);
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
        var questions = Array.isArray(config.demoQuestions) ? Array.from(new Set(config.demoQuestions.filter(function (item) {
            return typeof item === 'string' && item.trim();
        }).map(function (item) { return item.trim(); }))) : [];
        if (!questions.length) return;
        var quick = document.createElement('div');
        quick.className = 'resume-ai-quick-questions';
        var list = document.createElement('div');
        list.className = 'resume-ai-question-list';
        list.setAttribute('aria-live', 'polite');
        var currentQuestions = [];
        function shuffle(items) {
            for (var i = items.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var item = items[i];
                items[i] = items[j];
                items[j] = item;
            }
            return items;
        }
        function changeQuestions() {
            // 优先选取上一批未展示的问题，数量不足时再从上一批补齐。
            var remaining = shuffle(questions.filter(function (question) { return currentQuestions.indexOf(question) === -1; }));
            currentQuestions = remaining.concat(shuffle(currentQuestions.slice())).slice(0, 4);
            list.innerHTML = '';
            currentQuestions.forEach(function (question) {
                var button = document.createElement('button');
                button.type = 'button';
                button.className = 'resume-ai-hot-item';
                button.textContent = question;
                button.addEventListener('click', function () {
                    if (state.busy) return;
                    els.input.value = question;
                    send();
                });
                list.appendChild(button);
            });
        }
        changeQuestions();
        if (questions.length > 4) {
            var refresh = document.createElement('button');
            refresh.type = 'button';
            refresh.className = 'resume-ai-refresh-questions';
            refresh.textContent = '换一批';
            refresh.addEventListener('click', changeQuestions);
            quick.appendChild(refresh);
        }
        quick.appendChild(list);
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
        var response;
        try {
            response = await fetch(config.backendOrigin + '/v1/rest/j2agent/context/id?' + authQuery(new URLSearchParams()), {
                cache: 'no-store', credentials: 'omit'
            });
        } catch (error) {
            var detail = errorDetail(error);
            var isFetchError = error && error.name === 'TypeError' && /failed to fetch|fetch failed|networkerror|network request failed|load failed/i.test(detail);
            if (isFetchError) {
                throw new Error('无法访问会话接口：浏览器未获取到可读取的响应，暂时无法确定具体原因。可能涉及网络连接、跨域限制（CORS）、HTTPS 证书或服务不可用；请在浏览器开发者工具的 Network / Console 中查看详情。浏览器原始错误：' + detail);
            }
            throw new Error('创建会话请求未完成：' + (detail || '浏览器未提供错误详情。'));
        }
        if (!response.ok) {
            var raw = await response.text();
            var detail = raw;
            try { detail = errorDetail(JSON.parse(raw)) || raw; } catch (_) {}
            throw new Error('创建会话失败（HTTP ' + response.status + (response.statusText ? ' ' + response.statusText : '') + '）' + (detail ? '：' + detail : ''));
        }
        var body;
        try { body = await response.json(); }
        catch (error) { throw new Error('创建会话失败：响应不是有效的 JSON。' + errorDetail(error)); }
        var id = body && (body.contextId || (body.data && body.data.contextId));
        if (!id) throw new Error('创建会话失败：' + (errorDetail(body) || '响应缺少 contextId。'));
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
            failTurn(node, '生成失败：' + (errorDetail(payload) || errorDetail(event) || '服务未返回具体错误。'));
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
        var assistant = addMessage('assistant', '正在思考…', true);
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
                try { socket.send(JSON.stringify({
                    contextId: contextId,
                    messages: [{ index: state.messages[state.messages.length - 1].index, role: 'user', content: content }],
                    retrievalKb: true,
                    systemPrompt: 'GENERAL_ASSISTANT',
                    knowledgeCollections: config.knowledgeCollections
                })); } catch (error) {
                    failTurn(assistant, '发送消息失败：' + errorDetail(error));
                }
            };
            socket.onmessage = function (message) {
                try { applyEvent(JSON.parse(message.data), assistant); }
                catch (error) { failTurn(assistant, '处理服务响应失败：' + errorDetail(error)); }
            };
            socket.onerror = function () {
                setStatus('WebSocket 连接发生错误，浏览器未提供具体原因，等待连接关闭信息。', true);
            };
            socket.onclose = function (event) {
                if (state.busy && state.ws === socket) {
                    var detail = 'WebSocket 连接关闭（关闭码 ' + event.code + '）';
                    if (event.reason) detail += '：' + event.reason;
                    else if (event.code === 1006) detail += '：连接异常中断，浏览器未提供具体原因。';
                    else detail += '：服务在回答完成前关闭了连接。';
                    failTurn(assistant, detail);
                }
            };
        } catch (error) {
            failTurn(assistant, errorDetail(error) || '请求失败，未获取到具体错误。');
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
