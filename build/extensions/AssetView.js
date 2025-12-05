// This is a generated file. Do not edit.
import { LX } from '../core/Namespace.js';

// AssetView.ts @jxarco
if (!LX) {
    throw ("Missing LX namespace!");
}
LX.extensions.push('AssetView');
const Area = LX.Area;
LX.Panel;
LX.NodeTree;
LX.TreeEvent;
class AssetViewEvent {
    static NONE = 0;
    static ASSET_SELECTED = 1;
    static ASSET_DELETED = 2;
    static ASSET_RENAMED = 3;
    static ASSET_CLONED = 4;
    static ASSET_DBLCLICKED = 5;
    static ASSET_CHECKED = 6;
    static ASSET_MOVED = 7;
    static ENTER_FOLDER = 8;
    type;
    item;
    value;
    multiple = false; // Multiple selection
    constructor(type, item, value) {
        this.type = type || LX.TreeEvent.NONE;
        this.item = item;
        this.value = value;
    }
    string() {
        switch (this.type) {
            case AssetViewEvent.NONE: return "assetview_event_none";
            case AssetViewEvent.ASSET_SELECTED: return "assetview_event_selected";
            case AssetViewEvent.ASSET_DELETED: return "assetview_event_deleted";
            case AssetViewEvent.ASSET_RENAMED: return "assetview_event_renamed";
            case AssetViewEvent.ASSET_CLONED: return "assetview_event_cloned";
            case AssetViewEvent.ASSET_DBLCLICKED: return "assetview_event_dblclicked";
            case AssetViewEvent.ASSET_CHECKED: return "assetview_event_checked";
            case AssetViewEvent.ASSET_MOVED: return "assetview_event_moved";
            case AssetViewEvent.ENTER_FOLDER: return "assetview_event_enter_folder";
        }
    }
}
LX.AssetViewEvent = AssetViewEvent;
/**
 * @class AssetView
 * @description Asset container with Tree for file system
 */
