// This is a generated file. Do not edit.
import { LX } from '../core/Namespace.js';

// DocMaker.ts @jxarco
if (!LX) {
    throw ('Missing LX namespace!');
}
LX.extensions.push('DocMaker');
const CLASS_WORDS = ['uint32_t', 'uint64_t', 'uint8_t'];
const CPP_KEY_WORDS = ['int', 'float', 'double', 'bool', 'char', 'wchar_t', 'const', 'static_cast', 'dynamic_cast', 'new', 'delete', 'void', 'true',
    'false', 'auto', 'struct', 'typedef', 'nullptr', 'NULL', 'unsigned', 'namespace', 'auto'];
const JS_KEY_WORDS = ['var', 'let', 'const', 'static', 'function', 'null', 'undefined', 'new', 'delete', 'true', 'false', 'NaN', 'this'];
const WGSL_KEY_WORDS = ['var', 'let', 'const', 'override', 'fn', 'struct', 'alias', 'true', 'false', 'bool', 'f16', 'f32', 'i32', 'u32', 'vec2',
    'vec3', 'vec4', 'mat2x2', 'mat2x3', 'mat2x4', 'mat3x2', 'mat3x3', 'mat3x4', 'mat4x2', 'mat4x3', 'mat4x4' // 'atomic', 'array', 'ptr', 'sampler', 'sampler_comparison', 'texture_1d', 'texture_2d', 'texture_2d_array', 'texture_3d', 'texture_cube', 'texture_cube_array',
    // 'texture_multisampled_2d', 'texture_external', 'texture_storage_1d', 'texture_storage_2d', 'texture_storage_2d_array', 'texture_storage_3d', 'texture_depth_2d',
    // 'texture_depth_2d_array', 'texture_depth_cube', 'texture_depth_cube_array', 'texture_depth_multisampled_2d', 'function', 'private', 'workgroup', 'uniform',
    // 'storage', 'read', 'write', 'read_write', 'binding', 'builtin', 'group', 'id', 'interpolate', 'invariant', 'location',  'size', 'align', 'stride', 'vertex', 'fragment', 'compute', 'workgroup_size',
];
const STATEMENT_WORDS = ['for', 'if', 'else', 'return', 'continue', 'break', 'case', 'switch', 'while', 'import', 'from', 'await'];
const HTML_ATTRIBUTES = ['html', 'charset', 'rel', 'src', 'href', 'crossorigin', 'type', 'lang'];
const HTML_TAGS = ['DOCTYPE', 'html', 'head', 'body', 'title', 'base', 'link', 'meta', 'style', 'main', 'section', 'nav', 'article', 'aside',
    'header', 'footer', 'address', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'hr', 'pre', 'blockquote', 'ol', 'ul', 'li', 'dl', 'dt', 'dd', 'figure',
    'figcaption', 'div', 'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'dfn', 'em', 'i', 'kbd', 'mark', 'q', 'rp', 'rt', 'ruby', 's',
    'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr', 'img', 'audio', 'video', 'source', 'track', 'picture', 'map', 'area',
    'canvas', 'iframe', 'embed', 'object', 'param', 'form', 'label', 'input', 'button', 'select', 'datalist', 'optgroup', 'option', 'textarea',
    'output', 'progress', 'meter', 'fieldset', 'legend', 'table', 'caption', 'colgroup', 'col', 'tbody', 'thead', 'tfoot', 'tr', 'td', 'th',
    'details', 'summary', 'dialog', 'script', 'noscript', 'template'];
