// AssetView.ts @jxarco

import { LX } from '../core/Namespace';

if( !LX )
{
    throw( "Missing LX namespace!" );
}

LX.extensions.push( 'AssetView' );

const Area = LX.Area;
const Panel = LX.Panel;
const NodeTree = LX.NodeTree;
const TreeEvent = LX.TreeEvent;

export type AssetViewAction = "select" | "dbl_click" | "check" | "clone" | "move" |
                         "delete" | "rename" | "enter_folder" | "create-folder";

export interface AssetViewItem {
    id: string;
    type: string;
    children: AssetViewItem[];
    parent?: AssetViewItem;
    path?: string;
    src?: string;
    dir?: AssetViewItem[];
    domEl?: HTMLElement;
    metadata: any; // optional user data
}

interface AssetViewEvent {
    type: AssetViewAction;
    items?: AssetViewItem[];
    result?: AssetViewItem[];
    from?: AssetViewItem;
    to?: AssetViewItem;
    oldName?: string;
    newName?: string;
    userInitiated: boolean; // clicked by user vs programmatically
}

/**
 * Signature for cancelable events.
 * `resolve()` MUST be called by the user to perform the UI action
 */
export type AssetViewEventCallback = ( event: AssetViewEvent, resolve?: () => void ) => void | Promise<void>;

/**
 * @class AssetView
 * @description Asset container with Tree for file system
 */

export class AssetView
{
    static LAYOUT_GRID          = 0;
    static LAYOUT_COMPACT       = 1;
    static LAYOUT_LIST          = 2;

    static CONTENT_SORT_ASC     = 0;
    static CONTENT_SORT_DESC    = 1;

    root: HTMLElement;
    area: typeof Area | null = null;
    content!: HTMLElement; // "!" to avoid TS strict property initialization error
    leftPanel: typeof Panel | null = null;
    toolsPanel: any;
    contentPanel: any;
    previewPanel: any;
    tree: typeof NodeTree | null = null;

    prevData: AssetViewItem[] = [];
    nextData: AssetViewItem[] = [];
    data: AssetViewItem[] = [];
    currentData: AssetViewItem[] = [];
    currentFolder: AssetViewItem | undefined = undefined;
    rootItem: AssetViewItem;
    path: string[] = [];
    rootPath: string = "";
    selectedItem: AssetViewItem | undefined = undefined;
    allowedTypes: any;
    searchValue: string = "";
    filter: string = "None";
    gridScale: number = 1.0;

    // Options
    layout: number = AssetView.LAYOUT_GRID;
    sortMode: number = AssetView.CONTENT_SORT_ASC;
    skipBrowser: boolean = false;
    skipPreview: boolean = false;
    useNativeTitle: boolean = false;
    onlyFolders: boolean = true;
    allowMultipleSelection: boolean = false;
    previewActions: any[] = [];
    contextMenu: any[] = [];
    onRefreshContent: any = null;
    itemContextMenuOptions: any = null;
    onItemDragged: any = null;

    private _assetsPerPage: number = 24;
    get assetsPerPage(): any { return this._assetsPerPage; }
    set assetsPerPage( v: any ) { this._setAssetsPerPage( v ); }

    _callbacks: Record<string, AssetViewEventCallback> = {};
    _lastSortBy: string = "";
    _paginator: typeof LX.Pagination | undefined;
    _scriptCodeDialog: typeof LX.Dialog | undefined;
    _moveItemDialog: typeof LX.Dialog | undefined;
    _movingItem: AssetViewItem | undefined;

    constructor( options: any = {} )
    {
        this.rootPath = "https://raw.githubusercontent.com/jxarco/lexgui.js/master/";
        this.layout = options.layout ?? this.layout;
        this.sortMode = options.sortMode ?? this.sortMode;

        if( options.rootPath )
        {
            if( options.rootPath.constructor !== String )
            {
                console.warn( `Asset Root Path must be a String (now is a ${ options.rootPath.constructor.name })` );
            }
            else
            {
                this.rootPath = options.rootPath;
            }
        }

        let div = document.createElement('div');
        div.className = 'lexassetbrowser';
        this.root = div;

        let area = new Area( { width: "100%", height: "100%" } );
        div.appendChild( area.root );

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

        if( this.gridScale !== 1.0 )
        {
            const r: any = document.querySelector( ':root' );
            r.style.setProperty( '--av-grid-scale', this.gridScale );
        }

        // Append temporarily to the dom
        document.body.appendChild( this.root );

        if( !this.skipBrowser )
        {
            [ left, right ] = area.split({ type: "horizontal", sizes: ["15%", "85%"]});
            contentArea = right;

            left.setLimitBox( 210, 0 );
            right.setLimitBox( 512, 0 );
        }

        if( !this.skipPreview )
        {
            [ contentArea, right ] = contentArea.split({ type: "horizontal", sizes: ["80%", "20%"]});
        }

        this.allowedTypes = {
            "None": {},
            "Image": { color: "yellow-500" },
            "JSON": { color: "sky-200" },
            "Video": { color: "indigo-400" },
            ...( options.allowedTypes ?? {} )
        };

        this.path = ['@'];
        this.rootItem = { id: "/", children: this.data, type: "folder", metadata: { uid: LX.guidGenerator() } };
        this.currentFolder = this.rootItem;

        this._processData( this.data );

        this.currentData = this.data;

        if( !this.skipBrowser )
        {
            this._createTreePanel( left );
        }

        this._createContentPanel( contentArea );

        // Create resource preview panel
        if( !this.skipPreview )
        {
            this.previewPanel = right.addPanel( {className: 'lexassetcontentpanel', style: { overflow: 'scroll' }} );
        }

        // Clean up
        document.body.removeChild( this.root );
    }

    /**
    * @method on
    * @description Stores an event callback for the desired action
    */
    on( eventName: string, callback: AssetViewEventCallback )
    {
        this._callbacks[ eventName ] = callback;
    }

    /**
    * @method load
    * @description Loads and processes the input data
    */
    load( data: any )
    {
        this.prevData.length = 0;
        this.nextData.length = 0;
        this.data = data;

        // Update root children
        this.rootItem.children = this.data;

        this._processData( this.data );
        this.currentData = this.data;
        this.path = [ '@' ];

        if( !this.skipBrowser )
        {
            this.tree.refresh( { id: '/', children: this.data, type: "folder", metadata: { uid: LX.guidGenerator() } } );
        }

        this._refreshContent();
    }