class AssetView {
    static LAYOUT_GRID = 0;
    static LAYOUT_COMPACT = 1;
    static LAYOUT_LIST = 2;
    static CONTENT_SORT_ASC = 0;
    static CONTENT_SORT_DESC = 1;
    root;
    area = null;
    content; // "!" to avoid TS strict property initialization error
    leftPanel = null;
    toolsPanel;
    contentPanel;
    previewPanel;
    tree = null;
    prevData = [];
    nextData = [];
    data = [];
    currentData = [];
    currentFolder;
    path = [];
    rootPath = "";
    selectedItem = null;
    allowedTypes;
    searchValue = "";
    filter = "None";
    gridScale = 1.0;
    // Options
    layout = AssetView.LAYOUT_GRID;
    sortMode = AssetView.CONTENT_SORT_ASC;
    skipBrowser = false;
    skipPreview = false;
    useNativeTitle = false;
    onlyFolders = true;
    allowMultipleSelection = false;
    previewActions = [];
    contextMenu = [];
    onRefreshContent = null;
    itemContextMenuOptions = null;
    onItemDragged = null;
    onevent = null;
    _assetsPerPage = 24;
    get assetsPerPage() { return this._assetsPerPage; }
    set assetsPerPage(v) { this._setAssetsPerPage(v); }
    _lastSortBy = "";
    _paginator;
    _scriptCodeDialog;
    constructor(options = {}) {
        this.rootPath = "https://raw.githubusercontent.com/jxarco/lexgui.js/master/";
        this.layout = options.layout ?? this.layout;
        this.sortMode = options.sortMode ?? this.sortMode;
        if (options.rootPath) {
            if (options.rootPath.constructor !== String) {
                console.warn(`Asset Root Path must be a String (now is a ${options.rootPath.constructor.name})`);
            }
            else {
                this.rootPath = options.rootPath;
            }
        }
        let div = document.createElement('div');
        div.className = 'lexassetbrowser';
        this.root = div;
        let area = new Area({ width: "100%", height: "100%" });
        div.appendChild(area.root);
        let left, right, contentArea = area;
        this.skipBrowser = options.skipBrowser ?? this.skipBrowser;
        this.skipPreview = options.skipPreview ?? this.skipPreview;
        this.useNativeTitle = options.useNativeTitle ?? this.useNativeTitle;
        this.onlyFolders = options.onlyFolders ?? this.onlyFolders;
        this.allowMultipleSelection = options.allowMultipleSelection ?? this.allowMultipleSelection;
        this.previewActions = options.previewActions ?? [];
        this.itemContextMenuOptions = options.itemContextMenuOptions;
        this.onRefreshContent = options.onRefreshContent;
        this.onItemDragged = options.onItemDragged;
        this.gridScale = options.gridScale ?? this.gridScale;
        if (this.gridScale !== 1.0) {
            const r = document.querySelector(':root');
            r.style.setProperty('--av-grid-scale', this.gridScale);
        }
        // Append temporarily to the dom
        document.body.appendChild(this.root);
        if (!this.skipBrowser) {
            [left, right] = area.split({ type: "horizontal", sizes: ["15%", "85%"] });
            contentArea = right;
            left.setLimitBox(210, 0);
            right.setLimitBox(512, 0);
        }
        if (!this.skipPreview) {
            [contentArea, right] = contentArea.split({ type: "horizontal", sizes: ["80%", "20%"] });
        }
        this.allowedTypes = {
            "None": {},
            "Image": { color: "yellow-500" },
            "JSON": { color: "sky-200" },
            "Video": { color: "indigo-400" },
            ...(options.allowedTypes ?? {})
        };
        this._processData(this.data, null);
        this.currentFolder = null;
        this.currentData = this.data;
        this.path = ['@'];
        if (!this.skipBrowser) {
            this._createTreePanel(left);
        }
        this._createContentPanel(contentArea);
        // Create resource preview panel
        if (!this.skipPreview) {
            this.previewPanel = right.addPanel({ className: 'lexassetcontentpanel', style: { overflow: 'scroll' } });
        }
        // Clean up
        document.body.removeChild(this.root);
    }
    /**
    * @method load
    */
    load(data, onevent) {
        this.prevData.length = 0;
        this.nextData.length = 0;
        this.data = data;
        this._processData(this.data, null);
        this.currentData = this.data;
        this.path = ['@'];
        if (!this.skipBrowser) {
            this.tree.refresh({
                id: '/',
                children: this.data
            });
        }
        this._refreshContent();
        this.onevent = onevent;
    }
    /**
    * @method addItem
    */
    addItem(item, childIndex, updateTree = true) {
        const isListLayout = (this.layout == AssetView.LAYOUT_LIST);
        const isGridLayout = (this.layout == AssetView.LAYOUT_GRID); // default
        const type = item.type.charAt(0).toUpperCase() + item.type.slice(1);
        const extension = LX.getExtension(item.id);
        const isFolder = type === "Folder";
        const that = this;
        let itemEl = document.createElement('li');
        itemEl.className = "lexassetitem " + item.type.toLowerCase();
        itemEl.tabIndex = -1;
        LX.insertChildAtIndex(this.content, itemEl, childIndex);
        const typeColor = this.allowedTypes[type]?.color;
        if (typeColor) {
            // Add type tag
            LX.makeElement('span', `rounded-full w-2 h-2 z-100 flex absolute ml-2 mt-2 bg-${typeColor}`, "", itemEl);
        }
        if (!item.uid) {
            item.uid = LX.guidGenerator();
        }
        if (item.lastModified && !item.lastModifiedDate) {
            item.lastModifiedDate = this._lastModifiedToStringDate(item.lastModified);
        }
        if (!this.useNativeTitle) {
            let desc = document.createElement('span');
            desc.className = 'lexitemdesc';
            desc.id = `floatingTitle_${item.uid}`;
            desc.innerHTML = `File: ${item.id}<br>Type: ${type}`;
            LX.insertChildAtIndex(this.content, desc, childIndex ? childIndex + 1 : undefined);
            itemEl.addEventListener("mousemove", (e) => {
                if (!isGridLayout) {
                    return;
                }
                const target = e.target;
                const dialog = itemEl.closest('dialog');
                const rect = itemEl.getBoundingClientRect();
                const targetRect = target.getBoundingClientRect();
                let localOffsetX = rect.x + e.offsetX;
                let localOffsetY = rect.y + e.offsetY;
                if (dialog) {
                    const dialogRect = dialog.getBoundingClientRect();
                    localOffsetX -= dialogRect.x;
                    localOffsetY -= dialogRect.y;
                }
                if (target.classList.contains("lexassettitle")) {
                    localOffsetY += (targetRect.y - rect.y);
                }
                desc.style.left = (localOffsetX) + "px";
                desc.style.top = (localOffsetY - 36) + "px";
            });
        }
        else {
            itemEl.title = type + ": " + item.id;
        }
        if (this.allowMultipleSelection) {
            let checkbox = document.createElement('input');
            checkbox.type = "checkbox";
            checkbox.className = "lexcheckbox";
            checkbox.checked = item.selected;
            checkbox.addEventListener('change', (e) => {
                item.selected = !item.selected;
                if (this.onevent) {
                    const event = new AssetViewEvent(AssetViewEvent.ASSET_CHECKED, e.shiftKey ? [item] : item);
                    event.multiple = !!e.shiftKey;
                    this.onevent(event);
                }
                e.stopPropagation();
                e.stopImmediatePropagation();
            });
            itemEl.appendChild(checkbox);
        }
        let title = document.createElement('span');
        title.className = "lexassettitle";
        title.innerText = item.id;
        itemEl.appendChild(title);
        if (!this.skipPreview) {
            if (item.type === 'video') {
                const itemVideo = LX.makeElement('video', 'absolute left-0 top-0 w-full border-none pointer-events-none', '', itemEl);
                itemVideo.setAttribute('disablePictureInPicture', false);
                itemVideo.setAttribute('disableRemotePlayback', false);
                itemVideo.setAttribute('loop', true);
                itemVideo.setAttribute('async', true);
                itemVideo.style.transition = 'opacity 0.2s ease-out';
                itemVideo.style.opacity = item.preview ? '0' : '1';
                itemVideo.src = item.src;
                itemVideo.volume = item.videoVolume ?? 0.4;
            }
            let preview = null;
            const previewSrc = item.preview ?? item.src;
            const hasImage = previewSrc && ((() => {
                const ext = LX.getExtension(previewSrc.split('?')[0].split('#')[0]); // get final source without url parameters/anchors
                return ext ? ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'avif'].includes(ext.toLowerCase()) : false;
            })()
                || previewSrc.startsWith('data:image/'));
            if (hasImage || isFolder || !isGridLayout) {
                const defaultPreviewPath = `${this.rootPath}images/file.png`;
                const defaultFolderPath = `${this.rootPath}images/folder.png`;
                preview = document.createElement('img');
                let realSrc = item.unknownExtension ? defaultPreviewPath : (isFolder ? defaultFolderPath : previewSrc);
                preview.src = (isGridLayout || isFolder ? realSrc : defaultPreviewPath);
                preview.setAttribute("draggable", "false");
                preview.className = "pointer-events-none";
                itemEl.appendChild(preview);
            }
            else {
                preview = document.createElement('svg');
                preview.className = 'asset-file-preview';
                itemEl.appendChild(preview);
                let textEl = document.createElement('text');
                textEl.innerText = (!extension || extension == item.id) ? item.type.toUpperCase() : (`${extension.toUpperCase()}`); // If no extension, e.g. Clip, use the type...
                preview.appendChild(textEl);
                var newLength = textEl.innerText.length;
                var charsPerLine = 2.5;
                var newEmSize = charsPerLine / newLength;
                var textBaseSize = 64;
                if (newEmSize < 1) {
                    var newFontSize = newEmSize * textBaseSize;
                    textEl.style.fontSize = newFontSize + 'px';
                    preview.style.paddingTop = `calc(50% - ${(textEl.offsetHeight * 0.5 + 10)}px)`;
                }
            }
        }
        // Add item type info
        let itemInfoHtml = type;
        if (isListLayout) {
            if (item.bytesize)
                itemInfoHtml += ` | ${LX.formatBytes(item.bytesize)}`;
            if (item.lastModifiedDate)
                itemInfoHtml += ` | ${item.lastModifiedDate}`;
        }
        LX.makeContainer(['auto', 'auto'], 'lexassetinfo', itemInfoHtml, itemEl);
        itemEl.addEventListener('click', function (e) {
            e.stopImmediatePropagation();
            e.stopPropagation();
            const isDoubleClick = (e.detail == LX.MOUSE_DOUBLE_CLICK);
            if (!isDoubleClick) {
                if (!e.shiftKey) {
                    that.content.querySelectorAll('.lexassetitem').forEach(i => i.classList.remove('selected'));
                }
                this.classList.add('selected');
                that.selectedItem = item;
                if (!that.skipPreview) {
                    that._previewAsset(item);
                }
            }
            else if (isFolder) {
                that._enterFolder(item);
                return;
            }
            if (that.onevent) {
                const event = new AssetViewEvent(isDoubleClick ? AssetViewEvent.ASSET_DBLCLICKED : AssetViewEvent.ASSET_SELECTED, e.shiftKey ? [item] : item);
                event.multiple = !!e.shiftKey;
                that.onevent(event);
            }
        });
        itemEl.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            const multiple = that.content.querySelectorAll('.selected').length;
            const options = [
                {
                    name: (multiple > 1) ? (multiple + " selected") : item.id,
                    icon: LX.makeIcon("CircleSmall", { svgClass: `fill-current fg-${typeColor}` }),
                    className: "text-sm", disabled: true
                },
                null
            ];
            if (multiple <= 1) {
                options.push({ name: "Rename", icon: "TextCursor", callback: that._renameItem.bind(that, item) });
            }
            if (!isFolder) {
                options.push({ name: "Clone", icon: "Copy", callback: that._cloneItem.bind(that, item) });
            }
            options.push({ name: "Move", icon: "FolderInput", callback: that._moveItem.bind(that, item) });
            if (type == "Script" && LX.has("CodeEditor")) {
                options.push({ name: "Open in Editor", icon: "Code", callback: that._openScriptInEditor.bind(that, item) });
            }
            if (that.itemContextMenuOptions) {
                options.push(null);
                for (let o of that.itemContextMenuOptions) {
                    if (!o.name || !o.callback)
                        continue;
                    options.push({ name: o.name, icon: o.icon, callback: o.callback?.bind(that, item) });
                }
            }
            options.push(null, { name: "Delete", icon: "Trash2", className: "fg-error", callback: that._deleteItem.bind(that, item) });
            LX.addClass(that.contentPanel.root, "pointer-events-none");
            LX.addDropdownMenu(e.target, options, { side: "right", align: "start", event: e, onBlur: () => {
                    LX.removeClass(that.contentPanel.root, "pointer-events-none");
                } });
        });
        const onDrop = function (src, target) {
            const targetType = target.type.charAt(0).toUpperCase() + target.type.slice(1);
            if (!(targetType === "Folder") || (src.uid == target.uid)) {
                console.error("[AssetView Error] Cannot drop: Target item is not a folder or target is the dragged element!");
                return;
            }
            // Animate dragged element
            const draggedEl = src.domEl;
            if (draggedEl) {
                draggedEl.classList.add("moving-to-folder");
                // When animation ends, finalize move
                draggedEl.addEventListener("animationend", () => {
                    draggedEl.classList.remove("moving-to-folder");
                    that._moveItemToFolder(src, target);
                    that._refreshContent();
                }, { once: true });
            }
            if (that.onevent) {
                const event = new AssetViewEvent(AssetViewEvent.ASSET_MOVED, src, target);
                that.onevent(event);
            }
        };
        itemEl.addEventListener("dragstart", (e) => {
            window.__av_item_dragged = item;
            var img = new Image();
            img.src = '';
            if (e.dataTransfer) {
                e.dataTransfer.setDragImage(img, 0, 0);
                e.dataTransfer.effectAllowed = "move";
            }
            const desc = that.content.querySelector(`#floatingTitle_${item.uid}`);
            if (desc)
                desc.style.display = "none";
        }, false);
        itemEl.addEventListener("dragend", (e) => {
            e.preventDefault(); // Prevent default action (open as link for some elements)
            let dragged = window.__av_item_dragged;
            if (dragged && dragged._nodeTarget) // We dropped into a NodeTree element
             {
                onDrop(dragged, dragged._nodeTarget);
            }
            delete window.__av_item_dragged;
        }, false);
        itemEl.addEventListener("dragenter", (e) => {
            e.preventDefault(); // Prevent default action (open as link for some elements)
            let dragged = window.__av_item_dragged;
            if (!dragged || !isFolder || (dragged.uid == item.uid))
                return;
            LX.addClass(item.domEl, "animate-pulse");
        });
        itemEl.addEventListener("dragleave", (e) => {
            e.preventDefault(); // Prevent default action (open as link for some elements)
            let dragged = window.__av_item_dragged;
            if (!dragged) {
                return;
            }
            LX.removeClass(item.domEl, "animate-pulse");
        });
        itemEl.addEventListener("drop", (e) => {
            e.preventDefault(); // Prevent default action (open as link for some elements)
            let dragged = window.__av_item_dragged;
            if (dragged)
                onDrop(dragged, item);
        });
        itemEl.addEventListener("mouseenter", (e) => {
            if (!that.useNativeTitle && isGridLayout) {
                const desc = that.content.querySelector(`#floatingTitle_${item.uid}`);
                if (desc)
                    desc.style.display = "unset";
            }
            if (item.type !== "video")
                return;
            e.preventDefault();
            const video = itemEl.querySelector("video");
            video.style.opacity = "1";
            video.play();
        });
        itemEl.addEventListener("mouseleave", (e) => {
            if (!that.useNativeTitle && isGridLayout) {
                setTimeout(() => {
                    const desc = that.content.querySelector(`#floatingTitle_${item.uid}`);
                    if (desc)
                        desc.style.display = "none";
                }, 100);
            }
            if (item.type !== "video")
                return;
            e.preventDefault();
            const video = itemEl.querySelector("video");
            video.pause();
            video.currentTime = 0;
            if (item.preview) {
                video.style.opacity = "0";
            }
        });
        if (!this.skipBrowser && updateTree) {
            this.tree.refresh();
        }
        return itemEl;
    }
    /**
    * @method clear
    */
    clear() {
        if (this.previewPanel) {
            this.previewPanel.clear();
        }
        if (this.leftPanel) {
            this.leftPanel.clear();
        }
        if (this.toolsPanel) {
            this.toolsPanel.clear();
        }
    }
    /**
    * @method _processData
    */
    _processData(data, parent) {
        if (data.constructor !== Array) {
            data['folder'] = parent;
            data.children = data.children ?? [];
        }
        let list = data.constructor === Array ? data : data.children;
        for (var i = 0; i < list.length; ++i) {
            this._processData(list[i], data);
        }
    }
    /**
    * @method _updatePath
    */
    _updatePath() {
        this.path.length = 0;
        if (this.currentFolder && this.currentFolder.parent) {
            this.path.push(this.currentFolder.id);
            const _pushParentsId = (i) => {
                if (!i)
                    return;
                this.path.push(i.parent ? i.id : '@');
                _pushParentsId(i.parent);
            };
            _pushParentsId(this.currentFolder.parent);
        }
        else {
            this.path.push('@');
        }
        LX.emitSignal("@on_folder_change", this.path.reverse().join('/'));
    }
    /**
    * @method _createTreePanel
    */
    _createTreePanel(area) {
        if (this.leftPanel) {
            this.leftPanel.clear();
        }
        else {
            this.leftPanel = area.addPanel({ className: 'lexassetbrowserpanel' });
        }
        // Process data to show in tree
        let tree_data = {
            id: '/',
            children: this.data
        };
        this.leftPanel.sameLine(2, "justify-center");
        this.leftPanel.addButton(null, "GoBackButton", () => {
            if (!this.prevData.length || !this.currentFolder)
                return;
            this.nextData.push(this.currentFolder);
            this._enterFolder(this.prevData.pop(), false);
        }, { buttonClass: "bg-none", title: "Go Back", tooltip: true, icon: "ArrowLeft" });
        this.leftPanel.addButton(null, "GoForwardButton", () => {
            if (!this.nextData.length || !this.currentFolder)
                return;
            this._enterFolder(this.nextData.pop());
        }, { buttonClass: "bg-none", title: "Go Forward", tooltip: true, icon: "ArrowRight" });
        const tree = this.leftPanel.addTree("Content Browser", tree_data, {
            // icons: tree_icons,
            filter: false,
            onlyFolders: this.onlyFolders,
            onevent: (event) => {
                let node = event.node;
                let value = event.value;
                switch (event.type) {
                    case LX.TreeEvent.NODE_SELECTED:
                        {
                            if (event.multiple) {
                                return;
                            }
                            if (!node.parent) {
                                if (this.currentFolder) {
                                    this.prevData.push(this.currentFolder);
                                }
                                this.currentFolder = null;
                                this.currentData = this.data;
                                this._refreshContent();
                                this._updatePath();
                            }
                            else {
                                this._enterFolder(node.type === "folder" ? node : node.parent);
                                this._previewAsset(node);
                                if (node.type !== "folder") {
                                    this.content.querySelectorAll('.lexassetitem').forEach(i => i.classList.remove('selected'));
                                    const dom = node.domEl;
                                    dom?.classList.add('selected');
                                }
                                this.selectedItem = node;
                            }
                            break;
                        }
                    case LX.TreeEvent.NODE_DRAGGED:
                        {
                            if (node.parent) {
                                const idx = node.parent.children.indexOf(node);
                                node.parent.children.splice(idx, 1);
                            }
                            node.folder = node.parent = value;
                            if (!value.children)
                                value.children = [];
                            value.children.push(node);
                            if (this.onItemDragged) {
                                this.onItemDragged(node, value);
                            }
                            this._refreshContent();
                            break;
                        }
                }
            },
        });
        this.tree = tree.innerTree;
    }
    /**
    * @method _setContentLayout
    */
    _setContentLayout(layoutMode) {
        this.layout = layoutMode;
        this.toolsPanel.refresh();
        this._refreshContent();
    }
    /**
    * @method _createContentPanel
    */
    _createContentPanel(area) {
        if (this.toolsPanel) {
            this.contentPanel.clear();
        }
        else {
            this.toolsPanel = area.addPanel({ className: 'overflow-hidden', height: "auto" });
            this.contentPanel = area.addPanel({
                className: 'lexassetcontentpanel flex flex-col content-center overflow-hidden',
                height: "calc(100%)"
            });
            this._paginator = new LX.Pagination({
                className: "ml-auto",
                pages: Math.max(Math.ceil(this.data.length / this.assetsPerPage), 1),
                onChange: () => this._refreshContent()
            });
            const resizeObserver = new ResizeObserver(entries => {
                const e = entries[0];
                if (e) {
                    this.contentPanel.root.style.height = `calc(100% - ${(e.contentRect.height + 8)}px )`;
                }
            });
            resizeObserver.observe(this.toolsPanel.root);
            this.contentPanel.root.addEventListener('wheel', (e) => {
                if (!e.ctrlKey)
                    return;
                e.preventDefault();
                this.gridScale *= (e.deltaY < 0 ? 1.05 : 0.95);
                this.gridScale = LX.clamp(this.gridScale, 0.5, 2.0);
                const r = document.querySelector(':root');
                r.style.setProperty('--av-grid-scale', this.gridScale);
            });
        }
        const _onSort = (value, event) => {
            LX.addDropdownMenu(event.target, [
                { name: "Name", icon: "ALargeSmall", callback: () => this._sortData("id") },
                { name: "Type", icon: "Type", callback: () => this._sortData("type") },
                null,
                { name: "Ascending", icon: "SortAsc", callback: () => this._sortData(undefined, AssetView.CONTENT_SORT_ASC) },
                { name: "Descending", icon: "SortDesc", callback: () => this._sortData(undefined, AssetView.CONTENT_SORT_DESC) }
            ], { side: "bottom", align: "start" });
        };
        const _onChangeView = (value, event) => {
            LX.addDropdownMenu(event.target, [
                { name: "Grid", icon: "LayoutGrid", callback: () => this._setContentLayout(AssetView.LAYOUT_GRID) },
                { name: "Compact", icon: "LayoutList", callback: () => this._setContentLayout(AssetView.LAYOUT_COMPACT) },
                { name: "List", icon: "List", callback: () => this._setContentLayout(AssetView.LAYOUT_LIST) }
            ], { side: "bottom", align: "start" });
        };
        this.toolsPanel.refresh = () => {
            this.toolsPanel.clear();
            const typeEntries = Object.keys(this.allowedTypes);
            this.toolsPanel.sameLine();
            this.toolsPanel.addText(null, this.searchValue ?? "", (v) => this._refreshContent.call(this, v, undefined), { width: "100%", placeholder: "Search assets.." });
            this.toolsPanel.endLine();
            this.toolsPanel.sameLine();
            const refreshButton = this.toolsPanel.addButton(null, "", this._refreshContent.bind(this), { title: "Refresh", tooltip: true, icon: "Refresh" });
            this.toolsPanel.addButton(null, "", _onSort.bind(this), { title: "Sort", tooltip: true, icon: (this.sortMode === AssetView.CONTENT_SORT_ASC) ? "SortAsc" : "SortDesc" });
            this.toolsPanel.addButton(null, "", _onChangeView.bind(this), { title: "View", tooltip: true, icon: (this.layout === AssetView.LAYOUT_GRID) ? "LayoutGrid" : "LayoutList" });
            this.toolsPanel.addSelect(null, typeEntries, this.filter ?? typeEntries[0], (v) => {
                this._refreshContent(undefined, v);
            }, { overflowContainer: null });
            // Float to the end
            this.toolsPanel.endLine();
            if (this._paginator) {
                const inlineContainer = refreshButton.root.parentElement;
                inlineContainer.appendChild(this._paginator.root);
            }
        };
        // Start content panel
        this.content = document.createElement('ul');
        this.content.className = "lexassetscontent";
        this.contentPanel.attach(this.content);
        if (!this.skipBrowser) {
            this.contentPanel.addText(null, this.path.join('/'), null, {
                inputClass: "bg-none fg-quinary text-end",
                disabled: true,
                signal: "@on_folder_change"
            });
        }
        this.content.addEventListener('dragenter', function (e) {
            e.preventDefault();
            this.classList.add('dragging');
        });
        this.content.addEventListener('dragleave', function (e) {
            e.preventDefault();
            this.classList.remove('dragging');
        });
        this.content.addEventListener('drop', (e) => {
            e.preventDefault();
            this._processDrop(e);
        });
        this.content.addEventListener('click', function () {
            this.querySelectorAll('.lexassetitem').forEach(i => i.classList.remove('selected'));
        });
        this._refreshContent();
        // After content to update the size of the content based on the toolbar
        LX.doAsync(() => this.toolsPanel.refresh(), 100);
    }
    _refreshContent(searchValue, filter) {
        const isCompactLayout = (this.layout == AssetView.LAYOUT_COMPACT);
        const isListLayout = (this.layout == AssetView.LAYOUT_LIST);
        this.filter = filter ?? (this.filter ?? "None");
        this.searchValue = searchValue ?? (this.searchValue ?? "");
        this.content.innerHTML = "";
        this.content.className = `lexassetscontent${isCompactLayout ? " compact" : (isListLayout ? " list" : "")}`;
        if (!this.currentData.length) {
            return;
        }
        const fr = new FileReader();
        const filteredData = this.currentData.filter(_i => {
            return (this.filter != "None" ? _i.type.toLowerCase() == this.filter.toLowerCase() : true) &&
                _i.id.toLowerCase().includes(this.searchValue.toLowerCase());
        });
        this._paginator?.setPages(Math.max(Math.ceil(filteredData.length / this.assetsPerPage), 1));
        // Show all data if using filters
        const start = this._paginator ? (this._paginator.page - 1) * this.assetsPerPage : 0;
        const end = this._paginator ? Math.min(start + this.assetsPerPage, filteredData.length) : filteredData.length;
        for (let i = start; i < end; ++i) {
            let item = filteredData[i];
            if (item.path) {
                LX.request({ url: item.path, dataType: 'blob', success: (f) => {
                        item.bytesize = f.size;
                        fr.readAsDataURL(f);
                        fr.onload = e => {
                            const target = e.currentTarget;
                            item.src = target.result; // This is a base64 string...
                            item._path = item.path;
                            delete item.path;
                            this._refreshContent(searchValue, filter);
                        };
                    } });
            }
            else {
                item.domEl = this.addItem(item, undefined, false);
            }
        }
        if (this.onRefreshContent) {
            this.onRefreshContent(searchValue, filter);
        }
    }
    _previewAsset(file) {
        if (this.skipPreview) {
            return;
        }
        const is_base_64 = file.src && file.src.includes("data:image/");
        this.previewPanel.clear();
        this.previewPanel.branch("Asset");
        if (file.type == 'image' || file.src) {
            const hasImage = ['png', 'jpg'].indexOf(LX.getExtension(file.src)) > -1 || is_base_64;
            if (hasImage) {
                this.previewPanel.addImage(null, file.src, { style: { width: "100%" } });
            }
        }
        if (file.lastModified && !file.lastModifiedDate) {
            file.lastModifiedDate = this._lastModifiedToStringDate(file.lastModified);
        }
        const options = { disabled: true };
        this.previewPanel.addText("Filename", file.id, null, options);
        if (file.lastModifiedDate)
            this.previewPanel.addText("Last Modified", file.lastModifiedDate, null, options);
        if (file._path || file.src)
            this.previewPanel.addText("URL", file._path ? file._path : file.src, null, options);
        this.previewPanel.addText("Path", this.path.join('/'), null, options);
        this.previewPanel.addText("Type", file.type, null, options);
        if (file.bytesize)
            this.previewPanel.addText("Size", LX.formatBytes(file.bytesize), null, options);
        if (file.type == "folder")
            this.previewPanel.addText("Files", file.children ? file.children.length.toString() : "0", null, options);
        this.previewPanel.addSeparator();
        const previewActions = [...this.previewActions];
        if (!previewActions.length && file.type !== "folder") {
            // By default
            previewActions.push({
                name: 'Download',
                callback: () => LX.downloadURL(file.src, file.id)
            });
        }
        for (let action of previewActions) {
            if (action.type && action.type !== file.type || action.path && action.path !== this.path.join('/')) {
                continue;
            }
            this.previewPanel.addButton(null, action.name, action.callback.bind(this, file));
        }
        this.previewPanel.merge();
    }
    _processDrop(e) {
        if (!e.dataTransfer || !e.dataTransfer.files || e.dataTransfer.files.length == 0) {
            return;
        }
        const fr = new FileReader();
        const num_files = e.dataTransfer.files.length;
        for (let i = 0; i < e.dataTransfer.files.length; ++i) {
            const file = e.dataTransfer.files[i];
            const result = this.currentData.find(e => e.id === file.name);
            if (result)
                continue;
            fr.readAsDataURL(file);
            fr.onload = e => {
                let ext = file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase();
                let item = {
                    "id": file.name,
                    "src": e.currentTarget.result,
                    "extension": ext,
                    "lastModified": file.lastModified,
                    "lastModifiedDate": this._lastModifiedToStringDate(file.lastModified)
                };
                switch (ext) {
                    case 'png':
                    case 'jpg':
                        item.type = "image";
                        break;
                    case 'js':
                    case 'css':
                        item.type = "script";
                        break;
                    case 'json':
                        item.type = "json";
                        break;
                    case 'obj':
                        item.type = "mesh";
                        break;
                    default:
                        item.type = ext;
                        item.unknownExtension = true;
                        break;
                }
                this.currentData.push(item);
                if (i == (num_files - 1)) {
                    this._refreshContent();
                    this.tree?.refresh(); // Refresh if tree exists
                }
            };
        }
    }
    _sortData(sortBy, sortMode) {
        sortBy = sortBy ?? (this._lastSortBy ?? 'id');
        sortMode = sortMode ?? this.sortMode;
        const sortDesc = (sortMode === AssetView.CONTENT_SORT_DESC);
        this.currentData = this.currentData.sort((a, b) => {
            var r = sortDesc ? b[sortBy].localeCompare(a[sortBy]) : a[sortBy].localeCompare(b[sortBy]);
            if (r == 0)
                r = sortDesc ? b['id'].localeCompare(a['id']) : a['id'].localeCompare(b['id']);
            return r;
        });
        this._lastSortBy = sortBy;
        this.sortMode = sortMode;
        this.toolsPanel.refresh();
        this._refreshContent();
    }
    _enterFolder(folderItem, storeCurrent = true) {
        const child = this.currentData[0];
        const sameFolder = child?.parent?.id === folderItem.id;
        if (storeCurrent) {
            this.prevData.push(this.currentFolder ?? { id: "/", children: this.data });
        }
        this.currentFolder = folderItem;
        this.currentData = this.currentFolder.children;
        // this.contentPage = 1;
        if (!sameFolder) {
            this._refreshContent();
        }
        // Update path
        this._updatePath();
        // Trigger event
        if (this.onevent) {
            const event = new AssetViewEvent(AssetViewEvent.ENTER_FOLDER, folderItem);
            this.onevent(event);
        }
    }
    _moveItemToFolder(item, folder) {
        const idx = this.currentData.indexOf(item);
        if (idx < 0) {
            console.error("[AssetView Error] Cannot delete. Item not found.");
            return;
        }
        this.currentData.splice(idx, 1);
        const oldParent = item.parent;
        if (oldParent) {
            oldParent.children = oldParent.children.filter((c) => c !== item);
        }
        // add to new folder
        folder.children.push(item);
        item.parent = folder;
    }
    _deleteItem(item) {
        const idx = this.currentData.indexOf(item);
        if (idx < 0) {
            console.error("[AssetView Error] Cannot delete. Item not found.");
            return;
        }
        this.currentData.splice(idx, 1);
        const oldParent = item.parent;
        if (oldParent) {
            oldParent.children = oldParent.children.filter((c) => c !== item);
        }
        this._refreshContent(this.searchValue, this.filter);
        if (this.onevent) {
            const event = new AssetViewEvent(AssetViewEvent.ASSET_DELETED, item);
            this.onevent(event);
        }
        if (!this.skipBrowser) {
            this.tree.refresh();
        }
        if (this.previewPanel) {
            this.previewPanel.clear();
        }
        this._processData(this.data);
    }
    _moveItem(item) {
    }
    _cloneItem(item) {
        const idx = this.currentData.indexOf(item);
        if (idx < 0) {
            return;
        }
        delete item.domEl;
        delete item.folder;
        const new_item = LX.deepCopy(item);
        this.currentData.splice(idx, 0, new_item);
        this._refreshContent(this.searchValue, this.filter);
        if (this.onevent) {
            const event = new AssetViewEvent(AssetViewEvent.ASSET_CLONED, item);
            this.onevent(event);
        }
        this._processData(this.data);
    }
    _renameItem(item) {
        const idx = this.currentData.indexOf(item);
        if (idx < 0) {
            return;
        }
        const oldName = item.id;
        const wasSelected = LX.hasClass(item.domEl, "selected");
        const onRename = (value) => {
            p.destroy();
            const hoverTitle = this.content.querySelector(`#floatingTitle_${item.id.replace(/\s/g, '_').replaceAll(".", "_")}`);
            if (hoverTitle)
                hoverTitle.remove();
            item.domEl.remove();
            item.id = value;
            item.domEl = this.addItem(item, idx * 2);
            if (this.onevent) {
                const event = new AssetViewEvent(AssetViewEvent.ASSET_RENAMED, item, oldName);
                this.onevent(event);
            }
            if (wasSelected) {
                this._previewAsset(item);
            }
            if (!this.skipBrowser) {
                this.tree.refresh();
            }
            this._processData(this.data);
        };
        let newName = item.id;
        const panel = new LX.Panel();
        panel.addText(null, item.id, (v, e) => {
            newName = v;
            if (e.constructor === KeyboardEvent)
                onRename(v);
        });
        panel.addButton(null, "Save", () => {
            onRename(newName);
        }, { buttonClass: "contrast" });
        const p = new LX.Popover(item.domEl, [panel], { align: "center", side: "bottom", sideOffset: -128 });
    }
    _openScriptInEditor(script) {
        if (this._scriptCodeDialog) {
            this._scriptCodeDialog.destroy();
        }
        this._scriptCodeDialog = new LX.Dialog(null, (p) => {
            const area = new LX.Area({ className: "rounded-lg" });
            p.attach(area);
            new LX.CodeEditor(area, {
                allowAddScripts: false,
                files: [script.src]
            });
        }, { size: ["50%", "600px"], closable: true, onBeforeClose: () => {
                delete this._scriptCodeDialog;
            } });
    }
    _setAssetsPerPage(n) {
        this._assetsPerPage = n;
        this._refreshContent();
    }
    _lastModifiedToStringDate(lm) {
        const d = new Date(lm).toLocaleString();
        return d.substring(0, d.indexOf(','));
    }
}
LX.AssetView = AssetView;

export { AssetView, AssetViewEvent };
//# sourceMappingURL=AssetView.js.map
