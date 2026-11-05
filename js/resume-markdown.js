(function (global) {
    'use strict';

    const ALLOWED_TAGS = new Set([
        'A', 'BLOCKQUOTE', 'BR', 'CODE', 'EM', 'H1', 'H2', 'H3', 'H4',
        'H5', 'H6', 'HR', 'LI', 'OL', 'P', 'PRE', 'STRONG', 'TABLE',
        'TBODY', 'TD', 'TH', 'THEAD', 'TR', 'UL'
    ]);
    const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
    const SECTION_IDS = new Map([
        ['个人优势', 'summary-title'],
        ['工作经历', 'work-title'],
        ['项目经历', 'projects-title'],
        ['专业技能', 'skills-title'],
        ['教育经历', 'education-title']
    ]);
    const LINK_ICONS = {
        phone: {
            label: '电话',
            paths: ['M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.69 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.56 2.81.69A2 2 0 0 1 22 16.92z']
        },
        mail: {
            label: '邮箱',
            paths: ['M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'm22 6-10 7L2 6']
        },
        github: {
            label: 'GitHub',
            filled: true,
            paths: ['M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.11.79-.25.79-.56v-2.23c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.78 1.2 1.78 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.57-.29-5.27-1.29-5.27-5.68 0-1.26.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.16 1.18a10.9 10.9 0 0 1 5.76 0c2.19-1.49 3.16-1.18 3.16-1.18.63 1.58.23 2.75.11 3.04.74.8 1.19 1.82 1.19 3.08 0 4.4-2.71 5.38-5.29 5.67.42.36.79 1.07.79 2.16v3.2c0 .31.21.68.8.56A11.5 11.5 0 0 0 12 .7z']
        },
        zhihu: {
            label: '知乎',
            filled: true,
            paths: ['M5.3 4.2h7.55v1.57H9.7c-.12.91-.27 1.78-.45 2.62h3.23v1.58H8.86l-.08.26c.84.88 2.89 3.2 3.4 3.85l-1.2 1.35c-.58-.9-1.78-2.52-2.7-3.7-.72 2.02-1.86 3.87-3.7 5.25a7.1 7.1 0 0 0-1.17-1.28c2.15-1.58 3.21-3.61 3.72-5.73H3.6V8.39h3.84c.18-.84.32-1.71.42-2.62H6.48c-.38.82-.82 1.56-1.3 2.16a9.3 9.3 0 0 0-1.4-.98c1.08-1.28 1.9-3.29 2.35-5.3l1.65.35c-.18.75-.4 1.49-.67 2.2zM13.6 3.7H21v13.4h-1.7v-1.14h-4.06v1.36H13.6zm1.64 1.61v9.05h4.06V5.31z']
        },
        bilibili: {
            label: '哔哩哔哩',
            paths: ['M7.1 5.3 5.2 3.4M16.9 5.3l1.9-1.9M5.6 6.3h12.8A2.6 2.6 0 0 1 21 8.9v8.5a2.6 2.6 0 0 1-2.6 2.6H5.6A2.6 2.6 0 0 1 3 17.4V8.9a2.6 2.6 0 0 1 2.6-2.6z', 'm8.4 11.3 2.3 1.7M15.6 11.3 13.3 13']
        },
        website: {
            label: '网站',
            paths: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M3 12h18', 'M12 3a15.3 15.3 0 0 1 0 18', 'M12 3a15.3 15.3 0 0 0 0 18']
        }
    };

    function ensureMarked() {
        if (!global.marked || typeof global.marked.parse !== 'function') {
            throw new Error('Markdown 解析器未加载');
        }
    }

    function isAllowedUrl(value) {
        try {
            return ALLOWED_PROTOCOLS.has(new URL(value, global.location.href).protocol);
        } catch (_) {
            return false;
        }
    }

    function sanitizeMarkdownHtml(html) {
        const template = document.createElement('template');
        template.innerHTML = html;

        Array.from(template.content.querySelectorAll('*')).forEach((element) => {
            if (!ALLOWED_TAGS.has(element.tagName)) {
                element.replaceWith(document.createTextNode(element.textContent || ''));
                return;
            }

            Array.from(element.attributes).forEach((attribute) => {
                const keepHref = element.tagName === 'A' && attribute.name === 'href';
                const keepTitle = element.tagName === 'A' && attribute.name === 'title';
                if (!keepHref && !keepTitle) {
                    element.removeAttribute(attribute.name);
                }
            });

            if (element.tagName === 'A') {
                const href = element.getAttribute('href');
                if (!href || !isAllowedUrl(href)) {
                    element.removeAttribute('href');
                }
            }
        });

        return template.content;
    }

    function parseMarkdown(markdown) {
        ensureMarked();
        if (typeof markdown !== 'string' || !markdown.trim()) {
            throw new Error('Markdown 内容为空');
        }
        const html = global.marked.parse(markdown, {gfm: true, breaks: false});
        return sanitizeMarkdownHtml(html);
    }

    function linkIconType(link) {
        const href = link.getAttribute('href') || '';
        if (href.startsWith('tel:')) return 'phone';
        if (href.startsWith('mailto:')) return 'mail';
        try {
            const host = new URL(href, global.location.href).hostname.toLowerCase();
            if (host === 'github.com' || host.endsWith('.github.com')) return 'github';
            if (host === 'zhihu.com' || host.endsWith('.zhihu.com')) return 'zhihu';
            if (host === 'bilibili.com' || host.endsWith('.bilibili.com') || host === 'b23.tv') return 'bilibili';
            if (href.startsWith('http://') || href.startsWith('https://')) return 'website';
        } catch (_) {
            return null;
        }
        return null;
    }

    function createLinkIcon(type) {
        const definition = LINK_ICONS[type];
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('link-icon');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');
        definition.paths.forEach((pathData) => {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', pathData);
            svg.appendChild(path);
        });
        if (definition.filled) svg.classList.add('link-icon-filled');
        return svg;
    }

    function decorateLinks(target) {
        target.querySelectorAll('.resume-contact, .entry-links, .social-links').forEach((group) => {
            Array.from(group.childNodes).forEach((node) => {
                if (node.nodeType === Node.TEXT_NODE && /^[\s·|]+$/.test(node.textContent || '')) {
                    node.remove();
                }
            });
        });
        target.querySelectorAll('a[href]').forEach((link) => {
            if (link.querySelector('.link-icon')) return;
            const type = linkIconType(link);
            if (!type) return;
            if (target.id === 'main-text' && !link.closest('.social-section')) return;
            link.classList.add('icon-link', `icon-link-${type}`);
            link.prepend(createLinkIcon(type));
            if (!link.getAttribute('aria-label')) {
                link.setAttribute('aria-label', `${LINK_ICONS[type].label}：${link.textContent.trim()}`);
            }
        });
    }

    function directElements(fragment) {
        return Array.from(fragment.childNodes).filter((node) => node.nodeType === Node.ELEMENT_NODE);
    }

    function metadataHeader(heading, metadata) {
        const header = document.createElement('header');
        header.className = 'entry-header';
        const primary = document.createElement('div');
        primary.appendChild(heading);
        header.appendChild(primary);

        if (!metadata) {
            return header;
        }

        const parts = metadata.textContent.split('｜').map((part) => part.trim()).filter(Boolean);
        const role = document.createElement('p');
        role.className = 'entry-role';
        role.textContent = parts.length > 1 ? parts.slice(0, -1).join(' · ') : parts[0];
        primary.appendChild(role);

        if (parts.length > 1) {
            const meta = document.createElement('p');
            meta.className = 'entry-meta';
            meta.textContent = parts[parts.length - 1];
            header.appendChild(meta);
        }
        return header;
    }

    function isMetadataParagraph(element) {
        return element && element.tagName === 'P' && element.children.length === 1 &&
            element.firstElementChild && element.firstElementChild.tagName === 'EM';
    }

    function decorateEntryContent(entry, elements) {
        let block = null;
        elements.forEach((element) => {
            if (element.tagName === 'H4') {
                block = document.createElement('div');
                block.className = 'entry-block';
                block.appendChild(element);
                entry.appendChild(block);
                return;
            }

            if (element.tagName === 'P' && element.querySelector('strong') &&
                element.textContent.trim().startsWith('项目内容：')) {
                element.classList.add('project-summary');
            }
            if (element.tagName === 'P' && element.querySelectorAll('a').length > 0) {
                element.classList.add('entry-links');
            }
            (block || entry).appendChild(element);
        });
    }

    function buildSection(heading, elements) {
        const title = heading.textContent.trim();
        const section = document.createElement('section');
        section.className = 'resume-section';
        if (title === '社交平台') section.classList.add('social-section');
        const headingId = SECTION_IDS.get(title) || `section-${Math.random().toString(36).slice(2, 9)}`;
        heading.id = headingId;
        section.setAttribute('aria-labelledby', headingId);
        section.appendChild(heading);

        let index = 0;
        while (index < elements.length) {
            if (elements[index].tagName !== 'H3') {
                section.appendChild(elements[index]);
                index += 1;
                continue;
            }

            const article = document.createElement('article');
            article.className = title === '项目经历' ? 'resume-entry project-entry' : 'resume-entry';
            const entryHeading = elements[index];
            const metadata = isMetadataParagraph(elements[index + 1]) ? elements[index + 1] : null;
            article.appendChild(metadataHeader(entryHeading, metadata));
            index += metadata ? 2 : 1;

            const content = [];
            while (index < elements.length && elements[index].tagName !== 'H3') {
                content.push(elements[index]);
                index += 1;
            }
            decorateEntryContent(article, content);
            section.appendChild(article);
        }

        const list = section.querySelector(':scope > ul');
        if (title === '个人优势' && list) {
            list.classList.add('resume-list', 'summary-list');
        }
        if (title === '专业技能' && list) {
            list.classList.add('skill-list');
        }
        if (title === '社交平台') {
            const socialList = section.querySelector(':scope > ul');
            if (socialList) socialList.classList.add('social-links');
        }
        section.querySelectorAll('.entry-block > ul, .resume-entry > ul').forEach((entryList) => {
            entryList.classList.add('resume-list');
        });
        return section;
    }

    function renderHeadMarkdown(markdown, target) {
        const fragment = parseMarkdown(markdown);
        const elements = directElements(fragment);
        const kicker = elements.find((element) => element.tagName === 'P' && element.querySelector('strong'));
        const role = elements.find((element) => element.tagName === 'H2');
        const direction = elements.find((element) => element.tagName === 'P' &&
            element.textContent.trim().startsWith('求职方向：'));
        const facts = elements.find((element) => element.tagName === 'UL');
        const contact = elements.find((element) => element.tagName === 'P' && element.querySelector('a'));

        if (!elements.some((element) => element.tagName === 'H1') || !role || !facts || !contact) {
            throw new Error('头部 Markdown 结构不完整');
        }
        if (kicker) kicker.className = 'resume-kicker';
        role.className = 'resume-role';
        if (direction) direction.className = 'resume-direction';
        facts.className = 'resume-facts';
        facts.setAttribute('aria-label', '核心信息');

        const address = document.createElement('address');
        address.className = 'resume-contact';
        while (contact.firstChild) address.appendChild(contact.firstChild);
        contact.replaceWith(address);
        target.replaceChildren(fragment);
        decorateLinks(target);
        return 'markdown';
    }

    function renderMainMarkdown(markdown, target) {
        const fragment = parseMarkdown(markdown);
        const elements = directElements(fragment);
        const output = document.createDocumentFragment();
        let index = 0;

        while (index < elements.length) {
            if (elements[index].tagName !== 'H2') {
                throw new Error('正文 Markdown 必须从二级标题开始');
            }
            const heading = elements[index];
            index += 1;
            const sectionElements = [];
            while (index < elements.length && elements[index].tagName !== 'H2') {
                sectionElements.push(elements[index]);
                index += 1;
            }
            output.appendChild(buildSection(heading, sectionElements));
        }

        target.replaceChildren(output);
        decorateLinks(target);
        return 'markdown';
    }

    function looksLikeHtml(content) {
        return /^\s*</.test(content);
    }

    function renderResumeContent(content, target, type) {
        if (typeof content !== 'string' || !content.trim()) {
            throw new Error('简历内容为空');
        }
        if (looksLikeHtml(content)) {
            target.innerHTML = content;
            target.classList.add('legacy-resume-content');
            decorateLinks(target);
            return 'html';
        }
        target.classList.remove('legacy-resume-content');
        return type === 'head' ? renderHeadMarkdown(content, target) : renderMainMarkdown(content, target);
    }

    function renderResumeError(target, message) {
        const error = document.createElement('p');
        error.className = 'resume-load-error';
        error.textContent = message;
        target.replaceChildren(error);
    }

    global.renderHeadMarkdown = renderHeadMarkdown;
    global.renderMainMarkdown = renderMainMarkdown;
    global.renderResumeContent = renderResumeContent;
    global.renderResumeError = renderResumeError;
})(window);