    /**
    * @method addItem
    * @description Creates an item DOM element
    */
    addItem( item: AssetViewItem, childIndex: number | undefined, updateTree: boolean = true )
    {
        const isListLayout = ( this.layout == AssetView.LAYOUT_LIST );
        const isGridLayout = ( this.layout == AssetView.LAYOUT_GRID ); // default
        const type = item.type.charAt( 0 ).toUpperCase() + item.type.slice( 1 );
        const extension = LX.getExtension( item.id );
        const isFolder = type === "Folder";
        const that = this;

        let itemEl = document.createElement('li');
        itemEl.className = "lexassetitem " + item.type.toLowerCase();
        itemEl.tabIndex = -1;
        LX.insertChildAtIndex( this.content, itemEl, childIndex );

        const typeColor = this.allowedTypes[ type ]?.color;
        if( typeColor )
        {
            // Add type tag
            LX.makeElement( 'span', `rounded-full w-2 h-2 z-100 flex absolute ml-2 mt-2 bg-${ typeColor }`, "", itemEl );
        }

        const metadata = item.metadata;

        if( !metadata.uid )
        {
            metadata.uid = LX.guidGenerator();
        }

        if( metadata.lastModified && !metadata.lastModifiedDate )
        {
            metadata.lastModifiedDate = this._lastModifiedToStringDate( metadata.lastModified );
        }

        if( !this.useNativeTitle )
        {
            let desc = document.createElement( 'span' );
            desc.className = 'lexitemdesc';
            desc.id = `floatingTitle_${ metadata.uid }`;
            desc.innerHTML = `File: ${ item.id }<br>Type: ${ type }`;
            LX.insertChildAtIndex( this.content, desc, childIndex ? childIndex + 1 : undefined );

            itemEl.addEventListener( "mousemove", ( e: MouseEvent ) => {

                if( !isGridLayout )
                {
                    return;
                }

                const target: any = e.target;
                const dialog = itemEl.closest('dialog');
                const rect = itemEl.getBoundingClientRect();
                const targetRect = target.getBoundingClientRect();

                let localOffsetX = rect.x + e.offsetX;
                let localOffsetY = rect.y + e.offsetY;

                if( dialog )
                {
                    const dialogRect = dialog.getBoundingClientRect();
                    localOffsetX -= dialogRect.x;
                    localOffsetY -= dialogRect.y;
                }

                if( target.classList.contains( "lexassettitle" ) )
                {
                    localOffsetY += ( targetRect.y - rect.y );
                }

                desc.style.left = ( localOffsetX ) + "px";
                desc.style.top = ( localOffsetY - 36 ) + "px";
            } );
        }
        else
        {
            itemEl.title = type + ": " + item.id;
        }

        if( this.allowMultipleSelection )
        {
            let checkbox = document.createElement( 'input' );
            checkbox.type = "checkbox";
            checkbox.className = "lexcheckbox";
            checkbox.checked = metadata.selected;
            checkbox.addEventListener('change', ( e: any ) => {
                metadata.selected = !metadata.selected;
                const onCheck = that._callbacks["check"];
                if( onCheck !== undefined )
                {
                    const event: AssetViewEvent = {
                        type: "check",
                        items: [ item ],
                        userInitiated: true
                    };

                    onCheck( event );
                    // event.multiple = !!e.shiftKey;
                }
                e.stopPropagation();
                e.stopImmediatePropagation();
            });

            itemEl.appendChild( checkbox );
        }

        let title = document.createElement('span');
        title.className = "lexassettitle";
        title.innerText = item.id;
        itemEl.appendChild( title );

        if( !this.skipPreview )
        {
            if( item.type === 'video' )
            {
                const itemVideo = LX.makeElement( 'video', 'absolute left-0 top-0 w-full border-none pointer-events-none', '', itemEl );
                itemVideo.setAttribute( 'disablePictureInPicture', false );
                itemVideo.setAttribute( 'disableRemotePlayback', false );
                itemVideo.setAttribute( 'loop', true );
                itemVideo.setAttribute( 'async', true );
                itemVideo.style.transition = 'opacity 0.2s ease-out';
                itemVideo.style.opacity = metadata.preview ? '0' : '1';
                itemVideo.src = item.src;
                itemVideo.volume = metadata.volume ?? 0.4;
            }

            let preview: any = null;

            const previewSrc    = metadata.preview ?? item.src;
            const hasImage = previewSrc && (
                (() => {
                    const ext = LX.getExtension( previewSrc.split( '?' )[ 0 ].split( '#' )[ 0 ]); // get final source without url parameters/anchors
                    return ext ? ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'avif'].includes( ext.toLowerCase() ) : false;
                })()
                || previewSrc.startsWith( 'data:image/' )
            );

            if( hasImage || isFolder || !isGridLayout )
            {
                const defaultPreviewPath    = `${ this.rootPath }images/file.png`;
                const defaultFolderPath     = `${ this.rootPath }images/folder.png`;

                preview = document.createElement('img');
                let realSrc = metadata.unknownExtension ? defaultPreviewPath : ( isFolder ? defaultFolderPath : previewSrc );
                preview.src = ( isGridLayout || isFolder ? realSrc : defaultPreviewPath );
                preview.setAttribute( "draggable", "false" );
                preview.className = "pointer-events-none";
                itemEl.appendChild( preview );
            }
            else
            {
                preview = document.createElement( 'svg' );
                preview.className = 'asset-file-preview';
                itemEl.appendChild( preview );

                let textEl = document.createElement( 'text' );
                textEl.innerText = ( !extension || extension == item.id ) ? item.type.toUpperCase() : ( `${ extension.toUpperCase() }` ); // If no extension, e.g. Clip, use the type...
                preview.appendChild( textEl );

                var newLength = textEl.innerText.length;
                var charsPerLine = 2.5;
                var newEmSize = charsPerLine / newLength;
                var textBaseSize = 64;

                if( newEmSize < 1 )
                {
                    var newFontSize = newEmSize * textBaseSize;
                    textEl.style.fontSize = newFontSize + 'px';
                    preview.style.paddingTop = `calc(50% - ${ ( textEl.offsetHeight * 0.5 + 10 ) }px)`;
                }
            }
        }

        // Add item type info
        let itemInfoHtml = type;

        if( isListLayout )
        {
            if( metadata.bytesize ) itemInfoHtml += ` | ${ LX.formatBytes( metadata.bytesize ) }`;
            if( metadata.lastModifiedDate ) itemInfoHtml += ` | ${ metadata.lastModifiedDate }`;
        }

        LX.makeContainer( [ 'auto', 'auto' ], 'lexassetinfo', itemInfoHtml, itemEl );