class DocMaker {
    root;
    _listQueued = undefined;
    _lastDomTarget = undefined;
    constructor(element) {
        this.root = element ?? document.body;
    }
    setDomTarget(element) {
        this.root = element;
    }
    lineBreak(target) {
        target = target ?? this.root;
        target.appendChild(document.createElement('br'));
    }
    header(string, type, id, options = {}) {
        console.assert(string !== undefined && type !== undefined);
        if (options.collapsable) {
            const collapsible = LX.makeElement('div', LX.mergeClass('my-4 px-6 cursor-pointer', options.className), `<${type} id="${id ?? ''}">${string}</${type}>`, this.root);
            const collapsibleContent = LX.makeContainer(['100%', 'auto'], 'px-4', '', this.root);
            LX.listen(collapsible, 'click', () => collapsible.querySelector('a.collapser').click());
            this._lastDomTarget = this.root;
            this.setDomTarget(collapsibleContent);
            if (options.collapsableContentCallback) {
                options.collapsableContentCallback();
            }
            LX.makeCollapsible(collapsible, collapsibleContent, null, { collapsed: options.collapsed ?? false });
            this.setDomTarget(this._lastDomTarget);
            delete this._lastDomTarget;
            return collapsible;
        }
        const header = document.createElement(type);
        header.className = options.className ?? '';
        header.innerHTML = string;
        if (id)
            header.id = id;
        this.root.appendChild(header);
        return header;
    }
    paragraph(string, sup = false, className = '') {
        console.assert(string !== undefined);
        let paragraph = document.createElement(sup ? 'sup' : 'p');
        paragraph.className = LX.mergeClass('leading-relaxed', className);
        paragraph.innerHTML = string;
        this.root.appendChild(paragraph);
        return paragraph;
    }
    code(text, language = 'js') {
        console.assert(text !== undefined);
        text.replaceAll('<', '&lt;');
        text.replaceAll('>', '&gt;');
        let highlight = '';
        let content = '';
        const getHTML = (h, c) => {
            return `<span class="${h}">${c}</span>`;
        };
        for (let i = 0; i < text.length; ++i) {
            const char = text[i];
            const string = text.substring(i);
            const endLineIdx = string.indexOf('\n');
            const line = string.substring(0, endLineIdx > -1 ? endLineIdx : undefined);
            if (char == '@') {
                const str = line.substring(1);
                if (!(str.indexOf('@') > -1) && !(str.indexOf('[') > -1)) {
                    continue;
                }
                let html = null;
                const tagIndex = str.indexOf('@');
                const skipTag = str[tagIndex - 1] == '|';
                // Highlight is specified
                if (text[i + 1] == '[') {
                    highlight = str.substring(1, 4);
                    content = str.substring(5, tagIndex);
                    if (skipTag) {
                        const newString = str.substring(6 + content.length);
                        const preContent = content;
                        const postContent = newString.substring(0, newString.indexOf('@'));
                        const finalContent = preContent.substring(0, preContent.length - 1) + '@' + postContent;
                        html = getHTML(highlight, finalContent);
                        const ogContent = preContent + '@' + postContent;
                        text = text.replace(`@[${highlight}]${ogContent}@`, html);
                    }
                    else {
                        html = getHTML(highlight, content);
                        text = text.replace(`@[${highlight}]${content}@`, html);
                    }
                }
                else {
                    content = str.substring(0, tagIndex);
                    if (skipTag) {
                        const preContent = str.substring(0, str.indexOf('@') - 1);
                        content = str.substring(preContent.length + 1);
                        content = preContent + content.substring(0, content.substring(1).indexOf('@') + 1);
                        text = text.substr(0, i) + '@' + content + '@' + text.substr(i + content.length + 3);
                    }
                    if (language == 'cpp' && CPP_KEY_WORDS.includes(content)) {
                        highlight = 'kwd';
                    }
                    else if (language == 'js' && JS_KEY_WORDS.includes(content)) {
                        highlight = 'kwd';
                    }
                    else if (language == 'wgsl' && WGSL_KEY_WORDS.includes(content)) {
                        highlight = 'kwd';
                    }
                    else if (CLASS_WORDS.includes(content)) {
                        highlight = 'cls';
                    }
                    else if (STATEMENT_WORDS.includes(content)) {
                        highlight = 'lit';
                    }
                    else if (HTML_TAGS.includes(content)) {
                        highlight = 'tag';
                    }
                    else if (HTML_ATTRIBUTES.includes(content)) {
                        highlight = 'atn';
                    }
                    else if ((content[0] == '"' && content[content.length - 1] == '"')
                        || (content[0] == "'" && content[content.length - 1] == "'")
                        || (content[0] == '`' && content[content.length - 1] == '`')) {
                        highlight = 'str';
                    }
                    else if (!Number.isNaN(parseFloat(content))) {
                        highlight = 'dec';
                    }
                    else {
                        highlight = '';
                        console.error('WARNING[Code Parsing]: Unknown highlight type: ' + content);
                    }
                    html = getHTML(highlight, content);
                    text = text.replace(`@${content}@`, html);
                }
                i += html.length - 1;
            }
        }
        let container = document.createElement('div');
        container.className = 'code-container';
        let pre = document.createElement('pre');
        let code = document.createElement('code');
        code.innerHTML = text;
        let button = document.createElement('button');
        button.title = 'Copy code sample';
        button.appendChild(LX.makeIcon('Copy'));
        button.addEventListener('click', this._copySnippet.bind(this, button));
        container.appendChild(button);
        pre.appendChild(code);
        container.appendChild(pre);
        this.root.appendChild(container);
        return container;
    }
    list(list, type, target, className = '') {
        const validTypes = ['bullet', 'numbered'];
        console.assert(list && list.length > 0 && validTypes.includes(type), 'Invalid list type or empty list' + type);
        const typeString = type == 'bullet' ? 'ul' : 'ol';
        let ul = document.createElement(typeString);
        ul.className = className;
        target = target ?? this.root;
        target.appendChild(ul);
        for (var el of list) {
            if (el.constructor === Array) {
                this.list(el, type, ul);
                return;
            }
            let li = document.createElement('li');
            li.className = 'leading-loose';
            li.innerHTML = el;
            ul.appendChild(li);
        }
        return ul;
    }
    bulletList(list) {
        return this.list(list, 'bullet');
    }
    numberedList(list) {
        return this.list(list, 'numbered');
    }
    startCodeBulletList() {
        let ul = document.createElement('ul');
        this._listQueued = ul;
        return ul;
    }
    endCodeBulletList() {
        if (this._listQueued === undefined)
            return;
        console.assert(this._listQueued !== undefined);
        this.root.appendChild(this._listQueued);
        this._listQueued = undefined;
    }
    codeListItem(item, target) {
        target = target ?? this._listQueued;
        let split = item.constructor === Array;
        if (split && item[0].constructor === Array) {
            this.codeBulletList(item, target);
            return;
        }
        let li = document.createElement('li');
        li.className = 'leading-loose';
        li.innerHTML = split
            ? (item.length == 2
                ? this.iCode(item[0]) + ': ' + item[1]
                : this.iCode(item[0] + " <span class='desc'>(" + item[1] + ')</span>') + ': ' + item[2])
            : this.iCode(item);
        target?.appendChild(li);
    }
    codeBulletList(list, target) {
        console.assert(list !== undefined && list.length > 0);
        let ul = document.createElement('ul');
        for (var el of list) {
            this.codeListItem(el, ul);
        }
        if (target) {
            target.appendChild(ul);
        }
        else {
            this.root.appendChild(ul);
        }
        return ul;
    }
    image(src, caption = '', parent, className = '') {
        let img = document.createElement('img');
        img.src = src;
        img.alt = caption;
        img.className = LX.mergeClass('my-1', className);
        parent = parent ?? this.root;
        parent.appendChild(img);
        return img;
    }
    images(sources, captions = [], width, height) {
        const mobile = navigator && /Android|iPhone/i.test(navigator.userAgent);
        const div = document.createElement('div');
        if (!mobile) {
            div.style.width = width ?? 'auto';
            div.style.height = height ?? '256px';
            div.className = 'flex flex-row justify-center';
        }
        for (let i = 0; i < sources.length; ++i) {
            this.image(sources[i], captions[i], div);
        }
        this.root.appendChild(div);
        return div;
    }
    video(src, caption = '', controls = true, autoplay = false, className = '') {
        let video = document.createElement('video');
        video.className = className;
        video.src = src;
        video.controls = controls;
        video.autoplay = autoplay;
        if (autoplay) {
            video.muted = true;
        }
        video.loop = true;
        video.alt = caption;
        this.root.appendChild(video);
        return video;
    }
    note(text, warning = false, title, icon, className = '') {
        console.assert(text !== undefined);
        const note = LX.makeContainer([], LX.mergeClass('border-color rounded-xl overflow-hidden text-sm text-secondary-foreground my-6', className), '', this.root);
        const header = document.createElement('div');
        header.className = 'flex bg-muted font-semibold px-3 py-2 gap-2 text-secondary-foreground';
        header.appendChild(LX.makeIcon(icon ?? (warning ? 'MessageSquareWarning' : 'NotepadText')));
        header.innerHTML += title ?? (warning ? 'Important' : 'Note');
        note.appendChild(header);
        // Node body
        return LX.makeContainer([], 'leading-6 p-3', text, note);
    }
    classCtor(name, params, language = 'js') {
        let paramsHTML = '';
        for (var p of params) {
            const str1 = p[0]; // cpp: param          js: name
            const str2 = p[1]; // cpp: defaultValue   js: type
            if (language == 'cpp') {
                paramsHTML += str1 + (str2 ? " = <span class='desc'>" + str2 + '</span>' : '')
                    + (params.indexOf(p) != (params.length - 1) ? ', ' : '');
            }
            else if (language == 'js') {
                paramsHTML += str1 + ": <span class='desc'>" + str2 + '</span>'
                    + (params.indexOf(p) != (params.length - 1) ? ', ' : '');
            }
        }
        let pr = document.createElement('p');
        pr.innerHTML = this.iCode("<span class='constructor'>" + name + '(' + paramsHTML + ')' + '</span>');
        this.root.appendChild(pr);
        return pr;
    }
    classMethod(name, desc, params, ret) {
        this.startCodeBulletList();
        let paramsHTML = '';
        for (var p of params) {
            const name = p[0];
            const type = p[1];
            paramsHTML += name + ": <span class='desc'>" + type + '</span>'
                + (params.indexOf(p) != (params.length - 1) ? ', ' : '');
        }
        let li = document.createElement('li');
        li.innerHTML = this.iCode("<span class='method'>" + name + ' (' + paramsHTML + ')' + (ret ? (': ' + ret) : '') + '</span>');
        this._listQueued?.appendChild(li);
        this.endCodeBulletList();
        this.paragraph(desc);
        return li.parentElement;
    }
    iLink(text, href) {
        console.assert(text !== undefined && href !== undefined);
        return `<a class="font-semibold underline-offset-4 hover:underline" href="${href}">${text}</a>`;
    }
    iPage(text, page) {
        console.assert(text !== undefined && page !== undefined);
        const startPage = page.replace('.html', '');
        const g = globalThis;
        if (g.setPath && g.loadPage) {
            const tabName = g.setPath(startPage);
            return `<a onclick="loadPage('${page}', true, '${tabName}')">${text}</a>`;
        }
        else {
            console.warn('[DocMaker] Create globalThis.setPath and globalThis.loadPage to use inline pages!');
        }
    }
    iCode(text, codeClass) {
        console.assert(text !== undefined);
        return `<code class="inline ${codeClass ?? ''}">${text}</code>`;
    }
    _copySnippet(b) {
        b.innerHTML = '';
        b.appendChild(LX.makeIcon('Check'));
        b.classList.add('copied');
        setTimeout(() => {
            b.innerHTML = '';
            b.appendChild(LX.makeIcon('Copy'));
            b.classList.remove('copied');
        }, 2000);
        navigator.clipboard.writeText(b.dataset['snippet'] ?? b.parentElement.innerText);
        console.log('Copied!');
    }
}
LX.DocMaker = DocMaker;

export { DocMaker };
//# sourceMappingURL=DocMaker.js.map
