// This is a generated file. Do not edit.
// Namespace.ts @jxarco
/**
 * Main namespace
 * @namespace LX
*/
const g = globalThis;
// Update global namespace if not present (Loading module)
// Extension scripts rely on LX being globally available
let LX = g.LX;
if (!LX) {
    LX = {
        version: "0.8.0",
        ready: false,
        extensions: [], // Store extensions used
        extraCommandbarEntries: [], // User specific entries for command bar
        signals: {}, // Events and triggers
        activeDraggable: null, // Watch for the current active draggable
        spacingMode: "default",
        layoutMode: "app",
        MOUSE_LEFT_CLICK: 0,
        MOUSE_MIDDLE_CLICK: 1,
        MOUSE_RIGHT_CLICK: 2,
        MOUSE_DOUBLE_CLICK: 2,
        MOUSE_TRIPLE_CLICK: 3,
        CURVE_MOVEOUT_CLAMP: 0,
        CURVE_MOVEOUT_DELETE: 1,
        DRAGGABLE_Z_INDEX: 101
    };
    g.LX = LX;
}

// Branch.ts @jxarco
/**
 * @class Branch
 */
class Branch {
    name;
    components;
    closed;
    root;
    content;
    grabber;
    panel;
    onclick;
    oncontextmenu;
    constructor(name, options = {}) {
        this.name = name;
        var root = document.createElement('div');
        root.className = "lexbranch";
        if (options.id) {
            root.id = options.id;
        }
        if (options.className) {
            root.className += " " + options.className;
        }
        root.style.margin = "0 auto";
        var that = this;
        this.closed = options.closed ?? false;
        this.root = root;
        this.components = [];
        this.panel = null;
        // Create element
        const title = document.createElement('div');
        title.className = "lexbranchtitle";
        if (options.icon) {
            const branchIcon = LX.makeIcon(options.icon, { iconClass: "mr-2" });
            title.appendChild(branchIcon);
        }
        title.innerHTML += (name || "Branch");
        const collapseIcon = LX.makeIcon("Right", { iconClass: "switch-branch-button", svgClass: "sm" });
        title.appendChild(collapseIcon);
        root.appendChild(title);
        var branchContent = document.createElement('div');
        branchContent.id = name.replace(/\s/g, '');
        branchContent.className = "lexbranchcontent";
        root.appendChild(branchContent);
        this.content = branchContent;
        this._addBranchSeparator();
        if (this.closed) {
            title.classList.add("closed");
            root.classList.add("closed");
            this.grabber.setAttribute("hidden", true);
            LX.doAsync(() => {
                this.content.setAttribute("hidden", true);
            }, 10);
        }
        this.onclick = function () {
            // e.stopPropagation();
            title.classList.toggle("closed");
            title.parentElement.classList.toggle("closed");
            that.content.toggleAttribute("hidden");
            that.grabber.toggleAttribute("hidden");
            LX.emitSignal("@on_branch_closed", title.classList.contains("closed"));
        };
        this.oncontextmenu = function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (title.parentElement.classList.contains("dialog")) {
                return;
            }
            LX.addContextMenu("Dock", e, (m) => {
                e.preventDefault();
                m.add('Floating', that._onMakeFloating.bind(that));
            }, { icon: "WindowRestore" });
        };
        title.addEventListener('click', this.onclick);
        title.addEventListener('contextmenu', this.oncontextmenu);
    }
    _onMakeFloating() {
        const dialog = new LX.Dialog(this.name, (p) => {
            // Add components
            for (let w of this.components) {
                p.root.appendChild(w.root);
            }
        }, { dockable: true });
        const childIndex = Array.from(this.root.parentElement.childNodes).indexOf(this.root);
        console.assert(childIndex >= 0, "Branch not found!");
        dialog.branchData = {
            name: this.name,
            components: this.components,
            closed: this.closed,
            panel: this.panel,
            childIndex
        };
        this.root.remove();
    }
    _addBranchSeparator() {
        const element = document.createElement('div');
        element.className = "lexcomponentseparator";
        element.style.width = "100%";
        element.style.background = "none";
        const grabber = document.createElement('div');
        grabber.innerHTML = "&#9662;";
        element.appendChild(grabber);
        LX.doAsync(() => {
            grabber.style.marginLeft = ((parseFloat(LX.DEFAULT_NAME_WIDTH) / 100.0) * this.content.offsetWidth) + "px";
        }, 10);
        const line = document.createElement('div');
        line.style.width = "1px";
        line.style.marginLeft = "6px";
        line.style.marginTop = "2px";
        line.style.height = "0px"; // get in time
        grabber.appendChild(line);
        grabber.addEventListener("mousedown", innerMouseDown);
        this.grabber = grabber;
        function getBranchHeight() {
            return that.root.offsetHeight - that.root.children[0].offsetHeight;
        }
        let that = this;
        function innerMouseDown(e) {
            var doc = that.root.ownerDocument;
            doc.addEventListener("mouseup", innerMouseUp);
            doc.addEventListener("mousemove", innerMouseMove);
            e.stopPropagation();
            e.preventDefault();
            const h = getBranchHeight();
            line.style.height = (h - 3) + "px";
            document.body.classList.add('nocursor');
        }
        function innerMouseMove(e) {
            let dt = e.movementX;
            if (dt != 0) {
                const margin = parseFloat(grabber.style.marginLeft);
                grabber.style.marginLeft = LX.clamp(margin + dt, 32, that.content.offsetWidth - 32) + "px";
            }
        }
        function innerMouseUp(e) {
            that._updateComponents();
            line.style.height = "0px";
            var doc = that.root.ownerDocument;
            doc.removeEventListener("mouseup", innerMouseUp);
            doc.removeEventListener("mousemove", innerMouseMove);
            document.body.classList.remove('nocursor');
        }
        this.content.appendChild(element);
    }
    _updateComponents() {
        var size = this.grabber.style.marginLeft;
        // Update sizes of components inside
        for (let i = 0; i < this.components.length; i++) {
            let component = this.components[i];
            const element = component.root;
            if (element.children.length < 2) {
                continue;
            }
            let name = element.children[0];
            let value = element.children[1];
            name.style.width = size;
            name.style.minWidth = size;
            switch (component.type) {
                case LX.BaseComponent.CUSTOM:
                case LX.BaseComponent.ARRAY:
                    continue;
            }
            value.style.width = "-moz-calc( 100% - " + size + " )";
            value.style.width = "-webkit-calc( 100% - " + size + " )";
            value.style.width = "calc( 100% - " + size + " )";
        }
    }
}
LX.Branch = Branch;

// BaseComponent.ts @jxarco
var ComponentType;
(function (ComponentType) {
    ComponentType[ComponentType["NONE"] = 0] = "NONE";
    ComponentType[ComponentType["TEXT"] = 1] = "TEXT";
    ComponentType[ComponentType["TEXTAREA"] = 2] = "TEXTAREA";
    ComponentType[ComponentType["BUTTON"] = 3] = "BUTTON";
    ComponentType[ComponentType["SELECT"] = 4] = "SELECT";
    ComponentType[ComponentType["CHECKBOX"] = 5] = "CHECKBOX";
    ComponentType[ComponentType["TOGGLE"] = 6] = "TOGGLE";
    ComponentType[ComponentType["RADIO"] = 7] = "RADIO";
    ComponentType[ComponentType["BUTTONS"] = 8] = "BUTTONS";
    ComponentType[ComponentType["COLOR"] = 9] = "COLOR";
    ComponentType[ComponentType["RANGE"] = 10] = "RANGE";
    ComponentType[ComponentType["NUMBER"] = 11] = "NUMBER";
    ComponentType[ComponentType["TITLE"] = 12] = "TITLE";
    ComponentType[ComponentType["VECTOR"] = 13] = "VECTOR";
    ComponentType[ComponentType["TREE"] = 14] = "TREE";
    ComponentType[ComponentType["PROGRESS"] = 15] = "PROGRESS";
    ComponentType[ComponentType["FILE"] = 16] = "FILE";
    ComponentType[ComponentType["LAYERS"] = 17] = "LAYERS";
    ComponentType[ComponentType["ARRAY"] = 18] = "ARRAY";
    ComponentType[ComponentType["LIST"] = 19] = "LIST";
    ComponentType[ComponentType["TAGS"] = 20] = "TAGS";
    ComponentType[ComponentType["CURVE"] = 21] = "CURVE";
    ComponentType[ComponentType["CARD"] = 22] = "CARD";
    ComponentType[ComponentType["IMAGE"] = 23] = "IMAGE";
    ComponentType[ComponentType["CONTENT"] = 24] = "CONTENT";
    ComponentType[ComponentType["CUSTOM"] = 25] = "CUSTOM";
    ComponentType[ComponentType["SEPARATOR"] = 26] = "SEPARATOR";
    ComponentType[ComponentType["KNOB"] = 27] = "KNOB";
    ComponentType[ComponentType["SIZE"] = 28] = "SIZE";
    ComponentType[ComponentType["OTP"] = 29] = "OTP";
    ComponentType[ComponentType["PAD"] = 30] = "PAD";
    ComponentType[ComponentType["FORM"] = 31] = "FORM";
    ComponentType[ComponentType["DIAL"] = 32] = "DIAL";
    ComponentType[ComponentType["COUNTER"] = 33] = "COUNTER";
    ComponentType[ComponentType["TABLE"] = 34] = "TABLE";
    ComponentType[ComponentType["TABS"] = 35] = "TABS";
    ComponentType[ComponentType["DATE"] = 36] = "DATE";
    ComponentType[ComponentType["MAP2D"] = 37] = "MAP2D";
    ComponentType[ComponentType["LABEL"] = 39] = "LABEL";
    ComponentType[ComponentType["BLANK"] = 40] = "BLANK";
    ComponentType[ComponentType["RATE"] = 41] = "RATE";
})(ComponentType || (ComponentType = {}));
LX.ComponentType = ComponentType;
/**
 * @class BaseComponent
 */
class BaseComponent {
    type;
    name;
    customName;
    options;
    root;
    customIdx = -1;
    disabled = false;
    onSetValue;
    onGetValue;
    onAllowPaste;
    onResize;
    _initialValue;
    static NO_CONTEXT_TYPES = [
        ComponentType.BUTTON,
        ComponentType.LIST,
        ComponentType.FILE,
        ComponentType.PROGRESS
    ];
    constructor(type, name, value, options = {}) {
        this.type = type;
        this.name = name;
        this.options = options;
        this._initialValue = value;
        const root = document.createElement('div');
        root.className = "lexcomponent";
        this.onResize = () => { };
        if (options.id) {
            root.id = options.id;
        }
        if (options.title) {
            root.title = options.title;
        }
        if (options.className) {
            root.className += " " + options.className;
        }
        if (type != ComponentType.TITLE) {
            if (options.width) {
                root.style.width = root.style.minWidth = options.width;
            }
            if (options.maxWidth) {
                root.style.maxWidth = options.maxWidth;
            }
            if (options.minWidth) {
                root.style.minWidth = options.minWidth;
            }
            if (options.height) {
                root.style.height = root.style.minHeight = options.height;
            }
            LX.componentResizeObserver.observe(root);
        }
        if (name != undefined) {
            if (!(options.hideName ?? false)) {
                let domName = document.createElement('div');
                domName.className = "lexcomponentname";
                if (options.justifyName) {
                    domName.classList.add("float-" + options.justifyName);
                }
                domName.innerHTML = name;
                domName.title = options.title ?? domName.innerHTML;
                domName.style.width = options.nameWidth || LX.DEFAULT_NAME_WIDTH;
                domName.style.minWidth = domName.style.width;
                root.appendChild(domName);
                root.domName = domName;
                const that = this;
                // Copy-paste info
                domName.addEventListener('contextmenu', function (e) {
                    e.preventDefault();
                    that.oncontextmenu(e);
                });
                if (!(options.skipReset ?? false) && (value != null)) {
                    this._addResetProperty(domName, function (el, event) {
                        that.set(that._initialValue, false, event);
                        el.style.display = "none"; // Og value, don't show it
                    });
                }
            }
        }
        else {
            options.hideName = true;
        }
        if (options.signal) {
            LX.addSignal(options.signal, this);
        }
        this.root = root;
        this.root.jsInstance = this;
        this.options = options;
    }
    static _dispatchEvent(element, type, data, bubbles, cancelable) {
        let event = new CustomEvent(type, { 'detail': data, 'bubbles': bubbles, 'cancelable': cancelable });
        element.dispatchEvent(event);
    }
    _addResetProperty(container, callback) {
        const domEl = LX.makeIcon("Undo2", { iconClass: "ml-0 mr-1 px-1", title: "Reset" });
        domEl.style.display = "none";
        domEl.addEventListener("click", callback.bind(domEl, domEl));
        container.appendChild(domEl);
        return domEl;
    }
    _canPaste() {
        const clipboard = navigator.clipboard;
        let pasteAllowed = this.type === ComponentType.CUSTOM ?
            (clipboard.customIdx !== undefined && this.customIdx == clipboard.customIdx) : clipboard.type === this.type;
        pasteAllowed = pasteAllowed && (this.disabled !== true);
        if (this.onAllowPaste) {
            pasteAllowed = this.onAllowPaste(pasteAllowed);
        }
        return pasteAllowed;
    }
    _trigger(event, callback, scope = this) {
        if (!callback) {
            return;
        }
        callback.call(scope, event.value, event.domEvent, event.name);
    }
    value() {
        if (this.onGetValue) {
            return this.onGetValue();
        }
        console.warn("Can't get value of " + this.typeName());
    }
    set(value, skipCallback, event) {
        if (this.onSetValue) {
            let resetButton = this.root.querySelector(".lexcomponentname .lexicon");
            if (resetButton) {
                resetButton.style.display = (value != this.value() ? "block" : "none");
                const equalInitial = value.constructor === Array ? (function arraysEqual(a, b) {
                    if (a === b)
                        return true;
                    if (a == null || b == null)
                        return false;
                    if (a.length !== b.length)
                        return false;
                    for (var i = 0; i < a.length; ++i) {
                        if (a[i] !== b[i])
                            return false;
                    }
                    return true;
                })(value, this._initialValue) : (value == this._initialValue);
                resetButton.style.display = (!equalInitial ? "block" : "none");
            }
            return this.onSetValue(value, skipCallback ?? false, event);
        }
        console.warn(`Can't set value of ${this.typeName()}`);
    }
    oncontextmenu(e) {
        if (BaseComponent.NO_CONTEXT_TYPES.includes(this.type)) {
            return;
        }
        LX.addContextMenu(this.typeName(), e, (c) => {
            c.add("Copy", () => { this.copy(); });
            c.add("Paste", { disabled: !this._canPaste(), callback: () => { this.paste(); } });
        });
    }
    copy() {
        const clipboard = navigator.clipboard;
        clipboard.type = this.type;
        clipboard.customIdx = this.customIdx;
        clipboard.data = this.value();
        clipboard.writeText(clipboard.data);
    }
    paste() {
        if (!this._canPaste()) {
            return;
        }
        const clipboard = navigator.clipboard;
        this.set(clipboard.data);
    }
    typeName() {
        switch (this.type) {
            case ComponentType.TEXT: return "Text";
            case ComponentType.TEXTAREA: return "TextArea";
            case ComponentType.BUTTON: return "Button";
            case ComponentType.SELECT: return "Select";
            case ComponentType.CHECKBOX: return "Checkbox";
            case ComponentType.TOGGLE: return "Toggle";
            case ComponentType.RADIO: return "Radio";
            case ComponentType.COLOR: return "Color";
            case ComponentType.RANGE: return "Range";
            case ComponentType.NUMBER: return "Number";
            case ComponentType.VECTOR: return "Vector";
            case ComponentType.TREE: return "Tree";
            case ComponentType.PROGRESS: return "Progress";
            case ComponentType.FILE: return "File";
            case ComponentType.LAYERS: return "Layers";
            case ComponentType.ARRAY: return "Array";
            case ComponentType.LIST: return "List";
            case ComponentType.TAGS: return "Tags";
            case ComponentType.CURVE: return "Curve";
            case ComponentType.KNOB: return "Knob";
            case ComponentType.SIZE: return "Size";
            case ComponentType.PAD: return "Pad";
            case ComponentType.FORM: return "Form";
            case ComponentType.DIAL: return "Dial";
            case ComponentType.COUNTER: return "Counter";
            case ComponentType.TABLE: return "Table";
            case ComponentType.TABS: return "Tabs";
            case ComponentType.DATE: return "Date";
            case ComponentType.MAP2D: return "Map2D";
            case ComponentType.RATE: return "Rate";
            case ComponentType.LABEL: return "Label";
            case ComponentType.BLANK: return "Blank";
            case ComponentType.CUSTOM: return this.customName;
        }
        console.error(`Unknown Component type: ${this.type}`);
    }
    refresh(value) {
    }
}
LX.BaseComponent = BaseComponent;

// Event.ts @jxarco
/*
*   Events and Signals
*/
class IEvent {
    name;
    value;
    domEvent;
    constructor(name, value, domEvent) {
        this.name = name;
        this.value = value;
        this.domEvent = domEvent;
    }
}
LX.IEvent = IEvent;
class TreeEvent {
    static NONE = 0;
    static NODE_SELECTED = 1;
    static NODE_DELETED = 2;
    static NODE_DBLCLICKED = 3;
    static NODE_CONTEXTMENU = 4;
    static NODE_DRAGGED = 5;
    static NODE_RENAMED = 6;
    static NODE_VISIBILITY = 7;
    static NODE_CARETCHANGED = 8;
    type = TreeEvent.NONE;
    node;
    value;
    event;
    multiple = false; // Multiple selection
    panel = null;
    constructor(type, node, value, event) {
        this.type = type || TreeEvent.NONE;
        this.node = node;
        this.value = value;
        this.event = event;
    }
    string() {
        switch (this.type) {
            case TreeEvent.NONE: return "tree_event_none";
            case TreeEvent.NODE_SELECTED: return "tree_event_selected";
            case TreeEvent.NODE_DELETED: return "tree_event_deleted";
            case TreeEvent.NODE_DBLCLICKED: return "tree_event_dblclick";
            case TreeEvent.NODE_CONTEXTMENU: return "tree_event_contextmenu";
            case TreeEvent.NODE_DRAGGED: return "tree_event_dragged";
            case TreeEvent.NODE_RENAMED: return "tree_event_renamed";
            case TreeEvent.NODE_VISIBILITY: return "tree_event_visibility";
            case TreeEvent.NODE_CARETCHANGED: return "tree_event_caretchanged";
        }
    }
}
LX.TreeEvent = TreeEvent;

// TextInput.ts @jxarco
/**
 * @class TextInput
 * @description TextInput Component
 */
class TextInput extends BaseComponent {
    valid;
    _triggerEvent;
    _lastValueTriggered;
    constructor(name, value, callback, options = {}) {
        super(ComponentType.TEXT, name, String(value), options);
        this.onGetValue = () => {
            return value;
        };
        this.onSetValue = (newValue, skipCallback, event) => {
            let skipTrigger = (this._lastValueTriggered == newValue);
            if (!options.ignoreValidation) {
                skipTrigger = skipTrigger || (!this.valid(newValue));
            }
            if (skipTrigger) {
                return;
            }
            this._lastValueTriggered = value = newValue;
            wValue.value = newValue;
            delete this._triggerEvent;
            if (!skipCallback) {
                this._trigger(new IEvent(name, newValue, event), callback);
            }
        };
        this.onResize = (rect) => {
            const realNameWidth = (this.root.domName?.style.width ?? "0px");
            container.style.width = options.inputWidth ?? `calc( 100% - ${realNameWidth})`;
        };
        this.valid = (v, matchField) => {
            v = v ?? this.value();
            if (!options.pattern)
                return true;
            const errs = LX.validateValueAtPattern(v, options.pattern, matchField);
            return (errs.length == 0);
        };
        let container = document.createElement('div');
        container.className = (options.warning ? " lexwarning" : "");
        container.style.display = "flex";
        container.style.position = "relative";
        this.root.appendChild(container);
        this.disabled = (options.disabled || options.warning) ?? (options.url ? true : false);
        let wValue = null;
        if (!this.disabled) {
            wValue = document.createElement('input');
            wValue.className = "lextext " + (options.inputClass ?? "");
            wValue.type = options.type || "";
            wValue.value = value || "";
            wValue.style.textAlign = (options.float ?? "");
            wValue.setAttribute("placeholder", options.placeholder ?? "");
            if (options.required) {
                wValue.setAttribute("required", options.required);
            }
            if (options.pattern) {
                wValue.setAttribute("pattern", LX.buildTextPattern(options.pattern));
            }
            const trigger = options.trigger ?? "default";
            if (trigger == "default") {
                wValue.addEventListener("keyup", (e) => {
                    if (e.key == "Enter") {
                        this._triggerEvent = e;
                        wValue.blur();
                    }
                });
                wValue.addEventListener("focusout", (e) => {
                    this._triggerEvent = this._triggerEvent ?? e;
                    this.set(e.target.value, false, this._triggerEvent);
                });
            }
            else if (trigger == "input") {
                wValue.addEventListener("input", (e) => {
                    this.set(e.target.value, false, e);
                });
            }
            wValue.addEventListener("mousedown", function (e) {
                e.stopImmediatePropagation();
                e.stopPropagation();
            });
            if (options.icon) {
                wValue.style.paddingLeft = "1.75rem";
                const icon = LX.makeIcon(options.icon, { iconClass: "absolute z-1 ml-2", svgClass: "sm" });
                container.appendChild(icon);
            }
        }
        else if (options.url) {
            wValue = document.createElement('a');
            wValue.href = options.url;
            wValue.target = "_blank";
            wValue.innerHTML = value ?? "";
            wValue.style.textAlign = options.float ?? "";
            wValue.className = "lextext ellipsis-overflow";
        }
        else {
            wValue = document.createElement('input');
            wValue.disabled = true;
            wValue.value = value;
            wValue.style.textAlign = options.float ?? "";
            wValue.className = "lextext ellipsis-overflow " + (options.inputClass ?? "");
        }
        if (options.fit) {
            wValue.classList.add("size-content");
        }
        Object.assign(wValue.style, options.style ?? {});
        container.appendChild(wValue);
        LX.doAsync(this.onResize.bind(this));
    }
}
LX.TextInput = TextInput;

// Title.ts @jxarco
/**
 * @class Title
 * @description Title Component
 */
class Title extends BaseComponent {
    constructor(name, options = {}) {
        console.assert(name.length !== 0, "Can't create Title Component without text!");
        // Note: Titles are not registered in Panel.components by now
        super(ComponentType.TITLE, null, null, options);
        this.root.className = `lextitle ${this.root.className}`;
        if (options.icon) {
            let icon = LX.makeIcon(options.icon, { iconClass: "mr-2" });
            icon.querySelector("svg").style.color = options.iconColor || "";
            this.root.appendChild(icon);
        }
        let text = document.createElement("span");
        text.innerText = name;
        this.root.appendChild(text);
        Object.assign(this.root.style, options.style ?? {});
        if (options.link != undefined) {
            let linkDom = document.createElement('a');
            linkDom.innerText = name;
            linkDom.href = options.link;
            linkDom.target = options.target ?? "";
            linkDom.className = "lextitle link";
            Object.assign(linkDom.style, options.style ?? {});
            this.root.replaceWith(linkDom);
        }
    }
}
LX.Title = Title;

// Button.ts @jxarco
/**
 * @class Button
 * @description Button Component
 */
class Button extends BaseComponent {
    selectable = false;
    callback;
    setState;
    swap;
    constructor(name, value, callback, options = {}) {
        super(ComponentType.BUTTON, name, null, options);
        this.callback = callback;
        this.selectable = options.selectable ?? this.selectable;
        this.onGetValue = () => {
            const isSelected = LX.hasClass(wValue, "selected");
            const swapInput = wValue.querySelector("input");
            return swapInput ? swapInput.checked : (this.selectable ? isSelected : value);
        };
        this.onSetValue = (newValue, skipCallback, event) => {
            if ((options.swap ?? false)) {
                this.setState(newValue, skipCallback);
                return;
            }
            // No-swap buttons
            wValue.innerHTML = "";
            if (options.icon) {
                const icon = LX.makeIcon(options.icon);
                wValue.prepend(icon);
            }
            else if (options.img) {
                let img = document.createElement('img');
                img.src = options.img;
                wValue.prepend(img);
            }
            else {
                wValue.innerHTML = `<span>${(newValue ?? "")}</span>`;
            }
        };
        this.onResize = (rect) => {
            const realNameWidth = (this.root.domName?.style.width ?? "0px");
            wValue.style.width = `calc( 100% - ${realNameWidth})`;
        };
        // In case of swap, set if a change has to be performed
        this.setState = function (v, skipCallback) {
            const swapInput = wValue.querySelector("input");
            if (swapInput) {
                swapInput.checked = v;
            }
            else if (this.selectable) {
                if (options.parent) {
                    options.parent.querySelectorAll(".lexbutton.selected").forEach((b) => { if (b == wValue)
                        return; b.classList.remove("selected"); });
                }
                wValue.classList.toggle("selected", v);
            }
            if (!skipCallback) {
                this._trigger(new IEvent(name, swapInput ? swapInput.checked : (this.selectable ? v : value), null), callback);
            }
        };
        var wValue = document.createElement('button');
        wValue.title = options.tooltip ? "" : (options.title ?? "");
        wValue.className = "lexbutton px-3 " + (options.buttonClass ?? "");
        this.root.appendChild(wValue);
        if (options.selected) {
            wValue.classList.add("selected");
        }
        if (options.img) {
            let img = document.createElement('img');
            img.src = options.img;
            wValue.prepend(img);
        }
        else if (options.icon) {
            const icon = LX.makeIcon(options.icon, { iconClass: options.iconClass, svgClass: options.svgClass });
            const iconPosition = options.iconPosition ?? "cover";
            // Default
            if (iconPosition == "cover" || (options.swap !== undefined)) {
                wValue.prepend(icon);
            }
            else {
                wValue.innerHTML = `<span>${(value || "")}</span>`;
                if (iconPosition == "start") {
                    wValue.querySelector("span").prepend(icon);
                }
                else // "end"
                 {
                    wValue.querySelector("span").appendChild(icon);
                }
            }
            wValue.classList.add("justify-center");
        }
        else {
            wValue.innerHTML = `<span>${(value || "")}</span>`;
        }
        if (options.fileInput) {
            const fileInput = document.createElement("input");
            fileInput.type = "file";
            fileInput.className = "file-input";
            fileInput.style.display = "none";
            wValue.appendChild(fileInput);
            fileInput.addEventListener('change', function (e) {
                if (!e.target)
                    return;
                const files = e.target.files;
                if (!files.length)
                    return;
                const reader = new FileReader();
                if (options.fileInputType === 'text')
                    reader.readAsText(files[0]);
                else if (options.fileInputType === 'buffer')
                    reader.readAsArrayBuffer(files[0]);
                else if (options.fileInputType === 'bin')
                    reader.readAsBinaryString(files[0]);
                else if (options.fileInputType === 'url')
                    reader.readAsDataURL(files[0]);
                reader.onload = e => { callback.call(this, e.target?.result, files[0]); };
            });
        }
        if (options.disabled) {
            this.disabled = true;
            wValue.setAttribute("disabled", true);
        }
        let trigger = wValue;
        if (options.swap) {
            wValue.classList.add("swap");
            wValue.querySelector("a").classList.add("swap-off");
            const input = document.createElement("input");
            input.className = "p-0 border-0";
            input.type = "checkbox";
            wValue.prepend(input);
            const swapIcon = LX.makeIcon(options.swap, { iconClass: "swap-on" });
            wValue.appendChild(swapIcon);
            this.swap = function (skipCallback) {
                const swapInput = wValue.querySelector("input");
                swapInput.checked = !swapInput.checked;
                if (!skipCallback) {
                    trigger.click();
                }
            };
        }
        trigger.addEventListener("click", (e) => {
            let isSelected;
            if (this.selectable) {
                if (options.parent) {
                    options.parent.querySelectorAll(".lexbutton.selected").forEach((b) => { if (b == wValue)
                        return; b.classList.remove("selected"); });
                }
                isSelected = wValue.classList.toggle('selected');
            }
            if (options.fileInput) {
                wValue.querySelector(".file-input").click();
            }
            else if (options.mustConfirm) {
                new LX.PopConfirm(wValue, {
                    onConfirm: () => {
                        this._trigger(new IEvent(name, value, e), callback);
                    },
                    side: options.confirmSide,
                    align: options.confirmAlign,
                    confirmText: options.confirmText,
                    cancelText: options.confirmCancelText,
                    title: options.confirmTitle,
                    content: options.confirmContent
                });
            }
            else {
                const swapInput = wValue.querySelector("input");
                this._trigger(new IEvent(name, swapInput?.checked ?? (this.selectable ? isSelected : value), e), callback);
            }
        });
        if (options.tooltip) {
            LX.asTooltip(wValue, options.title ?? name);
        }
        LX.doAsync(this.onResize.bind(this));
    }
    click() {
        const buttonDOM = this.root.querySelector('button');
        buttonDOM.click();
    }
}
LX.Button = Button;

// ComboButtons.ts @jxarco
/**
 * @class ComboButtons
 * @description ComboButtons Component
 */
class ComboButtons extends BaseComponent {
    constructor(name, values, options = {}) {
        const shouldSelect = !(options.noSelection ?? false);
        let shouldToggle = shouldSelect && (options.toggle ?? false);
        let container = document.createElement('div');
        container.className = "lexcombobuttons ";
        options.skipReset = true;
        if (options.float) {
            container.className += options.float;
        }
        let currentValue = [];
        let buttonsBox = document.createElement('div');
        buttonsBox.className = "lexcombobuttonsbox ";
        container.appendChild(buttonsBox);
        for (let b of values) {
            if (!b.value) {
                throw ("Set 'value' for each button!");
            }
            let buttonEl = document.createElement('button');
            buttonEl.className = "lexbutton combo";
            buttonEl.title = b.icon ? b.value : "";
            buttonEl.id = b.id ?? "";
            buttonEl.dataset["value"] = b.value;
            if (options.buttonClass) {
                buttonEl.classList.add(options.buttonClass);
            }
            if (shouldSelect && (b.selected || options.selected?.includes(b.value))) {
                buttonEl.classList.add("selected");
                currentValue = (currentValue).concat([b.value]);
            }
            if (b.icon) {
                const icon = LX.makeIcon(b.icon);
                buttonEl.appendChild(icon);
            }
            else {
                buttonEl.innerHTML = `<span>${b.value}</span>`;
            }
            if (b.disabled) {
                buttonEl.setAttribute("disabled", "true");
            }
            buttonEl.addEventListener("click", e => {
                currentValue = [];
                if (shouldSelect) {
                    if (shouldToggle) {
                        buttonEl.classList.toggle("selected");
                    }
                    else {
                        container.querySelectorAll("button").forEach(s => s.classList.remove("selected"));
                        buttonEl.classList.add("selected");
                    }
                }
                container.querySelectorAll("button").forEach(s => {
                    if (s.classList.contains("selected")) {
                        currentValue.push(s.dataset["value"]);
                    }
                });
                if (!shouldToggle && currentValue.length > 1) {
                    console.error(`Enable _options.toggle_ to allow selecting multiple options in ComboButtons.`);
                    return;
                }
                currentValue = currentValue[0];
                this.set(b.value, false, buttonEl.classList.contains("selected"));
            });
            buttonsBox.appendChild(buttonEl);
        }
        if (currentValue.length > 1) {
            if (!shouldToggle) {
                options.toggle = true;
                shouldToggle = shouldSelect;
                console.warn(`Multiple options selected in '${name}' ComboButtons. Enabling _toggle_ mode.`);
            }
        }
        else {
            currentValue = currentValue[0];
        }
        super(ComponentType.BUTTONS, name, null, options);
        this.onGetValue = () => {
            return currentValue;
        };
        this.onSetValue = (newValue, skipCallback, event) => {
            if (shouldSelect && (event == undefined)) {
                container.querySelectorAll("button").forEach(s => s.classList.remove("selected"));
                container.querySelectorAll("button").forEach(s => {
                    if (currentValue && currentValue.indexOf(s.dataset["value"]) > -1) {
                        s.classList.add("selected");
                    }
                });
            }
            if (!skipCallback && newValue.constructor != Array) {
                const enabled = event;
                const fn = values.filter(v => v.value == newValue)[0]?.callback;
                this._trigger(new IEvent(name, shouldToggle ? [newValue, enabled] : newValue, null), fn);
            }
        };
        this.onResize = (rect) => {
            const realNameWidth = (this.root.domName?.style.width ?? "0px");
            container.style.width = `calc( 100% - ${realNameWidth})`;
        };
        this.root.appendChild(container);
        LX.doAsync(this.onResize.bind(this));
    }
}
LX.ComboButtons = ComboButtons;

// Card.ts @jxarco
/**
 * @class Card
 * @description Card Component
 */
class Card extends BaseComponent {
    constructor(name, options = {}) {
        options.hideName = true;
        super(ComponentType.CARD, name, null, options);
        this.root.classList.add("place-content-center");
        const container = LX.makeContainer(["100%", "auto"], "lexcard max-w-sm flex flex-col gap-4 bg-primary border rounded-xl py-6", "", this.root);
        if (options.header) {
            const hasAction = (options.header.action !== undefined);
            let header = LX.makeContainer(["100%", "auto"], `flex ${hasAction ? "flex-row gap-4" : "flex-col gap-1"} px-6`, "", container);
            if (hasAction) {
                const actionBtn = new Button(null, options.header.action.name, options.header.action.callback);
                header.appendChild(actionBtn.root);
                const titleDescBox = LX.makeContainer(["75%", "auto"], `flex flex-col gap-1`, "");
                header.prepend(titleDescBox);
                header = titleDescBox;
            }
            if (options.header.title) {
                LX.makeElement("div", "text-md leading-none font-semibold", options.header.title, header);
            }
            if (options.header.description) {
                LX.makeElement("div", "text-sm fg-tertiary", options.header.description, header);
            }
        }
        if (options.content) {
            const content = LX.makeContainer(["100%", "auto"], "flex flex-col gap-2 px-6", "", container);
            const elements = [].concat(options.content);
            for (let e of elements) {
                content.appendChild(e.root ? e.root : e);
            }
        }
        if (options.footer) {
            const footer = LX.makeContainer(["100%", "auto"], "flex flex-col gap-1 px-6", "", container);
            const elements = [].concat(options.footer);
            for (let e of elements) {
                footer.appendChild(e.root ? e.root : e);
            }
        }
        if (options.callback) {
            container.classList.add("selectable");
            container.style.cursor = "pointer";
            container.addEventListener("click", (e) => {
                this._trigger(new IEvent(name, null, e), options.callback);
            });
        }
    }
}
LX.Card = Card;

// Form.ts @jxarco
/**
 * @class Form
 * @description Form Component
 */
class Form extends BaseComponent {
    constructor(name, data, callback, options = {}) {
        if (data.constructor != Object) {
            console.error("Form data must be an Object");
            return;
        }
        // Always hide name for this one
        options.hideName = true;
        super(ComponentType.FORM, name, null, options);
        this.onGetValue = () => {
            return container.formData;
        };
        this.onSetValue = (newValue, skipCallback, event) => {
            container.formData = newValue;
            const entries = container.querySelectorAll(".lexcomponent");
            for (let i = 0; i < entries.length; ++i) {
                const entry = entries[i];
                if (entry.jsInstance.type != ComponentType.TEXT) {
                    continue;
                }
                let entryName = entries[i].querySelector(".lexcomponentname").innerText;
                let entryInput = entries[i].querySelector(".lextext input");
                entryInput.value = newValue[entryName] ?? "";
                BaseComponent._dispatchEvent(entryInput, "focusout", skipCallback);
            }
        };
        let container = document.createElement('div');
        container.className = "lexformdata";
        container.style.width = "100%";
        container.formData = {};
        this.root.appendChild(container);
        for (let entry in data) {
            let entryData = data[entry];
            if (entryData.constructor != Object) {
                const oldValue = LX.deepCopy(entryData);
                entryData = { value: oldValue };
                data[entry] = entryData;
            }
            entryData.width = "100%";
            entryData.placeholder = entryData.placeholder ?? (entryData.label ?? `Enter ${entry}`);
            entryData.ignoreValidation = true;
            if (!(options.skipLabels ?? false)) {
                const label = new TextInput(null, entryData.label ?? entry, null, { disabled: true, inputClass: "formlabel nobg" });
                container.appendChild(label.root);
            }
            entryData.textComponent = new TextInput(null, entryData.constructor == Object ? entryData.value : entryData, (value, event) => {
                container.formData[entry] = value;
                if (entryData.submit && event.constructor === KeyboardEvent) {
                    primaryButton?.click();
                }
            }, entryData);
            container.appendChild(entryData.textComponent.root);
            container.formData[entry] = entryData.constructor == Object ? entryData.value : entryData;
        }
        const buttonContainer = LX.makeContainer(["100%", "auto"], "flex flex-row mt-2", "", container);
        if (options.secondaryActionName || options.secondaryActionCallback) {
            const secondaryButton = new Button(null, options.secondaryActionName ?? "Cancel", (value, event) => {
                if (options.secondaryActionCallback) {
                    options.secondaryActionCallback(container.formData, event);
                }
            }, { width: "100%", minWidth: "0", buttonClass: options.secondaryButtonClass ?? "primary" });
            buttonContainer.appendChild(secondaryButton.root);
        }
        const primaryButton = new Button(null, options.primaryActionName ?? "Submit", (value, event) => {
            const errors = [];
            for (let entry in data) {
                let entryData = data[entry];
                const pattern = entryData.pattern;
                const matchField = pattern?.fieldMatchName ? container.formData[pattern.fieldMatchName] : undefined;
                if (!entryData.textComponent.valid(undefined, matchField)) {
                    const err = { entry, type: "input_not_valid", messages: [] };
                    if (pattern) {
                        err.messages = LX.validateValueAtPattern(container.formData[entry], pattern, matchField);
                    }
                    errors.push(err);
                }
            }
            if (callback) {
                callback(container.formData, errors, event);
            }
        }, { width: "100%", minWidth: "0", buttonClass: options.primaryButtonClass ?? "contrast" });
        buttonContainer.appendChild(primaryButton.root);
    }
}
LX.Form = Form;

// TextArea.ts @jxarco
/**
 * @class TextArea
 * @description TextArea Component
 */
class TextArea extends BaseComponent {
    constructor(name, value, callback, options = {}) {
        super(ComponentType.TEXTAREA, name, value, options);
        this.onGetValue = () => {
            return value;
        };
        this.onSetValue = (newValue, skipCallback, event) => {
            wValue.value = value = newValue;
            if (!skipCallback) {
                this._trigger(new IEvent(name, newValue, event), callback);
            }
        };
        this.onResize = (rect) => {
            const realNameWidth = (this.root.domName?.style.width ?? "0px");
            container.style.width = options.inputWidth ?? `calc( 100% - ${realNameWidth})`;
        };
        let container = document.createElement("div");
        container.className = "lextextarea";
        container.style.display = "flex";
        this.root.appendChild(container);
        let wValue = document.createElement("textarea");
        wValue.value = value ?? "";
        wValue.className = (options.inputClass ?? "");
        wValue.style.textAlign = options.float ?? "";
        Object.assign(wValue.style, options.style ?? {});
        if (options.fitHeight ?? false) {
            wValue.classList.add("size-content");
        }
        if (!(options.resize ?? true)) {
            wValue.classList.add("resize-none");
        }
        container.appendChild(wValue);
        if (options.disabled ?? false) {
            this.disabled = true;
            wValue.setAttribute("disabled", "true");
        }
        if (options.placeholder) {
            wValue.setAttribute("placeholder", options.placeholder);
        }
        const trigger = options.trigger ?? "default";
        if (trigger == "default") {
            wValue.addEventListener("keyup", function (e) {
                if (e.key == "Enter") {
                    wValue.blur();
                }
            });
            wValue.addEventListener("focusout", (e) => {
                this.set(e.target?.value, false, e);
            });
        }
        else if (trigger == "input") {
            wValue.addEventListener("input", (e) => {
                this.set(e.target?.value, false, e);
            });
        }
        if (options.icon) {
            const icon = LX.makeIcon(options.icon, { iconClass: "absolute z-1 ml-2", svgClass: "sm" });
            container.appendChild(icon);
        }
        LX.doAsync(() => {
            container.style.height = options.height ?? "";
            this.onResize();
        }, 10);
    }
}
LX.TextArea = TextArea;

// Select.ts @jxarco
/**
 * @class Select
 * @description Select Component
 */
class Select extends BaseComponent {
    _lastPlacement = [false, false];
    constructor(name, values, value, callback, options = {}) {
        super(ComponentType.SELECT, name, value, options);
        this.onGetValue = () => {
            return value;
        };
        this.onSetValue = (newValue, skipCallback, event) => {
            value = newValue;
            let item = null;
            const listOptionsNodes = listOptions.childNodes;
            listOptionsNodes.forEach((e) => {
                e.classList.remove("selected");
                if (e.getAttribute("value") == newValue) {
                    item = e;
                }
            });
            console.assert(item, `Item ${newValue} does not exist in the Select.`);
            item.classList.add("selected");
            selectedOption.refresh(value);
            // Reset filter
            if (filter) {
                filter.root.querySelector("input").value = "";
                const filteredOptions = this._filterOptions(values, "");
                list.refresh(filteredOptions);
            }
            // Update suboptions menu
            const suboptions = this.root.querySelector(".lexcustomcontainer");
            const suboptionsFunc = options[`on_${value}`];
            suboptions.toggleAttribute("hidden", !suboptionsFunc);
            if (suboptionsFunc) {
                suboptions.innerHTML = "";
                const suboptionsPanel = new LX.Panel();
                suboptionsPanel.queue(suboptions);
                suboptionsFunc.call(this, suboptionsPanel);
                suboptionsPanel.clearQueue();
            }
            this.root.dataset["opened"] = (!!suboptionsFunc);
            list.style.height = ""; // set auto height by default
            if (!skipCallback) {
                this._trigger(new IEvent(name, value, event), callback);
            }
        };
        this.onResize = (rect) => {
            const realNameWidth = (this.root.domName?.style.width ?? "0px");
            container.style.width = options.inputWidth ?? `calc( 100% - ${realNameWidth})`;
        };
        let container = document.createElement("div");
        container.className = "lexselect";
        this.root.appendChild(container);
        let wValue = document.createElement('div');
        wValue.className = "lexselect lexoption";
        wValue.name = name;
        wValue.iValue = value;
        if (options.overflowContainer !== undefined) {
            options.overflowContainerX = options.overflowContainerY = options.overflowContainer;
        }
        const _placeOptions = (parent, forceLastPlacement) => {
            const selectRoot = selectedOption.root;
            const rect = selectRoot.getBoundingClientRect();
            const nestedDialog = parent.parentElement.closest("dialog") ?? parent.parentElement.closest(".lexcolorpicker");
            // Manage vertical aspect
            {
                const overflowContainer = options.overflowContainerY !== undefined ? options.overflowContainerY : LX.getParentArea(parent);
                const listHeight = parent.offsetHeight;
                let topPosition = rect.y;
                let maxY = window.innerHeight;
                if (overflowContainer) {
                    const parentRect = overflowContainer.getBoundingClientRect();
                    maxY = parentRect.y + parentRect.height;
                }
                if (nestedDialog) {
                    const rect = nestedDialog.getBoundingClientRect();
                    topPosition -= rect.y;
                    maxY -= rect.y;
                }
                parent.style.top = (topPosition + selectRoot.offsetHeight) + 'px';
                list.style.height = ""; // set auto height by default
                const failAbove = forceLastPlacement ? this._lastPlacement[0] : (topPosition - listHeight) < 0;
                const failBelow = forceLastPlacement ? this._lastPlacement[1] : (topPosition + listHeight) > maxY;
                if (failBelow && !failAbove) {
                    parent.style.top = (topPosition - listHeight) + 'px';
                    parent.classList.add("place-above");
                }
                // If does not fit in any direction, put it below but limit height..
                else if (failBelow && failAbove) {
                    list.style.height = `${maxY - topPosition - 32}px`; // 32px margin
                }
                this._lastPlacement = [failAbove, failBelow];
            }
            // Manage horizontal aspect
            {
                const overflowContainer = options.overflowContainerX !== undefined ? options.overflowContainerX : LX.getParentArea(parent);
                const listWidth = parent.offsetWidth;
                let leftPosition = rect.x;
                parent.style.minWidth = (rect.width) + 'px';
                if (nestedDialog) {
                    const rect = nestedDialog.getBoundingClientRect();
                    leftPosition -= rect.x;
                }
                parent.style.left = (leftPosition) + 'px';
                let maxX = window.innerWidth;
                if (overflowContainer) {
                    const parentRect = overflowContainer.getBoundingClientRect();
                    maxX = parentRect.x + parentRect.width;
                }
                const showLeft = (leftPosition + listWidth) > maxX;
                if (showLeft) {
                    parent.style.left = (leftPosition - (listWidth - rect.width)) + 'px';
                }
            }
        };
        let selectedOption = new Button(null, value, (value, event) => {
            if (list.unfocus_event) {
                delete list.unfocus_event;
                return;
            }
            listDialog.classList.remove("place-above");
            const opened = listDialog.hasAttribute("open");
            if (!opened) {
                listDialog.show();
                _placeOptions(listDialog);
            }
            else {
                listDialog.close();
            }
            if (filter) {
                filter.root.querySelector("input").focus();
            }
        }, { buttonClass: "array", skipInlineCount: true, disabled: options.disabled });
        selectedOption.root.style.width = "100%";
        selectedOption.root.querySelector("span").appendChild(LX.makeIcon("Down", { svgClass: "sm" }));
        container.appendChild(selectedOption.root);
        selectedOption.refresh = (v) => {
            const buttonSpan = selectedOption.root.querySelector("span");
            if (buttonSpan.innerText == "") {
                buttonSpan.innerText = v;
            }
            else {
                buttonSpan.innerHTML = buttonSpan.innerHTML.replaceAll(buttonSpan.innerText, v);
            }
        };
        // Add select options container
        const listDialog = document.createElement('dialog');
        listDialog.className = "lexselectoptions";
        let list = document.createElement('ul');
        list.tabIndex = -1;
        list.className = "lexoptions";
        listDialog.appendChild(list);
        list.addEventListener('focusout', function (e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            if (e.relatedTarget === selectedOption.root.querySelector('button')) {
                list.unfocus_event = true;
                setTimeout(() => delete list.unfocus_event, 200);
            }
            else if (e.relatedTarget && listDialog.contains(e.relatedTarget)) {
                return;
            }
            else if (e.target.className == 'lexinput-filter') {
                return;
            }
            listDialog.close();
        });
        // Add filter options
        let filter = null;
        if (options.filter ?? false) {
            const filterOptions = LX.deepCopy(options);
            filterOptions.placeholder = filterOptions.placeholder ?? "Search...";
            filterOptions.skipComponent = filterOptions.skipComponent ?? true;
            filterOptions.trigger = "input";
            filterOptions.icon = "Search";
            filterOptions.className = "lexfilter";
            filterOptions.inputClass = "outline";
            filter = new TextInput(null, options.filterValue ?? "", (v) => {
                const filteredOptions = this._filterOptions(values, v);
                list.refresh(filteredOptions);
                _placeOptions(listDialog, true);
            }, filterOptions);
            filter.root.querySelector(".lextext").style.border = "1px solid transparent";
            const input = filter.root.querySelector("input");
            input.addEventListener('focusout', function (e) {
                if (e.relatedTarget && e.relatedTarget.tagName == "UL" && e.relatedTarget.classList.contains("lexoptions")) {
                    return;
                }
                listDialog.close();
            });
            list.appendChild(filter.root);
        }
        // Create option list to empty it easily..
        const listOptions = document.createElement('span');
        listOptions.className = "lexselectinnerlist";
        list.appendChild(listOptions);
        // Add select options list
        list.refresh = (currentOptions) => {
            // Empty list
            listOptions.innerHTML = "";
            if (!currentOptions.length) {
                let iValue = options.emptyMsg ?? "No options found.";
                let option = document.createElement("div");
                option.className = "option";
                option.innerHTML = (LX.makeIcon("Inbox", { svgClass: "mr-2" }).innerHTML + iValue);
                let li = document.createElement("li");
                li.className = "lexselectitem empty";
                li.appendChild(option);
                listOptions.appendChild(li);
                return;
            }
            for (let i = 0; i < currentOptions.length; i++) {
                let iValue = currentOptions[i];
                let li = document.createElement("li");
                let option = document.createElement("div");
                option.className = "option";
                li.appendChild(option);
                const onSelect = (e) => {
                    this.set(e.currentTarget?.getAttribute("value"), false, e);
                    listDialog.close();
                };
                li.addEventListener("click", onSelect);
                // Add string option
                if (iValue.constructor != Object) {
                    const asLabel = (iValue[0] === '@');
                    if (!asLabel) {
                        option.innerHTML = `<span>${iValue}</span>`;
                        option.appendChild(LX.makeIcon("Check"));
                        option.value = iValue;
                        li.setAttribute("value", iValue);
                        if (iValue == value) {
                            li.classList.add("selected");
                            wValue.innerHTML = iValue;
                        }
                    }
                    else {
                        option.innerHTML = "<span>" + iValue.substr(1) + "</span>";
                        li.removeEventListener("click", onSelect);
                    }
                    li.classList.add(asLabel ? "lexselectlabel" : "lexselectitem");
                }
                else {
                    // Add image option
                    let img = document.createElement("img");
                    img.src = iValue.src;
                    li.setAttribute("value", iValue.value);
                    li.className = "lexlistitem";
                    option.innerText = iValue.value;
                    option.className += " media";
                    option.prepend(img);
                    option.setAttribute("value", iValue.value);
                    option.setAttribute("data-index", i);
                    option.setAttribute("data-src", iValue.src);
                    option.setAttribute("title", iValue.value);
                    if (value == iValue.value) {
                        li.classList.add("selected");
                    }
                }
                listOptions.appendChild(li);
            }
        };
        list.refresh(values);
        container.appendChild(listDialog);
        // Element suboptions
        let suboptions = document.createElement("div");
        suboptions.className = "lexcustomcontainer w-full";
        const suboptionsFunc = options[`on_${value}`];
        suboptions.toggleAttribute("hidden", !suboptionsFunc);
        if (suboptionsFunc) {
            suboptions.innerHTML = "";
            const suboptionsPanel = new LX.Panel();
            suboptionsPanel.queue(suboptions);
            suboptionsFunc.call(this, suboptionsPanel);
            suboptionsPanel.clearQueue();
        }
        this.root.appendChild(suboptions);
        this.root.dataset["opened"] = (!!suboptionsFunc);
        LX.doAsync(this.onResize.bind(this));
    }
    _filterOptions(options, value) {
        // Push to right container
        const emptyFilter = !value.length;
        let filteredOptions = [];
        // Add components
        for (let i = 0; i < options.length; i++) {
            let o = options[i];
            if (!emptyFilter) {
                let toCompare = (typeof o == 'string') ? o : o.value;
                const filterWord = value.toLowerCase();
                const name = toCompare.toLowerCase();
                if (!name.includes(filterWord))
                    continue;
            }
            filteredOptions.push(o);
        }
        return filteredOptions;
    }
}
LX.Select = Select;

// CanvasCurve.ts @jxarco
/**
 * @class CanvasCurve
 * @description A canvas-based curve editor, used internally by the Curve component.
 */
class CanvasCurve {
    element;
    canvas;
    constructor(value, options = {}) {
        let element = document.createElement("div");
        element.className = "curve " + (options.className ? options.className : "");
        element.style.minHeight = "50px";
        element.style.width = options.width || "100%";
        element.style.minWidth = "50px";
        element.style.minHeight = "20px";
        element.bgcolor = options.bgColor || LX.getThemeColor("global-background");
        element.pointscolor = options.pointsColor || LX.getThemeColor("global-color-accent");
        element.activepointscolor = options.activePointsColor || LX.getThemeColor("global-color-accent-light");
        element.linecolor = options.lineColor || "#555";
        element.value = value || [];
        element.xrange = options.xrange || [0, 1]; // min, max
        element.yrange = options.yrange || [0, 1]; // min, max
        element.defaulty = options.defaulty != null ? options.defaulty : 0.0;
        element.no_overlap = options.noOverlap || false;
        element.show_samples = options.showSamples || 0;
        element.allow_add_values = options.allowAddValues ?? true;
        element.draggable_x = options.draggableX ?? true;
        element.draggable_y = options.draggableY ?? true;
        element.smooth = (options.smooth && typeof (options.smooth) == 'number' ? options.smooth : 0.3) || false;
        element.move_out = options.moveOutAction ?? LX.CURVE_MOVEOUT_DELETE;
        LX.addSignal("@on_new_color_scheme", (el, value) => {
            element.bgcolor = options.bgColor || LX.getThemeColor("global-background");
            element.pointscolor = options.pointsColor || LX.getThemeColor("global-color-accent");
            element.activepointscolor = options.activePointsColor || LX.getThemeColor("global-color-accent-light");
            this.redraw();
        });
        this.element = element;
        let canvas = document.createElement("canvas");
        canvas.width = options.width || 200;
        canvas.height = options.height || 50;
        element.appendChild(canvas);
        this.canvas = canvas;
        element.addEventListener("mousedown", onmousedown);
        element.getValueAt = function (x) {
            if (x < element.xrange[0] || x > element.xrange[1]) {
                return element.defaulty;
            }
            let last = [element.xrange[0], element.defaulty];
            let f = 0;
            for (let i = 0; i < element.value.length; i += 1) {
                let v = element.value[i];
                if (x == v[0])
                    return v[1];
                if (x < v[0]) {
                    f = (x - last[0]) / (v[0] - last[0]);
                    return last[1] * (1 - f) + v[1] * f;
                }
                last = v;
            }
            let v = [element.xrange[1], element.defaulty];
            f = (x - last[0]) / (v[0] - last[0]);
            return last[1] * (1 - f) + v[1] * f;
        };
        element.resample = function (samples) {
            let r = [];
            let dx = (element.xrange[1] - element.xrange[0]) / samples;
            for (let i = element.xrange[0]; i <= element.xrange[1]; i += dx) {
                r.push(element.getValueAt(i));
            }
            return r;
        };
        element.addValue = function (v) {
            for (let i = 0; i < element.value; i++) {
                let value = element.value[i];
                if (value[0] < v[0])
                    continue;
                element.value.splice(i, 0, v);
                this.redraw();
                return;
            }
            element.value.push(v);
            this.redraw();
        };
        // Value to canvas
        function convert(v) {
            return [canvas.width * (v[0] - element.xrange[0]) / (element.xrange[1]),
                canvas.height * (v[1] - element.yrange[0]) / (element.yrange[1])];
        }
        // Canvas to value
        function unconvert(v) {
            return [(v[0] * element.xrange[1] / canvas.width + element.xrange[0]),
                (v[1] * element.yrange[1] / canvas.height + element.yrange[0])];
        }
        let selected = -1;
        element.redraw = function (o = {}) {
            if (o.value)
                element.value = o.value;
            if (o.xrange)
                element.xrange = o.xrange;
            if (o.yrange)
                element.yrange = o.yrange;
            if (o.smooth)
                element.smooth = o.smooth;
            var ctx = canvas.getContext("2d");
            if (!ctx)
                return;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.translate(0, canvas.height);
            ctx.scale(1, -1);
            ctx.fillStyle = element.bgcolor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = element.linecolor;
            ctx.beginPath();
            //draw line
            var pos = convert([element.xrange[0], element.defaulty]);
            ctx.moveTo(pos[0], pos[1]);
            let values = [pos[0], pos[1]];
            for (var i in element.value) {
                var value = element.value[i];
                pos = convert(value);
                values.push(pos[0]);
                values.push(pos[1]);
                if (!element.smooth) {
                    ctx.lineTo(pos[0], pos[1]);
                }
            }
            pos = convert([element.xrange[1], element.defaulty]);
            values.push(pos[0]);
            values.push(pos[1]);
            if (!element.smooth) {
                ctx.lineTo(pos[0], pos[1]);
                ctx.stroke();
            }
            else {
                LX.drawSpline(ctx, values, element.smooth);
            }
            // Draw points
            for (var idx = 0; idx < element.value.length; idx += 1) {
                var value = element.value[idx];
                pos = convert(value);
                const selectedIndex = (idx == selected);
                if (selectedIndex) {
                    ctx.fillStyle = element.activepointscolor;
                }
                else {
                    ctx.fillStyle = element.pointscolor;
                }
                ctx.beginPath();
                ctx.arc(pos[0], pos[1], selectedIndex ? 4 : 3, 0, Math.PI * 2);
                ctx.fill();
            }
            if (element.show_samples) {
                var samples = element.resample(element.show_samples);
                ctx.fillStyle = "#888";
                for (var idx = 0; idx < samples.length; idx += 1) {
                    var value = [idx * ((element.xrange[1] - element.xrange[0]) / element.show_samples) + element.xrange[0], samples[idx]];
                    pos = convert(value);
                    ctx.beginPath();
                    ctx.arc(pos[0], pos[1], 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        };
        var last_mouse = [0, 0];
        function onmousedown(e) {
            document.addEventListener("mousemove", onmousemove);
            document.addEventListener("mouseup", onmouseup);
            var rect = canvas.getBoundingClientRect();
            var mousex = e.clientX - rect.left;
            var mousey = e.clientY - rect.top;
            selected = computeSelected(mousex, canvas.height - mousey);
            if (e.button == LX.MOUSE_LEFT_CLICK && selected == -1 && element.allow_add_values) {
                var v = unconvert([mousex, canvas.height - mousey]);
                element.value.push(v);
                sortValues();
                selected = element.value.indexOf(v);
            }
            last_mouse = [mousex, mousey];
            element.redraw();
            e.preventDefault();
            e.stopPropagation();
        }
        function onmousemove(e) {
            var rect = canvas.getBoundingClientRect();
            var mousex = e.clientX - rect.left;
            var mousey = e.clientY - rect.top;
            if (mousex < 0)
                mousex = 0;
            else if (mousex > canvas.width)
                mousex = canvas.width;
            if (mousey < 0)
                mousey = 0;
            else if (mousey > canvas.height)
                mousey = canvas.height;
            // Dragging to remove
            const currentMouseDiff = [e.clientX - rect.left, e.clientY - rect.top];
            if (selected != -1 && distance(currentMouseDiff, [mousex, mousey]) > canvas.height * 0.5) {
                if (element.move_out == LX.CURVE_MOVEOUT_DELETE) {
                    element.value.splice(selected, 1);
                }
                else {
                    const d = [currentMouseDiff[0] - mousex, currentMouseDiff[1] - mousey];
                    let value = element.value[selected];
                    value[0] = (d[0] == 0.0) ? value[0] : (d[0] < 0.0 ? element.xrange[0] : element.xrange[1]);
                    value[1] = (d[1] == 0.0) ? value[1] : (d[1] < 0.0 ? element.yrange[1] : element.yrange[0]);
                }
                onmouseup(e);
                return;
            }
            var dx = element.draggable_x ? last_mouse[0] - mousex : 0;
            var dy = element.draggable_y ? last_mouse[1] - mousey : 0;
            var delta = unconvert([-dx, dy]);
            if (selected != -1) {
                var minx = element.xrange[0];
                var maxx = element.xrange[1];
                if (element.no_overlap) {
                    if (selected > 0)
                        minx = element.value[selected - 1][0];
                    if (selected < (element.value.length - 1))
                        maxx = element.value[selected + 1][0];
                }
                var v = element.value[selected];
                v[0] += delta[0];
                v[1] += delta[1];
                if (v[0] < minx)
                    v[0] = minx;
                else if ([0] > maxx)
                    v[0] = maxx;
                if (v[1] < element.yrange[0])
                    v[1] = element.yrange[0];
                else if (v[1] > element.yrange[1])
                    v[1] = element.yrange[1];
            }
            sortValues();
            element.redraw();
            last_mouse[0] = mousex;
            last_mouse[1] = mousey;
            onchange(e);
            e.preventDefault();
            e.stopPropagation();
        }
        function onmouseup(e) {
            selected = -1;
            element.redraw();
            document.removeEventListener("mousemove", onmousemove);
            document.removeEventListener("mouseup", onmouseup);
            onchange(e);
            e.preventDefault();
            e.stopPropagation();
        }
        function onchange(e) {
            if (options.callback) {
                options.callback.call(element, element.value, e);
            }
        }
        function distance(a, b) { return Math.sqrt(Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2)); }
        function computeSelected(x, y) {
            var minDistance = 100000;
            var maxDistance = 8; //pixels
            var selected = -1;
            for (var i = 0; i < element.value.length; i++) {
                var value = element.value[i];
                var pos = convert(value);
                var dist = distance([x, y], pos);
                if (dist < minDistance && dist < maxDistance) {
                    minDistance = dist;
                    selected = i;
                }
            }
            return selected;
        }
        function sortValues() {
            var v = null;
            if (selected != -1) {
                v = element.value[selected];
            }
            element.value.sort(function (a, b) { return a[0] - b[0]; });
            if (v) {
                selected = element.value.indexOf(v);
            }
        }
        element.redraw();
        return this;
    }
    redraw(options = {}) {
        this.element.redraw(options);
    }
}

// Curve.ts @jxarco
/**
 * @class Curve
 * @description Curve Component
 */
class Curve extends BaseComponent {
    curveInstance;
    constructor(name, values, callback, options = {}) {
        let defaultValues = JSON.parse(JSON.stringify(values));
        super(ComponentType.CURVE, name, defaultValues, options);
        this.onGetValue = () => {
            return JSON.parse(JSON.stringify(curveInstance.element.value));
        };
        this.onSetValue = (newValue, skipCallback, event) => {
            curveInstance.element.value = JSON.parse(JSON.stringify(newValue));
            curveInstance.redraw();
            if (!skipCallback) {
                this._trigger(new IEvent(name, curveInstance.element.value, event), callback);
            }
        };
        this.onResize = (rect) => {
            const realNameWidth = (this.root.domName?.style.width ?? "0px");
            container.style.width = `calc( 100% - ${realNameWidth})`;
        };
        var container = document.createElement("div");
        container.className = "lexcurve";
        this.root.appendChild(container);
        options.callback = (v, e) => {
            this._trigger(new IEvent(name, v, e), callback);
        };
        options.name = name;
        let curveInstance = new CanvasCurve(values, options);
        container.appendChild(curveInstance.element);
        this.curveInstance = curveInstance;
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                curveInstance.canvas.width = entry.contentRect.width;
                curveInstance.redraw();
            }
        });
        observer.observe(container);
        LX.doAsync(this.onResize.bind(this));
    }
}
LX.CanvasCurve = CanvasCurve;
LX.Curve = Curve;

// CanvasDial.ts @jxarco
/**
 * @class CanvasDial
 * @description A canvas-based dial, used internally by the Dial component.
 */
class CanvasDial {
    element;
    canvas;
    constructor(value, options = {}) {
        let element = document.createElement("div");
        element.className = "dial " + (options.className ? options.className : "");
        element.style.width = element.style.height = options.size || "100%";
        element.style.minWidth = element.style.minHeight = "50px";
        element.bgcolor = options.bgColor || LX.getThemeColor("global-background");
        element.pointscolor = options.pointsColor || LX.getThemeColor("global-color-accent-light");
        element.linecolor = options.lineColor || "#555";
        element.value = value || [];
        element.xrange = options.xrange || [0, 1]; // min, max
        element.yrange = options.yrange || [0, 1]; // min, max
        element.defaulty = options.defaulty != null ? options.defaulty : 0.0;
        element.no_overlap = options.noOverlap || false;
        element.show_samples = options.showSamples || 0;
        element.allow_add_values = options.allowAddValues ?? true;
        element.draggable_x = options.draggableX ?? true;
        element.draggable_y = options.draggableY ?? true;
        element.smooth = (options.smooth && typeof (options.smooth) == 'number' ? options.smooth : 0.3) || false;
        element.move_out = options.moveOutAction ?? LX.CURVE_MOVEOUT_DELETE;
        LX.addSignal("@on_new_color_scheme", (el, value) => {
            element.bgcolor = options.bgColor || LX.getThemeColor("global-background");
            element.pointscolor = options.pointsColor || LX.getThemeColor("global-color-accent-light");
            this.redraw();
        });
        this.element = element;
        let canvas = document.createElement("canvas");
        canvas.width = canvas.height = options.size || 200;
        element.appendChild(canvas);
        this.canvas = canvas;
        element.addEventListener("mousedown", onmousedown);
        element.getValueAt = function (x) {
            if (x < element.xrange[0] || x > element.xrange[1]) {
                return element.defaulty;
            }
            var last = [element.xrange[0], element.defaulty];
            var f = 0;
            for (var i = 0; i < element.value.length; i += 1) {
                var v = element.value[i];
                if (x == v[0])
                    return v[1];
                if (x < v[0]) {
                    f = (x - last[0]) / (v[0] - last[0]);
                    return last[1] * (1 - f) + v[1] * f;
                }
                last = v;
            }
            v = [element.xrange[1], element.defaulty];
            f = (x - last[0]) / (v[0] - last[0]);
            return last[1] * (1 - f) + v[1] * f;
        };
        element.resample = function (samples) {
            var r = [];
            var dx = (element.xrange[1] - element.xrange[0]) / samples;
            for (var i = element.xrange[0]; i <= element.xrange[1]; i += dx) {
                r.push(element.getValueAt(i));
            }
            return r;
        };
        element.addValue = function (v) {
            for (var i = 0; i < element.value; i++) {
                var value = element.value[i];
                if (value[0] < v[0])
                    continue;
                element.value.splice(i, 0, v);
                this.redraw();
                return;
            }
            element.value.push(v);
            this.redraw();
        };
        // Value to canvas
        function convert(v) {
            return [canvas.width * (v[0] - element.xrange[0]) / (element.xrange[1]),
                canvas.height * (v[1] - element.yrange[0]) / (element.yrange[1])];
        }
        // Canvas to value
        function unconvert(v) {
            return [(v[0] * element.xrange[1] / canvas.width + element.xrange[0]),
                (v[1] * element.yrange[1] / canvas.height + element.yrange[0])];
        }
        var selected = -1;
        element.redraw = function (o = {}) {
            if (o.value)
                element.value = o.value;
            if (o.xrange)
                element.xrange = o.xrange;
            if (o.yrange)
                element.yrange = o.yrange;
            if (o.smooth)
                element.smooth = o.smooth;
            var ctx = canvas.getContext("2d");
            if (!ctx)
                return;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.translate(0, canvas.height);
            ctx.scale(1, -1);
            ctx.fillStyle = element.bgcolor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = element.linecolor;
            ctx.beginPath();
            //draw line
            var pos = convert([element.xrange[0], element.defaulty]);
            ctx.moveTo(pos[0], pos[1]);
            let values = [pos[0], pos[1]];
            for (var i in element.value) {
                var value = element.value[i];
                pos = convert(value);
                values.push(pos[0]);
                values.push(pos[1]);
            }
            pos = convert([element.xrange[1], element.defaulty]);
            values.push(pos[0]);
            values.push(pos[1]);
            // Draw points
            const center = [0, 0];
            pos = convert(center);
            ctx.fillStyle = "gray";
            ctx.beginPath();
            ctx.arc(pos[0], pos[1], 3, 0, Math.PI * 2);
            ctx.fill();
            for (var idx = 0; idx < element.value.length; idx += 1) {
                var value = element.value[idx];
                pos = convert(value);
                const selectedIndex = (idx == selected);
                if (selectedIndex) {
                    ctx.fillStyle = "white";
                }
                else {
                    ctx.fillStyle = element.pointscolor;
                }
                ctx.beginPath();
                ctx.arc(pos[0], pos[1], selectedIndex ? 4 : 3, 0, Math.PI * 2);
                ctx.fill();
            }
            if (element.show_samples) {
                var samples = element.resample(element.show_samples);
                ctx.fillStyle = "#888";
                for (var idx = 0; idx < samples.length; idx += 1) {
                    var value = [idx * ((element.xrange[1] - element.xrange[0]) / element.show_samples) + element.xrange[0], samples[idx]];
                    pos = convert(value);
                    ctx.beginPath();
                    ctx.arc(pos[0], pos[1], 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        };
        var last_mouse = [0, 0];
        function onmousedown(e) {
            document.addEventListener("mousemove", onmousemove);
            document.addEventListener("mouseup", onmouseup);
            var rect = canvas.getBoundingClientRect();
            var mousex = e.clientX - rect.left;
            var mousey = e.clientY - rect.top;
            selected = computeSelected(mousex, canvas.height - mousey);
            if (e.button == LX.MOUSE_LEFT_CLICK && selected == -1 && element.allow_add_values) {
                var v = unconvert([mousex, canvas.height - mousey]);
                element.value.push(v);
                sortValues();
                selected = element.value.indexOf(v);
            }
            last_mouse = [mousex, mousey];
            element.redraw();
            e.preventDefault();
            e.stopPropagation();
        }
        function onmousemove(e) {
            var rect = canvas.getBoundingClientRect();
            var mousex = e.clientX - rect.left;
            var mousey = e.clientY - rect.top;
            if (mousex < 0)
                mousex = 0;
            else if (mousex > canvas.width)
                mousex = canvas.width;
            if (mousey < 0)
                mousey = 0;
            else if (mousey > canvas.height)
                mousey = canvas.height;
            // Dragging to remove
            const currentMouseDiff = [e.clientX - rect.left, e.clientY - rect.top];
            if (selected != -1 && distance(currentMouseDiff, [mousex, mousey]) > canvas.height * 0.5) {
                if (element.move_out == LX.CURVE_MOVEOUT_DELETE) {
                    element.value.splice(selected, 1);
                }
                else {
                    const d = [currentMouseDiff[0] - mousex, currentMouseDiff[1] - mousey];
                    let value = element.value[selected];
                    value[0] = (d[0] == 0.0) ? value[0] : (d[0] < 0.0 ? element.xrange[0] : element.xrange[1]);
                    value[1] = (d[1] == 0.0) ? value[1] : (d[1] < 0.0 ? element.yrange[1] : element.yrange[0]);
                }
                onmouseup(e);
                return;
            }
            var dx = element.draggable_x ? last_mouse[0] - mousex : 0;
            var dy = element.draggable_y ? last_mouse[1] - mousey : 0;
            var delta = unconvert([-dx, dy]);
            if (selected != -1) {
                var minx = element.xrange[0];
                var maxx = element.xrange[1];
                if (element.no_overlap) {
                    if (selected > 0)
                        minx = element.value[selected - 1][0];
                    if (selected < (element.value.length - 1))
                        maxx = element.value[selected + 1][0];
                }
                var v = element.value[selected];
                v[0] += delta[0];
                v[1] += delta[1];
                if (v[0] < minx)
                    v[0] = minx;
                else if (v[0] > maxx)
                    v[0] = maxx;
                if (v[1] < element.yrange[0])
                    v[1] = element.yrange[0];
                else if (v[1] > element.yrange[1])
                    v[1] = element.yrange[1];
            }
            sortValues();
            element.redraw();
            last_mouse[0] = mousex;
            last_mouse[1] = mousey;
            onchange(e);
            e.preventDefault();
            e.stopPropagation();
        }
        function onmouseup(e) {
            selected = -1;
            element.redraw();
            document.removeEventListener("mousemove", onmousemove);
            document.removeEventListener("mouseup", onmouseup);
            onchange(e);
            e.preventDefault();
            e.stopPropagation();
        }
        function onchange(e) {
            if (options.callback) {
                options.callback.call(element, element.value, e);
            }
        }
        function distance(a, b) { return Math.sqrt(Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2)); }
        function computeSelected(x, y) {
            var minDistance = 100000;
            var maxDistance = 8; //pixels
            var selected = -1;
            for (var i = 0; i < element.value.length; i++) {
                var value = element.value[i];
                var pos = convert(value);
                var dist = distance([x, y], pos);
                if (dist < minDistance && dist < maxDistance) {
                    minDistance = dist;
                    selected = i;
                }
            }
            return selected;
        }
        function sortValues() {
            var v = null;
            if (selected != -1) {
                v = element.value[selected];
            }
            element.value.sort(function (a, b) { return a[0] - b[0]; });
            if (v) {
                selected = element.value.indexOf(v);
            }
        }
        element.redraw();
        return this;
    }
    redraw(options = {}) {
        this.element.redraw(options);
    }
}
LX.CanvasDial = CanvasDial;

// Dial.ts @jxarco
/**
 * @class Dial
 * @description Dial Component
 */
class Dial extends BaseComponent {
    dialInstance;
    constructor(name, values, callback, options = {}) {
        let defaultValues = JSON.parse(JSON.stringify(values));
        super(ComponentType.DIAL, name, defaultValues, options);
        this.onGetValue = () => {
            return JSON.parse(JSON.stringify(dialInstance.element.value));
        };
        this.onSetValue = (newValue, skipCallback, event) => {
            dialInstance.element.value = JSON.parse(JSON.stringify(newValue));
            dialInstance.redraw();
            if (!skipCallback) {
                this._trigger(new IEvent(name, dialInstance.element.value, event), callback);
            }
        };
        this.onResize = (rect) => {
            const realNameWidth = (this.root.domName?.style.width ?? "0px");
            container.style.width = `calc( 100% - ${realNameWidth})`;
            LX.flushCss(container);
            dialInstance.element.style.height = dialInstance.element.offsetWidth + "px";
            dialInstance.canvas.width = dialInstance.element.offsetWidth;
            container.style.width = dialInstance.element.offsetWidth + "px";
            dialInstance.canvas.height = dialInstance.canvas.width;
            dialInstance.redraw();
        };
        var container = document.createElement("div");
        container.className = "lexcurve";
        this.root.appendChild(container);
        options.callback = (v, e) => {
            this._trigger(new IEvent(name, v, e), callback);
        };
        options.name = name;
        let dialInstance = new CanvasDial(values, options);
        container.appendChild(dialInstance.element);
        this.dialInstance = dialInstance;
        LX.doAsync(this.onResize.bind(this));
    }
}
LX.CanvasDial = CanvasDial;
LX.Dial = Dial;

// Layers.ts @jxarco
/**
 * @class Layers
 * @description Layers Component
 */
class Layers extends BaseComponent {
    setLayers;
    constructor(name, value, callback, options = {}) {
        super(ComponentType.LAYERS, name, value, options);
        this.onGetValue = () => {
            return value;
        };
        this.onSetValue = (newValue, skipCallback, event) => {
            value = newValue;
            this.setLayers(value);
            if (!skipCallback) {
                this._trigger(new IEvent(name, value, event), callback);
            }
        };
        this.onResize = (rect) => {
            const realNameWidth = (this.root.domName?.style.width ?? "0px");
            container.style.width = `calc( 100% - ${realNameWidth})`;
        };
        const container = document.createElement("div");
        container.className = "lexlayers";
        this.root.appendChild(container);
        const maxBits = options.maxBits ?? 16;
        this.setLayers = (val) => {
            container.innerHTML = "";
            let binary = val.toString(2);
            let nbits = binary.length;
            // fill zeros
            for (let i = 0; i < (maxBits - nbits); ++i) {
                binary = '0' + binary;
            }
            for (let bit = 0; bit < maxBits; ++bit) {
                let layer = document.createElement("div");
                layer.className = "lexlayer";
                if (val != undefined) {
                    const valueBit = binary[maxBits - bit - 1];
                    if (valueBit != undefined && valueBit == '1') {
                        layer.classList.add("selected");
                    }
                }
                layer.innerText = bit + 1;
                layer.title = "Bit " + bit + ", value " + (1 << bit);
                container.appendChild(layer);
                layer.addEventListener("click", (e) => {
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    e.target.classList.toggle("selected");
                    const newValue = val ^ (1 << bit);
                    this.set(newValue, false, e);
                });
            }
        };
        this.setLayers(value);
        LX.doAsync(this.onResize.bind(this));
    }
}
LX.Layers = Layers;

// NumberInput.ts @jxarco
/**
 * @class NumberInput
 * @description NumberInput Component
 */
class NumberInput extends BaseComponent {
    setLimits;
    constructor(name, value, callback, options = {}) {
        super(ComponentType.NUMBER, name, value, options);
        this.onGetValue = () => {
            return value;
        };
        this.onSetValue = (newValue, skipCallback, event) => {
            if (isNaN(newValue)) {
                return;
            }
            value = LX.clamp(+newValue, +vecinput.min, +vecinput.max);
            vecinput.value = value = LX.round(value, options.precision);
            // Update slider!
            const slider = box.querySelector(".lexinputslider");
            if (slider) {
                slider.value = value;
            }
            if (!skipCallback) {
                this._trigger(new IEvent(name, value, event), callback);
            }
        };
        this.onResize = (rect) => {
            const realNameWidth = (this.root.domName?.style.width ?? "0px");
            container.style.width = options.inputWidth ?? `calc( 100% - ${realNameWidth})`;
        };
        this.setLimits = (newMin, newMax, newStep) => { };
        var container = document.createElement('div');
        container.className = "lexnumber";
        this.root.appendChild(container);
        let box = document.createElement('div');
        box.className = "numberbox";
        container.appendChild(box);
        let valueBox = LX.makeContainer(["auto", "100%"], "relative flex flex-row cursor-text", "", box);
        let vecinput = document.createElement('input');
        vecinput.id = "number_" + LX.guidGenerator();
        vecinput.className = "vecinput";
        vecinput.min = options.min ?? -1e24;
        vecinput.max = options.max ?? 1e24;
        vecinput.step = options.step ?? "any";
        vecinput.type = "number";
        if (value.constructor == Number) {
            value = LX.clamp(value, +vecinput.min, +vecinput.max);
            value = LX.round(value, options.precision);
        }
        vecinput.value = vecinput.iValue = value;
        valueBox.appendChild(vecinput);
        const dragIcon = LX.makeIcon("MoveVertical", { iconClass: "drag-icon hidden-opacity", svgClass: "sm" });
        valueBox.appendChild(dragIcon);
        if (options.units) {
            let unitBox = LX.makeContainer(["auto", "auto"], "px-2 bg-secondary content-center", options.units, valueBox, { "word-break": "keep-all" });
            vecinput.unitBox = unitBox;
        }
        if (options.disabled) {
            this.disabled = vecinput.disabled = true;
        }
        // Add slider below
        if (!options.skipSlider && options.min !== undefined && options.max !== undefined) {
            let sliderBox = LX.makeContainer(["100%", "auto"], "z-1 input-box", "", box);
            let slider = document.createElement('input');
            slider.className = "lexinputslider";
            slider.min = options.min;
            slider.max = options.max;
            slider.step = options.step ?? 1;
            slider.type = "range";
            slider.value = value;
            slider.disabled = this.disabled;
            slider.addEventListener("input", (e) => {
                this.set(slider.valueAsNumber, false, e);
            }, false);
            slider.addEventListener("mousedown", function (e) {
                if (options.onPress) {
                    options.onPress.bind(slider)(e, slider);
                }
            }, false);
            slider.addEventListener("mouseup", function (e) {
                if (options.onRelease) {
                    options.onRelease.bind(slider)(e, slider);
                }
            }, false);
            sliderBox.appendChild(slider);
            // Method to change min, max, step parameters
            this.setLimits = (newMin, newMax, newStep) => {
                vecinput.min = slider.min = newMin ?? vecinput.min;
                vecinput.max = slider.max = newMax ?? vecinput.max;
                vecinput.step = newStep ?? vecinput.step;
                slider.step = newStep ?? slider.step;
                this.set(value, true);
            };
        }
        vecinput.addEventListener("input", function (e) {
            value = +vecinput.valueAsNumber;
            value = LX.round(value, options.precision);
        }, false);
        vecinput.addEventListener("wheel", (e) => {
            e.preventDefault();
            if (vecinput !== document.activeElement) {
                return;
            }
            let mult = options.step ?? 1;
            if (e.shiftKey)
                mult *= 10;
            else if (e.altKey)
                mult *= 0.1;
            value = (+vecinput.valueAsNumber - mult * (e.deltaY > 0 ? 1 : -1));
            this.set(value, false, e);
        }, { passive: false });
        vecinput.addEventListener("change", (e) => {
            this.set(vecinput.valueAsNumber, false, e);
        }, { passive: false });
        // Add drag input
        var that = this;
        let innerMouseDown = (e) => {
            if ((document.activeElement == vecinput) || (e.button != LX.MOUSE_LEFT_CLICK)) {
                return;
            }
            var doc = that.root.ownerDocument;
            doc.addEventListener('mousemove', innerMouseMove);
            doc.addEventListener('mouseup', innerMouseUp);
            document.body.classList.add('noevents');
            dragIcon.classList.remove('hidden-opacity');
            e.stopImmediatePropagation();
            e.stopPropagation();
            if (!document.pointerLockElement) {
                valueBox.requestPointerLock();
            }
            if (options.onPress) {
                options.onPress.bind(vecinput)(e, vecinput);
            }
        };
        let innerMouseMove = (e) => {
            let dt = -e.movementY;
            if (dt != 0) {
                let mult = options.step ?? 1;
                if (e.shiftKey)
                    mult *= 10;
                else if (e.altKey)
                    mult *= 0.1;
                value = (+vecinput.valueAsNumber + mult * dt);
                this.set(value, false, e);
            }
            e.stopPropagation();
            e.preventDefault();
        };
        let innerMouseUp = (e) => {
            var doc = that.root.ownerDocument;
            doc.removeEventListener('mousemove', innerMouseMove);
            doc.removeEventListener('mouseup', innerMouseUp);
            document.body.classList.remove('noevents');
            dragIcon.classList.add('hidden-opacity');
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
            if (options.onRelease) {
                options.onRelease.bind(vecinput)(e, vecinput);
            }
        };
        valueBox.addEventListener("mousedown", innerMouseDown);
        LX.doAsync(this.onResize.bind(this));
    }
}
LX.NumberInput = NumberInput;

// ArrayInput.ts @jxarco
/**
 * @class ArrayInput
 * @description ArrayInput Component
 */
class ArrayInput extends BaseComponent {
    _updateItems;
    constructor(name, values = [], callback, options = {}) {
        options.nameWidth = "100%";
        super(ComponentType.ARRAY, name, null, options);
        this.onGetValue = () => {
            return values;
        };
        this.onSetValue = (newValue, skipCallback, event) => {
            values = newValue;
            this._updateItems();
            if (!skipCallback) {
                this._trigger(new IEvent(name, values, event), callback);
            }
        };
        // Add open array button
        let container = document.createElement("div");
        container.className = "lexarray";
        container.style.width = "100%";
        this.root.appendChild(container);
        this.root.dataset["opened"] = false;
        let buttonName = `Array (size ${values.length})`;
        const toggleButton = new Button(null, buttonName, () => {
            this.root.dataset["opened"] = this.root.dataset["opened"] == "true" ? false : true;
            this.root.querySelector(".lexarrayitems").toggleAttribute("hidden");
        }, { buttonClass: "array" });
        toggleButton.root.querySelector("span").appendChild(LX.makeIcon("Down", { svgClass: "sm" }));
        container.appendChild(toggleButton.root);
        // Show elements
        let arrayItems = document.createElement("div");
        arrayItems.className = "lexarrayitems";
        arrayItems.toggleAttribute("hidden", true);
        this.root.appendChild(arrayItems);
        this._updateItems = () => {
            // Update num items
            let buttonSpan = this.root.querySelector(".lexbutton.array span");
            for (let node of buttonSpan.childNodes) {
                if (node.nodeType === Node.TEXT_NODE) {
                    node.textContent = `Array (size ${values.length})`;
                    break;
                }
            }
            // Update inputs
            arrayItems.innerHTML = "";
            for (let i = 0; i < values.length; ++i) {
                const value = values[i];
                let baseclass = options.innerValues ? 'select' : value.constructor;
                let component = null;
                switch (baseclass) {
                    case String:
                        component = new TextInput(i + "", value, function (value) {
                            values[i] = value;
                            callback(values);
                        }, { nameWidth: "12px", className: "p-0", skipReset: true });
                        break;
                    case Number:
                        component = new NumberInput(i + "", value, function (value) {
                            values[i] = value;
                            callback(values);
                        }, { nameWidth: "12px", className: "p-0", skipReset: true });
                        break;
                    case 'select':
                        component = new Select(i + "", options.innerValues, value, function (value) {
                            values[i] = value;
                            callback(values);
                        }, { nameWidth: "12px", className: "p-0", skipReset: true });
                        break;
                }
                console.assert(component, `Value of type ${baseclass} cannot be modified in ArrayInput`);
                arrayItems.appendChild(component.root);
                const removeComponent = new Button(null, "", (v, event) => {
                    values.splice(values.indexOf(value), 1);
                    this._updateItems();
                    this._trigger(new IEvent(name, values, event), callback);
                }, { title: "Remove item", icon: "Trash3" });
                component.root.appendChild(removeComponent.root);
            }
            const addButton = new Button(null, LX.makeIcon("Plus", { svgClass: "sm" }).innerHTML + "Add item", (v, event) => {
                values.push(options.innerValues ? options.innerValues[0] : "");
                this._updateItems();
                this._trigger(new IEvent(name, values, event), callback);
            }, { buttonClass: 'array' });
            arrayItems.appendChild(addButton.root);
        };
        this._updateItems();
    }
}
LX.ArrayInput = ArrayInput;

// List.ts @jxarco
/**
 * @class List
 * @description List Component
 */
class List extends BaseComponent {
    _updateValues;
    constructor(name, values, value, callback, options = {}) {
        super(ComponentType.LIST, name, value, options);
        this.onGetValue = () => {
            return value;
        };
        this.onSetValue = (newValue, skipCallback, event) => {
            listContainer.querySelectorAll('.lexlistitem').forEach(e => e.classList.remove('selected'));
            let idx = null;
            for (let i = 0; i < values.length; ++i) {
                const v = values[i];
                if (v == newValue || ((v.constructor == Array) && (v[0] == newValue))) {
                    idx = i;
                    break;
                }
            }
            if (!idx) {
                console.error(`Cannot find item ${newValue} in List.`);
                return;
            }
            listContainer.children[idx].classList.toggle('selected');
            value = newValue;
            if (!skipCallback) {
                this._trigger(new IEvent(name, newValue, event), callback);
            }
        };
        this.onResize = (rect) => {
            const realNameWidth = (this.root.domName?.style.width ?? "0px");
            listContainer.style.width = `calc( 100% - ${realNameWidth})`;
        };
        this._updateValues = (newValues) => {
            values = newValues;
            listContainer.innerHTML = "";
            for (let i = 0; i < values.length; ++i) {
                let icon = null;
                let itemValue = values[i];
                if (itemValue.constructor === Array) {
                    icon = itemValue[1];
                    itemValue = itemValue[0];
                }
                let listElement = document.createElement('div');
                listElement.className = "lexlistitem" + (value == itemValue ? " selected" : "");
                if (icon) {
                    listElement.appendChild(LX.makeIcon(icon));
                }
                listElement.innerHTML += `<span>${itemValue}</span>`;
                listElement.addEventListener('click', e => {
                    listContainer.querySelectorAll('.lexlistitem').forEach(e => e.classList.remove('selected'));
                    listElement.classList.toggle('selected');
                    value = itemValue;
                    this._trigger(new IEvent(name, itemValue, e), callback);
                });
                listContainer.appendChild(listElement);
            }
        };
        // Show list
        let listContainer = document.createElement('div');
        listContainer.className = "lexlist";
        this.root.appendChild(listContainer);
        this._updateValues(values);
        LX.doAsync(this.onResize.bind(this));
    }
}
LX.List = List;

// Tags.ts @jxarco
/**
 * @class Tags
 * @description Tags Component
 */
class Tags extends BaseComponent {
    generateTags;
    constructor(name, value, callback, options = {}) {
        let arrayValue = value.replace(/\s/g, '').split(',');
        let defaultValue = LX.deepCopy(arrayValue);
        super(ComponentType.TAGS, name, defaultValue, options);
        this.onGetValue = () => {
            return LX.deepCopy(value);
        };
        this.onSetValue = (newValue, skipCallback, event) => {
            arrayValue = [].concat(newValue);
            this.generateTags(arrayValue);
            if (!skipCallback) {
                this._trigger(new IEvent(name, arrayValue, event), callback);
            }
        };
        this.onResize = (rect) => {
            const realNameWidth = (this.root.domName?.style.width ?? "0px");
            tagsContainer.style.width = `calc( 100% - ${realNameWidth})`;
        };
        // Show tags
        const tagsContainer = document.createElement('div');
        tagsContainer.className = "lextags";
        this.root.appendChild(tagsContainer);
        this.generateTags = (value) => {
            tagsContainer.innerHTML = "";
            for (let i = 0; i < value.length; ++i) {
                const tagName = value[i];
                const tag = document.createElement('span');
                tag.className = "lextag";
                tag.innerHTML = tagName;
                const removeButton = LX.makeIcon("X", { svgClass: "sm" });
                tag.appendChild(removeButton);
                removeButton.addEventListener('click', (e) => {
                    tag.remove();
                    value.splice(value.indexOf(tagName), 1);
                    this.set(value, false, e);
                });
                tagsContainer.appendChild(tag);
            }
            let tagInput = document.createElement('input');
            tagInput.value = "";
            tagInput.placeholder = "Add tag...";
            tagsContainer.appendChild(tagInput);
            tagInput.onkeydown = e => {
                const val = tagInput.value.replace(/\s/g, '');
                if (e.key == ' ' || e.key == 'Enter') {
                    e.preventDefault();
                    if (!val.length || value.indexOf(val) > -1)
                        return;
                    value.push(val);
                    this.set(value, false, e);
                }
            };
            tagInput.focus();
        };
        this.generateTags(arrayValue);
        LX.doAsync(this.onResize.bind(this));
    }
}
LX.Tags = Tags;

// Checkbox.ts @jxarco
/**
 * @class Checkbox
 * @description Checkbox Component
 */
class Checkbox extends BaseComponent {
    constructor(name, value, callback, options = {}) {
        if (!name && !options.label) {
            throw ("Set Component Name or at least a label!");
        }
        super(ComponentType.CHECKBOX, name, value, options);
        this.onGetValue = () => {
            return value;
        };
        this.onSetValue = (newValue, skipCallback, event) => {
            if (newValue == value) {
                return;
            }
            checkbox.checked = value = newValue;
            // Update suboptions menu
            this.root.querySelector(".lexcheckboxsubmenu")?.toggleAttribute('hidden', !newValue);
            if (!skipCallback) {
                this._trigger(new IEvent(name, newValue, event), callback);
            }
        };
        this.onResize = (rect) => {
            const realNameWidth = (this.root.domName?.style.width ?? "0px");
            container.style.width = options.inputWidth ?? `calc( 100% - ${realNameWidth})`;
        };
        var container = document.createElement("div");
        container.className = "lexcheckboxcont";
        this.root.appendChild(container);
        let checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "lexcheckbox " + (options.className ?? "primary");
        checkbox.checked = value;
        checkbox.disabled = options.disabled ?? false;
        container.appendChild(checkbox);
        let valueName = document.createElement("span");
        valueName.className = "checkboxtext";
        valueName.innerHTML = options.label ?? "On";
        container.appendChild(valueName);
        checkbox.addEventListener("change", e => {
            this.set(checkbox.checked, false, e);
        });
        if (options.suboptions) {
            let suboptions = document.createElement("div");
            suboptions.className = "lexcheckboxsubmenu";
            suboptions.toggleAttribute("hidden", !checkbox.checked);
            const suboptionsPanel = new LX.Panel();
            suboptionsPanel.queue(suboptions);
            options.suboptions.call(this, suboptionsPanel);
            suboptionsPanel.clearQueue();
            this.root.appendChild(suboptions);
        }
        LX.doAsync(this.onResize.bind(this));
    }
}
LX.Checkbox = Checkbox;

// Toggle.ts @jxarco
/**
 * @class Toggle
 * @description Toggle Component
 */
class Toggle extends BaseComponent {
    constructor(name, value, callback, options = {}) {
        if (!name && !options.label) {
            throw ("Set Component Name or at least a label!");
        }
        super(ComponentType.TOGGLE, name, value, options);
        this.onGetValue = () => {
            return toggle.checked;
        };
        this.onSetValue = (newValue, skipCallback, event) => {
            if (newValue == value) {
                return;
            }
            toggle.checked = value = newValue;
            // Update suboptions menu
            this.root.querySelector(".lextogglesubmenu")?.toggleAttribute('hidden', !newValue);
            if (!skipCallback) {
                this._trigger(new IEvent(name, newValue, event), callback);
            }
        };
        this.onResize = (rect) => {
            const realNameWidth = (this.root.domName?.style.width ?? "0px");
            container.style.width = options.inputWidth ?? `calc( 100% - ${realNameWidth})`;
        };
        var container = document.createElement('div');
        container.className = "lextogglecont";
        this.root.appendChild(container);
        let toggle = document.createElement('input');
        toggle.type = "checkbox";
        toggle.className = "lextoggle " + (options.className ?? "");
        toggle.checked = value;
        toggle.iValue = value;
        toggle.disabled = options.disabled ?? false;
        container.appendChild(toggle);
        let valueName = document.createElement('span');
        valueName.className = "toggletext";
        valueName.innerHTML = options.label ?? "On";
        container.appendChild(valueName);
        toggle.addEventListener("change", (e) => {
            this.set(toggle.checked, false, e);
        });
        if (options.suboptions) {
            let suboptions = document.createElement('div');
            suboptions.className = "lextogglesubmenu";
            suboptions.toggleAttribute('hidden', !toggle.checked);
            const suboptionsPanel = new LX.Panel();
            suboptionsPanel.queue(suboptions);
            options.suboptions.call(this, suboptionsPanel);
            suboptionsPanel.clearQueue();
            this.root.appendChild(suboptions);
        }
        LX.doAsync(this.onResize.bind(this));
    }
}
LX.Toggle = Toggle;

// RadioGroup.ts @jxarco
/**
 * @class RadioGroup
 * @description RadioGroup Component
 */
class RadioGroup extends BaseComponent {
    constructor(name, label, values, callback, options = {}) {
        super(ComponentType.RADIO, name, null, options);
        let currentIndex = null;
        this.onGetValue = () => {
            const items = container.querySelectorAll('button');
            return currentIndex ? [currentIndex, items[currentIndex]] : undefined;
        };
        this.onSetValue = (newValue, skipCallback, event) => {
            newValue = newValue[0] ?? newValue; // Allow getting index of { index, value } tupple
            console.assert(newValue.constructor == Number, "RadioGroup _value_ must be an Array index!");
            const items = container.querySelectorAll('button');
            items.forEach((b) => { b.checked = false; b.classList.remove("checked"); });
            const optionItem = items[newValue];
            optionItem.checked = !optionItem.checked;
            optionItem.classList.toggle("checked");
            if (!skipCallback) {
                this._trigger(new IEvent(null, [newValue, values[newValue]], event), callback);
            }
        };
        var container = document.createElement('div');
        container.className = "lexradiogroup " + (options.className ?? "");
        this.root.appendChild(container);
        let labelSpan = document.createElement('span');
        labelSpan.innerHTML = label;
        container.appendChild(labelSpan);
        for (let i = 0; i < values.length; ++i) {
            const optionItem = document.createElement('div');
            optionItem.className = "lexradiogroupitem";
            container.appendChild(optionItem);
            const optionButton = document.createElement('button');
            optionButton.className = "flex p-0 rounded-lg cursor-pointer";
            optionButton.disabled = options.disabled ?? false;
            optionItem.appendChild(optionButton);
            optionButton.addEventListener("click", (e) => {
                this.set(i, false, e);
            });
            const checkedSpan = document.createElement('span');
            optionButton.appendChild(checkedSpan);
            const optionLabel = document.createElement('span');
            optionLabel.innerHTML = values[i];
            optionItem.appendChild(optionLabel);
        }
        if (options.selected) {
            console.assert(options.selected.constructor == Number, "RadioGroup _selected_ must be an Array index!");
            currentIndex = options.selected;
            this.set(currentIndex, true);
        }
    }
}
LX.RadioGroup = RadioGroup;

// Color.js @jxarco
class Color {
    _rgb;
    _hex = "#000000";
    _hsv;
    css;
    get rgb() { return this._rgb; }
    set rgb(v) { this._fromRGB(v); }
    get hex() { return this._hex; }
    set hex(v) { this._fromHex(v); }
    get hsv() { return this._hsv; }
    set hsv(v) { this._fromHSV(v); }
    constructor(value) {
        this.set(value);
    }
    set(value) {
        if (typeof value === 'string' && value.startsWith('#')) {
            this._fromHex(value);
        }
        else if ('r' in value && 'g' in value && 'b' in value) {
            value.a = value.a ?? 1.0;
            this._fromRGB(value);
        }
        else if ('h' in value && 's' in value && 'v' in value) {
            value.a = value.a ?? 1.0;
            this._fromHSV(value);
        }
        else {
            throw ("Bad color model!");
        }
    }
    setHSV(hsv) { this._fromHSV(hsv); }
    setRGB(rgb) { this._fromRGB(rgb); }
    setHex(hex) { this._fromHex(hex); }
    _fromHex(hex) {
        this._fromRGB(LX.hexToRgb(hex));
    }
    _fromRGB(rgb) {
        this._rgb = rgb;
        this._hsv = LX.rgbToHsv(rgb);
        this._hex = LX.rgbToHex(rgb);
        this.css = LX.rgbToCss(this._rgb);
    }
    _fromHSV(hsv) {
        this._hsv = hsv;
        this._rgb = LX.hsvToRgb(hsv);
        this._hex = LX.rgbToHex(this._rgb);
        this.css = LX.rgbToCss(this._rgb);
    }
}
LX.Color = Color;

// ColorPicker.ts @jxarco
/**
 * @class ColorPicker
 */
class ColorPicker {
    static currentPicker = false;
    root;
    colorModel;
    useAlpha;
    callback;
    markerHalfSize;
    markerSize;
    currentColor;
    labelComponent;
    colorPickerBackground;
    intSatMarker;
    colorPickerTracker;
    alphaTracker;
    hueMarker;
    alphaMarker;
    onPopover;
    constructor(hexValue, options = {}) {
        this.colorModel = options.colorModel ?? "Hex";
        this.useAlpha = options.useAlpha ?? false;
        this.callback = options.onChange;
        if (!this.callback) {
            console.warn("Define a callback in _options.onChange_ to allow getting new Color values!");
        }
        this.root = document.createElement("div");
        this.root.className = "lexcolorpicker";
        this.markerHalfSize = 8;
        this.markerSize = this.markerHalfSize * 2;
        this.currentColor = new Color(hexValue);
        const hueColor = new Color({ h: this.currentColor.hsv.h, s: 1, v: 1 });
        // Intensity, Sat
        this.colorPickerBackground = document.createElement('div');
        this.colorPickerBackground.className = "lexcolorpickerbg";
        this.colorPickerBackground.style.backgroundColor = `rgb(${hueColor.css.r}, ${hueColor.css.g}, ${hueColor.css.b})`;
        this.root.appendChild(this.colorPickerBackground);
        this.intSatMarker = document.createElement('div');
        this.intSatMarker.className = "lexcolormarker";
        this.intSatMarker.style.backgroundColor = this.currentColor.hex;
        this.colorPickerBackground.appendChild(this.intSatMarker);
        let pickerRect = null;
        let innerMouseDown = (e) => {
            var doc = this.root.ownerDocument;
            doc.addEventListener('mousemove', innerMouseMove);
            doc.addEventListener('mouseup', innerMouseUp);
            document.body.classList.add('noevents');
            e.stopImmediatePropagation();
            e.stopPropagation();
            const currentLeft = (e.offsetX - this.markerHalfSize);
            this.intSatMarker.style.left = currentLeft + "px";
            const currentTop = (e.offsetY - this.markerHalfSize);
            this.intSatMarker.style.top = currentTop + "px";
            this._positionToSv(currentLeft, currentTop);
            this._updateColorValue();
            pickerRect = this.colorPickerBackground.getBoundingClientRect();
        };
        let innerMouseMove = (e) => {
            const dX = e.movementX;
            const dY = e.movementY;
            const mouseX = e.x - pickerRect.x;
            const mouseY = e.y - pickerRect.y;
            if (dX != 0 && (mouseX >= 0 || dX < 0) && (mouseX < this.colorPickerBackground.offsetWidth || dX > 0)) {
                this.intSatMarker.style.left = LX.clamp(parseInt(this.intSatMarker.style.left) + dX, -this.markerHalfSize, this.colorPickerBackground.offsetWidth - this.markerHalfSize) + "px";
            }
            if (dY != 0 && (mouseY >= 0 || dY < 0) && (mouseY < this.colorPickerBackground.offsetHeight || dY > 0)) {
                this.intSatMarker.style.top = LX.clamp(parseInt(this.intSatMarker.style.top) + dY, -this.markerHalfSize, this.colorPickerBackground.offsetHeight - this.markerHalfSize) + "px";
            }
            this._positionToSv(parseInt(this.intSatMarker.style.left), parseInt(this.intSatMarker.style.top));
            this._updateColorValue();
            e.stopPropagation();
            e.preventDefault();
        };
        let innerMouseUp = (e) => {
            var doc = this.root.ownerDocument;
            doc.removeEventListener('mousemove', innerMouseMove);
            doc.removeEventListener('mouseup', innerMouseUp);
            document.body.classList.remove('noevents');
        };
        this.colorPickerBackground.addEventListener("mousedown", innerMouseDown);
        const hueAlphaContainer = LX.makeContainer(["100%", "auto"], "flex flex-row gap-1 items-center", "", this.root);
        const EyeDropper = window.EyeDropper;
        if (EyeDropper) {
            hueAlphaContainer.appendChild(new Button(null, "eyedrop", async () => {
                const eyeDropper = new EyeDropper();
                try {
                    const result = await eyeDropper.open();
                    this.fromHexColor(result.sRGBHex);
                }
                catch (err) {
                    // console.error("EyeDropper cancelled or failed: ", err)
                }
            }, { icon: "Pipette", buttonClass: "bg-none", title: "Sample Color" }).root);
        }
        const innerHueAlpha = LX.makeContainer(["100%", "100%"], "flex flex-col gap-2", "", hueAlphaContainer);
        // Hue
        this.colorPickerTracker = document.createElement('div');
        this.colorPickerTracker.className = "lexhuetracker";
        innerHueAlpha.appendChild(this.colorPickerTracker);
        this.hueMarker = document.createElement('div');
        this.hueMarker.className = "lexcolormarker";
        this.hueMarker.style.backgroundColor = `rgb(${hueColor.css.r}, ${hueColor.css.g}, ${hueColor.css.b})`;
        this.colorPickerTracker.appendChild(this.hueMarker);
        const _fromHueX = (hueX) => {
            this.hueMarker.style.left = hueX + "px";
            this.currentColor.hsv.h = LX.remapRange(hueX, 0, this.colorPickerTracker.offsetWidth - this.markerSize, 0, 360);
            const hueColor = new Color({ h: this.currentColor.hsv.h, s: 1, v: 1 });
            this.hueMarker.style.backgroundColor = `rgb(${hueColor.css.r}, ${hueColor.css.g}, ${hueColor.css.b})`;
            this.colorPickerBackground.style.backgroundColor = `rgb(${hueColor.css.r}, ${hueColor.css.g}, ${hueColor.css.b})`;
            this._updateColorValue();
        };
        let hueTrackerRect = null;
        let innerMouseDownHue = (e) => {
            const doc = this.root.ownerDocument;
            doc.addEventListener('mousemove', innerMouseMoveHue);
            doc.addEventListener('mouseup', innerMouseUpHue);
            document.body.classList.add('noevents');
            e.stopImmediatePropagation();
            e.stopPropagation();
            const hueX = LX.clamp(e.offsetX - this.markerHalfSize, 0, this.colorPickerTracker.offsetWidth - this.markerSize);
            _fromHueX(hueX);
            hueTrackerRect = this.colorPickerTracker.getBoundingClientRect();
        };
        let innerMouseMoveHue = (e) => {
            const dX = e.movementX;
            const mouseX = e.x - hueTrackerRect.x;
            if (dX != 0 && (mouseX >= this.markerHalfSize || dX < 0) && (mouseX < (this.colorPickerTracker.offsetWidth - this.markerHalfSize) || dX > 0)) {
                const hueX = LX.clamp(parseInt(this.hueMarker.style.left) + dX, 0, this.colorPickerTracker.offsetWidth - this.markerSize);
                _fromHueX(hueX);
            }
            e.stopPropagation();
            e.preventDefault();
        };
        let innerMouseUpHue = (e) => {
            var doc = this.root.ownerDocument;
            doc.removeEventListener('mousemove', innerMouseMoveHue);
            doc.removeEventListener('mouseup', innerMouseUpHue);
            document.body.classList.remove('noevents');
        };
        this.colorPickerTracker.addEventListener("mousedown", innerMouseDownHue);
        // Alpha
        if (this.useAlpha) {
            this.alphaTracker = document.createElement('div');
            this.alphaTracker.className = "lexalphatracker";
            this.alphaTracker.style.color = `rgb(${this.currentColor.css.r}, ${this.currentColor.css.g}, ${this.currentColor.css.b})`;
            innerHueAlpha.appendChild(this.alphaTracker);
            this.alphaMarker = document.createElement('div');
            this.alphaMarker.className = "lexcolormarker";
            this.alphaMarker.style.backgroundColor = `rgb(${this.currentColor.css.r}, ${this.currentColor.css.g}, ${this.currentColor.css.b},${this.currentColor.css.a})`;
            this.alphaTracker.appendChild(this.alphaMarker);
            const _fromAlphaX = (alphaX) => {
                this.alphaMarker.style.left = alphaX + "px";
                this.currentColor.hsv.a = LX.remapRange(alphaX, 0, this.alphaTracker.offsetWidth - this.markerSize, 0, 1);
                this._updateColorValue();
                // Update alpha marker once the color is updated
                this.alphaMarker.style.backgroundColor = `rgb(${this.currentColor.css.r}, ${this.currentColor.css.g}, ${this.currentColor.css.b},${this.currentColor.css.a})`;
            };
            let alphaTrackerRect = null;
            let innerMouseDownAlpha = (e) => {
                const doc = this.root.ownerDocument;
                doc.addEventListener('mousemove', innerMouseMoveAlpha);
                doc.addEventListener('mouseup', innerMouseUpAlpha);
                document.body.classList.add('noevents');
                e.stopImmediatePropagation();
                e.stopPropagation();
                const alphaX = LX.clamp(e.offsetX - this.markerHalfSize, 0, this.alphaTracker.offsetWidth - this.markerSize);
                _fromAlphaX(alphaX);
                alphaTrackerRect = this.alphaTracker.getBoundingClientRect();
            };
            let innerMouseMoveAlpha = (e) => {
                const dX = e.movementX;
                const mouseX = e.x - alphaTrackerRect.x;
                if (dX != 0 && (mouseX >= this.markerHalfSize || dX < 0) && (mouseX < (this.alphaTracker.offsetWidth - this.markerHalfSize) || dX > 0)) {
                    const alphaX = LX.clamp(parseInt(this.alphaMarker.style.left) + dX, 0, this.alphaTracker.offsetWidth - this.markerSize);
                    _fromAlphaX(alphaX);
                }
                e.stopPropagation();
                e.preventDefault();
            };
            let innerMouseUpAlpha = (e) => {
                var doc = this.root.ownerDocument;
                doc.removeEventListener('mousemove', innerMouseMoveAlpha);
                doc.removeEventListener('mouseup', innerMouseUpAlpha);
                document.body.classList.remove('noevents');
            };
            this.alphaTracker.addEventListener("mousedown", innerMouseDownAlpha);
        }
        // Info display
        const colorLabel = LX.makeContainer(["100%", "auto"], "flex flex-row gap-1", "", this.root);
        colorLabel.appendChild(new Select(null, ["CSS", "Hex", "HSV", "RGB"], this.colorModel, (v) => {
            this.colorModel = v;
            this._updateColorValue(null, true);
        }).root);
        this.labelComponent = new TextInput(null, "", null, { inputClass: "bg-none", fit: true, disabled: true });
        colorLabel.appendChild(this.labelComponent.root);
        // Copy button
        {
            const copyButtonComponent = new Button(null, "copy", async () => {
                navigator.clipboard.writeText(this.labelComponent.value());
                copyButtonComponent.root.querySelector("input[type='checkbox']").style.pointerEvents = "none";
                LX.doAsync(() => {
                    if (copyButtonComponent.swap)
                        copyButtonComponent.swap(true);
                    copyButtonComponent.root.querySelector("input[type='checkbox']").style.pointerEvents = "auto";
                }, 3000);
            }, { swap: "Check", icon: "Copy", buttonClass: "bg-none", className: "ml-auto", title: "Copy" });
            copyButtonComponent.root.querySelector(".swap-on svg").classList.add("fg-success");
            colorLabel.appendChild(copyButtonComponent.root);
        }
        this._updateColorValue(hexValue, true);
        LX.doAsync(this._placeMarkers.bind(this));
        this.onPopover = this._placeMarkers.bind(this);
    }
    _placeMarkers() {
        this._svToPosition(this.currentColor.hsv.s, this.currentColor.hsv.v);
        const hueLeft = LX.remapRange(this.currentColor.hsv.h, 0, 360, 0, this.colorPickerTracker.offsetWidth - this.markerSize);
        this.hueMarker.style.left = hueLeft + "px";
        if (this.useAlpha) {
            const alphaLeft = LX.remapRange(this.currentColor.hsv.a, 0, 1, 0, this.alphaTracker.offsetWidth - this.markerSize);
            this.alphaMarker.style.left = alphaLeft + "px";
        }
    }
    _svToPosition(s, v) {
        this.intSatMarker.style.left = `${LX.remapRange(s, 0, 1, -this.markerHalfSize, this.colorPickerBackground.offsetWidth - this.markerHalfSize)}px`;
        this.intSatMarker.style.top = `${LX.remapRange(1 - v, 0, 1, -this.markerHalfSize, this.colorPickerBackground.offsetHeight - this.markerHalfSize)}px`;
    }
    _positionToSv(left, top) {
        this.currentColor.hsv.s = LX.remapRange(left, -this.markerHalfSize, this.colorPickerBackground.offsetWidth - this.markerHalfSize, 0, 1);
        this.currentColor.hsv.v = 1 - LX.remapRange(top, -this.markerHalfSize, this.colorPickerBackground.offsetHeight - this.markerHalfSize, 0, 1);
    }
    _updateColorValue(newHexValue, skipCallback = false) {
        this.currentColor.set(newHexValue ?? this.currentColor.hsv);
        if (this.callback && !skipCallback) {
            this.callback(this.currentColor);
        }
        this.intSatMarker.style.backgroundColor = this.currentColor.hex;
        if (this.useAlpha) {
            this.alphaTracker.style.color = `rgb(${this.currentColor.css.r}, ${this.currentColor.css.g}, ${this.currentColor.css.b})`;
        }
        const toFixed = (s, n = 2) => { return s.toFixed(n).replace(/([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, '$1'); };
        if (this.colorModel == "CSS") {
            const { r, g, b, a } = this.currentColor.css;
            this.labelComponent.set(`rgb${this.useAlpha ? 'a' : ''}(${r},${g},${b}${this.useAlpha ? ',' + toFixed(a) : ''})`);
        }
        else if (this.colorModel == "Hex") {
            this.labelComponent.set((this.useAlpha ? this.currentColor.hex : this.currentColor.hex.substr(0, 7)).toUpperCase());
        }
        else if (this.colorModel == "HSV") {
            const { h, s, v, a } = this.currentColor.hsv;
            const components = [Math.floor(h) + 'º', Math.floor(s * 100) + '%', Math.floor(v * 100) + '%'];
            if (this.useAlpha)
                components.push(toFixed(a));
            this.labelComponent.set(components.join(' '));
        }
        else // RGB
         {
            const { r, g, b, a } = this.currentColor.rgb;
            const components = [toFixed(r), toFixed(g), toFixed(b)];
            if (this.useAlpha)
                components.push(toFixed(a));
            this.labelComponent.set(components.join(' '));
        }
    }
    fromHexColor(hexColor) {
        this.currentColor.setHex(hexColor);
        // Decompose into HSV
        const { h, s, v } = this.currentColor.hsv;
        this._svToPosition(s, v);
        const hueColor = new Color({ h, s: 1, v: 1 });
        this.hueMarker.style.backgroundColor = this.colorPickerBackground.style.backgroundColor = `rgb(${hueColor.css.r}, ${hueColor.css.g}, ${hueColor.css.b})`;
        this.hueMarker.style.left = LX.remapRange(h, 0, 360, -this.markerHalfSize, this.colorPickerTracker.offsetWidth - this.markerHalfSize) + "px";
        this._updateColorValue(hexColor);
    }
}
LX.ColorPicker = ColorPicker;

// Popover.js @jxarco
/**
 * @class Popover
 */
class Popover {
    static activeElement = null;
    root;
    side = "bottom";
    align = "center";
    sideOffset = 0;
    alignOffset = 0;
    avoidCollisions = true;
    reference;
    _windowPadding = 4;
    _trigger;
    _parent;
    _onClick;
    constructor(trigger, content, options = {}) {
        if (Popover.activeElement) {
            Popover.activeElement.destroy();
            return;
        }
        this._trigger = trigger;
        if (trigger) {
            trigger.classList.add("triggered");
            trigger.active = this;
        }
        this.side = options.side ?? this.side;
        this.align = options.align ?? this.align;
        this.sideOffset = options.sideOffset ?? this.sideOffset;
        this.alignOffset = options.alignOffset ?? this.alignOffset;
        this.avoidCollisions = options.avoidCollisions ?? true;
        this.reference = options.reference;
        this.root = document.createElement("div");
        this.root.dataset["side"] = this.side;
        this.root.tabIndex = "1";
        this.root.className = "lexpopover";
        const refElement = trigger ?? this.reference;
        const nestedDialog = refElement.closest("dialog");
        if (nestedDialog && nestedDialog.dataset["modal"] == 'true') {
            this._parent = nestedDialog;
        }
        else {
            this._parent = LX.root;
        }
        this._parent.appendChild(this.root);
        this.root.addEventListener("keydown", (e) => {
            if (e.key == "Escape") {
                e.preventDefault();
                e.stopPropagation();
                this.destroy();
            }
        });
        if (content) {
            content = [].concat(content);
            content.forEach((e) => {
                const domNode = e.root ?? e;
                this.root.appendChild(domNode);
                if (e.onPopover) {
                    e.onPopover();
                }
            });
        }
        Popover.activeElement = this;
        LX.doAsync(() => {
            this._adjustPosition();
            if (this._trigger) {
                this.root.focus();
                this._onClick = (e) => {
                    if (e.target && (this.root.contains(e.target) || e.target == this._trigger)) {
                        return;
                    }
                    this.destroy();
                };
                document.body.addEventListener("mousedown", this._onClick, true);
                document.body.addEventListener("focusin", this._onClick, true);
            }
        }, 10);
    }
    destroy() {
        if (this._trigger) {
            this._trigger.classList.remove("triggered");
            delete this._trigger.active;
            document.body.removeEventListener("mousedown", this._onClick, true);
            document.body.removeEventListener("focusin", this._onClick, true);
        }
        this.root.remove();
        Popover.activeElement = null;
    }
    _adjustPosition() {
        const position = [0, 0];
        // Place menu using trigger position and user options
        {
            const el = this.reference ?? this._trigger;
            console.assert(el, "Popover needs a trigger or reference element!");
            const rect = el.getBoundingClientRect();
            let alignWidth = true;
            switch (this.side) {
                case "left":
                    position[0] += (rect.x - this.root.offsetWidth - this.sideOffset);
                    alignWidth = false;
                    break;
                case "right":
                    position[0] += (rect.x + rect.width + this.sideOffset);
                    alignWidth = false;
                    break;
                case "top":
                    position[1] += (rect.y - this.root.offsetHeight - this.sideOffset);
                    alignWidth = true;
                    break;
                case "bottom":
                    position[1] += (rect.y + rect.height + this.sideOffset);
                    alignWidth = true;
                    break;
            }
            switch (this.align) {
                case "start":
                    if (alignWidth) {
                        position[0] += rect.x;
                    }
                    else {
                        position[1] += rect.y;
                    }
                    break;
                case "center":
                    if (alignWidth) {
                        position[0] += (rect.x + rect.width * 0.5) - this.root.offsetWidth * 0.5;
                    }
                    else {
                        position[1] += (rect.y + rect.height * 0.5) - this.root.offsetHeight * 0.5;
                    }
                    break;
                case "end":
                    if (alignWidth) {
                        position[0] += rect.x - this.root.offsetWidth + rect.width;
                    }
                    else {
                        position[1] += rect.y - this.root.offsetHeight + rect.height;
                    }
                    break;
            }
            if (alignWidth) {
                position[0] += this.alignOffset;
            }
            else {
                position[1] += this.alignOffset;
            }
        }
        if (this.avoidCollisions) {
            position[0] = LX.clamp(position[0], 0, window.innerWidth - this.root.offsetWidth - this._windowPadding);
            position[1] = LX.clamp(position[1], 0, window.innerHeight - this.root.offsetHeight - this._windowPadding);
        }
        if (this._parent instanceof HTMLDialogElement) {
            let parentRect = this._parent.getBoundingClientRect();
            position[0] -= parentRect.x;
            position[1] -= parentRect.y;
        }
        this.root.style.left = `${position[0]}px`;
        this.root.style.top = `${position[1]}px`;
    }
}
LX.Popover = Popover;
/**
 * @class PopConfirm
 */
class PopConfirm {
    _popover = null;
    constructor(reference, options = {}) {
        const okText = options.confirmText ?? "Yes";
        const cancelText = options.cancelText ?? "No";
        const title = options.title ?? "Confirm";
        const content = options.content ?? "Are you sure you want to proceed?";
        const onConfirm = options.onConfirm;
        const onCancel = options.onCancel;
        const popoverContainer = LX.makeContainer(["auto", "auto"], "tour-step-container");
        {
            const headerDiv = LX.makeContainer(["100%", "auto"], "flex flex-row", "", popoverContainer);
            LX.makeContainer(["100%", "auto"], "p-1 font-medium text-md", title, headerDiv);
        }
        LX.makeContainer(["100%", "auto"], "p-1 text-md", content, popoverContainer, { maxWidth: "400px" });
        const footer = LX.makeContainer(["100%", "auto"], "flex flex-row text-md", "", popoverContainer);
        const footerButtons = LX.makeContainer(["100%", "auto"], "text-md", "", footer);
        const footerPanel = new LX.Panel();
        footerButtons.appendChild(footerPanel.root);
        footerPanel.sameLine(2, "justify-end");
        footerPanel.addButton(null, cancelText, () => {
            if (onCancel)
                onCancel();
            this._popover?.destroy();
        }, { xbuttonClass: "contrast" });
        footerPanel.addButton(null, okText, () => {
            if (onConfirm)
                onConfirm();
            this._popover?.destroy();
        }, { buttonClass: "accent" });
        this._popover?.destroy();
        this._popover = new LX.Popover(null, [popoverContainer], {
            reference,
            side: options.side ?? "top",
            align: options.align,
            sideOffset: options.sideOffset,
            alignOffset: options.alignOffset,
        });
    }
}
LX.PopConfirm = PopConfirm;

// ColorInput.ts @jxarco
/**
 * @class ColorInput
 * @description ColorInput Component
 */
class ColorInput extends BaseComponent {
    picker;
    _skipTextUpdate = false;
    _popover = undefined;
    constructor(name, value, callback, options = {}) {
        value = value ?? "#000000";
        const useAlpha = options.useAlpha ??
            ((value.constructor === Object && 'a' in value) || (value.constructor === String && [5, 9].includes(value.length)));
        const componentColor = new Color(value);
        // Force always hex internally
        value = useAlpha ? componentColor.hex : componentColor.hex.substr(0, 7);
        super(ComponentType.COLOR, name, value, options);
        this.onGetValue = () => {
            const currentColor = new Color(value);
            return options.useRGB ? currentColor.rgb : value;
        };
        this.onSetValue = (newValue, skipCallback, event) => {
            const newColor = new Color(newValue);
            colorSampleRGB.style.color = value = newColor.hex.substr(0, 7);
            if (useAlpha) {
                colorSampleAlpha.style.color = value = newColor.hex;
            }
            if (!this._skipTextUpdate) {
                textComponent.set(value, true, event);
            }
            if (!skipCallback) {
                let retValue = value;
                if (options.useRGB) {
                    retValue = newColor.rgb;
                    if (!useAlpha) {
                        delete retValue.a;
                    }
                }
                this._trigger(new IEvent(name, retValue, event), callback);
            }
        };
        this.onResize = (rect) => {
            const realNameWidth = (this.root.domName?.style.width ?? "0px");
            container.style.width = `calc( 100% - ${realNameWidth})`;
        };
        var container = document.createElement('span');
        container.className = "lexcolor";
        this.root.appendChild(container);
        this.picker = new ColorPicker(value, {
            colorModel: options.useRGB ? "RGB" : "Hex",
            useAlpha,
            onChange: (color) => {
                this.set(color.hex);
            }
        });
        let sampleContainer = LX.makeContainer(["18px", "18px"], "flex flex-row bg-contrast rounded overflow-hidden", "", container);
        sampleContainer.tabIndex = "1";
        sampleContainer.addEventListener("click", (e) => {
            if ((options.disabled ?? false)) {
                return;
            }
            this._popover = new Popover(sampleContainer, [this.picker]);
        });
        let colorSampleRGB = document.createElement('div');
        colorSampleRGB.className = "lexcolorsample";
        colorSampleRGB.style.color = value;
        sampleContainer.appendChild(colorSampleRGB);
        let colorSampleAlpha = null;
        if (useAlpha) {
            colorSampleAlpha = document.createElement('div');
            colorSampleAlpha.className = "lexcolorsample";
            colorSampleAlpha.style.color = value;
            sampleContainer.appendChild(colorSampleAlpha);
        }
        else {
            colorSampleRGB.style.width = "18px";
        }
        const textComponent = new TextInput(null, value, (v) => {
            this._skipTextUpdate = true;
            this.set(v);
            delete this._skipTextUpdate;
            this.picker.fromHexColor(v);
        }, { width: "calc( 100% - 24px )", disabled: options.disabled });
        textComponent.root.style.marginLeft = "6px";
        container.appendChild(textComponent.root);
        LX.doAsync(this.onResize.bind(this));
    }
}
LX.Color = Color;
LX.ColorPicker = ColorPicker;
LX.ColorInput = ColorInput;

// RangeInput.ts @jxarco
/**
 * @class RangeInput
 * @description RangeInput Component
 */
class RangeInput extends BaseComponent {
    _maxSlider = null;
    _labelTooltip = null;
    setLimits;
    constructor(name, value, callback, options = {}) {
        const ogValue = LX.deepCopy(value);
        super(ComponentType.RANGE, name, LX.deepCopy(ogValue), options);
        const isRangeValue = (value.constructor == Array && value.length == 2);
        if (isRangeValue) {
            value = ogValue[0];
            options.fill = false; // Range inputs do not fill by default
        }
        this.onGetValue = () => {
            let finalValue = value;
            if (isRangeValue) {
                finalValue = [value, ogValue[1]];
            }
            else if (options.left) {
                finalValue = ((+slider.max) - value + (+slider.min));
            }
            return finalValue;
        };
        this.onSetValue = (newValue, skipCallback, event) => {
            let newTpContent = "";
            const diff = (options.max - options.min);
            if (isRangeValue && this._maxSlider) {
                slider.value = value = LX.clamp(+newValue[0], +slider.min, +slider.max);
                this._maxSlider.value = ogValue[1] = LX.clamp(+newValue[1], +slider.min, +slider.max);
                // Update the range slider
                const diffOffset = (value / diff) - 0.5;
                const diffMaxOffset = (ogValue[1] / diff) - 0.5;
                const remappedMin = LX.remapRange(value, options.min, options.max, 0, 1);
                const remappedMax = LX.remapRange(ogValue[1], options.min, options.max, 0, 1);
                slider.style.setProperty("--range-min-value", `${remappedMin * 100}%`);
                slider.style.setProperty("--range-max-value", `${remappedMax * 100}%`);
                slider.style.setProperty("--range-fix-min-offset", `${-diffOffset}rem`);
                slider.style.setProperty("--range-fix-max-offset", `${diffMaxOffset}rem`);
                container.dataset["tooltipOffsetX"] = `${container.offsetWidth * remappedMin + container.offsetWidth * (remappedMax - remappedMin) * 0.5 - (container.offsetWidth * 0.5)}`;
                newTpContent = `${value} - ${ogValue[1]}`;
            }
            else {
                if (isNaN(newValue)) {
                    return;
                }
                slider.value = value = LX.clamp(+newValue, +slider.min, +slider.max);
                const remapped = LX.remapRange(value, options.min, options.max, 0, 1) * 0.5;
                container.dataset["tooltipOffsetX"] = `${container.offsetWidth * remapped - (container.offsetWidth * 0.5)}`;
                newTpContent = `${value}`;
            }
            container.dataset["tooltipContent"] = newTpContent;
            if (this._labelTooltip) {
                this._labelTooltip.innerHTML = newTpContent;
            }
            if (!skipCallback) {
                let finalValue = value;
                if (isRangeValue) {
                    finalValue = [value, ogValue[1]];
                }
                else if (options.left) {
                    finalValue = ((+slider.max) - value + (+slider.min));
                }
                this._trigger(new IEvent(name, finalValue, event), callback);
            }
        };
        this.onResize = (rect) => {
            const realNameWidth = (this.root.domName?.style.width ?? "0px");
            container.style.width = options.inputWidth ?? `calc( 100% - ${realNameWidth})`;
            if (isRangeValue) {
                const diff = (options.max - options.min);
                const diffOffset = (value / diff) - 0.5;
                const diffMaxOffset = (ogValue[1] / diff) - 0.5;
                slider.style.setProperty("--range-min-value", `${LX.remapRange(value, options.min, options.max, 0, 1) * 100}%`);
                slider.style.setProperty("--range-max-value", `${LX.remapRange(ogValue[1], options.min, options.max, 0, 1) * 100}%`);
                slider.style.setProperty("--range-fix-min-offset", `${-diffOffset}rem`);
                slider.style.setProperty("--range-fix-max-offset", `${diffMaxOffset}rem`);
            }
        };
        const container = document.createElement('div');
        container.className = "lexrange relative";
        this.root.appendChild(container);
        let slider = document.createElement('input');
        slider.className = "lexrangeslider " + (isRangeValue ? "pointer-events-none " : "") + (options.className ?? "");
        slider.min = options.min ?? 0;
        slider.max = options.max ?? 100;
        slider.step = options.step ?? 1;
        slider.type = "range";
        slider.disabled = options.disabled ?? false;
        if (value.constructor == Number) {
            value = LX.clamp(value, +slider.min, +slider.max);
        }
        if (options.left ?? false) {
            value = ((+slider.max) - value + (+slider.min));
            slider.classList.add("left");
        }
        if (!(options.fill ?? true)) {
            slider.classList.add("no-fill");
        }
        slider.value = value;
        container.appendChild(slider);
        slider.addEventListener("input", (e) => {
            this.set(isRangeValue ? [Math.min(e.target.valueAsNumber, ogValue[1]), ogValue[1]] : e.target.valueAsNumber, false, e);
        }, { passive: false });
        // If its a range value, we need to update the slider using the thumbs
        if (!isRangeValue) {
            slider.addEventListener("mousedown", function (e) {
                if (options.onPress) {
                    options.onPress.bind(slider)(e, slider);
                }
            }, false);
            slider.addEventListener("mouseup", function (e) {
                if (options.onRelease) {
                    options.onRelease.bind(slider)(e, slider);
                }
            }, false);
        }
        // Method to change min, max, step parameters
        this.setLimits = (newMin, newMax, newStep) => {
            slider.min = newMin ?? slider.min;
            slider.max = newMax ?? slider.max;
            slider.step = newStep ?? slider.step;
            BaseComponent._dispatchEvent(slider, "input", true);
        };
        LX.doAsync(() => {
            this.onResize();
            let offsetX = 0;
            if (isRangeValue) {
                const remappedMin = LX.remapRange(value, options.min, options.max, 0, 1);
                const remappedMax = LX.remapRange(ogValue[1], options.min, options.max, 0, 1);
                offsetX = container.offsetWidth * remappedMin + container.offsetWidth * (remappedMax - remappedMin) * 0.5 - (container.offsetWidth * 0.5);
            }
            else {
                const remapped = LX.remapRange(value, options.min, options.max, 0, 1) * 0.5;
                offsetX = container.offsetWidth * remapped - (container.offsetWidth * 0.5);
            }
            LX.asTooltip(container, `${value}${isRangeValue ? `- ${ogValue[1]}` : ``}`, { offsetX, callback: (tpDom) => {
                    this._labelTooltip = tpDom;
                } });
        });
        if (ogValue.constructor == Array) // Its a range value
         {
            let maxSlider = document.createElement('input');
            maxSlider.className = "lexrangeslider no-fill pointer-events-none overlap absolute top-0 left-0 " + (options.className ?? "");
            maxSlider.min = options.min ?? 0;
            maxSlider.max = options.max ?? 100;
            maxSlider.step = options.step ?? 1;
            maxSlider.type = "range";
            maxSlider.disabled = options.disabled ?? false;
            this._maxSlider = maxSlider;
            let maxRangeValue = ogValue[1];
            maxSlider.value = maxRangeValue = LX.clamp(maxRangeValue, +maxSlider.min, +maxSlider.max);
            container.appendChild(maxSlider);
            maxSlider.addEventListener("input", (e) => {
                ogValue[1] = Math.max(value, +e.target.valueAsNumber);
                this.set([value, ogValue[1]], false, e);
            }, { passive: false });
        }
    }
}
LX.RangeInput = RangeInput;

// Vector.ts @jxarco
/**
 * @class Vector
 * @description Vector Component
 */
class Vector extends BaseComponent {
    setLimits;
    constructor(numComponents, name, value, callback, options = {}) {
        numComponents = LX.clamp(numComponents, 2, 4);
        value = value ?? new Array(numComponents).fill(0);
        super(ComponentType.VECTOR, name, LX.deepCopy(value), options);
        this.onGetValue = () => {
            let inputs = this.root.querySelectorAll("input[type='number']");
            let value = [];
            for (var v of inputs) {
                value.push(+v.value);
            }
            return value;
        };
        this.onSetValue = (newValue, skipCallback, event) => {
            if (vectorInputs.length != newValue.length) {
                console.error("Input length does not match vector length.");
                return;
            }
            for (let i = 0; i < vectorInputs.length; ++i) {
                let vecValue = newValue[i];
                vecValue = LX.clamp(vecValue, +vectorInputs[i].min, +vectorInputs[i].max);
                vecValue = LX.round(vecValue, options.precision) ?? 0;
                vectorInputs[i].value = value[i] = vecValue;
            }
            if (!skipCallback) {
                this._trigger(new IEvent(name, value, event), callback);
            }
        };
        this.onResize = (rect) => {
            const realNameWidth = (this.root.domName?.style.width ?? "0px");
            container.style.width = `calc( 100% - ${realNameWidth})`;
        };
        this.setLimits = (newMin, newMax, newStep) => { };
        const vectorInputs = [];
        var container = document.createElement('div');
        container.className = "lexvector";
        this.root.appendChild(container);
        this.disabled = (options.disabled ?? false);
        const that = this;
        for (let i = 0; i < numComponents; ++i) {
            let box = document.createElement('div');
            box.className = "vecbox";
            box.innerHTML = "<span class='" + LX.Panel.VECTOR_COMPONENTS[i] + "'></span>";
            let vecinput = document.createElement('input');
            vecinput.className = "vecinput v" + numComponents;
            vecinput.min = options.min ?? -1e24;
            vecinput.max = options.max ?? 1e24;
            vecinput.step = options.step ?? "any";
            vecinput.type = "number";
            vecinput.id = "vec" + numComponents + "_" + LX.guidGenerator();
            vecinput.idx = i;
            vectorInputs[i] = vecinput;
            box.appendChild(vecinput);
            if (value[i].constructor == Number) {
                value[i] = LX.clamp(value[i], +vecinput.min, +vecinput.max);
                value[i] = LX.round(value[i], options.precision);
            }
            vecinput.value = vecinput.iValue = value[i];
            const dragIcon = LX.makeIcon("MoveVertical", { iconClass: "drag-icon hidden-opacity", svgClass: "sm" });
            box.appendChild(dragIcon);
            if (this.disabled) {
                vecinput.disabled = true;
            }
            // Add wheel input
            vecinput.addEventListener("wheel", function (e) {
                e.preventDefault();
                if (vecinput !== document.activeElement) {
                    return;
                }
                let mult = options.step ?? 1;
                if (e.shiftKey)
                    mult = 10;
                else if (e.altKey)
                    mult = 0.1;
                if (lockerButton.locked) {
                    for (let v of vectorInputs) {
                        v.value = LX.round(+v.valueAsNumber - mult * (e.deltaY > 0 ? 1 : -1), options.precision);
                        BaseComponent._dispatchEvent(v, "change");
                    }
                }
                else {
                    vecinput.value = LX.round(+vecinput.valueAsNumber - mult * (e.deltaY > 0 ? 1 : -1), options.precision);
                    BaseComponent._dispatchEvent(vecinput, "change");
                }
            }, { passive: false });
            vecinput.addEventListener("change", (e) => {
                if (isNaN(e.target.value)) {
                    return;
                }
                let val = LX.clamp(e.target.value, +vecinput.min, +vecinput.max);
                val = LX.round(val, options.precision);
                if (lockerButton.locked) {
                    for (let v of vectorInputs) {
                        v.value = val;
                        value[v.idx] = val;
                    }
                }
                else {
                    vecinput.value = val;
                    value[e.target.idx] = val;
                }
                this.set(value, false, e);
            }, false);
            // Add drag input
            function innerMouseDown(e) {
                if ((document.activeElement == vecinput) || (e.button != LX.MOUSE_LEFT_CLICK)) {
                    return;
                }
                var doc = that.root.ownerDocument;
                doc.addEventListener('mousemove', innerMouseMove);
                doc.addEventListener('mouseup', innerMouseUp);
                document.body.classList.add('noevents');
                dragIcon.classList.remove('hidden-opacity');
                e.stopImmediatePropagation();
                e.stopPropagation();
                if (!document.pointerLockElement) {
                    box.requestPointerLock();
                }
                if (options.onPress) {
                    options.onPress.bind(vecinput)(e, vecinput);
                }
            }
            function innerMouseMove(e) {
                let dt = -e.movementY;
                if (dt != 0) {
                    let mult = options.step ?? 1;
                    if (e.shiftKey)
                        mult = 10;
                    else if (e.altKey)
                        mult = 0.1;
                    if (lockerButton.locked) {
                        for (let v of vectorInputs) {
                            v.value = LX.round(+v.valueAsNumber + mult * dt, options.precision);
                            BaseComponent._dispatchEvent(v, "change");
                        }
                    }
                    else {
                        vecinput.value = LX.round(+vecinput.valueAsNumber + mult * dt, options.precision);
                        BaseComponent._dispatchEvent(vecinput, "change");
                    }
                }
                e.stopPropagation();
                e.preventDefault();
            }
            function innerMouseUp(e) {
                var doc = that.root.ownerDocument;
                doc.removeEventListener('mousemove', innerMouseMove);
                doc.removeEventListener('mouseup', innerMouseUp);
                document.body.classList.remove('noevents');
                dragIcon.classList.add('hidden-opacity');
                if (document.pointerLockElement) {
                    document.exitPointerLock();
                }
                if (options.onRelease) {
                    options.onRelease.bind(vecinput)(e, vecinput);
                }
            }
            box.addEventListener("mousedown", innerMouseDown);
            container.appendChild(box);
        }
        // Method to change min, max, step parameters
        if (options.min !== undefined || options.max !== undefined) {
            this.setLimits = (newMin, newMax, newStep) => {
                for (let v of vectorInputs) {
                    v.min = newMin ?? v.min;
                    v.max = newMax ?? v.max;
                    v.step = newStep ?? v.step;
                }
                this.set(value, true);
            };
        }
        const lockerButton = new Button(null, "", (swapValue) => {
            lockerButton.locked = swapValue;
        }, { title: "Lock", icon: "LockOpen", swap: "Lock", buttonClass: "no-h bg-none p-0" });
        container.appendChild(lockerButton.root);
        LX.doAsync(this.onResize.bind(this));
    }
}
LX.Vector = Vector;

// Vec2.ts @jxarco
class vec2 {
    x;
    y;
    constructor(x, y) {
        this.x = x ?? 0;
        this.y = y ?? (x ?? 0);
    }
    get xy() { return [this.x, this.y]; }
    get yx() { return [this.y, this.x]; }
    set(x, y) { this.x = x; this.y = y; }
    add(v, v0 = new vec2()) { v0.set(this.x + v.x, this.y + v.y); return v0; }
    sub(v, v0 = new vec2()) { v0.set(this.x - v.x, this.y - v.y); return v0; }
    mul(v, v0 = new vec2()) { if (v.constructor == Number) {
        v = new vec2(v);
    } v0.set(this.x * v.x, this.y * v.y); return v0; }
    div(v, v0 = new vec2()) { if (v.constructor == Number) {
        v = new vec2(v);
    } v0.set(this.x / v.x, this.y / v.y); return v0; }
    abs(v0 = new vec2()) { v0.set(Math.abs(this.x), Math.abs(this.y)); return v0; }
    dot(v) { return this.x * v.x + this.y * v.y; }
    len2() { return this.dot(this); }
    len() { return Math.sqrt(this.len2()); }
    nrm(v0 = new vec2()) { v0.set(this.x, this.y); return v0.mul(1.0 / this.len(), v0); }
    dst(v) { return v.sub(this).len(); }
    clp(min, max, v0 = new vec2()) { v0.set(LX.clamp(this.x, min, max), LX.clamp(this.y, min, max)); return v0; }
    fromArray(array) { this.x = array[0]; this.y = array[1]; }
    toArray() { return this.xy; }
}
LX.vec2 = vec2;

// CanvasMap2D.js @jxarco
// Based on LGraphMap2D from @tamats (jagenjo)
// https://github.com/jagenjo/litescene.js
class CanvasMap2D {
    static COLORS = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [0, 128, 128], [128, 0, 128], [128, 128, 0], [255, 128, 0], [255, 0, 128], [0, 128, 255], [128, 0, 255]];
    static GRID_SIZE = 64;
    /**
     * @constructor Map2D
     * @param {Array} initialPoints
     * @param {Function} callback
     * @param {Object} options
     * circular
     * showNames
     * size
     */
    canvas;
    imageCanvas = null;
    root;
    circular;
    showNames;
    size;
    points;
    callback;
    weights = [];
    weightsObj = {};
    currentPosition = new vec2(0.0, 0.0);
    circleCenter = [0, 0];
    circleRadius = 1;
    margin = 8;
    dragging = false;
    _valuesChanged = true;
    _selectedPoint = null;
    _precomputedWeightsGridSize = 0;
    _precomputedWeights = null;
    constructor(initialPoints, callback, options = {}) {
        this.circular = options.circular ?? false;
        this.showNames = options.showNames ?? true;
        this.size = options.size ?? [200, 200];
        this.points = initialPoints ?? [];
        this.callback = callback;
        this._valuesChanged = true;
        this._selectedPoint = null;
        this.root = LX.makeContainer(["auto", "auto"]);
        this.root.tabIndex = "1";
        this.root.addEventListener("mousedown", innerMouseDown);
        const that = this;
        function innerMouseDown(e) {
            var doc = that.root.ownerDocument;
            doc.addEventListener("mouseup", innerMouseUp);
            doc.addEventListener("mousemove", innerMouseMove);
            e.stopPropagation();
            e.preventDefault();
            that.dragging = true;
            return true;
        }
        function innerMouseMove(e) {
            if (!that.dragging) {
                return;
            }
            const margin = that.margin;
            const rect = that.root.getBoundingClientRect();
            let pos = new vec2();
            pos.set(e.x - rect.x - that.size[0] * 0.5, e.y - rect.y - that.size[1] * 0.5);
            var cpos = that.currentPosition;
            cpos.set(LX.clamp(pos.x / (that.size[0] * 0.5 - margin), -1, 1), LX.clamp(pos.y / (that.size[1] * 0.5 - margin), -1, 1));
            if (that.circular) {
                const center = new vec2(0, 0);
                const dist = cpos.dst(center);
                if (dist > 1) {
                    cpos = cpos.nrm();
                }
            }
            that.renderToCanvas(that.canvas.getContext("2d", { willReadFrequently: true }));
            that.computeWeights(cpos);
            if (that.callback) {
                that.callback(that.weightsObj, that.weights, cpos);
            }
            return true;
        }
        function innerMouseUp(e) {
            that.dragging = false;
            var doc = that.root.ownerDocument;
            doc.removeEventListener("mouseup", innerMouseUp);
            doc.removeEventListener("mousemove", innerMouseMove);
        }
        this.canvas = document.createElement("canvas");
        this.canvas.width = this.size[0];
        this.canvas.height = this.size[1];
        this.root.appendChild(this.canvas);
        const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
        this.renderToCanvas(ctx);
    }
    /**
     * @method computeWeights
     * @param {vec2} p
     * @description Iterate for every cell to see if our point is nearer to the cell than the nearest point of the cell,
     * If that is the case we increase the weight of the nearest point. At the end we normalize the weights of the points by the number of near points
     * and that give us the weight for every point
     */
    computeWeights(p) {
        if (!this.points.length) {
            return;
        }
        let values = this._precomputedWeights;
        if (!values || this._valuesChanged) {
            values = this.precomputeWeights();
        }
        let weights = this.weights;
        weights.length = this.points.length;
        for (var i = 0; i < weights.length; ++i) {
            weights[i] = 0;
        }
        const gridSize = CanvasMap2D.GRID_SIZE;
        let totalInside = 0;
        let pos2 = new vec2();
        for (var y = 0; y < gridSize; ++y) {
            for (var x = 0; x < gridSize; ++x) {
                pos2.set((x / gridSize) * 2 - 1, (y / gridSize) * 2 - 1);
                var dataPos = x * 2 + y * gridSize * 2;
                var pointIdx = values[dataPos];
                var isInside = p.dst(pos2) < (values[dataPos + 1] + 0.001); // epsilon
                if (isInside) {
                    weights[pointIdx] += 1;
                    totalInside++;
                }
            }
        }
        for (var i = 0; i < weights.length; ++i) {
            weights[i] /= totalInside;
            this.weightsObj[this.points[i].name] = weights[i];
        }
        return weights;
    }
    /**
     * @method precomputeWeights
     * @description Precompute for every cell, which is the closest point of the points set and how far it is from the center of the cell
     * We store point index and distance in this._precomputedWeights. This is done only when the points set change
     */
    precomputeWeights() {
        this._valuesChanged = false;
        const numPoints = this.points.length;
        const gridSize = CanvasMap2D.GRID_SIZE;
        const totalNums = 2 * gridSize * gridSize;
        let position = new vec2();
        if (!this._precomputedWeights || this._precomputedWeights.length != totalNums) {
            this._precomputedWeights = new Float32Array(totalNums);
        }
        let values = this._precomputedWeights;
        this._precomputedWeightsGridSize = gridSize;
        for (let y = 0; y < gridSize; ++y) {
            for (let x = 0; x < gridSize; ++x) {
                let nearest = -1;
                let minDistance = 100000;
                for (let i = 0; i < numPoints; ++i) {
                    position.set((x / gridSize) * 2 - 1, (y / gridSize) * 2 - 1);
                    let pointPosition = new vec2();
                    pointPosition.fromArray(this.points[i].pos);
                    let dist = position.dst(pointPosition);
                    if (dist > minDistance) {
                        continue;
                    }
                    nearest = i;
                    minDistance = dist;
                }
                values[x * 2 + y * 2 * gridSize] = nearest;
                values[x * 2 + y * 2 * gridSize + 1] = minDistance;
            }
        }
        return values;
    }
    /**
     * @method precomputeWeightsToImage
     * @param {vec2} p
     */
    precomputeWeightsToImage(p) {
        if (!this.points.length) {
            return null;
        }
        const gridSize = CanvasMap2D.GRID_SIZE;
        var values = this._precomputedWeights;
        if (!values || this._valuesChanged || this._precomputedWeightsGridSize != gridSize) {
            values = this.precomputeWeights();
        }
        var canvas = this.imageCanvas;
        if (!canvas) {
            canvas = this.imageCanvas = document.createElement("canvas");
        }
        canvas.width = canvas.height = gridSize;
        var ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
            return;
        }
        var weights = this.weights;
        weights.length = this.points.length;
        for (var i = 0; i < weights.length; ++i) {
            weights[i] = 0;
        }
        let totalInside = 0;
        let pixels = ctx.getImageData(0, 0, gridSize, gridSize);
        let pos2 = new vec2();
        for (var y = 0; y < gridSize; ++y) {
            for (var x = 0; x < gridSize; ++x) {
                pos2.set((x / gridSize) * 2 - 1, (y / gridSize) * 2 - 1);
                const pixelPos = x * 4 + y * gridSize * 4;
                const dataPos = x * 2 + y * gridSize * 2;
                const pointIdx = values[dataPos];
                const c = CanvasMap2D.COLORS[pointIdx % CanvasMap2D.COLORS.length];
                var isInside = p.dst(pos2) < (values[dataPos + 1] + 0.001);
                if (isInside) {
                    weights[pointIdx] += 1;
                    totalInside++;
                }
                pixels.data[pixelPos] = c[0] + (isInside ? 128 : 0);
                pixels.data[pixelPos + 1] = c[1] + (isInside ? 128 : 0);
                pixels.data[pixelPos + 2] = c[2] + (isInside ? 128 : 0);
                pixels.data[pixelPos + 3] = 255;
            }
        }
        for (let i = 0; i < weights.length; ++i) {
            weights[i] /= totalInside;
        }
        ctx.putImageData(pixels, 0, 0);
        return canvas;
    }
    addPoint(name, pos = null) {
        if (this.findPoint(name)) {
            console.warn("CanvasMap2D.addPoint: There is already a point with that name");
            return;
        }
        if (!pos) {
            pos = [this.currentPosition.x, this.currentPosition.y];
        }
        pos[0] = LX.clamp(pos[0], -1, 1);
        pos[1] = LX.clamp(pos[1], -1, 1);
        const point = { name, pos };
        this.points.push(point);
        this._valuesChanged = true;
        return point;
    }
    removePoint(name) {
        const removeIdx = this.points.findIndex((p) => p.name == name);
        if (removeIdx > -1) {
            this.points.splice(removeIdx, 1);
            this._valuesChanged = true;
        }
    }
    findPoint(name) {
        return this.points.find(p => p.name == name);
    }
    clear() {
        this.points.length = 0;
        this._precomputedWeights = null;
        this._selectedPoint = null;
    }
    renderToCanvas(ctx) {
        if (!ctx) {
            return;
        }
        const margin = this.margin;
        const w = this.size[0];
        const h = this.size[1];
        ctx.fillStyle = "black";
        ctx.strokeStyle = "#BBB";
        ctx.clearRect(0, 0, w, h);
        if (this.circular) {
            this.circleCenter[0] = w * 0.5;
            this.circleCenter[1] = h * 0.5;
            this.circleRadius = h * 0.5 - margin;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.circleCenter[0], this.circleCenter[1], this.circleRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(this.circleCenter[0] + 0.5, this.circleCenter[1] - this.circleRadius);
            ctx.lineTo(this.circleCenter[0] + 0.5, this.circleCenter[1] + this.circleRadius);
            ctx.moveTo(this.circleCenter[0] - this.circleRadius, this.circleCenter[1]);
            ctx.lineTo(this.circleCenter[0] + this.circleRadius, this.circleCenter[1]);
            ctx.stroke();
        }
        else {
            ctx.fillRect(margin, margin, w - margin * 2, h - margin * 2);
            ctx.strokeRect(margin, margin, w - margin * 2, h - margin * 2);
        }
        var image = this.precomputeWeightsToImage(this.currentPosition);
        if (image) {
            ctx.globalAlpha = 0.5;
            ctx.imageSmoothingEnabled = false;
            if (this.circular) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(this.circleCenter[0], this.circleCenter[1], this.circleRadius, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(image, this.circleCenter[0] - this.circleRadius, this.circleCenter[1] - this.circleRadius, this.circleRadius * 2, this.circleRadius * 2);
                ctx.restore();
            }
            else {
                ctx.drawImage(image, margin, margin, w - margin * 2, h - margin * 2);
            }
            ctx.imageSmoothingEnabled = true;
            ctx.globalAlpha = 1;
        }
        for (let i = 0; i < this.points.length; ++i) {
            const point = this.points[i];
            let x = point.pos[0] * 0.5 + 0.5;
            let y = point.pos[1] * 0.5 + 0.5;
            x = x * (w - margin * 2) + margin;
            y = y * (h - margin * 2) + margin;
            x = LX.clamp(x, margin, w - margin);
            y = LX.clamp(y, margin, h - margin);
            ctx.fillStyle = (point == this._selectedPoint) ? "#CDF" : "#BCD";
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
            if (this.showNames) {
                ctx.fillText(point.name, x + 5, y + 5);
            }
        }
        ctx.fillStyle = "white";
        ctx.beginPath();
        var x = this.currentPosition.x * 0.5 + 0.5;
        var y = this.currentPosition.y * 0.5 + 0.5;
        x = x * (w - margin * 2) + margin;
        y = y * (h - margin * 2) + margin;
        x = LX.clamp(x, margin, w - margin);
        y = LX.clamp(y, margin, h - margin);
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}
LX.CanvasMap2D = CanvasMap2D;

// Map2D.ts @jxarco
/**
 * @class Map2D
 * @description Map2D Component
 */
class Map2D extends BaseComponent {
    map2d;
    _popover = null;
    constructor(name, points, callback, options = {}) {
        super(ComponentType.MAP2D, name, null, options);
        this.onGetValue = () => {
            return this.map2d.weightsObj;
        };
        this.onSetValue = (newValue, skipCallback, event) => {
            // if( !skipCallback )
            // {
            //     this._trigger( new IEvent( name, curveInstance.element.value, event ), callback );
            // }
        };
        this.onResize = (rect) => {
            const realNameWidth = (this.root.domName?.style.width ?? "0px");
            container.style.width = `calc( 100% - ${realNameWidth})`;
        };
        var container = document.createElement("div");
        container.className = "lexmap2d";
        this.root.appendChild(container);
        this.map2d = new CanvasMap2D(points, callback, options);
        const calendarIcon = LX.makeIcon("SquareMousePointer");
        const calendarButton = new Button(null, "Open Map", () => {
            this._popover = new Popover(calendarButton.root, [this.map2d]);
        }, { buttonClass: `flex flex-row px-3 fg-secondary justify-between` });
        calendarButton.root.querySelector("button").appendChild(calendarIcon);
        container.appendChild(calendarButton.root);
        LX.doAsync(this.onResize.bind(this));
    }
}
LX.Map2D = Map2D;

// Calendar.ts @jxarco
class Calendar {
    /**
     * @constructor Calendar
     * @param {String} dateString D/M/Y
     * @param {Object} options
     */
    root;
    day = -1;
    month = -1;
    year = -1;
    monthName = "";
    firstDay = -1;
    daysInMonth = -1;
    calendarDays = [];
    currentDate;
    range;
    untilToday;
    fromToday;
    skipPrevMonth;
    skipNextMonth;
    onChange;
    onPreviousMonth;
    onNextMonth;
    constructor(dateString, options = {}) {
        this.root = LX.makeContainer(["256px", "auto"], "p-1 text-md");
        this.onChange = options.onChange;
        this.onPreviousMonth = options.onPreviousMonth;
        this.onNextMonth = options.onNextMonth;
        this.untilToday = options.untilToday;
        this.fromToday = options.fromToday;
        this.range = options.range;
        this.skipPrevMonth = options.skipPrevMonth;
        this.skipNextMonth = options.skipNextMonth;
        if (dateString) {
            this.fromDateString(dateString);
        }
        else {
            const date = new Date();
            this.month = date.getMonth() + 1;
            this.year = date.getFullYear();
            this.fromMonthYear(this.month, this.year);
        }
    }
    _getCurrentDate() {
        return {
            day: this.day,
            month: this.month,
            year: this.year,
            fullDate: this.getFullDate()
        };
    }
    _previousMonth(skipCallback) {
        this.month = Math.max(1, this.month - 1);
        if (this.month == 1) {
            this.month = 12;
            this.year--;
        }
        this.fromMonthYear(this.month, this.year);
        if (!skipCallback && this.onPreviousMonth) {
            this.onPreviousMonth(this.currentDate);
        }
    }
    _nextMonth(skipCallback) {
        this.month = Math.min(this.month + 1, 13);
        if (this.month == 13) {
            this.month = 1;
            this.year++;
        }
        this.fromMonthYear(this.month, this.year);
        if (!skipCallback && this.onNextMonth) {
            this.onNextMonth(this.currentDate);
        }
    }
    refresh() {
        this.root.innerHTML = "";
        // Header
        {
            const header = LX.makeContainer(["100%", "auto"], "flex flex-row p-1", "", this.root);
            if (!this.skipPrevMonth) {
                const prevMonthIcon = LX.makeIcon("Left", { title: "Previous Month", iconClass: "border p-1 rounded hover:bg-secondary", svgClass: "sm" });
                header.appendChild(prevMonthIcon);
                prevMonthIcon.addEventListener("click", () => {
                    this._previousMonth();
                });
            }
            LX.makeContainer(["100%", "auto"], "text-center font-medium select-none", `${this.monthName} ${this.year}`, header);
            if (!this.skipNextMonth) {
                const nextMonthIcon = LX.makeIcon("Right", { title: "Next Month", iconClass: "border p-1 rounded hover:bg-secondary", svgClass: "sm" });
                header.appendChild(nextMonthIcon);
                nextMonthIcon.addEventListener("click", () => {
                    this._nextMonth();
                });
            }
        }
        // Body
        {
            const daysTable = document.createElement("table");
            daysTable.className = "w-full";
            this.root.appendChild(daysTable);
            // Table Head
            {
                const head = document.createElement('thead');
                daysTable.appendChild(head);
                const hrow = document.createElement('tr');
                for (const headData of ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]) {
                    const th = document.createElement('th');
                    th.className = "fg-tertiary text-sm font-normal select-none";
                    th.innerHTML = `<span>${headData}</span>`;
                    hrow.appendChild(th);
                }
                head.appendChild(hrow);
            }
            // Table Body
            {
                const body = document.createElement('tbody');
                daysTable.appendChild(body);
                let fromRangeDate = this.range ? LX.dateFromDateString(this.range[0]) : null;
                let toRangeDate = this.range ? LX.dateFromDateString(this.range[1]) : null;
                for (let week = 0; week < 6; week++) {
                    const hrow = document.createElement('tr');
                    const weekDays = this.calendarDays.slice(week * 7, week * 7 + 7);
                    for (const dayData of weekDays) {
                        const th = document.createElement('th');
                        th.className = "leading-loose font-normal rounded select-none cursor-pointer";
                        const dayDate = new Date(`${this.month}/${dayData.day}/${this.year}`);
                        const date = new Date();
                        // today inclusives
                        const beforeToday = this.untilToday ? (dayDate.getTime() < date.getTime()) : true;
                        const afterToday = this.fromToday ? (dayDate.getFullYear() > date.getFullYear() ||
                            (dayDate.getFullYear() === date.getFullYear() && dayDate.getMonth() > date.getMonth()) ||
                            (dayDate.getFullYear() === date.getFullYear() && dayDate.getMonth() === date.getMonth() && dayDate.getDate() >= date.getDate())) : true;
                        const selectable = dayData.currentMonth && beforeToday && afterToday;
                        const currentDay = this.currentDate && (dayData.day == this.currentDate.day) && (this.month == this.currentDate.month)
                            && (this.year == this.currentDate.year) && dayData.currentMonth;
                        const currentFromRange = selectable && fromRangeDate && (dayData.day == fromRangeDate.getDate()) && (this.month == (fromRangeDate.getMonth() + 1))
                            && (this.year == fromRangeDate.getFullYear());
                        const currentToRange = selectable && toRangeDate && (dayData.day == toRangeDate.getDate()) && (this.month == (toRangeDate.getMonth() + 1))
                            && (this.year == toRangeDate.getFullYear());
                        if ((!this.range && currentDay) || this.range && (currentFromRange || currentToRange)) {
                            th.className += ` bg-contrast fg-contrast`;
                        }
                        else if (this.range && selectable && (dayDate > fromRangeDate) && (dayDate < toRangeDate)) {
                            th.className += ` bg-accent fg-contrast`;
                        }
                        else {
                            th.className += ` ${selectable ? "fg-primary" : "fg-tertiary"} hover:bg-secondary`;
                        }
                        th.innerHTML = `<span>${dayData.day}</span>`;
                        hrow.appendChild(th);
                        if (selectable) {
                            th.addEventListener("click", () => {
                                this.day = dayData.day;
                                this.currentDate = this._getCurrentDate();
                                if (this.onChange) {
                                    this.onChange(this.currentDate);
                                }
                            });
                        }
                        // This event should only be applied in non current month days
                        else if (this.range === undefined && !dayData.currentMonth) {
                            th.addEventListener("click", () => {
                                if (dayData?.prevMonth) {
                                    this._previousMonth();
                                }
                                else {
                                    this._nextMonth();
                                }
                            });
                        }
                    }
                    body.appendChild(hrow);
                }
            }
        }
    }
    fromDateString(dateString) {
        const tokens = dateString.split('/');
        this.day = parseInt(tokens[0]);
        this.month = parseInt(tokens[1]);
        this.monthName = this.getMonthName(this.month - 1);
        this.year = parseInt(tokens[2]);
        this.currentDate = this._getCurrentDate();
        this.fromMonthYear(this.month, this.year);
    }
    fromMonthYear(month, year) {
        // Month is 0-based (0 = January, ... 11 = December)
        month = Math.max(month - 1, 0);
        year = year ?? new Date().getFullYear();
        const weekDay = new Date(year, month, 1).getDay();
        const firstDay = weekDay === 0 ? 6 : weekDay - 1; // 0 = Monday, 1 = Tuesday...
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        // Previous month
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
        // Prepare full grid (up to 6 weeks = 42 days)
        const calendarDays = [];
        // Fill in days from previous month
        for (let i = firstDay - 1; i >= 0; i--) {
            calendarDays.push({ day: daysInPrevMonth - i, currentMonth: false, prevMonth: true });
        }
        // Fill in current month days
        for (let i = 1; i <= daysInMonth; i++) {
            calendarDays.push({ day: i, currentMonth: true });
        }
        // Fill in next month days to complete the grid (if needed)
        const remaining = 42 - calendarDays.length;
        for (let i = 1; i <= remaining; i++) {
            calendarDays.push({ day: i, currentMonth: false, nextMonth: true });
        }
        this.monthName = this.getMonthName(month);
        this.firstDay = firstDay;
        this.daysInMonth = daysInMonth;
        this.calendarDays = calendarDays;
        this.refresh();
    }
    getMonthName(monthIndex, locale = "en-US") {
        const formatter = new Intl.DateTimeFormat(locale, { month: "long" });
        return formatter.format(new Date(2000, monthIndex, 1));
    }
    getFullDate(monthName, day, year) {
        return `${monthName ?? this.monthName} ${day ?? this.day}${this._getOrdinalSuffix(day ?? this.day)}, ${year ?? this.year}`;
    }
    setRange(range) {
        console.assert(range.constructor === Array, "Date Range must be in Array format");
        this.range = range;
        this.refresh();
    }
    setMonth(month) {
        this.month = month;
        this.fromMonthYear(this.month, this.year);
    }
    _getOrdinalSuffix(day) {
        if (day > 3 && day < 21)
            return "th";
        switch (day % 10) {
            case 1: return "st";
            case 2: return "nd";
            case 3: return "rd";
            default: return "th";
        }
    }
}
LX.Calendar = Calendar;

// CalendarRange.ts @jxarco
class CalendarRange {
    /**
     * @constructor CalendarRange
     * @param {Array} range ["DD/MM/YYYY", "DD/MM/YYYY"]
     * @param {Object} options
     */
    root;
    fromCalendar;
    toCalendar;
    from;
    to;
    _selectingRange = false;
    constructor(range, options = {}) {
        this.root = LX.makeContainer(["auto", "auto"], "flex flex-row");
        console.assert(range && range.constructor === Array, "Range cannot be empty and has to be an Array!");
        let mustSetMonth = null;
        let dateReversed = false;
        // Fix any issues with date range picking
        {
            const t0 = LX.dateFromDateString(range[0]);
            const t1 = LX.dateFromDateString(range[1]);
            if (t0 > t1) {
                const tmp = range[0];
                range[0] = range[1];
                range[1] = tmp;
                dateReversed = true;
            }
            mustSetMonth = (dateReversed ? t1.getMonth() : t0.getMonth()) + 2; // +1 to convert range, +1 to use next month
        }
        this.from = range[0];
        this.to = range[1];
        const onChange = (date) => {
            const newDateString = `${date.day}/${date.month}/${date.year}`;
            if (!this._selectingRange) {
                this.from = this.to = newDateString;
                this._selectingRange = true;
            }
            else {
                this.to = newDateString;
                this._selectingRange = false;
            }
            const newRange = [this.from, this.to];
            this.fromCalendar.setRange(newRange);
            this.toCalendar.setRange(newRange);
            if (options.onChange) {
                options.onChange(newRange);
            }
        };
        this.fromCalendar = new Calendar(this.from, {
            skipNextMonth: true,
            onChange,
            onPreviousMonth: () => {
                this.toCalendar._previousMonth();
            },
            range
        });
        this.toCalendar = new Calendar(this.to, {
            skipPrevMonth: true,
            onChange,
            onNextMonth: () => {
                this.fromCalendar._nextMonth();
            },
            range
        });
        console.assert(mustSetMonth && "New Month must be valid");
        this.toCalendar.setMonth(mustSetMonth);
        this.root.appendChild(this.fromCalendar.root);
        this.root.appendChild(this.toCalendar.root);
    }
    getFullDate() {
        const d0 = LX.dateFromDateString(this.from);
        const d0Month = this.fromCalendar.getMonthName(d0.getMonth());
        const d1 = LX.dateFromDateString(this.to);
        const d1Month = this.toCalendar.getMonthName(d1.getMonth());
        return `${this.fromCalendar.getFullDate(d0Month, d0.getDate(), d0.getFullYear())} to ${this.toCalendar.getFullDate(d1Month, d1.getDate(), d1.getFullYear())}`;
    }
}
LX.CalendarRange = CalendarRange;

// Rate.ts @jxarco
/**
 * @class Table
 * @description Table Component
 */
class Table extends BaseComponent {
    data;
    filter;
    customFilters;
    activeCustomFilters;
    rowOffsetCount = 0;
    _currentFilter;
    _toggleColumns;
    _sortColumns;
    _resetCustomFiltersBtn = null;
    _hiddenColumns = [];
    _centered;
    get centered() { return this._centered; }
    set centered(v) { this._setCentered(v); }
    constructor(name, data, options = {}) {
        if (!data) {
            throw ("Data is needed to create a table!");
        }
        super(ComponentType.TABLE, name, null, options);
        this.onResize = (rect) => {
            const realNameWidth = (this.root.domName?.style.width ?? "0px");
            container.style.width = `calc( 100% - ${realNameWidth})`;
        };
        const container = document.createElement('div');
        container.className = "lextable";
        this.root.appendChild(container);
        this._centered = options.centered ?? false;
        if (this._centered === true) {
            container.classList.add("centered");
        }
        this.filter = options.filter ?? false;
        this.customFilters = options.customFilters;
        this.activeCustomFilters = {};
        this._toggleColumns = options.toggleColumns ?? false;
        this._sortColumns = options.sortColumns ?? true;
        this._currentFilter = options.filterValue;
        this._hiddenColumns = options.hiddenColumns ?? [];
        data.head = data.head ?? [];
        data.body = data.body ?? [];
        data.checkMap = {};
        data.colVisibilityMap = {};
        data.head.forEach((colName, index) => {
            const idx = this._hiddenColumns.indexOf(colName);
            const visible = (!this._toggleColumns) || (idx === -1);
            data.colVisibilityMap[index] = visible;
        });
        this.data = data;
        const getDate = (text) => {
            // Match DD/MM/YYYY or DD-MM-YYYY
            const m = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2}|\d{4})$/);
            if (!m)
                return null;
            let day = Number(m[1]);
            let month = Number(m[2]) - 1; // JS months: 0-11
            let year = Number(m[3]);
            // Convert YY → 20YY
            if (year < 100)
                year += 2000;
            const d = new Date(year, month, day);
            // Validate (to avoid things like 32/13/2025 becoming valid)
            if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) {
                return null;
            }
            return d;
        };
        const compareFn = (idx, order, a, b) => {
            const va = a[idx];
            const vb = b[idx];
            // Date sort
            const da = getDate(va);
            const db = getDate(vb);
            if (da && db) {
                if (da.getTime() < db.getTime())
                    return -order;
                if (da.getTime() > db.getTime())
                    return order;
                return 0;
            }
            // Number sort
            const na = Number(va);
            const nb = Number(vb);
            if (!isNaN(na) && !isNaN(nb)) {
                if (na < nb)
                    return -order;
                if (na > nb)
                    return order;
                return 0;
            }
            // String sort
            if (va < vb)
                return -order;
            else if (va > vb)
                return order;
            return 0;
        };
        const sortFn = (idx, sign) => {
            data.body = data.body.sort(compareFn.bind(this, idx, sign));
            this.refresh();
        };
        // Append header
        if (this.filter || this.customFilters || this._toggleColumns) {
            const headerContainer = LX.makeContainer(["100%", "auto"], "flex flex-row mb-2");
            if (this.filter) {
                const filterOptions = LX.deepCopy(options);
                filterOptions.placeholder = `Filter ${this.filter}...`;
                filterOptions.skipComponent = true;
                filterOptions.trigger = "input";
                filterOptions.inputClass = "outline";
                let filter = new TextInput(null, this._currentFilter ?? "", (v) => {
                    this._currentFilter = v;
                    this.refresh();
                }, filterOptions);
                headerContainer.appendChild(filter.root);
            }
            if (this.customFilters !== null) {
                const icon = LX.makeIcon("CirclePlus", { svgClass: "sm" });
                const separatorHtml = `<div class="lexcontainer border-right self-center mx-1" style="width: 1px; height: 70%;"></div>`;
                for (let f of this.customFilters) {
                    f.component = new Button(null, icon.innerHTML + f.name, (v) => {
                        const spanName = f.component.root.querySelector("span");
                        if (f.options) {
                            const menuOptions = f.options.map((colName, idx) => {
                                const item = {
                                    name: colName,
                                    checked: !!this.activeCustomFilters[colName],
                                    callback: (key, v, dom) => {
                                        if (v) {
                                            this.activeCustomFilters[key] = f.name;
                                        }
                                        else {
                                            delete this.activeCustomFilters[key];
                                        }
                                        const activeFilters = Object.keys(this.activeCustomFilters).filter(k => this.activeCustomFilters[k] == f.name);
                                        const filterBadgesHtml = activeFilters.reduce((acc, key) => acc += LX.badge(key, "bg-tertiary fg-secondary text-sm border-0"), "");
                                        spanName.innerHTML = icon.innerHTML + f.name + (activeFilters.length ? separatorHtml : "") + filterBadgesHtml;
                                        this.refresh();
                                    }
                                };
                                return item;
                            });
                            LX.addDropdownMenu(f.component.root, menuOptions, { side: "bottom", align: "start" });
                        }
                        else if (f.type == "range") {
                            console.assert(f.min != undefined && f.max != undefined, "Range filter needs min and max values!");
                            const container = LX.makeContainer(["240px", "auto"], "text-md");
                            const panel = new LX.Panel();
                            LX.makeContainer(["100%", "auto"], "px-3 p-2 pb-0 text-md font-medium", f.name, container);
                            f.start = f.start ?? f.min;
                            f.end = f.end ?? f.max;
                            panel.refresh = () => {
                                panel.clear();
                                panel.sameLine(2, "justify-center");
                                panel.addNumber(null, f.start, (v) => {
                                    f.start = v;
                                    const inUse = (f.start != f.min || f.end != f.max);
                                    spanName.innerHTML = icon.innerHTML + f.name + (inUse ? separatorHtml + LX.badge(`${f.start} - ${f.end} ${f.units ?? ""}`, "bg-tertiary fg-secondary text-sm border-0") : "");
                                    if (inUse)
                                        this._resetCustomFiltersBtn?.root.classList.remove("hidden");
                                    this.refresh();
                                }, { skipSlider: true, min: f.min, max: f.max, step: f.step, units: f.units });
                                panel.addNumber(null, f.end, (v) => {
                                    f.end = v;
                                    const inUse = (f.start != f.min || f.end != f.max);
                                    spanName.innerHTML = icon.innerHTML + f.name + (inUse ? separatorHtml + LX.badge(`${f.start} - ${f.end} ${f.units ?? ""}`, "bg-tertiary fg-secondary text-sm border-0") : "");
                                    if (inUse)
                                        this._resetCustomFiltersBtn?.root.classList.remove("hidden");
                                    this.refresh();
                                }, { skipSlider: true, min: f.min, max: f.max, step: f.step, units: f.units });
                                panel.addButton(null, "Reset", () => {
                                    f.start = f.min;
                                    f.end = f.max;
                                    spanName.innerHTML = icon.innerHTML + f.name;
                                    panel.refresh();
                                    this.refresh();
                                }, { buttonClass: "contrast" });
                            };
                            panel.refresh();
                            container.appendChild(panel.root);
                            new Popover(f.component.root, [container], { side: "bottom" });
                        }
                        else if (f.type == "date") {
                            const container = LX.makeContainer(["auto", "auto"], "text-md");
                            const panel = new LX.Panel();
                            LX.makeContainer(["100%", "auto"], "px-3 p-2 pb-0 text-md font-medium", f.name, container);
                            panel.refresh = () => {
                                panel.clear();
                                // Generate default value once the filter is used
                                if (!f.default) {
                                    const date = new Date();
                                    const todayStringDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
                                    f.default = [todayStringDate, todayStringDate];
                                }
                                const calendar = new CalendarRange(f.value ?? f.default, {
                                    onChange: (dateRange) => {
                                        f.value = dateRange;
                                        spanName.innerHTML = icon.innerHTML + f.name + (separatorHtml + LX.badge(`${calendar.getFullDate()}`, "bg-tertiary fg-secondary text-sm border-0"));
                                        this._resetCustomFiltersBtn?.root.classList.remove("hidden");
                                        this.refresh();
                                    }
                                });
                                panel.attach(calendar);
                            };
                            panel.refresh();
                            container.appendChild(panel.root);
                            new Popover(f.component.root, [container], { side: "bottom" });
                        }
                    }, { buttonClass: "px-2 primary dashed" });
                    headerContainer.appendChild(f.component.root);
                }
                this._resetCustomFiltersBtn = new Button(null, "resetButton", () => {
                    this.activeCustomFilters = {};
                    this._resetCustomFiltersBtn?.root.classList.add("hidden");
                    for (let f of this.customFilters ?? []) {
                        f.component.root.querySelector("span").innerHTML = (icon.innerHTML + f.name);
                        if (f.type == "range") {
                            f.start = f.min;
                            f.end = f.max;
                        }
                        else if (f.type == "date") {
                            delete f.value;
                        }
                    }
                    this.refresh();
                }, { title: "Reset filters", tooltip: true, icon: "X" });
                headerContainer.appendChild(this._resetCustomFiltersBtn?.root);
                this._resetCustomFiltersBtn?.root.classList.add("hidden");
            }
            if (this._toggleColumns) {
                const icon = LX.makeIcon("Settings2");
                const toggleColumnsBtn = new Button("toggleColumnsBtn", icon.innerHTML + "View", (value, e) => {
                    const menuOptions = data.head.map((colName, idx) => {
                        const item = {
                            name: colName,
                            icon: "Check",
                            callback: () => {
                                data.colVisibilityMap[idx] = !data.colVisibilityMap[idx];
                                const cells = table.querySelectorAll(`tr > *:nth-child(${idx + this.rowOffsetCount + 1})`);
                                cells.forEach((cell) => {
                                    cell.style.display = (cell.style.display === "none") ? "" : "none";
                                });
                            }
                        };
                        if (!data.colVisibilityMap[idx])
                            delete item.icon;
                        return item;
                    });
                    LX.addDropdownMenu(e.target, menuOptions, { side: "bottom", align: "end" });
                }, { hideName: true });
                headerContainer.appendChild(toggleColumnsBtn.root);
                toggleColumnsBtn.root.style.marginLeft = "auto";
            }
            container.appendChild(headerContainer);
        }
        const table = document.createElement('table');
        LX.addClass(table, options.tableClass);
        container.appendChild(table);
        this.refresh = () => {
            this._currentFilter = this._currentFilter ?? "";
            table.innerHTML = "";
            this.rowOffsetCount = 0;
            // Head
            {
                const head = document.createElement('thead');
                head.className = "lextablehead";
                table.appendChild(head);
                const hrow = document.createElement('tr');
                if (options.sortable ?? false) {
                    const th = document.createElement('th');
                    th.style.width = "0px";
                    hrow.appendChild(th);
                    this.rowOffsetCount++;
                }
                if (options.selectable ?? false) {
                    const th = document.createElement('th');
                    th.style.width = "0px";
                    const input = document.createElement('input');
                    input.type = "checkbox";
                    input.className = "lexcheckbox accent";
                    input.checked = data.checkMap[":root"] ?? false;
                    th.appendChild(input);
                    input.addEventListener('change', function () {
                        data.checkMap[":root"] = this.checked;
                        const body = table.querySelector("tbody");
                        for (const el of body.childNodes) {
                            const rowId = el.getAttribute("rowId");
                            if (!rowId)
                                continue;
                            data.checkMap[rowId] = this.checked;
                            el.querySelector("input[type='checkbox']").checked = this.checked;
                        }
                    });
                    this.rowOffsetCount++;
                    hrow.appendChild(th);
                }
                for (const headData of data.head) {
                    const th = document.createElement('th');
                    th.innerHTML = `<span>${headData}</span>`;
                    th.querySelector("span").appendChild(LX.makeIcon("MenuArrows", { svgClass: "sm" }));
                    const idx = data.head.indexOf(headData);
                    if (this._centered?.indexOf && ((this._centered.indexOf(idx) > -1) || (this._centered.indexOf(headData) > -1))) {
                        th.classList.add("centered");
                    }
                    const menuOptions = [];
                    if (options.columnActions) {
                        for (let action of options.columnActions) {
                            if (!action.name) {
                                console.warn("Invalid column action (missing name):", action);
                                continue;
                            }
                            menuOptions.push({ name: action.name, icon: action.icon, className: action.className, callback: () => {
                                    const colRows = this.data.body.map((row) => [row[idx]]);
                                    const mustRefresh = action.callback(colRows, table);
                                    if (mustRefresh) {
                                        this.refresh();
                                    }
                                } });
                        }
                    }
                    if (this._sortColumns) {
                        if (menuOptions.length > 0) {
                            menuOptions.push(null);
                        }
                        menuOptions.push({ name: "Asc", icon: "ArrowUpZA", callback: sortFn.bind(this, idx, 1) }, { name: "Desc", icon: "ArrowDownZA", callback: sortFn.bind(this, idx, -1) });
                    }
                    if (this._toggleColumns) {
                        if (menuOptions.length > 0) {
                            menuOptions.push(null);
                        }
                        menuOptions.push({
                            name: "Hide", icon: "EyeOff", callback: () => {
                                data.colVisibilityMap[idx] = false;
                                const cells = table.querySelectorAll(`tr > *:nth-child(${idx + this.rowOffsetCount + 1})`);
                                cells.forEach((c) => {
                                    c.style.display = (c.style.display === "none") ? "" : "none";
                                });
                            }
                        });
                    }
                    th.addEventListener('click', (e) => {
                        if (menuOptions.length === 0)
                            return;
                        LX.addDropdownMenu(e.target, menuOptions, { side: "bottom", align: "start" });
                    });
                    hrow.appendChild(th);
                }
                // Add empty header column
                if (options.rowActions) {
                    const th = document.createElement('th');
                    th.className = "sm";
                    hrow.appendChild(th);
                }
                head.appendChild(hrow);
            }
            // Body
            {
                const body = document.createElement('tbody');
                body.className = "lextablebody";
                table.appendChild(body);
                let rIdx = null;
                let eventCatched = false;
                let movePending = null;
                document.addEventListener('mouseup', (e) => {
                    if (rIdx === null)
                        return;
                    document.removeEventListener("mousemove", onMove);
                    const fromRow = table.rows[rIdx];
                    fromRow.dY = 0;
                    fromRow.classList.remove("dragging");
                    Array.from(table.rows).forEach(v => {
                        v.style.transform = ``;
                        v.style.transition = `none`;
                    });
                    LX.flushCss(fromRow);
                    if (movePending) {
                        // Modify inner data first
                        // Origin row should go to the target row, and the rest should be moved up/down
                        const fromIdx = rIdx - 1;
                        const targetIdx = movePending[1] - 1;
                        LX.emitSignal("@on_table_sort", { instance: this, fromIdx, targetIdx });
                        const b = data.body[fromIdx];
                        let targetOffset = 0;
                        if (fromIdx == targetIdx)
                            return;
                        if (fromIdx > targetIdx) // Move up
                         {
                            for (let i = fromIdx; i > targetIdx; --i) {
                                data.body[i] = data.body[i - 1];
                            }
                        }
                        else // Move down
                         {
                            targetOffset = 1;
                            for (let i = fromIdx; i < targetIdx; ++i) {
                                data.body[i] = data.body[i + 1];
                            }
                        }
                        data.body[targetIdx] = b;
                        const parent = movePending[0].parentNode;
                        LX.insertChildAtIndex(parent, movePending[0], targetIdx + targetOffset);
                        movePending = null;
                    }
                    rIdx = null;
                    LX.doAsync(() => {
                        Array.from(table.rows).forEach(v => {
                            v.style.transition = `transform 0.2s ease-in`;
                        });
                    });
                });
                let onMove = (e) => {
                    if (!rIdx)
                        return;
                    const fromRow = table.rows[rIdx];
                    fromRow.dY = fromRow.dY ?? 0;
                    fromRow.dY += e.movementY;
                    fromRow.style.transform = `translateY(${fromRow.dY}px)`;
                };
                for (let r = 0; r < data.body.length; ++r) {
                    const bodyData = data.body[r];
                    if (this.filter) {
                        const filterColIndex = data.head.indexOf(this.filter);
                        if (filterColIndex > -1) {
                            const validRowValue = LX.stripHTML(bodyData[filterColIndex]).toLowerCase();
                            if (!validRowValue.includes(this._currentFilter.toLowerCase())) {
                                continue;
                            }
                        }
                    }
                    if (Object.keys(this.activeCustomFilters).length) {
                        let acfMap = {};
                        this._resetCustomFiltersBtn?.root.classList.remove("hidden");
                        for (let acfValue in this.activeCustomFilters) {
                            const acfName = this.activeCustomFilters[acfValue];
                            acfMap[acfName] = acfMap[acfName] ?? false;
                            const filterColIndex = data.head.indexOf(acfName);
                            if (filterColIndex > -1) {
                                const cellValue = bodyData[filterColIndex];
                                const strippedValue = LX.stripTags(cellValue) ?? cellValue;
                                acfMap[acfName] = acfMap[acfName] || (strippedValue === acfValue);
                            }
                        }
                        const show = Object.values(acfMap).reduce((acc, e) => acc && e, true);
                        if (!show) {
                            continue;
                        }
                    }
                    // Check range/date filters
                    if (this.customFilters) {
                        let acfMap = {};
                        for (let f of this.customFilters) {
                            const acfName = f.name;
                            if (f.type == "range") {
                                acfMap[acfName] = acfMap[acfName] ?? false;
                                const filterColIndex = data.head.indexOf(acfName);
                                if (filterColIndex > -1) {
                                    const validRowValue = parseFloat(bodyData[filterColIndex]);
                                    const min = f.start ?? f.min;
                                    const max = f.end ?? f.max;
                                    acfMap[acfName] = acfMap[acfName] || ((validRowValue >= min) && (validRowValue <= max));
                                }
                            }
                            else if (f.type == "date") {
                                acfMap[acfName] = acfMap[acfName] ?? false;
                                const filterColIndex = data.head.indexOf(acfName);
                                if (filterColIndex > -1) {
                                    if (!f.value) {
                                        acfMap[acfName] = true;
                                        continue;
                                    }
                                    f.value = f.value ?? f.default;
                                    const dateString = bodyData[filterColIndex];
                                    const date = LX.dateFromDateString(dateString);
                                    const minDate = LX.dateFromDateString(f.value[0]);
                                    const maxDate = LX.dateFromDateString(f.value[1]);
                                    acfMap[acfName] = acfMap[acfName] || ((date >= minDate) && (date <= maxDate));
                                }
                            }
                        }
                        const show = Object.values(acfMap).reduce((acc, e) => acc && e, true);
                        if (!show) {
                            continue;
                        }
                    }
                    const row = document.createElement('tr');
                    const rowId = LX.getSupportedDOMName(bodyData.join('-')).substr(0, 32);
                    row.setAttribute("rowId", rowId);
                    if (options.sortable ?? false) {
                        const td = document.createElement('td');
                        td.style.width = "0px";
                        const icon = LX.makeIcon("GripVertical");
                        td.appendChild(icon);
                        icon.draggable = true;
                        icon.addEventListener("dragstart", (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.stopImmediatePropagation();
                            rIdx = row.rowIndex;
                            row.classList.add("dragging");
                            document.addEventListener("mousemove", onMove);
                        }, false);
                        row.addEventListener("mouseenter", function (e) {
                            e.preventDefault();
                            if (rIdx != null && (this.rowIndex != rIdx) && (eventCatched != this.rowIndex)) {
                                eventCatched = this.rowIndex;
                                const fromRow = table.rows[rIdx];
                                const undo = (this.style.transform != ``);
                                if (this.rowIndex > rIdx) {
                                    movePending = [fromRow, undo ? (this.rowIndex - 1) : this.rowIndex];
                                    this.style.transform = undo ? `` : `translateY(-${this.offsetHeight}px)`;
                                }
                                else {
                                    movePending = [fromRow, undo ? (this.rowIndex + 1) : (this.rowIndex)];
                                    this.style.transform = undo ? `` : `translateY(${this.offsetHeight}px)`;
                                }
                                LX.doAsync(() => {
                                    eventCatched = false;
                                });
                            }
                        });
                        row.appendChild(td);
                    }
                    if (options.selectable ?? false) {
                        const td = document.createElement('td');
                        const input = document.createElement('input');
                        input.type = "checkbox";
                        input.className = "lexcheckbox accent";
                        input.checked = data.checkMap[rowId];
                        td.appendChild(input);
                        input.addEventListener('change', function () {
                            data.checkMap[rowId] = this.checked;
                            const headInput = table.querySelector("thead input[type='checkbox']");
                            console.assert(headInput, "Header checkbox not found!");
                            if (!this.checked) {
                                headInput.checked = data.checkMap[":root"] = false;
                            }
                            else {
                                const rowInputs = Array.from(table.querySelectorAll("tbody input[type='checkbox']"));
                                const uncheckedRowInputs = rowInputs.filter((i) => { return !i.checked; });
                                if (!uncheckedRowInputs.length) {
                                    headInput.checked = data.checkMap[":root"] = true;
                                }
                            }
                        });
                        row.appendChild(td);
                    }
                    for (let idx = 0; idx < bodyData.length; ++idx) {
                        const rowData = bodyData[idx];
                        const td = document.createElement('td');
                        td.innerHTML = `${rowData}`;
                        const headData = data.head[idx];
                        if (this._centered?.indexOf && ((this._centered.indexOf(idx) > -1) || (this._centered.indexOf(headData) > -1))) {
                            td.classList.add("centered");
                        }
                        row.appendChild(td);
                    }
                    if (options.rowActions) {
                        const td = document.createElement('td');
                        td.style.width = "0px";
                        const buttons = document.createElement('div');
                        buttons.className = "lextablebuttons";
                        td.appendChild(buttons);
                        for (const action of options.rowActions) {
                            let button = null;
                            if (action == "delete") {
                                button = LX.makeIcon("Trash3", { title: "Delete Row" });
                                button.addEventListener('click', function () {
                                    // Don't need to refresh table..
                                    data.body.splice(r, 1);
                                    row.remove();
                                });
                            }
                            else if (action == "menu") {
                                button = LX.makeIcon("EllipsisVertical", { title: "Menu" });
                                button.addEventListener('click', function (e) {
                                    if (!options.onMenuAction) {
                                        return;
                                    }
                                    const menuOptions = options.onMenuAction(r, data);
                                    console.assert(menuOptions.length, "Add items to the Menu Action Dropdown!");
                                    LX.addDropdownMenu(e.target, menuOptions, { side: "bottom", align: "end" });
                                });
                            }
                            else // custom actions
                             {
                                console.assert(action.constructor == Object);
                                button = LX.makeIcon(action.icon, { title: action.title });
                                if (action.callback) {
                                    button.addEventListener('click', (e) => {
                                        const mustRefresh = action.callback(bodyData, table, e);
                                        if (mustRefresh) {
                                            this.refresh();
                                        }
                                    });
                                }
                            }
                            console.assert(button);
                            buttons.appendChild(button);
                        }
                        row.appendChild(td);
                    }
                    body.appendChild(row);
                }
                if (body.childNodes.length == 0) {
                    const row = document.createElement('tr');
                    const td = document.createElement('td');
                    td.setAttribute("colspan", data.head.length + this.rowOffsetCount + 1); // +1 for rowActions
                    td.className = "empty-row";
                    td.innerHTML = "No results.";
                    row.appendChild(td);
                    body.appendChild(row);
                }
            }
            for (const v in data.colVisibilityMap) {
                const idx = parseInt(v);
                if (!data.colVisibilityMap[idx]) {
                    const cells = table.querySelectorAll(`tr > *:nth-child(${idx + this.rowOffsetCount + 1})`);
                    cells.forEach((c) => {
                        c.style.display = (c.style.display === "none") ? "" : "none";
                    });
                }
            }
        };
        this.refresh();
        LX.doAsync(this.onResize.bind(this));
    }
    getSelectedRows() {
        const selectedRows = [];
        for (const row of this.data.body) {
            const rowId = LX.getSupportedDOMName(row.join('-')).substr(0, 32);
            if (this.data.checkMap[rowId] === true) {
                selectedRows.push(row);
            }
        }
        return selectedRows;
    }
    _setCentered(v) {
        if (v.constructor == Boolean) {
            const container = this.root.querySelector(".lextable");
            container.classList.toggle("centered", v);
        }
        else {
            // Make sure this is an array containing which columns have
            // to be centered
            v = Array.isArray(v) ? v : [v];
        }
        this._centered = v;
        this.refresh();
    }
}
LX.Table = Table;

// FileInput.ts @jxarco
/**
 * @class FileInput
 * @description FileInput Component
 */
class FileInput extends BaseComponent {
    constructor(name, callback, options = {}) {
        super(ComponentType.FILE, name, null, options);
        let local = options.local ?? true;
        let type = options.type ?? 'text';
        let read = options.read ?? true;
        this.onResize = (rect) => {
            const realNameWidth = (this.root.domName?.style.width ?? "0px");
            input.style.width = `calc( 100% - ${realNameWidth})`;
        };
        // Create hidden input
        let input = document.createElement('input');
        input.className = "lexfileinput";
        input.type = 'file';
        input.disabled = options.disabled ?? false;
        this.root.appendChild(input);
        if (options.placeholder) {
            input.placeholder = options.placeholder;
        }
        input.addEventListener('change', function (e) {
            const files = e.target.files;
            if (!files.length)
                return;
            if (read) {
                if (options.onBeforeRead)
                    options.onBeforeRead();
                const reader = new FileReader();
                if (type === 'text')
                    reader.readAsText(files[0]);
                else if (type === 'buffer')
                    reader.readAsArrayBuffer(files[0]);
                else if (type === 'bin')
                    reader.readAsBinaryString(files[0]);
                else if (type === 'url')
                    reader.readAsDataURL(files[0]);
                reader.onload = e => { callback.call(this, e.target?.result, files[0]); };
            }
            else
                callback(files[0]);
        });
        input.addEventListener('cancel', function (e) {
            callback(null);
        });
        if (local) {
            let settingsDialog = null;
            const settingButton = new Button(null, "", () => {
                if (settingsDialog) {
                    return;
                }
                settingsDialog = new LX.Dialog("Load Settings", (p) => {
                    p.addSelect("Type", ['text', 'buffer', 'bin', 'url'], type, (v) => { type = v; });
                    p.addButton(null, "Reload", () => { input.dispatchEvent(new Event('change')); });
                }, { onclose: (root) => { root.remove(); settingsDialog = null; } });
            }, { skipInlineCount: true, title: "Settings", disabled: options.disabled, icon: "Settings" });
            this.root.appendChild(settingButton.root);
        }
        LX.doAsync(this.onResize.bind(this));
    }
}
LX.FileInput = FileInput;

// DatePicker.ts @jxarco
/**
 * @class DatePicker
 * @description DatePicker Component
 */
class DatePicker extends BaseComponent {
    calendar;
    _popover = undefined;
    constructor(name, dateValue, callback, options = {}) {
        super(ComponentType.DATE, name, null, options);
        const dateAsRange = (dateValue?.constructor === Array);
        if (!dateAsRange && options.today) {
            const date = new Date();
            dateValue = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
        }
        this.onGetValue = () => {
            return dateValue;
        };
        this.onSetValue = (newValue, skipCallback, event) => {
            if (!dateAsRange) {
                this.calendar.fromDateString(newValue);
            }
            dateValue = newValue;
            refresh(this.calendar.getFullDate());
            if (!skipCallback) {
                this._trigger(new IEvent(name, newValue, event), callback);
            }
        };
        this.onResize = (rect) => {
            const realNameWidth = (this.root.domName?.style.width ?? "0px");
            container.style.width = `calc( 100% - ${realNameWidth})`;
        };
        const container = LX.makeContainer(["auto", "auto"], "lexdate flex flex-row");
        this.root.appendChild(container);
        if (!dateAsRange) {
            this.calendar = new Calendar(dateValue, {
                onChange: (date) => {
                    const newDateString = `${date.day}/${date.month}/${date.year}`;
                    this.set(newDateString);
                },
                ...options
            });
        }
        else {
            this.calendar = new CalendarRange(dateValue, {
                onChange: (dateRange) => {
                    this.set(dateRange);
                },
                ...options
            });
        }
        const refresh = (currentDate) => {
            const emptyDate = !!currentDate;
            container.innerHTML = "";
            currentDate = currentDate ?? "Pick a date";
            const dts = currentDate.split(" to ");
            const d0 = dateAsRange ? dts[0] : currentDate;
            const calendarIcon = LX.makeIcon("Calendar");
            const calendarButton = new Button(null, d0, () => {
                this._popover = new Popover(calendarButton.root, [this.calendar]);
            }, { buttonClass: `flex flex-row px-3 ${emptyDate ? "" : "fg-tertiary"} justify-between` });
            calendarButton.root.querySelector("button").appendChild(calendarIcon);
            calendarButton.root.style.width = "100%";
            container.appendChild(calendarButton.root);
            if (dateAsRange) {
                const arrowRightIcon = LX.makeIcon("ArrowRight");
                LX.makeContainer(["32px", "auto"], "content-center", arrowRightIcon.innerHTML, container);
                const d1 = dts[1];
                const calendarIcon = LX.makeIcon("Calendar");
                const calendarButton = new Button(null, d1, () => {
                    this._popover = new Popover(calendarButton.root, [this.calendar]);
                }, { buttonClass: `flex flex-row px-3 ${emptyDate ? "" : "fg-tertiary"} justify-between` });
                calendarButton.root.querySelector("button").appendChild(calendarIcon);
                calendarButton.root.style.width = "100%";
                container.appendChild(calendarButton.root);
            }
        };
        if (dateValue) {
            refresh(this.calendar.getFullDate());
        }
        else {
            refresh();
        }
        LX.doAsync(this.onResize.bind(this));
    }
}
LX.Calendar = Calendar;
LX.CalendarRange = CalendarRange;
LX.DatePicker = DatePicker;

// Rate.ts @jxarco
/**
 * @class Rate
 * @description Rate Component
 */
class Rate extends BaseComponent {
    constructor(name, value, callback, options = {}) {
        const allowHalf = options.allowHalf ?? false;
        if (!allowHalf) {
            value = Math.floor(value);
        }
        super(ComponentType.RATE, name, value, options);
        this.onGetValue = () => {
            return value;
        };
        this.onSetValue = (newValue, skipCallback, event) => {
            value = newValue;
            _updateStars(value);
            if (!skipCallback) {
                this._trigger(new IEvent(name, newValue, event), callback);
            }
        };
        this.onResize = (rect) => {
            const realNameWidth = (this.root.domName?.style.width ?? "0px");
            container.style.width = `calc( 100% - ${realNameWidth})`;
        };
        const container = document.createElement('div');
        container.className = "lexrate relative";
        this.root.appendChild(container);
        const starsContainer = LX.makeContainer(["fit-content", "auto"], "flex flex-row gap-1", "", container);
        const filledStarsContainer = LX.makeContainer(["fit-content", "auto"], "absolute top-0 flex flex-row gap-1 pointer-events-none", "", container);
        const halfStarsContainer = LX.makeContainer(["fit-content", "auto"], "absolute top-0 flex flex-row gap-1 pointer-events-none", "", container);
        starsContainer.addEventListener("mousemove", (e) => {
            const star = e.target;
            const idx = star.dataset["idx"];
            if (idx !== undefined) {
                const rect = star.getBoundingClientRect();
                const half = allowHalf && e.offsetX < (rect.width * 0.5);
                _updateStars(idx - (half ? 0.5 : 0.0));
            }
        }, false);
        starsContainer.addEventListener("mouseleave", (e) => {
            _updateStars(value);
        }, false);
        // Create all layers of stars
        for (let i = 0; i < 5; ++i) {
            const starIcon = LX.makeIcon("Star", { svgClass: `lg fill-current fg-secondary` });
            starIcon.dataset["idx"] = (i + 1);
            starsContainer.appendChild(starIcon);
            starIcon.addEventListener("click", (e) => {
                const star = e.target;
                const rect = star.getBoundingClientRect();
                const half = allowHalf && e.offsetX < (rect.width * 0.5);
                this.set(parseFloat(star.dataset["idx"]) - (half ? 0.5 : 0.0));
            }, false);
            const filledStarIcon = LX.makeIcon("Star", { svgClass: `lg fill-current fg-yellow-500` });
            filledStarsContainer.appendChild(filledStarIcon);
            const halfStarIcon = LX.makeIcon("StarHalf", { svgClass: `lg fill-current fg-yellow-500` });
            halfStarsContainer.appendChild(halfStarIcon);
        }
        const _updateStars = (v) => {
            for (let i = 0; i < 5; ++i) {
                const filled = (v > (i + 0.5));
                const starIcon = filledStarsContainer.childNodes[i];
                const halfStarIcon = halfStarsContainer.childNodes[i];
                if (filled) {
                    starIcon.style.opacity = 1;
                }
                else {
                    starIcon.style.opacity = 0;
                    const halfFilled = allowHalf && (v > i);
                    if (halfFilled) {
                        halfStarIcon.style.opacity = 1;
                    }
                    else {
                        halfStarIcon.style.opacity = 0;
                    }
                }
            }
        };
        _updateStars(value);
        LX.doAsync(this.onResize.bind(this));
    }
}
LX.Rate = Rate;

// TabSections.ts @jxarco
/**
 * @class TabSections
 * @description TabSections Component
 */
class TabSections extends BaseComponent {
    tabs;
    tabDOMs;
    constructor(name, tabs, options = {}) {
        options.hideName = true;
        super(ComponentType.TABS, name, null, options);
        if (tabs.constructor != Array) {
            throw ("Param @tabs must be an Array!");
        }
        if (!tabs.length) {
            throw ("Tab list cannot be empty!");
        }
        const vertical = options.vertical ?? true;
        const showNames = !vertical && (options.showNames ?? false);
        this.tabDOMs = {};
        let container = document.createElement('div');
        container.className = "lextabscontainer";
        if (!vertical) {
            container.className += " horizontal";
        }
        let tabContainer = document.createElement("div");
        tabContainer.className = "tabs";
        container.appendChild(tabContainer);
        this.root.appendChild(container);
        // Check at least 1 is selected
        if (tabs.findIndex(e => e.selected === true) < 0) {
            tabs[0].selected = true;
        }
        for (let tab of tabs) {
            console.assert(tab.name);
            let tabEl = document.createElement("div");
            tabEl.className = "lextab " + ((tab.selected ?? false) ? "selected" : "");
            tabEl.innerHTML = (showNames ? tab.name : "");
            tabEl.appendChild(LX.makeIcon(tab.icon ?? "Hash", { title: tab.name, iconClass: tab.iconClass, svgClass: tab.svgClass }));
            this.tabDOMs[tab.name] = tabEl;
            let infoContainer = document.createElement("div");
            infoContainer.id = tab.name.replace(/\s/g, '');
            infoContainer.className = "components";
            infoContainer.toggleAttribute("hidden", !(tab.selected ?? false));
            container.appendChild(infoContainer);
            tabEl.addEventListener("click", e => {
                // Change selected tab
                tabContainer.querySelectorAll(".lextab").forEach(e => { e.classList.remove("selected"); });
                tabEl.classList.add("selected");
                // Hide all tabs content
                container.querySelectorAll(".components").forEach(e => { e.toggleAttribute("hidden", true); });
                // Show tab content
                const el = container.querySelector('#' + infoContainer.id);
                el?.toggleAttribute("hidden");
                if (tab.onSelect) {
                    tab.onSelect(this, infoContainer);
                }
            });
            tabContainer.appendChild(tabEl);
            if (tab.onCreate) {
                // Push to tab space
                const creationPanel = new LX.Panel();
                creationPanel.queue(infoContainer);
                tab.onCreate.call(this, creationPanel, infoContainer);
                creationPanel.clearQueue();
            }
        }
        this.tabs = tabs;
    }
    select(name) {
        const tabEl = this.tabDOMs[name];
        if (!tabEl) {
            return;
        }
        tabEl.click();
    }
}
LX.TabSections = TabSections;

// NodeTree.ts @jxarco
/**
 * @class NodeTree
 */
class NodeTree {
    domEl;
    data;
    onevent;
    options;
    selected = [];
    _forceClose = false;
    constructor(domEl, data, options = {}) {
        this.domEl = domEl;
        this.data = data;
        this.onevent = options.onevent;
        this.options = options;
        if (data.constructor === Object) {
            this._createItem(null, data);
        }
        else {
            for (let d of data) {
                this._createItem(null, d);
            }
        }
    }
    _createItem(parent, node, level = 0, selectedId) {
        const that = this;
        const nodeFilterInput = this.domEl.querySelector(".lexnodetreefilter");
        node.children = node.children ?? [];
        if (nodeFilterInput && nodeFilterInput.value != "" && !node.id.includes(nodeFilterInput.value)) {
            for (var i = 0; i < node.children.length; ++i) {
                this._createItem(node, node.children[i], level + 1, selectedId);
            }
            return;
        }
        const list = this.domEl.querySelector('ul');
        node.visible = node.visible ?? true;
        node.parent = parent;
        let isParent = node.children.length > 0;
        let isSelected = this.selected.indexOf(node) > -1 || node.selected;
        if (this.options.onlyFolders) {
            let hasFolders = false;
            node.children.forEach((c) => { hasFolders = hasFolders || (c.type == 'folder'); });
            isParent = !!hasFolders;
        }
        let item = document.createElement('li');
        item.className = "lextreeitem " + "datalevel" + level + (isParent ? " parent" : "") + (isSelected ? " selected" : "");
        item.id = LX.getSupportedDOMName(node.id);
        item.tabIndex = "0";
        item.treeData = node;
        // Select hierarchy icon
        let icon = (this.options.skipDefaultIcon ?? true) ? null : "Dot"; // Default: no childs
        if (isParent) {
            icon = node.closed ? "Right" : "Down";
        }
        if (icon) {
            item.appendChild(LX.makeIcon(icon, { iconClass: "hierarchy", svgClass: "xs" }));
        }
        // Add display icon
        icon = node.icon;
        // Process icon
        if (icon) {
            if (!node.icon.includes('.')) // Not a file
             {
                const classes = node.icon.split(' ');
                const nodeIcon = LX.makeIcon(classes[0], { iconClass: "tree-item-icon mr-2", svgClass: "md" + (classes.length > 1 ? ` ${classes.slice(0).join(' ')}` : '') });
                item.appendChild(nodeIcon);
            }
            else // an image..
             {
                const rootPath = "https://raw.githubusercontent.com/jxarco/lexgui.js/master/";
                item.innerHTML += "<img src='" + (rootPath + node.icon) + "'>";
            }
        }
        item.innerHTML += (node.rename ? "" : node.id);
        item.setAttribute('draggable', true);
        item.style.paddingLeft = ((3 + (level + 1) * 15)) + "px";
        list.appendChild(item);
        // Callbacks
        item.addEventListener("click", (e) => {
            if (handled) {
                handled = false;
                return;
            }
            if (!e.shiftKey) {
                list.querySelectorAll("li").forEach((e) => { e.classList.remove('selected'); });
                this.selected.length = 0;
            }
            // Add or remove
            const idx = this.selected.indexOf(node);
            if (idx > -1) {
                item.classList.remove('selected');
                this.selected.splice(idx, 1);
            }
            else {
                item.classList.add('selected');
                this.selected.push(node);
            }
            // Only Show children...
            if (isParent && node.id.length > 1 /* Strange case... */) {
                node.closed = false;
                if (that.onevent) {
                    const event = new TreeEvent(TreeEvent.NODE_CARETCHANGED, node, node.closed, e);
                    that.onevent(event);
                }
                that.frefresh(node.id);
            }
            if (that.onevent) {
                const event = new TreeEvent(TreeEvent.NODE_SELECTED, node, this.selected, e);
                event.multiple = e.shiftKey;
                that.onevent(event);
            }
        });
        item.addEventListener("dblclick", function (e) {
            if (that.options.rename ?? true) {
                // Trigger rename
                node.rename = true;
                that.refresh();
            }
            if (that.onevent) {
                const event = new TreeEvent(TreeEvent.NODE_DBLCLICKED, node, null, e);
                that.onevent(event);
            }
        });
        item.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            if (!that.onevent) {
                return;
            }
            const event = new TreeEvent(TreeEvent.NODE_CONTEXTMENU, node, this.selected, e);
            event.multiple = this.selected.length > 1;
            LX.addContextMenu(event.multiple ? "Selected Nodes" : event.node.id, event.event, (m) => {
                event.panel = m;
            });
            that.onevent(event);
            if (this.options.addDefault ?? false) {
                if (event.panel.items) {
                    event.panel.add("");
                }
                event.panel.add("Select Children", () => {
                    const selectChildren = (n) => {
                        if (n.closed) {
                            return;
                        }
                        for (let child of n.children ?? []) {
                            if (!child) {
                                continue;
                            }
                            let nodeItem = this.domEl.querySelector('#' + child.id);
                            nodeItem.classList.add("selected");
                            this.selected.push(child);
                            selectChildren(child);
                        }
                    };
                    this.domEl.querySelectorAll(".selected").forEach((i) => i.classList.remove("selected"));
                    this.selected.length = 0;
                    // Add childs of the clicked node
                    selectChildren(node);
                });
                event.panel.add("Delete", { callback: () => {
                        const ok = that.deleteNode(node);
                        if (ok && that.onevent) {
                            const event = new TreeEvent(TreeEvent.NODE_DELETED, node, [node], null);
                            that.onevent(event);
                        }
                        this.refresh();
                    } });
            }
        });
        item.addEventListener("keydown", (e) => {
            if (node.rename) {
                return;
            }
            e.preventDefault();
            if (e.key == "Delete") {
                const nodesDeleted = [];
                for (let _node of this.selected) {
                    if (that.deleteNode(_node)) {
                        nodesDeleted.push(_node);
                    }
                }
                // Send event now so we have the info in selected array..
                if (nodesDeleted.length && that.onevent) {
                    const event = new TreeEvent(TreeEvent.NODE_DELETED, node, nodesDeleted, e);
                    event.multiple = nodesDeleted.length > 1;
                    that.onevent(event);
                }
                this.selected.length = 0;
                this.refresh();
            }
            else if (e.key == "ArrowUp" || e.key == "ArrowDown") // Unique or zero selected
             {
                var selected = this.selected.length > 1 ? (e.key == "ArrowUp" ? this.selected.shift() : this.selected.pop()) : this.selected[0];
                var el = this.domEl.querySelector("#" + LX.getSupportedDOMName(selected.id));
                var sibling = e.key == "ArrowUp" ? el.previousSibling : el.nextSibling;
                if (sibling) {
                    sibling.click();
                }
            }
        });
        // Node rename
        const nameInput = document.createElement("input");
        nameInput.toggleAttribute("hidden", !node.rename);
        nameInput.className = "bg-none";
        nameInput.value = node.id;
        item.appendChild(nameInput);
        if (node.rename) {
            item.classList.add('selected');
            nameInput.focus();
        }
        nameInput.addEventListener("keyup", function (e) {
            if (e.key == "Enter") {
                this.value = this.value.replace(/\s/g, '_');
                if (that.onevent) {
                    const event = new TreeEvent(TreeEvent.NODE_RENAMED, node, this.value, e);
                    that.onevent(event);
                }
                node.id = LX.getSupportedDOMName(this.value);
                delete node.rename;
                that.frefresh(node.id);
                list.querySelector("#" + node.id).classList.add('selected');
            }
            else if (e.key == "Escape") {
                delete node.rename;
                that.frefresh(node.id);
            }
        });
        nameInput.addEventListener("blur", function (e) {
            delete node.rename;
            that.refresh();
        });
        if (this.options.draggable ?? true) {
            // Drag nodes
            if (parent) // Root doesn't move!
             {
                item.addEventListener("dragstart", (e) => {
                    window.__tree_node_dragged = node;
                });
            }
            /* Events fired on other node items */
            item.addEventListener("dragover", (e) => {
                e.preventDefault(); // allow drop
            }, false);
            item.addEventListener("dragenter", (e) => {
                e.target.classList.add("draggingover");
            });
            item.addEventListener("dragleave", (e) => {
                e.target.classList.remove("draggingover");
            });
            item.addEventListener("drop", (e) => {
                e.preventDefault(); // Prevent default action (open as link for some elements)
                let dragged = window.__tree_node_dragged;
                if (!dragged) {
                    return;
                }
                let target = node;
                // Can't drop to same node
                if (dragged.id == target.id) {
                    console.warn("Cannot parent node to itself!");
                    return;
                }
                // Can't drop to child node
                const isChild = function (newParent, node) {
                    var result = false;
                    for (var c of node.children) {
                        if (c.id == newParent.id)
                            return true;
                        result = result || isChild(newParent, c);
                    }
                    return result;
                };
                if (isChild(target, dragged)) {
                    console.warn("Cannot parent node to a current child!");
                    return;
                }
                // Trigger node dragger event
                if (that.onevent) {
                    const event = new TreeEvent(TreeEvent.NODE_DRAGGED, dragged, target, e);
                    that.onevent(event);
                }
                const index = dragged.parent.children.findIndex((n) => n.id == dragged.id);
                const removed = dragged.parent.children.splice(index, 1);
                target.children.push(removed[0]);
                that.refresh();
                delete window.__tree_node_dragged;
            });
        }
        let handled = false;
        // Show/hide children
        if (isParent) {
            item.querySelector('a.hierarchy').addEventListener("click", function (e) {
                handled = true;
                e.stopImmediatePropagation();
                e.stopPropagation();
                if (e.altKey) {
                    const _closeNode = function (node) {
                        node.closed = !node.closed;
                        for (var c of node.children) {
                            _closeNode(c);
                        }
                    };
                    _closeNode(node);
                }
                else {
                    node.closed = !node.closed;
                }
                if (that.onevent) {
                    const event = new TreeEvent(TreeEvent.NODE_CARETCHANGED, node, node.closed, e);
                    that.onevent(event);
                }
                that.frefresh(node.id);
            });
        }
        // Add button icons
        const inputContainer = document.createElement("div");
        item.appendChild(inputContainer);
        if (node.actions) {
            for (let i = 0; i < node.actions.length; ++i) {
                const action = node.actions[i];
                const actionBtn = new Button(null, "", (swapValue, event) => {
                    event.stopPropagation();
                    if (action.callback) {
                        action.callback(node, swapValue, event);
                    }
                }, { icon: action.icon, swap: action.swap, title: action.name, hideName: true, className: "p-0 m-0", buttonClass: "p-0 m-0 bg-none no-h" });
                actionBtn.root.style.minWidth = "fit-content";
                actionBtn.root.style.margin = "0"; // adding classes does not work
                actionBtn.root.style.padding = "0"; // adding classes does not work
                const _btn = actionBtn.root.querySelector("button");
                _btn.style.minWidth = "fit-content";
                _btn.style.margin = "0"; // adding classes does not work
                _btn.style.padding = "0"; // adding classes does not work
                inputContainer.appendChild(actionBtn.root);
            }
        }
        if (!(node.skipVisibility ?? false)) {
            const visibilityBtn = new Button(null, "", (swapValue, e) => {
                e.stopPropagation();
                node.visible = node.visible === undefined ? false : !node.visible;
                // Trigger visibility event
                if (that.onevent) {
                    const event = new TreeEvent(TreeEvent.NODE_VISIBILITY, node, node.visible, e);
                    that.onevent(event);
                }
            }, { icon: node.visible ? "Eye" : "EyeOff", swap: node.visible ? "EyeOff" : "Eye", title: "Toggle visible", className: "p-0 m-0", buttonClass: "bg-none" });
            inputContainer.appendChild(visibilityBtn.root);
        }
        const _hasChild = function (node, id) {
            if (node.id == id)
                return true;
            let found = false;
            for (var c of (node?.children ?? [])) {
                found = found || _hasChild(c, id);
            }
            return found;
        };
        const exists = _hasChild(node, selectedId);
        if (node.closed && !exists) {
            return;
        }
        for (var i = 0; i < node.children.length; ++i) {
            let child = node.children[i];
            if (this.options.onlyFolders && child.type != 'folder') {
                continue;
            }
            this._createItem(node, child, level + 1, selectedId);
        }
    }
    refresh(newData, selectedId) {
        this.data = newData ?? this.data;
        this.domEl.querySelector("ul").innerHTML = "";
        if (this.data.constructor === Object) {
            this._createItem(null, this.data, 0, selectedId);
        }
        else {
            for (let d of this.data) {
                this._createItem(null, d, 0, selectedId);
            }
        }
    }
    /* Refreshes the tree and focuses current element */
    frefresh(id) {
        this.refresh();
        var el = this.domEl.querySelector(`#${id}`);
        if (el) {
            el.focus();
        }
    }
    select(id) {
        const nodeFilter = this.domEl.querySelector(".lexnodetreefilter");
        if (nodeFilter) {
            nodeFilter.value = "";
        }
        this.refresh(null, id);
        this.domEl.querySelectorAll(".selected").forEach((i) => i.classList.remove("selected"));
        // Unselect
        if (!id) {
            this.selected.length = 0;
            return;
        }
        // Element should exist, since tree was refreshed to show it
        const el = this.domEl.querySelector("#" + id);
        console.assert(el, "NodeTree: Can't select node " + id);
        el.classList.add("selected");
        this.selected = [el.treeData];
        el.focus();
    }
    deleteNode(node) {
        const dataAsArray = (this.data.constructor === Array);
        // Can be either Array or Object type data
        if (node.parent) {
            let childs = node.parent.children;
            const index = childs.indexOf(node);
            childs.splice(index, 1);
        }
        else {
            if (dataAsArray) {
                const index = this.data.indexOf(node);
                console.assert(index > -1, "NodeTree: Can't delete root node " + node.id + " from data array!");
                this.data.splice(index, 1);
            }
            else {
                console.warn("NodeTree: Can't delete root node from object data!");
                return false;
            }
        }
        return true;
    }
}
LX.NodeTree = NodeTree;
/**
 * @class Tree
 * @description Tree Component
 */
class Tree extends BaseComponent {
    innerTree;
    constructor(name, data, options = {}) {
        options.hideName = true;
        super(ComponentType.TREE, name, null, options);
        let container = document.createElement('div');
        container.className = "lextree";
        this.root.appendChild(container);
        if (name) {
            let title = document.createElement('span');
            title.innerHTML = name;
            container.appendChild(title);
        }
        let toolsDiv = document.createElement('div');
        toolsDiv.className = "lextreetools";
        if (!name) {
            toolsDiv.className += " notitle";
        }
        // Tree icons
        if (options.icons) {
            for (let data of options.icons) {
                const iconEl = LX.makeIcon(data.icon, { title: data.name });
                iconEl.addEventListener("click", data.callback);
                toolsDiv.appendChild(iconEl);
            }
        }
        // Node filter
        options.filter = options.filter ?? true;
        let nodeFilterInput = null;
        if (options.filter) {
            nodeFilterInput = document.createElement("input");
            nodeFilterInput.className = "lexnodetreefilter";
            nodeFilterInput.setAttribute("placeholder", "Filter..");
            nodeFilterInput.style.width = "100%";
            nodeFilterInput.addEventListener('input', () => {
                this.innerTree.refresh();
            });
            let searchIcon = LX.makeIcon("Search");
            toolsDiv.appendChild(nodeFilterInput);
            toolsDiv.appendChild(searchIcon);
        }
        if (options.icons || options.filter) {
            container.appendChild(toolsDiv);
        }
        // Tree
        let list = document.createElement('ul');
        list.addEventListener("contextmenu", function (e) {
            e.preventDefault();
        });
        container.appendChild(list);
        this.innerTree = new NodeTree(container, data, options);
    }
}
LX.Tree = Tree;

// Counter.ts @jxarco
/**
 * @class Counter
 * @description Counter Component
 */
class Counter extends BaseComponent {
    constructor(name, value, callback, options = {}) {
        super(ComponentType.COUNTER, name, value, options);
        this.onGetValue = () => {
            return counterText.count;
        };
        this.onSetValue = (newValue, skipCallback, event) => {
            newValue = LX.clamp(newValue, min, max);
            counterText.count = newValue;
            counterText.innerHTML = newValue;
            if (!skipCallback) {
                this._trigger(new IEvent(name, newValue, event), callback);
            }
        };
        const min = options.min ?? 0;
        const max = options.max ?? 100;
        const step = options.step ?? 1;
        const container = document.createElement('div');
        container.className = "lexcounter";
        this.root.appendChild(container);
        const substrButton = new Button(null, "", (value, e) => {
            let mult = step ?? 1;
            if (e.shiftKey)
                mult *= 10;
            this.set(counterText.count - mult, false, e);
        }, { skipInlineCount: true, title: "Minus", icon: "Minus" });
        container.appendChild(substrButton.root);
        const containerBox = document.createElement('div');
        containerBox.className = "lexcounterbox";
        container.appendChild(containerBox);
        const counterText = document.createElement('span');
        counterText.className = "lexcountervalue";
        counterText.innerHTML = value;
        counterText.count = value;
        containerBox.appendChild(counterText);
        if (options.label) {
            const counterLabel = document.createElement('span');
            counterLabel.className = "lexcounterlabel";
            counterLabel.innerHTML = options.label;
            containerBox.appendChild(counterLabel);
        }
        const addButton = new Button(null, "", (value, e) => {
            let mult = step ?? 1;
            if (e.shiftKey)
                mult *= 10;
            this.set(counterText.count + mult, false, e);
        }, { skipInlineCount: true, title: "Plus", icon: "Plus" });
        container.appendChild(addButton.root);
    }
}
LX.Counter = Counter;

// Button.ts @jxarco
/**
 * @class Progress
 * @description Progress Component
 */
class Progress extends BaseComponent {
    constructor(name, value, options = {}) {
        super(ComponentType.PROGRESS, name, value, options);
        this.onGetValue = () => {
            return progress.value;
        };
        this.onSetValue = (newValue, skipCallback, event) => {
            newValue = LX.clamp(newValue, progress.min, progress.max);
            this.root.querySelector("meter").value = newValue;
            _updateColor();
            if (this.root.querySelector("span")) {
                this.root.querySelector("span").innerText = newValue;
            }
            if (!skipCallback) {
                this._trigger(new IEvent(name, newValue, event), options.callback);
            }
        };
        this.onResize = (rect) => {
            const realNameWidth = (this.root.domName?.style.width ?? "0px");
            container.style.width = `calc( 100% - ${realNameWidth})`;
        };
        const container = document.createElement('div');
        container.className = "lexprogress";
        this.root.appendChild(container);
        // add slider (0-1 if not specified different )
        let progress = document.createElement('meter');
        progress.id = "lexprogressbar-" + name;
        progress.className = "lexprogressbar";
        progress.step = "any";
        progress.min = options.min ?? 0;
        progress.max = options.max ?? 1;
        progress.low = options.low ?? progress.low;
        progress.high = options.high ?? progress.high;
        progress.optimum = options.optimum ?? progress.optimum;
        progress.value = value;
        container.appendChild(progress);
        const _updateColor = () => {
            let backgroundColor = LX.getThemeColor("global-selected");
            if (progress.low != undefined && progress.value < progress.low) {
                backgroundColor = LX.getThemeColor("global-color-error");
            }
            else if (progress.high != undefined && progress.value < progress.high) {
                backgroundColor = LX.getThemeColor("global-color-warning");
            }
            progress.style.background = `color-mix(in srgb, ${backgroundColor} 20%, transparent)`;
        };
        if (options.showValue) {
            const oldSpan = document.getElementById('progressvalue-' + name);
            if (oldSpan) {
                oldSpan.remove();
            }
            let span = document.createElement("span");
            span.id = "progressvalue-" + name;
            span.style.padding = "0px 5px";
            span.innerText = value;
            container.appendChild(span);
        }
        if (options.editable ?? false) {
            progress.classList.add("editable");
            let innerMouseDown = (e) => {
                var doc = this.root.ownerDocument;
                doc.addEventListener('mousemove', innerMouseMove);
                doc.addEventListener('mouseup', innerMouseUp);
                document.body.classList.add('noevents');
                progress.classList.add("grabbing");
                e.stopImmediatePropagation();
                e.stopPropagation();
                const rect = progress.getBoundingClientRect();
                const newValue = LX.round(LX.remapRange(e.offsetX, 0, rect.width, progress.min, progress.max));
                this.set(newValue, false, e);
            };
            let innerMouseMove = (e) => {
                let dt = e.movementX;
                if (dt != 0) {
                    const rect = progress.getBoundingClientRect();
                    const newValue = LX.round(LX.remapRange(e.offsetX - rect.x, 0, rect.width, progress.min, progress.max));
                    this.set(newValue, false, e);
                }
                e.stopPropagation();
                e.preventDefault();
            };
            let innerMouseUp = (e) => {
                var doc = this.root.ownerDocument;
                doc.removeEventListener('mousemove', innerMouseMove);
                doc.removeEventListener('mouseup', innerMouseUp);
                document.body.classList.remove('noevents');
                progress.classList.remove("grabbing");
            };
            progress.addEventListener("mousedown", innerMouseDown);
        }
        _updateColor();
        LX.doAsync(this.onResize.bind(this));
    }
}
LX.Progress = Progress;

// OTPInput.ts @jxarco
/**
 * @class OTPInput
 * @description OTPInput Component
 */
class OTPInput extends BaseComponent {
    constructor(name, value, callback, options = {}) {
        const pattern = options.pattern ?? "xxx-xxx";
        const patternSize = (pattern.match(/x/g) || []).length;
        value = String(value);
        if (!value.length) {
            value = "x".repeat(patternSize);
        }
        super(ComponentType.OTP, name, value, options);
        this.onGetValue = () => {
            return +value;
        };
        this.onSetValue = (newValue, skipCallback, event) => {
            value = newValue;
            _refreshInput(value);
            if (!skipCallback) {
                this._trigger(new IEvent(name, +newValue, event), callback);
            }
        };
        this.onResize = (rect) => {
            const realNameWidth = (this.root.domName?.style.width ?? "0px");
            container.style.width = `calc( 100% - ${realNameWidth})`;
        };
        this.disabled = options.disabled ?? false;
        const container = document.createElement('div');
        container.className = "lexotp flex flex-row items-center";
        this.root.appendChild(container);
        const groups = pattern.split('-');
        const _refreshInput = (valueString) => {
            container.innerHTML = "";
            let itemsCount = 0;
            let activeSlot = 0;
            for (let i = 0; i < groups.length; ++i) {
                const g = groups[i];
                for (let j = 0; j < g.length; ++j) {
                    let number = valueString[itemsCount++];
                    number = (number == 'x' ? '' : number);
                    const slotDom = LX.makeContainer(["36px", "30px"], "lexotpslot border-top border-bottom border-left px-3 cursor-text select-none font-medium outline-none", number, container);
                    slotDom.tabIndex = "1";
                    if (this.disabled) {
                        slotDom.classList.add("disabled");
                    }
                    const otpIndex = itemsCount;
                    if (j == 0) {
                        slotDom.className += " rounded-l";
                    }
                    else if (j == (g.length - 1)) {
                        slotDom.className += " rounded-r border-right";
                    }
                    slotDom.addEventListener("click", () => {
                        if (this.disabled) {
                            return;
                        }
                        container.querySelectorAll(".lexotpslot").forEach(s => s.classList.remove("active"));
                        const activeDom = container.querySelectorAll(".lexotpslot")[activeSlot];
                        activeDom.classList.add("active");
                        activeDom.focus();
                    });
                    slotDom.addEventListener("blur", () => {
                        if (this.disabled) {
                            return;
                        }
                        LX.doAsync(() => {
                            if (container.contains(document.activeElement)) {
                                return;
                            }
                            container.querySelectorAll(".lexotpslot").forEach(s => s.classList.remove("active"));
                        }, 10);
                    });
                    slotDom.addEventListener("keyup", (e) => {
                        if (this.disabled) {
                            return;
                        }
                        if (!/[^0-9]+/g.test(e.key)) {
                            const number = e.key;
                            console.assert(!Number.isNaN(parseInt(number)));
                            slotDom.innerHTML = number;
                            valueString = valueString.substring(0, otpIndex - 1) + number + valueString.substring(otpIndex);
                            const nexActiveDom = container.querySelectorAll(".lexotpslot")[activeSlot + 1];
                            if (nexActiveDom) {
                                container.querySelectorAll(".lexotpslot")[activeSlot].classList.remove("active");
                                nexActiveDom.classList.add("active");
                                nexActiveDom.focus();
                                activeSlot++;
                            }
                            else {
                                this.set(valueString);
                            }
                        }
                        else if (e.key == "ArrowLeft" || e.key == "ArrowRight") {
                            const dt = (e.key == "ArrowLeft") ? -1 : 1;
                            const newActiveDom = container.querySelectorAll(".lexotpslot")[activeSlot + dt];
                            if (newActiveDom) {
                                container.querySelectorAll(".lexotpslot")[activeSlot].classList.remove("active");
                                newActiveDom.classList.add("active");
                                newActiveDom.focus();
                                activeSlot += dt;
                            }
                        }
                        else if (e.key == "Enter" && !valueString.includes('x')) {
                            this.set(valueString);
                        }
                    });
                }
                if (i < (groups.length - 1)) {
                    LX.makeContainer(["auto", "auto"], "mx-2", `-`, container);
                }
            }
            console.assert(itemsCount == valueString.length, "OTP Value/Pattern Mismatch!");
        };
        _refreshInput(value);
    }
}
LX.OTPInput = OTPInput;

// Pad.ts @jxarco
/**
 * @class Pad
 * @description Pad Component
 */
class Pad extends BaseComponent {
    constructor(name, value, callback, options = {}) {
        super(ComponentType.PAD, name, null, options);
        this.onGetValue = () => {
            return thumb.value.xy;
        };
        this.onSetValue = (newValue, skipCallback, event) => {
            thumb.value.set(newValue[0], newValue[1]);
            _updateValue(thumb.value);
            if (!skipCallback) {
                this._trigger(new IEvent(name, thumb.value.xy, event), callback);
            }
        };
        this.onResize = (rect) => {
            const realNameWidth = (this.root.domName?.style.width ?? "0px");
            container.style.width = `calc( 100% - ${realNameWidth})`;
        };
        var container = document.createElement('div');
        container.className = "lexpad";
        this.root.appendChild(container);
        let pad = document.createElement('div');
        pad.id = "lexpad-" + name;
        pad.className = "lexinnerpad";
        pad.style.width = options.padSize ?? '96px';
        pad.style.height = options.padSize ?? '96px';
        container.appendChild(pad);
        let thumb = document.createElement('div');
        thumb.className = "lexpadthumb";
        thumb.value = new vec2(value[0], value[1]);
        thumb.min = options.min ?? 0;
        thumb.max = options.max ?? 1;
        pad.appendChild(thumb);
        let _updateValue = (v) => {
            const [w, h] = [pad.offsetWidth, pad.offsetHeight];
            const value0to1 = new vec2(LX.remapRange(v.x, thumb.min, thumb.max, 0.0, 1.0), LX.remapRange(v.y, thumb.min, thumb.max, 0.0, 1.0));
            thumb.style.transform = `translate(calc( ${w * value0to1.x}px - 50% ), calc( ${h * value0to1.y}px - 50%)`;
        };
        pad.addEventListener("mousedown", innerMouseDown);
        let that = this;
        function innerMouseDown(e) {
            if (document.activeElement == thumb) {
                return;
            }
            var doc = that.root.ownerDocument;
            doc.addEventListener('mousemove', innerMouseMove);
            doc.addEventListener('mouseup', innerMouseUp);
            document.body.classList.add('nocursor');
            document.body.classList.add('noevents');
            e.stopImmediatePropagation();
            e.stopPropagation();
            thumb.classList.add("active");
            if (options.onPress) {
                options.onPress.bind(thumb)(e, thumb);
            }
        }
        function innerMouseMove(e) {
            const rect = pad.getBoundingClientRect();
            const relativePosition = new vec2(e.x - rect.x, e.y - rect.y);
            relativePosition.clp(0.0, pad.offsetWidth, relativePosition);
            const [w, h] = [pad.offsetWidth, pad.offsetHeight];
            const value0to1 = relativePosition.div(new vec2(pad.offsetWidth, pad.offsetHeight));
            thumb.style.transform = `translate(calc( ${w * value0to1.x}px - 50% ), calc( ${h * value0to1.y}px - 50%)`;
            thumb.value = new vec2(LX.remapRange(value0to1.x, 0.0, 1.0, thumb.min, thumb.max), LX.remapRange(value0to1.y, 0.0, 1.0, thumb.min, thumb.max));
            that._trigger(new IEvent(name, thumb.value.xy, e), callback);
            e.stopPropagation();
            e.preventDefault();
        }
        function innerMouseUp(e) {
            var doc = that.root.ownerDocument;
            doc.removeEventListener('mousemove', innerMouseMove);
            doc.removeEventListener('mouseup', innerMouseUp);
            document.body.classList.remove('nocursor');
            document.body.classList.remove('noevents');
            thumb.classList.remove("active");
            if (options.onRelease) {
                options.onRelease.bind(thumb)(e, thumb);
            }
        }
        LX.doAsync(() => {
            this.onResize();
            _updateValue(thumb.value);
        });
    }
}
LX.Pad = Pad;

// SizeInput.ts @jxarco
/**
 * @class SizeInput
 * @description SizeInput Component
 */
class SizeInput extends BaseComponent {
    constructor(name, value, callback, options = {}) {
        super(ComponentType.SIZE, name, value, options);
        this.onGetValue = () => {
            const value = [];
            for (let i = 0; i < this.root.dimensions.length; ++i) {
                value.push(this.root.dimensions[i].value());
            }
            return value;
        };
        this.onSetValue = (newValue, skipCallback, event) => {
            for (let i = 0; i < this.root.dimensions.length; ++i) {
                this.root.dimensions[i].set(newValue[i], skipCallback);
            }
        };
        this.root.aspectRatio = (value.length == 2 ? value[0] / value[1] : null);
        this.root.dimensions = [];
        for (let i = 0; i < value.length; ++i) {
            const p = new LX.Panel();
            this.root.dimensions[i] = p.addNumber(null, value[i], (v) => {
                const value = this.value();
                if (this.root.locked) {
                    const ar = (i == 0 ? 1.0 / this.root.aspectRatio : this.root.aspectRatio);
                    const index = (1 + i) % 2;
                    value[index] = v * ar;
                    this.root.dimensions[index].set(value[index], true);
                }
                if (callback) {
                    callback(value);
                }
            }, { min: 0, disabled: options.disabled, precision: options.precision, className: "flex-fill" });
            this.root.appendChild(this.root.dimensions[i].root);
            if ((i + 1) != value.length) {
                const xIcon = LX.makeIcon("X", { svgClass: "fg-accent font-bold" });
                this.root.appendChild(xIcon);
            }
        }
        if (options.units) {
            let unitSpan = document.createElement('span');
            unitSpan.className = "select-none fg-tertiary font-medium";
            unitSpan.innerText = options.units;
            this.root.appendChild(unitSpan);
        }
        // Lock aspect ratio
        if (this.root.aspectRatio) {
            const lockerButton = new Button(null, "", (swapValue) => {
                this.root.locked = swapValue;
                if (swapValue) {
                    // Recompute ratio
                    const value = this.value();
                    this.root.aspectRatio = value[0] / value[1];
                }
            }, { title: "Lock Aspect Ratio", icon: "LockOpen", swap: "Lock", buttonClass: "bg-none p-0" });
            this.root.appendChild(lockerButton.root);
        }
    }
}
LX.SizeInput = SizeInput;

// Panel.ts @jxarco
/**
 * @class Panel
 */
class Panel {
    root;
    branches;
    components;
    signals;
    queuedContainer;
    _branchOpen;
    _currentBranch;
    _queue; // Append components in other locations
    _inlineComponentsLeft;
    _inlineQueuedContainer;
    _inlineExtraClass;
    _inlineContainer;
    _inlineComponents;
    /**
     * @param {Object} options
     * id: Id of the element
     * className: Add class to the element
     * width: Width of the panel element [fit space]
     * height: Height of the panel element [fit space]
     * style: CSS Style object to be applied to the panel
     */
    constructor(options = {}) {
        var root = document.createElement('div');
        root.className = "lexpanel";
        if (options.id) {
            root.id = options.id;
        }
        if (options.className) {
            root.className += " " + options.className;
        }
        root.style.width = options.width || "100%";
        root.style.height = options.height || "100%";
        Object.assign(root.style, options.style ?? {});
        this.root = root;
        this.branches = [];
        this.signals = [];
        this.components = {};
        this._branchOpen = false;
        this._currentBranch = null;
        this._queue = []; // Append components in other locations
        this._inlineComponentsLeft = -1;
        this._inlineQueuedContainer = null;
        this._inlineExtraClass = null;
        this._inlineComponents = [];
    }
    get(name) {
        return this.components[name];
    }
    getValue(name) {
        let component = this.components[name];
        if (!component) {
            throw ("No component called " + name);
        }
        return component.value();
    }
    setValue(name, value, skipCallback) {
        let component = this.components[name];
        if (!component) {
            throw ("No component called " + name);
        }
        return component.set(value, skipCallback);
    }
    /**
     * @method attach
     * @param {Element} content child element to append to panel
     */
    attach(content) {
        console.assert(content, "No content to attach!");
        content.parent = this;
        this.root.appendChild(content.root ? content.root : content);
    }
    /**
     * @method clear
     */
    clear() {
        this.branches = [];
        this._branchOpen = false;
        this._currentBranch = null;
        for (let w in this.components) {
            if (this.components[w].options && this.components[w].options.signal) {
                const signal = this.components[w].options.signal;
                for (let i = 0; i < LX.signals[signal].length; i++) {
                    if (LX.signals[signal][i] == this.components[w]) {
                        LX.signals[signal] = [...LX.signals[signal].slice(0, i), ...LX.signals[signal].slice(i + 1)];
                    }
                }
            }
        }
        if (this.signals) {
            for (let w = 0; w < this.signals.length; w++) {
                let c = Object.values(this.signals[w])[0];
                let signal = c.options.signal;
                for (let i = 0; i < LX.signals[signal].length; i++) {
                    if (LX.signals[signal][i] == c) {
                        LX.signals[signal] = [...LX.signals[signal].slice(0, i), ...LX.signals[signal].slice(i + 1)];
                    }
                }
            }
        }
        this.components = {};
        this.root.innerHTML = "";
    }
    /**
     * @method sameLine
     * @param {Number} numberOfComponents Of components that will be placed in the same line
     * @param {String} className Extra class to customize inline components parent container
     * @description Next N components will be in the same line. If no number, it will inline all until calling nextLine()
     */
    sameLine(numberOfComponents, className) {
        this._inlineQueuedContainer = this.queuedContainer;
        this._inlineComponentsLeft = (numberOfComponents ?? Infinity);
        this._inlineExtraClass = className ?? null;
    }
    /**
     * @method endLine
     * @param {String} className Extra class to customize inline components parent container
     * @description Stop inlining components. Use it only if the number of components to be inlined is NOT specified.
     */
    endLine(className) {
        className = className ?? this._inlineExtraClass;
        if (this._inlineComponentsLeft == -1) {
            console.warn("No pending components to be inlined!");
            return;
        }
        this._inlineComponentsLeft = -1;
        if (!this._inlineContainer) {
            this._inlineContainer = document.createElement('div');
            this._inlineContainer.className = "lexinlinecomponents";
            if (className) {
                this._inlineContainer.className += ` ${className}`;
            }
        }
        // Push all elements single element or Array[element, container]
        for (let item of this._inlineComponents) {
            const isPair = (item.constructor == Array);
            if (isPair) {
                // eg. an array, inline items appended later to
                if (this._inlineQueuedContainer) {
                    this._inlineContainer.appendChild(item[0]);
                }
                // eg. a select, item is appended to parent, not to inline cont.
                else {
                    item[1].appendChild(item[0]);
                }
            }
            else {
                this._inlineContainer.appendChild(item);
            }
        }
        if (!this._inlineQueuedContainer) {
            if (this._currentBranch) {
                this._currentBranch.content.appendChild(this._inlineContainer);
            }
            else {
                this.root.appendChild(this._inlineContainer);
            }
        }
        else {
            this._inlineQueuedContainer.appendChild(this._inlineContainer);
        }
        this._inlineComponents = [];
        this._inlineContainer = null;
        this._inlineExtraClass = null;
    }
    /**
     * @method branch
     * @param {String} name Name of the branch/section
     * @param {Object} options
     * id: Id of the branch
     * className: Add class to the branch
     * closed: Set branch collapsed/opened [false]
     * icon: Set branch icon (LX.ICONS)
     * filter: Allow filter components in branch by name [false]
     */
    branch(name, options = {}) {
        if (this._branchOpen) {
            this.merge();
        }
        // Create new branch
        var branch = new Branch(name, options);
        branch.panel = this;
        // Declare new open
        this._branchOpen = true;
        this._currentBranch = branch;
        this.branches.push(branch);
        this.root.appendChild(branch.root);
        // Add component filter
        if (options.filter) {
            this._addFilter(options.filter, { callback: this._searchComponents.bind(this, branch.name) });
        }
        return branch;
    }
    merge() {
        this._branchOpen = false;
        this._currentBranch = null;
    }
    _pick(arg, def) {
        return (typeof arg == 'undefined' ? def : arg);
    }
    /*
        Panel Components
    */
    _attachComponent(component, options = {}) {
        if (component.name != undefined) {
            this.components[component.name] = component;
        }
        if (component.options.signal && !component.name) {
            if (!this.signals) {
                this.signals = [];
            }
            this.signals.push({ [component.options.signal]: component });
        }
        const _insertComponent = (el) => {
            if (options.container) {
                options.container.appendChild(el);
            }
            else if (!this.queuedContainer) {
                if (this._currentBranch) {
                    if (!options.skipComponent) {
                        this._currentBranch.components.push(component);
                    }
                    this._currentBranch.content.appendChild(el);
                }
                else {
                    el.className += " nobranch w-full";
                    this.root.appendChild(el);
                }
            }
            // Append content to queued tab container
            else {
                this.queuedContainer.appendChild(el);
            }
        };
        const _storeComponent = (el) => {
            if (!this.queuedContainer) {
                this._inlineComponents.push(el);
            }
            // Append content to queued tab container
            else {
                this._inlineComponents.push([el, this.queuedContainer]);
            }
        };
        // Process inline components
        if (this._inlineComponentsLeft > 0 && !options.skipInlineCount) {
            // Store component and its container
            _storeComponent(component.root);
            this._inlineComponentsLeft--;
            // Last component
            if (!this._inlineComponentsLeft) {
                this.endLine();
            }
        }
        else {
            _insertComponent(component.root);
        }
        return component;
    }
    _addFilter(placeholder, options = {}) {
        options.placeholder = placeholder.constructor == String ? placeholder : "Filter properties..";
        options.skipComponent = options.skipComponent ?? true;
        options.skipInlineCount = true;
        let component = new TextInput(null, undefined, null, options);
        const element = component.root;
        element.className += " lexfilter";
        let input = document.createElement('input');
        input.className = 'lexinput-filter';
        input.setAttribute("placeholder", options.placeholder);
        input.style.width = "100%";
        input.value = options.filterValue || "";
        let searchIcon = LX.makeIcon("Search");
        element.appendChild(searchIcon);
        element.appendChild(input);
        input.addEventListener("input", e => {
            if (options.callback) {
                options.callback(input.value, e);
            }
        });
        return element;
    }
    _searchComponents(branchName, value) {
        for (let b of this.branches) {
            if (b.name !== branchName) {
                continue;
            }
            // remove all components
            for (let w of b.components) {
                if (w.domEl.classList.contains('lexfilter')) {
                    continue;
                }
                w.domEl.remove();
            }
            // push to right container
            this.queue(b.content);
            const emptyFilter = !value.length;
            // add components
            for (let w of b.components) {
                if (!emptyFilter) {
                    if (!w.name)
                        continue;
                    // const filterWord = value.toLowerCase();
                    const name = w.name.toLowerCase();
                    if (!name.includes(value))
                        continue;
                }
                // insert filtered component
                this.queuedContainer.appendChild(w.domEl);
            }
            // push again to current branch
            this.clearQueue();
            // no more branches to check!
            return;
        }
    }
    /**
     * @method getBranch
     * @param {String} name if null, return current branch
     */
    getBranch(name) {
        if (name) {
            return this.branches.find(b => b.name == name);
        }
        return this._currentBranch;
    }
    /**
     * @method queue
     * @param {HTMLElement} domEl container to append elements to
     */
    queue(domEl) {
        if (!domEl && this._currentBranch) {
            domEl = this._currentBranch.root;
        }
        if (this.queuedContainer) {
            this._queue.push(this.queuedContainer);
        }
        this.queuedContainer = domEl;
    }
    /**
     * @method clearQueue
     */
    clearQueue() {
        if (this._queue && this._queue.length) {
            this.queuedContainer = this._queue.pop();
            return;
        }
        delete this.queuedContainer;
    }
    /**
     * @method addSeparator
     */
    addSeparator() {
        var element = document.createElement('div');
        element.className = "lexseparator";
        let component = new BaseComponent(ComponentType.SEPARATOR);
        component.root = element;
        if (this._currentBranch) {
            this._currentBranch.content.appendChild(element);
            this._currentBranch.components.push(component);
        }
        else {
            this.root.appendChild(element);
        }
    }
    /**
     * @method addTitle
     * @param {String} name Title name
     * @param {Object} options:
     * link: Href in case title is an hyperlink
     * target: Target name of the iframe (if any)
     * icon: Name of the icon (if any)
     * iconColor: Color of title icon (if any)
     * style: CSS to override
     */
    addTitle(name, options = {}) {
        const component = new Title(name, options);
        return this._attachComponent(component);
    }
    /**
     * @method addText
     * @param {String} name Component name
     * @param {String} value Text value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * disabled: Make the component disabled [false]
     * required: Make the input required
     * placeholder: Add input placeholder
     * icon: Icon (if any) to append at the input start
     * pattern: Regular expression that value must match
     * trigger: Choose onchange trigger (default, input) [default]
     * inputWidth: Width of the text input
     * fit: Input widts fits content [false]
     * inputClass: Class to add to the native input element
     * skipReset: Don't add the reset value button when value changes
     * float: Justify input text content
     * justifyName: Justify name content
     */
    addText(name, value, callback, options = {}) {
        const component = new TextInput(name, value, callback, options);
        return this._attachComponent(component);
    }
    /**
     * @method addTextArea
     * @param {String} name Component name
     * @param {String} value Text Area value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * disabled: Make the component disabled [false]
     * placeholder: Add input placeholder
     * resize: Allow resize [true]
     * trigger: Choose onchange trigger (default, input) [default]
     * inputWidth: Width of the text input
     * float: Justify input text content
     * justifyName: Justify name content
     * fitHeight: Height adapts to text
     */
    addTextArea(name, value, callback, options = {}) {
        const component = new TextArea(name, value, callback, options);
        return this._attachComponent(component);
    }
    /**
     * @method addLabel
     * @param {String} value Information string
     * @param {Object} options Text options
     */
    addLabel(value, options = {}) {
        options.disabled = true;
        options.inputClass = (options.inputClass ?? "") + " nobg";
        const component = this.addText(null, value, null, options);
        component.type = ComponentType.LABEL;
        return component;
    }
    /**
     * @method addButton
     * @param {String} name Component name
     * @param {String} value Button name
     * @param {Function} callback Callback function on click
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * disabled: Make the component disabled [false]
     * icon: Icon class to show as button value
     * iconPosition: Icon position (cover|start|end)
     * fileInput: Button click requests a file
     * fileInputType: Type of the requested file
     * img: Path to image to show as button value
     * title: Text to show in native Element title
     * buttonClass: Class to add to the native button element
     * mustConfirm: User must confirm trigger in a popover
     */
    addButton(name, value, callback, options = {}) {
        const component = new Button(name, value, callback, options);
        return this._attachComponent(component);
    }
    /**
     * @method addComboButtons
     * @param {String} name Component name
     * @param {Array} values Each of the {value, callback, selected, disabled} items
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * float: Justify content (left, center, right) [center]
     * selected: Selected button by default (String|Array)
     * noSelection: Buttons can be clicked, but they are not selectable
     * toggle: Buttons can be toggled insted of selecting only one
     */
    addComboButtons(name, values, options = {}) {
        const component = new ComboButtons(name, values, options);
        return this._attachComponent(component);
    }
    /**
     * @method addCard
     * @param {String} name Card Name
     * @param {Object} options:
     * text: Card text
     * link: Card link
     * title: Card dom title
     * src: url of the image
     * callback (Function): function to call on click
     */
    addCard(name, options = {}) {
        const component = new Card(name, options);
        return this._attachComponent(component);
    }
    /**
     * @method addForm
     * @param {String} name Component name
     * @param {Object} data Form data
     * @param {Function} callback Callback function on submit form
     * @param {Object} options:
     * primaryActionName: Text to be shown in the primary action button ['Submit']
     * primaryButtonClass: Button class for primary action button ['contrast']
     * secondaryActionName: Text to be shown in the secondary action button ['Cancel']
     * secondaryActionCallback: Callback function on press secondary button
     * secondaryButtonClass: Button class for secondary action button ['primary']
     * skipLabels: Do not show input field labels [false]
     */
    addForm(name, data, callback, options = {}) {
        const component = new Form(name, data, callback, options);
        return this._attachComponent(component);
    }
    /**
     * @method addContent
     * @param {String} name Component name
     * @param {HTMLElement/String} element
     * @param {Object} options
     */
    addContent(name, element, options = {}) {
        console.assert(element, "Empty content!");
        if (element.constructor == String) {
            const tmp = document.createElement("div");
            tmp.innerHTML = element;
            if (tmp.childElementCount > 1) {
                element = tmp;
            }
            else {
                element = tmp.firstElementChild;
            }
        }
        options.hideName = true;
        let component = new BaseComponent(ComponentType.CONTENT, name, null, options);
        component.root.appendChild(element);
        return this._attachComponent(component);
    }
    /**
     * @method addImage
     * @param {String} name Component name
     * @param {String} url Image Url
     * @param {Object} options
     * hideName: Don't use name as label [false]
     */
    async addImage(name, url, options = {}) {
        console.assert(url.length !== 0, "Empty src/url for Image!");
        let container = document.createElement('div');
        container.className = "leximage";
        container.style.width = "100%";
        let img = document.createElement('img');
        img.src = url;
        Object.assign(img.style, options.style ?? {});
        container.appendChild(img);
        let component = new BaseComponent(ComponentType.IMAGE, name, null, options);
        component.root.appendChild(container);
        // await img.decode();
        img.decode();
        return this._attachComponent(component);
    }
    /**
     * @method addSelect
     * @param {String} name Component name
     * @param {Array} values Posible options of the select component -> String (for default select) or Object = {value, url} (for images, gifs..)
     * @param {String} value Select by default option
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * filter: Add a search bar to the component [false]
     * disabled: Make the component disabled [false]
     * skipReset: Don't add the reset value button when value changes
     * placeholder: Placeholder for the filter input
     * emptyMsg: Custom message to show when no filtered results
     */
    addSelect(name, values, value, callback, options = {}) {
        const component = new Select(name, values, value, callback, options);
        return this._attachComponent(component);
    }
    /**
     * @method addCurve
     * @param {String} name Component name
     * @param {Array of Array} values Array of 2N Arrays of each value of the curve
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * skipReset: Don't add the reset value button when value changes
     * bgColor: Component background color
     * pointsColor: Curve points color
     * lineColor: Curve line color
     * noOverlap: Points do not overlap, replacing themselves if necessary
     * allowAddValues: Support adding values on click
     * smooth: Curve smoothness
     * moveOutAction: Clamp or delete points moved out of the curve (LX.CURVE_MOVEOUT_CLAMP, LX.CURVE_MOVEOUT_DELETE)
    */
    addCurve(name, values, callback, options = {}) {
        const component = new Curve(name, values, callback, options);
        return this._attachComponent(component);
    }
    /**
     * @method addDial
     * @param {String} name Component name
     * @param {Array of Array} values Array of 2N Arrays of each value of the dial
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * skipReset: Don't add the reset value button when value changes
     * bgColor: Component background color
     * pointsColor: Curve points color
     * lineColor: Curve line color
     * noOverlap: Points do not overlap, replacing themselves if necessary
     * allowAddValues: Support adding values on click
     * smooth: Curve smoothness
     * moveOutAction: Clamp or delete points moved out of the curve (LX.CURVE_MOVEOUT_CLAMP, LX.CURVE_MOVEOUT_DELETE)
    */
    addDial(name, values, callback, options = {}) {
        const component = new Dial(name, values, callback, options);
        return this._attachComponent(component);
    }
    /**
     * @method addLayers
     * @param {String} name Component name
     * @param {Number} value Flag value by default option
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     */
    addLayers(name, value, callback, options = {}) {
        const component = new Layers(name, value, callback, options);
        return this._attachComponent(component);
    }
    /**
     * @method addArray
     * @param {String} name Component name
     * @param {Array} values By default values in the array
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * innerValues (Array): Use select mode and use values as options
     */
    addArray(name, values = [], callback, options = {}) {
        const component = new ArrayInput(name, values, callback, options);
        return this._attachComponent(component);
    }
    /**
     * @method addList
     * @param {String} name Component name
     * @param {Array} values List values
     * @param {String} value Selected list value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     */
    addList(name, values, value, callback, options = {}) {
        const component = new List(name, values, value, callback, options);
        return this._attachComponent(component);
    }
    /**
     * @method addTags
     * @param {String} name Component name
     * @param {String} value Comma separated tags
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     */
    addTags(name, value, callback, options = {}) {
        const component = new Tags(name, value, callback, options);
        return this._attachComponent(component);
    }
    /**
     * @method addCheckbox
     * @param {String} name Component name
     * @param {Boolean} value Value of the checkbox
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * disabled: Make the component disabled [false]
     * label: Checkbox label
     * suboptions: Callback to add components in case of TRUE value
     * className: Extra classes to customize style
     */
    addCheckbox(name, value, callback, options = {}) {
        const component = new Checkbox(name, value, callback, options);
        return this._attachComponent(component);
    }
    /**
     * @method addToggle
     * @param {String} name Component name
     * @param {Boolean} value Value of the checkbox
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * disabled: Make the component disabled [false]
     * label: Toggle label
     * suboptions: Callback to add components in case of TRUE value
     * className: Customize colors
     */
    addToggle(name, value, callback, options = {}) {
        const component = new Toggle(name, value, callback, options);
        return this._attachComponent(component);
    }
    /**
     * @method addRadioGroup
     * @param {String} name Component name
     * @param {String} label Radio label
     * @param {Array} values Radio options
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * disabled: Make the component disabled [false]
     * className: Customize colors
     * selected: Index of the default selected option
     */
    addRadioGroup(name, label, values, callback, options = {}) {
        const component = new RadioGroup(name, label, values, callback, options);
        return this._attachComponent(component);
    }
    /**
     * @method addColor
     * @param {String} name Component name
     * @param {String} value Default color (hex)
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * disabled: Make the component disabled [false]
     * useRGB: The callback returns color as Array (r, g, b) and not hex [false]
     */
    addColor(name, value, callback, options = {}) {
        const component = new ColorInput(name, value, callback, options);
        return this._attachComponent(component);
    }
    /**
     * @method addRange
     * @param {String} name Component name
     * @param {Number} value Default number value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * className: Extra classes to customize style
     * disabled: Make the component disabled [false]
     * left: The slider goes to the left instead of the right
     * fill: Fill slider progress [true]
     * step: Step of the input
     * min, max: Min and Max values for the input
     */
    addRange(name, value, callback, options = {}) {
        const component = new RangeInput(name, value, callback, options);
        return this._attachComponent(component);
    }
    /**
     * @method addNumber
     * @param {String} name Component name
     * @param {Number} value Default number value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * disabled: Make the component disabled [false]
     * step: Step of the input
     * precision: The number of digits to appear after the decimal point
     * min, max: Min and Max values for the input
     * skipSlider: If there are min and max values, skip the slider
     * units: Unit as string added to the end of the value
     * onPress: Callback function on mouse down
     * onRelease: Callback function on mouse up
     */
    addNumber(name, value, callback, options = {}) {
        const component = new NumberInput(name, value, callback, options);
        return this._attachComponent(component);
    }
    static VECTOR_COMPONENTS = { 0: 'x', 1: 'y', 2: 'z', 3: 'w' };
    _addVector(numComponents, name, value, callback, options = {}) {
        const component = new Vector(numComponents, name, value, callback, options);
        return this._attachComponent(component);
    }
    /**
     * @method addVector N (2, 3, 4)
     * @param {String} name Component name
     * @param {Array} value Array of N components
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * disabled: Make the component disabled [false]
     * step: Step of the inputs
     * min, max: Min and Max values for the inputs
     * onPress: Callback function on mouse down
     * onRelease: Callback function on mouse is released
     */
    addVector2(name, value, callback, options) {
        return this._addVector(2, name, value, callback, options);
    }
    addVector3(name, value, callback, options) {
        return this._addVector(3, name, value, callback, options);
    }
    addVector4(name, value, callback, options) {
        return this._addVector(4, name, value, callback, options);
    }
    /**
     * @method addSize
     * @param {String} name Component name
     * @param {Number} value Default number value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * disabled: Make the component disabled [false]
     * units: Unit as string added to the end of the value
     */
    addSize(name, value, callback, options = {}) {
        const component = new SizeInput(name, value, callback, options);
        return this._attachComponent(component);
    }
    /**
     * @method addOTP
     * @param {String} name Component name
     * @param {String} value Default numeric value in string format
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * disabled: Make the component disabled [false]
     * pattern: OTP numeric pattern
     */
    addOTP(name, value, callback, options = {}) {
        const component = new OTPInput(name, value, callback, options);
        return this._attachComponent(component);
    }
    /**
     * @method addPad
     * @param {String} name Component name
     * @param {Array} value Pad value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * disabled: Make the component disabled [false]
     * min, max: Min and Max values
     * padSize: Size of the pad (css)
     * onPress: Callback function on mouse down
     * onRelease: Callback function on mouse up
     */
    addPad(name, value, callback, options = {}) {
        const component = new Pad(name, value, callback, options);
        return this._attachComponent(component);
    }
    /**
     * @method addProgress
     * @param {String} name Component name
     * @param {Number} value Progress value
     * @param {Object} options:
     * min, max: Min and Max values
     * low, optimum, high: Low and High boundary values, Optimum point in the range
     * showValue: Show current value
     * editable: Allow edit value
     * callback: Function called on change value
     */
    addProgress(name, value, options = {}) {
        const component = new Progress(name, value, options);
        return this._attachComponent(component);
    }
    /**
     * @method addFile
     * @param {String} name Component name
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * local: Ask for local file
     * disabled: Make the component disabled [false]
     * read: Return the file itself (False) or the contents (True)
     * type: type to read as [text (Default), buffer, bin, url]
     */
    addFile(name, callback, options = {}) {
        const component = new FileInput(name, callback, options);
        return this._attachComponent(component);
    }
    /**
     * @method addTree
     * @param {String} name Component name
     * @param {Object} data Data of the tree
     * @param {Object} options:
     * icons: Array of objects with icon button information {name, icon, callback}
     * filter: Add nodes filter [true]
     * rename: Boolean to allow rename [true]
     * onevent(tree_event): Called when node is selected, dbl clicked, contextmenu opened, changed visibility, parent or name
     */
    addTree(name, data, options = {}) {
        const component = new Tree(name, data, options);
        return this._attachComponent(component);
    }
    /**
     * @method addTabSections
     * @param {String} name Component name
     * @param {Array} tabs Contains objects with {
     *      name: Name of the tab (if icon, use as title)
     *      icon: Icon to be used as the tab icon (optional)
     *      iconClass: Class to be added to the icon (optional)
     *      svgClass: Class to be added to the inner SVG of the icon (optional)
     *      onCreate: Func to be called at tab creation
     *      onSelect: Func to be called on select tab (optional)
     * }
     * @param {Object} options
     * vertical: Use vertical or horizontal tabs (vertical by default)
     * showNames: Show tab name only in horizontal tabs
     */
    addTabSections(name, tabs, options = {}) {
        const component = new TabSections(name, tabs, options);
        return this._attachComponent(component);
    }
    /**
     * @method addCounter
     * @param {String} name Component name
     * @param {Number} value Counter value
     * @param {Function} callback Callback function on change
     * @param {Object} options:
     * disabled: Make the component disabled [false]
     * min, max: Min and Max values
     * step: Step for adding/substracting
     * label: Text to show below the counter
     */
    addCounter(name, value, callback, options = {}) {
        const component = new Counter(name, value, callback, options);
        return this._attachComponent(component);
    }
    /**
     * @method addTable
     * @param {String} name Component name
     * @param {Number} data Table data
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * head: Table headers (each of the headers per column)
     * body: Table body (data per row for each column)
     * rowActions: Allow to add actions per row
     * onMenuAction: Function callback to fill the "menu" context
     * selectable: Each row can be selected
     * sortable: Rows can be sorted by the user manually
     * centered: Center text within columns. true for all, Array for center selected cols
     * toggleColumns: Columns visibility can be toggled
     * filter: Name of the column to filter by text input (if any)
     * filterValue: Initial filter value
     * customFilters: Add selectors to filter by specific option values
     */
    addTable(name, data, options = {}) {
        const component = new Table(name, data, options);
        return this._attachComponent(component);
    }
    /**
     * @method addDate
     * @param {String} name Component name
     * @param {String} dateValue
     * @param {Function} callback
     * @param {Object} options:
     * hideName: Don't use name as label [false]
     * today: Set current day as selected by default
     * untilToday: Allow dates only until current day
     * fromToday: Allow dates only from current day
     */
    addDate(name, dateValue, callback, options = {}) {
        const component = new DatePicker(name, dateValue, callback, options);
        return this._attachComponent(component);
    }
    /**
     * @method addMap2D
     * @param {String} name Component name
     * @param {Array} points
     * @param {Function} callback
     * @param {Object} options:
     */
    addMap2D(name, points, callback, options = {}) {
        const component = new Map2D(name, points, callback, options);
        return this._attachComponent(component);
    }
    /**
     * @method addRate
     * @param {String} name Component name
     * @param {Number} value
     * @param {Function} callback
     * @param {Object} options:
     */
    addRate(name, value, callback, options = {}) {
        const component = new Rate(name, value, callback, options);
        return this._attachComponent(component);
    }
}
LX.Panel = Panel;

// Menubar.ts @jxarco
/**
 * @class Menubar
 */
class Menubar {
    root;
    siblingArea;
    buttonContainer;
    items = [];
    buttons = {};
    icons = {};
    shorts = {};
    focused = false;
    _currentDropdown;
    constructor(items, options = {}) {
        this.root = document.createElement("div");
        this.root.className = "lexmenubar";
        if (options.float) {
            this.root.style.justifyContent = options.float;
        }
        this.items = items ?? [];
        this.createEntries();
    }
    _resetMenubar(focus) {
        this.root.querySelectorAll(".lexmenuentry").forEach((e) => {
            e.classList.remove('selected');
            delete e.dataset["built"];
        });
        if (this._currentDropdown) {
            this._currentDropdown.destroy();
            this._currentDropdown = null;
        }
        // Next time we need to click again
        this.focused = focus ?? false;
    }
    /**
     * @method createEntries
     */
    createEntries() {
        for (let item of this.items) {
            let key = item.name;
            let pKey = LX.getSupportedDOMName(key);
            // Item already created
            if (this.root.querySelector("#" + pKey)) {
                continue;
            }
            let entry = document.createElement('div');
            entry.className = "lexmenuentry";
            entry.id = pKey;
            entry.innerHTML = "<span>" + key + "</span>";
            entry.tabIndex = 1;
            this.root.appendChild(entry);
            const _showEntry = () => {
                this._resetMenubar(true);
                entry.classList.add("selected");
                entry.dataset["built"] = "true";
                this._currentDropdown = LX.addDropdownMenu(entry, item.submenu ?? [], { side: "bottom", align: "start", onBlur: () => {
                        this._resetMenubar();
                    } });
            };
            entry.addEventListener("mousedown", (e) => {
                e.preventDefault();
            });
            entry.addEventListener("mouseup", (e) => {
                e.preventDefault();
                const f = item['callback'];
                if (f) {
                    f.call(this, key, entry, e);
                    return;
                }
                _showEntry();
                this.focused = true;
                return false;
            });
            entry.addEventListener("mouseover", (e) => {
                if (this.focused && !(entry.dataset["built"] ?? false)) {
                    _showEntry();
                }
            });
        }
    }
    /**
     * @method getButton
     * @param {String} name
     */
    getButton(name) {
        return this.buttons[name];
    }
    /**
     * @method getSubitems
     * @param {Object} item: parent item
     * @param {Array} tokens: split path strings
    */
    getSubitem(item, tokens) {
        for (const s of item) {
            if (s?.name != tokens[0]) {
                continue;
            }
            if (tokens.length == 1) {
                return s;
            }
            else if (s.submenu) {
                tokens.shift();
                return this.getSubitem(s.submenu, tokens);
            }
        }
    }
    /**
     * @method getItem
     * @param {String} path
    */
    getItem(path) {
        // Process path
        const tokens = path.split('/');
        return this.getSubitem(this.items, tokens);
    }
    /**
     * @method setButtonIcon
     * @param {String} name
     * @param {String} icon
     * @param {Function} callback
     * @param {Object} options
     */
    setButtonIcon(name, icon, callback, options = {}) {
        if (!name) {
            throw ("Set Button Name!");
        }
        let button = this.buttons[name];
        // If the button already exists, delete it
        // since only one button of this type can exist
        if (button) {
            delete this.buttons[name];
            LX.deleteElement(button.root);
        }
        // Otherwise, create it
        button = new Button(name, undefined, callback, {
            title: name,
            buttonClass: "lexmenubutton main bg-none",
            disabled: options.disabled,
            icon,
            svgClass: "xl",
            hideName: true,
            swap: options.swap
        });
        if (options.float == "right") {
            button.root.right = true;
        }
        if (this.root.lastChild && this.root.lastChild.right) {
            this.root.lastChild.before(button.root);
        }
        else if (options.float == "left") {
            this.root.prepend(button.root);
        }
        else {
            this.root.appendChild(button.root);
        }
        this.buttons[name] = button;
    }
    /**
     * @method setButtonImage
     * @param {String} name
     * @param {String} src
     * @param {Function} callback
     * @param {Object} options
     */
    setButtonImage(name, src, callback, options = {}) {
        if (!name) {
            throw ("Set Button Name!");
        }
        let button = this.buttons[name];
        if (button) {
            button.querySelector('img').src = src;
            return;
        }
        // Otherwise, create it
        button = document.createElement('div');
        const disabled = options.disabled ?? false;
        button.className = "lexmenubutton main" + (disabled ? " disabled" : "");
        button.title = name;
        button.innerHTML = "<a><image src='" + src + "' class='lexicon' style='height:32px;'></a>";
        if (options.float == "right") {
            button.right = true;
        }
        if (this.root.lastChild && this.root.lastChild.right) {
            this.root.lastChild.before(button);
        }
        else if (options.float == "left") {
            this.root.prepend(button);
        }
        else {
            this.root.appendChild(button);
        }
        const _b = button.querySelector('a');
        _b.addEventListener("mousedown", (e) => {
            e.preventDefault();
        });
        _b.addEventListener("mouseup", (e) => {
            if (callback && !disabled) {
                callback.call(this, _b, e);
            }
        });
        this.buttons[name] = button;
    }
    /**
     * @method addButton
     * @param {Array} buttons
     * @param {Object} options
     * float: center (Default), right
     */
    addButtons(buttons, options = {}) {
        if (!buttons) {
            throw ("No buttons to add!");
        }
        if (!this.buttonContainer) {
            this.buttonContainer = document.createElement("div");
            this.buttonContainer.className = "lexmenubuttons";
            this.buttonContainer.classList.add(options.float ?? "center");
            if (options.float == "right") {
                this.buttonContainer.right = true;
            }
            if (this.root.lastChild && this.root.lastChild.right) {
                this.root.lastChild.before(this.buttonContainer);
            }
            else {
                this.root.appendChild(this.buttonContainer);
            }
        }
        for (const data of buttons) {
            const title = data.title;
            const button = new Button(title, data.label, data.callback, {
                title,
                buttonClass: "bg-none",
                disabled: data.disabled,
                icon: data.icon,
                hideName: true,
                swap: data.swap,
                iconPosition: "start"
            });
            this.buttonContainer.appendChild(button.root);
            if (title) {
                this.buttons[title] = button;
            }
        }
    }
}

// Tabs.ts @jxarco
/**
 * @class Tabs
 */
class Tabs {
    static TAB_ID = 0;
    root;
    area;
    tabs = {};
    tabDOMs = {};
    thumb;
    selected = null;
    folding = false;
    folded = false;
    onclose;
    constructor(area, options = {}) {
        this.onclose = options.onclose;
        let container = document.createElement('div');
        container.className = "lexareatabs " + (options.fit ? "fit" : "row");
        const folding = options.folding ?? false;
        if (folding)
            container.classList.add("folding");
        let that = this;
        container.addEventListener("dragenter", function (e) {
            e.preventDefault(); // Prevent default action (open as link for some elements)
            this.classList.add("dockingtab");
        });
        container.addEventListener("dragleave", function (e) {
            e.preventDefault(); // Prevent default action (open as link for some elements)
            if (this.contains(e.relatedTarget))
                return; // Still inside
            this.classList.remove("dockingtab");
        });
        container.addEventListener("drop", function (e) {
            e.preventDefault(); // Prevent default action (open as link for some elements)
            const tabId = e.dataTransfer.getData("source");
            const tabDom = document.getElementById(tabId);
            if (!tabDom)
                return;
            const sourceContainer = tabDom.parentElement;
            const target = e.target;
            const rect = target.getBoundingClientRect();
            if (e.offsetX < (rect.width * 0.5)) {
                this.insertBefore(tabDom, target);
            }
            else if (target.nextElementSibling) {
                this.insertBefore(tabDom, target.nextElementSibling);
            }
            else {
                this.appendChild(tabDom);
            }
            {
                // Update childIndex for fit mode tabs in source container
                sourceContainer.childNodes.forEach((c, idx) => c.childIndex = (idx - 1));
                // If needed, set last tab of source container active
                const sourceAsFit = (/true/).test(e.dataTransfer.getData("fit"));
                let newSelected = null;
                if (sourceContainer.childElementCount == (sourceAsFit ? 2 : 1)) {
                    newSelected = sourceContainer.lastChild; // single tab or thumb first (fit mode)
                }
                else {
                    const sourceSelected = sourceContainer.querySelector(".selected");
                    newSelected = (sourceSelected ?? sourceContainer.childNodes[sourceAsFit ? 1 : 0]);
                }
                newSelected._forceSelect = true;
                newSelected.click();
            }
            // Update childIndex for fit mode tabs in target container
            this.childNodes.forEach((c, idx) => c.childIndex = (idx - 1));
            const content = document.getElementById(tabId + "_content");
            that.area.attach(content);
            this.classList.remove("dockingtab");
            // Change tabs instance and select on drop
            tabDom.instance = that;
            tabDom._forceSelect = true;
            tabDom.click();
            // Store info
            that.tabs[tabDom.dataset["name"]] = content;
        });
        area.root.classList.add("lexareatabscontainer");
        const [tabButtons, content] = area.split({ type: 'vertical', sizes: options.sizes ?? "auto", resize: false, top: 2 });
        tabButtons.attach(container);
        if (options.parentClass && container.parentElement) {
            container.parentElement.className += ` ${options.parentClass}`;
        }
        this.area = content;
        this.area.root.className += " lexareatabscontent";
        if (options.contentClass) {
            this.area.root.className += ` ${options.contentClass}`;
        }
        this.selected = null;
        this.root = container;
        if (options.fit) {
            // Create movable element
            let mEl = document.createElement('span');
            mEl.className = "lexareatab thumb";
            this.thumb = mEl;
            this.root.appendChild(mEl);
            const resizeObserver = new ResizeObserver((entries) => {
                const tabEl = this.thumb.item;
                if (!tabEl)
                    return;
                var transition = this.thumb.style.transition;
                this.thumb.style.transition = "none";
                this.thumb.style.transform = "translate( " + (tabEl.childIndex * tabEl.offsetWidth) + "px )";
                this.thumb.style.width = (tabEl.offsetWidth) + "px";
                LX.flushCss(this.thumb);
                this.thumb.style.transition = transition;
            });
            resizeObserver.observe(this.area.root);
        }
        // debug
        if (folding) {
            this.folded = true;
            this.folding = folding;
            if (folding == "up") {
                LX.insertChildAtIndex(area.root, area.sections[1].root, 0);
            }
            // Listen resize event on parent area
            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const bb = entry.contentRect;
                    const sibling = area.parentArea?.sections[0].root;
                    sibling.style.height = "calc(100% - " + ((42 ) + bb.height) + "px )";
                }
            });
            resizeObserver.observe(this.area.root);
            this.area.root.classList.add('folded');
        }
    }
    add(name, content, options = {}) {
        let isSelected = options.selected ?? false;
        if (isSelected) {
            this.root.querySelectorAll('span').forEach((s) => s.classList.remove('selected'));
            const pseudoParent = this.area.root.querySelector(":scope > .pseudoparent-tabs");
            const contentRoot = pseudoParent ?? this.area.root;
            contentRoot.querySelectorAll(':scope > .lextabcontent').forEach((s) => s.style.display = 'none');
        }
        isSelected = !Object.keys(this.tabs).length && !this.folding ? true : isSelected;
        let contentEl = content.root ? content.root : content;
        contentEl.originalDisplay = contentEl.style.display;
        contentEl.style.display = isSelected ? contentEl.originalDisplay : "none";
        contentEl.classList.add('lextabcontent');
        // Process icon
        if (options.icon) {
            if (!options.icon.includes('.')) // Not a file
             {
                const classes = options.icon.split(' ');
                options.icon = LX.makeIcon(classes[0], { svgClass: "sm " + classes.slice(0).join(' ') }).innerHTML;
            }
            else // an image..
             {
                const rootPath = "https://raw.githubusercontent.com/jxarco/lexgui.js/master/";
                options.icon = "<img src='" + (rootPath + options.icon) + "'>";
            }
        }
        // Create tab
        let tabEl = document.createElement('span');
        tabEl.dataset["name"] = name;
        tabEl.className = "lexareatab flex flex-row gap-1" + (isSelected ? " selected" : "");
        tabEl.innerHTML = (options.icon ?? "") + name;
        tabEl.id = name.replace(/\s/g, '') + Tabs.TAB_ID++;
        tabEl.title = options.title ?? "";
        tabEl.selected = isSelected ?? false;
        tabEl.fixed = options.fixed;
        tabEl.instance = this;
        contentEl.id = tabEl.id + "_content";
        if (options.badge) {
            const asChild = options.badge.asChild ?? false;
            const badgeOptions = {};
            if (asChild) {
                badgeOptions.parent = tabEl;
            }
            tabEl.innerHTML += LX.badge(options.badge.content ?? "", options.badge.className, badgeOptions);
        }
        if (tabEl.selected) {
            this.selected = name;
        }
        tabEl.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const scope = tabEl.instance;
            if (!tabEl.fixed) {
                // For folding tabs
                const lastValue = tabEl.selected;
                tabEl.parentElement.querySelectorAll('span').forEach((s) => s.selected = false);
                tabEl.selected = !lastValue || (tabEl._forceSelect ? true : false);
                // Manage selected
                tabEl.parentElement.querySelectorAll('span').forEach((s) => s.classList.remove('selected'));
                tabEl.classList.toggle('selected', (tabEl.selected));
                // Manage visibility
                const pseudoParent = scope.area.root.querySelector(":scope > .pseudoparent-tabs");
                const contentRoot = pseudoParent ?? scope.area.root;
                contentRoot.querySelectorAll(':scope > .lextabcontent').forEach((s) => s.style.display = 'none');
                contentEl.style.display = contentEl.originalDisplay;
                scope.selected = tabEl.dataset.name;
            }
            if (scope.folding) {
                scope.folded = tabEl.selected;
                scope.area.root.classList.toggle('folded', !scope.folded);
            }
            if (options.onSelect) {
                options.onSelect(e, tabEl.dataset.name);
            }
            if (scope.thumb) {
                scope.thumb.style.transform = "translate( " + (tabEl.childIndex * tabEl.offsetWidth) + "px )";
                scope.thumb.style.width = (tabEl.offsetWidth) + "px";
                scope.thumb.item = tabEl;
            }
            delete tabEl._forceSelect;
        });
        tabEl.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (options.onContextMenu) {
                options.onContextMenu(e, tabEl.dataset.name);
            }
        });
        if (options.allowDelete ?? false) {
            tabEl.addEventListener("mousedown", (e) => {
                if (e.button == LX.MOUSE_MIDDLE_CLICK) {
                    e.preventDefault();
                }
            });
            tabEl.addEventListener("mouseup", (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.button == LX.MOUSE_MIDDLE_CLICK) {
                    this.delete(tabEl.dataset["name"]);
                }
            });
        }
        tabEl.setAttribute('draggable', true);
        tabEl.addEventListener('dragstart', (e) => {
            const sourceAsFit = !!this.thumb;
            if (tabEl.parentElement.childNodes.length == (sourceAsFit ? 2 : 1)) {
                e.preventDefault();
                return;
            }
            e.dataTransfer.setData('source', e.target.id);
            e.dataTransfer.setData('fit', sourceAsFit);
        });
        // Attach content
        const indexOffset = options.indexOffset ?? -1;
        tabEl.childIndex = (this.root.childElementCount + indexOffset);
        LX.insertChildAtIndex(this.root, tabEl, tabEl.childIndex + 1);
        this.area.attach(contentEl);
        this.tabDOMs[name] = tabEl;
        this.tabs[name] = content;
        setTimeout(() => {
            if (options.onCreate) {
                options.onCreate.call(this, this.area.root.getBoundingClientRect());
            }
            if (isSelected && this.thumb) {
                this.thumb.classList.add("no-transition");
                this.thumb.style.transform = "translate( " + (tabEl.childIndex * tabEl.offsetWidth) + "px )";
                this.thumb.style.width = (tabEl.offsetWidth) + "px";
                this.thumb.item = tabEl;
                this.thumb.classList.remove("no-transition");
            }
        }, 10);
    }
    select(name) {
        if (!this.tabDOMs[name])
            return;
        this.tabDOMs[name].click();
    }
    delete(name) {
        if (this.selected == name) {
            this.selected = null;
        }
        const tabEl = this.tabDOMs[name];
        if (!tabEl || tabEl.fixed) {
            return;
        }
        if (this.onclose) {
            this.onclose(name);
        }
        // Delete tab element
        this.tabDOMs[name].remove();
        delete this.tabDOMs[name];
        // Delete content
        this.tabs[name].remove();
        delete this.tabs[name];
        // Select last tab
        const lastTab = this.root.lastChild;
        if (lastTab && !lastTab.fixed) {
            this.root.lastChild.click();
        }
    }
}
LX.Tabs = Tabs;

// Area.ts @jxarco
class AreaOverlayButtons {
    area;
    options;
    buttons;
    constructor(area, buttonsArray, options = {}) {
        this.area = area;
        this.options = options;
        this.buttons = {};
        this._buildButtons(buttonsArray, options);
    }
    _buildButtons(buttonsArray, options = {}) {
        options.className = "lexoverlaybuttons";
        let overlayPanel = this.area.addPanel(options);
        let overlayGroup = null;
        const container = document.createElement("div");
        container.className = "lexoverlaybuttonscontainer";
        container.appendChild(overlayPanel.root);
        this.area.attach(container);
        const float = options.float;
        let floatClass = "";
        if (float) {
            for (let i = 0; i < float.length; i++) {
                const t = float[i];
                switch (t) {
                    case 'h': break;
                    case 'v':
                        floatClass += " vertical";
                        break;
                    case 't': break;
                    case 'm':
                        floatClass += " middle";
                        break;
                    case 'b':
                        floatClass += " bottom";
                        break;
                    case 'l': break;
                    case 'c':
                        floatClass += " center";
                        break;
                    case 'r':
                        floatClass += " right";
                        break;
                }
            }
            container.className += ` ${floatClass}`;
        }
        const _addButton = (b, group, last) => {
            const _options = {
                width: "auto",
                selectable: b.selectable,
                selected: b.selected,
                icon: b.icon,
                img: b.img,
                className: b.class ?? "",
                title: b.name,
                overflowContainerX: overlayPanel.root,
                swap: b.swap
            };
            if (group) {
                if (!overlayGroup) {
                    overlayGroup = document.createElement('div');
                    overlayGroup.className = "lexoverlaygroup";
                    overlayPanel.queuedContainer = overlayGroup;
                }
                _options.parent = overlayGroup;
            }
            let callback = b.callback;
            let component = null;
            if (b.options) {
                component = overlayPanel.addSelect(null, b.options, b.value ?? b.name, callback, _options);
            }
            else {
                component = overlayPanel.addButton(null, b.name, function (value, event) {
                    if (b.selectable) {
                        if (b.group) {
                            let _prev = b.selected;
                            b.group.forEach((sub) => sub.selected = false);
                            b.selected = !_prev;
                        }
                        else {
                            b.selected = !b.selected;
                        }
                    }
                    if (callback) {
                        callback(value, event, component.root);
                    }
                }, _options);
            }
            this.buttons[b.name] = component;
            // ends the group
            if (overlayGroup && last) {
                overlayPanel.root.appendChild(overlayGroup);
                overlayGroup = null;
                overlayPanel.clearQueue();
            }
        };
        const _refreshPanel = function () {
            overlayPanel.clear();
            for (let b of buttonsArray) {
                if (b === null) {
                    // Add a separator
                    const separator = document.createElement("div");
                    separator.className = "lexoverlayseparator" + floatClass;
                    overlayPanel.root.appendChild(separator);
                    continue;
                }
                if (b.constructor === Array) {
                    for (let i = 0; i < b.length; ++i) {
                        let sub = b[i];
                        sub.group = b;
                        _addButton(sub, true, i == (b.length - 1));
                    }
                }
                else {
                    _addButton(b);
                }
            }
            // Add floating info
            if (float) {
                var height = 0;
                overlayPanel.root.childNodes.forEach((c) => { height += c.offsetHeight; });
                if (container.className.includes("middle")) {
                    container.style.top = "-moz-calc( 50% - " + (height * 0.5) + "px )";
                    container.style.top = "-webkit-calc( 50% - " + (height * 0.5) + "px )";
                    container.style.top = "calc( 50% - " + (height * 0.5) + "px )";
                }
            }
        };
        _refreshPanel();
    }
}
LX.AreaOverlayButtons = AreaOverlayButtons;
class Area {
    /**
     * @constructor Area
     * @param {Object} options
     * id: Id of the element
     * className: Add class to the element
     * width: Width of the area element [fit space]
     * height: Height of the area element [fit space]
     * skipAppend: Create but not append to GUI root [false]
     * minWidth: Minimum width to be applied when resizing
     * minHeight: Minimum height to be applied when resizing
     * maxWidth: Maximum width to be applied when resizing
     * maxHeight: Maximum height to be applied when resizing
     * layout: Layout to automatically split the area
     */
    offset = 0;
    root;
    size;
    resize = false;
    sections = [];
    panels = [];
    minWidth = 0;
    minHeight = 0;
    maxWidth = Infinity;
    maxHeight = Infinity;
    layout;
    type;
    parentArea;
    splitBar;
    splitExtended;
    overlayButtons;
    onresize;
    _autoVerticalResizeObserver;
    _root;
    constructor(options = {}) {
        var root = document.createElement('div');
        root.className = "lexarea";
        if (options.id) {
            root.id = options.id;
        }
        if (options.className) {
            root.className += " " + options.className;
        }
        var width = options.width || "100%";
        var height = options.height || "100%";
        // This has default options..
        this.setLimitBox(options.minWidth, options.minHeight, options.maxWidth, options.maxHeight);
        if (width.constructor == Number) {
            width = `${width}px`;
        }
        if (height.constructor == Number) {
            height = `${height}px`;
        }
        root.style.width = width;
        root.style.height = height;
        this.root = root;
        this.size = [this.root.offsetWidth, this.root.offsetHeight];
        let lexroot = document.getElementById("lexroot");
        if (lexroot && !options.skipAppend) {
            lexroot.appendChild(this.root);
        }
        if (options.layout) {
            this.setLayout(options.layout);
        }
        let overlay = options.overlay;
        if (overlay) {
            this.root.classList.add("overlay-" + overlay);
            if (options.left) {
                this.root.style.left = options.left;
            }
            else if (options.right) {
                this.root.style.right = options.right;
            }
            else if (options.top) {
                this.root.style.top = options.top;
            }
            else if (options.bottom) {
                this.root.style.bottom = options.bottom;
            }
            const draggable = options.draggable ?? true;
            if (draggable) {
                LX.makeDraggable(root, options);
            }
            if (options.resizeable) {
                root.classList.add("resizeable");
            }
            if (options.resize) {
                this.splitBar = document.createElement("div");
                let type = (overlay == "left") || (overlay == "right") ? "horizontal" : "vertical";
                this.type = overlay;
                this.splitBar.className = "lexsplitbar " + type;
                if (overlay == "right") {
                    this.splitBar.style.width = LX.DEFAULT_SPLITBAR_SIZE + "px";
                    this.splitBar.style.left = -(LX.DEFAULT_SPLITBAR_SIZE / 2.0) + "px";
                }
                else if (overlay == "left") {
                    let size = Math.min(document.body.clientWidth - LX.DEFAULT_SPLITBAR_SIZE, this.root.clientWidth);
                    this.splitBar.style.width = LX.DEFAULT_SPLITBAR_SIZE + "px";
                    this.splitBar.style.left = size + (LX.DEFAULT_SPLITBAR_SIZE / 2.0) + "px";
                }
                else if (overlay == "top") {
                    let size = Math.min(document.body.clientHeight - LX.DEFAULT_SPLITBAR_SIZE, this.root.clientHeight);
                    this.splitBar.style.height = LX.DEFAULT_SPLITBAR_SIZE + "px";
                    this.splitBar.style.top = size + (LX.DEFAULT_SPLITBAR_SIZE / 2.0) + "px";
                }
                else if (overlay == "bottom") {
                    this.splitBar.style.height = LX.DEFAULT_SPLITBAR_SIZE + "px";
                    this.splitBar.style.top = -(LX.DEFAULT_SPLITBAR_SIZE / 2.0) + "px";
                }
                this.splitBar.addEventListener("mousedown", innerMouseDown);
                this.root.appendChild(this.splitBar);
                const that = this;
                let lastMousePosition = [0, 0];
                function innerMouseDown(e) {
                    const doc = that.root.ownerDocument;
                    doc.addEventListener('mousemove', innerMouseMove);
                    doc.addEventListener('mouseup', innerMouseUp);
                    lastMousePosition[0] = e.x;
                    lastMousePosition[1] = e.y;
                    e.stopPropagation();
                    e.preventDefault();
                    document.body.classList.add('nocursor');
                    that.splitBar.classList.add('nocursor');
                }
                function innerMouseMove(e) {
                    switch (that.type) {
                        case "right":
                            var dt = (lastMousePosition[0] - e.x);
                            var size = (that.root.offsetWidth + dt);
                            that.root.style.width = size + "px";
                            break;
                        case "left":
                            var dt = (lastMousePosition[0] - e.x);
                            var size = Math.min(document.body.clientWidth - LX.DEFAULT_SPLITBAR_SIZE, (that.root.offsetWidth - dt));
                            that.root.style.width = size + "px";
                            that.splitBar.style.left = size + LX.DEFAULT_SPLITBAR_SIZE / 2 + "px";
                            break;
                        case "top":
                            var dt = (lastMousePosition[1] - e.y);
                            var size = Math.min(document.body.clientHeight - LX.DEFAULT_SPLITBAR_SIZE, (that.root.offsetHeight - dt));
                            that.root.style.height = size + "px";
                            that.splitBar.style.top = size + LX.DEFAULT_SPLITBAR_SIZE / 2 + "px";
                            break;
                        case "bottom":
                            var dt = (lastMousePosition[1] - e.y);
                            var size = (that.root.offsetHeight + dt);
                            that.root.style.height = size + "px";
                            break;
                    }
                    lastMousePosition[0] = e.x;
                    lastMousePosition[1] = e.y;
                    e.stopPropagation();
                    e.preventDefault();
                    // Resize events
                    if (that.onresize) {
                        that.onresize(that.root.getBoundingClientRect());
                    }
                }
                function innerMouseUp(e) {
                    const doc = that.root.ownerDocument;
                    doc.removeEventListener('mousemove', innerMouseMove);
                    doc.removeEventListener('mouseup', innerMouseUp);
                    document.body.classList.remove('nocursor');
                    that.splitBar.classList.remove('nocursor');
                }
            }
        }
    }
    /**
     * @method attach
     * @param {Element} content child to append to area (e.g. a Panel)
     */
    attach(content) {
        // Append to last split section if area has been split
        if (this.sections.length) {
            this.sections[1].attach(content);
            return;
        }
        if (!content) {
            throw ("no content to attach");
        }
        content.parent = this;
        let element = content.root ? content.root : content;
        this.root.appendChild(element);
    }
    /**
     * @method setLayout
     * @description Automatically split the area to generate the desired layout
     * @param {Array} layout
     */
    setLayout(layout) {
        this.layout = LX.deepCopy(layout);
        if (!layout.splits) {
            console.warn("Area layout has no splits!");
            return;
        }
        const _splitArea = (area, layout) => {
            if (layout.className) {
                area.root.className += ` ${layout.className}`;
            }
            if (!layout.splits) {
                return;
            }
            const type = layout.type ?? "horizontal";
            const resize = layout.resize ?? true;
            const minimizable = layout.minimizable ?? false;
            const [splitA, splitB] = area.split({ type, resize, minimizable, sizes: [layout.splits[0].size, layout.splits[1].size] });
            _splitArea(splitA, layout.splits[0]);
            _splitArea(splitB, layout.splits[1]);
        };
        _splitArea(this, layout);
    }
    /**
     * @method split
     * @param {Object} options
     * type: Split mode (horizontal, vertical) ["horizontal"]
     * sizes: CSS Size of each new area (Array) ["50%", "50%"]
     * resize: Allow area manual resizing [true]
     * sizes: "Allow the area to be minimized [false]
     */
    split(options = {}) {
        if (this.sections.length) {
            // In case Area has been split before, get 2nd section as root
            this.offset = this.root.childNodes[0].offsetHeight; // store offset to take into account when resizing
            this._root = this.sections[0].root;
            this.root = this.sections[1].root;
        }
        const type = options.type ?? "horizontal";
        const sizes = options.sizes || ["50%", "50%"];
        const auto = (options.sizes === 'auto') || (options.sizes && options.sizes[0] == "auto" && options.sizes[1] == "auto");
        const rect = this.root.getBoundingClientRect();
        // Secondary area fills space
        if (!sizes[1] || (sizes[0] != "auto" && sizes[1] == "auto")) {
            let size = sizes[0];
            let margin = options.top ? options.top : 0;
            if (size.constructor == Number) {
                size += margin;
                size = `${size}px`;
            }
            sizes[1] = "calc( 100% - " + size + " )";
        }
        let minimizable = options.minimizable ?? false;
        let resize = (options.resize ?? true) || minimizable;
        let fixedSize = options.fixedSize ?? !resize;
        let splitbarOffset = 0;
        let primarySize = [];
        let secondarySize = [];
        this.offset = 0;
        if (resize) {
            this.resize = resize;
            this.splitBar = document.createElement("div");
            this.splitBar.className = "lexsplitbar " + type;
            if (type == "horizontal") {
                this.splitBar.style.width = LX.DEFAULT_SPLITBAR_SIZE + "px";
            }
            else {
                this.splitBar.style.height = LX.DEFAULT_SPLITBAR_SIZE + "px";
            }
            this.splitBar.addEventListener('mousedown', innerMouseDown);
            splitbarOffset = (LX.DEFAULT_SPLITBAR_SIZE / 2); // updates
        }
        if (type == "horizontal") {
            this.root.style.display = "flex";
            if (!fixedSize) {
                const parentWidth = rect.width;
                const leftPx = LX.parsePixelSize(sizes[0], parentWidth);
                const rightPx = LX.parsePixelSize(sizes[1], parentWidth);
                const leftPercent = (leftPx / parentWidth) * 100;
                const rightPercent = (rightPx / parentWidth) * 100;
                // Style using percentages
                primarySize[0] = `calc(${leftPercent}% - ${splitbarOffset}px)`;
                secondarySize[0] = `calc(${rightPercent}% - ${splitbarOffset}px)`;
            }
            else {
                primarySize[0] = `calc(${sizes[0]} - ${splitbarOffset}px)`;
                secondarySize[0] = `calc(${sizes[1]} - ${splitbarOffset}px)`;
            }
            primarySize[1] = "100%";
            secondarySize[1] = "100%";
        }
        else // vertical
         {
            if (auto) {
                primarySize[1] = "auto";
                secondarySize[1] = "auto";
            }
            else if (!fixedSize) {
                const parentHeight = rect.height;
                const topPx = LX.parsePixelSize(sizes[0], parentHeight);
                const bottomPx = LX.parsePixelSize(sizes[1], parentHeight);
                const topPercent = (topPx / parentHeight) * 100;
                const bottomPercent = (bottomPx / parentHeight) * 100;
                primarySize[1] = (sizes[0] == "auto" ? "auto" : `calc(${topPercent}% - ${splitbarOffset}px)`);
                secondarySize[1] = (sizes[1] == "auto" ? "auto" : `calc(${bottomPercent}% - ${splitbarOffset}px)`);
            }
            else {
                primarySize[1] = (sizes[0] == "auto" ? "auto" : `calc(${sizes[0]} - ${splitbarOffset}px)`);
                secondarySize[1] = (sizes[1] == "auto" ? "auto" : `calc(${sizes[1]} - ${splitbarOffset}px)`);
            }
            primarySize[0] = "100%";
            secondarySize[0] = "100%";
        }
        // Create areas
        let area1 = new Area({ width: primarySize[0], height: primarySize[1], skipAppend: true, className: "split" + (options.menubar || options.sidebar ? "" : " origin") });
        let area2 = new Area({ width: secondarySize[0], height: secondarySize[1], skipAppend: true, className: "split" });
        /*
            If the parent area is not in the DOM, we need to wait for the resize event to get the its correct size
            and set the sizes of the split areas accordingly.
        */
        if (!fixedSize && (!rect.width || !rect.height)) {
            const observer = new ResizeObserver(entries => {
                console.assert(entries.length == 1, "AreaResizeObserver: more than one entry");
                const rect = entries[0].contentRect;
                if (!rect.width || !rect.height) {
                    return;
                }
                this._update([rect.width, rect.height], false);
                // On auto splits, we only need to set the size of the parent area
                if (!auto) {
                    if (type == "horizontal") {
                        const parentWidth = rect.width;
                        const leftPx = LX.parsePixelSize(sizes[0], parentWidth);
                        const rightPx = LX.parsePixelSize(sizes[1], parentWidth);
                        const leftPercent = (leftPx / parentWidth) * 100;
                        const rightPercent = (rightPx / parentWidth) * 100;
                        // Style using percentages
                        primarySize[0] = `calc(${leftPercent}% - ${splitbarOffset}px)`;
                        secondarySize[0] = `calc(${rightPercent}% - ${splitbarOffset}px)`;
                    }
                    else // vertical
                     {
                        const parentHeight = rect.height;
                        const topPx = LX.parsePixelSize(sizes[0], parentHeight);
                        const bottomPx = LX.parsePixelSize(sizes[1], parentHeight);
                        const topPercent = (topPx / parentHeight) * 100;
                        const bottomPercent = (bottomPx / parentHeight) * 100;
                        primarySize[1] = (sizes[0] == "auto" ? "auto" : `calc(${topPercent}% - ${splitbarOffset}px)`);
                        secondarySize[1] = (sizes[1] == "auto" ? "auto" : `calc(${bottomPercent}% - ${splitbarOffset}px)`);
                    }
                    area1.root.style.width = primarySize[0];
                    area1.root.style.height = primarySize[1];
                    area2.root.style.width = secondarySize[0];
                    area2.root.style.height = secondarySize[1];
                }
                area1._update();
                area2._update();
                // Stop observing
                observer.disconnect();
            });
            // Observe the parent area until the DOM is ready
            // and the size is set correctly.
            LX.doAsync(() => {
                observer.observe(this.root);
            }, 100);
        }
        if (auto && type == "vertical") {
            // Listen resize event on first area
            this._autoVerticalResizeObserver = new ResizeObserver(entries => {
                for (const entry of entries) {
                    const size = LX.getComputedSize(entry.target);
                    area2.root.style.height = "calc(100% - " + (size.height) + "px )";
                }
            });
            this._autoVerticalResizeObserver.observe(area1.root);
        }
        // Being minimizable means it's also resizeable!
        if (resize && minimizable) {
            this.splitExtended = false;
            // Keep state of the animation when ends...
            area2.root.addEventListener('animationend', (e) => {
                const opacity = getComputedStyle(area2.root).opacity;
                area2.root.classList.remove(e.animationName + "-" + type);
                area2.root.style.opacity = opacity;
                LX.flushCss(area2.root);
            });
            this.splitBar.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                LX.addContextMenu(null, e, (c) => {
                    c.add("Extend", { disabled: this.splitExtended, callback: () => { this.extend(); } });
                    c.add("Reduce", { disabled: !this.splitExtended, callback: () => { this.reduce(); } });
                });
            });
        }
        area1.parentArea = this;
        area2.parentArea = this;
        this.root.appendChild(area1.root);
        if (resize) {
            this.root.appendChild(this.splitBar);
        }
        this.root.appendChild(area2.root);
        this.sections = [area1, area2];
        this.type = type;
        // Update sizes
        this._update(rect.width || rect.height ? [rect.width, rect.height] : undefined);
        if (!resize) {
            return this.sections;
        }
        const that = this;
        function innerMouseDown(e) {
            const doc = that.root.ownerDocument;
            doc.addEventListener('mousemove', innerMouseMove);
            doc.addEventListener('mouseup', innerMouseUp);
            e.stopPropagation();
            e.preventDefault();
        }
        function innerMouseMove(e) {
            const rect = that.root.getBoundingClientRect();
            if (((e.x) < rect.x || (e.x) > (rect.x + rect.width)) ||
                ((e.y) < rect.y || (e.y) > (rect.y + rect.height))) {
                return;
            }
            if (that.type == "horizontal") {
                that._moveSplit(-e.movementX);
            }
            else {
                that._moveSplit(-e.movementY);
            }
            e.stopPropagation();
            e.preventDefault();
        }
        function innerMouseUp(e) {
            const doc = that.root.ownerDocument;
            doc.removeEventListener('mousemove', innerMouseMove);
            doc.removeEventListener('mouseup', innerMouseUp);
        }
        return this.sections;
    }
    /**
    * @method setLimitBox
    * Set min max for width and height
    */
    setLimitBox(minw = 0, minh = 0, maxw = Infinity, maxh = Infinity) {
        this.minWidth = minw;
        this.minHeight = minh;
        this.maxWidth = maxw;
        this.maxHeight = maxh;
        if (minw != 0)
            this.root.style.minWidth = `${minw}px`;
        if (minh != 0)
            this.root.style.minHeight = `${minh}px`;
        if (maxw != Infinity)
            this.root.style.maxWidth = `${maxw}px`;
        if (maxh != Infinity)
            this.root.style.maxHeight = `${maxh}px`;
    }
    /**
    * @method resize
    * Resize element
    */
    setSize(size) {
        let [width, height] = size;
        if (width != undefined && width.constructor == Number) {
            width = `${width}px`;
        }
        if (height != undefined && height.constructor == Number) {
            height = `${height}px`;
        }
        if (width) {
            this.root.style.width = width;
        }
        if (height) {
            this.root.style.height = height;
        }
        if (this.onresize) {
            this.onresize(this.root.getBoundingClientRect());
        }
        LX.doAsync(() => {
            this.size = [this.root.clientWidth, this.root.clientHeight];
            this.propagateEvent("onresize");
        }, 150);
    }
    /**
    * @method extend
    * Hide 2nd area split
    */
    extend() {
        if (this.splitExtended) {
            return;
        }
        let [area1, area2] = this.sections;
        this.splitExtended = true;
        area1.root.classList.add(`maximize-${this.type}`);
        area2.root.classList.add(`minimize-${this.type}`);
        area2.root.classList.add(`fadeout-${this.type}`);
        area2.root.classList.remove(`fadein-${this.type}`);
        if (this.type == "vertical") {
            this.offset = area2.root.offsetHeight;
            this._moveSplit(-Infinity, true);
        }
        else {
            this.offset = area2.root.offsetWidth - 8; // Force some height here...
            this._moveSplit(-Infinity, true, 8);
        }
        LX.doAsync(() => {
            this.propagateEvent('onresize');
        }, 100);
    }
    /**
    * @method reduce
    * Show 2nd area split
    */
    reduce() {
        if (!this.splitExtended) {
            return;
        }
        this.splitExtended = false;
        let [area1, area2] = this.sections;
        area1.root.classList.add(`minimize-${this.type}`);
        area2.root.classList.add(`maximize-${this.type}`);
        area2.root.classList.add(`fadein-${this.type}`);
        area2.root.classList.remove(`fadeout-${this.type}`);
        this._moveSplit(this.offset);
        LX.doAsync(() => {
            this.propagateEvent('onresize');
        }, 100);
    }
    /**
    * @method hide
    * Hide element
    */
    hide() {
        this.root.classList.add("hidden");
    }
    /**
    * @method show
    * Show element if it is hidden
    */
    show() {
        this.root.classList.remove("hidden");
    }
    /**
    * @method toggle
    * Toggle element if it is hidden
    */
    toggle(force) {
        this.root.classList.toggle("hidden", force);
    }
    /**
     * @method propagateEvent
     */
    propagateEvent(eventName) {
        for (let i = 0; i < this.sections.length; i++) {
            const area = this.sections[i];
            if (area[eventName]) {
                area[eventName].call(this, area.root.getBoundingClientRect());
            }
            area.propagateEvent(eventName);
        }
    }
    /**
     * @method addPanel
     * @param {Object} options
     * Options to create a Panel
     */
    addPanel(options) {
        let panel = new Panel(options);
        this.attach(panel);
        this.panels.push(panel);
        return panel;
    }
    /**
     * @method addMenubar
     * @param {Array} items Items to fill the menubar
     * @param {Object} options:
     * float: Justify content (left, center, right) [left]
     * sticky: Fix menubar at the top [true]
     */
    addMenubar(items, options = {}) {
        let menubar = new Menubar(items, options);
        LX.menubars.push(menubar);
        const [bar, content] = this.split({ type: 'vertical', sizes: ["48px", null], resize: false, menubar: true });
        menubar.siblingArea = content;
        bar.attach(menubar);
        bar.isMenubar = true;
        if (options.sticky ?? true) {
            bar.root.className += " sticky top-0 z-1000";
        }
        if (options.parentClass) {
            bar.root.className += ` ${options.parentClass}`;
        }
        return menubar;
    }
    /**
     * @method addSidebar
     * @param {Function} callback Function to fill the sidebar
     * @param {Object} options: Sidebar options
     * width: Width of the sidebar [16rem]
     * side: Side to attach the sidebar (left|right) [left]
     */
    addSidebar(callback, options = {}) {
        let sidebar = new LX.Sidebar({ callback, ...options });
        if (callback) {
            callback(sidebar);
        }
        // Generate DOM elements after adding all entries
        sidebar.update();
        LX.sidebars.push(sidebar);
        const side = options.side ?? "left";
        console.assert(side == "left" || side == "right", "Invalid sidebar side: " + side);
        const leftSidebar = (side == "left");
        const width = options.width ?? "16rem";
        const sizes = leftSidebar ? [width, null] : [null, width];
        const [left, right] = this.split({ type: 'horizontal', sizes, resize: false, sidebar: true });
        sidebar.siblingArea = leftSidebar ? right : left;
        let bar = leftSidebar ? left : right;
        bar.attach(sidebar);
        bar.isSidebar = true;
        if (options.parentClass) {
            bar.root.className += ` ${options.parentClass}`;
        }
        return sidebar;
    }
    /**
     * @method addOverlayButtons
     * @param {Array} buttons Buttons info
     * @param {Object} options:
     * float: Where to put the buttons (h: horizontal, v: vertical, t: top, m: middle, b: bottom, l: left, c: center, r: right) [htc]
     */
    addOverlayButtons(buttons, options = {}) {
        // Add to last split section if area has been split
        if (this.sections.length) {
            return this.sections[1].addOverlayButtons(buttons, options);
        }
        console.assert(buttons.constructor == Array && buttons.length !== 0);
        // Set area to relative to use local position
        this.root.style.position = "relative";
        // Reset if already exists
        this.overlayButtons = new AreaOverlayButtons(this, buttons, options);
        return this.overlayButtons;
    }
    /**
     * @method addTabs
     * @param {Object} options:
     * parentClass: Add extra class to tab buttons container
     */
    addTabs(options = {}) {
        const tabs = new Tabs(this, options);
        if (options.folding) {
            this.parentArea?._disableSplitResize();
            // Compensate split bar...
            this.root.style.paddingTop = "4px";
        }
        return tabs;
    }
    _moveSplit(dt, forceAnimation = false, forceWidth = 0) {
        if (!this.type) {
            throw ("No split area");
        }
        if (dt === undefined) // Splitbar didn't move!
         {
            return;
        }
        // When manual resizing, we don't need the observer anymore
        if (this._autoVerticalResizeObserver) {
            this._autoVerticalResizeObserver.disconnect();
        }
        const a1 = this.sections[0];
        var a1Root = a1.root;
        if (!a1Root.classList.contains("origin")) {
            a1Root = a1Root.parentElement;
        }
        const a2 = this.sections[1];
        const a2Root = a2.root;
        const splitData = "- " + LX.DEFAULT_SPLITBAR_SIZE + "px";
        let transition = null;
        if (!forceAnimation) {
            // Remove transitions for this change..
            transition = a1Root.style.transition;
            a1Root.style.transition = a2Root.style.transition = "none";
            // LX.flushCss( a1Root );
        }
        if (this.type == "horizontal") {
            var size = Math.max(a2Root.offsetWidth + dt, parseInt(a2.minWidth));
            if (forceWidth)
                size = forceWidth;
            const parentWidth = this.size[0];
            const rightPercent = (size / parentWidth) * 100;
            const leftPercent = Math.max(0, 100 - rightPercent);
            a1Root.style.width = `-moz-calc(${leftPercent}% ${splitData})`;
            a1Root.style.width = `-webkit-calc( ${leftPercent}% ${splitData})`;
            a1Root.style.width = `calc( ${leftPercent}% ${splitData})`;
            a2Root.style.width = `${rightPercent}%`;
            a2Root.style.width = `${rightPercent}%`;
            a2Root.style.width = `${rightPercent}%`;
            if (a1.maxWidth != Infinity) {
                a2Root.style.minWidth = `calc( 100% - ${parseInt(a1.maxWidth)}px )`;
            }
        }
        else {
            const parentHeight = this.size[1];
            var size = Math.max((a2Root.offsetHeight + dt) + a2.offset, parseInt(a2.minHeight));
            size = Math.min(parentHeight - LX.DEFAULT_SPLITBAR_SIZE, size);
            if (forceWidth)
                size = forceWidth;
            const bottomPercent = (size / parentHeight) * 100;
            const topPercent = Math.max(0, 100 - bottomPercent);
            a1Root.style.height = `-moz-calc(${topPercent}% ${splitData})`;
            a1Root.style.height = `-webkit-calc( ${topPercent}% ${splitData})`;
            a1Root.style.height = `calc( ${topPercent}% ${splitData})`;
            a2Root.style.height = `${bottomPercent}%`;
            a2Root.style.height = `${bottomPercent}%`;
            a2Root.style.height = `${bottomPercent}%`;
            if (a1.maxHeight != Infinity) {
                a2Root.style.minHeight = `calc( 100% - ${parseInt(a1.maxHeight)}px )`;
            }
        }
        if (!forceAnimation) {
            // Reapply transitions
            a1Root.style.transition = a2Root.style.transition = transition;
        }
        LX.doAsync(() => {
            this._update();
            this.propagateEvent('onresize');
        }, 10);
    }
    _disableSplitResize() {
        this.resize = false;
        this.splitBar.remove();
        delete this.splitBar;
    }
    _update(newSize, propagate = true) {
        if (!newSize) {
            const rect = this.root.getBoundingClientRect();
            this.size = [rect.width, rect.height];
        }
        else {
            this.size = newSize;
        }
        if (propagate) {
            for (var i = 0; i < this.sections.length; i++) {
                this.sections[i]._update();
            }
        }
    }
}
LX.Area = Area;

// Utils.ts @jxarco
function clamp(num, min, max) { return Math.min(Math.max(num, min), max); }
function round(number, precision) { return precision == 0 ? Math.floor(number) : +((number).toFixed(precision ?? 2).replace(/([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, '$1')); }
function remapRange(oldValue, oldMin, oldMax, newMin, newMax) { return (((oldValue - oldMin) * (newMax - newMin)) / (oldMax - oldMin)) + newMin; }
LX.clamp = clamp;
LX.round = round;
LX.remapRange = remapRange;
// Timer that works everywhere (from litegraph.js)
if (typeof performance != "undefined") {
    LX.getTime = performance.now.bind(performance);
}
else if (typeof Date != "undefined" && Date.now) {
    LX.getTime = Date.now.bind(Date);
}
else {
    LX.getTime = function () {
        return new Date().getTime();
    };
}
/**
 * @method doAsync
 * @description Call a function asynchronously
 * @param {Function} fn Function to call
 * @param {Number} ms Time to wait until calling the function (in milliseconds)
 */
function doAsync(fn, ms) {
    {
        setTimeout(fn, ms ?? 0);
    }
}
LX.doAsync = doAsync;
/**
 * @method flushCss
 * @description By reading the offsetHeight property, we are forcing the browser to flush
 * the pending CSS changes (which it does to ensure the value obtained is accurate).
 * @param {HTMLElement} element
 */
function flushCss(element) {
    element.offsetHeight;
}
LX.flushCss = flushCss;
/**
 * @method deleteElement
 * @param {HTMLElement} element
 */
function deleteElement(element) {
    if (element)
        element.remove();
}
LX.deleteElement = deleteElement;
/**
 * @method toCamelCase
 * @param {String} str
 */
function toCamelCase(str) {
    return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
}
LX.toCamelCase = toCamelCase;
/**
 * @method toTitleCase
 * @param {String} str
 */
function toTitleCase(str) {
    return str.replace(/-/g, " ").toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}
LX.toTitleCase = toTitleCase;
/**
 * @method toKebabCase
 * @param {String} str
 */
function toKebabCase(str) {
    return str.replace(/[A-Z]/g, m => "-" + m.toLowerCase());
}
LX.toKebabCase = toKebabCase;
/**
 * @method getSupportedDOMName
 * @description Convert a text string to a valid DOM name
 * @param {String} text Original text
 */
function getSupportedDOMName(text) {
    console.assert(typeof text == "string", "getSupportedDOMName: Text is not a string!");
    let name = text.trim();
    // Replace specific known symbols
    name = name.replace(/@/g, '_at_').replace(/\+/g, '_plus_').replace(/\./g, '_dot_');
    name = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    // prefix with an underscore if needed
    if (/^[0-9]/.test(name)) {
        name = '_' + name;
    }
    return name;
}
LX.getSupportedDOMName = getSupportedDOMName;
/**
 * @method has
 * @description Ask if LexGUI is using a specific extension
 * @param {String} extensionName Name of the LexGUI extension
 */
function has(extensionName) {
    return (LX.extensions.indexOf(extensionName) > -1);
}
LX.has = has;
/**
 * @method getExtension
 * @description Get a extension from a path/url/filename
 * @param {String} name
 */
function getExtension(name) {
    return name.includes('.') ? name.split('.').pop() : null;
}
LX.getExtension = getExtension;
/**
 * @method stripHTML
 * @description Cleans any DOM element string to get only the text
 * @param {String} html
 */
function stripHTML(html) {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}
LX.stripHTML = stripHTML;
/**
 * @method stripTags
 * @description Cleans any DOM element tags to get only the text
 * @param {String} str
 * @param {String} allowed
 * https://locutus.io/php/strings/strip_tags/index.html
 */
function stripTags(str, allowed) {
    // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
    allowed = (((allowed || '') + '').toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join('');
    const tags = /<\/?([a-z0-9]*)\b[^>]*>?/gi;
    const commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
    let after = str;
    // removes the '<' char at the end of the string to replicate PHP's behaviour
    after = after.substring(after.length - 1) === '<' ? after.substring(0, after.length - 1) : after;
    // recursively remove tags to ensure that the returned string doesn't contain forbidden tags after previous passes (e.g. '<<bait/>switch/>')
    while (true) {
        const before = after;
        after = before.replace(commentsAndPhpTags, '').replace(tags, function ($0, $1) {
            return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
        });
        // return once no more tags are removed
        if (before === after) {
            return after;
        }
    }
}
LX.stripTags = stripTags;
/**
 * @method parsePixelSize
 * @description Parses any css size and returns a number of pixels
 * @param {Number|String} size
 * @param {Number} total
 */
function parsePixelSize(size, total) {
    // Assuming pixels..
    if (size.constructor === Number) {
        return size;
    }
    if (size.constructor === String) {
        const value = parseFloat(size);
        if (size.endsWith("px")) {
            return value;
        } // String pixels
        if (size.endsWith('%')) {
            return (value / 100) * total;
        } // Percentage
        if (size.endsWith("rem") || size.endsWith("em")) {
            const rootFontSize = 16; /*parseFloat(getComputedStyle(document.documentElement).fontSize);*/
            return value * rootFontSize;
        } // rem unit: assume 16px = 1rem
        if (size.endsWith("vw")) {
            return (value / 100) * window.innerWidth;
        } // wViewport units
        if (size.endsWith("vh")) {
            return (value / 100) * window.innerHeight;
        } // hViewport units
        // Any CSS calc expression (e.g., "calc(30% - 4px)")
        if (size.startsWith("calc(")) {
            const expr = size.slice(5, -1);
            const parts = expr.split(/([+\-])/); // ["30% ", "-", "4px"]
            let result = 0;
            let op = "+";
            for (let part of parts) {
                part = part.trim();
                if (part === "+" || part === "-") {
                    op = part;
                }
                else {
                    let value = parsePixelSize(part, total);
                    result = (op === "+") ? result + value : result - value;
                }
            }
            return result;
        }
    }
    throw ("Bad size format!");
}
LX.parsePixelSize = parsePixelSize;
/**
 * @method deepCopy
 * @description Create a deep copy with no references from an object
 * @param {Object} obj
 */
function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}
LX.deepCopy = deepCopy;
/**
 * @method setTheme
 * @description Set dark or light theme
 * @param {String} colorScheme Name of the scheme
 * @param {Boolean} storeLocal Store in localStorage
 */
function setTheme(colorScheme, storeLocal = true) {
    colorScheme = (colorScheme == "light") ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", colorScheme);
    if (storeLocal)
        localStorage.setItem("lxColorScheme", colorScheme);
    LX.emitSignal("@on_new_color_scheme", colorScheme);
}
LX.setTheme = setTheme;
/**
 * @method getTheme
 * @description Gets either "dark" or "light" theme value
 */
function getTheme() {
    return document.documentElement.getAttribute("data-theme") ?? "dark";
}
LX.getTheme = getTheme;
/**
 * @method switchTheme
 * @description Toggles between "dark" and "light" themes
 */
function switchTheme() {
    const currentTheme = getTheme();
    setTheme(currentTheme == "dark" ? "light" : "dark");
}
LX.switchTheme = switchTheme;
/**
 * @method setSystemTheme
 * @description Sets back the system theme
 */
function setSystemTheme() {
    const currentTheme = (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) ? "light" : "dark";
    setTheme(currentTheme);
    localStorage.removeItem("lxColorScheme");
    // Reapply listener
    if (LX._mqlPrefersDarkScheme) {
        LX._mqlPrefersDarkScheme.removeEventListener("change", LX._onChangeSystemTheme);
        LX._mqlPrefersDarkScheme.addEventListener("change", LX._onChangeSystemTheme);
    }
}
LX.setSystemTheme = setSystemTheme;
/**
 * @method setThemeColor
 * @description Sets a new value for one of the main theme variables
 * @param {String} colorName Name of the theme variable
 * @param {String} color Color in rgba/hex
 */
function setThemeColor(colorName, color) {
    const r = document.querySelector(':root');
    r.style.setProperty('--' + colorName, color);
}
LX.setThemeColor = setThemeColor;
/**
 * @method getThemeColor
 * @description Get the value for one of the main theme variables
 * @param {String} colorName Name of the theme variable
 */
function getThemeColor(colorName) {
    const r = document.querySelector(':root');
    const s = getComputedStyle(r);
    const value = s.getPropertyValue('--' + colorName);
    if (value.includes("light-dark")) {
        const currentScheme = s.getPropertyValue("color-scheme");
        if (currentScheme == "light") {
            return value.substring(value.indexOf('(') + 1, value.indexOf(',')).replace(/\s/g, '');
        }
        else {
            return value.substring(value.indexOf(',') + 1, value.indexOf(')')).replace(/\s/g, '');
        }
    }
    return value;
}
LX.getThemeColor = getThemeColor;
/**
 * @method switchSpacing
 * @description Toggles between "default" and "compact" spacing layouts
 */
function switchSpacing() {
    const currentSpacing = document.documentElement.getAttribute("data-spacing") ?? "default";
    document.documentElement.setAttribute("data-spacing", (currentSpacing == "default") ? "compact" : "default");
    LX.emitSignal("@on_new_spacing_layout", currentSpacing);
}
LX.switchSpacing = switchSpacing;
/**
 * @method getBase64Image
 * @description Convert an image to a base64 string
 * @param {Image} img
 */
function getBase64Image(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (ctx)
        ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
}
LX.getBase64Image = getBase64Image;
/**
 * @method hexToRgb
 * @description Convert a hexadecimal string to a valid RGB color
 * @param {String} hex Hexadecimal color
 */
function hexToRgb(hex) {
    const hexPattern = /^#(?:[A-Fa-f0-9]{3,4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
    if (!hexPattern.test(hex)) {
        throw (`Invalid Hex Color: ${hex}`);
    }
    hex = hex.replace(/^#/, '');
    // Expand shorthand form (#RGB or #RGBA)
    if (hex.length === 3 || hex.length === 4) {
        hex = hex.split('').map(c => c + c).join('');
    }
    const bigint = parseInt(hex, 16);
    const r = ((bigint >> (hex.length === 8 ? 24 : 16)) & 255) / 255;
    const g = ((bigint >> (hex.length === 8 ? 16 : 8)) & 255) / 255;
    const b = ((bigint >> (hex.length === 8 ? 8 : 0)) & 255) / 255;
    const a = (hex.length === 8 ? (bigint & 255) : (hex.length === 4 ? parseInt(hex.slice(-2), 16) : 255)) / 255;
    return { r, g, b, a };
}
LX.hexToRgb = hexToRgb;
/**
 * @method hexToHsv
 * @description Convert a hexadecimal string to HSV (0..360|0..1|0..1)
 * @param {String} hex Hexadecimal color
 */
function hexToHsv(hex) {
    const rgb = hexToRgb(hex);
    return rgbToHsv(rgb);
}
LX.hexToHsv = hexToHsv;
/**
 * @method rgbToHex
 * @description Convert a RGB color to a hexadecimal string
 * @param {Object} rgb Object containing RGB color
 * @param {Number} scale Use 255 for 0..255 range or 1 for 0..1 range
 */
function rgbToHex(rgb, scale = 255) {
    const rgbArray = [rgb.r, rgb.g, rgb.b];
    if (rgb.a != undefined)
        rgbArray.push(rgb.a);
    return ("#" +
        rgbArray.map(c => {
            c = Math.floor(c * scale);
            const hex = c.toString(16);
            return hex.length === 1 ? ('0' + hex) : hex;
        }).join(""));
}
LX.rgbToHex = rgbToHex;
/**
 * @method rgbToCss
 * @description Convert a RGB color (0..1) to a CSS color format
 * @param {Object} rgb Object containing RGB color
 */
function rgbToCss(rgb) {
    return { r: Math.floor(rgb.r * 255), g: Math.floor(rgb.g * 255), b: Math.floor(rgb.b * 255), a: rgb.a };
}
LX.rgbToCss = rgbToCss;
/**
 * @method rgbToHsv
 * @description Convert a RGB color (0..1) array to HSV (0..360|0..1|0..1)
 * @param {Object} rgb Array containing R, G, B
 */
function rgbToHsv(rgb) {
    let { r, g, b, a } = rgb;
    a = a ?? 1;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
        if (max === r) {
            h = ((g - b) / d) % 6;
        }
        else if (max === g) {
            h = (b - r) / d + 2;
        }
        else {
            h = (r - g) / d + 4;
        }
        h *= 60;
        if (h < 0) {
            h += 360;
        }
    }
    const s = max === 0 ? 0 : (d / max);
    const v = max;
    return { h, s, v, a };
}
LX.rgbToHsv = rgbToHsv;
/**
 * @method hsvToRgb
 * @description Convert an HSV color (0..360|0..1|0..1) to RGB (0..1|0..255)
 * @param {Object} hsv containing H, S, V
 */
function hsvToRgb(hsv) {
    const { h, s, v, a } = hsv;
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;
    if (h < 60) {
        r = c;
        g = x;
        b = 0;
    }
    else if (h < 120) {
        r = x;
        g = c;
        b = 0;
    }
    else if (h < 180) {
        r = 0;
        g = c;
        b = x;
    }
    else if (h < 240) {
        r = 0;
        g = x;
        b = c;
    }
    else if (h < 300) {
        r = x;
        g = 0;
        b = c;
    }
    else {
        r = c;
        g = 0;
        b = x;
    }
    return { r: (r + m), g: (g + m), b: (b + m), a };
}
LX.hsvToRgb = hsvToRgb;
/**
 * @method dateFromDateString
 * @description Get an instance of Date() from a Date in String format (DD/MM/YYYY)
 * @param {String} dateString
 */
function dateFromDateString(dateString) {
    const tokens = dateString.split('/');
    const day = parseInt(tokens[0]);
    const month = parseInt(tokens[1]);
    const year = parseInt(tokens[2]);
    return new Date(`${month}/${day}/${year}`);
}
LX.dateFromDateString = dateFromDateString;
/**
 * @method measureRealWidth
 * @description Measure the pixel width of a text
 * @param {String} value Text to measure
 * @param {Number} paddingPlusMargin Padding offset
 */
function measureRealWidth(value, paddingPlusMargin = 8) {
    var i = document.createElement("span");
    i.className = "lexinputmeasure";
    i.innerHTML = value;
    document.body.appendChild(i);
    var rect = i.getBoundingClientRect();
    LX.deleteElement(i);
    return rect.width + paddingPlusMargin;
}
LX.measureRealWidth = measureRealWidth;
/**
 * @method guidGenerator
 * @description Get a random unique id
 */
function guidGenerator() {
    var S4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return (S4() + "-" + S4() + "-" + S4());
}
LX.guidGenerator = guidGenerator;
/**
 * @method buildTextPattern
 * @description Create a validation pattern using specific options
 * @param {Object} options
 * lowercase (Boolean): Text must contain a lowercase char
 * uppercase (Boolean): Text must contain an uppercase char
 * digit (Boolean): Text must contain a digit
 * specialChar (Boolean): Text must contain a special char
 * noSpaces (Boolean): Do not allow spaces in text
 * minLength (Number): Text minimum length
 * maxLength (Number): Text maximum length
 * asRegExp (Boolean): Return pattern as Regular Expression instance
 */
function buildTextPattern(options = {}) {
    let patterns = [];
    if (options.lowercase)
        patterns.push("(?=.*[a-z])");
    if (options.uppercase)
        patterns.push("(?=.*[A-Z])");
    if (options.digit)
        patterns.push("(?=.*\\d)");
    if (options.specialChar)
        patterns.push("(?=.*[@#$%^&+=!])");
    if (options.noSpaces)
        patterns.push("(?!.*\\s)");
    if (options.email)
        patterns.push("(^[^\s@]+@[^\s@]+\.[^\s@]+$)");
    let minLength = options.minLength || 0;
    let maxLength = options.maxLength || ""; // Empty means no max length restriction
    let pattern = `^${patterns.join("")}.{${minLength},${maxLength}}$`;
    return options.asRegExp ? new RegExp(pattern) : pattern;
}
LX.buildTextPattern = buildTextPattern;
/**
 * Checks a value against a set of pattern requirements and returns an array
 * of specific error messages for all criteria that failed.
 * @param { String } value The string to validate.
 * @param { Object } pattern The pattern options
 * @returns { Array } An array of error messages for failed criteria.
 */
function validateValueAtPattern(value, pattern = {}, ...args) {
    const errors = [];
    const minLength = pattern.minLength || 0;
    const maxLength = pattern.maxLength; // undefined means no max limit
    // Length requirements
    if (value.length < minLength)
        errors.push(`Must be at least ${minLength} characters long.`);
    else if (maxLength !== undefined && value.length > maxLength)
        errors.push(`Must be no more than ${maxLength} characters long.`);
    // Check for Lowercase, Uppercase, Digits
    if (pattern.lowercase && !/[a-z]/.test(value))
        errors.push("Must contain at least one lowercase letter (a-z).");
    if (pattern.uppercase && !/[A-Z]/.test(value))
        errors.push("Must contain at least one uppercase letter (A-Z).");
    if (pattern.digit && !/\d/.test(value))
        errors.push("Must contain at least one number (0-9).");
    // Check for No Spaces (The original regex was (?!.*\s), meaning 'not followed by any character and a space')
    if (pattern.noSpaces && /\s/.test(value))
        errors.push("Must NOT contain any spaces.");
    // Check for Special Character (using the same set as buildTextPattern)
    if (pattern.specialChar && !/[@#$%^&+=!]/.test(value))
        errors.push("Must contain at least one special character (e.g., @, #, $, %, ^, &, +, =, !).");
    // Check email formatting
    if (pattern.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
        errors.push("Must have a valid email format.");
    // Check match to any other text word
    if (pattern.fieldMatchName && value !== (args[0]))
        errors.push(`Must match ${pattern.fieldMatchName} field.`);
    return errors;
}
LX.validateValueAtPattern = validateValueAtPattern;
/**
 * @method makeDraggable
 * @description Allows an element to be dragged
 * @param {Element} domEl
 * @param {Object} options
 * autoAdjust (Bool): Sets in a correct position at the beggining
 * dragMargin (Number): Margin of drag container
 * onMove (Function): Called each move event
 * onDragStart (Function): Called when drag event starts
 * updateLayers (Function): Update Zindex of elements to update layers
 */
function makeDraggable(domEl, options = {}) {
    let offsetX = 0;
    let offsetY = 0;
    let currentTarget = null;
    let targetClass = options.targetClass;
    let dragMargin = options.dragMargin ?? 3;
    let _computePosition = (e, top, left) => {
        const nullRect = { x: 0, y: 0, width: 0, height: 0 };
        const parentRect = domEl.parentElement ? domEl.parentElement.getBoundingClientRect() : nullRect;
        const isFixed = (domEl.style.position == "fixed");
        const fixedOffset = isFixed ? new vec2(parentRect.x, parentRect.y) : new vec2();
        left = left ?? e.clientX - offsetX - parentRect.x;
        top = top ?? e.clientY - offsetY - parentRect.y;
        domEl.style.left = LX.clamp(left, dragMargin + fixedOffset.x, fixedOffset.x + parentRect.width - domEl.offsetWidth - dragMargin) + 'px';
        domEl.style.top = LX.clamp(top, dragMargin + fixedOffset.y, fixedOffset.y + parentRect.height - domEl.offsetHeight - dragMargin) + 'px';
        domEl.style.translate = "none"; // Force remove translation
    };
    // Initial adjustment
    if (options.autoAdjust) {
        _computePosition(null, parseInt(domEl.style.left), parseInt(domEl.style.top));
    }
    let id = LX.guidGenerator();
    domEl['draggable-id'] = id;
    const defaultMoveFunc = (e) => {
        if (!currentTarget) {
            return;
        }
        _computePosition(e);
    };
    const customMoveFunc = (e) => {
        if (!currentTarget) {
            return;
        }
        if (options.onMove) {
            options.onMove(currentTarget);
        }
    };
    let onMove = options.onMove ? customMoveFunc : defaultMoveFunc;
    let onDragStart = options.onDragStart;
    domEl.setAttribute("draggable", "true");
    domEl.addEventListener("mousedown", function (e) {
        currentTarget = (e.target.classList.contains(targetClass) || !targetClass) ? e.target : null;
    });
    domEl.addEventListener("dragstart", function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (!currentTarget) {
            return;
        }
        // Remove image when dragging
        var img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
        if (e.dataTransfer) {
            e.dataTransfer.setDragImage(img, 0, 0);
            e.dataTransfer.effectAllowed = "move";
        }
        const rect = e.target.getBoundingClientRect();
        const parentRect = currentTarget.parentElement.getBoundingClientRect();
        const isFixed = (currentTarget.style.position == "fixed");
        const fixedOffset = isFixed ? new vec2(parentRect.x, parentRect.y) : new vec2();
        offsetX = e.clientX - rect.x - fixedOffset.x;
        offsetY = e.clientY - rect.y - fixedOffset.y;
        document.addEventListener("mousemove", onMove);
        currentTarget.eventCatched = true;
        if (options.updateLayers ?? true) {
            // Force active dialog to show on top
            if (LX.activeDraggable) {
                LX.activeDraggable.style.zIndex = LX.DRAGGABLE_Z_INDEX;
            }
            LX.activeDraggable = domEl;
            LX.activeDraggable.style.zIndex = LX.DRAGGABLE_Z_INDEX + 1;
        }
        if (onDragStart) {
            onDragStart(currentTarget, e);
        }
    }, false);
    document.addEventListener('mouseup', (e) => {
        if (currentTarget) {
            currentTarget = null;
            document.removeEventListener("mousemove", onMove);
        }
    });
}
LX.makeDraggable = makeDraggable;
/**
 * @method makeCollapsible
 * @description Allows an element to be collapsed/expanded
 * @param {Element} domEl: Element to be treated as collapsible
 * @param {Element} content: Content to display/hide on collapse/extend
 * @param {Element} parent: Element where the content will be appended (default is domEl.parent)
 * @param {Object} options
 */
function makeCollapsible(domEl, content, parent, options = {}) {
    domEl.classList.add("collapsible");
    const collapsed = (options.collapsed ?? true);
    const actionIcon = LX.makeIcon("Right");
    actionIcon.classList.add("collapser");
    actionIcon.dataset["collapsed"] = `${collapsed}`;
    actionIcon.style.marginLeft = "auto";
    actionIcon.style.marginRight = "0.2rem";
    actionIcon.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (this.dataset["collapsed"]) {
            delete this.dataset["collapsed"];
            content.style.display = "block";
        }
        else {
            this.dataset["collapsed"] = "true";
            content.style.display = "none";
        }
    });
    domEl.appendChild(actionIcon);
    parent = parent ?? domEl.parentElement;
    parent.appendChild(content);
}
LX.makeCollapsible = makeCollapsible;
/**
 * @method makeCodeSnippet
 * @description Create a code snippet in a specific language
 * @param {String} code
 * @param {Array} size
 * @param {Object} options
 * language (String):
 * windowMode (Boolean):
 * lineNumbers (Boolean):
 * firstLine (Number): TODO
 * linesAdded (Array):
 * linesRemoved (Array):
 * tabName (String):
 * className (String): Extra class to customize snippet
 */
function makeCodeSnippet(code, size, options = {}) {
    if (!LX.has('CodeEditor')) {
        console.error("Import the CodeEditor component to create snippets!");
        return;
    }
    const snippet = document.createElement("div");
    snippet.className = "lexcodesnippet " + (options.className ?? "");
    snippet.style.width = size ? size[0] : "auto";
    snippet.style.height = size ? size[1] : "auto";
    const area = new Area({ xskipAppend: true });
    new LX.CodeEditor(area, {
        skipInfo: true,
        disableEdition: true,
        allowAddScripts: false,
        name: options.tabName,
        callback: (instance) => {
            instance.setText(code, options.language ?? "Plain Text");
            if (options.linesAdded) {
                const code = instance.root.querySelector(".code");
                for (let ls of options.linesAdded) {
                    const l = ls;
                    if (l.constructor == Number) {
                        code.childNodes[l - 1].classList.add("added");
                    }
                    else if (l.constructor == Array) // It's a range
                     {
                        for (let i = (l[0] - 1); i <= (l[1] - 1); i++) {
                            code.childNodes[i].classList.add("added");
                        }
                    }
                }
            }
            if (options.linesRemoved) {
                const code = instance.root.querySelector(".code");
                for (let ls of options.linesRemoved) {
                    const l = ls;
                    if (l.constructor == Number) {
                        code.childNodes[l - 1].classList.add("removed");
                    }
                    else if (l.constructor == Array) // It's a range
                     {
                        for (let i = (l[0] - 1); i <= (l[1] - 1); i++) {
                            code.childNodes[i].classList.add("removed");
                        }
                    }
                }
            }
            if (options.windowMode) {
                const windowActionButtons = document.createElement("div");
                windowActionButtons.className = "lexwindowbuttons";
                const aButton = document.createElement("span");
                aButton.style.background = "#ee4f50";
                const bButton = document.createElement("span");
                bButton.style.background = "#f5b720";
                const cButton = document.createElement("span");
                cButton.style.background = "#53ca29";
                windowActionButtons.appendChild(aButton);
                windowActionButtons.appendChild(bButton);
                windowActionButtons.appendChild(cButton);
                const tabs = instance.root.querySelector(".lexareatabs");
                tabs.prepend(windowActionButtons);
            }
            if (!(options.lineNumbers ?? true)) {
                instance.root.classList.add("no-gutter");
            }
        }
    });
    snippet.appendChild(area.root);
    return snippet;
}
LX.makeCodeSnippet = makeCodeSnippet;
/**
 * @method makeKbd
 * @description Kbd element to display a keyboard key.
 * @param {Array} keys
 * @param {String} extraClass
 */
function makeKbd(keys, useSpecialKeys = true, extraClass = "") {
    const specialKeys = {
        "Ctrl": '⌃',
        "Enter": '↩',
        "Shift": '⇧',
        "CapsLock": '⇪',
        "Meta": '⌘',
        "Option": '⌥',
        "Alt": '⌥',
        "Tab": '⇥',
        "ArrowUp": '↑',
        "ArrowDown": '↓',
        "ArrowLeft": '←',
        "ArrowRight": '→',
        "Space": '␣'
    };
    const kbd = LX.makeContainer(["auto", "auto"], "flex flex-row ml-auto");
    for (const k of keys) {
        LX.makeContainer(["auto", "auto"], "self-center text-xs fg-secondary select-none " + extraClass, useSpecialKeys ? specialKeys[k] ?? k : k, kbd);
    }
    return kbd;
}
LX.makeKbd = makeKbd;
/**
 * @method makeBreadcrumb
 * @description Displays the path to the current resource using a hierarchy
 * @param {Array} items
 * @param {Object} options
 * maxItems: Max items until ellipsis is used to overflow
 * separatorIcon: Customize separator icon
 */
function makeBreadcrumb(items, options = {}) {
    const breadcrumb = LX.makeContainer(["auto", "auto"], "flex flex-row gap-1");
    const separatorIcon = options.separatorIcon ?? "ChevronRight";
    const maxItems = options.maxItems ?? 4;
    const eraseNum = items.length - maxItems;
    if (eraseNum > 0) {
        const erased = items.splice(1, eraseNum + 1);
        const ellipsisItem = { title: "...", ellipsis: erased.map(v => v.title).join("/") };
        items.splice(1, 0, ellipsisItem);
    }
    for (let i = 0; i < items.length; ++i) {
        const item = items[i];
        console.assert(item.title, "Breadcrumb item must have a title!");
        if (i != 0) {
            const icon = LX.makeIcon(separatorIcon, { svgClass: "sm fg-secondary separator" });
            breadcrumb.appendChild(icon);
        }
        const lastElement = (i == items.length - 1);
        const breadcrumbItem = LX.makeContainer(["auto", "auto"], `p-1 flex flex-row gap-1 items-center ${lastElement ? "" : "fg-secondary"}`);
        breadcrumb.appendChild(breadcrumbItem);
        let itemTitle = LX.makeElement("p", "", item.title);
        if (item.icon) {
            breadcrumbItem.appendChild(LX.makeIcon(item.icon, { svgClass: "sm" }));
        }
        if (item.items !== undefined) {
            const bDropdownTrigger = LX.makeContainer(["auto", "auto"], `${lastElement ? "" : "fg-secondary"}`);
            LX.listen(bDropdownTrigger, "click", (e) => {
                LX.addDropdownMenu(e.target, item.items, { side: "bottom", align: "start" });
            });
            bDropdownTrigger.append(itemTitle);
            breadcrumbItem.appendChild(bDropdownTrigger);
        }
        else if (item.url !== undefined) {
            let itemUrl = LX.makeElement("a", `decoration-none fg-${lastElement ? "primary" : "secondary"}`, "", breadcrumbItem);
            itemUrl.href = item.url;
            itemUrl.appendChild(itemTitle);
        }
        else {
            breadcrumbItem.appendChild(itemTitle);
        }
        if (item.ellipsis) {
            LX.asTooltip(breadcrumbItem, item.ellipsis, { side: "bottom", offset: 4 });
        }
    }
    return breadcrumb;
}
LX.makeBreadcrumb = makeBreadcrumb;
/**
 * @method makeIcon
 * @description Gets an SVG element using one of LX.ICONS
 * @param {String} iconName
 * @param {Object} options
 * title
 * extraClass
 * svgClass
 * variant
 * ...Any Lucide icon options
 */
function makeIcon(iconName, options = {}) {
    let svg = null;
    const _createIconFromSVG = (svg) => {
        if (options.svgClass && options.svgClass.length) {
            options.svgClass.split(" ").forEach((c) => svg.classList.add(c));
        }
        const icon = document.createElement("a");
        icon.title = options.title ?? "";
        icon.className = "lexicon " + (options.iconClass ?? "");
        icon.appendChild(svg);
        svg.dataset["name"] = iconName;
        return icon;
    };
    if (iconName.includes("@")) {
        const parts = iconName.split("@");
        iconName = parts[0];
        options.variant = parts[1];
    }
    let data = LX.ICONS[iconName];
    const lucide = window.lucide;
    const lucideData = lucide[iconName] ?? lucide[LX.LucideIconAlias[iconName]];
    if (data) {
        // Resolve alias
        if (data.constructor != Array) {
            data = LX.ICONS[data];
        }
        // Resolve variant
        const requestedVariant = options.variant ?? "regular";
        data = ((requestedVariant == "solid") ? LX.ICONS[`${iconName}@solid`] : data) ?? data;
        const variant = data[3];
        // Create internal icon if variant is the same as requested, there's no lucide/fallback data or if variant is "regular" (default)
        if ((requestedVariant == variant) || !lucideData || variant == "regular") {
            svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("viewBox", `0 0 ${data[0]} ${data[1]}`);
            if (data[5]) {
                const classes = data[5].svgClass;
                classes?.split(' ').forEach((c) => {
                    svg.classList.add(c);
                });
                const attrs = data[5].svgAttributes;
                attrs?.split(' ').forEach((attr) => {
                    const t = attr.split('=');
                    svg.setAttribute(t[0], t[1]);
                });
            }
            const path = document.createElement("path");
            path.setAttribute("fill", "currentColor");
            path.setAttribute("d", data[4]);
            svg.appendChild(path);
            if (data[5]) {
                const classes = data[5].pathClass;
                classes?.split(' ').forEach((c) => {
                    path.classList.add(c);
                });
                const attrs = data[5].pathAttributes;
                attrs?.split(' ').forEach((attr) => {
                    const t = attr.split('=');
                    path.setAttribute(t[0], t[1]);
                });
            }
            const faLicense = `<!-- This icon might belong to a collection from Iconify - https://iconify.design/ - or !Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc. -->`;
            svg.innerHTML += faLicense;
            return _createIconFromSVG(svg);
        }
    }
    // Fallback to Lucide icon
    console.assert(lucideData, `No existing icon named _${iconName}_`);
    svg = lucide.createElement(lucideData, options);
    return _createIconFromSVG(svg);
}
LX.makeIcon = makeIcon;
/**
 * @method registerIcon
 * @description Register an SVG icon to LX.ICONS
 * @param {String} iconName
 * @param {String} svgString
 * @param {String} variant
 * @param {Array} aliases
 */
function registerIcon(iconName, svgString, variant = "none", aliases = []) {
    const svg = new DOMParser().parseFromString(svgString, 'image/svg+xml').documentElement;
    const path = svg.querySelector("path");
    const viewBox = svg.getAttribute("viewBox").split(' ');
    const pathData = path.getAttribute('d');
    let svgAttributes = [];
    let pathAttributes = [];
    for (const attr of svg.attributes) {
        switch (attr.name) {
            case "transform":
            case "fill":
            case "stroke-width":
            case "stroke-linecap":
            case "stroke-linejoin":
                svgAttributes.push(`${attr.name}=${attr.value}`);
                break;
        }
    }
    for (const attr of path.attributes) {
        switch (attr.name) {
            case "transform":
            case "fill":
            case "stroke-width":
            case "stroke-linecap":
            case "stroke-linejoin":
                pathAttributes.push(`${attr.name}=${attr.value}`);
                break;
        }
    }
    const iconData = [
        parseInt(viewBox[2]),
        parseInt(viewBox[3]),
        aliases,
        variant,
        pathData,
        {
            svgAttributes: svgAttributes.length ? svgAttributes.join(' ') : null,
            pathAttributes: pathAttributes.length ? pathAttributes.join(' ') : null
        }
    ];
    if (LX.ICONS[iconName]) {
        console.warn(`${iconName} will be added/replaced in LX.ICONS`);
    }
    LX.ICONS[iconName] = iconData;
}
LX.registerIcon = registerIcon;
/**
 * @method registerCommandbarEntry
 * @description Adds an extra command bar entry
 * @param {String} name
 * @param {Function} callback
 */
function registerCommandbarEntry(name, callback) {
    LX.extraCommandbarEntries.push({ name, callback });
}
LX.registerCommandbarEntry = registerCommandbarEntry;
/*
    Dialog and Notification Elements
*/
/**
 * @method message
 * @param {String} text
 * @param {String} title (Optional)
 * @param {Object} options
 * id: Id of the message dialog
 * position: Dialog position in screen [screen centered]
 * draggable: Dialog can be dragged [false]
 */
function message(text, title, options = {}) {
    if (!text) {
        throw ("No message to show");
    }
    options.modal = true;
    return new LX.Dialog(title, (p) => {
        p.addTextArea(null, text, null, { disabled: true, fitHeight: true });
    }, options);
}
LX.message = message;
/**
 * @method popup
 * @param {String} text
 * @param {String} title (Optional)
 * @param {Object} options
 * id: Id of the message dialog
 * timeout (Number): Delay time before it closes automatically (ms). Default: [3000]
 * position (Array): [x,y] Dialog position in screen. Default: [screen centered]
 * size (Array): [width, height]
 */
function popup(text, title, options = {}) {
    if (!text) {
        throw ("No message to show");
    }
    options.size = options.size ?? ["max-content", "auto"];
    options.class = "lexpopup";
    const time = options.timeout || 3000;
    const dialog = new LX.Dialog(title, (p) => {
        p.addTextArea(null, text, null, { disabled: true, fitHeight: true });
    }, options);
    setTimeout(() => {
        dialog.close();
    }, Math.max(time, 150));
    return dialog;
}
LX.popup = popup;
/**
 * @method prompt
 * @param {String} text
 * @param {String} title (Optional)
 * @param {Object} options
 * id: Id of the prompt dialog
 * position: Dialog position in screen [screen centered]
 * draggable: Dialog can be dragged [false]
 * input: If false, no text input appears
 * accept: Accept text
 * required: Input has to be filled [true]. Default: false
 */
function prompt(text, title, callback, options = {}) {
    options.modal = true;
    options.className = "prompt";
    let value = "";
    const dialog = new LX.Dialog(title, (p) => {
        p.addTextArea(null, text, null, { disabled: true, fitHeight: true });
        if (options.input ?? true) {
            p.addText(null, options.input || value, (v) => value = v, { placeholder: "..." });
        }
        p.sameLine(2);
        p.addButton(null, "Cancel", () => { if (options.on_cancel)
            options.on_cancel(); dialog.close(); });
        p.addButton(null, options.accept || "Continue", () => {
            if (options.required && value === '') {
                text += text.includes("You must fill the input text.") ? "" : "\nYou must fill the input text.";
                dialog.close();
                prompt(text, title, callback, options);
            }
            else {
                if (callback)
                    callback.call(LX, value);
                dialog.close();
            }
        }, { buttonClass: "primary" });
    }, options);
    // Focus text prompt
    if (options.input ?? true) {
        dialog.root.querySelector('input').focus();
    }
    return dialog;
}
LX.prompt = prompt;
/**
 * @method toast
 * @param {String} title
 * @param {String} description (Optional)
 * @param {Object} options
 * position: Set new position for the toasts ("top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right")
 * action: Data of the custom action { name, callback }
 * closable: Allow closing the toast
 * timeout: Time in which the toast closed automatically, in ms. -1 means persistent. [3000]
 */
function toast(title, description, options = {}) {
    if (!title) {
        throw ("The toast needs at least a title!");
    }
    const nots = LX.notifications;
    console.assert(nots);
    const toast = document.createElement("li");
    toast.className = "lextoast";
    nots.prepend(toast);
    const [positionVertical, positionHorizontal] = options.position ? options.position.split("-") : ["bottom", "right"];
    // Reset style
    nots.style.right = "unset";
    nots.style.left = "unset";
    nots.style.top = "unset";
    nots.style.bottom = "unset";
    nots.style.placeSelf = "unset";
    switch (positionVertical) {
        case "top":
            toast.style.translate = "0 -30px";
            nots.style.top = "1rem";
            nots.style.flexDirection = "column";
            break;
        case "bottom":
            toast.style.translate = "0 calc(100% + 30px)";
            nots.style.top = "auto";
            nots.style.bottom = "1rem";
            nots.style.flexDirection = "column-reverse";
            break;
    }
    switch (positionHorizontal) {
        case "left":
            nots.style.left = "1rem";
            break;
        case "center":
            nots.style.placeSelf = "center";
            break;
        case "right":
            nots.style.right = "1rem";
            break;
    }
    toast.classList.add(positionVertical);
    toast.classList.add(positionHorizontal);
    LX.doAsync(() => {
        if (nots.offsetWidth > nots.iWidth) {
            nots.iWidth = Math.min(nots.offsetWidth, 480);
            nots.style.width = nots.iWidth + "px";
        }
        toast.dataset["open"] = true;
    }, 10);
    const content = document.createElement("div");
    content.className = "lextoastcontent";
    toast.appendChild(content);
    const titleContent = document.createElement("div");
    titleContent.className = "title";
    titleContent.innerHTML = title;
    content.appendChild(titleContent);
    if (description) {
        const desc = document.createElement("div");
        desc.className = "desc";
        desc.innerHTML = description;
        content.appendChild(desc);
    }
    if (options.action) {
        const panel = new Panel();
        panel.addButton(null, options.action.name ?? "Accept", options.action.callback.bind(LX, toast), { width: "auto", maxWidth: "150px", className: "right", buttonClass: "border" });
        toast.appendChild(panel.root.childNodes[0]);
    }
    toast.close = function () {
        this.dataset["open"] = "false";
        LX.doAsync(() => {
            this.remove();
            if (!LX.notifications.childElementCount) {
                LX.notifications.style.width = "unset";
                LX.notifications.iWidth = 0;
            }
        }, 500);
    };
    if (options.closable ?? true) {
        const closeIcon = LX.makeIcon("X", { iconClass: "closer" });
        closeIcon.addEventListener("click", () => {
            toast.close();
        });
        toast.appendChild(closeIcon);
    }
    const timeout = options.timeout ?? 3000;
    if (timeout != -1) {
        LX.doAsync(() => {
            toast.close();
        }, timeout);
    }
}
LX.toast = toast;
/**
 * @method badge
 * @param {String} text
 * @param {String} className
 * @param {Object} options
 * style: Style attributes to override
 * asElement: Returns the badge as HTMLElement [false]
 */
function badge(text, className, options = {}) {
    const container = document.createElement("div");
    container.innerHTML = text;
    container.className = "lexbadge " + (className ?? "");
    if (options.chip) {
        container.classList.add("chip");
    }
    Object.assign(container.style, options.style ?? {});
    if (options.callback) {
        const arrowIcon = LX.makeIcon("ArrowUpRight", { svgClass: "xs fg-contrast" });
        arrowIcon.querySelector("svg").style.marginLeft = "-0.25rem";
        container.innerHTML += arrowIcon.innerHTML;
        container.addEventListener("click", e => {
            e.preventDefault();
            e.stopPropagation();
            options.callback();
        });
    }
    if (options.parent) {
        options.parent.classList.add("lexbadge-parent");
        options.parent.appendChild(container);
    }
    return (options.asElement ?? false) ? container : container.outerHTML;
}
LX.badge = badge;
/**
 * @method makeElement
 * @param {String} htmlType
 * @param {String} className
 * @param {String} innerHTML
 * @param {HTMLElement} parent
 * @param {Object} overrideStyle
 */
function makeElement(htmlType, className, innerHTML, parent, overrideStyle = {}) {
    const element = document.createElement(htmlType);
    element.className = className ?? "";
    element.innerHTML = innerHTML ?? "";
    Object.assign(element.style, overrideStyle);
    if (parent) {
        if (parent.attach) // Use attach method if possible
         {
            parent.attach(element);
        }
        else // its a native HTMLElement
         {
            parent.appendChild(element);
        }
    }
    return element;
}
LX.makeElement = makeElement;
/**
 * @method makeContainer
 * @param {Array} size
 * @param {String} className
 * @param {String} innerHTML
 * @param {HTMLElement} parent
 * @param {Object} overrideStyle
 */
function makeContainer(size, className, innerHTML, parent, overrideStyle = {}) {
    const container = LX.makeElement("div", "lexcontainer " + (className ?? ""), innerHTML, parent, overrideStyle);
    container.style.width = size && size[0] ? size[0] : "100%";
    container.style.height = size && size[1] ? size[1] : "100%";
    return container;
}
LX.makeContainer = makeContainer;
/**
 * @method asTooltip
 * @param {HTMLElement} trigger
 * @param {String} content
 * @param {Object} options
 * side: Side of the tooltip
 * offset: Tooltip margin offset
 * offsetX: Tooltip margin horizontal offset
 * offsetY: Tooltip margin vertical offset
 * active: Tooltip active by default [true]
 * callback: Callback function to execute when the tooltip is shown
 */
function asTooltip(trigger, content, options = {}) {
    console.assert(trigger, "You need a trigger to generate a tooltip!");
    trigger.dataset["disableTooltip"] = !(options.active ?? true);
    let tooltipDom = null;
    const _offset = options.offset;
    const _offsetX = options.offsetX ?? (_offset ?? 0);
    const _offsetY = options.offsetY ?? (_offset ?? 6);
    trigger.addEventListener("mouseenter", function (e) {
        if (trigger.dataset["disableTooltip"] == "true") {
            return;
        }
        tooltipDom = document.createElement("div");
        tooltipDom.className = "lextooltip";
        tooltipDom.innerHTML = trigger.dataset["tooltipContent"] ?? content;
        const nestedDialog = trigger.closest("dialog");
        const tooltipParent = nestedDialog ?? LX.root;
        // Remove other first
        LX.root.querySelectorAll(".lextooltip").forEach((e) => e.remove());
        // Append new tooltip
        tooltipParent.appendChild(tooltipDom);
        LX.doAsync(() => {
            const position = [0, 0];
            const offsetX = parseFloat(trigger.dataset["tooltipOffsetX"] ?? _offsetX);
            const offsetY = parseFloat(trigger.dataset["tooltipOffsetY"] ?? _offsetY);
            const rect = trigger.getBoundingClientRect();
            let alignWidth = true;
            switch (options.side ?? "top") {
                case "left":
                    position[0] += (rect.x - tooltipDom.offsetWidth - offsetX);
                    alignWidth = false;
                    break;
                case "right":
                    position[0] += (rect.x + rect.width + offsetX);
                    alignWidth = false;
                    break;
                case "top":
                    position[1] += (rect.y - tooltipDom.offsetHeight - offsetY);
                    alignWidth = true;
                    break;
                case "bottom":
                    position[1] += (rect.y + rect.height + offsetY);
                    alignWidth = true;
                    break;
            }
            if (alignWidth) {
                position[0] += (rect.x + rect.width * 0.5) - tooltipDom.offsetWidth * 0.5 + offsetX;
            }
            else {
                position[1] += (rect.y + rect.height * 0.5) - tooltipDom.offsetHeight * 0.5 + offsetY;
            }
            // Avoid collisions
            position[0] = LX.clamp(position[0], 0, window.innerWidth - tooltipDom.offsetWidth - 4);
            position[1] = LX.clamp(position[1], 0, window.innerHeight - tooltipDom.offsetHeight - 4);
            if (nestedDialog) {
                let parentRect = tooltipParent.getBoundingClientRect();
                position[0] -= parentRect.x;
                position[1] -= parentRect.y;
            }
            tooltipDom.style.left = `${position[0]}px`;
            tooltipDom.style.top = `${position[1]}px`;
            if (options.callback) {
                options.callback(tooltipDom, trigger);
            }
        });
    });
    trigger.addEventListener("mouseleave", function (e) {
        if (tooltipDom) {
            tooltipDom.remove();
        }
    });
}
LX.asTooltip = asTooltip;
function insertChildAtIndex(parent, child, index = Infinity) {
    if (index >= parent.children.length)
        parent.appendChild(child);
    else
        parent.insertBefore(child, parent.children[index]);
}
LX.insertChildAtIndex = insertChildAtIndex;
// Since we use "box-sizing: border-box" now,
// it's all included in offsetWidth/offsetHeight
function getComputedSize(el) {
    return {
        width: el.offsetWidth,
        height: el.offsetHeight
    };
}
LX.getComputedSize = getComputedSize;
function listen(el, eventName, callback, callbackName) {
    callbackName = callbackName ?? ("_on" + eventName);
    el[callbackName] = callback;
    el.addEventListener(eventName, callback);
}
LX.listen = listen;
function ignore(el, eventName, callbackName) {
    callbackName = callbackName ?? ("_on" + eventName);
    const callback = el[callbackName];
    el.removeEventListener(eventName, callback);
}
LX.ignore = ignore;
function getParentArea(el) {
    let parent = el.parentElement;
    while (parent) {
        if (parent.classList.contains("lexarea")) {
            return parent;
        }
        parent = parent.parentElement;
    }
}
LX.getParentArea = getParentArea;
function hasClass(el, list) {
    list = [].concat(list);
    var r = list.filter(v => el.classList.contains(v));
    return !!r.length;
}
LX.hasClass = hasClass;
function addClass(el, className) {
    if (className)
        el.classList.add(className);
}
LX.addClass = addClass;
function removeClass(el, className) {
    if (className)
        el.classList.remove(className);
}
LX.removeClass = removeClass;
function toggleClass(el, className, force) {
    if (className)
        el.classList.toggle(className, force);
}
LX.toggleClass = toggleClass;
function lastChar(str) {
    return str[str.length - 1];
}
LX.lastChar = lastChar;
/*
*   Requests
*/
Object.assign(LX, {
    /**
    * Request file from url (it could be a binary, text, etc.). If you want a simplied version use
    * @method request
    * @param {Object} request object with all the parameters like data (for sending forms), dataType, success, error
    * @param {Function} on_complete
    **/
    request(request) {
        var dataType = request.dataType || "text";
        if (dataType == "json") //parse it locally
            dataType = "text";
        else if (dataType == "xml") //parse it locally
            dataType = "text";
        else if (dataType == "binary") {
            //request.mimeType = "text/plain; charset=x-user-defined";
            dataType = "arraybuffer";
            request.mimeType = "application/octet-stream";
        }
        //regular case, use AJAX call
        var xhr = new XMLHttpRequest();
        xhr.open(request.data ? 'POST' : 'GET', request.url, true);
        if (dataType)
            xhr.responseType = dataType;
        if (request.mimeType)
            xhr.overrideMimeType(request.mimeType);
        if (request.nocache)
            xhr.setRequestHeader('Cache-Control', 'no-cache');
        xhr.onload = function (load) {
            var response = this.response;
            if (this.status != 200) {
                var err = "Error " + this.status;
                if (request.error)
                    request.error(err);
                return;
            }
            if (request.dataType == "json") //chrome doesnt support json format
             {
                try {
                    response = JSON.parse(response);
                }
                catch (err) {
                    if (request.error)
                        request.error(err);
                    else
                        throw err;
                }
            }
            else if (request.dataType == "xml") {
                try {
                    var xmlparser = new DOMParser();
                    response = xmlparser.parseFromString(response, "text/xml");
                }
                catch (err) {
                    if (request.error)
                        request.error(err);
                    else
                        throw err;
                }
            }
            if (request.success)
                request.success.call(this, response, this);
        };
        xhr.onerror = function (err) {
            if (request.error)
                request.error(err);
        };
        var data = new FormData();
        if (request.data) {
            for (var i in request.data)
                data.append(i, request.data[i]);
        }
        xhr.send(data);
        return xhr;
    },
    /**
    * Request file from url
    * @method requestText
    * @param {String} url
    * @param {Function} onComplete
    * @param {Function} onError
    **/
    requestText(url, onComplete, onError) {
        return this.request({ url: url, dataType: "text", success: onComplete, error: onError });
    },
    /**
    * Request file from url
    * @method requestJSON
    * @param {String} url
    * @param {Function} onComplete
    * @param {Function} onError
    **/
    requestJSON(url, onComplete, onError) {
        return this.request({ url: url, dataType: "json", success: onComplete, error: onError });
    },
    /**
    * Request binary file from url
    * @method requestBinary
    * @param {String} url
    * @param {Function} onComplete
    * @param {Function} onError
    **/
    requestBinary(url, onComplete, onError) {
        return this.request({ url: url, dataType: "binary", success: onComplete, error: onError });
    },
    /**
    * Request script and inserts it in the DOM
    * @method requireScript
    * @param {String|Array} url the url of the script or an array containing several urls
    * @param {Function} onComplete
    * @param {Function} onError
    * @param {Function} onProgress (if several files are required, onProgress is called after every file is added to the DOM)
    **/
    requireScript(url, onComplete, onError, onProgress, version) {
        if (!url)
            throw ("invalid URL");
        if (url.constructor === String)
            url = [url];
        var total = url.length;
        var loaded_scripts = [];
        for (var i in url) {
            var script = document.createElement('script');
            script.num = i;
            script.type = 'text/javascript';
            script.src = url[i] + (version ? "?version=" + version : "");
            script.original_src = url[i];
            script.async = false;
            script.onload = function (e) {
                total--;
                loaded_scripts.push(this);
                if (total) {
                    if (onProgress) {
                        onProgress(this.original_src, this.num);
                    }
                }
                else if (onComplete)
                    onComplete(loaded_scripts);
            };
            if (onError)
                script.onerror = function (err) {
                    onError(err, this.original_src, this.num);
                };
            document.getElementsByTagName('head')[0].appendChild(script);
        }
    },
    loadScriptSync(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = url;
            script.async = false;
            script.onload = () => resolve(1);
            script.onerror = () => reject(new Error(`Failed to load ${url}`));
            document.head.appendChild(script);
        });
    },
    downloadURL(url, filename) {
        const fr = new FileReader();
        const _download = function (_url) {
            var link = document.createElement('a');
            link.href = _url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
        if (url.includes('http')) {
            LX.request({ url: url, dataType: 'blob', success: (f) => {
                    fr.readAsDataURL(f);
                    fr.onload = (e) => {
                        _download(e.currentTarget.result);
                    };
                } });
        }
        else {
            _download(url);
        }
    },
    downloadFile: function (filename, data, dataType) {
        if (!data) {
            console.warn("No file provided to download");
            return;
        }
        if (!dataType) {
            if (data.constructor === String)
                dataType = 'text/plain';
            else
                dataType = 'application/octet-stream';
        }
        var file = null;
        if (data.constructor !== File && data.constructor !== Blob)
            file = new Blob([data], { type: dataType });
        else
            file = data;
        var url = URL.createObjectURL(file);
        var element = document.createElement("a");
        element.setAttribute('href', url);
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000 * 60); //wait one minute to revoke url
    }
});
/**
 * @method formatBytes
 * @param {Number} bytes
 **/
function formatBytes(bytes) {
    if (bytes === 0)
        return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = bytes / Math.pow(k, i);
    return value.toFixed(2) + " " + sizes[i];
}
LX.formatBytes = formatBytes;
/**
 * @method compareThreshold
 **/
function compareThreshold(v, p, n, t) {
    return Math.abs(v - p) >= t || Math.abs(v - n) >= t;
}
LX.compareThreshold = compareThreshold;
/**
 * @method compareThresholdRange
 **/
function compareThresholdRange(v0, v1, t0, t1) {
    return v0 >= t0 && v0 <= t1 || v1 >= t0 && v1 <= t1 || v0 <= t0 && v1 >= t1;
}
LX.compareThresholdRange = compareThresholdRange;
/**
 * @method getControlPoints
 **/
function getControlPoints(x0, y0, x1, y1, x2, y2, t) {
    //  x0,y0,x1,y1 are the coordinates of the end (knot) pts of this segment
    //  x2,y2 is the next knot -- not connected here but needed to calculate p2
    //  p1 is the control point calculated here, from x1 back toward x0.
    //  p2 is the next control point, calculated here and returned to become the
    //  next segment's p1.
    //  t is the 'tension' which controls how far the control points spread.
    //  Scaling factors: distances from this knot to the previous and following knots.
    var d01 = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2));
    var d12 = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    var fa = t * d01 / (d01 + d12);
    var fb = t - fa;
    var p1x = x1 + fa * (x0 - x2);
    var p1y = y1 + fa * (y0 - y2);
    var p2x = x1 - fb * (x0 - x2);
    var p2y = y1 - fb * (y0 - y2);
    return [p1x, p1y, p2x, p2y];
}
LX.getControlPoints = getControlPoints;
/**
 * @method drawSpline
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} pts
 * @param {Number} t
 **/
function drawSpline(ctx, pts, t) {
    ctx.save();
    var cp = []; // array of control points, as x0,y0,x1,y1,...
    var n = pts.length;
    // Draw an open curve, not connected at the ends
    for (var i = 0; i < (n - 4); i += 2) {
        cp = cp.concat(LX.getControlPoints(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], pts[i + 4], pts[i + 5], t));
    }
    for (var i = 2; i < (pts.length - 5); i += 2) {
        ctx.beginPath();
        ctx.moveTo(pts[i], pts[i + 1]);
        ctx.bezierCurveTo(cp[2 * i - 2], cp[2 * i - 1], cp[2 * i], cp[2 * i + 1], pts[i + 2], pts[i + 3]);
        ctx.stroke();
        ctx.closePath();
    }
    //  For open curves the first and last arcs are simple quadratics.
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    ctx.quadraticCurveTo(cp[0], cp[1], pts[2], pts[3]);
    ctx.stroke();
    ctx.closePath();
    ctx.beginPath();
    ctx.moveTo(pts[n - 2], pts[n - 1]);
    ctx.quadraticCurveTo(cp[2 * n - 10], cp[2 * n - 9], pts[n - 4], pts[n - 3]);
    ctx.stroke();
    ctx.closePath();
    ctx.restore();
}
LX.drawSpline = drawSpline;

// Icons.ts @jxarco
const RAW_ICONS = {
    // Internals
    "Abc": [24, 24, [], "regular", "M17 15q-.425 0-.712-.288T16 14v-4q0-.425.288-.712T17 9h3q.425 0 .713.288T21 10v1h-1.5v-.5h-2v3h2V13H21v1q0 .425-.288.713T20 15zm-7.5 0V9h4q.425 0 .713.288T14.5 10v1q0 .425-.288.713T13.5 12q.425 0 .713.288T14.5 13v1q0 .425-.288.713T13.5 15zm1.5-3.75h2v-.75h-2zm0 2.25h2v-.75h-2zM3 15v-5q0-.425.288-.712T4 9h3q.425 0 .713.288T8 10v5H6.5v-1.5h-2V15zm1.5-3h2v-1.5h-2z"],
    "Android": [128, 128, [], "solid", "M21.005 43.003c-4.053-.002-7.338 3.291-7.339 7.341l.005 30.736a7.34 7.34 0 0 0 7.342 7.343a7.33 7.33 0 0 0 7.338-7.342V50.34a7.345 7.345 0 0 0-7.346-7.337m59.193-27.602l5.123-9.355a1.023 1.023 0 0 0-.401-1.388a1.02 1.02 0 0 0-1.382.407l-5.175 9.453c-4.354-1.938-9.227-3.024-14.383-3.019c-5.142-.005-10.013 1.078-14.349 3.005L44.45 5.075a1.01 1.01 0 0 0-1.378-.406a1.007 1.007 0 0 0-.404 1.38l5.125 9.349c-10.07 5.193-16.874 15.083-16.868 26.438l66.118-.008c.002-11.351-6.79-21.221-16.845-26.427M48.942 29.858a2.772 2.772 0 0 1 .003-5.545a2.78 2.78 0 0 1 2.775 2.774a2.776 2.776 0 0 1-2.778 2.771m30.106-.005a2.77 2.77 0 0 1-2.772-2.771a2.793 2.793 0 0 1 2.773-2.778a2.79 2.79 0 0 1 2.767 2.779a2.767 2.767 0 0 1-2.768 2.77M31.195 44.39l.011 47.635a7.82 7.82 0 0 0 7.832 7.831l5.333.002l.006 16.264c-.001 4.05 3.291 7.342 7.335 7.342c4.056 0 7.342-3.295 7.343-7.347l-.004-16.26l9.909-.003l.004 16.263c0 4.047 3.293 7.346 7.338 7.338c4.056.003 7.344-3.292 7.343-7.344l-.005-16.259l5.352-.004a7.835 7.835 0 0 0 7.836-7.834l-.009-47.635zm83.134 5.943a7.34 7.34 0 0 0-7.341-7.339c-4.053-.004-7.337 3.287-7.337 7.342l.006 30.738a7.334 7.334 0 0 0 7.339 7.339a7.337 7.337 0 0 0 7.338-7.343z"],
    "Clone": [512, 512, [], "regular", "M64 464l224 0c8.8 0 16-7.2 16-16l0-64 48 0 0 64c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 224c0-35.3 28.7-64 64-64l64 0 0 48-64 0c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16zM224 304l224 0c8.8 0 16-7.2 16-16l0-224c0-8.8-7.2-16-16-16L224 48c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16zm-64-16l0-224c0-35.3 28.7-64 64-64L448 0c35.3 0 64 28.7 64 64l0 224c0 35.3-28.7 64-64 64l-224 0c-35.3 0-64-28.7-64-64z"],
    "IdBadge": [384, 512, [], "regular", "M256 48l0 16c0 17.7-14.3 32-32 32l-64 0c-17.7 0-32-14.3-32-32l0-16L64 48c-8.8 0-16 7.2-16 16l0 384c0 8.8 7.2 16 16 16l256 0c8.8 0 16-7.2 16-16l0-384c0-8.8-7.2-16-16-16l-64 0zM0 64C0 28.7 28.7 0 64 0L320 0c35.3 0 64 28.7 64 64l0 384c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zM160 320l64 0c44.2 0 80 35.8 80 80c0 8.8-7.2 16-16 16L96 416c-8.8 0-16-7.2-16-16c0-44.2 35.8-80 80-80zm-32-96a64 64 0 1 1 128 0 64 64 0 1 1 -128 0z"],
    "Paste": [512, 512, [], "regular", "M104.6 48L64 48C28.7 48 0 76.7 0 112L0 384c0 35.3 28.7 64 64 64l96 0 0-48-96 0c-8.8 0-16-7.2-16-16l0-272c0-8.8 7.2-16 16-16l16 0c0 17.7 14.3 32 32 32l72.4 0C202 108.4 227.6 96 256 96l62 0c-7.1-27.6-32.2-48-62-48l-40.6 0C211.6 20.9 188.2 0 160 0s-51.6 20.9-55.4 48zM144 56a16 16 0 1 1 32 0 16 16 0 1 1 -32 0zM448 464l-192 0c-8.8 0-16-7.2-16-16l0-256c0-8.8 7.2-16 16-16l140.1 0L464 243.9 464 448c0 8.8-7.2 16-16 16zM256 512l192 0c35.3 0 64-28.7 64-64l0-204.1c0-12.7-5.1-24.9-14.1-33.9l-67.9-67.9c-9-9-21.2-14.1-33.9-14.1L256 128c-35.3 0-64 28.7-64 64l0 256c0 35.3 28.7 64 64 64z"],
    "Trash3": [448, 512, [], "regular", "M170.5 51.6L151.5 80l145 0-19-28.4c-1.5-2.2-4-3.6-6.7-3.6l-93.7 0c-2.7 0-5.2 1.3-6.7 3.6zm147-26.6L354.2 80 368 80l48 0 8 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-8 0 0 304c0 44.2-35.8 80-80 80l-224 0c-44.2 0-80-35.8-80-80l0-304-8 0c-13.3 0-24-10.7-24-24S10.7 80 24 80l8 0 48 0 13.8 0 36.7-55.1C140.9 9.4 158.4 0 177.1 0l93.7 0c18.7 0 36.2 9.4 46.6 24.9zM80 128l0 304c0 17.7 14.3 32 32 32l224 0c17.7 0 32-14.3 32-32l0-304L80 128zm80 64l0 208c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-208c0-8.8 7.2-16 16-16s16 7.2 16 16zm80 0l0 208c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-208c0-8.8 7.2-16 16-16s16 7.2 16 16zm80 0l0 208c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-208c0-8.8 7.2-16 16-16s16 7.2 16 16z"],
    "FilePdf": [512, 512, [], "regular", "M64 464l48 0 0 48-48 0c-35.3 0-64-28.7-64-64L0 64C0 28.7 28.7 0 64 0L229.5 0c17 0 33.3 6.7 45.3 18.7l90.5 90.5c12 12 18.7 28.3 18.7 45.3L384 304l-48 0 0-144-80 0c-17.7 0-32-14.3-32-32l0-80L64 48c-8.8 0-16 7.2-16 16l0 384c0 8.8 7.2 16 16 16zM176 352l32 0c30.9 0 56 25.1 56 56s-25.1 56-56 56l-16 0 0 32c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-48 0-80c0-8.8 7.2-16 16-16zm32 80c13.3 0 24-10.7 24-24s-10.7-24-24-24l-16 0 0 48 16 0zm96-80l32 0c26.5 0 48 21.5 48 48l0 64c0 26.5-21.5 48-48 48l-32 0c-8.8 0-16-7.2-16-16l0-128c0-8.8 7.2-16 16-16zm32 128c8.8 0 16-7.2 16-16l0-64c0-8.8-7.2-16-16-16l-16 0 0 96 16 0zm80-112c0-8.8 7.2-16 16-16l48 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-32 0 0 32 32 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-32 0 0 48c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-64 0-64z"],
    "FileWord": [384, 512, [], "regular", "M48 448L48 64c0-8.8 7.2-16 16-16l160 0 0 80c0 17.7 14.3 32 32 32l80 0 0 288c0 8.8-7.2 16-16 16L64 464c-8.8 0-16-7.2-16-16zM64 0C28.7 0 0 28.7 0 64L0 448c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-293.5c0-17-6.7-33.3-18.7-45.3L274.7 18.7C262.7 6.7 246.5 0 229.5 0L64 0zm55 241.1c-3.8-12.7-17.2-19.9-29.9-16.1s-19.9 17.2-16.1 29.9l48 160c3 10.2 12.4 17.1 23 17.1s19.9-7 23-17.1l25-83.4 25 83.4c3 10.2 12.4 17.1 23 17.1s19.9-7 23-17.1l48-160c3.8-12.7-3.4-26.1-16.1-29.9s-26.1 3.4-29.9 16.1l-25 83.4-25-83.4c-3-10.2-12.4-17.1-23-17.1s-19.9 7-23 17.1l-25 83.4-25-83.4z"],
    "FilePowerpoint": [384, 512, [], "regular", "M64 464c-8.8 0-16-7.2-16-16L48 64c0-8.8 7.2-16 16-16l160 0 0 80c0 17.7 14.3 32 32 32l80 0 0 288c0 8.8-7.2 16-16 16L64 464zM64 0C28.7 0 0 28.7 0 64L0 448c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-293.5c0-17-6.7-33.3-18.7-45.3L274.7 18.7C262.7 6.7 246.5 0 229.5 0L64 0zm72 208c-13.3 0-24 10.7-24 24l0 104 0 56c0 13.3 10.7 24 24 24s24-10.7 24-24l0-32 44 0c42 0 76-34 76-76s-34-76-76-76l-68 0zm68 104l-44 0 0-56 44 0c15.5 0 28 12.5 28 28s-12.5 28-28 28z"],
    "FileExcel": [384, 512, [], "regular", "M48 448L48 64c0-8.8 7.2-16 16-16l160 0 0 80c0 17.7 14.3 32 32 32l80 0 0 288c0 8.8-7.2 16-16 16L64 464c-8.8 0-16-7.2-16-16zM64 0C28.7 0 0 28.7 0 64L0 448c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-293.5c0-17-6.7-33.3-18.7-45.3L274.7 18.7C262.7 6.7 246.5 0 229.5 0L64 0zm90.9 233.3c-8.1-10.5-23.2-12.3-33.7-4.2s-12.3 23.2-4.2 33.7L161.6 320l-44.5 57.3c-8.1 10.5-6.3 25.5 4.2 33.7s25.5 6.3 33.7-4.2L192 359.1l37.1 47.6c8.1 10.5 23.2 12.3 33.7 4.2s12.3-23.2 4.2-33.7L222.4 320l44.5-57.3c8.1-10.5 6.3-25.5-4.2-33.7s-25.5-6.3-33.7 4.2L192 280.9l-37.1-47.6z"],
    "Settings3": [640, 512, [], "solid", "M308.5 135.3c7.1-6.3 9.9-16.2 6.2-25c-2.3-5.3-4.8-10.5-7.6-15.5L304 89.4c-3-5-6.3-9.9-9.8-14.6c-5.7-7.6-15.7-10.1-24.7-7.1l-28.2 9.3c-10.7-8.8-23-16-36.2-20.9L199 27.1c-1.9-9.3-9.1-16.7-18.5-17.8C173.9 8.4 167.2 8 160.4 8l-.7 0c-6.8 0-13.5 .4-20.1 1.2c-9.4 1.1-16.6 8.6-18.5 17.8L115 56.1c-13.3 5-25.5 12.1-36.2 20.9L50.5 67.8c-9-3-19-.5-24.7 7.1c-3.5 4.7-6.8 9.6-9.9 14.6l-3 5.3c-2.8 5-5.3 10.2-7.6 15.6c-3.7 8.7-.9 18.6 6.2 25l22.2 19.8C32.6 161.9 32 168.9 32 176s.6 14.1 1.7 20.9L11.5 216.7c-7.1 6.3-9.9 16.2-6.2 25c2.3 5.3 4.8 10.5 7.6 15.6l3 5.2c3 5.1 6.3 9.9 9.9 14.6c5.7 7.6 15.7 10.1 24.7 7.1l28.2-9.3c10.7 8.8 23 16 36.2 20.9l6.1 29.1c1.9 9.3 9.1 16.7 18.5 17.8c6.7 .8 13.5 1.2 20.4 1.2s13.7-.4 20.4-1.2c9.4-1.1 16.6-8.6 18.5-17.8l6.1-29.1c13.3-5 25.5-12.1 36.2-20.9l28.2 9.3c9 3 19 .5 24.7-7.1c3.5-4.7 6.8-9.5 9.8-14.6l3.1-5.4c2.8-5 5.3-10.2 7.6-15.5c3.7-8.7 .9-18.6-6.2-25l-22.2-19.8c1.1-6.8 1.7-13.8 1.7-20.9s-.6-14.1-1.7-20.9l22.2-19.8zM112 176a48 48 0 1 1 96 0 48 48 0 1 1 -96 0zM504.7 500.5c6.3 7.1 16.2 9.9 25 6.2c5.3-2.3 10.5-4.8 15.5-7.6l5.4-3.1c5-3 9.9-6.3 14.6-9.8c7.6-5.7 10.1-15.7 7.1-24.7l-9.3-28.2c8.8-10.7 16-23 20.9-36.2l29.1-6.1c9.3-1.9 16.7-9.1 17.8-18.5c.8-6.7 1.2-13.5 1.2-20.4s-.4-13.7-1.2-20.4c-1.1-9.4-8.6-16.6-17.8-18.5L583.9 307c-5-13.3-12.1-25.5-20.9-36.2l9.3-28.2c3-9 .5-19-7.1-24.7c-4.7-3.5-9.6-6.8-14.6-9.9l-5.3-3c-5-2.8-10.2-5.3-15.6-7.6c-8.7-3.7-18.6-.9-25 6.2l-19.8 22.2c-6.8-1.1-13.8-1.7-20.9-1.7s-14.1 .6-20.9 1.7l-19.8-22.2c-6.3-7.1-16.2-9.9-25-6.2c-5.3 2.3-10.5 4.8-15.6 7.6l-5.2 3c-5.1 3-9.9 6.3-14.6 9.9c-7.6 5.7-10.1 15.7-7.1 24.7l9.3 28.2c-8.8 10.7-16 23-20.9 36.2L315.1 313c-9.3 1.9-16.7 9.1-17.8 18.5c-.8 6.7-1.2 13.5-1.2 20.4s.4 13.7 1.2 20.4c1.1 9.4 8.6 16.6 17.8 18.5l29.1 6.1c5 13.3 12.1 25.5 20.9 36.2l-9.3 28.2c-3 9-.5 19 7.1 24.7c4.7 3.5 9.5 6.8 14.6 9.8l5.4 3.1c5 2.8 10.2 5.3 15.5 7.6c8.7 3.7 18.6 .9 25-6.2l19.8-22.2c6.8 1.1 13.8 1.7 20.9 1.7s14.1-.6 20.9-1.7l19.8 22.2zM464 304a48 48 0 1 1 0 96 48 48 0 1 1 0-96z"],
    "MessagesCircle": [640, 512, [], "regular", "M88.2 309.1c9.8-18.3 6.8-40.8-7.5-55.8C59.4 230.9 48 204 48 176c0-63.5 63.8-128 160-128s160 64.5 160 128s-63.8 128-160 128c-13.1 0-25.8-1.3-37.8-3.6c-10.4-2-21.2-.6-30.7 4.2c-4.1 2.1-8.3 4.1-12.6 6c-16 7.2-32.9 13.5-49.9 18c2.8-4.6 5.4-9.1 7.9-13.6c1.1-1.9 2.2-3.9 3.2-5.9zM208 352c114.9 0 208-78.8 208-176S322.9 0 208 0S0 78.8 0 176c0 41.8 17.2 80.1 45.9 110.3c-.9 1.7-1.9 3.5-2.8 5.1c-10.3 18.4-22.3 36.5-36.6 52.1c-6.6 7-8.3 17.2-4.6 25.9C5.8 378.3 14.4 384 24 384c43 0 86.5-13.3 122.7-29.7c4.8-2.2 9.6-4.5 14.2-6.8c15.1 3 30.9 4.5 47.1 4.5zM432 480c16.2 0 31.9-1.6 47.1-4.5c4.6 2.3 9.4 4.6 14.2 6.8C529.5 498.7 573 512 616 512c9.6 0 18.2-5.7 22-14.5c3.8-8.8 2-19-4.6-25.9c-14.2-15.6-26.2-33.7-36.6-52.1c-.9-1.7-1.9-3.4-2.8-5.1C622.8 384.1 640 345.8 640 304c0-94.4-87.9-171.5-198.2-175.8c4.1 15.2 6.2 31.2 6.2 47.8l0 .6c87.2 6.7 144 67.5 144 127.4c0 28-11.4 54.9-32.7 77.2c-14.3 15-17.3 37.6-7.5 55.8c1.1 2 2.2 4 3.2 5.9c2.5 4.5 5.2 9 7.9 13.6c-17-4.5-33.9-10.7-49.9-18c-4.3-1.9-8.5-3.9-12.6-6c-9.5-4.8-20.3-6.2-30.7-4.2c-12.1 2.4-24.8 3.6-37.8 3.6c-61.7 0-110-26.5-136.8-62.3c-16 5.4-32.8 9.4-50 11.8C279 439.8 350 480 432 480z"],
    "LinkOff": [640, 512, ["ChainBroken", "ChainOff", "Unlink"], "solid", "M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7L489.3 358.2l90.5-90.5c56.5-56.5 56.5-148 0-204.5c-50-50-128.8-56.5-186.3-15.4l-1.6 1.1c-14.4 10.3-17.7 30.3-7.4 44.6s30.3 17.7 44.6 7.4l1.6-1.1c32.1-22.9 76-19.3 103.8 8.6c31.5 31.5 31.5 82.5 0 114l-96 96-31.9-25C430.9 239.6 420.1 175.1 377 132c-52.2-52.3-134.5-56.2-191.3-11.7L38.8 5.1zM239 162c30.1-14.9 67.7-9.9 92.8 15.3c20 20 27.5 48.3 21.7 74.5L239 162zM406.6 416.4L220.9 270c-2.1 39.8 12.2 80.1 42.2 110c38.9 38.9 94.4 51 143.6 36.3zm-290-228.5L60.2 244.3c-56.5 56.5-56.5 148 0 204.5c50 50 128.8 56.5 186.3 15.4l1.6-1.1c14.4-10.3 17.7-30.3 7.4-44.6s-30.3-17.7-44.6-7.4l-1.6 1.1c-32.1 22.9-76 19.3-103.8-8.6C74 372 74 321 105.5 289.5l61.8-61.8-50.6-39.9z"],
    "StreetView": [512, 512, [], "solid", "M320 64A64 64 0 1 0 192 64a64 64 0 1 0 128 0zm-96 96c-35.3 0-64 28.7-64 64l0 48c0 17.7 14.3 32 32 32l1.8 0 11.1 99.5c1.8 16.2 15.5 28.5 31.8 28.5l38.7 0c16.3 0 30-12.3 31.8-28.5L318.2 304l1.8 0c17.7 0 32-14.3 32-32l0-48c0-35.3-28.7-64-64-64l-64 0zM132.3 394.2c13-2.4 21.7-14.9 19.3-27.9s-14.9-21.7-27.9-19.3c-32.4 5.9-60.9 14.2-82 24.8c-10.5 5.3-20.3 11.7-27.8 19.6C6.4 399.5 0 410.5 0 424c0 21.4 15.5 36.1 29.1 45c14.7 9.6 34.3 17.3 56.4 23.4C130.2 504.7 190.4 512 256 512s125.8-7.3 170.4-19.6c22.1-6.1 41.8-13.8 56.4-23.4c13.7-8.9 29.1-23.6 29.1-45c0-13.5-6.4-24.5-14-32.6c-7.5-7.9-17.3-14.3-27.8-19.6c-21-10.6-49.5-18.9-82-24.8c-13-2.4-25.5 6.3-27.9 19.3s6.3 25.5 19.3 27.9c30.2 5.5 53.7 12.8 69 20.5c3.2 1.6 5.8 3.1 7.9 4.5c3.6 2.4 3.6 7.2 0 9.6c-8.8 5.7-23.1 11.8-43 17.3C374.3 457 318.5 464 256 464s-118.3-7-157.7-17.9c-19.9-5.5-34.2-11.6-43-17.3c-3.6-2.4-3.6-7.2 0-9.6c2.1-1.4 4.8-2.9 7.9-4.5c15.3-7.7 38.8-14.9 69-20.5z"],
    "ClosedCaptioning": [576, 512, ["CC"], "regular", "M512 80c8.8 0 16 7.2 16 16l0 320c0 8.8-7.2 16-16 16L64 432c-8.8 0-16-7.2-16-16L48 96c0-8.8 7.2-16 16-16l448 0zM64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l448 0c35.3 0 64-28.7 64-64l0-320c0-35.3-28.7-64-64-64L64 32zM200 208c14.2 0 27 6.1 35.8 16c8.8 9.9 24 10.7 33.9 1.9s10.7-24 1.9-33.9c-17.5-19.6-43.1-32-71.5-32c-53 0-96 43-96 96s43 96 96 96c28.4 0 54-12.4 71.5-32c8.8-9.9 8-25-1.9-33.9s-25-8-33.9 1.9c-8.8 9.9-21.6 16-35.8 16c-26.5 0-48-21.5-48-48s21.5-48 48-48zm144 48c0-26.5 21.5-48 48-48c14.2 0 27 6.1 35.8 16c8.8 9.9 24 10.7 33.9 1.9s10.7-24 1.9-33.9c-17.5-19.6-43.1-32-71.5-32c-53 0-96 43-96 96s43 96 96 96c28.4 0 54-12.4 71.5-32c8.8-9.9 8-25-1.9-33.9s-25-8-33.9 1.9c-8.8 9.9-21.6 16-35.8 16c-26.5 0-48-21.5-48-48z"],
    "ChildReaching": [384, 512, [], "solid", "M256 64A64 64 0 1 0 128 64a64 64 0 1 0 128 0zM152.9 169.3c-23.7-8.4-44.5-24.3-58.8-45.8L74.6 94.2C64.8 79.5 45 75.6 30.2 85.4s-18.7 29.7-8.9 44.4L40.9 159c18.1 27.1 42.8 48.4 71.1 62.4L112 480c0 17.7 14.3 32 32 32s32-14.3 32-32l0-96 32 0 0 96c0 17.7 14.3 32 32 32s32-14.3 32-32l0-258.4c29.1-14.2 54.4-36.2 72.7-64.2l18.2-27.9c9.6-14.8 5.4-34.6-9.4-44.3s-34.6-5.5-44.3 9.4L291 122.4c-21.8 33.4-58.9 53.6-98.8 53.6c-12.6 0-24.9-2-36.6-5.8c-.9-.3-1.8-.7-2.7-.9z"],
    "HourglassHalf": [384, 512, [], "regular", "M0 24C0 10.7 10.7 0 24 0L360 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-8 0 0 19c0 40.3-16 79-44.5 107.5L225.9 256l81.5 81.5C336 366 352 404.7 352 445l0 19 8 0c13.3 0 24 10.7 24 24s-10.7 24-24 24L24 512c-13.3 0-24-10.7-24-24s10.7-24 24-24l8 0 0-19c0-40.3 16-79 44.5-107.5L158.1 256 76.5 174.5C48 146 32 107.3 32 67l0-19-8 0C10.7 48 0 37.3 0 24zM110.5 371.5c-3.9 3.9-7.5 8.1-10.7 12.5l184.4 0c-3.2-4.4-6.8-8.6-10.7-12.5L192 289.9l-81.5 81.5zM284.2 128C297 110.4 304 89 304 67l0-19L80 48l0 19c0 22.1 7 43.4 19.8 61l184.4 0z"],
    "PaperPlane": [512, 512, [], "regular", "M16.1 260.2c-22.6 12.9-20.5 47.3 3.6 57.3L160 376l0 103.3c0 18.1 14.6 32.7 32.7 32.7c9.7 0 18.9-4.3 25.1-11.8l62-74.3 123.9 51.6c18.9 7.9 40.8-4.5 43.9-24.7l64-416c1.9-12.1-3.4-24.3-13.5-31.2s-23.3-7.5-34-1.4l-448 256zm52.1 25.5L409.7 90.6 190.1 336l1.2 1L68.2 285.7zM403.3 425.4L236.7 355.9 450.8 116.6 403.3 425.4z"],
    "Axis3DArrows": [24, 24, [], "solid", "m12 2l4 4h-3v7.85l6.53 3.76L21 15.03l1.5 5.47l-5.5 1.46l1.53-2.61L12 15.58l-6.53 3.77L7 21.96L1.5 20.5L3 15.03l1.47 2.58L11 13.85V6H8z"],
    "PersonWalkingDashedLineArrowRight": [640, 512, [], "solid", "M208 96a48 48 0 1 0 0-96 48 48 0 1 0 0 96zM123.7 200.5c1-.4 1.9-.8 2.9-1.2l-16.9 63.5c-5.6 21.1-.1 43.6 14.7 59.7l70.7 77.1 22 88.1c4.3 17.1 21.7 27.6 38.8 23.3s27.6-21.7 23.3-38.8l-23-92.1c-1.9-7.8-5.8-14.9-11.2-20.8l-49.5-54 19.3-65.5 9.6 23c4.4 10.6 12.5 19.3 22.8 24.5l26.7 13.3c15.8 7.9 35 1.5 42.9-14.3s1.5-35-14.3-42.9L281 232.7l-15.3-36.8C248.5 154.8 208.3 128 163.7 128c-22.8 0-45.3 4.8-66.1 14l-8 3.5c-32.9 14.6-58.1 42.4-69.4 76.5l-2.6 7.8c-5.6 16.8 3.5 34.9 20.2 40.5s34.9-3.5 40.5-20.2l2.6-7.8c5.7-17.1 18.3-30.9 34.7-38.2l8-3.5zm-30 135.1L68.7 398 9.4 457.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L116.3 441c4.6-4.6 8.2-10.1 10.6-16.1l14.5-36.2-40.7-44.4c-2.5-2.7-4.8-5.6-7-8.6zM550.6 153.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L530.7 224 384 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l146.7 0-25.4 25.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l80-80c12.5-12.5 12.5-32.8 0-45.3l-80-80zM392 0c-13.3 0-24 10.7-24 24l0 48c0 13.3 10.7 24 24 24s24-10.7 24-24l0-48c0-13.3-10.7-24-24-24zm24 152c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 16c0 13.3 10.7 24 24 24s24-10.7 24-24l0-16zM392 320c-13.3 0-24 10.7-24 24l0 16c0 13.3 10.7 24 24 24s24-10.7 24-24l0-16c0-13.3-10.7-24-24-24zm24 120c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 48c0 13.3 10.7 24 24 24s24-10.7 24-24l0-48z"],
    "PersonWalkingArrowLoopLeft": [640, 512, [], "solid", "M208 96a48 48 0 1 0 0-96 48 48 0 1 0 0 96zM123.7 200.5c1-.4 1.9-.8 2.9-1.2l-16.9 63.5c-5.6 21.1-.1 43.6 14.7 59.7l70.7 77.1 22 88.1c4.3 17.1 21.7 27.6 38.8 23.3s27.6-21.7 23.3-38.8l-23-92.1c-1.9-7.8-5.8-14.9-11.2-20.8l-49.5-54 19.3-65.5 9.6 23c4.4 10.6 12.5 19.3 22.8 24.5l26.7 13.3c15.8 7.9 35 1.5 42.9-14.3s1.5-35-14.3-42.9L281 232.7l-15.3-36.8C248.5 154.8 208.3 128 163.7 128c-22.8 0-45.3 4.8-66.1 14l-8 3.5c-32.9 14.6-58.1 42.4-69.4 76.5l-2.6 7.8c-5.6 16.8 3.5 34.9 20.2 40.5s34.9-3.5 40.5-20.2l2.6-7.8c5.7-17.1 18.3-30.9 34.7-38.2l8-3.5zm-30 135.1L68.7 398 9.4 457.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L116.3 441c4.6-4.6 8.2-10.1 10.6-16.1l14.5-36.2-40.7-44.4c-2.5-2.7-4.8-5.6-7-8.6zm347.7 119c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L461.3 384l18.7 0c88.4 0 160-71.6 160-160s-71.6-160-160-160L352 64c-17.7 0-32 14.3-32 32s14.3 32 32 32l128 0c53 0 96 43 96 96s-43 96-96 96l-18.7 0 25.4-25.4c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-80 80c-12.5 12.5-12.5 32.8 0 45.3l80 80z"],
    "PersonWalkingArrowRight": [640, 512, [], "solid", "M208 96a48 48 0 1 0 0-96 48 48 0 1 0 0 96zM123.7 200.5c1-.4 1.9-.8 2.9-1.2l-16.9 63.5c-5.6 21.1-.1 43.6 14.7 59.7l70.7 77.1 22 88.1c4.3 17.1 21.7 27.6 38.8 23.3s27.6-21.7 23.3-38.8l-23-92.1c-1.9-7.8-5.8-14.9-11.2-20.8l-49.5-54 19.3-65.5 9.6 23c4.4 10.6 12.5 19.3 22.8 24.5l26.7 13.3c15.8 7.9 35 1.5 42.9-14.3s1.5-35-14.3-42.9L281 232.7l-15.3-36.8C248.5 154.8 208.3 128 163.7 128c-22.8 0-45.3 4.8-66.1 14l-8 3.5c-32.9 14.6-58.1 42.4-69.4 76.5l-2.6 7.8c-5.6 16.8 3.5 34.9 20.2 40.5s34.9-3.5 40.5-20.2l2.6-7.8c5.7-17.1 18.3-30.9 34.7-38.2l8-3.5zm-30 135.1L68.7 398 9.4 457.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L116.3 441c4.6-4.6 8.2-10.1 10.6-16.1l14.5-36.2-40.7-44.4c-2.5-2.7-4.8-5.6-7-8.6zM550.6 153.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L530.7 224 384 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l146.7 0-25.4 25.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l80-80c12.5-12.5 12.5-32.8 0-45.3l-80-80z"],
    "ClapperboardClosed": [512, 512, [], "solid", "M448 32l-86.1 0-1 1-127 127 92.1 0 1-1L453.8 32.3c-1.9-.2-3.8-.3-5.8-.3zm64 128l0-64c0-15.1-5.3-29.1-14-40l-104 104L512 160zM294.1 32l-92.1 0-1 1L73.9 160l92.1 0 1-1 127-127zM64 32C28.7 32 0 60.7 0 96l0 64 6.1 0 1-1 127-127L64 32zM512 192L0 192 0 416c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-224z"],
    "UserOff": [640, 512, [], "solid", "M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7L381.9 274c48.5-23.2 82.1-72.7 82.1-130C464 64.5 399.5 0 320 0C250.4 0 192.4 49.3 178.9 114.9L38.8 5.1zM545.5 512L528 512 284.3 320l-59 0C136.2 320 64 392.2 64 481.3c0 17 13.8 30.7 30.7 30.7l450.6 0 .3 0z"],
    "PhotoFilm": [640, 512, ["Media"], "solid", "M256 0L576 0c35.3 0 64 28.7 64 64l0 224c0 35.3-28.7 64-64 64l-320 0c-35.3 0-64-28.7-64-64l0-224c0-35.3 28.7-64 64-64zM476 106.7C471.5 100 464 96 456 96s-15.5 4-20 10.7l-56 84L362.7 169c-4.6-5.7-11.5-9-18.7-9s-14.2 3.3-18.7 9l-64 80c-5.8 7.2-6.9 17.1-2.9 25.4s12.4 13.6 21.6 13.6l80 0 48 0 144 0c8.9 0 17-4.9 21.2-12.7s3.7-17.3-1.2-24.6l-96-144zM336 96a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zM64 128l96 0 0 256 0 32c0 17.7 14.3 32 32 32l128 0c17.7 0 32-14.3 32-32l0-32 160 0 0 64c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 192c0-35.3 28.7-64 64-64zm8 64c-8.8 0-16 7.2-16 16l0 16c0 8.8 7.2 16 16 16l16 0c8.8 0 16-7.2 16-16l0-16c0-8.8-7.2-16-16-16l-16 0zm0 104c-8.8 0-16 7.2-16 16l0 16c0 8.8 7.2 16 16 16l16 0c8.8 0 16-7.2 16-16l0-16c0-8.8-7.2-16-16-16l-16 0zm0 104c-8.8 0-16 7.2-16 16l0 16c0 8.8 7.2 16 16 16l16 0c8.8 0 16-7.2 16-16l0-16c0-8.8-7.2-16-16-16l-16 0zm336 16l0 16c0 8.8 7.2 16 16 16l16 0c8.8 0 16-7.2 16-16l0-16c0-8.8-7.2-16-16-16l-16 0c-8.8 0-16 7.2-16 16z"],
    "Chart": [448, 512, [], "solid", "M160 80c0-26.5 21.5-48 48-48l32 0c26.5 0 48 21.5 48 48l0 352c0 26.5-21.5 48-48 48l-32 0c-26.5 0-48-21.5-48-48l0-352zM0 272c0-26.5 21.5-48 48-48l32 0c26.5 0 48 21.5 48 48l0 160c0 26.5-21.5 48-48 48l-32 0c-26.5 0-48-21.5-48-48L0 272zM368 96l32 0c26.5 0 48 21.5 48 48l0 288c0 26.5-21.5 48-48 48l-32 0c-26.5 0-48-21.5-48-48l0-288c0-26.5 21.5-48 48-48z"],
    "HandsAslInterpreting": [640, 512, ["ASL"], "solid", "M156.6 46.3c7.9-15.8 1.5-35-14.3-42.9s-35-1.5-42.9 14.3L13.5 189.4C4.6 207.2 0 226.8 0 246.7L0 256c0 70.7 57.3 128 128 128l72 0 8 0 0-.3c35.2-2.7 65.4-22.8 82.1-51.7c8.8-15.3 3.6-34.9-11.7-43.7s-34.9-3.6-43.7 11.7c-7 12-19.9 20-34.7 20c-22.1 0-40-17.9-40-40s17.9-40 40-40c14.8 0 27.7 8 34.7 20c8.8 15.3 28.4 20.5 43.7 11.7s20.5-28.4 11.7-43.7c-12.8-22.1-33.6-39.1-58.4-47.1l80.8-22c17-4.6 27.1-22.2 22.5-39.3s-22.2-27.1-39.3-22.5L194.9 124.6l81.6-68c13.6-11.3 15.4-31.5 4.1-45.1S249.1-3.9 235.5 7.4L133.6 92.3l23-46zM483.4 465.7c-7.9 15.8-1.5 35 14.3 42.9s35 1.5 42.9-14.3l85.9-171.7c8.9-17.8 13.5-37.4 13.5-57.2l0-9.3c0-70.7-57.3-128-128-128l-72 0-8 0 0 .3c-35.2 2.7-65.4 22.8-82.1 51.7c-8.9 15.3-3.6 34.9 11.7 43.7s34.9 3.6 43.7-11.7c7-12 19.9-20 34.7-20c22.1 0 40 17.9 40 40s-17.9 40-40 40c-14.8 0-27.7-8-34.7-20c-8.9-15.3-28.4-20.5-43.7-11.7s-20.5 28.4-11.7 43.7c12.8 22.1 33.6 39.1 58.4 47.1l-80.8 22c-17.1 4.7-27.1 22.2-22.5 39.3s22.2 27.1 39.3 22.5l100.7-27.5-81.6 68c-13.6 11.3-15.4 31.5-4.1 45.1s31.5 15.4 45.1 4.1l101.9-84.9-23 46z"],
    "HandPointRight": [512, 512, [], "regular", "M448 128l-177.6 0c1 5.2 1.6 10.5 1.6 16l0 16 32 0 144 0c8.8 0 16-7.2 16-16s-7.2-16-16-16zM224 144c0-17.7-14.3-32-32-32c0 0 0 0 0 0l-24 0c-66.3 0-120 53.7-120 120l0 48c0 52.5 33.7 97.1 80.7 113.4c-.5-3.1-.7-6.2-.7-9.4c0-20 9.2-37.9 23.6-49.7c-4.9-9-7.6-19.4-7.6-30.3c0-15.1 5.3-29 14-40c-8.8-11-14-24.9-14-40l0-40c0-13.3 10.7-24 24-24s24 10.7 24 24l0 40c0 8.8 7.2 16 16 16s16-7.2 16-16l0-40 0-40zM192 64s0 0 0 0c18 0 34.6 6 48 16l208 0c35.3 0 64 28.7 64 64s-28.7 64-64 64l-82 0c1.3 5.1 2 10.5 2 16c0 25.3-14.7 47.2-36 57.6c2.6 7 4 14.5 4 22.4c0 20-9.2 37.9-23.6 49.7c4.9 9 7.6 19.4 7.6 30.3c0 35.3-28.7 64-64 64l-64 0-24 0C75.2 448 0 372.8 0 280l0-48C0 139.2 75.2 64 168 64l24 0zm64 336c8.8 0 16-7.2 16-16s-7.2-16-16-16l-48 0-16 0c-8.8 0-16 7.2-16 16s7.2 16 16 16l64 0zm16-176c0 5.5-.7 10.9-2 16l2 0 32 0c8.8 0 16-7.2 16-16s-7.2-16-16-16l-32 0 0 16zm-24 64l-40 0c-8.8 0-16 7.2-16 16s7.2 16 16 16l48 0 16 0c8.8 0 16-7.2 16-16s-7.2-16-16-16l-24 0z"],
    "HandPointUp": [384, 512, [], "regular", "M64 64l0 177.6c5.2-1 10.5-1.6 16-1.6l16 0 0-32L96 64c0-8.8-7.2-16-16-16s-16 7.2-16 16zM80 288c-17.7 0-32 14.3-32 32c0 0 0 0 0 0l0 24c0 66.3 53.7 120 120 120l48 0c52.5 0 97.1-33.7 113.4-80.7c-3.1 .5-6.2 .7-9.4 .7c-20 0-37.9-9.2-49.7-23.6c-9 4.9-19.4 7.6-30.3 7.6c-15.1 0-29-5.3-40-14c-11 8.8-24.9 14-40 14l-40 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l40 0c8.8 0 16-7.2 16-16s-7.2-16-16-16l-40 0-40 0zM0 320s0 0 0 0c0-18 6-34.6 16-48L16 64C16 28.7 44.7 0 80 0s64 28.7 64 64l0 82c5.1-1.3 10.5-2 16-2c25.3 0 47.2 14.7 57.6 36c7-2.6 14.5-4 22.4-4c20 0 37.9 9.2 49.7 23.6c9-4.9 19.4-7.6 30.3-7.6c35.3 0 64 28.7 64 64l0 64 0 24c0 92.8-75.2 168-168 168l-48 0C75.2 512 0 436.8 0 344l0-24zm336-64c0-8.8-7.2-16-16-16s-16 7.2-16 16l0 48 0 16c0 8.8 7.2 16 16 16s16-7.2 16-16l0-64zM160 240c5.5 0 10.9 .7 16 2l0-2 0-32c0-8.8-7.2-16-16-16s-16 7.2-16 16l0 32 16 0zm64 24l0 40c0 8.8 7.2 16 16 16s16-7.2 16-16l0-48 0-16c0-8.8-7.2-16-16-16s-16 7.2-16 16l0 24z"],
    "HandPointDown": [384, 512, [], "regular", "M64 448l0-177.6c5.2 1 10.5 1.6 16 1.6l16 0 0 32 0 144c0 8.8-7.2 16-16 16s-16-7.2-16-16zM80 224c-17.7 0-32-14.3-32-32c0 0 0 0 0 0l0-24c0-66.3 53.7-120 120-120l48 0c52.5 0 97.1 33.7 113.4 80.7c-3.1-.5-6.2-.7-9.4-.7c-20 0-37.9 9.2-49.7 23.6c-9-4.9-19.4-7.6-30.3-7.6c-15.1 0-29 5.3-40 14c-11-8.8-24.9-14-40-14l-40 0c-13.3 0-24 10.7-24 24s10.7 24 24 24l40 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-40 0-40 0zM0 192s0 0 0 0c0 18 6 34.6 16 48l0 208c0 35.3 28.7 64 64 64s64-28.7 64-64l0-82c5.1 1.3 10.5 2 16 2c25.3 0 47.2-14.7 57.6-36c7 2.6 14.5 4 22.4 4c20 0 37.9-9.2 49.7-23.6c9 4.9 19.4 7.6 30.3 7.6c35.3 0 64-28.7 64-64l0-64 0-24C384 75.2 308.8 0 216 0L168 0C75.2 0 0 75.2 0 168l0 24zm336 64c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-48 0-16c0-8.8 7.2-16 16-16s16 7.2 16 16l0 64zM160 272c5.5 0 10.9-.7 16-2l0 2 0 32c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-32 16 0zm64-24l0-40c0-8.8 7.2-16 16-16s16 7.2 16 16l0 48 0 16c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-24z"],
    "HandPointLeft": [512, 512, [], "regular", "M64 128l177.6 0c-1 5.2-1.6 10.5-1.6 16l0 16-32 0L64 160c-8.8 0-16-7.2-16-16s7.2-16 16-16zm224 16c0-17.7 14.3-32 32-32c0 0 0 0 0 0l24 0c66.3 0 120 53.7 120 120l0 48c0 52.5-33.7 97.1-80.7 113.4c.5-3.1 .7-6.2 .7-9.4c0-20-9.2-37.9-23.6-49.7c4.9-9 7.6-19.4 7.6-30.3c0-15.1-5.3-29-14-40c8.8-11 14-24.9 14-40l0-40c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 40c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-40 0-40zm32-80s0 0 0 0c-18 0-34.6 6-48 16L64 80C28.7 80 0 108.7 0 144s28.7 64 64 64l82 0c-1.3 5.1-2 10.5-2 16c0 25.3 14.7 47.2 36 57.6c-2.6 7-4 14.5-4 22.4c0 20 9.2 37.9 23.6 49.7c-4.9 9-7.6 19.4-7.6 30.3c0 35.3 28.7 64 64 64l64 0 24 0c92.8 0 168-75.2 168-168l0-48c0-92.8-75.2-168-168-168l-24 0zM256 400c-8.8 0-16-7.2-16-16s7.2-16 16-16l48 0 16 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-64 0zM240 224c0 5.5 .7 10.9 2 16l-2 0-32 0c-8.8 0-16-7.2-16-16s7.2-16 16-16l32 0 0 16zm24 64l40 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-48 0-16 0c-8.8 0-16-7.2-16-16s7.2-16 16-16l24 0z"],
    "HandScissors": [512, 512, [], "regular", "M.2 276.3c-1.2-35.3 26.4-65 61.7-66.2l3.3-.1L57 208.1C22.5 200.5 .7 166.3 8.3 131.8S50.2 75.5 84.7 83.2l173 38.3c2.3-2.9 4.7-5.7 7.1-8.5l18.4-20.3C299.9 74.5 323.5 64 348.3 64l10.2 0c54.1 0 104.1 28.7 131.3 75.4l1.5 2.6c13.6 23.2 20.7 49.7 20.7 76.6L512 344c0 66.3-53.7 120-120 120l-8 0-96 0c-35.3 0-64-28.7-64-64c0-2.8 .2-5.6 .5-8.3c-19.4-11-32.5-31.8-32.5-55.7c0-.8 0-1.6 0-2.4L66.4 338c-35.3 1.2-65-26.4-66.2-61.7zm63.4-18.2c-8.8 .3-15.7 7.7-15.4 16.5s7.7 15.7 16.5 15.4l161.5-5.6c9.8-.3 18.7 5.3 22.7 14.2s2.2 19.3-4.5 26.4c-2.8 2.9-4.4 6.7-4.4 11c0 8.8 7.2 16 16 16c9.1 0 17.4 5.1 21.5 13.3s3.2 17.9-2.3 25.1c-2 2.7-3.2 6-3.2 9.6c0 8.8 7.2 16 16 16l96 0 8 0c39.8 0 72-32.2 72-72l0-125.4c0-18.4-4.9-36.5-14.2-52.4l-1.5-2.6c-18.6-32-52.8-51.6-89.8-51.6l-10.2 0c-11.3 0-22 4.8-29.6 13.1l-17.5-15.9 17.5 15.9-18.4 20.3c-.6 .6-1.1 1.3-1.7 1.9l57 13.2c8.6 2 14 10.6 12 19.2s-10.6 14-19.2 12l-85.6-19.7L74.3 130c-8.6-1.9-17.2 3.5-19.1 12.2s3.5 17.2 12.2 19.1l187.5 41.6c10.2 2.3 17.8 10.9 18.7 21.4l.1 1c.6 6.6-1.5 13.1-5.8 18.1s-10.6 7.9-17.2 8.2L63.6 258.1z"],
    "HandSpock": [576, 512, [], "regular", "M170.2 80.8C161 47 180.8 12 214.6 2.4c34-9.6 69.4 10.2 79 44.2l30.3 107.1L337.1 84c6.6-34.7 40.1-57.5 74.8-50.9c31.4 6 53 33.9 52 64.9c10-2.6 20.8-2.8 31.5-.1c34.3 8.6 55.1 43.3 46.6 77.6L486.7 397.2C469.8 464.7 409.2 512 339.6 512l-33.7 0c-56.9 0-112.2-19-157.2-53.9l-92-71.6c-27.9-21.7-32.9-61.9-11.2-89.8s61.9-32.9 89.8-11.2l17 13.2L100.5 167.5c-13-32.9 3.2-70.1 36-83c11.1-4.4 22.7-5.4 33.7-3.7zm77.1-21.2c-2.4-8.5-11.2-13.4-19.7-11s-13.4 11.2-11 19.7l54.8 182.4c3.5 12.3-3.3 25.2-15.4 29.3s-25.3-2-30-13.9L174.9 138.1c-3.2-8.2-12.5-12.3-20.8-9s-12.3 12.5-9 20.8l73.3 185.6c12 30.3-23.7 57-49.4 37l-63.1-49.1c-7-5.4-17-4.2-22.5 2.8s-4.2 17 2.8 22.5l92 71.6c36.5 28.4 81.4 43.8 127.7 43.8l33.7 0c47.5 0 89-32.4 100.5-78.5l55.4-221.6c2.1-8.6-3.1-17.3-11.6-19.4s-17.3 3.1-19.4 11.6l-26 104C435.6 271.8 425 280 413 280c-16.5 0-28.9-15-25.8-31.2L415.7 99c1.7-8.7-4-17.1-12.7-18.7s-17.1 4-18.7 12.7L352.5 260c-2.2 11.6-12.4 20-24.2 20c-11 0-20.7-7.3-23.7-17.9L247.4 59.6z"],
    "HandBackFist": [448, 512, ["HandRock"], "regular", "M144 64c0-8.8 7.2-16 16-16s16 7.2 16 16c0 9.1 5.1 17.4 13.3 21.5s17.9 3.2 25.1-2.3c2.7-2 6-3.2 9.6-3.2c8.8 0 16 7.2 16 16c0 9.1 5.1 17.4 13.3 21.5s17.9 3.2 25.1-2.3c2.7-2 6-3.2 9.6-3.2c8.8 0 16 7.2 16 16c0 9.1 5.1 17.4 13.3 21.5s17.9 3.2 25.1-2.3c2.7-2 6-3.2 9.6-3.2c8.8 0 16 7.2 16 16l0 104c0 31.3-20 58-48 67.9c-9.6 3.4-16 12.5-16 22.6L304 488c0 13.3 10.7 24 24 24s24-10.7 24-24l0-117.8c38-20.1 64-60.1 64-106.2l0-104c0-35.3-28.7-64-64-64c-2.8 0-5.6 .2-8.3 .5C332.8 77.1 311.9 64 288 64c-2.8 0-5.6 .2-8.3 .5C268.8 45.1 247.9 32 224 32c-2.8 0-5.6 .2-8.3 .5C204.8 13.1 183.9 0 160 0C124.7 0 96 28.7 96 64l0 64.3c-11.7 7.4-22.5 16.4-32 26.9l17.8 16.1L64 155.2l-9.4 10.5C40 181.8 32 202.8 32 224.6l0 12.8c0 49.6 24.2 96.1 64.8 124.5l13.8-19.7L96.8 361.9l8.9 6.2c6.9 4.8 14.4 8.6 22.3 11.3L128 488c0 13.3 10.7 24 24 24s24-10.7 24-24l0-128.1c0-12.6-9.8-23.1-22.4-23.9c-7.3-.5-14.3-2.9-20.3-7.1l-13.1 18.7 13.1-18.7-8.9-6.2C96.6 303.1 80 271.3 80 237.4l0-12.8c0-9.9 3.7-19.4 10.3-26.8l9.4-10.5c3.8-4.2 7.9-8.1 12.3-11.6l0 32.3c0 8.8 7.2 16 16 16s16-7.2 16-16l0-65.7 0-14.3 0-64z"],
    "HandLizard": [512, 512, [], "regular", "M72 112c-13.3 0-24 10.7-24 24s10.7 24 24 24l168 0c35.3 0 64 28.7 64 64s-28.7 64-64 64l-104 0c-13.3 0-24 10.7-24 24s10.7 24 24 24l152 0c4.5 0 8.9 1.3 12.7 3.6l64 40c7 4.4 11.3 12.1 11.3 20.4l0 24c0 13.3-10.7 24-24 24s-24-10.7-24-24l0-10.7L281.1 384 136 384c-39.8 0-72-32.2-72-72s32.2-72 72-72l104 0c8.8 0 16-7.2 16-16s-7.2-16-16-16L72 208c-39.8 0-72-32.2-72-72S32.2 64 72 64l209.6 0c46.7 0 90.9 21.5 119.7 58.3l78.4 100.1c20.9 26.7 32.3 59.7 32.3 93.7L512 424c0 13.3-10.7 24-24 24s-24-10.7-24-24l0-107.9c0-23.2-7.8-45.8-22.1-64.1L363.5 151.9c-19.7-25.2-49.9-39.9-81.9-39.9L72 112z"],
    "HandPeace": [512, 512, [], "regular", "M250.8 1.4c-35.2-3.7-66.6 21.8-70.3 57L174 119 156.7 69.6C145 36.3 108.4 18.8 75.1 30.5S24.2 78.8 35.9 112.1L88.7 262.2C73.5 276.7 64 297.3 64 320c0 0 0 0 0 0l0 24c0 92.8 75.2 168 168 168l48 0c92.8 0 168-75.2 168-168l0-72 0-16 0-32c0-35.3-28.7-64-64-64c-7.9 0-15.4 1.4-22.4 4c-10.4-21.3-32.3-36-57.6-36c-.7 0-1.5 0-2.2 0l5.9-56.3c3.7-35.2-21.8-66.6-57-70.3zm-.2 155.4C243.9 166.9 240 179 240 192l0 48c0 .7 0 1.4 0 2c-5.1-1.3-10.5-2-16-2l-7.4 0-5.4-15.3 17-161.3c.9-8.8 8.8-15.2 17.6-14.2s15.2 8.8 14.2 17.6l-9.5 90.1zM111.4 85.6L165.7 240 144 240c-4 0-8 .3-11.9 .9L81.2 96.2c-2.9-8.3 1.5-17.5 9.8-20.4s17.5 1.5 20.4 9.8zM288 192c0-8.8 7.2-16 16-16s16 7.2 16 16l0 32 0 16c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-48zm38.4 108c10.4 21.3 32.3 36 57.6 36c5.5 0 10.9-.7 16-2l0 10c0 66.3-53.7 120-120 120l-48 0c-66.3 0-120-53.7-120-120l0-24s0 0 0 0c0-17.7 14.3-32 32-32l80 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-40 0c-13.3 0-24 10.7-24 24s10.7 24 24 24l40 0c35.3 0 64-28.7 64-64c0-.7 0-1.4 0-2c5.1 1.3 10.5 2 16 2c7.9 0 15.4-1.4 22.4-4zM400 272c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-32 0-16c0-8.8 7.2-16 16-16s16 7.2 16 16l0 32 0 16z"],
    "Html": [24, 24, [], "solid", "m3 2l1.578 17.824L12 22l7.467-2.175L21 2zm14.049 6.048H9.075l.172 2.016h7.697l-.626 6.565l-4.246 1.381l-4.281-1.455l-.288-2.932h2.024l.16 1.411l2.4.815l2.346-.763l.297-3.005H7.416l-.562-6.05h10.412z"],
    "CircleNodes": [512, 512, [], "solid", "M418.4 157.9c35.3-8.3 61.6-40 61.6-77.9c0-44.2-35.8-80-80-80c-43.4 0-78.7 34.5-80 77.5L136.2 151.1C121.7 136.8 101.9 128 80 128c-44.2 0-80 35.8-80 80s35.8 80 80 80c12.2 0 23.8-2.7 34.1-7.6L259.7 407.8c-2.4 7.6-3.7 15.8-3.7 24.2c0 44.2 35.8 80 80 80s80-35.8 80-80c0-27.7-14-52.1-35.4-66.4l37.8-207.7zM156.3 232.2c2.2-6.9 3.5-14.2 3.7-21.7l183.8-73.5c3.6 3.5 7.4 6.7 11.6 9.5L317.6 354.1c-5.5 1.3-10.8 3.1-15.8 5.5L156.3 232.2z"],
    "CircleRight": [512, 512, [], "regular", "M464 256A208 208 0 1 1 48 256a208 208 0 1 1 416 0zM0 256a256 256 0 1 0 512 0A256 256 0 1 0 0 256zM294.6 151.2c-4.2-4.6-10.1-7.2-16.4-7.2C266 144 256 154 256 166.3l0 41.7-96 0c-17.7 0-32 14.3-32 32l0 32c0 17.7 14.3 32 32 32l96 0 0 41.7c0 12.3 10 22.3 22.3 22.3c6.2 0 12.1-2.6 16.4-7.2l84-91c3.5-3.8 5.4-8.7 5.4-13.9s-1.9-10.1-5.4-13.9l-84-91z"],
    "CircleUp": [512, 512, [], "regular", "M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM151.2 217.4c-4.6 4.2-7.2 10.1-7.2 16.4c0 12.3 10 22.3 22.3 22.3l41.7 0 0 96c0 17.7 14.3 32 32 32l32 0c17.7 0 32-14.3 32-32l0-96 41.7 0c12.3 0 22.3-10 22.3-22.3c0-6.2-2.6-12.1-7.2-16.4l-91-84c-3.8-3.5-8.7-5.4-13.9-5.4s-10.1 1.9-13.9 5.4l-91 84z"],
    "CircleLeft": [512, 512, [], "regular", "M48 256a208 208 0 1 1 416 0A208 208 0 1 1 48 256zm464 0A256 256 0 1 0 0 256a256 256 0 1 0 512 0zM217.4 376.9c4.2 4.5 10.1 7.1 16.3 7.1c12.3 0 22.3-10 22.3-22.3l0-57.7 96 0c17.7 0 32-14.3 32-32l0-32c0-17.7-14.3-32-32-32l-96 0 0-57.7c0-12.3-10-22.3-22.3-22.3c-6.2 0-12.1 2.6-16.3 7.1L117.5 242.2c-3.5 3.8-5.5 8.7-5.5 13.8s2 10.1 5.5 13.8l99.9 107.1z"],
    "CircleDown": [512, 512, [], "regular", "M256 464a208 208 0 1 1 0-416 208 208 0 1 1 0 416zM256 0a256 256 0 1 0 0 512A256 256 0 1 0 256 0zM376.9 294.6c4.5-4.2 7.1-10.1 7.1-16.3c0-12.3-10-22.3-22.3-22.3L304 256l0-96c0-17.7-14.3-32-32-32l-32 0c-17.7 0-32 14.3-32 32l0 96-57.7 0C138 256 128 266 128 278.3c0 6.2 2.6 12.1 7.1 16.3l107.1 99.9c3.8 3.5 8.7 5.5 13.8 5.5s10.1-2 13.8-5.5l107.1-99.9z"],
    "WindowRestore": [512, 512, [], "solid", "M432 48L208 48c-17.7 0-32 14.3-32 32l0 16-48 0 0-16c0-44.2 35.8-80 80-80L432 0c44.2 0 80 35.8 80 80l0 224c0 44.2-35.8 80-80 80l-16 0 0-48 16 0c17.7 0 32-14.3 32-32l0-224c0-17.7-14.3-32-32-32zM48 448c0 8.8 7.2 16 16 16l256 0c8.8 0 16-7.2 16-16l0-192L48 256l0 192zM64 128l256 0c35.3 0 64 28.7 64 64l0 256c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 192c0-35.3 28.7-64 64-64z"],
    "WindowMaximize": [512, 512, [], "solid", "M.3 89.5C.1 91.6 0 93.8 0 96L0 224 0 416c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-192 0-128c0-35.3-28.7-64-64-64L64 32c-2.2 0-4.4 .1-6.5 .3c-9.2 .9-17.8 3.8-25.5 8.2C21.8 46.5 13.4 55.1 7.7 65.5c-3.9 7.3-6.5 15.4-7.4 24zM48 224l416 0 0 192c0 8.8-7.2 16-16 16L64 432c-8.8 0-16-7.2-16-16l0-192z"],
    "WindowMinimize": [512, 512, [], "solid", "M24 432c-13.3 0-24 10.7-24 24s10.7 24 24 24l464 0c13.3 0 24-10.7 24-24s-10.7-24-24-24L24 432z"],
    "VrCardboard": [640, 512, ["VR"], "solid", "M576 64L64 64C28.7 64 0 92.7 0 128L0 384c0 35.3 28.7 64 64 64l120.4 0c24.2 0 46.4-13.7 57.2-35.4l32-64c8.8-17.5 26.7-28.6 46.3-28.6s37.5 11.1 46.3 28.6l32 64c10.8 21.7 33 35.4 57.2 35.4L576 448c35.3 0 64-28.7 64-64l0-256c0-35.3-28.7-64-64-64zM96 240a64 64 0 1 1 128 0A64 64 0 1 1 96 240zm384-64a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"],
    "C": [32, 32, [], "solid", "M29.86 8c-.224-.385-.532-.724-.871-.921L17.234.292c-.677-.391-1.787-.391-2.464 0L3.015 7.079C2.338 7.47 1.78 8.432 1.78 9.214v13.573c0 .391.14.828.364 1.213.219.385.532.724.871.917l11.749 6.791c.683.391 1.787.391 2.464 0l11.755-6.791c.339-.193.647-.532.871-.917s.359-.823.359-1.213V9.214c.005-.391-.135-.828-.353-1.213zM16 25.479c-5.229 0-9.479-4.249-9.479-9.479S10.77 6.521 16 6.521a9.51 9.51 0 0 1 8.208 4.733l-4.104 2.376A4.76 4.76 0 0 0 16 11.259c-2.615 0-4.74 2.125-4.74 4.74s2.125 4.74 4.74 4.74a4.76 4.76 0 0 0 4.104-2.371l4.104 2.376A9.51 9.51 0 0 1 16 25.479z", { svgClass: "stroke-none" }],
    "CPlusPlus": [32, 32, [], "solid", "M29.86 8c-.224-.385-.532-.724-.871-.921L17.234.292c-.677-.391-1.787-.391-2.464 0L3.015 7.079C2.338 7.47 1.78 8.432 1.78 9.214v13.573c0 .391.14.828.364 1.213c.219.385.532.724.871.917l11.749 6.791c.683.391 1.787.391 2.464 0l11.755-6.791c.339-.193.647-.532.871-.917s.359-.823.359-1.213V9.214c.005-.391-.135-.828-.353-1.213zM16 25.479c-5.229 0-9.479-4.249-9.479-9.479S10.77 6.521 16 6.521a9.51 9.51 0 0 1 8.208 4.733l-4.104 2.376A4.76 4.76 0 0 0 16 11.259c-2.615 0-4.74 2.125-4.74 4.74s2.125 4.74 4.74 4.74a4.76 4.76 0 0 0 4.104-2.371l4.104 2.376A9.51 9.51 0 0 1 16 25.477zm9.479-8.952h-1.052v1.052H23.37v-1.052h-1.052v-1.053h1.052v-1.052h1.057v1.052h1.052zm3.948 0h-1.052v1.052h-1.052v-1.052h-1.052v-1.053h1.052v-1.052h1.052v1.052h1.052z", { svgClass: "stroke-none" }],
    "Css": [24, 24, [], "solid", "M0 0v20.16A3.84 3.84 0 0 0 3.84 24h16.32A3.84 3.84 0 0 0 24 20.16V3.84A3.84 3.84 0 0 0 20.16 0Zm14.256 13.08c1.56 0 2.28 1.08 2.304 2.64h-1.608c.024-.288-.048-.6-.144-.84c-.096-.192-.288-.264-.552-.264c-.456 0-.696.264-.696.84c-.024.576.288.888.768 1.08c.72.288 1.608.744 1.92 1.296q.432.648.432 1.656c0 1.608-.912 2.592-2.496 2.592c-1.656 0-2.4-1.032-2.424-2.688h1.68c0 .792.264 1.176.792 1.176c.264 0 .456-.072.552-.24c.192-.312.24-1.176-.048-1.512c-.312-.408-.912-.6-1.32-.816q-.828-.396-1.224-.936c-.24-.36-.36-.888-.36-1.536c0-1.44.936-2.472 2.424-2.448m5.4 0c1.584 0 2.304 1.08 2.328 2.64h-1.608c0-.288-.048-.6-.168-.84c-.096-.192-.264-.264-.528-.264c-.48 0-.72.264-.72.84s.288.888.792 1.08c.696.288 1.608.744 1.92 1.296c.264.432.408.984.408 1.656c.024 1.608-.888 2.592-2.472 2.592c-1.68 0-2.424-1.056-2.448-2.688h1.68c0 .744.264 1.176.792 1.176c.264 0 .456-.072.552-.24c.216-.312.264-1.176-.048-1.512c-.288-.408-.888-.6-1.32-.816c-.552-.264-.96-.576-1.2-.936s-.36-.888-.36-1.536c-.024-1.44.912-2.472 2.4-2.448m-11.031.018c.711-.006 1.419.198 1.839.63c.432.432.672 1.128.648 1.992H9.336c.024-.456-.096-.792-.432-.96c-.312-.144-.768-.048-.888.24c-.12.264-.192.576-.168.864v3.504c0 .744.264 1.128.768 1.128a.65.65 0 0 0 .552-.264c.168-.24.192-.552.168-.84h1.776c.096 1.632-.984 2.712-2.568 2.688c-1.536 0-2.496-.864-2.472-2.472v-4.032c0-.816.24-1.44.696-1.848c.432-.408 1.146-.624 1.857-.63"],
    "Discord": [640, 512, [], "solid", "M524.531,69.836a1.5,1.5,0,0,0-.764-.7A485.065,485.065,0,0,0,404.081,32.03a1.816,1.816,0,0,0-1.923.91,337.461,337.461,0,0,0-14.9,30.6,447.848,447.848,0,0,0-134.426,0,309.541,309.541,0,0,0-15.135-30.6,1.89,1.89,0,0,0-1.924-.91A483.689,483.689,0,0,0,116.085,69.137a1.712,1.712,0,0,0-.788.676C39.068,183.651,18.186,294.69,28.43,404.354a2.016,2.016,0,0,0,.765,1.375A487.666,487.666,0,0,0,176.02,479.918a1.9,1.9,0,0,0,2.063-.676A348.2,348.2,0,0,0,208.12,430.4a1.86,1.86,0,0,0-1.019-2.588,321.173,321.173,0,0,1-45.868-21.853,1.885,1.885,0,0,1-.185-3.126c3.082-2.309,6.166-4.711,9.109-7.137a1.819,1.819,0,0,1,1.9-.256c96.229,43.917,200.41,43.917,295.5,0a1.812,1.812,0,0,1,1.924.233c2.944,2.426,6.027,4.851,9.132,7.16a1.884,1.884,0,0,1-.162,3.126,301.407,301.407,0,0,1-45.89,21.83,1.875,1.875,0,0,0-1,2.611,391.055,391.055,0,0,0,30.014,48.815,1.864,1.864,0,0,0,2.063.7A486.048,486.048,0,0,0,610.7,405.729a1.882,1.882,0,0,0,.765-1.352C623.729,277.594,590.933,167.465,524.531,69.836ZM222.491,337.58c-28.972,0-52.844-26.587-52.844-59.239S193.056,219.1,222.491,219.1c29.665,0,53.306,26.82,52.843,59.239C275.334,310.993,251.924,337.58,222.491,337.58Zm195.38,0c-28.971,0-52.843-26.587-52.843-59.239S388.437,219.1,417.871,219.1c29.667,0,53.307,26.82,52.844,59.239C470.715,310.993,447.538,337.58,417.871,337.58Z"],
    "Godot": [32, 32, [], "solid", "M12.745.917c-1.458.328-2.906.781-4.266 1.464a32 32 0 0 0 .266 3.505c-.526.339-1.078.63-1.568 1.026c-.5.38-1.01.75-1.464 1.198a28 28 0 0 0-2.849-1.651C1.801 7.6.812 8.834-.001 10.214c.609.99 1.25 1.911 1.938 2.792h.016v8.474a.2.2 0 0 1 .047.005l5.198.5a.554.554 0 0 1 .5.521l.161 2.292l4.531.323l.313-2.115a.56.56 0 0 1 .552-.479h5.484a.56.56 0 0 1 .552.479l.313 2.115l4.531-.323l.161-2.292a.554.554 0 0 1 .505-.521l5.193-.5c.016 0 .031-.005.047-.005v-8.474h.021a30 30 0 0 0 1.932-2.792c-.807-1.38-1.802-2.615-2.865-3.755A29 29 0 0 0 26.28 8.11c-.453-.448-.958-.818-1.458-1.198c-.495-.396-1.047-.688-1.573-1.026c.156-1.161.234-2.307.266-3.505c-1.354-.682-2.802-1.135-4.266-1.464A31 31 0 0 0 17.671 4a11 11 0 0 0-1.661-.13h-.026c-.552.005-1.109.042-1.661.13A30 30 0 0 0 12.74.917zm-4.11 12.406a3.134 3.134 0 0 1 3.13 3.135a3.13 3.13 0 1 1-6.26 0a3.134 3.134 0 0 1 3.13-3.135m14.73 0a3.134 3.134 0 0 1 3.13 3.135a3.13 3.13 0 1 1-6.26 0a3.134 3.134 0 0 1 3.13-3.135M8.932 14.568a2.076 2.076 0 1 0 0 4.151a2.077 2.077 0 0 0 2.083-2.073a2.08 2.08 0 0 0-2.083-2.078m14.131 0a2.076 2.076 0 1 0 0 4.151a2.073 2.073 0 0 0 2.078-2.073a2.074 2.074 0 0 0-2.078-2.078M16 15.172c.557 0 1.01.406 1.01.911v2.885c0 .505-.453.917-1.01.917s-1.01-.411-1.01-.917v-2.885c0-.505.453-.911 1.01-.911M1.948 22.599c0 .505.005 1.052.005 1.161c0 4.938 6.26 7.307 14.036 7.333h.021c7.776-.026 14.031-2.396 14.031-7.333l.01-1.161l-4.672.453l-.161 2.307a.556.556 0 0 1-.516.516l-5.578.396a.56.56 0 0 1-.552-.474l-.318-2.156h-4.516l-.318 2.156a.557.557 0 0 1-.594.474l-5.531-.396a.565.565 0 0 1-.521-.516l-.156-2.307l-4.672-.448z"],
    "Google": [488, 512, [], "solid", "M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"],
    "Go": [24, 24, [], "solid", "M1.811 10.231c-.047 0-.058-.023-.035-.059l.246-.315c.023-.035.081-.058.128-.058h4.172c.046 0 .058.035.035.07l-.199.303c-.023.036-.082.07-.117.07zM.047 11.306c-.047 0-.059-.023-.035-.058l.245-.316c.023-.035.082-.058.129-.058h5.328c.047 0 .07.035.058.07l-.093.28c-.012.047-.058.07-.105.07zm2.828 1.075c-.047 0-.059-.035-.035-.07l.163-.292c.023-.035.07-.07.117-.07h2.337c.047 0 .07.035.07.082l-.023.28c0 .047-.047.082-.082.082zm12.129-2.36c-.736.187-1.239.327-1.963.514c-.176.046-.187.058-.34-.117c-.174-.199-.303-.327-.548-.444c-.737-.362-1.45-.257-2.115.175c-.795.514-1.204 1.274-1.192 2.22c.011.935.654 1.706 1.577 1.835c.795.105 1.46-.175 1.987-.77c.105-.13.198-.27.315-.434H10.47c-.245 0-.304-.152-.222-.35c.152-.362.432-.97.596-1.274a.32.32 0 0 1 .292-.187h4.253c-.023.316-.023.631-.07.947a5 5 0 0 1-.958 2.29c-.841 1.11-1.94 1.8-3.33 1.986c-1.145.152-2.209-.07-3.143-.77c-.865-.655-1.356-1.52-1.484-2.595c-.152-1.274.222-2.419.993-3.424c.83-1.086 1.928-1.776 3.272-2.02c1.098-.2 2.15-.07 3.096.571c.62.41 1.063.97 1.356 1.648c.07.105.023.164-.117.2m3.868 6.461c-1.064-.024-2.034-.328-2.852-1.029a3.67 3.67 0 0 1-1.262-2.255c-.21-1.32.152-2.489.947-3.529c.853-1.122 1.881-1.706 3.272-1.95c1.192-.21 2.314-.095 3.33.595c.923.63 1.496 1.484 1.648 2.605c.198 1.578-.257 2.863-1.344 3.962c-.771.783-1.718 1.273-2.805 1.495c-.315.06-.63.07-.934.106m2.78-4.72c-.011-.153-.011-.27-.034-.387c-.21-1.157-1.274-1.81-2.384-1.554c-1.087.245-1.788.935-2.045 2.033c-.21.912.234 1.835 1.075 2.21c.643.28 1.285.244 1.905-.07c.923-.48 1.425-1.228 1.484-2.233z"],
    "Git": [32, 32, [], "solid", "M13.172 2.828L11.78 4.22l1.91 1.91l2 2A2.986 2.986 0 0 1 20 10.81a3.25 3.25 0 0 1-.31 1.31l2.06 2a2.68 2.68 0 0 1 3.37.57a2.86 2.86 0 0 1 .88 2.117a3.02 3.02 0 0 1-.856 2.109A2.9 2.9 0 0 1 23 19.81a2.93 2.93 0 0 1-2.13-.87a2.694 2.694 0 0 1-.56-3.38l-2-2.06a3 3 0 0 1-.31.12V20a3 3 0 0 1 1.44 1.09a2.92 2.92 0 0 1 .56 1.72a2.88 2.88 0 0 1-.878 2.128a2.98 2.98 0 0 1-2.048.871a2.981 2.981 0 0 1-2.514-4.719A3 3 0 0 1 16 20v-6.38a2.96 2.96 0 0 1-1.44-1.09a2.9 2.9 0 0 1-.56-1.72a2.9 2.9 0 0 1 .31-1.31l-3.9-3.9l-7.579 7.572a4 4 0 0 0-.001 5.658l10.342 10.342a4 4 0 0 0 5.656 0l10.344-10.344a4 4 0 0 0 0-5.656L18.828 2.828a4 4 0 0 0-5.656 0"],
    "Json": [32, 32, [], "solid", "M4.014 14.976a2.5 2.5 0 0 0 1.567-.518a2.38 2.38 0 0 0 .805-1.358a15.3 15.3 0 0 0 .214-2.944q.012-2.085.075-2.747a5.2 5.2 0 0 1 .418-1.686a3 3 0 0 1 .755-1.018A3.05 3.05 0 0 1 9 4.125A6.8 6.8 0 0 1 10.544 4h.7v1.96h-.387a2.34 2.34 0 0 0-1.723.468a3.4 3.4 0 0 0-.425 2.092a36 36 0 0 1-.137 4.133a4.7 4.7 0 0 1-.768 2.06A4.6 4.6 0 0 1 6.1 16a3.8 3.8 0 0 1 1.992 1.754a8.9 8.9 0 0 1 .618 3.865q0 2.435.05 2.9a1.76 1.76 0 0 0 .504 1.181a2.64 2.64 0 0 0 1.592.337h.387V28h-.7a5.7 5.7 0 0 1-1.773-.2a2.97 2.97 0 0 1-1.324-.93a3.35 3.35 0 0 1-.681-1.63a24 24 0 0 1-.165-3.234a16.5 16.5 0 0 0-.214-3.106a2.4 2.4 0 0 0-.805-1.361a2.5 2.5 0 0 0-1.567-.524Zm23.972 2.035a2.5 2.5 0 0 0-1.567.524a2.4 2.4 0 0 0-.805 1.361a16.5 16.5 0 0 0-.212 3.109a24 24 0 0 1-.169 3.234a3.35 3.35 0 0 1-.681 1.63a2.97 2.97 0 0 1-1.324.93a5.7 5.7 0 0 1-1.773.2h-.7V26.04h.387a2.64 2.64 0 0 0 1.592-.337a1.76 1.76 0 0 0 .506-1.186q.05-.462.05-2.9a8.9 8.9 0 0 1 .618-3.865A3.8 3.8 0 0 1 25.9 16a4.6 4.6 0 0 1-1.7-1.286a4.7 4.7 0 0 1-.768-2.06a36 36 0 0 1-.137-4.133a3.4 3.4 0 0 0-.425-2.092a2.34 2.34 0 0 0-1.723-.468h-.387V4h.7a6.8 6.8 0 0 1 1.54.125a3.05 3.05 0 0 1 1.149.581a3 3 0 0 1 .755 1.018a5.2 5.2 0 0 1 .418 1.686q.062.662.075 2.747a15.3 15.3 0 0 0 .212 2.947a2.38 2.38 0 0 0 .805 1.355a2.5 2.5 0 0 0 1.567.518Z"],
    "Js": [32, 32, [], "solid", "M18.774 19.7a3.73 3.73 0 0 0 3.376 2.078c1.418 0 2.324-.709 2.324-1.688c0-1.173-.931-1.589-2.491-2.272l-.856-.367c-2.469-1.052-4.11-2.37-4.11-5.156c0-2.567 1.956-4.52 5.012-4.52A5.06 5.06 0 0 1 26.9 10.52l-2.665 1.711a2.33 2.33 0 0 0-2.2-1.467a1.49 1.49 0 0 0-1.638 1.467c0 1.027.636 1.442 2.1 2.078l.856.366c2.908 1.247 4.549 2.518 4.549 5.376c0 3.081-2.42 4.769-5.671 4.769a6.58 6.58 0 0 1-6.236-3.5ZM6.686 20c.538.954 1.027 1.76 2.2 1.76c1.124 0 1.834-.44 1.834-2.15V7.975h3.422v11.683c0 3.543-2.078 5.156-5.11 5.156A5.31 5.31 0 0 1 3.9 21.688Z"],
    "Ts": [32, 32, [], "solid", "M23.827 8.243a4.4 4.4 0 0 1 2.223 1.281a6 6 0 0 1 .852 1.143c.011.045-1.534 1.083-2.471 1.662c-.034.023-.169-.124-.322-.35a2.01 2.01 0 0 0-1.67-1c-1.077-.074-1.771.49-1.766 1.433a1.3 1.3 0 0 0 .153.666c.237.49.677.784 2.059 1.383c2.544 1.095 3.636 1.817 4.31 2.843a5.16 5.16 0 0 1 .416 4.333a4.76 4.76 0 0 1-3.932 2.815a11 11 0 0 1-2.708-.028a6.53 6.53 0 0 1-3.616-1.884a6.3 6.3 0 0 1-.926-1.371a3 3 0 0 1 .327-.208c.158-.09.756-.434 1.32-.761l1.024-.6l.214.312a4.8 4.8 0 0 0 1.35 1.292a3.3 3.3 0 0 0 3.458-.175a1.545 1.545 0 0 0 .2-1.974c-.276-.395-.84-.727-2.443-1.422a8.8 8.8 0 0 1-3.349-2.055a4.7 4.7 0 0 1-.976-1.777a7.1 7.1 0 0 1-.062-2.268a4.33 4.33 0 0 1 3.644-3.374a9 9 0 0 1 2.691.084m-8.343 1.483l.011 1.454h-4.63v13.148H7.6V11.183H2.97V9.755a14 14 0 0 1 .04-1.466c.017-.023 2.832-.034 6.245-.028l6.211.017Z"],
    "Linux": [448, 512, [], "regular", "M220.8 123.3c1 .5 1.8 1.7 3 1.7 1.1 0 2.8-.4 2.9-1.5.2-1.4-1.9-2.3-3.2-2.9-1.7-.7-3.9-1-5.5-.1-.4.2-.8.7-.6 1.1.3 1.3 2.3 1.1 3.4 1.7zm-21.9 1.7c1.2 0 2-1.2 3-1.7 1.1-.6 3.1-.4 3.5-1.6.2-.4-.2-.9-.6-1.1-1.6-.9-3.8-.6-5.5.1-1.3.6-3.4 1.5-3.2 2.9.1 1 1.8 1.5 2.8 1.4zM420 403.8c-3.6-4-5.3-11.6-7.2-19.7-1.8-8.1-3.9-16.8-10.5-22.4-1.3-1.1-2.6-2.1-4-2.9-1.3-.8-2.7-1.5-4.1-2 9.2-27.3 5.6-54.5-3.7-79.1-11.4-30.1-31.3-56.4-46.5-74.4-17.1-21.5-33.7-41.9-33.4-72C311.1 85.4 315.7.1 234.8 0 132.4-.2 158 103.4 156.9 135.2c-1.7 23.4-6.4 41.8-22.5 64.7-18.9 22.5-45.5 58.8-58.1 96.7-6 17.9-8.8 36.1-6.2 53.3-6.5 5.8-11.4 14.7-16.6 20.2-4.2 4.3-10.3 5.9-17 8.3s-14 6-18.5 14.5c-2.1 3.9-2.8 8.1-2.8 12.4 0 3.9.6 7.9 1.2 11.8 1.2 8.1 2.5 15.7.8 20.8-5.2 14.4-5.9 24.4-2.2 31.7 3.8 7.3 11.4 10.5 20.1 12.3 17.3 3.6 40.8 2.7 59.3 12.5 19.8 10.4 39.9 14.1 55.9 10.4 11.6-2.6 21.1-9.6 25.9-20.2 12.5-.1 26.3-5.4 48.3-6.6 14.9-1.2 33.6 5.3 55.1 4.1.6 2.3 1.4 4.6 2.5 6.7v.1c8.3 16.7 23.8 24.3 40.3 23 16.6-1.3 34.1-11 48.3-27.9 13.6-16.4 36-23.2 50.9-32.2 7.4-4.5 13.4-10.1 13.9-18.3.4-8.2-4.4-17.3-15.5-29.7zM223.7 87.3c9.8-22.2 34.2-21.8 44-.4 6.5 14.2 3.6 30.9-4.3 40.4-1.6-.8-5.9-2.6-12.6-4.9 1.1-1.2 3.1-2.7 3.9-4.6 4.8-11.8-.2-27-9.1-27.3-7.3-.5-13.9 10.8-11.8 23-4.1-2-9.4-3.5-13-4.4-1-6.9-.3-14.6 2.9-21.8zM183 75.8c10.1 0 20.8 14.2 19.1 33.5-3.5 1-7.1 2.5-10.2 4.6 1.2-8.9-3.3-20.1-9.6-19.6-8.4.7-9.8 21.2-1.8 28.1 1 .8 1.9-.2-5.9 5.5-15.6-14.6-10.5-52.1 8.4-52.1zm-13.6 60.7c6.2-4.6 13.6-10 14.1-10.5 4.7-4.4 13.5-14.2 27.9-14.2 7.1 0 15.6 2.3 25.9 8.9 6.3 4.1 11.3 4.4 22.6 9.3 8.4 3.5 13.7 9.7 10.5 18.2-2.6 7.1-11 14.4-22.7 18.1-11.1 3.6-19.8 16-38.2 14.9-3.9-.2-7-1-9.6-2.1-8-3.5-12.2-10.4-20-15-8.6-4.8-13.2-10.4-14.7-15.3-1.4-4.9 0-9 4.2-12.3zm3.3 334c-2.7 35.1-43.9 34.4-75.3 18-29.9-15.8-68.6-6.5-76.5-21.9-2.4-4.7-2.4-12.7 2.6-26.4v-.2c2.4-7.6.6-16-.6-23.9-1.2-7.8-1.8-15 .9-20 3.5-6.7 8.5-9.1 14.8-11.3 10.3-3.7 11.8-3.4 19.6-9.9 5.5-5.7 9.5-12.9 14.3-18 5.1-5.5 10-8.1 17.7-6.9 8.1 1.2 15.1 6.8 21.9 16l19.6 35.6c9.5 19.9 43.1 48.4 41 68.9zm-1.4-25.9c-4.1-6.6-9.6-13.6-14.4-19.6 7.1 0 14.2-2.2 16.7-8.9 2.3-6.2 0-14.9-7.4-24.9-13.5-18.2-38.3-32.5-38.3-32.5-13.5-8.4-21.1-18.7-24.6-29.9s-3-23.3-.3-35.2c5.2-22.9 18.6-45.2 27.2-59.2 2.3-1.7.8 3.2-8.7 20.8-8.5 16.1-24.4 53.3-2.6 82.4.6-20.7 5.5-41.8 13.8-61.5 12-27.4 37.3-74.9 39.3-112.7 1.1.8 4.6 3.2 6.2 4.1 4.6 2.7 8.1 6.7 12.6 10.3 12.4 10 28.5 9.2 42.4 1.2 6.2-3.5 11.2-7.5 15.9-9 9.9-3.1 17.8-8.6 22.3-15 7.7 30.4 25.7 74.3 37.2 95.7 6.1 11.4 18.3 35.5 23.6 64.6 3.3-.1 7 .4 10.9 1.4 13.8-35.7-11.7-74.2-23.3-84.9-4.7-4.6-4.9-6.6-2.6-6.5 12.6 11.2 29.2 33.7 35.2 59 2.8 11.6 3.3 23.7.4 35.7 16.4 6.8 35.9 17.9 30.7 34.8-2.2-.1-3.2 0-4.2 0 3.2-10.1-3.9-17.6-22.8-26.1-19.6-8.6-36-8.6-38.3 12.5-12.1 4.2-18.3 14.7-21.4 27.3-2.8 11.2-3.6 24.7-4.4 39.9-.5 7.7-3.6 18-6.8 29-32.1 22.9-76.7 32.9-114.3 7.2zm257.4-11.5c-.9 16.8-41.2 19.9-63.2 46.5-13.2 15.7-29.4 24.4-43.6 25.5s-26.5-4.8-33.7-19.3c-4.7-11.1-2.4-23.1 1.1-36.3 3.7-14.2 9.2-28.8 9.9-40.6.8-15.2 1.7-28.5 4.2-38.7 2.6-10.3 6.6-17.2 13.7-21.1.3-.2.7-.3 1-.5.8 13.2 7.3 26.6 18.8 29.5 12.6 3.3 30.7-7.5 38.4-16.3 9-.3 15.7-.9 22.6 5.1 9.9 8.5 7.1 30.3 17.1 41.6 10.6 11.6 14 19.5 13.7 24.6zM173.3 148.7c2 1.9 4.7 4.5 8 7.1 6.6 5.2 15.8 10.6 27.3 10.6 11.6 0 22.5-5.9 31.8-10.8 4.9-2.6 10.9-7 14.8-10.4s5.9-6.3 3.1-6.6-2.6 2.6-6 5.1c-4.4 3.2-9.7 7.4-13.9 9.8-7.4 4.2-19.5 10.2-29.9 10.2s-18.7-4.8-24.9-9.7c-3.1-2.5-5.7-5-7.7-6.9-1.5-1.4-1.9-4.6-4.3-4.9-1.4-.1-1.8 3.7 1.7 6.5z"],
    "SquareJs": [448, 512, [], "solid", "M448 96c0-35.3-28.7-64-64-64H64C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V96zM180.9 444.9c-33.7 0-53.2-17.4-63.2-38.5L152 385.7c6.6 11.7 12.6 21.6 27.1 21.6c13.8 0 22.6-5.4 22.6-26.5V237.7h42.1V381.4c0 43.6-25.6 63.5-62.9 63.5zm85.8-43L301 382.1c9 14.7 20.8 25.6 41.5 25.6c17.4 0 28.6-8.7 28.6-20.8c0-14.4-11.4-19.5-30.7-28l-10.5-4.5c-30.4-12.9-50.5-29.2-50.5-63.5c0-31.6 24.1-55.6 61.6-55.6c26.8 0 46 9.3 59.8 33.7L368 290c-7.2-12.9-15-18-27.1-18c-12.3 0-20.1 7.8-20.1 18c0 12.6 7.8 17.7 25.9 25.6l10.5 4.5c35.8 15.3 55.9 31 55.9 66.2c0 37.8-29.8 58.6-69.7 58.6c-39.1 0-64.4-18.6-76.7-43z"],
    "Safari": [512, 512, [], "solid", "M274.69,274.69l-37.38-37.38L166,346ZM256,8C119,8,8,119,8,256S119,504,256,504,504,393,504,256,393,8,256,8ZM411.85,182.79l14.78-6.13A8,8,0,0,1,437.08,181h0a8,8,0,0,1-4.33,10.46L418,197.57a8,8,0,0,1-10.45-4.33h0A8,8,0,0,1,411.85,182.79ZM314.43,94l6.12-14.78A8,8,0,0,1,331,74.92h0a8,8,0,0,1,4.33,10.45l-6.13,14.78a8,8,0,0,1-10.45,4.33h0A8,8,0,0,1,314.43,94ZM256,60h0a8,8,0,0,1,8,8V84a8,8,0,0,1-8,8h0a8,8,0,0,1-8-8V68A8,8,0,0,1,256,60ZM181,74.92a8,8,0,0,1,10.46,4.33L197.57,94a8,8,0,1,1-14.78,6.12l-6.13-14.78A8,8,0,0,1,181,74.92Zm-63.58,42.49h0a8,8,0,0,1,11.31,0L140,128.72A8,8,0,0,1,140,140h0a8,8,0,0,1-11.31,0l-11.31-11.31A8,8,0,0,1,117.41,117.41ZM60,256h0a8,8,0,0,1,8-8H84a8,8,0,0,1,8,8h0a8,8,0,0,1-8,8H68A8,8,0,0,1,60,256Zm40.15,73.21-14.78,6.13A8,8,0,0,1,74.92,331h0a8,8,0,0,1,4.33-10.46L94,314.43a8,8,0,0,1,10.45,4.33h0A8,8,0,0,1,100.15,329.21Zm4.33-136h0A8,8,0,0,1,94,197.57l-14.78-6.12A8,8,0,0,1,74.92,181h0a8,8,0,0,1,10.45-4.33l14.78,6.13A8,8,0,0,1,104.48,193.24ZM197.57,418l-6.12,14.78a8,8,0,0,1-14.79-6.12l6.13-14.78A8,8,0,1,1,197.57,418ZM264,444a8,8,0,0,1-8,8h0a8,8,0,0,1-8-8V428a8,8,0,0,1,8-8h0a8,8,0,0,1,8,8Zm67-6.92h0a8,8,0,0,1-10.46-4.33L314.43,418a8,8,0,0,1,4.33-10.45h0a8,8,0,0,1,10.45,4.33l6.13,14.78A8,8,0,0,1,331,437.08Zm63.58-42.49h0a8,8,0,0,1-11.31,0L372,383.28A8,8,0,0,1,372,372h0a8,8,0,0,1,11.31,0l11.31,11.31A8,8,0,0,1,394.59,394.59ZM286.25,286.25,110.34,401.66,225.75,225.75,401.66,110.34ZM437.08,331h0a8,8,0,0,1-10.45,4.33l-14.78-6.13a8,8,0,0,1-4.33-10.45h0A8,8,0,0,1,418,314.43l14.78,6.12A8,8,0,0,1,437.08,331ZM444,264H428a8,8,0,0,1-8-8h0a8,8,0,0,1,8-8h16a8,8,0,0,1,8,8h0A8,8,0,0,1,444,264Z"],
    "Php": [512, 512, [], "solid", "M170.322 349.808c-2.4-15.66-9-28.38-25.02-34.531c-6.27-2.4-11.7-6.78-17.88-9.54c-7.02-3.15-14.16-6.15-21.57-8.1c-5.61-1.5-10.83 1.02-14.16 5.94c-3.15 4.62-.87 8.97 1.77 12.84c2.97 4.35 6.27 8.49 9.6 12.57c5.52 6.78 11.37 13.29 16.74 20.161c5.13 6.57 9.51 13.86 8.76 22.56c-1.65 19.08-10.29 34.891-24.21 47.76c-1.53 1.38-4.23 2.37-6.21 2.19c-8.88-.96-16.95-4.32-23.46-10.53c-7.47-7.11-6.33-15.48 2.61-20.67c2.13-1.23 4.35-2.37 6.3-3.87c5.46-4.11 7.29-11.13 4.32-17.22c-1.41-2.94-3-6.12-5.34-8.25c-11.43-10.41-22.651-21.151-34.891-30.63C18.01 307.447 2.771 276.968.43 240.067c-2.64-40.981 6.87-79.231 28.5-114.242c8.19-13.29 17.73-25.951 32.37-32.52c9.96-4.47 20.88-6.99 31.531-9.78c29.311-7.71 58.89-13.5 89.401-8.34c26.28 4.41 45.511 17.94 54.331 43.77c5.79 16.89 7.17 34.35 5.37 52.231c-3.54 35.131-29.49 66.541-63.331 75.841c-14.67 4.02-22.68 1.77-31.5-10.44c-6.33-8.79-11.58-18.36-17.25-27.631c-.84-1.38-1.44-2.97-2.16-4.44c-.69-1.47-1.44-2.88-2.16-4.35c2.13 15.24 5.67 29.911 13.98 42.99c4.5 7.11 10.5 12.36 19.29 13.14c32.34 2.91 59.641-7.71 79.021-33.721c21.69-29.101 26.461-62.581 20.19-97.831c-1.23-6.96-3.3-13.77-4.77-20.7c-.99-4.47.78-7.77 5.19-9.33c2.04-.69 4.14-1.26 6.18-1.68c26.461-5.7 53.221-7.59 80.191-4.86c30.601 3.06 59.551 11.46 85.441 28.471c40.531 26.67 65.641 64.621 79.291 110.522c1.98 6.66 2.28 13.95 2.46 20.971c.12 4.68-2.88 5.91-6.45 2.97c-3.93-3.21-7.53-6.87-10.92-10.65c-3.15-3.57-5.67-7.65-8.73-11.4c-2.37-2.94-4.44-2.49-5.58 1.17c-.72 2.22-1.35 4.41-1.98 6.63c-7.08 25.26-18.24 48.3-36.33 67.711c-2.52 2.73-4.77 6.78-5.07 10.38c-.78 9.96-1.35 20.13-.39 30.06c1.98 21.331 5.07 42.57 7.47 63.871c1.35 12.03-2.52 19.11-13.83 23.281c-7.95 2.91-16.47 5.04-24.87 5.64c-13.38.93-26.88.27-40.32.27c-.36-15 .93-29.731-13.17-37.771c2.73-11.13 5.88-21.69 7.77-32.49c1.56-8.97.24-17.79-6.06-25.14c-5.91-6.93-13.32-8.82-20.101-4.86c-20.43 11.91-41.671 11.97-63.301 4.17c-9.93-3.6-16.86-1.56-22.351 7.5c-5.91 9.75-8.4 20.7-7.74 31.771c.84 13.95 3.27 27.75 5.13 41.64c1.02 7.77.15 9.78-7.56 11.76c-17.13 4.35-34.56 4.83-52.081 3.42c-.93-.09-1.86-.48-2.46-.63c-.87-14.55.66-29.671-16.68-37.411c7.68-16.29 6.63-33.18 3.99-50.07l-.06-.15zm-103.561-57.09c2.55-2.4 4.59-6.15 5.31-9.6c1.8-8.64-4.68-20.22-12.18-23.43c-3.99-1.74-7.47-1.11-10.29 2.07c-6.87 7.77-13.65 15.63-20.401 23.521c-1.14 1.35-2.16 2.94-2.97 4.53c-2.7 5.19-1.11 8.97 4.65 10.38c3.48.87 7.08 1.05 10.65 1.56c9.3-.9 18.3-2.46 25.23-9zm.78-86.371c-.03-6.18-5.19-11.34-11.28-11.37c-6.27-.03-11.67 5.58-11.46 11.76c.27 6.21 5.43 11.19 11.61 11.07c6.24-.09 11.22-5.19 11.16-11.43z"],
    "Python": [448, 512, [], "solid", "M439.8 200.5c-7.7-30.9-22.3-54.2-53.4-54.2h-40.1v47.4c0 36.8-31.2 67.8-66.8 67.8H172.7c-29.2 0-53.4 25-53.4 54.3v101.8c0 29 25.2 46 53.4 54.3 33.8 9.9 66.3 11.7 106.8 0 26.9-7.8 53.4-23.5 53.4-54.3v-40.7H226.2v-13.6h160.2c31.1 0 42.6-21.7 53.4-54.2 11.2-33.5 10.7-65.7 0-108.6zM286.2 404c11.1 0 20.1 9.1 20.1 20.3 0 11.3-9 20.4-20.1 20.4-11 0-20.1-9.2-20.1-20.4.1-11.3 9.1-20.3 20.1-20.3zM167.8 248.1h106.8c29.7 0 53.4-24.5 53.4-54.3V91.9c0-29-24.4-50.7-53.4-55.6-35.8-5.9-74.7-5.6-106.8.1-45.2 8-53.4 24.7-53.4 55.6v40.7h106.9v13.6h-147c-31.1 0-58.3 18.7-66.8 54.2-9.8 40.7-10.2 66.1 0 108.6 7.6 31.6 25.7 54.2 56.8 54.2H101v-48.8c0-35.3 30.5-66.4 66.8-66.4zm-6.7-142.6c-11.1 0-20.1-9.1-20.1-20.3.1-11.3 9-20.4 20.1-20.4 11 0 20.1 9.2 20.1 20.4s-9 20.3-20.1 20.3z"],
    "Markdown": [32, 32, [], "solid", "m14 10l-4 3.5L6 10H4v12h4v-6l2 2l2-2v6h4V10zm12 6v-6h-4v6h-4l6 8l6-8z"],
    "Microsoft": [448, 512, [], "solid", "M0 32h214.6v214.6H0V32zm233.4 0H448v214.6H233.4V32zM0 265.4h214.6V480H0V265.4zm233.4 0H448V480H233.4V265.4z"],
    "Npm": [576, 512, [], "solid", "M288 288h-32v-64h32v64zm288-128v192H288v32H160v-32H0V160h576zm-416 32H32v128h64v-96h32v96h32V192zm160 0H192v160h64v-32h64V192zm224 0H352v128h64v-96h32v96h32v-96h32v96h32V192z"],
    "Reddit": [512, 512, [], "solid", "M0 256C0 114.6 114.6 0 256 0S512 114.6 512 256s-114.6 256-256 256L37.1 512c-13.7 0-20.5-16.5-10.9-26.2L75 437C28.7 390.7 0 326.7 0 256zM349.6 153.6c23.6 0 42.7-19.1 42.7-42.7s-19.1-42.7-42.7-42.7c-20.6 0-37.8 14.6-41.8 34c-34.5 3.7-61.4 33-61.4 68.4l0 .2c-37.5 1.6-71.8 12.3-99 29.1c-10.1-7.8-22.8-12.5-36.5-12.5c-33 0-59.8 26.8-59.8 59.8c0 24 14.1 44.6 34.4 54.1c2 69.4 77.6 125.2 170.6 125.2s168.7-55.9 170.6-125.3c20.2-9.6 34.1-30.2 34.1-54c0-33-26.8-59.8-59.8-59.8c-13.7 0-26.3 4.6-36.4 12.4c-27.4-17-62.1-27.7-100-29.1l0-.2c0-25.4 18.9-46.5 43.4-49.9l0 0c4.4 18.8 21.3 32.8 41.5 32.8zM177.1 246.9c16.7 0 29.5 17.6 28.5 39.3s-13.5 29.6-30.3 29.6s-31.4-8.8-30.4-30.5s15.4-38.3 32.1-38.3zm190.1 38.3c1 21.7-13.7 30.5-30.4 30.5s-29.3-7.9-30.3-29.6c-1-21.7 11.8-39.3 28.5-39.3s31.2 16.6 32.1 38.3zm-48.1 56.7c-10.3 24.6-34.6 41.9-63 41.9s-52.7-17.3-63-41.9c-1.2-2.9 .8-6.2 3.9-6.5c18.4-1.9 38.3-2.9 59.1-2.9s40.7 1 59.1 2.9c3.1 .3 5.1 3.6 3.9 6.5z"],
    "Rust": [512, 512, [], "solid", "M508.52,249.75,486.7,236.24c-.17-2-.34-3.93-.55-5.88l18.72-17.5a7.35,7.35,0,0,0-2.44-12.25l-24-9c-.54-1.88-1.08-3.78-1.67-5.64l15-20.83a7.35,7.35,0,0,0-4.79-11.54l-25.42-4.15c-.9-1.73-1.79-3.45-2.73-5.15l10.68-23.42a7.35,7.35,0,0,0-6.95-10.39l-25.82.91q-1.79-2.22-3.61-4.4L439,81.84A7.36,7.36,0,0,0,430.16,73L405,78.93q-2.17-1.83-4.4-3.61l.91-25.82a7.35,7.35,0,0,0-10.39-7L367.7,53.23c-1.7-.94-3.43-1.84-5.15-2.73L358.4,25.08a7.35,7.35,0,0,0-11.54-4.79L326,35.26c-1.86-.59-3.75-1.13-5.64-1.67l-9-24a7.35,7.35,0,0,0-12.25-2.44l-17.5,18.72c-1.95-.21-3.91-.38-5.88-.55L262.25,3.48a7.35,7.35,0,0,0-12.5,0L236.24,25.3c-2,.17-3.93.34-5.88.55L212.86,7.13a7.35,7.35,0,0,0-12.25,2.44l-9,24c-1.89.55-3.79,1.08-5.66,1.68l-20.82-15a7.35,7.35,0,0,0-11.54,4.79l-4.15,25.41c-1.73.9-3.45,1.79-5.16,2.73L120.88,42.55a7.35,7.35,0,0,0-10.39,7l.92,25.81c-1.49,1.19-3,2.39-4.42,3.61L81.84,73A7.36,7.36,0,0,0,73,81.84L78.93,107c-1.23,1.45-2.43,2.93-3.62,4.41l-25.81-.91a7.42,7.42,0,0,0-6.37,3.26,7.35,7.35,0,0,0-.57,7.13l10.66,23.41c-.94,1.7-1.83,3.43-2.73,5.16L25.08,153.6a7.35,7.35,0,0,0-4.79,11.54l15,20.82c-.59,1.87-1.13,3.77-1.68,5.66l-24,9a7.35,7.35,0,0,0-2.44,12.25l18.72,17.5c-.21,1.95-.38,3.91-.55,5.88L3.48,249.75a7.35,7.35,0,0,0,0,12.5L25.3,275.76c.17,2,.34,3.92.55,5.87L7.13,299.13a7.35,7.35,0,0,0,2.44,12.25l24,9c.55,1.89,1.08,3.78,1.68,5.65l-15,20.83a7.35,7.35,0,0,0,4.79,11.54l25.42,4.15c.9,1.72,1.79,3.45,2.73,5.14L42.56,391.12a7.35,7.35,0,0,0,.57,7.13,7.13,7.13,0,0,0,6.37,3.26l25.83-.91q1.77,2.22,3.6,4.4L73,430.16A7.36,7.36,0,0,0,81.84,439L107,433.07q2.18,1.83,4.41,3.61l-.92,25.82a7.35,7.35,0,0,0,10.39,6.95l23.43-10.68c1.69.94,3.42,1.83,5.14,2.73l4.15,25.42a7.34,7.34,0,0,0,11.54,4.78l20.83-15c1.86.6,3.76,1.13,5.65,1.68l9,24a7.36,7.36,0,0,0,12.25,2.44l17.5-18.72c1.95.21,3.92.38,5.88.55l13.51,21.82a7.35,7.35,0,0,0,12.5,0l13.51-21.82c2-.17,3.93-.34,5.88-.56l17.5,18.73a7.36,7.36,0,0,0,12.25-2.44l9-24c1.89-.55,3.78-1.08,5.65-1.68l20.82,15a7.34,7.34,0,0,0,11.54-4.78l4.15-25.42c1.72-.9,3.45-1.79,5.15-2.73l23.42,10.68a7.35,7.35,0,0,0,10.39-6.95l-.91-25.82q2.22-1.79,4.4-3.61L430.16,439a7.36,7.36,0,0,0,8.84-8.84L433.07,405q1.83-2.17,3.61-4.4l25.82.91a7.23,7.23,0,0,0,6.37-3.26,7.35,7.35,0,0,0,.58-7.13L458.77,367.7c.94-1.7,1.83-3.43,2.73-5.15l25.42-4.15a7.35,7.35,0,0,0,4.79-11.54l-15-20.83c.59-1.87,1.13-3.76,1.67-5.65l24-9a7.35,7.35,0,0,0,2.44-12.25l-18.72-17.5c.21-1.95.38-3.91.55-5.87l21.82-13.51a7.35,7.35,0,0,0,0-12.5Zm-151,129.08A13.91,13.91,0,0,0,341,389.51l-7.64,35.67A187.51,187.51,0,0,1,177,424.44l-7.64-35.66a13.87,13.87,0,0,0-16.46-10.68l-31.51,6.76a187.38,187.38,0,0,1-16.26-19.21H258.3c1.72,0,2.89-.29,2.89-1.91V309.55c0-1.57-1.17-1.91-2.89-1.91H213.47l.05-34.35H262c4.41,0,23.66,1.28,29.79,25.87,1.91,7.55,6.17,32.14,9.06,40,2.89,8.82,14.6,26.46,27.1,26.46H407a187.3,187.3,0,0,1-17.34,20.09Zm25.77,34.49A15.24,15.24,0,1,1,368,398.08h.44A15.23,15.23,0,0,1,383.24,413.32Zm-225.62-.68a15.24,15.24,0,1,1-15.25-15.25h.45A15.25,15.25,0,0,1,157.62,412.64ZM69.57,234.15l32.83-14.6a13.88,13.88,0,0,0,7.06-18.33L102.69,186h26.56V305.73H75.65A187.65,187.65,0,0,1,69.57,234.15ZM58.31,198.09a15.24,15.24,0,0,1,15.23-15.25H74a15.24,15.24,0,1,1-15.67,15.24Zm155.16,24.49.05-35.32h63.26c3.28,0,23.07,3.77,23.07,18.62,0,12.29-15.19,16.7-27.68,16.7ZM399,306.71c-9.8,1.13-20.63-4.12-22-10.09-5.78-32.49-15.39-39.4-30.57-51.4,18.86-11.95,38.46-29.64,38.46-53.26,0-25.52-17.49-41.59-29.4-49.48-16.76-11-35.28-13.23-40.27-13.23H116.32A187.49,187.49,0,0,1,221.21,70.06l23.47,24.6a13.82,13.82,0,0,0,19.6.44l26.26-25a187.51,187.51,0,0,1,128.37,91.43l-18,40.57A14,14,0,0,0,408,220.43l34.59,15.33a187.12,187.12,0,0,1,.4,32.54H423.71c-1.91,0-2.69,1.27-2.69,3.13v8.82C421,301,409.31,305.58,399,306.71ZM240,60.21A15.24,15.24,0,0,1,255.21,45h.45A15.24,15.24,0,1,1,240,60.21ZM436.84,214a15.24,15.24,0,1,1,0-30.48h.44a15.24,15.24,0,0,1-.44,30.48Z"],
    "Unity": [16, 16, [], "solid", "M8 6.5L5 5l2-1V2L2 5v5l2-1V6.5L7 8v4.5L4 11l-2 1l6 3l6-3l-2-1l-3 1.5V8l3-1.5V9l2 1V5L9 2v2l2 1Z"],
    "UnrealEngine": [24, 24, [], "regular", "M12 0a12 12 0 1 0 12 12A12 12 0 0 0 12 0m0 23.52A11.52 11.52 0 1 1 23.52 12A11.52 11.52 0 0 1 12 23.52m7.13-9.791c-.206.997-1.126 3.557-4.06 4.942l-1.179-1.325l-1.988 2a7.34 7.34 0 0 1-5.804-2.978a3 3 0 0 0 .65.123c.326.006.678-.114.678-.66v-5.394a.89.89 0 0 0-1.116-.89c-.92.212-1.656 2.509-1.656 2.509a7.3 7.3 0 0 1 2.528-5.597a7.4 7.4 0 0 1 3.73-1.721c-1.006.573-1.57 1.507-1.57 2.29c0 1.262.76 1.109.984.923v7.28a1.2 1.2 0 0 0 .148.256a1.08 1.08 0 0 0 .88.445c.76 0 1.747-.868 1.747-.868V9.172c0-.6-.452-1.324-.905-1.572c0 0 .838-.149 1.484.346a6 6 0 0 1 .387-.425c1.508-1.48 2.929-1.902 4.112-2.112c0 0-2.151 1.69-2.151 3.96c0 1.687.043 5.801.043 5.801c.799.771 1.986-.342 3.059-1.441Z"],
    "UnrealEngine@solid": [24, 24, [], "solid", "M12 23c6.075 0 11-4.925 11-11S18.075 1 12 1S1 5.925 1 12s4.925 11 11 11m-8.442-9.416c.718-2.333 2.53-6.86 7.27-8.584v10.23c.179.18.645.54 1.076.54c.67 0 1.615-.54 1.615-.54V8.77c.555-1.16 3.123-3.232 4.847-3.232c-1.044 1.204-1.532 1.91-2.154 3.231v6.462c.718.18 2.154 0 3.23-1.077c-.87 1.98-3.23 4.308-4.307 4.308l-1.616-1.077L11.904 19c-1.615 0-4.308-1.077-5.385-2.692h1.616v-6.17c-1.96-.268-2.857.973-4.577 3.446"],
    "Ubuntu": [576, 512, [], "solid", "M469.2 75A75.6 75.6 0 1 0 317.9 75a75.6 75.6 0 1 0 151.2 0zM154.2 240.7A75.6 75.6 0 1 0 3 240.7a75.6 75.6 0 1 0 151.2 0zM57 346C75.6 392.9 108 433 150 461.1s91.5 42.6 142 41.7c-14.7-18.6-22.9-41.5-23.2-65.2c-6.8-.9-13.3-2.1-19.5-3.4c-26.8-5.7-51.9-17.3-73.6-34s-39.3-38.1-51.7-62.5c-20.9 9.9-44.5 12.8-67.1 8.2zm395.1 89.8a75.6 75.6 0 1 0 -151.2 0 75.6 75.6 0 1 0 151.2 0zM444 351.6c18.5 14.8 31.6 35.2 37.2 58.2c33.3-41.3 52.6-92.2 54.8-145.2s-12.5-105.4-42.2-149.4c-8.6 21.5-24 39.6-43.8 51.6c15.4 28.6 22.9 60.8 21.9 93.2s-10.7 64-28 91.6zM101.1 135.4c12.4 2.7 24.3 7.5 35.1 14.3c16.6-24.2 38.9-44.1 64.8-58S255.8 70.4 285.2 70c.2-5.9 .9-11.9 2-17.7c3.6-16.7 11.1-32.3 21.8-45.5c-47.7-3.8-95.4 6-137.6 28.5S94.3 91.7 70.8 133.4c2.7-.2 5.3-.3 8-.3c7.5 0 15 .8 22.4 2.3z"],
    "VsCode": [16, 16, [], "solid", "M11.5 11.19V4.8L7.3 7.99M1.17 6.07a.6.6 0 0 1-.01-.81L2 4.48c.14-.13.48-.18.73 0l2.39 1.83l5.55-5.09c.22-.22.61-.32 1.05-.08l2.8 1.34c.25.15.49.38.49.81v9.49c0 .28-.2.58-.42.7l-3.08 1.48c-.22.09-.64 0-.79-.14L5.11 9.69l-2.38 1.83c-.27.18-.6.13-.74 0l-.84-.77c-.22-.23-.2-.61.04-.84l2.1-1.9"],
    "Windows": [448, 512, [], "solid", "M0 93.7l183.6-25.3v177.4H0V93.7zm0 324.6l183.6 25.3V268.4H0v149.9zm203.8 28L448 480V268.4H203.8v177.9zm0-380.6v180.1H448V32L203.8 65.7z"],
    "Whatsapp": [448, 512, [], "regular", "M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"],
    "X-Twitter": [512, 512, [], "regular", "M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z"],
    // Internals Override
    "Keyboard": [576, 512, [], "regular", "M64 112c-8.8 0-16 7.2-16 16l0 256c0 8.8 7.2 16 16 16l448 0c8.8 0 16-7.2 16-16l0-256c0-8.8-7.2-16-16-16L64 112zM0 128C0 92.7 28.7 64 64 64l448 0c35.3 0 64 28.7 64 64l0 256c0 35.3-28.7 64-64 64L64 448c-35.3 0-64-28.7-64-64L0 128zM176 320l224 0c8.8 0 16 7.2 16 16l0 16c0 8.8-7.2 16-16 16l-224 0c-8.8 0-16-7.2-16-16l0-16c0-8.8 7.2-16 16-16zm-72-72c0-8.8 7.2-16 16-16l16 0c8.8 0 16 7.2 16 16l0 16c0 8.8-7.2 16-16 16l-16 0c-8.8 0-16-7.2-16-16l0-16zm16-96l16 0c8.8 0 16 7.2 16 16l0 16c0 8.8-7.2 16-16 16l-16 0c-8.8 0-16-7.2-16-16l0-16c0-8.8 7.2-16 16-16zm64 96c0-8.8 7.2-16 16-16l16 0c8.8 0 16 7.2 16 16l0 16c0 8.8-7.2 16-16 16l-16 0c-8.8 0-16-7.2-16-16l0-16zm16-96l16 0c8.8 0 16 7.2 16 16l0 16c0 8.8-7.2 16-16 16l-16 0c-8.8 0-16-7.2-16-16l0-16c0-8.8 7.2-16 16-16zm64 96c0-8.8 7.2-16 16-16l16 0c8.8 0 16 7.2 16 16l0 16c0 8.8-7.2 16-16 16l-16 0c-8.8 0-16-7.2-16-16l0-16zm16-96l16 0c8.8 0 16 7.2 16 16l0 16c0 8.8-7.2 16-16 16l-16 0c-8.8 0-16-7.2-16-16l0-16c0-8.8 7.2-16 16-16zm64 96c0-8.8 7.2-16 16-16l16 0c8.8 0 16 7.2 16 16l0 16c0 8.8-7.2 16-16 16l-16 0c-8.8 0-16-7.2-16-16l0-16zm16-96l16 0c8.8 0 16 7.2 16 16l0 16c0 8.8-7.2 16-16 16l-16 0c-8.8 0-16-7.2-16-16l0-16c0-8.8 7.2-16 16-16zm64 96c0-8.8 7.2-16 16-16l16 0c8.8 0 16 7.2 16 16l0 16c0 8.8-7.2 16-16 16l-16 0c-8.8 0-16-7.2-16-16l0-16zm16-96l16 0c8.8 0 16 7.2 16 16l0 16c0 8.8-7.2 16-16 16l-16 0c-8.8 0-16-7.2-16-16l0-16c0-8.8 7.2-16 16-16z"],
    "IdCard": [576, 512, [], "regular", "M528 160l0 256c0 8.8-7.2 16-16 16l-192 0c0-44.2-35.8-80-80-80l-64 0c-44.2 0-80 35.8-80 80l-32 0c-8.8 0-16-7.2-16-16l0-256 480 0zM64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l448 0c35.3 0 64-28.7 64-64l0-320c0-35.3-28.7-64-64-64L64 32zM272 256a64 64 0 1 0 -128 0 64 64 0 1 0 128 0zm104-48c-13.3 0-24 10.7-24 24s10.7 24 24 24l80 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-80 0zm0 96c-13.3 0-24 10.7-24 24s10.7 24 24 24l80 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-80 0z"],
    "BookUser": [576, 512, [], "regular", "M512 80c8.8 0 16 7.2 16 16l0 320c0 8.8-7.2 16-16 16L64 432c-8.8 0-16-7.2-16-16L48 96c0-8.8 7.2-16 16-16l448 0zM64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l448 0c35.3 0 64-28.7 64-64l0-320c0-35.3-28.7-64-64-64L64 32zM208 256a64 64 0 1 0 0-128 64 64 0 1 0 0 128zm-32 32c-44.2 0-80 35.8-80 80c0 8.8 7.2 16 16 16l192 0c8.8 0 16-7.2 16-16c0-44.2-35.8-80-80-80l-64 0zM376 144c-13.3 0-24 10.7-24 24s10.7 24 24 24l80 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-80 0zm0 96c-13.3 0-24 10.7-24 24s10.7 24 24 24l80 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-80 0z"],
    "Copy": [448, 512, [], "regular", "M384 336l-192 0c-8.8 0-16-7.2-16-16l0-256c0-8.8 7.2-16 16-16l140.1 0L400 115.9 400 320c0 8.8-7.2 16-16 16zM192 384l192 0c35.3 0 64-28.7 64-64l0-204.1c0-12.7-5.1-24.9-14.1-33.9L366.1 14.1c-9-9-21.2-14.1-33.9-14.1L192 0c-35.3 0-64 28.7-64 64l0 256c0 35.3 28.7 64 64 64zM64 128c-35.3 0-64 28.7-64 64L0 448c0 35.3 28.7 64 64 64l192 0c35.3 0 64-28.7 64-64l0-32-48 0 0 32c0 8.8-7.2 16-16 16L64 464c-8.8 0-16-7.2-16-16l0-256c0-8.8 7.2-16 16-16l32 0 0-48-32 0z"],
    "Eye": [576, 512, [], "regular", "M288 80c-65.2 0-118.8 29.6-159.9 67.7C89.6 183.5 63 226 49.4 256c13.6 30 40.2 72.5 78.6 108.3C169.2 402.4 222.8 432 288 432s118.8-29.6 159.9-67.7C486.4 328.5 513 286 526.6 256c-13.6-30-40.2-72.5-78.6-108.3C406.8 109.6 353.2 80 288 80zM95.4 112.6C142.5 68.8 207.2 32 288 32s145.5 36.8 192.6 80.6c46.8 43.5 78.1 95.4 93 131.1c3.3 7.9 3.3 16.7 0 24.6c-14.9 35.7-46.2 87.7-93 131.1C433.5 443.2 368.8 480 288 480s-145.5-36.8-192.6-80.6C48.6 356 17.3 304 2.5 268.3c-3.3-7.9-3.3-16.7 0-24.6C17.3 208 48.6 156 95.4 112.6zM288 336c44.2 0 80-35.8 80-80s-35.8-80-80-80c-.7 0-1.3 0-2 0c1.3 5.1 2 10.5 2 16c0 35.3-28.7 64-64 64c-5.5 0-10.9-.7-16-2c0 .7 0 1.3 0 2c0 44.2 35.8 80 80 80zm0-208a128 128 0 1 1 0 256 128 128 0 1 1 0-256z"],
    "EyeOff": [640, 512, [], "regular", "M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7L525.6 386.7c39.6-40.6 66.4-86.1 79.9-118.4c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C465.5 68.8 400.8 32 320 32c-68.2 0-125 26.3-169.3 60.8L38.8 5.1zm151 118.3C226 97.7 269.5 80 320 80c65.2 0 118.8 29.6 159.9 67.7C518.4 183.5 545 226 558.6 256c-12.6 28-36.6 66.8-70.9 100.9l-53.8-42.2c9.1-17.6 14.2-37.5 14.2-58.7c0-70.7-57.3-128-128-128c-32.2 0-61.7 11.9-84.2 31.5l-46.1-36.1zM394.9 284.2l-81.5-63.9c4.2-8.5 6.6-18.2 6.6-28.3c0-5.5-.7-10.9-2-16c.7 0 1.3 0 2 0c44.2 0 80 35.8 80 80c0 9.9-1.8 19.4-5.1 28.2zm9.4 130.3C378.8 425.4 350.7 432 320 432c-65.2 0-118.8-29.6-159.9-67.7C121.6 328.5 95 286 81.4 256c8.3-18.4 21.5-41.5 39.4-64.8L83.1 161.5C60.3 191.2 44 220.8 34.5 243.7c-3.3 7.9-3.3 16.7 0 24.6c14.9 35.7 46.2 87.7 93 131.1C174.5 443.2 239.2 480 320 480c47.8 0 89.9-12.9 126.2-32.5l-41.9-33zM192 256c0 70.7 57.3 128 128 128c13.3 0 26.1-2 38.2-5.8L302 334c-23.5-5.4-43.1-21.2-53.7-42.3l-56.1-44.2c-.2 2.8-.3 5.6-.3 8.5z"],
    "StickyNote": [448, 512, [], "regular", "M64 80c-8.8 0-16 7.2-16 16l0 320c0 8.8 7.2 16 16 16l224 0 0-80c0-17.7 14.3-32 32-32l80 0 0-224c0-8.8-7.2-16-16-16L64 80zM288 480L64 480c-35.3 0-64-28.7-64-64L0 96C0 60.7 28.7 32 64 32l320 0c35.3 0 64 28.7 64 64l0 224 0 5.5c0 17-6.7 33.3-18.7 45.3l-90.5 90.5c-12 12-28.3 18.7-45.3 18.7l-5.5 0z"],
    "CreditCard": [576, 512, [], "regular", "M512 80c8.8 0 16 7.2 16 16l0 32L48 128l0-32c0-8.8 7.2-16 16-16l448 0zm16 144l0 192c0 8.8-7.2 16-16 16L64 432c-8.8 0-16-7.2-16-16l0-192 480 0zM64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l448 0c35.3 0 64-28.7 64-64l0-320c0-35.3-28.7-64-64-64L64 32zm56 304c-13.3 0-24 10.7-24 24s10.7 24 24 24l48 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-48 0zm128 0c-13.3 0-24 10.7-24 24s10.7 24 24 24l112 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-112 0z"],
    "Hourglass": [384, 512, [], "regular", "M24 0C10.7 0 0 10.7 0 24S10.7 48 24 48l8 0 0 19c0 40.3 16 79 44.5 107.5L158.1 256 76.5 337.5C48 366 32 404.7 32 445l0 19-8 0c-13.3 0-24 10.7-24 24s10.7 24 24 24l336 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-8 0 0-19c0-40.3-16-79-44.5-107.5L225.9 256l81.5-81.5C336 146 352 107.3 352 67l0-19 8 0c13.3 0 24-10.7 24-24s-10.7-24-24-24L24 0zM192 289.9l81.5 81.5C293 391 304 417.4 304 445l0 19L80 464l0-19c0-27.6 11-54 30.5-73.5L192 289.9zm0-67.9l-81.5-81.5C91 121 80 94.6 80 67l0-19 224 0 0 19c0 27.6-11 54-30.5 73.5L192 222.1z"],
    // Solid Variants
    "Bell": [448, 512, [], "solid", "M224 0c-17.7 0-32 14.3-32 32l0 19.2C119 66 64 130.6 64 208l0 18.8c0 47-17.3 92.4-48.5 127.6l-7.4 8.3c-8.4 9.4-10.4 22.9-5.3 34.4S19.4 416 32 416l384 0c12.6 0 24-7.4 29.2-18.9s3.1-25-5.3-34.4l-7.4-8.3C401.3 319.2 384 273.9 384 226.8l0-18.8c0-77.4-55-142-128-156.8L256 32c0-17.7-14.3-32-32-32zm45.3 493.3c12-12 18.7-28.3 18.7-45.3l-64 0-64 0c0 17 6.7 33.3 18.7 45.3s28.3 18.7 45.3 18.7s33.3-6.7 45.3-18.7z"],
    "BellOff": [640, 512, [], "solid", "M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7l-90.2-70.7c.2-.4 .4-.9 .6-1.3c5.2-11.5 3.1-25-5.3-34.4l-7.4-8.3C497.3 319.2 480 273.9 480 226.8l0-18.8c0-77.4-55-142-128-156.8L352 32c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 19.2c-42.6 8.6-79 34.2-102 69.3L38.8 5.1zM406.2 416L160 222.1l0 4.8c0 47-17.3 92.4-48.5 127.6l-7.4 8.3c-8.4 9.4-10.4 22.9-5.3 34.4S115.4 416 128 416l278.2 0zm-40.9 77.3c12-12 18.7-28.3 18.7-45.3l-64 0-64 0c0 17 6.7 33.3 18.7 45.3s28.3 18.7 45.3 18.7s33.3-6.7 45.3-18.7z"],
    "Compass": [512, 512, [], "solid", "M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm50.7-186.9L162.4 380.6c-19.4 7.5-38.5-11.6-31-31l55.5-144.3c3.3-8.5 9.9-15.1 18.4-18.4l144.3-55.5c19.4-7.5 38.5 11.6 31 31L325.1 306.7c-3.2 8.5-9.9 15.1-18.4 18.4zM288 256a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z"],
    "File": [384, 512, [], "solid", "M0 64C0 28.7 28.7 0 64 0L224 0l0 128c0 17.7 14.3 32 32 32l128 0 0 288c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zm384 64l-128 0L256 0 384 128z"],
    "MessageCircle": [512, 512, [], "solid", "M512 240c0 114.9-114.6 208-256 208c-37.1 0-72.3-6.4-104.1-17.9c-11.9 8.7-31.3 20.6-54.3 30.6C73.6 471.1 44.7 480 16 480c-6.5 0-12.3-3.9-14.8-9.9c-2.5-6-1.1-12.8 3.4-17.4c0 0 0 0 0 0s0 0 0 0s0 0 0 0c0 0 0 0 0 0l.3-.3c.3-.3 .7-.7 1.3-1.4c1.1-1.2 2.8-3.1 4.9-5.7c4.1-5 9.6-12.4 15.2-21.6c10-16.6 19.5-38.4 21.4-62.9C17.7 326.8 0 285.1 0 240C0 125.1 114.6 32 256 32s256 93.1 256 208z"],
    "Inbox": [512, 512, [], "solid", "M121 32C91.6 32 66 52 58.9 80.5L1.9 308.4C.6 313.5 0 318.7 0 323.9L0 416c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-92.1c0-5.2-.6-10.4-1.9-15.5l-57-227.9C446 52 420.4 32 391 32L121 32zm0 64l270 0 48 192-51.2 0c-12.1 0-23.2 6.8-28.6 17.7l-14.3 28.6c-5.4 10.8-16.5 17.7-28.6 17.7l-120.4 0c-12.1 0-23.2-6.8-28.6-17.7l-14.3-28.6c-5.4-10.8-16.5-17.7-28.6-17.7L73 288 121 96z"],
    "Mail": [512, 512, [], "solid", "M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4c0-26.5-21.5-48-48-48L48 64zM0 176L0 384c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-208L294.4 339.2c-22.8 17.1-54 17.1-76.8 0L0 176z"],
    "MailOpen": [512, 512, [], "solid", "M64 208.1L256 65.9 448 208.1l0 47.4L289.5 373c-9.7 7.2-21.4 11-33.5 11s-23.8-3.9-33.5-11L64 255.5l0-47.4zM256 0c-12.1 0-23.8 3.9-33.5 11L25.9 156.7C9.6 168.8 0 187.8 0 208.1L0 448c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-239.9c0-20.3-9.6-39.4-25.9-51.4L289.5 11C279.8 3.9 268.1 0 256 0z"],
    "Mic": [384, 512, [], "solid", "M192 0C139 0 96 43 96 96l0 160c0 53 43 96 96 96s96-43 96-96l0-160c0-53-43-96-96-96zM64 216c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 40c0 89.1 66.2 162.7 152 174.4l0 33.6-48 0c-13.3 0-24 10.7-24 24s10.7 24 24 24l72 0 72 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-48 0 0-33.6c85.8-11.7 152-85.3 152-174.4l0-40c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 40c0 70.7-57.3 128-128 128s-128-57.3-128-128l0-40z"],
    "MicOff": [640, 512, [], "solid", "M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7L472.1 344.7c15.2-26 23.9-56.3 23.9-88.7l0-40c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 40c0 21.2-5.1 41.1-14.2 58.7L416 300.8 416 96c0-53-43-96-96-96s-96 43-96 96l0 54.3L38.8 5.1zM344 430.4c20.4-2.8 39.7-9.1 57.3-18.2l-43.1-33.9C346.1 382 333.3 384 320 384c-70.7 0-128-57.3-128-128l0-8.7L144.7 210c-.5 1.9-.7 3.9-.7 6l0 40c0 89.1 66.2 162.7 152 174.4l0 33.6-48 0c-13.3 0-24 10.7-24 24s10.7 24 24 24l72 0 72 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-48 0 0-33.6z"],
    "Link": [640, 512, ["Chain"], "solid", "M579.8 267.7c56.5-56.5 56.5-148 0-204.5c-50-50-128.8-56.5-186.3-15.4l-1.6 1.1c-14.4 10.3-17.7 30.3-7.4 44.6s30.3 17.7 44.6 7.4l1.6-1.1c32.1-22.9 76-19.3 103.8 8.6c31.5 31.5 31.5 82.5 0 114L422.3 334.8c-31.5 31.5-82.5 31.5-114 0c-27.9-27.9-31.5-71.8-8.6-103.8l1.1-1.6c10.3-14.4 6.9-34.4-7.4-44.6s-34.4-6.9-44.6 7.4l-1.1 1.6C206.5 251.2 213 330 263 380c56.5 56.5 148 56.5 204.5 0L579.8 267.7zM60.2 244.3c-56.5 56.5-56.5 148 0 204.5c50 50 128.8 56.5 186.3 15.4l1.6-1.1c14.4-10.3 17.7-30.3 7.4-44.6s-30.3-17.7-44.6-7.4l-1.6 1.1c-32.1 22.9-76 19.3-103.8-8.6C74 372 74 321 105.5 289.5L217.7 177.2c31.5-31.5 82.5-31.5 114 0c27.9 27.9 31.5 71.8 8.6 103.9l-1.1 1.6c-10.3 14.4-6.9 34.4 7.4 44.6s34.4 6.9 44.6-7.4l1.1-1.6C433.5 260.8 427 182 377 132c-56.5-56.5-148-56.5-204.5 0L60.2 244.3z"],
    "House": [576, 512, [], "solid", "M575.8 255.5c0 18-15 32.1-32 32.1l-32 0 .7 160.2c0 2.7-.2 5.4-.5 8.1l0 16.2c0 22.1-17.9 40-40 40l-16 0c-1.1 0-2.2 0-3.3-.1c-1.4 .1-2.8 .1-4.2 .1L416 512l-24 0c-22.1 0-40-17.9-40-40l0-24 0-64c0-17.7-14.3-32-32-32l-64 0c-17.7 0-32 14.3-32 32l0 64 0 24c0 22.1-17.9 40-40 40l-24 0-31.9 0c-1.5 0-3-.1-4.5-.2c-1.2 .1-2.4 .2-3.6 .2l-16 0c-22.1 0-40-17.9-40-40l0-112c0-.9 0-1.9 .1-2.8l0-69.7-32 0c-18 0-32-14-32-32.1c0-9 3-17 10-24L266.4 8c7-7 15-8 22-8s15 2 21 7L564.8 231.5c8 7 12 15 11 24z"],
    "Gamepad": [640, 512, [], "solid", "M192 64C86 64 0 150 0 256S86 448 192 448l256 0c106 0 192-86 192-192s-86-192-192-192L192 64zM496 168a40 40 0 1 1 0 80 40 40 0 1 1 0-80zM392 304a40 40 0 1 1 80 0 40 40 0 1 1 -80 0zM168 200c0-13.3 10.7-24 24-24s24 10.7 24 24l0 32 32 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-32 0 0 32c0 13.3-10.7 24-24 24s-24-10.7-24-24l0-32-32 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l32 0 0-32z"],
    "Camera": [512, 512, [], "solid", "M149.1 64.8L138.7 96 64 96C28.7 96 0 124.7 0 160L0 416c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-256c0-35.3-28.7-64-64-64l-74.7 0L362.9 64.8C356.4 45.2 338.1 32 317.4 32L194.6 32c-20.7 0-39 13.2-45.5 32.8zM256 192a96 96 0 1 1 0 192 96 96 0 1 1 0-192z"],
    "Printer": [512, 512, [], "solid", "M128 0C92.7 0 64 28.7 64 64l0 96 64 0 0-96 226.7 0L384 93.3l0 66.7 64 0 0-66.7c0-17-6.7-33.3-18.7-45.3L400 18.7C388 6.7 371.7 0 354.7 0L128 0zM384 352l0 32 0 64-256 0 0-64 0-16 0-16 256 0zm64 32l32 0c17.7 0 32-14.3 32-32l0-96c0-35.3-28.7-64-64-64L64 192c-35.3 0-64 28.7-64 64l0 96c0 17.7 14.3 32 32 32l32 0 0 64c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-64zM432 248a24 24 0 1 1 0 48 24 24 0 1 1 0-48z"],
    "Server": [512, 512, [], "solid", "M64 32C28.7 32 0 60.7 0 96l0 64c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-64c0-35.3-28.7-64-64-64L64 32zm280 72a24 24 0 1 1 0 48 24 24 0 1 1 0-48zm48 24a24 24 0 1 1 48 0 24 24 0 1 1 -48 0zM64 288c-35.3 0-64 28.7-64 64l0 64c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-64c0-35.3-28.7-64-64-64L64 288zm280 72a24 24 0 1 1 0 48 24 24 0 1 1 0-48zm56 24a24 24 0 1 1 48 0 24 24 0 1 1 -48 0z"],
    "Calendar": [448, 512, [], "solid", "M96 32l0 32L48 64C21.5 64 0 85.5 0 112l0 48 448 0 0-48c0-26.5-21.5-48-48-48l-48 0 0-32c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 32L160 64l0-32c0-17.7-14.3-32-32-32S96 14.3 96 32zM448 192L0 192 0 464c0 26.5 21.5 48 48 48l352 0c26.5 0 48-21.5 48-48l0-272z"],
    "Pipette": [512, 512, [], "solid", "M341.6 29.2L240.1 130.8l-9.4-9.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-9.4-9.4L482.8 170.4c39-39 39-102.2 0-141.1s-102.2-39-141.1 0zM55.4 323.3c-15 15-23.4 35.4-23.4 56.6l0 42.4L5.4 462.2c-8.5 12.7-6.8 29.6 4 40.4s27.7 12.5 40.4 4L89.7 480l42.4 0c21.2 0 41.6-8.4 56.6-23.4L309.4 335.9l-45.3-45.3L143.4 411.3c-3 3-7.1 4.7-11.3 4.7L96 416l0-36.1c0-4.2 1.7-8.3 4.7-11.3L221.4 247.9l-45.3-45.3L55.4 323.3z"],
    "Scroll": [576, 512, [], "solid", "M0 80l0 48c0 17.7 14.3 32 32 32l16 0 48 0 0-80c0-26.5-21.5-48-48-48S0 53.5 0 80zM112 32c10 13.4 16 30 16 48l0 304c0 35.3 28.7 64 64 64s64-28.7 64-64l0-5.3c0-32.4 26.3-58.7 58.7-58.7L480 320l0-192c0-53-43-96-96-96L112 32zM464 480c61.9 0 112-50.1 112-112c0-8.8-7.2-16-16-16l-245.3 0c-14.7 0-26.7 11.9-26.7 26.7l0 5.3c0 53-43 96-96 96l176 0 96 0z"],
    "Smartphone": [384, 512, [], "solid", "M16 64C16 28.7 44.7 0 80 0L304 0c35.3 0 64 28.7 64 64l0 384c0 35.3-28.7 64-64 64L80 512c-35.3 0-64-28.7-64-64L16 64zM144 448c0 8.8 7.2 16 16 16l64 0c8.8 0 16-7.2 16-16s-7.2-16-16-16l-64 0c-8.8 0-16 7.2-16 16zM304 64L80 64l0 320 224 0 0-320z"],
    "Settings": [512, 512, [], "solid", "M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z"],
    "Map": [576, 512, [], "solid", "M384 476.1L192 421.2l0-385.3L384 90.8l0 385.3zm32-1.2l0-386.5L543.1 37.5c15.8-6.3 32.9 5.3 32.9 22.3l0 334.8c0 9.8-6 18.6-15.1 22.3L416 474.8zM15.1 95.1L160 37.2l0 386.5L32.9 474.5C17.1 480.8 0 469.2 0 452.2L0 117.4c0-9.8 6-18.6 15.1-22.3z"],
    "Folder": [512, 512, [], "solid", "M64 480H448c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H288c-10.1 0-19.6-4.7-25.6-12.8L243.2 57.6C231.1 41.5 212.1 32 192 32H64C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64z"],
    "FolderOpen": [576, 512, [], "solid", "M384 480l48 0c11.4 0 21.9-6 27.6-15.9l112-192c5.8-9.9 5.8-22.1 .1-32.1S555.5 224 544 224l-400 0c-11.4 0-21.9 6-27.6 15.9L48 357.1 48 96c0-8.8 7.2-16 16-16l117.5 0c4.2 0 8.3 1.7 11.3 4.7l26.5 26.5c21 21 49.5 32.8 79.2 32.8L416 144c8.8 0 16 7.2 16 16l0 32 48 0 0-32c0-35.3-28.7-64-64-64L298.5 96c-17 0-33.3-6.7-45.3-18.7L226.7 50.7c-12-12-28.3-18.7-45.3-18.7L64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l23.7 0L384 480z"],
    "FolderClosed": [512, 512, [], "solid", "M448 480L64 480c-35.3 0-64-28.7-64-64L0 192l512 0 0 224c0 35.3-28.7 64-64 64zm64-320L0 160 0 96C0 60.7 28.7 32 64 32l128 0c20.1 0 39.1 9.5 51.2 25.6l19.2 25.6c6 8.1 15.5 12.8 25.6 12.8l160 0c35.3 0 64 28.7 64 64z"],
    "Function": [384, 512, [], "solid", "M314.7 32c-38.8 0-73.7 23.3-88.6 59.1L170.7 224 64 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l80 0L98.9 396.3c-5 11.9-16.6 19.7-29.5 19.7L32 416c-17.7 0-32 14.3-32 32s14.3 32 32 32l37.3 0c38.8 0 73.7-23.3 88.6-59.1L213.3 288 320 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-80 0 45.1-108.3c5-11.9 16.6-19.7 29.5-19.7L352 96c17.7 0 32-14.3 32-32s-14.3-32-32-32l-37.3 0z"],
    "Stop": [384, 512, [], "solid", "M0 128C0 92.7 28.7 64 64 64H320c35.3 0 64 28.7 64 64V384c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V128z"],
    "Image": [512, 512, [], "solid", "M448 80c8.8 0 16 7.2 16 16l0 319.8-5-6.5-136-176c-4.5-5.9-11.6-9.3-19-9.3s-14.4 3.4-19 9.3L202 340.7l-30.5-42.7C167 291.7 159.8 288 152 288s-15 3.7-19.5 10.1l-80 112L48 416.3l0-.3L48 96c0-8.8 7.2-16 16-16l384 0zM64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-320c0-35.3-28.7-64-64-64L64 32zm80 192a48 48 0 1 0 0-96 48 48 0 1 0 0 96z"],
    "Images": [576, 512, [], "solid", "M160 80l352 0c8.8 0 16 7.2 16 16l0 224c0 8.8-7.2 16-16 16l-21.2 0L388.1 178.9c-4.4-6.8-12-10.9-20.1-10.9s-15.7 4.1-20.1 10.9l-52.2 79.8-12.4-16.9c-4.5-6.2-11.7-9.8-19.4-9.8s-14.8 3.6-19.4 9.8L175.6 336 160 336c-8.8 0-16-7.2-16-16l0-224c0-8.8 7.2-16 16-16zM96 96l0 224c0 35.3 28.7 64 64 64l352 0c35.3 0 64-28.7 64-64l0-224c0-35.3-28.7-64-64-64L160 32c-35.3 0-64 28.7-64 64zM48 120c0-13.3-10.7-24-24-24S0 106.7 0 120L0 344c0 75.1 60.9 136 136 136l320 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-320 0c-48.6 0-88-39.4-88-88l0-224zm208 24a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z"],
    "Info": [512, 512, [], "solid", "M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336l24 0 0-64-24 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l48 0c13.3 0 24 10.7 24 24l0 88 8 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-80 0c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-208a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"],
    "Bone": [576, 512, [], "solid", "M153.7 144.8c6.9 16.3 20.6 31.2 38.3 31.2l192 0c17.7 0 31.4-14.9 38.3-31.2C434.4 116.1 462.9 96 496 96c44.2 0 80 35.8 80 80c0 30.4-17 56.9-42 70.4c-3.6 1.9-6 5.5-6 9.6s2.4 7.7 6 9.6c25 13.5 42 40 42 70.4c0 44.2-35.8 80-80 80c-33.1 0-61.6-20.1-73.7-48.8C415.4 350.9 401.7 336 384 336l-192 0c-17.7 0-31.4 14.9-38.3 31.2C141.6 395.9 113.1 416 80 416c-44.2 0-80-35.8-80-80c0-30.4 17-56.9 42-70.4c3.6-1.9 6-5.5 6-9.6s-2.4-7.7-6-9.6C17 232.9 0 206.4 0 176c0-44.2 35.8-80 80-80c33.1 0 61.6 20.1 73.7 48.8z"],
    "Puzzle": [512, 512, [], "solid", "M192 104.8c0-9.2-5.8-17.3-13.2-22.8C167.2 73.3 160 61.3 160 48c0-26.5 28.7-48 64-48s64 21.5 64 48c0 13.3-7.2 25.3-18.8 34c-7.4 5.5-13.2 13.6-13.2 22.8c0 12.8 10.4 23.2 23.2 23.2l56.8 0c26.5 0 48 21.5 48 48l0 56.8c0 12.8 10.4 23.2 23.2 23.2c9.2 0 17.3-5.8 22.8-13.2c8.7-11.6 20.7-18.8 34-18.8c26.5 0 48 28.7 48 64s-21.5 64-48 64c-13.3 0-25.3-7.2-34-18.8c-5.5-7.4-13.6-13.2-22.8-13.2c-12.8 0-23.2 10.4-23.2 23.2L384 464c0 26.5-21.5 48-48 48l-56.8 0c-12.8 0-23.2-10.4-23.2-23.2c0-9.2 5.8-17.3 13.2-22.8c11.6-8.7 18.8-20.7 18.8-34c0-26.5-28.7-48-64-48s-64 21.5-64 48c0 13.3 7.2 25.3 18.8 34c7.4 5.5 13.2 13.6 13.2 22.8c0 12.8-10.4 23.2-23.2 23.2L48 512c-26.5 0-48-21.5-48-48L0 343.2C0 330.4 10.4 320 23.2 320c9.2 0 17.3 5.8 22.8 13.2C54.7 344.8 66.7 352 80 352c26.5 0 48-28.7 48-64s-21.5-64-48-64c-13.3 0-25.3 7.2-34 18.8C40.5 250.2 32.4 256 23.2 256C10.4 256 0 245.6 0 232.8L0 176c0-26.5 21.5-48 48-48l120.8 0c12.8 0 23.2-10.4 23.2-23.2z"],
    "Lock": [448, 512, [], "solid", "M144 144l0 48 160 0 0-48c0-44.2-35.8-80-80-80s-80 35.8-80 80zM80 192l0-48C80 64.5 144.5 0 224 0s144 64.5 144 144l0 48 16 0c35.3 0 64 28.7 64 64l0 192c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 256c0-35.3 28.7-64 64-64l16 0z"],
    "LockOpen": [576, 512, [], "solid", "M352 144c0-44.2 35.8-80 80-80s80 35.8 80 80l0 48c0 17.7 14.3 32 32 32s32-14.3 32-32l0-48C576 64.5 511.5 0 432 0S288 64.5 288 144l0 48L64 192c-35.3 0-64 28.7-64 64L0 448c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-192c0-35.3-28.7-64-64-64l-32 0 0-48z"],
    "Shuffle": [512, 512, [], "solid", "M403.8 34.4c12-5 25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6l0-32-32 0c-10.1 0-19.6 4.7-25.6 12.8L284 229.3 244 176l31.2-41.6C293.3 110.2 321.8 96 352 96l32 0 0-32c0-12.9 7.8-24.6 19.8-29.6zM164 282.7L204 336l-31.2 41.6C154.7 401.8 126.2 416 96 416l-64 0c-17.7 0-32-14.3-32-32s14.3-32 32-32l64 0c10.1 0 19.6-4.7 25.6-12.8L164 282.7zm274.6 188c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6l0-32-32 0c-30.2 0-58.7-14.2-76.8-38.4L121.6 172.8c-6-8.1-15.5-12.8-25.6-12.8l-64 0c-17.7 0-32-14.3-32-32s14.3-32 32-32l64 0c30.2 0 58.7 14.2 76.8 38.4L326.4 339.2c6 8.1 15.5 12.8 25.6 12.8l32 0 0-32c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64z"],
    "Play": [384, 512, [], "solid", "M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80L0 432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"],
    "Pause": [320, 512, [], "solid", "M48 64C21.5 64 0 85.5 0 112L0 400c0 26.5 21.5 48 48 48l32 0c26.5 0 48-21.5 48-48l0-288c0-26.5-21.5-48-48-48L48 64zm192 0c-26.5 0-48 21.5-48 48l0 288c0 26.5 21.5 48 48 48l32 0c26.5 0 48-21.5 48-48l0-288c0-26.5-21.5-48-48-48l-32 0z"],
    "LogIn": [512, 512, [], "solid", "M352 96l64 0c17.7 0 32 14.3 32 32l0 256c0 17.7-14.3 32-32 32l-64 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l64 0c53 0 96-43 96-96l0-256c0-53-43-96-96-96l-64 0c-17.7 0-32 14.3-32 32s14.3 32 32 32zm-9.4 182.6c12.5-12.5 12.5-32.8 0-45.3l-128-128c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L242.7 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l210.7 0-73.4 73.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l128-128z"],
    "LogOut": [512, 512, [], "solid", "M502.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-128-128c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L402.7 224 192 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l210.7 0-73.4 73.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l128-128zM160 96c17.7 0 32-14.3 32-32s-14.3-32-32-32L96 32C43 32 0 75 0 128L0 384c0 53 43 96 96 96l64 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-64 0c-17.7 0-32-14.3-32-32l0-256c0-17.7 14.3-32 32-32l64 0z"],
    "MousePointer": [320, 512, [], "solid", "M0 55.2L0 426c0 12.2 9.9 22 22 22c6.3 0 12.4-2.7 16.6-7.5L121.2 346l58.1 116.3c7.9 15.8 27.1 22.2 42.9 14.3s22.2-27.1 14.3-42.9L179.8 320l118.1 0c12.2 0 22.1-9.9 22.1-22.1c0-6.3-2.7-12.3-7.4-16.5L38.6 37.9C34.3 34.1 28.9 32 23.2 32C10.4 32 0 42.4 0 55.2z"],
    "User": [512, 512, [], "solid", "M256 288A144 144 0 1 0 256 0a144 144 0 1 0 0 288zm-94.7 32C72.2 320 0 392.2 0 481.3c0 17 13.8 30.7 30.7 30.7l450.6 0c17 0 30.7-13.8 30.7-30.7C512 392.2 439.8 320 350.7 320l-189.4 0z"],
    "HardDriveDownload": [512, 512, [], "solid", "M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 242.7-73.4-73.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l128 128c12.5 12.5 32.8 12.5 45.3 0l128-128c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L288 274.7 288 32zM64 352c-35.3 0-64 28.7-64 64l0 32c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-32c0-35.3-28.7-64-64-64l-101.5 0-45.3 45.3c-25 25-65.5 25-90.5 0L165.5 352 64 352zm368 56a24 24 0 1 1 0 48 24 24 0 1 1 0-48z"],
    "HardDriveUpload": [512, 512, [], "solid", "M288 109.3L288 352c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-242.7-73.4 73.4c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l128-128c12.5-12.5 32.8-12.5 45.3 0l128 128c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L288 109.3zM64 352l128 0c0 35.3 28.7 64 64 64s64-28.7 64-64l128 0c35.3 0 64 28.7 64 64l0 32c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64l0-32c0-35.3 28.7-64 64-64zM432 456a24 24 0 1 0 0-48 24 24 0 1 0 0 48z"],
    "CircleCheck": [512, 512, ["CheckCircle2"], "solid", "M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"],
    "CirclePlay": [512, 512, [], "solid", "M0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zM188.3 147.1c-7.6 4.2-12.3 12.3-12.3 20.9l0 176c0 8.7 4.7 16.7 12.3 20.9s16.8 4.1 24.3-.5l144-88c7.1-4.4 11.5-12.1 11.5-20.5s-4.4-16.1-11.5-20.5l-144-88c-7.4-4.5-16.7-4.7-24.3-.5z"],
    "CirclePause": [512, 512, [], "solid", "M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM224 192l0 128c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-128c0-17.7 14.3-32 32-32s32 14.3 32 32zm128 0l0 128c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-128c0-17.7 14.3-32 32-32s32 14.3 32 32z"],
    "CirclePlus": [512, 512, ["PlusCircle"], "solid", "M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM232 344l0-64-64 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l64 0 0-64c0-13.3 10.7-24 24-24s24 10.7 24 24l0 64 64 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-64 0 0 64c0 13.3-10.7 24-24 24s-24-10.7-24-24z"],
    "CircleMinus": [512, 512, ["MinusCircle"], "solid", "M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM184 232l144 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-144 0c-13.3 0-24-10.7-24-24s10.7-24 24-24z"],
    "CircleStop": [512, 512, [], "solid", "M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM192 160l128 0c17.7 0 32 14.3 32 32l0 128c0 17.7-14.3 32-32 32l-128 0c-17.7 0-32-14.3-32-32l0-128c0-17.7 14.3-32 32-32z"],
    "CircleDot": [512, 512, [], "solid", "M464 256A208 208 0 1 0 48 256a208 208 0 1 0 416 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zm256-96a96 96 0 1 1 0 192 96 96 0 1 1 0-192z"],
    "CircleHelp": [512, 512, ["HelpCircle"], "solid", "M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM169.8 165.3c7.9-22.3 29.1-37.3 52.8-37.3l58.3 0c34.9 0 63.1 28.3 63.1 63.1c0 22.6-12.1 43.5-31.7 54.8L280 264.4c-.2 13-10.9 23.6-24 23.6c-13.3 0-24-10.7-24-24l0-13.5c0-8.6 4.6-16.5 12.1-20.8l44.3-25.4c4.7-2.7 7.6-7.7 7.6-13.1c0-8.4-6.8-15.1-15.1-15.1l-58.3 0c-3.4 0-6.4 2.1-7.5 5.3l-.4 1.2c-4.4 12.5-18.2 19-30.6 14.6s-19-18.2-14.6-30.6l.4-1.2zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"],
    "CircleArrowUp": [512, 512, ["ArrowUpCircle"], "solid", "M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM385 215c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-71-71L280 392c0 13.3-10.7 24-24 24s-24-10.7-24-24l0-214.1-71 71c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9L239 103c9.4-9.4 24.6-9.4 33.9 0L385 215z"],
    "CircleArrowDown": [512, 512, ["ArrowDownCircle"], "solid", "M256 0a256 256 0 1 0 0 512A256 256 0 1 0 256 0zM127 297c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l71 71L232 120c0-13.3 10.7-24 24-24s24 10.7 24 24l0 214.1 71-71c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9L273 409c-9.4 9.4-24.6 9.4-33.9 0L127 297z"],
    "CircleArrowLeft": [512, 512, ["ArrowLeftCircle"], "solid", "M512 256A256 256 0 1 0 0 256a256 256 0 1 0 512 0zM215 127c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-71 71L392 232c13.3 0 24 10.7 24 24s-10.7 24-24 24l-214.1 0 71 71c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0L103 273c-9.4-9.4-9.4-24.6 0-33.9L215 127z"],
    "CircleArrowRight": [512, 512, ["ArrowRightCircle"], "solid", "M0 256a256 256 0 1 0 512 0A256 256 0 1 0 0 256zM297 385c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l71-71L120 280c-13.3 0-24-10.7-24-24s10.7-24 24-24l214.1 0-71-71c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0L409 239c9.4 9.4 9.4 24.6 0 33.9L297 385z"],
    "CircleAlert": [512, 512, ["AlertCircle"], "solid", "M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm0-384c13.3 0 24 10.7 24 24l0 112c0 13.3-10.7 24-24 24s-24-10.7-24-24l0-112c0-13.3 10.7-24 24-24zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"],
    "CircleUser": [512, 512, ["UserCircle"], "solid", "M399 384.2C376.9 345.8 335.4 320 288 320l-64 0c-47.4 0-88.9 25.8-111 64.2c35.2 39.2 86.2 63.8 143 63.8s107.8-24.7 143-63.8zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zm256 16a72 72 0 1 0 0-144 72 72 0 1 0 0 144z"],
    "CircleChevronRight": [512, 512, ["ChevronRightCircle"], "solid", "M0 256a256 256 0 1 0 512 0A256 256 0 1 0 0 256zM241 377c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l87-87-87-87c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0L345 239c9.4 9.4 9.4 24.6 0 33.9L241 377z"],
    "CircleChevronDown": [512, 512, ["ChevronDownCircle"], "solid", "M256 0a256 256 0 1 0 0 512A256 256 0 1 0 256 0zM135 241c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l87 87 87-87c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9L273 345c-9.4 9.4-24.6 9.4-33.9 0L135 241z"],
    "CircleChevronUp": [512, 512, ["ChevronUpCircle"], "solid", "M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM377 271c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-87-87-87 87c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9L239 167c9.4-9.4 24.6-9.4 33.9 0L377 271z"],
    "CircleChevronLeft": [512, 512, ["ChevronLeftCircle"], "solid", "M512 256A256 256 0 1 0 0 256a256 256 0 1 0 512 0zM271 135c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-87 87 87 87c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0L167 273c-9.4-9.4-9.4-24.6 0-33.9L271 135z"],
    "CircleX": [512, 512, ["XCircle"], "solid", "M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z"],
    "Apple": [384, 512, [], "solid", "M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"],
    "Chrome": [512, 512, [], "solid", "M0 256C0 209.4 12.47 165.6 34.27 127.1L144.1 318.3C166 357.5 207.9 384 256 384C270.3 384 283.1 381.7 296.8 377.4L220.5 509.6C95.9 492.3 0 385.3 0 256zM365.1 321.6C377.4 302.4 384 279.1 384 256C384 217.8 367.2 183.5 340.7 160H493.4C505.4 189.6 512 222.1 512 256C512 397.4 397.4 511.1 256 512L365.1 321.6zM477.8 128H256C193.1 128 142.3 172.1 130.5 230.7L54.19 98.47C101 38.53 174 0 256 0C350.8 0 433.5 51.48 477.8 128V128zM168 256C168 207.4 207.4 168 256 168C304.6 168 344 207.4 344 256C344 304.6 304.6 344 256 344C207.4 344 168 304.6 168 256z"],
    "Facebook": [512, 512, [], "solid", "M512 256C512 114.6 397.4 0 256 0S0 114.6 0 256C0 376 82.7 476.8 194.2 504.5V334.2H141.4V256h52.8V222.3c0-87.1 39.4-127.5 125-127.5c16.2 0 44.2 3.2 55.7 6.4V172c-6-.6-16.5-1-29.6-1c-42 0-58.2 15.9-58.2 57.2V256h83.6l-14.4 78.2H287V510.1C413.8 494.8 512 386.9 512 256h0z"],
    "Github": [496, 512, [], "solid", "M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3.7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3.3 2.9 2.3 3.9 1.6 1 3.6.7 4.3-.7.7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3.7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3.7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z"],
    "Youtube": [576, 512, [], "solid", "M549.655 124.083c-6.281-23.65-24.787-42.276-48.284-48.597C458.781 64 288 64 288 64S117.22 64 74.629 75.486c-23.497 6.322-42.003 24.947-48.284 48.597-11.412 42.867-11.412 132.305-11.412 132.305s0 89.438 11.412 132.305c6.281 23.65 24.787 41.5 48.284 47.821C117.22 448 288 448 288 448s170.78 0 213.371-11.486c23.497-6.321 42.003-24.171 48.284-47.821 11.412-42.867 11.412-132.305 11.412-132.305s0-89.438-11.412-132.305zm-317.51 213.508V175.185l142.739 81.205-142.739 81.201z"],
    "CircleRight@solid": [512, 512, [], "solid", "M0 256a256 256 0 1 0 512 0A256 256 0 1 0 0 256zm395.3 11.3l-112 112c-4.6 4.6-11.5 5.9-17.4 3.5s-9.9-8.3-9.9-14.8l0-64-96 0c-17.7 0-32-14.3-32-32l0-32c0-17.7 14.3-32 32-32l96 0 0-64c0-6.5 3.9-12.3 9.9-14.8s12.9-1.1 17.4 3.5l112 112c6.2 6.2 6.2 16.4 0 22.6z"],
    "CircleUp@solid": [512, 512, [], "solid", "M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm11.3-395.3l112 112c4.6 4.6 5.9 11.5 3.5 17.4s-8.3 9.9-14.8 9.9l-64 0 0 96c0 17.7-14.3 32-32 32l-32 0c-17.7 0-32-14.3-32-32l0-96-64 0c-6.5 0-12.3-3.9-14.8-9.9s-1.1-12.9 3.5-17.4l112-112c6.2-6.2 16.4-6.2 22.6 0z"],
    "CircleLeft@solid": [512, 512, [], "solid", "M512 256A256 256 0 1 0 0 256a256 256 0 1 0 512 0zM116.7 244.7l112-112c4.6-4.6 11.5-5.9 17.4-3.5s9.9 8.3 9.9 14.8l0 64 96 0c17.7 0 32 14.3 32 32l0 32c0 17.7-14.3 32-32 32l-96 0 0 64c0 6.5-3.9 12.3-9.9 14.8s-12.9 1.1-17.4-3.5l-112-112c-6.2-6.2-6.2-16.4 0-22.6z"],
    "CircleDown@solid": [512, 512, [], "solid", "M256 0a256 256 0 1 0 0 512A256 256 0 1 0 256 0zM244.7 395.3l-112-112c-4.6-4.6-5.9-11.5-3.5-17.4s8.3-9.9 14.8-9.9l64 0 0-96c0-17.7 14.3-32 32-32l32 0c17.7 0 32 14.3 32 32l0 96 64 0c6.5 0 12.3 3.9 14.8 9.9s1.1 12.9-3.5 17.4l-112 112c-6.2 6.2-16.4 6.2-22.6 0z"],
    "PaperPlane@solid": [512, 512, [], "solid", "M498.1 5.6c10.1 7 15.4 19.1 13.5 31.2l-64 416c-1.5 9.7-7.4 18.2-16 23s-18.9 5.4-28 1.6L284 427.7l-68.5 74.1c-8.9 9.7-22.9 12.9-35.2 8.1S160 493.2 160 480l0-83.6c0-4 1.5-7.8 4.2-10.8L331.8 202.8c5.8-6.3 5.6-16-.4-22s-15.7-6.4-22-.7L106 360.8 17.7 316.6C7.1 311.3 .3 300.7 0 288.9s5.9-22.8 16.1-28.7l448-256c10.7-6.1 23.9-5.5 34 1.4z"],
};
// Alias for Lucide Icons
LX.LucideIconAlias = {
    "Stop": "Square",
    "Refresh": "RefreshCw",
    "Left": "ChevronLeft",
    "Right": "ChevronRight",
    "Up": "ChevronUp",
    "Down": "ChevronDown",
    "MenuArrows": "ChevronsUpDown",
    "RotateForward": "RotateCw",
    "RotateRight": "RotateCw",
    "RotateBack": "RotateCcw",
    "RotateLeft": "RotateCcw",
};
// Generate Alias icons
LX.ICONS = (() => {
    const aliasIcons = {};
    for (let i in RAW_ICONS) {
        const aliases = RAW_ICONS[i][2];
        aliases.forEach((a) => aliasIcons[a] = i);
    }
    return { ...RAW_ICONS, ...aliasIcons };
})();

// Spinner.ts @jxarco
/**
 * @class Spinner
 */
class Spinner {
    root;
    constructor(options = {}) {
        const icon = options.icon ?? "LoaderCircle";
        const size = options.size ?? "md";
        const iconClass = `flex ${options.iconClass ?? ""}`.trim();
        const svgClass = `animate-spin ${size} ${options.svgClass ?? ""}`.trim();
        this.root = LX.makeIcon(icon, { iconClass, svgClass });
    }
    destroy() {
        this.root.remove();
    }
}
LX.Spinner = Spinner;

// Sidebar.ts @jxarco
/**
 * @class Sidebar
 */
class Sidebar {
    /**
     * @param {Object} options
     * className: Extra class to customize root element
     * filter: Add search bar to filter entries [false]
     * displaySelected: Indicate if an entry is displayed as selected
     * skipHeader: Do not use sidebar header [false]
     * headerImg: Image to be shown as avatar
     * headerIcon: Icon to be shown as avatar (from LX.ICONS)
     * headerTitle: Header title
     * headerSubtitle: Header subtitle
     * header: HTMLElement to add a custom header
     * skipFooter: Do not use sidebar footer [false]
     * footerImg: Image to be shown as avatar
     * footerIcon: Icon to be shown as avatar (from LX.ICONS)
     * footerTitle: Footer title
     * footerSubtitle: Footer subtitle
     * footer: HTMLElement to add a custom footer
     * collapsable: Sidebar can toggle between collapsed/expanded [true]
     * collapseToIcons: When Sidebar collapses, icons remains visible [true]
     * onHeaderPressed: Function to call when header is pressed
     * onFooterPressed: Function to call when footer is pressed
     */
    root;
    callback;
    items = [];
    icons = {};
    groups = {};
    side;
    collapsable;
    collapsed;
    filterString;
    filter; // DOM Element
    header;
    content;
    footer;
    resizeObserver = undefined;
    siblingArea = undefined;
    currentGroup;
    collapseQueue;
    collapseContainer;
    _collapseWidth;
    _displaySelected = true;
    get displaySelected() {
        return this._displaySelected;
    }
    set displaySelected(v) {
        this._displaySelected = v;
        if (!v) {
            this.root.querySelectorAll(".lexsidebarentry")
                .forEach((e) => e.classList.remove("selected"));
        }
    }
    constructor(options = {}) {
        const mobile = navigator && /Android|iPhone/i.test(navigator.userAgent);
        this.root = document.createElement("div");
        this.root.className = "lexsidebar " + (options.className ?? "");
        this.callback = options.callback ?? null;
        this._displaySelected = options.displaySelected ?? false;
        this.side = options.side ?? "left";
        this.collapsable = options.collapsable ?? true;
        this._collapseWidth = (options.collapseToIcons ?? true) ? "58px" : "0px";
        this.collapsed = options.collapsed ?? mobile;
        this.filterString = "";
        LX.doAsync(() => {
            this.root.parentElement.ogWidth = this.root.parentElement.style.width;
            this.root.parentElement.style.transition = this.collapsed ? "" : "width 0.25s ease-out";
            this.resizeObserver = new ResizeObserver(entries => {
                for (const entry of entries) {
                    this.siblingArea?.setSize(["calc(100% - " + (entry.contentRect.width) + "px )", null]);
                }
            });
            if (this.collapsed) {
                this.root.classList.toggle("collapsed", this.collapsed);
                this.root.parentElement.style.width = this._collapseWidth;
                if (!this.resizeObserver) {
                    throw ("Wait until ResizeObserver has been created!");
                }
                this.resizeObserver.observe(this.root.parentElement);
                LX.doAsync(() => {
                    this.resizeObserver?.unobserve(this.root.parentElement);
                    this.root.querySelectorAll(".lexsidebarentrycontent").forEach((e) => e.dataset["disableTooltip"] = `${!this.collapsed}`);
                }, 10);
            }
        }, 10);
        // Header
        if (!(options.skipHeader ?? false)) {
            this.header = options.header ?? this._generateDefaultHeader(options);
            console.assert(this.header.constructor === HTMLDivElement, "Use an HTMLDivElement to build your custom header");
            this.header.className = "lexsidebarheader";
            this.root.appendChild(this.header);
            if (this.collapsable) {
                const icon = LX.makeIcon(this.side == "left" ? "PanelLeft" : "PanelRight", { title: "Toggle Sidebar", iconClass: "toggler" });
                this.header.appendChild(icon);
                if (mobile) {
                    // create an area and append a sidebar:
                    const area = new Area({ skipAppend: true });
                    const sheetSidebarOptions = LX.deepCopy(options);
                    sheetSidebarOptions.collapsed = false;
                    sheetSidebarOptions.collapsable = false;
                    area.addSidebar(this.callback, sheetSidebarOptions);
                    icon.addEventListener("click", (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        new LX.Sheet("256px", [area], { side: this.side });
                    });
                }
                else {
                    icon.addEventListener("click", (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.toggleCollapsed();
                    });
                }
            }
        }
        // Entry filter
        if ((options.filter ?? false)) {
            const filterTextInput = new TextInput(null, "", (value, event) => {
                this.filterString = value;
                this.update();
            }, { inputClass: "outline", placeholder: "Search...", icon: "Search", className: "lexsidebarfilter" });
            this.filter = filterTextInput.root;
            this.root.appendChild(this.filter);
        }
        // Content
        {
            this.content = document.createElement('div');
            this.content.className = "lexsidebarcontent";
            this.root.appendChild(this.content);
        }
        // Footer
        if (!(options.skipFooter ?? false)) {
            this.footer = options.footer ?? this._generateDefaultFooter(options);
            console.assert(this.footer.constructor === HTMLDivElement, "Use an HTMLDivElement to build your custom footer");
            this.footer.className = "lexsidebarfooter";
            this.root.appendChild(this.footer);
        }
        const resizeObserver = new ResizeObserver(entries => {
            const contentOffset = (this.header?.offsetHeight ?? 0) +
                (this.filter?.offsetHeight ?? 0) +
                (this.footer?.offsetHeight ?? 0);
            this.content.style.height = `calc(100% - ${contentOffset}px)`;
        });
        resizeObserver.observe(this.root);
    }
    _generateDefaultHeader(options = {}) {
        const header = document.createElement('div');
        header.addEventListener("click", e => {
            if (this.collapsed) {
                e.preventDefault();
                e.stopPropagation();
                this.toggleCollapsed();
            }
            else if (options.onHeaderPressed) {
                options.onHeaderPressed(e);
            }
        });
        const avatar = document.createElement('span');
        avatar.className = "lexavatar";
        header.appendChild(avatar);
        if (options.headerImage) {
            const avatarImg = document.createElement('img');
            avatarImg.src = options.headerImage;
            avatar.appendChild(avatarImg);
        }
        else if (options.headerIcon) {
            const avatarIcon = LX.makeIcon(options.headerIcon);
            avatar.appendChild(avatarIcon);
        }
        // Info
        {
            const info = document.createElement('div');
            info.className = "infodefault";
            header.appendChild(info);
            const infoText = document.createElement('span');
            infoText.innerHTML = options.headerTitle ?? "";
            info.appendChild(infoText);
            const infoSubtext = document.createElement('span');
            infoSubtext.innerHTML = options.headerSubtitle ?? "";
            info.appendChild(infoSubtext);
        }
        // Add icon if onHeaderPressed is defined and not collapsable (it uses the toggler icon)
        if (options.onHeaderPressed && !this.collapsable) {
            const icon = LX.makeIcon("MenuArrows");
            header.appendChild(icon);
        }
        return header;
    }
    _generateDefaultFooter(options = {}) {
        const footer = document.createElement('div');
        footer.addEventListener("click", e => {
            if (options.onFooterPressed) {
                options.onFooterPressed(e, footer);
            }
        });
        const avatar = document.createElement('span');
        avatar.className = "lexavatar";
        footer.appendChild(avatar);
        if (options.footerImage) {
            const avatarImg = document.createElement('img');
            avatarImg.src = options.footerImage;
            avatar.appendChild(avatarImg);
        }
        else if (options.footerIcon) {
            const avatarIcon = LX.makeIcon(options.footerIcon);
            avatar.appendChild(avatarIcon);
        }
        // Info
        {
            const info = document.createElement('div');
            info.className = "infodefault";
            footer.appendChild(info);
            const infoText = document.createElement('span');
            infoText.innerHTML = options.footerTitle ?? "";
            info.appendChild(infoText);
            const infoSubtext = document.createElement('span');
            infoSubtext.innerHTML = options.footerSubtitle ?? "";
            info.appendChild(infoSubtext);
        }
        // Add icon if onFooterPressed is defined
        // Useful to indicate that the footer is clickable
        if (options.onFooterPressed) {
            const icon = LX.makeIcon("MenuArrows");
            footer.appendChild(icon);
        }
        return footer;
    }
    /**
     * @method toggleCollapsed
     * @param {Boolean} force: Force collapsed state
     */
    toggleCollapsed(force) {
        if (!this.collapsable) {
            return;
        }
        this.collapsed = force ?? !this.collapsed;
        if (this.collapsed) {
            this.root.classList.add("collapsing");
            this.root.parentElement.style.width = this._collapseWidth;
        }
        else {
            this.root.classList.remove("collapsing");
            this.root.classList.remove("collapsed");
            this.root.parentElement.style.width = this.root.parentElement.ogWidth;
        }
        if (!this.resizeObserver) {
            throw ("Wait until ResizeObserver has been created!");
        }
        this.resizeObserver.observe(this.root.parentElement);
        LX.doAsync(() => {
            this.root.classList.toggle("collapsed", this.collapsed);
            this.resizeObserver?.unobserve(this.root.parentElement);
            this.root.querySelectorAll(".lexsidebarentrycontent").forEach((e) => e.dataset["disableTooltip"] = `${!this.collapsed}`);
        }, 250);
    }
    /**
     * @method separator
     */
    separator() {
        this.currentGroup = null;
        this.add("");
    }
    /**
     * @method group
     * @param {String} groupName
     * @param {Object} action: { icon, callback }
     */
    group(groupName, action) {
        this.currentGroup = groupName;
        this.groups[groupName] = action;
    }
    /**
     * @method add
     * @param {String} path
     * @param {Object} options:
     * callback: Function to call on each item
     * className: Add class to the entry DOM element
     * collapsable: Add entry as a collapsable section
     * icon: Entry icon
     */
    add(path, options = {}) {
        if (options.constructor == Function) {
            options = { callback: options };
        }
        // Process path
        const tokens = path.split("/");
        // Assign icons and shortcuts to last token in path
        const lastPath = tokens[tokens.length - 1];
        this.icons[lastPath] = options.icon;
        let idx = 0;
        const _insertEntry = (token, list) => {
            if (token == undefined) {
                return;
            }
            let found = null;
            list.forEach((o) => {
                const keys = Object.keys(o);
                const key = keys.find(t => t == token);
                if (key)
                    found = o[key];
            });
            if (found) {
                _insertEntry(tokens[idx++], found);
            }
            else {
                let item = {};
                item[token] = [];
                const nextToken = tokens[idx++];
                // Check if last token -> add callback
                if (!nextToken) {
                    item['callback'] = options.callback;
                    item['group'] = this.currentGroup;
                    item['options'] = options;
                }
                list.push(item);
                _insertEntry(nextToken, item[token]);
            }
        };
        _insertEntry(tokens[idx++], this.items);
    }
    /**
     * @method select
     * @param {String} name Element name to select
     */
    select(name) {
        let pKey = LX.getSupportedDOMName(name);
        const entry = this.items.find(v => v.name === pKey);
        if (!entry)
            return;
        entry.dom.click();
    }
    update() {
        // Reset first
        this.content.innerHTML = "";
        for (let item of this.items) {
            delete item.dom;
        }
        for (let item of this.items) {
            const options = item.options ?? {};
            // Item already created
            if (item.dom) {
                continue;
            }
            let key = item.name = Object.keys(item)[0];
            if (this.filterString.length && !key.toLowerCase().includes(this.filterString.toLowerCase())) {
                continue;
            }
            let pKey = LX.getSupportedDOMName(key);
            let currentGroup = null;
            let entry = document.createElement('div');
            entry.id = pKey;
            entry.className = "lexsidebarentry " + (options.className ?? "");
            if (this.displaySelected && options.selected) {
                entry.classList.add("selected");
            }
            if (item.group) {
                const pGroupKey = item.group.replace(/\s/g, '').replaceAll('.', '');
                currentGroup = this.content.querySelector("#" + pGroupKey);
                if (!currentGroup) {
                    currentGroup = document.createElement('div');
                    currentGroup.id = pGroupKey;
                    currentGroup.className = "lexsidebargroup";
                    this.content.appendChild(currentGroup);
                    let groupEntry = document.createElement('div');
                    groupEntry.className = "lexsidebargrouptitle";
                    currentGroup.appendChild(groupEntry);
                    let groupLabel = document.createElement('div');
                    groupLabel.innerHTML = item.group;
                    groupEntry.appendChild(groupLabel);
                    if (this.groups[item.group] != null) {
                        const groupActionIcon = LX.makeIcon(this.groups[item.group].icon, { svgClass: "sm" });
                        groupEntry.appendChild(groupActionIcon);
                        groupActionIcon.addEventListener("click", (e) => {
                            if (this.groups[item.group].callback) {
                                this.groups[item.group].callback(item.group, e);
                            }
                        });
                    }
                }
                else if (!currentGroup.classList.contains("lexsidebargroup")) {
                    throw ("Bad id: " + item.group);
                }
            }
            if (pKey == "") {
                let separatorDom = document.createElement('div');
                separatorDom.className = "lexsidebarseparator";
                this.content.appendChild(separatorDom);
                continue;
            }
            if (this.collapseContainer) {
                this.collapseContainer.appendChild(entry);
                this.collapseQueue--;
                if (!this.collapseQueue) {
                    delete this.collapseContainer;
                }
            }
            else if (currentGroup) {
                currentGroup.appendChild(entry);
            }
            else {
                this.content.appendChild(entry);
            }
            let itemDom = document.createElement('div');
            itemDom.className = "lexsidebarentrycontent";
            entry.appendChild(itemDom);
            item.dom = entry;
            if (options.type == "checkbox") {
                item.value = options.value ?? false;
                const panel = new Panel();
                item.checkbox = panel.addCheckbox(null, item.value, (value, event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const f = options.callback;
                    item.value = value;
                    if (f)
                        f.call(this, key, value, event);
                }, { className: "accent", label: key, signal: ("@checkbox_" + key) });
                itemDom.appendChild(panel.root.childNodes[0]);
            }
            else {
                if (options.icon) {
                    const itemIcon = LX.makeIcon(options.icon, { iconClass: "lexsidebarentryicon" });
                    itemDom.appendChild(itemIcon);
                    LX.asTooltip(itemDom, key, { side: "right", offset: 16, active: false });
                }
                LX.makeElement('a', "grid-column-start-2", key, itemDom);
                if (options.swap) {
                    itemDom.classList.add("swap", "inline-grid");
                    itemDom.querySelector("a")?.classList.add("swap-off");
                    const input = document.createElement("input");
                    input.className = "p-0 border-0";
                    input.type = "checkbox";
                    itemDom.prepend(input);
                    const swapIcon = LX.makeIcon(options.swap, { iconClass: "lexsidebarentryicon swap-on" });
                    itemDom.appendChild(swapIcon);
                }
                if (options.content) {
                    itemDom.appendChild(options.content);
                }
            }
            const isCollapsable = options.collapsable != undefined ? options.collapsable : (options.collapsable || item[key].length);
            entry.addEventListener("click", (e) => {
                if (e.target && e.target.classList.contains("lexcheckbox")) {
                    return;
                }
                let value = undefined;
                if (isCollapsable) {
                    itemDom.querySelector(".collapser")?.click();
                }
                else if (item.checkbox) {
                    item.value = !item.value;
                    item.checkbox.set(item.value, true);
                    value = item.value;
                }
                else if (options.swap && !(e.target instanceof HTMLInputElement)) {
                    const swapInput = itemDom.querySelector("input");
                    swapInput.checked = !swapInput.checked;
                    value = swapInput.checked;
                }
                const f = options.callback;
                if (f)
                    f.call(this, key, value ?? entry, e);
                // Manage selected
                if (this.displaySelected && !options.skipSelection) {
                    this.root.querySelectorAll(".lexsidebarentry").forEach((e) => e.classList.remove('selected'));
                    entry.classList.add("selected");
                }
            });
            if (options.action) {
                const actionIcon = LX.makeIcon(options.action.icon ?? "Ellipsis", { title: options.action.name });
                itemDom.appendChild(actionIcon);
                actionIcon.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    const f = options.action.callback;
                    if (f)
                        f.call(this, key, e);
                });
            }
            else if (isCollapsable) {
                const collapsableContent = document.createElement('div');
                collapsableContent.className = "collapsablecontainer";
                Object.assign(collapsableContent.style, { width: "100%", display: "none" });
                LX.makeCollapsible(itemDom, collapsableContent, currentGroup ?? this.content);
                this.collapseQueue = options.collapsable;
                this.collapseContainer = collapsableContent;
            }
            // Subentries
            if (!item[key].length) {
                continue;
            }
            let subentryContainer = document.createElement('div');
            subentryContainer.className = "lexsidebarsubentrycontainer";
            if (isCollapsable) {
                this.collapseContainer.appendChild(subentryContainer);
                delete this.collapseContainer;
            }
            else if (currentGroup) {
                subentryContainer.classList.add("collapsablecontainer");
                currentGroup.appendChild(subentryContainer);
            }
            else {
                this.content.appendChild(subentryContainer);
            }
            for (let i = 0; i < item[key].length; ++i) {
                const subitem = item[key][i];
                const suboptions = subitem.options ?? {};
                const subkey = subitem.name = Object.keys(subitem)[0];
                if (this.filterString.length && !subkey.toLowerCase().includes(this.filterString.toLowerCase())) {
                    continue;
                }
                let subentry = document.createElement('div');
                subentry.innerHTML = `<span>${subkey}</span>`;
                if (suboptions.action) {
                    const actionIcon = LX.makeIcon(suboptions.action.icon ?? "Ellipsis", { title: suboptions.action.name });
                    subentry.appendChild(actionIcon);
                    actionIcon.addEventListener("click", (e) => {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        const f = suboptions.action.callback;
                        if (f)
                            f.call(this, subkey, e);
                    });
                }
                subentry.className = "lexsidebarentry";
                subentry.id = subkey;
                if (suboptions.content) {
                    const parentContainer = LX.makeElement("div");
                    parentContainer.appendChild(suboptions.content);
                    subentry.appendChild(parentContainer);
                }
                subentryContainer.appendChild(subentry);
                subentry.addEventListener("click", (e) => {
                    const f = suboptions.callback;
                    if (f)
                        f.call(this, subkey, subentry, e);
                    // Manage selected
                    if (this.displaySelected && !suboptions.skipSelection) {
                        this.root.querySelectorAll(".lexsidebarentry").forEach((e) => e.classList.remove('selected'));
                        subentry.classList.add("selected");
                    }
                });
            }
        }
    }
}
LX.Sidebar = Sidebar;

// ContextMenu.ts @jxarco
/**
 * @class ContextMenu
 */
class ContextMenu {
    root;
    items;
    colors;
    _parent;
    constructor(event, title, options = {}) {
        // Remove all context menus
        document.body.querySelectorAll(".lexcontextmenu").forEach(e => e.remove());
        this.root = document.createElement("div");
        this.root.className = "lexcontextmenu";
        this.root.addEventListener("mouseleave", function () {
            this.remove();
        });
        this.items = [];
        this.colors = {};
        if (title) {
            let item = {};
            item[title] = [];
            item["className"] = "cmtitle";
            item["icon"] = options.icon;
            this.items.push(item);
        }
        const nestedDialog = event.target.closest("dialog");
        if (nestedDialog && nestedDialog.dataset["modal"] == 'true') {
            this._parent = nestedDialog;
        }
        else {
            this._parent = LX.root;
        }
        this._parent.appendChild(this.root);
        // Set position based on parent
        const position = [event.x - 48, event.y - 8];
        if (this._parent instanceof HTMLDialogElement) {
            let parentRect = this._parent.getBoundingClientRect();
            position[0] -= parentRect.x;
            position[1] -= parentRect.y;
        }
        this.root.style.left = `${position[0]}px`;
        this.root.style.top = `${position[1]}px`;
    }
    _adjustPosition(div, margin, useAbsolute = false) {
        let rect = div.getBoundingClientRect();
        let left = parseInt(div.style.left);
        let top = parseInt(div.style.top);
        if (!useAbsolute) {
            let width = rect.width;
            if (rect.left < 0) {
                left = margin;
            }
            else if (window.innerWidth - rect.right < 0) {
                left = (window.innerWidth - width - margin);
            }
            if (rect.top < 0) {
                top = margin;
            }
            else if ((rect.top + rect.height) > window.innerHeight) {
                div.style.marginTop = "";
                top = (window.innerHeight - rect.height - margin);
            }
        }
        else {
            let dt = window.innerWidth - rect.right;
            if (dt < 0) {
                left = div.offsetLeft + (dt - margin);
            }
            dt = window.innerHeight - (rect.top + rect.height);
            if (dt < 0) {
                top = div.offsetTop + (dt - margin + 20);
            }
        }
        div.style.left = `${left}px`;
        div.style.top = `${top}px`;
    }
    _createSubmenu(o, k, c, d) {
        this.root.querySelectorAll(".lexcontextmenu").forEach((m) => m.remove());
        let contextmenu = document.createElement('div');
        contextmenu.className = "lexcontextmenu";
        c.appendChild(contextmenu);
        for (let i = 0; i < o[k].length; ++i) {
            const subitem = o[k][i];
            const subkey = Object.keys(subitem)[0];
            this._createEntry(subitem, subkey, contextmenu, d);
        }
        const rect = c.getBoundingClientRect();
        contextmenu.style.left = (rect.x + rect.width) + "px";
        contextmenu.style.marginTop = "-31px"; // Force to be at the first element level
        // Set final width
        this._adjustPosition(contextmenu, 6);
    }
    _createEntry(o, k, c, d) {
        const hasSubmenu = o[k].length;
        let entry = document.createElement('div');
        entry.className = "lexmenuboxentry" + (o['className'] ? " " + o['className'] : "");
        entry.id = o.id ?? ("eId" + LX.getSupportedDOMName(k));
        entry.innerHTML = "";
        const icon = o['icon'];
        if (icon) {
            entry.appendChild(LX.makeIcon(icon, { svgClass: "sm" }));
        }
        const disabled = o['disabled'];
        entry.innerHTML += "<div class='lexentryname" + (disabled ? " disabled" : "") + "'>" + k + "</div>";
        c.appendChild(entry);
        if (this.colors[k]) {
            entry.style.borderColor = this.colors[k];
        }
        if (k == "") {
            entry.className += " cmseparator";
            return;
        }
        // Add callback
        entry.addEventListener("click", e => {
            e.stopPropagation();
            e.stopImmediatePropagation();
            if (disabled) {
                return;
            }
            const f = o['callback'];
            if (f) {
                f.call(this, k, entry);
                this.root.remove();
            }
            if (!hasSubmenu) {
                return;
            }
            if (LX.OPEN_CONTEXTMENU_ENTRY == 'click') {
                this._createSubmenu(o, k, entry, ++d);
            }
        });
        if (!hasSubmenu) {
            return;
        }
        const submenuIcon = LX.makeIcon("Menu", { svgClass: "sm" });
        entry.appendChild(submenuIcon);
        if (LX.OPEN_CONTEXTMENU_ENTRY == 'mouseover') {
            entry.addEventListener("mouseover", e => {
                if (entry.dataset["built"] == "true")
                    return;
                entry.dataset["built"] = "true";
                this._createSubmenu(o, k, entry, ++d);
                e.stopPropagation();
            });
        }
        entry.addEventListener("mouseleave", () => {
            d = -1; // Reset depth
            c.querySelectorAll(".lexcontextmenu").forEach((m) => m.remove());
        });
    }
    onCreate() {
        LX.doAsync(() => this._adjustPosition(this.root, 6));
    }
    add(path, options = {}) {
        if (options.constructor == Function)
            options = { callback: options };
        // process path
        path = path + ""; // make string!
        const tokens = path.split("/");
        // assign color to last token in path
        const lastPath = tokens[tokens.length - 1];
        this.colors[lastPath] = options.color;
        let idx = 0;
        const insert = (token, list) => {
            if (token == undefined)
                return;
            let found = null;
            list.forEach((o) => {
                const keys = Object.keys(o);
                const key = keys.find(t => t == token);
                if (key)
                    found = o[key];
            });
            if (found) {
                insert(tokens[idx++], found);
            }
            else {
                let item = {};
                item[token] = [];
                const nextToken = tokens[idx++];
                // Check if last token -> add callback
                if (!nextToken) {
                    item['id'] = options.id;
                    item['icon'] = options.icon;
                    item['callback'] = options.callback;
                    item['disabled'] = options.disabled ?? false;
                }
                list.push(item);
                insert(nextToken, item[token]);
            }
        };
        insert(tokens[idx++], this.items);
        // Set parents
        const setParent = (_item) => {
            let key = Object.keys(_item)[0];
            let children = _item[key];
            if (!children.length) {
                return;
            }
            if (children.find((c) => Object.keys(c)[0] == key) == null) {
                let parent = {};
                parent[key] = [];
                parent['className'] = "cmtitle";
                _item[key].unshift(parent);
            }
            for (let child of _item[key]) {
                let k = Object.keys(child)[0];
                for (let i = 0; i < child[k].length; ++i) {
                    setParent(child);
                }
            }
        };
        for (let item of this.items) {
            setParent(item);
        }
        // Create elements
        for (let item of this.items) {
            let key = Object.keys(item)[0];
            let pKey = "eId" + LX.getSupportedDOMName(key);
            // Item already created
            const id = "#" + (item.id ?? pKey);
            if (!this.root.querySelector(id)) {
                this._createEntry(item, key, this.root, -1);
            }
        }
    }
    setColor(token, color) {
        if (color[0] !== '#') {
            color = LX.rgbToHex(color);
        }
        this.colors[token] = color;
    }
}
LX.ContextMenu = ContextMenu;
function addContextMenu(title, event, callback, options = {}) {
    const menu = new ContextMenu(event, title, options);
    if (callback) {
        callback(menu);
    }
    menu.onCreate();
    return menu;
}
LX.addContextMenu = addContextMenu;

// DropdownMenu.ts @jxarco
/**
 * @class DropdownMenu
 */
class DropdownMenu {
    static currentMenu = null;
    root;
    side = "bottom";
    align = "center";
    sideOffset = 0;
    alignOffset = 0;
    avoidCollisions = true;
    onBlur;
    event;
    inPlace = false;
    _trigger;
    _items = [];
    _parent;
    _windowPadding = 4;
    _onClick;
    _radioGroup;
    invalid = false;
    constructor(trigger, items, options = {}) {
        console.assert(trigger, "DropdownMenu needs a DOM element as trigger!");
        if (DropdownMenu.currentMenu || !items?.length) {
            DropdownMenu.currentMenu?.destroy();
            this.invalid = true;
            return;
        }
        this._trigger = trigger;
        trigger.classList.add("triggered");
        trigger.ddm = this;
        this._items = items;
        this.side = options.side ?? "bottom";
        this.align = options.align ?? "center";
        this.sideOffset = options.sideOffset ?? 0;
        this.alignOffset = options.alignOffset ?? 0;
        this.avoidCollisions = options.avoidCollisions ?? true;
        this.onBlur = options.onBlur;
        this.event = options.event;
        this.root = document.createElement("div");
        this.root.id = "root";
        this.root.dataset["side"] = this.side;
        this.root.tabIndex = "1";
        this.root.className = "lexdropdownmenu";
        const nestedDialog = trigger.closest("dialog");
        if (nestedDialog && nestedDialog.dataset["modal"] == 'true') {
            this._parent = nestedDialog;
        }
        else {
            this._parent = LX.root;
        }
        this._parent.appendChild(this.root);
        this._create(this._items);
        DropdownMenu.currentMenu = this;
        LX.doAsync(() => {
            this._adjustPosition();
            this.root.focus();
            this._onClick = (e) => {
                // Check if the click is inside a menu or on the trigger
                if (e.target && (e.target.closest(".lexdropdownmenu") != undefined || e.target == this._trigger)) {
                    return;
                }
                this.destroy(true);
            };
            document.body.addEventListener("mousedown", this._onClick, true);
            document.body.addEventListener("focusin", this._onClick, true);
        }, 10);
    }
    destroy(blurEvent = false) {
        this._trigger.classList.remove("triggered");
        delete this._trigger.ddm;
        document.body.removeEventListener("mousedown", this._onClick, true);
        document.body.removeEventListener("focusin", this._onClick, true);
        this._parent.querySelectorAll(".lexdropdownmenu").forEach((m) => { m.remove(); });
        DropdownMenu.currentMenu = null;
        if (blurEvent && this.onBlur) {
            this.onBlur();
        }
    }
    _create(items, parentDom) {
        if (!parentDom) {
            parentDom = this.root;
        }
        else {
            const parentRect = parentDom.getBoundingClientRect();
            let newParent = document.createElement("div");
            newParent.tabIndex = "1";
            newParent.className = "lexdropdownmenu";
            newParent.dataset["id"] = parentDom.dataset["id"];
            newParent.dataset["side"] = "right"; // submenus always come from the right
            this._parent.appendChild(newParent);
            newParent.currentParent = parentDom;
            parentDom = newParent;
            LX.doAsync(() => {
                const position = [parentRect.x + parentRect.width, parentRect.y];
                if (this._parent instanceof HTMLDialogElement) {
                    let rootParentRect = this._parent.getBoundingClientRect();
                    position[0] -= rootParentRect.x;
                    position[1] -= rootParentRect.y;
                }
                if (this.avoidCollisions) {
                    position[0] = LX.clamp(position[0], 0, window.innerWidth - newParent.offsetWidth - this._windowPadding);
                    position[1] = LX.clamp(position[1], 0, window.innerHeight - newParent.offsetHeight - this._windowPadding);
                }
                newParent.style.left = `${position[0]}px`;
                newParent.style.top = `${position[1]}px`;
            }, 10);
        }
        let applyIconPadding = items.filter((i) => { return (i?.icon != undefined) || (i?.checked != undefined); }).length > 0;
        for (let item of items) {
            this._createItem(item, parentDom, applyIconPadding);
        }
    }
    _createItem(item, parentDom, applyIconPadding) {
        if (!item) {
            this._addSeparator(parentDom);
            return;
        }
        const key = item.name ?? item;
        const pKey = LX.getSupportedDOMName(key);
        // Item already created
        if (parentDom.querySelector("#" + pKey)) {
            return;
        }
        const menuItem = document.createElement('div');
        menuItem.className = "lexdropdownmenuitem" + ((item.name || item.options) ? "" : " label") + (item.disabled ?? false ? " disabled" : "") + (` ${item.className ?? ""}`);
        menuItem.dataset["id"] = pKey;
        menuItem.innerHTML = `<span>${key}</span>`;
        menuItem.tabIndex = "1";
        parentDom.appendChild(menuItem);
        if (item.constructor === String) // Label case
         {
            return;
        }
        if (item.submenu) {
            const submenuIcon = LX.makeIcon("Right", { svgClass: "sm" });
            menuItem.appendChild(submenuIcon);
        }
        else if (item.kbd) {
            item.kbd = [].concat(item.kbd);
            const kbd = LX.makeKbd(item.kbd);
            menuItem.appendChild(kbd);
            document.addEventListener("keydown", e => {
                if (!this._trigger.ddm)
                    return;
                e.preventDefault();
                // Check if it's a letter or other key
                let kdbKey = item.kbd.join("");
                kdbKey = kdbKey.length == 1 ? kdbKey.toLowerCase() : kdbKey;
                if (kdbKey == e.key) {
                    menuItem.click();
                }
            });
        }
        const disabled = item.disabled ?? false;
        if (this._radioGroup !== undefined) {
            if (item.name === this._radioGroup.selected) {
                const icon = LX.makeIcon("Circle", { svgClass: "xxs fill-current" });
                menuItem.prepend(icon);
            }
            menuItem.setAttribute("data-radioname", this._radioGroup.name);
        }
        else if (item.icon) {
            const icon = LX.makeIcon(item.icon, { svgClass: disabled ? "fg-tertiary" : item.svgClass ?? item.className });
            menuItem.prepend(icon);
        }
        else if (item.checked == undefined && applyIconPadding) // no checkbox, no icon, apply padding if there's checkbox or icon in other items
         {
            menuItem.classList.add("pl-8");
        }
        if (disabled) {
            return;
        }
        if (item.checked != undefined) {
            const checkbox = new Checkbox(pKey + "_entryChecked", item.checked, (v) => {
                const f = item['callback'];
                item.checked = v;
                if (f) {
                    f.call(this, key, v, menuItem);
                }
            }, { className: "accent" });
            const input = checkbox.root.querySelector("input");
            input.classList.add("ml-auto");
            menuItem.appendChild(input);
            menuItem.addEventListener("click", (e) => {
                if (e.target.type == "checkbox")
                    return;
                input.checked = !input.checked;
                checkbox.set(input.checked);
            });
        }
        else {
            menuItem.addEventListener("click", (e) => {
                const radioName = menuItem.getAttribute("data-radioname");
                if (radioName) {
                    this._trigger[radioName] = key;
                }
                const f = item.callback;
                if (f) {
                    f.call(this, key, menuItem, radioName);
                }
                // If has options, it's a radio group label, so don't close the menu
                if (!item.options && (item.closeOnClick ?? true)) {
                    this.destroy(true);
                }
            });
        }
        menuItem.addEventListener("mouseover", (e) => {
            let path = menuItem.dataset["id"];
            if (!path)
                return;
            let p = parentDom;
            while (p) {
                path += "/" + p.dataset["id"];
                p = p.currentParent?.parentElement;
            }
            this._parent.querySelectorAll(".lexdropdownmenu").forEach((m) => {
                if (!path.includes(m.dataset["id"])) {
                    m.currentParent.built = false;
                    m.remove();
                }
            });
            if (item.submenu && this.inPlace) {
                if (menuItem.built) {
                    return;
                }
                menuItem.built = true;
                this._create(item.submenu, menuItem);
            }
            e.stopPropagation();
        });
        if (item.options) {
            console.assert(this._trigger[item.name] && "An item of the radio group must be selected!");
            this._radioGroup = {
                name: item.name,
                selected: this._trigger[item.name]
            };
            for (let o of item.options) {
                this._createItem(o, parentDom, applyIconPadding);
            }
            delete this._radioGroup;
            this._addSeparator();
        }
    }
    _adjustPosition() {
        const position = [0, 0];
        const rect = this._trigger.getBoundingClientRect();
        // Place menu using trigger position and user options
        if (!this.event) {
            let alignWidth = true;
            switch (this.side) {
                case "left":
                    position[0] += (rect.x - this.root.offsetWidth - this.sideOffset);
                    alignWidth = false;
                    break;
                case "right":
                    position[0] += (rect.x + rect.width + this.sideOffset);
                    alignWidth = false;
                    break;
                case "top":
                    position[1] += (rect.y - this.root.offsetHeight - this.sideOffset);
                    alignWidth = true;
                    break;
                case "bottom":
                    position[1] += (rect.y + rect.height + this.sideOffset);
                    alignWidth = true;
                    break;
            }
            switch (this.align) {
                case "start":
                    if (alignWidth) {
                        position[0] += rect.x;
                    }
                    else {
                        position[1] += rect.y;
                    }
                    break;
                case "center":
                    if (alignWidth) {
                        position[0] += (rect.x + rect.width * 0.5) - this.root.offsetWidth * 0.5;
                    }
                    else {
                        position[1] += (rect.y + rect.height * 0.5) - this.root.offsetHeight * 0.5;
                    }
                    break;
                case "end":
                    if (alignWidth) {
                        position[0] += rect.x - this.root.offsetWidth + rect.width;
                    }
                    else {
                        position[1] += rect.y - this.root.offsetHeight + rect.height;
                    }
                    break;
            }
            if (alignWidth) {
                position[0] += this.alignOffset;
            }
            else {
                position[1] += this.alignOffset;
            }
        }
        // Offset position based on event
        else {
            position[0] = this.event.x;
            position[1] = this.event.y;
        }
        if (this._parent instanceof HTMLDialogElement) {
            let parentRect = this._parent.getBoundingClientRect();
            position[0] -= parentRect.x;
            position[1] -= parentRect.y;
        }
        if (this.avoidCollisions) {
            position[0] = LX.clamp(position[0], 0, window.innerWidth - this.root.offsetWidth - this._windowPadding);
            position[1] = LX.clamp(position[1], 0, window.innerHeight - this.root.offsetHeight - this._windowPadding);
        }
        this.root.style.left = `${position[0]}px`;
        this.root.style.top = `${position[1]}px`;
        this.inPlace = true;
    }
    _addSeparator(parent = null) {
        const separator = document.createElement('div');
        separator.className = "separator";
        parent = parent ?? this.root;
        parent?.appendChild(separator);
    }
}
LX.DropdownMenu = DropdownMenu;
function addDropdownMenu(trigger, items, options = {}) {
    const menu = new DropdownMenu(trigger, items, options);
    if (!menu.invalid) {
        return menu;
    }
    return null;
}
LX.addDropdownMenu = addDropdownMenu;

// Skeleton.ts @jxarco
class Skeleton {
    root;
    constructor(elements) {
        this.root = LX.makeContainer(["auto", "auto"], "flex flex-row lexskeleton");
        if (elements.constructor === String) {
            this.root.innerHTML = elements;
        }
        else {
            // Force array
            elements = [].concat(elements);
            for (let e of elements) {
                this.root.appendChild(e);
            }
        }
    }
    destroy() {
        this.root.dataset["closed"] = true;
        LX.doAsync(() => {
            this.root.remove();
            this.root = null;
        }, 200);
    }
}
LX.Skeleton = Skeleton;

// Tour.ts @jxarco
class Tour {
    static ACTIVE_TOURS = [];
    /**
     * @constructor Tour
     * @param {Array} steps
     * @param {Object} options
     * useModal: Use a modal to highlight the tour step [true]
     * offset: Horizontal and vertical margin offset [0]
     * horizontalOffset: Horizontal offset [0]
     * verticalOffset: Vertical offset [0]
     * radius: Radius for the tour step highlight [8]
     */
    steps;
    currentStep = 0;
    useModal;
    offset;
    horizontalOffset;
    verticalOffset;
    radius;
    tourContainer;
    tourMask = undefined;
    _popover = null;
    constructor(steps, options = {}) {
        this.steps = steps || [];
        this.useModal = options.useModal ?? true;
        this.offset = options.offset ?? 8;
        this.horizontalOffset = options.horizontalOffset;
        this.verticalOffset = options.verticalOffset;
        this.radius = options.radius ?? 12;
        this.tourContainer = document.querySelector(".tour-container");
        if (!this.tourContainer) {
            this.tourContainer = LX.makeContainer(["100%", "100%"], "tour-container");
            this.tourContainer.style.display = "none";
            document.body.appendChild(this.tourContainer);
            window.addEventListener("resize", () => {
                for (const tour of Tour.ACTIVE_TOURS) {
                    tour._showStep(0);
                }
            });
        }
    }
    /**
     * @method begin
     */
    begin() {
        this.currentStep = 0;
        this.tourContainer.style.display = "block";
        Tour.ACTIVE_TOURS.push(this);
        this._showStep(0);
    }
    /**
     * @method stop
     */
    stop() {
        if (this.useModal) {
            this.tourMask?.remove();
            this.tourMask = undefined;
        }
        this._popover?.destroy();
        const index = Tour.ACTIVE_TOURS.indexOf(this);
        if (index !== -1) {
            Tour.ACTIVE_TOURS.splice(index, 1);
        }
        this.tourContainer.innerHTML = "";
        this.tourContainer.style.display = "none";
    }
    // Show the current step of the tour
    _showStep(stepOffset = 1) {
        this.currentStep += stepOffset;
        const step = this.steps[this.currentStep];
        if (!step) {
            this.stop();
            return;
        }
        const prevStep = this.steps[this.currentStep - 1];
        const nextStep = this.steps[this.currentStep + 1];
        if (this.useModal) {
            this._generateMask(step.reference);
        }
        this._createHighlight(step, prevStep, nextStep);
    }
    // Generate mask for the specific step reference
    // using a fullscreen SVG with "rect" elements
    _generateMask(reference) {
        this.tourContainer.innerHTML = ""; // Clear previous content
        this.tourMask = LX.makeContainer(["100%", "100%"], "tour-mask");
        this.tourContainer.appendChild(this.tourMask);
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.style.width = "100%";
        svg.style.height = "100%";
        this.tourMask?.appendChild(svg);
        const clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
        clipPath.setAttribute("id", "svgTourClipPath");
        svg.appendChild(clipPath);
        function ceilAndShiftRect(p, s) {
            const cp = Math.ceil(p);
            const delta = cp - p;
            const ds = s - delta;
            return [cp, ds];
        }
        const refBounding = reference.getBoundingClientRect();
        const [boundingX, boundingWidth] = ceilAndShiftRect(refBounding.x, refBounding.width);
        const [boundingY, boundingHeight] = ceilAndShiftRect(refBounding.y, refBounding.height);
        const vOffset = this.verticalOffset ?? this.offset;
        const hOffset = this.horizontalOffset ?? this.offset;
        // Left
        {
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", "0");
            rect.setAttribute("y", "0");
            rect.setAttribute("width", `${Math.max(0, boundingX - hOffset)}`);
            rect.setAttribute("height", `${window.innerHeight}`);
            rect.setAttribute("stroke", "none");
            clipPath.appendChild(rect);
        }
        // Top
        {
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", `${boundingX - hOffset}`);
            rect.setAttribute("y", "0");
            rect.setAttribute("width", `${Math.max(0, boundingWidth + hOffset * 2)}`);
            rect.setAttribute("height", `${Math.max(0, boundingY - vOffset)}`);
            rect.setAttribute("stroke", "none");
            clipPath.appendChild(rect);
        }
        // Bottom
        {
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", `${boundingX - hOffset}`);
            rect.setAttribute("y", `${boundingY + boundingHeight + vOffset}`);
            rect.setAttribute("width", `${Math.max(0, boundingWidth + hOffset * 2)}`);
            rect.setAttribute("height", `${Math.max(0, window.innerHeight - boundingY - boundingHeight - vOffset)}`);
            rect.setAttribute("stroke", "none");
            clipPath.appendChild(rect);
        }
        // Right
        {
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", `${boundingX + boundingWidth + hOffset}`);
            rect.setAttribute("y", "0");
            rect.setAttribute("width", `${Math.max(0, window.innerWidth - boundingX - boundingWidth)}`);
            rect.setAttribute("height", `${Math.max(0, window.innerHeight)}`);
            rect.setAttribute("stroke", "none");
            clipPath.appendChild(rect);
        }
        // Reference Highlight
        const refContainer = LX.makeContainer(["0", "0"], "tour-ref-mask");
        refContainer.style.left = `${boundingX - hOffset - 1}px`;
        refContainer.style.top = `${boundingY - vOffset - 1}px`;
        refContainer.style.width = `${boundingWidth + hOffset * 2 + 2}px`;
        refContainer.style.height = `${boundingHeight + vOffset * 2 + 2}px`;
        this.tourContainer.appendChild(refContainer);
        const referenceMask = document.createElementNS("http://www.w3.org/2000/svg", "mask");
        referenceMask.setAttribute("id", "svgTourReferenceMask");
        svg.appendChild(referenceMask);
        // Reference Mask
        {
            const rectWhite = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rectWhite.setAttribute("width", `${boundingWidth + hOffset * 2 + 2}`);
            rectWhite.setAttribute("height", `${boundingHeight + vOffset * 2 + 2}`);
            rectWhite.setAttribute("stroke", "none");
            rectWhite.setAttribute("fill", "white");
            referenceMask.appendChild(rectWhite);
            const rectBlack = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rectBlack.setAttribute("rx", `${this.radius}`);
            rectBlack.setAttribute("width", `${boundingWidth + hOffset * 2 + 2}`);
            rectBlack.setAttribute("height", `${boundingHeight + vOffset * 2 + 2}`);
            rectBlack.setAttribute("stroke", "none");
            rectBlack.setAttribute("fill", "black");
            referenceMask.appendChild(rectBlack);
        }
    }
    // Create the container with the user hints
    _createHighlight(step, previousStep, nextStep) {
        const popoverContainer = LX.makeContainer(["auto", "auto"], "tour-step-container");
        {
            const header = LX.makeContainer(["100%", "auto"], "flex flex-row", "", popoverContainer);
            LX.makeContainer(["70%", "auto"], "p-2 font-medium", step.title, header);
            const closer = LX.makeContainer(["30%", "auto"], "flex flex-row p-2 justify-end", "", header);
            const closeIcon = LX.makeIcon("X");
            closer.appendChild(closeIcon);
            LX.listen(closeIcon, "click", () => {
                this.stop();
            });
        }
        LX.makeContainer(["100%", "auto"], "p-2 text-md", step.content, popoverContainer, { maxWidth: "400px" });
        const footer = LX.makeContainer(["100%", "auto"], "flex flex-row text-md", "", popoverContainer);
        {
            const footerSteps = LX.makeContainer(["50%", "auto"], "p-2 gap-1 self-center flex flex-row text-md", "", footer);
            for (let i = 0; i < this.steps.length; i++) {
                const stepIndicator = document.createElement("span");
                stepIndicator.className = "tour-step-indicator";
                if (i === this.currentStep) {
                    stepIndicator.classList.add("active");
                }
                footerSteps.appendChild(stepIndicator);
            }
        }
        const footerButtons = LX.makeContainer(["50%", "auto"], "text-md", "", footer);
        const footerPanel = new Panel();
        let numButtons = 1;
        if (previousStep) {
            numButtons++;
        }
        if (numButtons > 1) {
            footerPanel.sameLine(2, "justify-end");
        }
        if (previousStep) {
            footerPanel.addButton(null, "Previous", () => {
                this._showStep(-1);
            }, { buttonClass: "contrast" });
        }
        if (nextStep) {
            footerPanel.addButton(null, "Next", () => {
                this._showStep(1);
            }, { buttonClass: "accent" });
        }
        else {
            footerPanel.addButton(null, "Finish", () => {
                this.stop();
            });
        }
        footerButtons.appendChild(footerPanel.root);
        const sideOffset = (step.side === "left" || step.side === "right" ? this.horizontalOffset : this.verticalOffset) ?? this.offset;
        const alignOffset = (step.align === "start" || step.align === "end" ? sideOffset : 0);
        this._popover?.destroy();
        this._popover = new Popover(null, [popoverContainer], {
            reference: step.reference,
            side: step.side,
            align: step.align,
            sideOffset,
            alignOffset: step.align === "start" ? -alignOffset : alignOffset,
        });
    }
}
LX.Tour = Tour;

// Sheet.ts @jxarco
/**
 * @class Sheet
 */
class Sheet {
    side = "left";
    root;
    _onClick;
    constructor(size, content, options = {}) {
        this.side = options.side ?? this.side;
        this.root = document.createElement("div");
        this.root.dataset["side"] = this.side;
        this.root.tabIndex = "1";
        this.root.role = "dialog";
        this.root.className = "lexsheet fixed z-1000 bg-primary";
        document.body.appendChild(this.root);
        this.root.addEventListener("keydown", (e) => {
            if (e.key == "Escape") {
                e.preventDefault();
                e.stopPropagation();
                this.destroy();
            }
        });
        if (content) {
            content = [].concat(content);
            content.forEach((e) => {
                const domNode = e.root ?? e;
                this.root.appendChild(domNode);
                if (e.onSheet) {
                    e.onSheet();
                }
            });
        }
        LX.doAsync(() => {
            LX.modal.toggle(false);
            switch (this.side) {
                case "left":
                    this.root.style.left = "0";
                    this.root.style.width = size;
                    this.root.style.height = "100%";
                    break;
                case "right":
                    this.root.style.right = "0";
                    this.root.style.width = size;
                    this.root.style.height = "100%";
                    break;
                case "top":
                    this.root.style.left = "0";
                    this.root.style.top = "0";
                    this.root.style.width = "100%";
                    this.root.style.height = size;
                    break;
                case "bottom":
                    this.root.style.left = "0";
                    this.root.style.bottom = "0";
                    this.root.style.width = "100%";
                    this.root.style.height = size;
                    break;
            }
            document.documentElement.setAttribute("data-scale", `sheet-${this.side}`);
            this.root.focus();
            this._onClick = (e) => {
                if (e.target && (this.root.contains(e.target))) {
                    return;
                }
                this.destroy();
            };
            document.body.addEventListener("mousedown", this._onClick, true);
            document.body.addEventListener("focusin", this._onClick, true);
        }, 10);
    }
    destroy() {
        document.documentElement.setAttribute("data-scale", "");
        document.body.removeEventListener("mousedown", this._onClick, true);
        document.body.removeEventListener("focusin", this._onClick, true);
        this.root.remove();
        LX.modal.toggle(true);
    }
}
LX.Sheet = Sheet;

// Dialog.ts @jxarco
/**
 * @class Dialog
 */
class Dialog {
    static _last_id = 0;
    id;
    root;
    panel;
    title;
    size = [];
    branchData;
    close = () => { };
    _oncreate;
    constructor(title, callback, options = {}) {
        if (!callback) {
            console.warn("Content is empty, add some components using 'callback' parameter!");
        }
        this._oncreate = callback;
        this.id = LX.guidGenerator();
        const size = options.size ?? [], position = options.position ?? [], draggable = options.draggable ?? true, dockable = options.dockable ?? false, modal = options.modal ?? false;
        let root = document.createElement('dialog');
        root.className = "lexdialog " + (options.className ?? "");
        root.id = options.id ?? "dialog" + Dialog._last_id++;
        root.dataset["modal"] = modal;
        LX.root.appendChild(root);
        LX.doAsync(() => {
            modal ? root.showModal() : root.show();
        }, 10);
        let that = this;
        const titleDiv = document.createElement('div');
        if (title) {
            titleDiv.className = "lexdialogtitle";
            titleDiv.innerHTML = title;
            titleDiv.setAttribute("draggable", "false");
            root.appendChild(titleDiv);
        }
        if (options.closable ?? true) {
            this.close = () => {
                if (options.onBeforeClose) {
                    options.onBeforeClose(this);
                }
                if (!options.onclose) {
                    root.close();
                    LX.doAsync(() => {
                        that.panel.clear();
                        root.remove();
                    }, 150);
                }
                else {
                    options.onclose(this.root);
                }
            };
            const closeButton = LX.makeIcon("X", { title: "Close", iconClass: "lexdialogcloser" });
            closeButton.addEventListener("click", this.close);
            const dockButton = LX.makeIcon("Minus", { title: "Dock", iconClass: "ml-auto mr-2" });
            dockButton.addEventListener("click", () => {
                const data = this.branchData;
                const panel = data.panel;
                const panelChildCount = panel.root.childElementCount;
                const branch = panel.branch(data.name, { closed: data.closed });
                branch.components = data.components;
                for (let w of branch.components) {
                    branch.content.appendChild(w.root);
                }
                if (data.childIndex < panelChildCount) {
                    panel.root.insertChildAtIndex(branch.root, data.childIndex);
                }
                this.close();
            });
            if (title) {
                if (dockable)
                    titleDiv.appendChild(dockButton);
                titleDiv.appendChild(closeButton);
            }
            else {
                closeButton.classList.add("notitle");
                root.appendChild(closeButton);
            }
        }
        const panel = new LX.Panel();
        panel.root.classList.add("lexdialogcontent");
        if (!title) {
            panel.root.classList.add("notitle");
        }
        if (callback) {
            callback.call(this, panel);
        }
        root.appendChild(panel.root);
        // Make branches have a distintive to manage some cases
        panel.root.querySelectorAll(".lexbranch").forEach((b) => b.classList.add("dialog"));
        this.panel = panel;
        this.root = root;
        this.title = titleDiv;
        if (draggable) {
            LX.makeDraggable(root, Object.assign({ targetClass: 'lexdialogtitle' }, options));
        }
        // Process position and size
        if (size.length && typeof (size[0]) != "string") {
            size[0] += "px";
        }
        if (size.length && typeof (size[1]) != "string") {
            size[1] += "px";
        }
        root.style.width = size[0] ? (size[0]) : "25%";
        root.style.height = size[1] ? (size[1]) : "auto";
        root.style.translate = options.position ? "unset" : "-50% -50%";
        if (options.size) {
            this.size = size;
        }
        root.style.left = position[0] ?? "50%";
        root.style.top = position[1] ?? "50%";
        panel.root.style.height = title ? "calc( 100% - " + (titleDiv.offsetHeight + 30) + "px )" : "calc( 100% - 51px )";
    }
    destroy() {
        this.root.remove();
    }
    refresh() {
        this.panel.root.innerHTML = "";
        this._oncreate.call(this, this.panel);
    }
    setPosition(x, y) {
        this.root.style.left = `${x}px`;
        this.root.style.top = `${y}px`;
    }
    setTitle(title) {
        const titleDOM = this.root.querySelector('.lexdialogtitle');
        if (!titleDOM) {
            return;
        }
        titleDOM.innerText = title;
    }
}
LX.Dialog = Dialog;

// PocketDialog.ts @jxarco
/**
 * @class PocketDialog
 */
class PocketDialog extends Dialog {
    static TOP = 0;
    static BOTTOM = 1;
    dockPosition = PocketDialog.TOP;
    minimized = false;
    constructor(title, callback, options = {}) {
        options.draggable = options.draggable ?? false;
        options.closable = options.closable ?? false;
        const dragMargin = 3;
        super(title, callback, options);
        let that = this;
        // Update margins on branch title closes/opens
        LX.addSignal("@on_branch_closed", this.panel, (closed) => {
            if (this.dockPosition == PocketDialog.BOTTOM) {
                this.root.style.top = `calc(100% - ${this.root.offsetHeight + dragMargin}px)`;
            }
        });
        // Custom
        this.root.classList.add("pocket");
        this.root.style.translate = "none";
        this.root.style.top = "0";
        this.root.style.left = "unset";
        if (!options.position) {
            this.root.style.right = dragMargin + "px";
            this.root.style.top = dragMargin + "px";
        }
        this.panel.root.style.width = "100%";
        this.panel.root.style.height = "100%";
        const innerTitle = this.title;
        innerTitle.tabIndex = -1;
        innerTitle.addEventListener("click", (e) => {
            if (innerTitle.eventCatched) {
                innerTitle.eventCatched = false;
                return;
            }
            // Sized dialogs have to keep their size
            if (this.size) {
                if (!this.minimized)
                    this.root.style.height = "auto";
                else
                    this.root.style.height = this.size[1];
            }
            this.root.classList.toggle("minimized");
            this.minimized = !this.minimized;
            if (this.dockPosition == PocketDialog.BOTTOM) {
                that.root.style.top = this.root.classList.contains("minimized") ?
                    `calc(100% - ${that.title.offsetHeight + 6}px)` : `calc(100% - ${that.root.offsetHeight + dragMargin}px)`;
            }
        });
        if (!options.draggable) {
            const float = options.float;
            if (float) {
                for (let i = 0; i < float.length; i++) {
                    const t = float[i];
                    switch (t) {
                        case 'b':
                            this.root.style.top = `calc(100% - ${this.root.offsetHeight + dragMargin}px)`;
                            break;
                        case 'l':
                            this.root.style.right = "unset";
                            this.root.style.left = options.position ? options.position[1] : (`${dragMargin}px`);
                            break;
                    }
                }
            }
            this.root.classList.add("dockable");
            innerTitle.addEventListener("keydown", function (e) {
                if (!e.ctrlKey) {
                    return;
                }
                that.root.style.right = "unset";
                if (e.key == 'ArrowLeft') {
                    that.root.style.left = '0px';
                }
                else if (e.key == 'ArrowRight') {
                    that.root.style.left = `calc(100% - ${that.root.offsetWidth + dragMargin}px)`;
                }
                else if (e.key == 'ArrowUp') {
                    that.root.style.top = "0px";
                    that.dockPosition = PocketDialog.TOP;
                }
                else if (e.key == 'ArrowDown') {
                    that.root.style.top = `calc(100% - ${that.root.offsetHeight + dragMargin}px)`;
                    that.dockPosition = PocketDialog.BOTTOM;
                }
            });
        }
    }
}
LX.PocketDialog = PocketDialog;

// Footer.ts @jxarco
/**
 * @class Footer
 */
class Footer {
    /**
     * @param {Object} options:
     * columns: Array with data per column { title, items: [ { title, link } ]  }
     * credits: html string
     * socials: Array with data per item { title, link, icon }
     * className: Extra class to customize
    */
    root;
    constructor(options = {}) {
        const root = document.createElement("footer");
        root.className = "lexfooter" + ` ${options.className ?? ""}`;
        const wrapper = document.createElement("div");
        wrapper.style.minHeight = "48px";
        wrapper.className = "w-full";
        root.appendChild(wrapper);
        // const hr = document.createElement( "hr" );
        // wrapper.appendChild( hr );
        if (options.columns && options.columns.constructor == Array) {
            const cols = document.createElement("div");
            cols.className = "columns";
            cols.style.gridTemplateColumns = "1fr ".repeat(options.columns.length);
            wrapper.appendChild(cols);
            for (let col of options.columns) {
                const colDom = document.createElement("div");
                colDom.className = "col";
                cols.appendChild(colDom);
                const colTitle = document.createElement("h2");
                colTitle.innerHTML = col.title;
                colDom.appendChild(colTitle);
                if (!col.items || !col.items.length) {
                    continue;
                }
                const itemListDom = document.createElement("ul");
                colDom.appendChild(itemListDom);
                for (let item of col.items) {
                    const itemDom = document.createElement("li");
                    itemDom.innerHTML = `<a class="" href="${item.link}">${item.title}</a>`;
                    itemListDom.appendChild(itemDom);
                }
            }
        }
        if (options.credits || options.socials) {
            const creditsSocials = document.createElement("div");
            creditsSocials.className = "credits-and-socials";
            wrapper.appendChild(creditsSocials);
            if (options.credits) {
                const credits = document.createElement("p");
                credits.innerHTML = options.credits;
                creditsSocials.appendChild(credits);
            }
            if (options.socials) {
                const socials = document.createElement("div");
                socials.className = "socials flex flex-row gap-1 my-2 justify-end";
                for (let social of options.socials) {
                    const socialIcon = LX.makeIcon(social.icon, { title: social.title, svgClass: "xl" });
                    socialIcon.href = social.link;
                    socialIcon.target = "_blank";
                    socials.appendChild(socialIcon);
                }
                creditsSocials.appendChild(socials);
            }
        }
        // Append directly to body
        const parent = options.parent ?? document.body;
        parent.appendChild(root);
        // Set always at bottom
        if (root.previousElementSibling) {
            root.previousElementSibling.style.flexGrow = "1";
        }
        this.root = root;
    }
}
LX.Footer = Footer;

// Core.ts @jxarco
/**
 * @method init
 * @param {Object} options
 * autoTheme: Use theme depending on browser-system default theme [true]
 * container: Root location for the gui (default is the document body)
 * id: Id of the main area
 * rootClass: Extra class to the root container
 * skipRoot: Skip adding LX root container
 * skipDefaultArea: Skip creation of main area
 * layoutMode: Sets page layout mode (document | app)
 * spacingMode: Sets page layout spacing mode (default | compact)
 */
LX.init = async function (options = {}) {
    if (this.ready) {
        return this.mainArea;
    }
    await LX.loadScriptSync("https://unpkg.com/lucide@latest");
    // LexGUI root
    console.log(`LexGUI v${this.version}`);
    var root = document.createElement('div');
    root.id = "lexroot";
    root.className = "lexcontainer";
    root.tabIndex = -1;
    if (options.rootClass) {
        root.className += ` ${options.rootClass}`;
    }
    this.modal = document.createElement('div');
    this.modal.id = "modal";
    this.modal.classList.add('hidden-opacity');
    this.modal.toggle = function (force) { this.classList.toggle('hidden-opacity', force); };
    this.root = root;
    this.container = document.body;
    if (options.container) {
        this.container = options.container.constructor === String ? document.getElementById(options.container) : options.container;
    }
    this.layoutMode = options.layoutMode ?? "app";
    document.documentElement.setAttribute("data-layout", this.layoutMode);
    if (this.layoutMode == "document") ;
    this.spacingMode = options.spacingMode ?? "default";
    document.documentElement.setAttribute("data-spacing", this.spacingMode);
    this.container.appendChild(this.modal);
    if (!options.skipRoot) {
        this.container.appendChild(root);
    }
    else {
        this.root = document.body;
    }
    // Notifications
    {
        const notifSection = document.createElement("section");
        notifSection.className = "notifications";
        this.notifications = document.createElement("ol");
        this.notifications.className = "";
        this.notifications.iWidth = 0;
        notifSection.appendChild(this.notifications);
        document.body.appendChild(notifSection);
        this.notifications.addEventListener("mouseenter", () => {
            this.notifications.classList.add("list");
        });
        this.notifications.addEventListener("mouseleave", () => {
            this.notifications.classList.remove("list");
        });
    }
    // Disable drag icon
    root.addEventListener('dragover', function (e) {
        e.preventDefault();
    }, false);
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
    }, false);
    // Global vars
    this.DEFAULT_NAME_WIDTH = "30%";
    this.DEFAULT_SPLITBAR_SIZE = 4;
    this.OPEN_CONTEXTMENU_ENTRY = 'click';
    this.componentResizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            const c = entry.target?.jsInstance;
            if (c && c.onResize) {
                c.onResize(entry.contentRect);
            }
        }
    });
    this.ready = true;
    this.menubars = [];
    this.sidebars = [];
    this.commandbar = this._createCommandbar(this.container);
    if (!options.skipRoot && !options.skipDefaultArea) {
        this.mainArea = new Area({ id: options.id ?? 'mainarea' });
    }
    // Initial or automatic changes don't force color scheme
    // to be stored in localStorage
    this._onChangeSystemTheme = function (event) {
        const storedcolorScheme = localStorage.getItem("lxColorScheme");
        if (storedcolorScheme)
            return;
        LX.setTheme(event.matches ? "dark" : "light", false);
    };
    this._mqlPrefersDarkScheme = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    const storedcolorScheme = localStorage.getItem("lxColorScheme");
    if (storedcolorScheme) {
        LX.setTheme(storedcolorScheme);
    }
    else if (this._mqlPrefersDarkScheme && (options.autoTheme ?? true)) {
        if (window.matchMedia("(prefers-color-scheme: light)").matches) {
            LX.setTheme("light", false);
        }
        this._mqlPrefersDarkScheme.addEventListener("change", this._onChangeSystemTheme);
    }
    return this.mainArea;
},
    /**
     * @method setSpacingMode
     * @param {String} mode: "default" | "compact"
     */
    LX.setSpacingMode = function (mode) {
        this.spacingMode = mode;
        document.documentElement.setAttribute("data-spacing", this.spacingMode);
    },
    /**
     * @method setLayoutMode
     * @param {String} mode: "app" | "document"
     */
    LX.setLayoutMode = function (mode) {
        this.layoutMode = mode;
        document.documentElement.setAttribute("data-layout", this.layoutMode);
    },
    /**
     * @method addSignal
     * @param {String} name
     * @param {Object} obj
     * @param {Function} callback
     */
    LX.addSignal = function (name, obj, callback) {
        obj[name] = callback;
        if (!LX.signals[name]) {
            LX.signals[name] = [];
        }
        if (LX.signals[name].indexOf(obj) > -1) {
            return;
        }
        LX.signals[name].push(obj);
    },
    /**
     * @method emitSignal
     * @param {String} name
     * @param {*} value
     * @param {Object} options
     */
    LX.emitSignal = function (name, value, options = {}) {
        const data = LX.signals[name];
        if (!data) {
            return;
        }
        const target = options.target;
        if (target) {
            if (target[name]) {
                target[name].call(target, value);
            }
            return;
        }
        for (let obj of data) {
            if (obj instanceof BaseComponent) {
                obj.set(value, options.skipCallback ?? true);
            }
            else if (obj.constructor === Function) {
                const fn = obj;
                fn(null, value);
            }
            else {
                // This is an element
                const fn = obj[name];
                console.assert(fn, `No callback registered with _${name}_ signal`);
                fn.bind(obj)(value);
            }
        }
    };
// Command bar creation
LX._createCommandbar = function (root) {
    let commandbar = document.createElement("dialog");
    commandbar.className = "commandbar";
    commandbar.tabIndex = -1;
    root.appendChild(commandbar);
    let allItems = [];
    let hoverElId = null;
    commandbar.addEventListener('keydown', function (e) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        hoverElId = hoverElId ?? -1;
        if (e.key == 'Escape') {
            commandbar.close();
            _resetBar(true);
        }
        else if (e.key == 'Enter') {
            const el = allItems[hoverElId];
            if (el) {
                if (el.item.checked != undefined) {
                    el.item.checked = !el.item.checked;
                }
                commandbar.close();
                el.callback.call(window, el.item.name, el.item.checked);
            }
        }
        else if (e.key == 'ArrowDown' && hoverElId < (allItems.length - 1)) {
            hoverElId++;
            commandbar.querySelectorAll(".hovered").forEach((e) => e.classList.remove('hovered'));
            const el = allItems[hoverElId];
            el.classList.add('hovered');
            let dt = el.offsetHeight * (hoverElId + 1) - itemContainer.offsetHeight;
            if (dt > 0) {
                itemContainer.scrollTo({
                    top: dt,
                    behavior: "smooth",
                });
            }
        }
        else if (e.key == 'ArrowUp' && hoverElId > 0) {
            hoverElId--;
            commandbar.querySelectorAll(".hovered").forEach((e) => e.classList.remove('hovered'));
            const el = allItems[hoverElId];
            el.classList.add('hovered');
        }
    });
    commandbar.addEventListener('focusout', function (e) {
        if (e.relatedTarget == e.currentTarget) {
            return;
        }
        e.stopPropagation();
        e.stopImmediatePropagation();
        commandbar.close();
        _resetBar(true);
    });
    root.addEventListener('keydown', (e) => {
        if (e.key == ' ' && e.ctrlKey) {
            e.stopImmediatePropagation();
            e.stopPropagation();
            LX.setCommandbarState(true);
        }
        else {
            for (let c of LX.extensions) {
                if (!LX[c] || !LX[c].prototype.onKeyPressed) {
                    continue;
                }
                const instances = LX.CodeEditor.getInstances();
                for (let i of instances) {
                    i.onKeyPressed(e);
                }
            }
        }
    });
    const header = LX.makeContainer(["100%", "auto"], "flex flex-row");
    const filter = new TextInput(null, "", (v) => {
        commandbar._addElements(v.toLowerCase());
    }, { width: "100%", icon: "Search", trigger: "input", placeholder: "Search..." });
    header.appendChild(filter.root);
    const tabArea = new Area({
        width: "100%",
        skipAppend: true,
        className: "cb-tabs"
    });
    const cbTabs = tabArea.addTabs({ parentClass: "p-2" });
    // These tabs will serve as buttons by now
    // Filter stuff depending of the type of search
    {
        const _onSelectTab = (e, tabName) => {
        };
        cbTabs.add("All", document.createElement('div'), { selected: true, onSelect: _onSelectTab });
        // cbTabs.add( "Main", document.createElement('div'), { onSelect: _onSelectTab } );
    }
    const itemContainer = document.createElement("div");
    itemContainer.className = "searchitembox";
    let refPrevious = null;
    const _resetBar = (resetInput) => {
        itemContainer.innerHTML = "";
        allItems.length = 0;
        hoverElId = null;
        if (resetInput) {
            filter.set("", true);
        }
    };
    const _addElement = (t, c, p, i) => {
        if (!t.length) {
            return;
        }
        if (refPrevious)
            refPrevious.classList.remove('last');
        let searchItem = document.createElement("div");
        searchItem.className = "searchitem last";
        if (i?.checked !== undefined) {
            const iconHtml = i.checked ? LX.makeIcon("Check").innerHTML : "";
            searchItem.innerHTML = iconHtml + (p + t);
        }
        else {
            searchItem.innerHTML = (p + t);
        }
        searchItem.callback = c;
        searchItem.item = i;
        searchItem.addEventListener('click', (e) => {
            if (i.checked != undefined) {
                i.checked = !i.checked;
            }
            c.call(window, t, i.checked);
            LX.setCommandbarState(false);
            _resetBar(true);
        });
        searchItem.addEventListener('mouseenter', function (e) {
            commandbar.querySelectorAll(".hovered").forEach((e) => e.classList.remove('hovered'));
            searchItem.classList.add('hovered');
            hoverElId = allItems.indexOf(searchItem);
        });
        searchItem.addEventListener('mouseleave', function (e) {
            searchItem.classList.remove('hovered');
        });
        allItems.push(searchItem);
        itemContainer.appendChild(searchItem);
        refPrevious = searchItem;
    };
    const _propagateAdd = (item, filter, path, skipPropagation) => {
        if (!item || (item.constructor != Object)) {
            return;
        }
        let name = item.name;
        if (name.toLowerCase().includes(filter)) {
            if (item.callback) {
                _addElement(name, item.callback, path, item);
            }
        }
        const submenu = item.submenu ?? item[name];
        if (!submenu) {
            return;
        }
        const icon = LX.makeIcon("ChevronRight", { svgClass: "sm fg-secondary separator" });
        path += name + icon.innerHTML;
        for (let c of submenu) {
            _propagateAdd(c, filter, path);
        }
    };
    commandbar._addElements = (filter) => {
        _resetBar();
        for (let m of LX.menubars) {
            for (let i of m.items) {
                _propagateAdd(i, filter, "");
            }
        }
        for (let m of LX.sidebars) {
            for (let i of m.items) {
                _propagateAdd(i, filter, "");
            }
        }
        for (let entry of LX.extraCommandbarEntries) {
            const name = entry.name;
            if (!name.toLowerCase().includes(filter)) {
                continue;
            }
            _addElement(name, entry.callback, "", {});
        }
        if (LX.has('CodeEditor')) {
            const instances = LX.CodeEditor.getInstances();
            if (!instances.length || !instances[0].area.root.offsetHeight)
                return;
            const languages = LX.CodeEditor.languages;
            for (let l of Object.keys(languages)) {
                const key = "Language: " + l;
                const icon = instances[0]._getFileIcon(null, languages[l].ext);
                const classes = icon.split(' ');
                let value = LX.makeIcon(classes[0], { svgClass: `${classes.slice(0).join(' ')}` }).innerHTML;
                value += key + " <span class='lang-ext'>(" + languages[l].ext + ")</span>";
                if (key.toLowerCase().includes(filter)) {
                    _addElement(value, () => {
                        for (let i of instances) {
                            i._changeLanguage(l);
                        }
                    }, "", {});
                }
            }
        }
    };
    commandbar.appendChild(header);
    commandbar.appendChild(tabArea.root);
    commandbar.appendChild(itemContainer);
    return commandbar;
};
/**
 * @method setCommandbarState
 * @param {Boolean} value
 * @param {Boolean} resetEntries
 */
LX.setCommandbarState = function (value, resetEntries = true) {
    const cb = this.commandbar;
    if (value) {
        cb.show();
        cb.querySelector('input').focus();
        if (resetEntries) {
            cb._addElements(undefined);
        }
    }
    else {
        cb.close();
    }
};
LX.REGISTER_COMPONENT = function (customComponentName, options = {}) {
    let customIdx = LX.guidGenerator();
    const PanelPrototype = Panel.prototype;
    PanelPrototype['add' + customComponentName] = function (name, instance, callback) {
        const userParams = Array.from(arguments).slice(3);
        let component = new BaseComponent(ComponentType.CUSTOM, name, null, options);
        this._attachComponent(component);
        component.customName = customComponentName;
        component.customIdx = customIdx;
        component.onGetValue = () => {
            return instance;
        };
        component.onSetValue = (newValue, skipCallback, event) => {
            instance = newValue;
            _refreshComponent();
            element.querySelector(".lexcustomitems").toggleAttribute('hidden', false);
            if (!skipCallback) {
                component._trigger(new IEvent(name, instance, event), callback);
            }
        };
        component.onResize = () => {
            const realNameWidth = (component.root.domName?.style.width ?? "0px");
            container.style.width = `calc( 100% - ${realNameWidth})`;
        };
        const element = component.root;
        let container, customComponentsDom;
        let defaultInstance = options.default ?? {};
        // Add instance button
        const _refreshComponent = () => {
            if (container)
                container.remove();
            if (customComponentsDom)
                customComponentsDom.remove();
            container = document.createElement('div');
            container.className = "lexcustomcontainer w-full";
            element.appendChild(container);
            element.dataset["opened"] = false;
            const customIcon = LX.makeIcon(options.icon ?? "Box");
            const menuIcon = LX.makeIcon("Menu");
            let buttonName = customComponentName + (!instance ? " [empty]" : "");
            let buttonEl = this.addButton(null, buttonName, (value, event) => {
                if (instance) {
                    element.querySelector(".lexcustomitems").toggleAttribute('hidden');
                    element.dataset["opened"] = !element.querySelector(".lexcustomitems").hasAttribute("hidden");
                }
                else {
                    LX.addContextMenu(null, event, (c) => {
                        c.add("New " + customComponentName, () => {
                            instance = {};
                            _refreshComponent();
                            element.querySelector(".lexcustomitems").toggleAttribute('hidden', false);
                            element.dataset["opened"] = !element.querySelector(".lexcustomitems").hasAttribute("hidden");
                        });
                    });
                }
            }, { buttonClass: 'custom' });
            const buttonSpan = buttonEl.root.querySelector("span");
            buttonSpan.prepend(customIcon);
            buttonSpan.appendChild(menuIcon);
            container.appendChild(buttonEl.root);
            if (instance) {
                menuIcon.addEventListener("click", (e) => {
                    e.stopImmediatePropagation();
                    e.stopPropagation();
                    LX.addContextMenu(null, e, (c) => {
                        c.add("Clear", () => {
                            instance = null;
                            _refreshComponent();
                        });
                    });
                });
            }
            // Show elements
            customComponentsDom = document.createElement('div');
            customComponentsDom.className = "lexcustomitems";
            customComponentsDom.toggleAttribute('hidden', true);
            element.appendChild(customComponentsDom);
            if (instance) {
                this.queue(customComponentsDom);
                const on_instance_changed = (key, value, event) => {
                    const setter = options[`_set_${key}`];
                    if (setter) {
                        setter.call(instance, value);
                    }
                    else {
                        instance[key] = value;
                    }
                    component._trigger(new IEvent(name, instance, event), callback);
                };
                for (let key in defaultInstance) {
                    let value = null;
                    const getter = options[`_get_${key}`];
                    if (getter) {
                        value = instance[key] ? getter.call(instance) : getter.call(defaultInstance);
                    }
                    else {
                        value = instance[key] ?? defaultInstance[key];
                    }
                    if (!value) {
                        continue;
                    }
                    switch (value.constructor) {
                        case String:
                            if (value[0] === '#') {
                                this.addColor(key, value, on_instance_changed.bind(this, key));
                            }
                            else {
                                this.addText(key, value, on_instance_changed.bind(this, key));
                            }
                            break;
                        case Number:
                            this.addNumber(key, value, on_instance_changed.bind(this, key));
                            break;
                        case Boolean:
                            this.addCheckbox(key, value, on_instance_changed.bind(this, key));
                            break;
                        case Array:
                            if (value.length > 4) {
                                this.addArray(key, value, on_instance_changed.bind(this, key));
                            }
                            else {
                                this._addVector(value.length, key, value, on_instance_changed.bind(this, key));
                            }
                            break;
                        default:
                            console.warn(`Unsupported property type: ${value.constructor.name}`);
                            break;
                    }
                }
                if (options.onCreate) {
                    options.onCreate.call(this, this, ...userParams);
                }
                this.clearQueue();
            }
        };
        _refreshComponent();
    };
};

export { Area, AreaOverlayButtons, ArrayInput, BaseComponent, Branch, Button, Checkbox, ColorInput, ComboButtons, ComponentType, ContextMenu, Counter, Curve, DatePicker, Dial, Dialog, DropdownMenu, FileInput, Footer, Form, IEvent, LX, Layers, List, Map2D, NodeTree, NumberInput, OTPInput, Pad, Panel, PocketDialog, Popover, Progress, RadioGroup, RangeInput, Rate, Select, Sheet, Sidebar, SizeInput, Skeleton, Spinner, TabSections, Table, Tabs, Tags, TextArea, TextInput, Title, Toggle, Tour, Tree, TreeEvent, Vector, addDropdownMenu, vec2 };
//# sourceMappingURL=lexgui.module.js.map