        itemEl.addEventListener('click', function( e )
        {
            e.stopImmediatePropagation();
            e.stopPropagation();

            const isDoubleClick = ( e.detail == LX.MOUSE_DOUBLE_CLICK );

            if( !isDoubleClick )
            {
                if( !e.shiftKey )
                {
                    that.content.querySelectorAll( '.lexassetitem').forEach( i => i.classList.remove( 'selected' ) );
                }

                this.classList.add( 'selected' );
                that.selectedItem = item;

                if( !that.skipPreview )
                {
                    that._previewAsset( item );
                }
            }
            else if( isFolder )
            {
                that._enterFolder( item );
                return;
            }

            const onSelect = that._callbacks["select"];
            const onDblClick = that._callbacks["dblClick"];
            if( isDoubleClick && onDblClick !== undefined )
            {
                const event: AssetViewEvent = {
                    type: "dbl_click",
                    items: [ item ],
                    userInitiated: true
                };

                onDblClick( event );
                // event.multiple = !!e.shiftKey;
            }
            else if( !isDoubleClick && onSelect !== undefined )
            {
                const event: AssetViewEvent = {
                    type: "select",
                    items: [ item ],
                    userInitiated: true
                };

                onSelect( event );
                // event.multiple = !!e.shiftKey;
            }
        });

        itemEl.addEventListener('contextmenu', function( e )
        {
            e.preventDefault();
            e.stopImmediatePropagation();
            e.stopPropagation();

            const multiple = that.content.querySelectorAll('.selected').length;

            const options: any[] = [
                {
                    name: ( multiple > 1 ) ? ( multiple + " selected" ) : item.id,
                    icon: LX.makeIcon( "CircleSmall", { svgClass: `fill-current fg-${ typeColor }` } ),
                    className: "text-sm", disabled: true
                },
                null
            ];

            if( multiple <= 1 )
            {
                options.push( { name: "Rename", icon: "TextCursor", callback: that._renameItemPopover.bind( that, item ) } );
            }

            if( !isFolder )
            {
                options.push( { name: "Clone", icon: "Copy", callback: that._requestCloneItem.bind( that, item ) });
            }

            options.push( { name: "Move", icon: "FolderInput", callback: () => that._moveItem( item ) } );

            if( type == "Script" && LX.has( "CodeEditor" ) )
            {
                options.push( { name: "Open in Editor", icon: "Code", callback: that._openScriptInEditor.bind( that, item ) } );
            }

            if( that.itemContextMenuOptions )
            {
                options.push( null );

                for( let o of that.itemContextMenuOptions )
                {
                    if( !o.name || !o.callback ) continue;
                    options.push( { name: o.name, icon: o.icon, callback: o.callback?.bind( that, item ) } );
                }
            }

            options.push( null, { name: "Delete", icon: "Trash2", className: "fg-error", callback: that._requestDeleteItem.bind( that, item ) } );

            LX.addClass( that.contentPanel.root, "pointer-events-none" );

            LX.addDropdownMenu( e.target, options, { side: "right", align: "start", event: e, onBlur: () => {
                LX.removeClass( that.contentPanel.root, "pointer-events-none" );
            } });
        });

        const onDrop = function( src: AssetViewItem, target: AssetViewItem )
        {
            const targetType = target.type.charAt( 0 ).toUpperCase() + target.type.slice( 1 );

            if( !( targetType === "Folder" ) || ( src.metadata.uid == target.metadata.uid ) )
            {
                console.error( "[AssetView Error] Cannot drop: Target item is not a folder or target is the dragged element!" );
                return;
            }

            // Animate dragged element
            const draggedEl = src.domEl;
            if( draggedEl )
            {
                draggedEl.classList.add("moving-to-folder");

                // When animation ends, finalize move
                draggedEl.addEventListener("animationend", () => {
                    draggedEl.classList.remove("moving-to-folder");
                    that._requestMoveItemToFolder( src, target );
                }, { once: true });
            }
        };

        itemEl.addEventListener("dragstart", ( e: DragEvent ) => {
            ( window as any ).__av_item_dragged = item;

            var img = new Image();
            img.src = '';
            if( e.dataTransfer )
            {
                e.dataTransfer.setDragImage( img, 0, 0 );
                e.dataTransfer.effectAllowed = "move";
            }

            const desc: HTMLElement | null = that.content.querySelector( `#floatingTitle_${ metadata.uid }` );
            if( desc ) desc.style.display = "none";
        }, false );

        itemEl.addEventListener("dragend", ( e: DragEvent ) =>
        {
            e.preventDefault(); // Prevent default action (open as link for some elements)
            let dragged = ( window as any ).__av_item_dragged;
            if( dragged && dragged._nodeTarget ) // We dropped into a NodeTree element
            {
                onDrop( dragged, dragged._nodeTarget );
            }
            delete ( window as any ).__av_item_dragged;
        }, false );

        itemEl.addEventListener("dragenter", ( e: DragEvent ) =>
        {
            e.preventDefault(); // Prevent default action (open as link for some elements)
            let dragged = ( window as any ).__av_item_dragged;
            if( !dragged || !isFolder || ( dragged.metadata.uid == metadata.uid ) ) return;
            LX.addClass( item.domEl, "animate-pulse" );
        } );

        itemEl.addEventListener("dragleave", ( e: any ) =>
        {
            e.preventDefault(); // Prevent default action (open as link for some elements)
            let dragged = ( window as any ).__av_item_dragged;
            if( !dragged )
            {
                return;
            }

            LX.removeClass( item.domEl, "animate-pulse" );
        } );

        itemEl.addEventListener("drop", ( e: DragEvent ) =>
        {
            e.preventDefault(); // Prevent default action (open as link for some elements)
            let dragged = ( window as any ).__av_item_dragged;
            if( dragged ) onDrop( dragged, item );
        });

        itemEl.addEventListener( "mouseenter", ( e: MouseEvent ) =>
        {
            if( !that.useNativeTitle && isGridLayout )
            {
                const desc: HTMLElement | null = that.content.querySelector( `#floatingTitle_${ metadata.uid }` );
                if( desc ) desc.style.display = "unset";
            }

            if( item.type !== "video" ) return;
            e.preventDefault();
            const video: any = itemEl.querySelector( "video" );
            video.style.opacity = "1";
            video.play();
        } );

        itemEl.addEventListener( "mouseleave", ( e: MouseEvent ) =>
        {
            if( !that.useNativeTitle && isGridLayout )
            {
                setTimeout( () => {
                    const desc: HTMLElement | null = that.content.querySelector( `#floatingTitle_${ metadata.uid }` );
                    if( desc ) desc.style.display = "none";
                }, 100 );
            }

            if( item.type !== "video" ) return;
            e.preventDefault();
            const video: any = itemEl.querySelector( "video" );
            video.pause();
            video.currentTime = 0;
            if( metadata.preview )
            {
                video.style.opacity = "0";
            }
        } );

        if( !this.skipBrowser && updateTree )
        {
            this.tree.refresh();
        }

        return itemEl;
    }

    /**
    * @method clear
    * @description Creates all AssetView container panels
    */
    clear()
    {
        if( this.previewPanel )
        {
            this.previewPanel.clear();
        }

        if( this.leftPanel )
        {
            this.leftPanel.clear();
        }

        if( this.toolsPanel )
        {
            this.toolsPanel.clear()
        }
    }

    _processData( data: any, parent?: AssetViewItem )
    {
        // Processing an item
        if( data.constructor !== Array )
        {
            data.parent = parent;
            data.dir = parent?.children;
            data.children = data.children ?? [];
            data.metadata = data.metadata || {};
        }

        // Get the new parent
        const newParent = parent ? data : this.rootItem;

        for( let item of newParent.children )
        {
            this._processData( item, newParent );
        }
    }

    _updatePath()
    {
        this.path.length = 0;

        if( this.currentFolder && this.currentFolder.parent )
        {
            this.path.push( this.currentFolder.id );

            const _pushParentsId = ( i: any ) => {
                if( !i ) return;
                this.path.push( i.parent ? i.id : '@' );
                _pushParentsId( i.parent );
            };

            _pushParentsId( this.currentFolder.parent );
        }
        else
        {
            this.path.push( '@' );
        }

        LX.emitSignal( "@on_folder_change", this.path.reverse().join('/') );
    }

    _createNavigationBar( panel: typeof Panel )
    {
        panel.sameLine( 4, "justify-center" );

        panel.addButton( null, "GoBackButton", () => {
            if( !this.prevData.length || !this.currentFolder ) return;
            this.nextData.push( this.currentFolder );
            this._enterFolder( this.prevData.pop(), false )
        }, { buttonClass: "bg-none", title: "Go Back", tooltip: true, icon: "ArrowLeft" } );

        panel.addButton( null, "GoForwardButton", () => {
            if( !this.nextData.length || !this.currentFolder ) return;
            this._enterFolder( this.nextData.pop() );
        }, { buttonClass: "bg-none", title: "Go Forward", tooltip: true, icon: "ArrowRight" } );

        panel.addButton( null, "GoUpButton", () => {
            const parentFolder = this.currentFolder?.parent;
            if( parentFolder ) this._enterFolder( parentFolder );
        }, { buttonClass: "bg-none", title: "Go Upper Folder", tooltip: true, icon: "ArrowUp" } );

        panel.addButton( null, "GoUpButton", () => {
            this._refreshContent()
        }, { buttonClass: "bg-none", title: "Refresh", tooltip: true, icon: "Refresh" } );
    }

    _createTreePanel( area: typeof Area )
    {
        if( this.leftPanel )
        {
            this.leftPanel.clear();
        }
        else
        {
            this.leftPanel = area.addPanel({ className: 'lexassetbrowserpanel' });
        }

        this._createNavigationBar( this.leftPanel );

        const treeData = { id: '/', children: this.data };
        const tree = this.leftPanel.addTree( "Content Browser", treeData, {
            // icons: tree_icons,
            filter: false,
            onlyFolders: this.onlyFolders,
            onevent: ( event: typeof TreeEvent ) => {

                let node = event.node;
                let value = event.value;

                switch( event.type )
                {
                    case LX.TreeEvent.NODE_SELECTED:
                    {
                        if( event.multiple )
                        {
                            return;
                        }
                        if( !node.parent )
                        {
                            if( this.currentFolder )
                            {
                                this.prevData.push( this.currentFolder );
                            }

                            this.currentFolder = undefined;
                            this.currentData = this.data;
                            this._refreshContent();
                            this._updatePath();
                        }
                        else
                        {
                            this._enterFolder( node.type === "folder" ? node : node.parent );

                            this._previewAsset( node );

                            if( node.type !== "folder" )
                            {
                                this.content.querySelectorAll( '.lexassetitem').forEach( i => i.classList.remove( 'selected' ) );
                                const dom = node.domEl;
                                dom?.classList.add( 'selected' );
                            }

                            this.selectedItem = node;
                        }
                        break;
                    }
                    case LX.TreeEvent.NODE_DRAGGED:
                    {
                        if( node.parent )
                        {
                            const idx = node.parent.children.indexOf( node );
                            node.parent.children.splice( idx, 1 );
                        }

                        if( !value.children )
                        {
                            value.children = [];
                        }

                        value.children.push( node );

                        node.parent = value;
                        node.dir = value.children;

                        if( this.onItemDragged )
                        {
                            this.onItemDragged( node, value );
                        }

                        this._refreshContent();
                        break;
                    }
                }
            },
        });

        this.tree = tree.innerTree;
    }

    _setContentLayout( layoutMode: number )
    {
        this.layout = layoutMode;
        this.toolsPanel.refresh();
        this._refreshContent();
    }

    _createContentPanel( area: typeof Area )
    {
        const that = this;

        area.root.classList.add( "flex", "flex-col" );

        if( this.toolsPanel )
        {
            this.contentPanel.clear();
        }
        else
        {
            this.toolsPanel = area.addPanel({ className: 'flex-auto', height: "auto" });
            this.contentPanel = area.addPanel({
                className: 'lexassetcontentpanel flex flex-col flex-auto-fill content-center overflow-hidden'
            });

            this._paginator = new LX.Pagination( {
                className: "ml-auto",
                pages: Math.max( Math.ceil( this.data.length / this.assetsPerPage ), 1 ),
                onChange: () => this._refreshContent()
            } );

            this.contentPanel.root.addEventListener( 'wheel', ( e: WheelEvent ) =>
            {
                if( !e.ctrlKey ) return;
                e.preventDefault();
                this.gridScale *= ( e.deltaY < 0 ? 1.05 : 0.95 );
                this.gridScale = LX.clamp( this.gridScale, 0.5, 2.0 );
                const r: any = document.querySelector( ':root' );
                r.style.setProperty( '--av-grid-scale', this.gridScale );
            });
        }

        const _onSort = ( value: any, event: any ) =>
        {
            LX.addDropdownMenu( event.target, [
                { name: "Name", icon: "ALargeSmall", callback: () => this._sortData( "id" ) },
                { name: "Type", icon: "Type", callback: () => this._sortData( "type" ) },
                null,
                { name: "Ascending", icon: "SortAsc", callback: () => this._sortData( undefined, AssetView.CONTENT_SORT_ASC ) },
                { name: "Descending", icon: "SortDesc", callback: () => this._sortData( undefined, AssetView.CONTENT_SORT_DESC ) }
            ], { side: "bottom", align: "start" });
        };

        const _onChangeView = ( value: any, event: any ) =>
        {
            LX.addDropdownMenu( event.target, [
                { name: "Grid", icon: "LayoutGrid", callback: () => this._setContentLayout( AssetView.LAYOUT_GRID ) },
                { name: "Compact", icon: "LayoutList", callback: () => this._setContentLayout( AssetView.LAYOUT_COMPACT ) },
                { name: "List", icon: "List", callback: () => this._setContentLayout( AssetView.LAYOUT_LIST ) }
            ], { side: "bottom", align: "start" });
        };

        this.toolsPanel.refresh = () =>
        {
            this.toolsPanel.clear();

            const typeEntries = Object.keys( this.allowedTypes );

            // Put it in the content panel if no browser
            if( this.skipBrowser )
            {
                this._createNavigationBar( this.toolsPanel );
            }

            this.toolsPanel.sameLine();
            const sortButton = this.toolsPanel.addButton( null, "", _onSort.bind( this ), { title: "Sort", tooltip: true, icon: ( this.sortMode === AssetView.CONTENT_SORT_ASC ) ? "SortAsc" : "SortDesc" } );
            this.toolsPanel.addButton( null, "", _onChangeView.bind( this ), { title: "View", tooltip: true, icon: ( this.layout === AssetView.LAYOUT_GRID ) ? "LayoutGrid" : "LayoutList" } );
            this.toolsPanel.addSelect( null, typeEntries, this.filter ?? typeEntries[ 0 ], ( v: any ) => {
                this._refreshContent( undefined, v );
            }, { overflowContainer: null } );
            this.toolsPanel.addText( null, this.searchValue ?? "", ( v: string ) => this._refreshContent( v ), { className: "flex flex-auto-fill", placeholder: "Search assets.." } );
            this.toolsPanel.endLine();

            if( this._paginator )
            {
                const inlineContainer = sortButton.root.parentElement;
                inlineContainer.appendChild( this._paginator.root );
            }
        };

        // Start content panel

        this.content = document.createElement( 'ul' );
        this.content.className = "lexassetscontent";
        this.contentPanel.attach( this.content );

        if( !this.skipBrowser )
        {
            this.contentPanel.addText( null, this.path.join('/'), null, {
                inputClass: "bg-none fg-quinary text-end",
                disabled: true,
                signal: "@on_folder_change"
            });
        }

        this.content.addEventListener( 'dragenter', function( e: DragEvent ) {
            e.preventDefault();
            this.classList.add( 'dragging' );
        });

        this.content.addEventListener( 'dragleave', function( e: DragEvent ) {
            e.preventDefault();
            this.classList.remove( 'dragging' );
        });

        this.content.addEventListener( 'drop', ( e: DragEvent ) =>
        {
            e.preventDefault();
            this._processDrop( e );
        });

        this.content.addEventListener( 'click', function()
        {
            this.querySelectorAll('.lexassetitem').forEach( i => i.classList.remove('selected') );
        });

        this.content.addEventListener( 'contextmenu', function( e )
        {
            e.preventDefault();

            const options: any[] = [
                {
                    name: "New Folder",
                    icon: LX.makeIcon( "FolderPlus" ),
                    callback: () =>
                    {
                        that._requestCreateFolder();
                    }
                }
            ];

            LX.addClass( that.contentPanel.root, "pointer-events-none" );

            LX.addDropdownMenu( e.target, options, { side: "right", align: "start", event: e, onBlur: () => {
                LX.removeClass( that.contentPanel.root, "pointer-events-none" );
            } });
        });

        this._refreshContent();

        // After content to update the size of the content based on the toolbar
        LX.doAsync( () => this.toolsPanel.refresh(), 100 );
    }

    _makeNameFilterFn( searchValue: string ): (name: string) => boolean
    {
        const q = searchValue.trim();

        if( q.includes( "*" ) || q.includes( "?" ) )
        {
            const regex = LX.wildcardToRegExp( q );
            return ( name ) => regex.test( name );
        }

        // default case, only check include
        return ( name ) => name.toLowerCase().includes( q.toLowerCase() );
    }

    _refreshContent( searchValue?: string, filter?: string )
    {
        const isCompactLayout = ( this.layout == AssetView.LAYOUT_COMPACT );
        const isListLayout = ( this.layout == AssetView.LAYOUT_LIST );

        this.filter = filter ?? ( this.filter ?? "None" );
        this.searchValue = searchValue ?? ( this.searchValue ?? "" );
        this.content.innerHTML = "";
        this.content.className = `lexassetscontent${ isCompactLayout ? " compact" : ( isListLayout ? " list" : "" ) }`;

        if( !this.currentData.length )
        {
            return;
        }

        const fr = new FileReader();
        const nameFilterFn = this._makeNameFilterFn( this.searchValue );

        const filteredData = this.currentData.filter( ( _i ) =>
        {
            const typeMatch = this.filter !== "None" ? _i.type.toLowerCase() === this.filter.toLowerCase() : true;
            const nameMatch = nameFilterFn( _i.id );
            return typeMatch && nameMatch;
        } );

        this._paginator?.setPages( Math.max( Math.ceil( filteredData.length / this.assetsPerPage ), 1 ) );

        // Show all data if using filters
        const start = this._paginator ? ( this._paginator.page - 1 ) * this.assetsPerPage : 0;
        const end = this._paginator ? Math.min( start + this.assetsPerPage, filteredData.length ) : filteredData.length;

        for( let i = start; i < end; ++i )
        {
            let item = filteredData[ i ];

            if( item.path )
            {
                LX.request({ url: item.path, dataType: 'blob', success: ( f: File ) => {
                    item.metadata.bytesize = f.size;
                    fr.readAsDataURL( f );
                    fr.onload = e => {
                        const target = e.currentTarget as any;
                        item.src = target.result;  // This is a base64 string...
                        item.metadata.path = item.path;
                        delete item.path;
                        this._refreshContent( searchValue, filter );
                    };
                } });
            }
            else
            {
                item.domEl = this.addItem( item, undefined, false );
            }
        }

        if( this.onRefreshContent )
        {
            this.onRefreshContent( searchValue, filter );
        }
    }

    _previewAsset( file: AssetViewItem )
    {
        if( this.skipPreview )
        {
            return;
        }

        const is_base_64 = file.src && file.src.includes("data:image/");
        
        file.metadata = file.metadata ?? {};

        this.previewPanel.clear();
        this.previewPanel.branch("Asset");

        if( file.type == 'image' || file.src )
        {
            const hasImage = ['png', 'jpg'].indexOf( LX.getExtension( file.src ) ) > -1 || is_base_64;
            if( hasImage )
            {
                this.previewPanel.addImage( null, file.src, { style: { width: "100%" } } );
            }
        }

        if( file.metadata.lastModified && !file.metadata.lastModifiedDate )
        {
            file.metadata.lastModifiedDate = this._lastModifiedToStringDate( file.metadata.lastModified );
        }

        const options = { disabled: true };

        this.previewPanel.addText("Filename", file.id, null, options);
        if( file.metadata.lastModifiedDate ) this.previewPanel.addText("Last Modified", file.metadata.lastModifiedDate, null, options);
        if( file.metadata.path || file.src ) this.previewPanel.addText("URL", file.metadata.path ? file.metadata.path : file.src, null, options);
        this.previewPanel.addText("Path", this.path.join('/'), null, options);
        this.previewPanel.addText("Type", file.type, null, options);
        if( file.metadata.bytesize ) this.previewPanel.addText("Size", LX.formatBytes( file.metadata.bytesize ), null, options);
        if( file.type == "folder" ) this.previewPanel.addText("Files", file.children ? file.children.length.toString() : "0", null, options);

        this.previewPanel.addSeparator();

        const previewActions = [...this.previewActions];

        if( !previewActions.length && file.type !== "folder" )
        {
            // By default
            previewActions.push({
                name: 'Download',
                callback: () => LX.downloadURL(file.src, file.id)
            });
        }

        for( let action of previewActions )
        {
            if( action.type && action.type !== file.type || action.path && action.path !== this.path.join('/') )
            {
                continue;
            }
            this.previewPanel.addButton( null, action.name, action.callback.bind( this, file ) );
        }

        this.previewPanel.merge();
    }

    _processDrop( e: DragEvent )
    {
        if( !e.dataTransfer || !e.dataTransfer.files || e.dataTransfer.files.length == 0 )
        {
            return;
        }

        const fr = new FileReader();
        const num_files = e.dataTransfer.files.length;

        for( let i = 0; i < e.dataTransfer.files.length; ++i )
        {
            const file = e.dataTransfer.files[ i ];

            const result = this.currentData.find( e => e.id === file.name );
            if(result) continue;

            fr.readAsDataURL( file );
            fr.onload = e => {

                let ext = file.name.substring( file.name.lastIndexOf('.') + 1 ).toLowerCase();
                let type = null;

                switch(ext)
                {
                case 'png':
                case 'jpg':
                    type = "image"; break;
                case 'js':
                case 'css':
                    type = "script"; break;
                case 'json':
                    type = "json"; break;
                case 'obj':
                    type = "mesh"; break;
                default:
                    type = ext;
                    break;
                }

                let item: AssetViewItem = {
                    id: file.name,
                    src: ( e.currentTarget as any ).result,
                    type,
                    children: [],
                    metadata: {
                        extension: ext,
                        lastModified: file.lastModified,
                        lastModifiedDate: this._lastModifiedToStringDate( file.lastModified ),
                        unknownExtension: type == ext
                    }
                };

                this.currentData.push( item );

                if( i == (num_files - 1) )
                {
                    this._refreshContent();
                    this.tree?.refresh(); // Refresh if tree exists
                }
            };
        }
    }

    _sortData( sortBy?: string, sortMode?: number )
    {
        sortBy = sortBy ?? ( this._lastSortBy ?? 'id' );
        sortMode = sortMode ?? this.sortMode;
        const sortDesc = ( sortMode === AssetView.CONTENT_SORT_DESC );
        this.currentData = this.currentData.sort( ( a: any, b: any ) => {
            var r = sortDesc ? b[ sortBy ].localeCompare( a[ sortBy ] ) : a[ sortBy ].localeCompare( b[ sortBy ] );
            if( r == 0 ) r = sortDesc ? b['id'].localeCompare( a['id'] ) : a[ 'id' ].localeCompare( b[ 'id' ] );
            return r;
        } );

        this._lastSortBy = sortBy;
        this.sortMode = sortMode;
        this.toolsPanel.refresh();
        this._refreshContent();
    }

    _enterFolder( folderItem: AssetViewItem | undefined, storeCurrent: boolean = true )
    {
        if( !folderItem )
        {
            return;
        }

        const child = this.currentData[ 0 ];
        const sameFolder = child?.parent?.id === folderItem.id;

        if( storeCurrent )
        {
            this.prevData.push( this.currentFolder ?? {
                id: "/",
                children: this.data,
                type: "root",
                metadata: {}
            } );
        }

        this.currentFolder = folderItem;
        this.currentData = this.currentFolder?.children ?? [];

        if( !sameFolder )
        {
            this._refreshContent();
        }

        this._updatePath();

        const onEnterFolder = this._callbacks["enterFolder"];
        if( onEnterFolder !== undefined )
        {
            const event: AssetViewEvent = {
                type: "enter_folder",
                to: folderItem,
                userInitiated: true
            };
            onEnterFolder( event );
        }
    }

    _removeItemFromParent( item: AssetViewItem )
    {
        const oldParent = item.parent;
        if( oldParent )
        {
            const idx = oldParent.children?.indexOf( item ) ?? -1;
            if( idx < 0 )
            {
                return false;
            }
            oldParent.children?.splice( idx, 1 );
        }
        else
        {
            const oldDir = item.dir;
            if( oldDir )
            {
                const idx = oldDir.indexOf( item );
                if( idx < 0 )
                {
                    return false;
                }

                oldDir.splice( idx, 1 );
            }
        }

        return true;
    }

    _requestDeleteItem( item: AssetViewItem )
    {
        const onBeforeDelete = this._callbacks["beforeDelete"];
        const onDelete = this._callbacks["delete"];

        const resolve = () => {
            this._deleteItem( item );
            const event: AssetViewEvent = {
                type: "delete",
                items: [ item ],
                userInitiated: true
            }
            if( onDelete ) onDelete( event );
        };
        
        if( onBeforeDelete )
        {
            const event: AssetViewEvent = {
                type: "delete",
                items: [ item ],
                userInitiated: true
            }

            onBeforeDelete( event, resolve );
        }
        else
        {
            resolve();
        }
    }

    _deleteItem( item: AssetViewItem )
    {
        const ok = this._removeItemFromParent( item );
        if( !ok )
        {
            console.error( "[AssetView Error] Cannot delete. Item not found." );
            return;
        }

        this._refreshContent( this.searchValue, this.filter );
        this.tree?.refresh();
        this.previewPanel?.clear();
    }

    _requestMoveItemToFolder( item: AssetViewItem, folder: AssetViewItem )
    {
        const onBeforeMove = this._callbacks["beforeMove"];
        const onMove = this._callbacks["move"];

        const resolve = () => {
            this._moveItemToFolder( item, folder );
            const event: AssetViewEvent = {
                type: "move",
                items: [ item ],
                from: item.parent,
                to: folder,
                userInitiated: true
            }
            if( onMove ) onMove( event );
        };
        
        if( onBeforeMove )
        {
            const event: AssetViewEvent = {
                type: "move",
                items: [ item ],
                from: item.parent,
                to: folder,
                userInitiated: true
            }

            onBeforeMove( event, resolve );
        }
        else
        {
            resolve();
        }
    }

    _moveItemToFolder( item: AssetViewItem, folder: AssetViewItem )
    {
        const ok = this._removeItemFromParent( item );
        if( !ok )
        {
            console.error( "[AssetView Error] Cannot move. Item not found." );
            return;
        }

        folder.children = folder.children ?? [];
        folder.children.push( item );
        item.parent = folder;
        item.dir = folder.children;

        this._refreshContent();
        this.tree?.refresh();
        this._moveItemDialog?.destroy();
        this._movingItem = undefined;
    }

    _moveItem( item: AssetViewItem, defaultFolder?: AssetViewItem | AssetViewItem[] )
    {
        if( this._moveItemDialog )
        {
            this._moveItemDialog.destroy();
        }

        this._movingItem = item;

        let targetFolder: any = null;
        let bcContainer: HTMLElement;

        const _openFolder = function( p: any, container: any, updateBc: boolean = true )
        {
            container.innerHTML = "";

            targetFolder = p;

            for( let pi of ( targetFolder.children ?? targetFolder ) )
            {
                const row = LX.makeContainer( [ "100%", "auto" ], "flex flex-row px-1 items-center", "", container );
                const isFolder = ( pi.type === "folder" );

                const rowItem = LX.makeContainer( [ "100%", "auto" ],
                    `move-item flex flex-row gap-1 py-1 px-3 cursor-pointer ${ isFolder ? "fg-primary font-medium" : "fg-quinary" } rounded-xxl ${ isFolder ? "hover:bg-secondary" : "hover:bg-primary" }`,
                    `${ isFolder ? LX.makeIcon( "FolderOpen", { svgClass: "" } ).innerHTML : "" }${ pi.id }`,
                    row
                );

                if( isFolder )
                {
                    rowItem.addEventListener( "click", () =>
                    {
                        container.querySelectorAll( ".move-item" ).forEach( ( el: any ) => LX.removeClass( el, "bg-quinary" ) );
                        LX.addClass( rowItem, "bg-quinary" );
                        targetFolder = pi;
                    } );

                    const fPathButton = new LX.Button( null, "FPathButton", () => {
                        _openFolder( pi, container );
                    }, { icon: "ChevronRight", className: "ml-auto h-8", buttonClass: "bg-none hover:bg-secondary" } );
                    row.appendChild( fPathButton.root );
                }
            }

            if( !updateBc )
            {
                return;
            }

            const path = [];

            if( targetFolder && targetFolder.parent )
            {
                path.push( targetFolder.id );

                const _pushParentsId = ( i: AssetViewItem | undefined ) => {
                    if( !i ) return;
                    path.push( i.parent ? i.id : '@' );
                    _pushParentsId( i.parent );
                };

                _pushParentsId( targetFolder.parent );
            }
            else
            {
                path.push( '@' );
            }

            bcContainer.innerHTML = "";
            bcContainer.appendChild( LX.makeBreadcrumb( path.reverse().map( p => { return { title: p } } ), {
                maxItems: 4, separatorIcon: "ChevronRight"
            }) );
        };

        this._moveItemDialog = new LX.Dialog( `Moving: ${ item.id }`, ( p: typeof Panel ) =>
        {
            const area = new LX.Area({ className: "flex flex-col rounded-lg" });
            p.attach( area );

            const content = LX.makeContainer( [ "auto", "100%" ], "flex flex-auto-fill flex-col overflow-scroll py-2 gap-1", `` );

            {
                const headerPanel = area.addPanel({ className: "p-2 border-bottom flex flex-auto", height: "auto" });
                headerPanel.sameLine( 2, "w-full" );
                headerPanel.addButton( null, "BackButton", () =>
                {
                    if( targetFolder && targetFolder.parent ) _openFolder( targetFolder.parent, content );
                }, { icon: "ArrowLeft", title: "Back", tooltip: true, className: "flex-auto", buttonClass: "bg-none hover:bg-secondary" } );

                bcContainer = LX.makeElement( "div" );

                headerPanel.addContent( "ITEM_MOVE_PATH", bcContainer, { signal: "@item_move_path", className: "flex-auto-fill" } );
            }

            area.attach( content );

            _openFolder( defaultFolder ?? this.data, content );

            {
                const footerPanel = area.addPanel({ className: "p-2 border-top flex flex-auto justify-between", height: "auto" });
                footerPanel.addButton( null, "NewFolderButton", () => {
                    this._requestCreateFolder( targetFolder );
                }, { width: "auto", icon: "FolderPlus", title: "Create Folder", tooltip: true, className: "ml-2", buttonClass: "bg-none hover:bg-secondary" } );

                footerPanel.sameLine( 2, "mr-2" );
                footerPanel.addButton( null, "Cancel", () => {
                    this._moveItemDialog.close();
                }, { buttonClass: "bg-none fg-error" } );
                footerPanel.addButton( null, "Move", () => {
                    this._requestMoveItemToFolder( item, targetFolder );
                }, { className: "", buttonClass: "contrast" } );
            }
        }, { modal: true, size: ["616px", "500px"], closable: true, onBeforeClose: () => {
            delete this._moveItemDialog;
        } });
    }

    _requestCloneItem( item: AssetViewItem )
    {
        if( item.type === "folder" )
        {
            console.error( "[AssetView Error] Cannot clone a folder." );
            return;
        }

        const dir = item.dir ?? [];
        const idx = dir.indexOf( item );
        if( idx < 0 )
        {
            console.error( "[AssetView Error] Cannot clone. Item not found." );
            return false;
        }

        const onBeforeClone = this._callbacks["beforeClone"];
        const onClone = this._callbacks["clone"];

        const resolve = () => {
            const clonedItem = this._cloneItem( item );
            const event: AssetViewEvent = {
                type: "clone",
                items: [ item ],
                result: [ clonedItem ],
                userInitiated: true
            }
            if( onClone ) onClone( event );
        };
        
        if( onBeforeClone )
        {
            const event: AssetViewEvent = {
                type: "clone",
                items: [ item ],
                userInitiated: true
            }

            onBeforeClone( event, resolve );
        }
        else
        {
            resolve();
        }
    }

    _cloneItem( item: AssetViewItem ): AssetViewItem
    {
        const parent = item.parent;
        const dir = item.dir ?? [];
        const idx = dir.indexOf( item );

        delete item.domEl;
        delete item.dir;
        delete item.parent;

        const newItem: AssetViewItem = LX.deepCopy( item );
        newItem.id = this._getClonedName( item.id, dir );
        newItem.dir = item.dir = dir;
        newItem.parent = item.parent = parent;
        newItem.metadata.uid = LX.guidGenerator(); // generate new uid

        dir.splice( idx + 1, 0, newItem );

        this._refreshContent( this.searchValue, this.filter );

        return newItem;
    }

    _getClonedName( originalName: string, siblings: any[] ): string
    {
        const dotIndex = originalName.lastIndexOf( "." );
        let base = originalName;
        let ext = "";

        if( dotIndex > 0 )
        {
            base = originalName.substring( 0, dotIndex );
            ext = originalName.substring( dotIndex ); // includes the dot
        }

        // core name without (N)
        const match = base.match(/^(.*)\s\((\d+)\)$/);
        if( match )
        {
            base = match[ 1 ];
        }

        let maxN = -1;

        for( const s of siblings )
        {
            if( !s.id ) continue;

            let sBase = s.id;
            let sExt = "";

            const sDot = sBase.lastIndexOf( "." );
            if( sDot > 0 )
            {
                sExt = sBase.substring( sDot );
                sBase = sBase.substring( 0, sDot );
            }

            // Only compare same extension and same base!
            if( sExt !== ext ) continue;

            const m = sBase.match( new RegExp("^" + LX.escapeRegExp( base ) + "\\s\\((\\d+)\\)$") );
            if( m )
            {
                const num = parseInt( m[ 1 ] );
                if( num > maxN ) maxN = num;
            }
            else if( sBase === base )
            {
                // Base name exists without number
                maxN = Math.max( maxN, 0 );
            }
        }

        return maxN === -1 ? originalName : `${base} (${ maxN + 1 })${ ext }`;
    }

    _requestRenameItem( item: AssetViewItem, newName: string )
    {
        const onBeforeRename = this._callbacks["beforeRename"];
        const onRename = this._callbacks["rename"];
        const oldName = item.id;

        const resolve = () => {
            
            this._renameItem( item, newName );
            const event: AssetViewEvent = {
                type: "rename",
                oldName,
                newName,
                userInitiated: true
            }
            if( onRename ) onRename( event );
        };
        
        if( onBeforeRename )
        {
            const event: AssetViewEvent = {
                type: "rename",
                oldName,
                newName,
                userInitiated: true
            }

            onBeforeRename( event, resolve );
        }
        else
        {
            resolve();
        }
    }

    _renameItem( item: AssetViewItem, newName: string )
    {
        const idx = this.currentData.indexOf( item );
        if( idx < 0 )
        {
            return;
        }

        const wasSelected = LX.hasClass( item.domEl, "selected" );
        const hoverTitle: HTMLElement | null = this.content.querySelector( `#floatingTitle_${ item.id.replace( /\s/g, '_' ).replaceAll( ".", "_" ) }` );
        if( hoverTitle ) hoverTitle.remove();

        item.domEl?.remove();
        item.id = newName;
        item.domEl = this.addItem( item, idx * 2 );

        if( wasSelected )
        {
            this._previewAsset( item );
        }

        this.tree?.refresh();

        this._processData( this.data );
    }

    _renameItemPopover( item: AssetViewItem )
    {
        const idx = this.currentData.indexOf( item );
        if( idx < 0 )
        {
            return;
        }

        const onRename = ( value: string ) =>
        {
            p.destroy();
            this._requestRenameItem( item, value )
        }

        let newName = item.id;
        const panel = new LX.Panel();
        panel.addText( null, item.id, ( v: string, e: any ) => {
            newName = v;
            if( e.constructor === KeyboardEvent ) onRename( v );
        });
        panel.addButton( null, "Save", () => {
            onRename( newName );
        }, { buttonClass: "contrast" });

        const p = new LX.Popover( item.domEl, [ panel ], { align: "center", side: "bottom", sideOffset: -128 });
    }

    _requestCreateFolder( folder?: AssetViewItem )
    {
        folder = folder ?? this.currentFolder;

        if( !folder )
        {
            return;
        }

        const onBeforeCreateFolder = this._callbacks["beforeCreateFolder"];
        const onCreateFolder = this._callbacks["createFolder"];

        const resolve = () => {
            const newFolder = this._createFolder( folder );
            const event: AssetViewEvent = {
                type: "create-folder",
                result: [ newFolder ],
                to: folder,
                userInitiated: true
            }
            if( onCreateFolder ) onCreateFolder( event );
        };

        if( onBeforeCreateFolder )
        {
            const event: AssetViewEvent = {
                type: "create-folder",
                userInitiated: true
            }

            onBeforeCreateFolder( event, resolve );
        }
        else
        {
            resolve();
        }
    }

    _createFolder( folder?: AssetViewItem ): AssetViewItem
    {
        folder = folder ?? this.currentFolder;

        if( !folder )
        {
            throw( "_createFolder: Something went wrong!" );
        }

        const newFolder = {
            id: this._getClonedName( "New Folder", folder.children ),
            type: "folder",
            children: [],
            parent: this.currentFolder,
            metadata: {}
        }

        folder.children.push( newFolder );

        this._refreshContent();
        this.tree?.refresh();

        if( this._moveItemDialog && this._movingItem )
        {
            this._moveItem( this._movingItem, folder )
        }

        return folder;
    }

    _openScriptInEditor( script: any )
    {
        if( this._scriptCodeDialog )
        {
            this._scriptCodeDialog.destroy();
        }

        this._scriptCodeDialog = new LX.Dialog( null, ( p: typeof Panel ) => {
            const area = new LX.Area({ className: "rounded-lg" });
            p.attach( area );
            let editor = new LX.CodeEditor( area, {
                allowAddScripts: false,
                files: [ script.src ]
            } );
        }, { size: ["50%", "600px"], closable: true, onBeforeClose: () => {
            delete this._scriptCodeDialog;
        } });
    }

    _setAssetsPerPage( n: number )
    {
        this._assetsPerPage = n;
        this._refreshContent();
    }

    _lastModifiedToStringDate( lm: number ): string
    {
        const d = new Date( lm ).toLocaleString();
        return d.substring( 0, d.indexOf( ',' ) );
    }
}

LX.AssetView = AssetView;