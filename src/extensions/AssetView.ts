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
const ContextMenu = LX.ContextMenu;

export class AssetViewEvent {

    static NONE             = 0;
    static ASSET_SELECTED   = 1;
    static ASSET_DELETED    = 2;
    static ASSET_RENAMED    = 3;
    static ASSET_CLONED     = 4;
    static ASSET_DBLCLICKED = 5;
    static ASSET_CHECKED    = 6;
    static ENTER_FOLDER     = 7;

    type: number;
    item: any;
    value: any;
    multiple: boolean = false; // Multiple selection

    constructor( type: number, item: any, value?: any )
    {
        this.type = type || LX.TreeEvent.NONE;
        this.item = item;
        this.value = value;
    }

    string()
    {
        switch( this.type )
        {
            case AssetViewEvent.NONE: return "assetview_event_none";
            case AssetViewEvent.ASSET_SELECTED: return "assetview_event_selected";
            case AssetViewEvent.ASSET_DELETED: return "assetview_event_deleted";
            case AssetViewEvent.ASSET_RENAMED: return "assetview_event_renamed";
            case AssetViewEvent.ASSET_CLONED: return "assetview_event_cloned";
            case AssetViewEvent.ASSET_DBLCLICKED: return "assetview_event_dblclicked";
            case AssetViewEvent.ASSET_CHECKED: return "assetview_event_checked";
            case AssetViewEvent.ENTER_FOLDER: return "assetview_event_enter_folder";
        }
    }
};

LX.AssetViewEvent = AssetViewEvent;

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

    static MAX_PAGE_ELEMENTS    = 50;

    root: HTMLElement;
    area: typeof Area | null = null;
    content!: HTMLElement; // "!" to avoid TS strict property initialization error
    leftPanel: typeof Panel | null = null;
    toolsPanel: any;
    contentPanel: any;
    previewPanel: any;
    tree: typeof NodeTree | null = null;

    prevData: any[] = [];
    nextData: any[] = [];
    data: any[] = [];
    currentData: any[];
    path: string[] = [];
    rootPath: string = "";
    selectedItem: any = null;
    allowedTypes: string[] = [];
    allowNextPage: boolean = false;
    contentPage: number = 1;
    searchValue: string = "";
    filter: string = "None";

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

    onevent: any = null;

    _lastSortBy: string = "";

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
        this.contextMenu = options.contextMenu ?? [];
        this.onRefreshContent = options.onRefreshContent;

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

        this.allowedTypes = options.allowedTypes || ["None", "Image", "Mesh", "Script", "JSON", "Clip"];

        this._processData( this.data, null );

        this.currentData = this.data;
        this.path = ['@'];

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
    * @method load
    */

    load( data: any, onevent: any )
    {
        this.prevData.length = 0;
        this.nextData.length = 0;

        this.data = data;

        this._processData( this.data, null );
        this.currentData = this.data;
        this.path = [ '@' ];

        if( !this.skipBrowser && this.area )
        {
            this._createTreePanel( this.area );
        }

        this._refreshContent();

        this.onevent = onevent;
    }

    /**
    * @method clear
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

    /**
    * @method _processData
    */

    _processData( data: any, parent?: any )
    {
        if( data.constructor !== Array )
        {
            data[ 'folder' ] = parent;
            data.children = data.children ?? [];
        }

        let list = data.constructor === Array ? data : data.children;

        for( var i = 0; i < list.length; ++i )
        {
            this._processData( list[ i ], data );
        }
    }

    /**
    * @method _updatePath
    */

    _updatePath( data: any )
    {
        this.path.length = 0;

        const _pushParentsId = ( i: any ) => {
            if( !i ) return;
            let list = i.children ? i.children : i;
            let c = list[ 0 ];
            if( !c ) return;
            if( !c.folder ) return;
            this.path.push( c.folder.id ?? '@' );
            _pushParentsId( c.folder.folder );
        };

        _pushParentsId( data );

        LX.emitSignal( "@on_folder_change", this.path.reverse().join('/') );
    }

    /**
    * @method _createTreePanel
    */

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

        // Process data to show in tree
        let tree_data = {
            id: '/',
            children: this.data
        }

        const tree = this.leftPanel.addTree( "Content Browser", tree_data, {
            // icons: tree_icons,
            filter: false,
            onlyFolders: this.onlyFolders,
            onevent: ( event: typeof TreeEvent ) => {

                let node = event.node;
                let value = event.value;

                switch( event.type )
                {
                    case LX.TreeEvent.NODE_SELECTED:
                        if( !event.multiple )
                        {
                            this._enterFolder( node );
                        }
                        if( !node.parent )
                        {
                            this.prevData.push( this.currentData );
                            this.currentData = this.data;
                            this._refreshContent();

                            this.path = ['@'];
                            LX.emitSignal("@on_folder_change", this.path.join('/'));
                        }
                        break;
                    case LX.TreeEvent.NODE_DRAGGED:
                        node.folder = value;
                        this._refreshContent();
                        break;
                }
            },
        });

        this.tree = tree.innerTree;
    }

    /**
    * @method _setContentLayout
    */

    _setContentLayout( layoutMode: number )
    {
        this.layout = layoutMode;
        this.toolsPanel.refresh();
        this._refreshContent();
    }

    /**
    * @method _createContentPanel
    */

    _createContentPanel( area: typeof Area )
    {
        if( this.toolsPanel )
        {
            this.contentPanel.clear();
        }
        else
        {
            area.root.classList.add( "flex", "flex-col" );
            this.toolsPanel = area.addPanel({ className: 'flex flex-col overflow-hidden', height:"auto" });
            this.toolsPanel.root.style.flex = "none";
            this.contentPanel = area.addPanel({ className: 'lexassetcontentpanel flex flex-col overflow-hidden' });
        }

        const _onSort = ( value: any, event: any ) => {
            new LX.DropdownMenu( event.target, [
                { name: "Name", icon: "ALargeSmall", callback: () => this._sortData( "id" ) },
                { name: "Type", icon: "Type", callback: () => this._sortData( "type" ) },
                null,
                { name: "Ascending", icon: "SortAsc", callback: () => this._sortData( undefined, AssetView.CONTENT_SORT_ASC ) },
                { name: "Descending", icon: "SortDesc", callback: () => this._sortData( undefined, AssetView.CONTENT_SORT_DESC ) }
            ], { side: "right", align: "start" });
        };

        const _onChangeView = ( value: any, event: any ) => {
            new LX.DropdownMenu( event.target, [
                { name: "Grid", icon: "LayoutGrid", callback: () => this._setContentLayout( AssetView.LAYOUT_GRID ) },
                { name: "Compact", icon: "LayoutList", callback: () => this._setContentLayout( AssetView.LAYOUT_COMPACT ) },
                { name: "List", icon: "List", callback: () => this._setContentLayout( AssetView.LAYOUT_LIST ) }
            ], { side: "right", align: "start" });
        };

        const _onChangePage = ( value: any, event: any ) => {
            if( !this.allowNextPage )
            {
                return;
            }
            const lastPage = this.contentPage;
            this.contentPage += value;
            this.contentPage = Math.min( this.contentPage, (((this.currentData.length - 1) / AssetView.MAX_PAGE_ELEMENTS )|0) + 1 );
            this.contentPage = Math.max( this.contentPage, 1 );

            if( lastPage != this.contentPage )
            {
                this._refreshContent();
            }
        };

        this.toolsPanel.refresh = () => {
            this.toolsPanel.clear();
            this.toolsPanel.sameLine();
            this.toolsPanel.addSelect( "Filter", this.allowedTypes, this.filter ?? this.allowedTypes[ 0 ], ( v: any ) => {
                this._refreshContent( undefined, v );
            }, { width: "30%", minWidth: "128px", overflowContainer: null } );
            this.toolsPanel.addText( null, this.searchValue ?? "", ( v: string ) => this._refreshContent.call( this, v, undefined ), { placeholder: "Search assets.." } );
            this.toolsPanel.addButton( null, "", _onSort.bind(this), { title: "Sort", tooltip: true, icon: ( this.sortMode === AssetView.CONTENT_SORT_ASC ) ? "SortAsc" : "SortDesc" } );
            this.toolsPanel.addButton( null, "", _onChangeView.bind(this), { title: "View", tooltip: true, icon: ( this.layout === AssetView.LAYOUT_GRID ) ? "LayoutGrid" : "LayoutList" } );
            // Content Pages
            this.toolsPanel.addButton( null, "", _onChangePage.bind(this, -1), { title: "Previous Page", icon: "ChevronsLeft", className: "ml-auto" } );
            this.toolsPanel.addButton( null, "", _onChangePage.bind(this, 1), { title: "Next Page", icon: "ChevronsRight" } );
            const textString = "Page " + this.contentPage + " / " + ((((this.currentData.length - 1) / AssetView.MAX_PAGE_ELEMENTS )|0) + 1);
            this.toolsPanel.addText(null, textString, null, {
                inputClass: "nobg", disabled: true, signal: "@on_page_change", maxWidth: "16ch" }
            );
            this.toolsPanel.endLine();

            if( !this.skipBrowser )
            {
                this.toolsPanel.sameLine();
                this.toolsPanel.addComboButtons( null, [
                    {
                        value: "Left",
                        icon: "ArrowLeft",
                        callback: () => {
                            if(!this.prevData.length) return;
                            this.nextData.push( this.currentData );
                            this.currentData = this.prevData.pop();
                            this._refreshContent();
                            this._updatePath( this.currentData );
                        }
                    },
                    {
                        value: "Right",
                        icon: "ArrowRight",
                        callback: () => {
                            if(!this.nextData.length) return;
                            this.prevData.push( this.currentData );
                            this.currentData = this.nextData.pop();
                            this._refreshContent();
                            this._updatePath( this.currentData );
                        }
                    },
                    {
                        value: "Refresh",
                        icon: "Refresh",
                        callback: () => { this._refreshContent(); }
                    }
                ], { noSelection: true } );

                this.toolsPanel.addText(null, this.path.join('/'), null, {
                    inputClass: "nobg", disabled: true, signal: "@on_folder_change",
                    style: { fontWeight: "600", fontSize: "15px" }
                });

                this.toolsPanel.endLine();
            }
        };

        this.toolsPanel.refresh();

        // Start content panel

        this.content = document.createElement( 'ul' );
        this.content.className = "lexassetscontent";
        this.contentPanel.attach( this.content );

        this.content.addEventListener( 'dragenter', function( e: DragEvent ) {
            e.preventDefault();
            this.classList.add('dragging');
        });
        this.content.addEventListener( 'dragleave', function( e: DragEvent ) {
            e.preventDefault();
            this.classList.remove('dragging');
        });
        this.content.addEventListener( 'drop', ( e: DragEvent ) => {
            e.preventDefault();
            this._processDrop( e );
        });
        this.content.addEventListener('click', function() {
            this.querySelectorAll('.lexassetitem').forEach( i => i.classList.remove('selected') );
        });

        this._refreshContent();
    }

    _refreshContent( searchValue?: string, filter?: string )
    {
        const isGridLayout = ( this.layout == AssetView.LAYOUT_GRID ); // default
        const isCompactLayout = ( this.layout == AssetView.LAYOUT_COMPACT );
        const isListLayout = ( this.layout == AssetView.LAYOUT_LIST );

        this.filter = filter ?? ( this.filter ?? "None" );
        this.searchValue = searchValue ?? ( this.searchValue ?? "" );
        this.content.innerHTML = "";
        this.content.className = `lexassetscontent${ isCompactLayout ? " compact" : ( isListLayout ? " list" : "" ) }`;
        let that = this;

        const _addItem = function( item: any )
        {
            const type = item.type.charAt( 0 ).toUpperCase() + item.type.slice( 1 );
            const extension = LX.getExtension( item.id );
            const isFolder = type === "Folder";

            let itemEl = document.createElement('li');
            itemEl.className = "lexassetitem " + item.type.toLowerCase();
            itemEl.tabIndex = -1;
            that.content.appendChild( itemEl );

            if( item.lastModified && !item.lastModifiedDate )
            {
                item.lastModifiedDate = that._lastModifiedToStringDate( item.lastModified );
            }

            if( !that.useNativeTitle )
            {
                let desc = document.createElement( 'span' );
                desc.className = 'lexitemdesc';
                desc.id = `floatingTitle_${ item.id }`;
                desc.innerHTML = `File: ${ item.id }<br>Type: ${ type }`;
                that.content.appendChild( desc );

                itemEl.addEventListener( "mousemove", ( e: MouseEvent ) => {

                    if( !isGridLayout )
                    {
                        return;
                    }

                    const dialog = itemEl.closest('dialog');
                    const rect = itemEl.getBoundingClientRect();
                    const target = e.target as any;
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

            if( that.allowMultipleSelection )
            {
                let checkbox = document.createElement( 'input' );
                checkbox.type = "checkbox";
                checkbox.className = "lexcheckbox";
                checkbox.checked = item.selected;
                checkbox.addEventListener('change', ( e: any ) => {
                    item.selected = !item.selected;
                    if( that.onevent )
                    {
                        const event = new AssetViewEvent( AssetViewEvent.ASSET_CHECKED, e.shiftKey ? [ item ] : item );
                        event.multiple = !!e.shiftKey;
                        that.onevent( event );
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

            if( !that.skipPreview )
            {
                if( item.type === 'video' )
                {
                    const itemVideo = LX.makeElement( 'video', 'absolute left-0 top-0 w-full border-none pointer-events-none', '', itemEl );
                    itemVideo.setAttribute( 'disablePictureInPicture', false );
                    itemVideo.setAttribute( 'disableRemotePlayback', false );
                    itemVideo.setAttribute( 'loop', true );
                    itemVideo.setAttribute( 'async', true );
                    itemVideo.style.transition = 'opacity 0.2s ease-out';
                    itemVideo.style.opacity = item.preview ? '0' : '1';
                    itemVideo.src = item.src;
                    itemVideo.volume = item.videoVolume ?? 0.4;
                }

                let preview = null;

                const previewSrc    = item.preview ?? item.src;
                const hasImage = previewSrc && (
                    (() => {
                        const ext = LX.getExtension( previewSrc.split( '?' )[ 0 ].split( '#' )[ 0 ]); // get final source without url parameters/anchors
                        return ext ? ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'avif'].includes( ext.toLowerCase() ) : false;
                    })()
                    || previewSrc.startsWith( 'data:image/' )
                );

                if( hasImage || isFolder || !isGridLayout )
                {
                    const defaultPreviewPath    = `${ that.rootPath }images/file.png`;
                    const defaultFolderPath     = `${ that.rootPath }images/folder.png`;

                    preview = document.createElement('img');
                    let realSrc = item.unknownExtension ? defaultPreviewPath : ( isFolder ? defaultFolderPath : previewSrc );
                    preview.src = ( isGridLayout || isFolder ? realSrc : defaultPreviewPath );
                    itemEl.appendChild( preview );
                }
                else
                {
                    preview = document.createElement( 'svg' );
                    preview.className = 'asset-file-preview';
                    itemEl.appendChild( preview );

                    let textEl = document.createElement( 'text' );
                    textEl.innerText = ( !extension || extension == item.id ) ? item.type.toUpperCase() : ( `.${ extension.toUpperCase() }` ); // If no extension, e.g. Clip, use the type...
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
                if( item.bytesize ) itemInfoHtml += ` | ${ LX.formatBytes( item.bytesize ) }`;
                if( item.lastModifiedDate ) itemInfoHtml += ` | ${ item.lastModifiedDate }`;
            }

            LX.makeContainer( [ 'auto', 'auto' ], 'lexassetinfo', itemInfoHtml, itemEl );

            itemEl.addEventListener('click', function( e ) {
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

                if( that.onevent )
                {
                    const event = new AssetViewEvent(isDoubleClick ? AssetViewEvent.ASSET_DBLCLICKED : AssetViewEvent.ASSET_SELECTED, e.shiftKey ? [item] : item );
                    event.multiple = !!e.shiftKey;
                    that.onevent( event );
                }
            });

            if( that.contextMenu )
            {
                itemEl.addEventListener( 'contextmenu', function( e ) {
                    e.preventDefault();

                    const multiple = that.content.querySelectorAll('.selected').length;

                    LX.addContextMenu( multiple > 1 ? (multiple + " selected") :
                                isFolder ? item.id : item.type, e, ( m: typeof ContextMenu ) => {
                        if( multiple <= 1 )
                        {
                            m.add("Rename");
                        }
                        if( !isFolder )
                        {
                            m.add("Clone", that._cloneItem.bind( that, item ));
                        }
                        if( multiple <= 1 )
                        {
                            m.add("Properties");
                        }
                        m.add("");
                        m.add("Delete", that._deleteItem.bind( that, item ));
                    });
                });
            }

            itemEl.addEventListener("dragstart", function( e ) {
                e.preventDefault();
            }, false );

            itemEl.addEventListener( "mouseenter", ( e ) => {

                if( !that.useNativeTitle && isGridLayout )
                {
                    const desc: any = that.content.querySelector( `#floatingTitle_${ item.id }` );
                    if( desc ) desc.style.display = "unset";
                }

                if( item.type !== "video" ) return;
                e.preventDefault();
                const video: any = itemEl.querySelector( "video" );
                video.style.opacity = "1";
                video.play();
            } );

            itemEl.addEventListener( "mouseleave", ( e ) => {

                if( !that.useNativeTitle && isGridLayout )
                {
                    setTimeout( () => {
                        const desc: any = that.content.querySelector( `#floatingTitle_${ item.id }` );
                        if( desc ) desc.style.display = "none";
                    }, 100 );
                }

                if( item.type !== "video" ) return;
                e.preventDefault();
                const video: any = itemEl.querySelector( "video" );
                video.pause();
                video.currentTime = 0;
                if( item.preview )
                {
                    video.style.opacity = "0";
                }
            } );

            return itemEl;
        }

        const fr = new FileReader();

        const filteredData = this.currentData.filter( _i => {
            return (this.filter != "None" ? _i.type.toLowerCase() == this.filter.toLowerCase() : true) &&
                _i.id.toLowerCase().includes(this.searchValue.toLowerCase())
        } );

        if( filter || searchValue )
        {
            this.contentPage = 1;
        }

        // Show all data if using filters
        const startIndex = (this.contentPage - 1) * AssetView.MAX_PAGE_ELEMENTS;
        const endIndex = Math.min( startIndex + AssetView.MAX_PAGE_ELEMENTS, filteredData.length );

        for( let i = startIndex; i < endIndex; ++i )
        {
            let item = filteredData[ i ];

            if( item.path )
            {
                LX.request({ url: item.path, dataType: 'blob', success: ( f: File ) => {
                    item.bytesize = f.size;
                    fr.readAsDataURL( f );
                    fr.onload = e => {
                        const target = e.currentTarget as any;
                        item.src = target.result;  // This is a base64 string...
                        item._path = item.path;
                        delete item.path;
                        this._refreshContent( searchValue, filter );
                    };
                } });
            }else
            {
                item.domEl = _addItem( item );
            }
        }

        this.allowNextPage = filteredData.length - 1 > AssetView.MAX_PAGE_ELEMENTS;

        const textString = "Page " + this.contentPage + " / " + ((((filteredData.length - 1) / AssetView.MAX_PAGE_ELEMENTS )|0) + 1);
        LX.emitSignal( "@on_page_change", textString );

        if( this.onRefreshContent )
        {
            this.onRefreshContent( searchValue, filter );
        }
    }

    /**
    * @method _previewAsset
    */

    _previewAsset( file: any )
    {
        const is_base_64 = file.src && file.src.includes( "data:image/" );

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

        const options = { disabled: true };

        this.previewPanel.addText("Filename", file.id, null, options);
        if( file.lastModifiedDate ) this.previewPanel.addText("Last Modified", file.lastModifiedDate, null, options);
        if( file._path || file.src ) this.previewPanel.addText("URL", file._path ? file._path : file.src, null, options);
        this.previewPanel.addText("Path", this.path.join('/'), null, options);
        this.previewPanel.addText("Type", file.type, null, options);
        if( file.bytesize ) this.previewPanel.addText("Size", LX.formatBytes( file.bytesize ), null, options);
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

                let item: any = {
                    "id": file.name,
                    "src": ( e.currentTarget as any ).result,
                    "extension": ext,
                    "lastModified": file.lastModified,
                    "lastModifiedDate": this._lastModifiedToStringDate( file.lastModified )
                };

                switch(ext)
                {
                case 'png':
                case 'jpg':
                    item.type = "image"; break;
                case 'js':
                case 'css':
                    item.type = "script"; break;
                case 'json':
                    item.type = "json"; break;
                case 'obj':
                    item.type = "mesh"; break;
                default:
                    item.type = ext;
                    item.unknownExtension = true;
                    break;
                }

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
        this.currentData = this.currentData.sort( ( a, b ) => {
            var r = sortDesc ? b[ sortBy ].localeCompare( a[ sortBy ] ) : a[ sortBy ].localeCompare( b[ sortBy ] );
            if( r == 0 ) r = sortDesc ? b['id'].localeCompare( a['id'] ) : a[ 'id' ].localeCompare( b[ 'id' ] );
            return r;
        } );

        this._lastSortBy = sortBy;
        this.sortMode = sortMode;
        this.toolsPanel.refresh();
        this._refreshContent();
    }

    _enterFolder( folderItem: any )
    {
        this.prevData.push( this.currentData );
        this.currentData = folderItem.children;
        this.contentPage = 1;
        this._refreshContent();

        // Update path
        this._updatePath( this.currentData );

        // Trigger event
        if( this.onevent )
        {
            const event = new AssetViewEvent( AssetViewEvent.ENTER_FOLDER, folderItem );
            this.onevent( event );
        }
    }

    _deleteItem( item: any )
    {
        const idx = this.currentData.indexOf( item );
        if(idx < 0)
        {
            console.error( "[AssetView Error] Cannot delete. Item not found." );
            return;
        }

        this.currentData.splice( idx, 1 );
        this._refreshContent( this.searchValue, this.filter );

        if( this.onevent)
        {
            const event = new AssetViewEvent( AssetViewEvent.ASSET_DELETED, item );
            this.onevent( event );
        }

        this.tree?.refresh();
        this._processData( this.data );
    }

    _cloneItem( item: any )
    {
        const idx = this.currentData.indexOf( item );
        if( idx < 0 )
        {
            return;
        }

        delete item.domEl;
        delete item.folder;
        const new_item = LX.deepCopy( item );
        this.currentData.splice( idx, 0, new_item );

        this._refreshContent( this.searchValue, this.filter );

        if( this.onevent )
        {
            const event = new AssetViewEvent( AssetViewEvent.ASSET_CLONED, item );
            this.onevent( event );
        }

        this._processData( this.data );
    }

    _lastModifiedToStringDate( lm: number ): string
    {
        const d = new Date( lm ).toLocaleString();
        return d.substring( 0, d.indexOf( ',' ) );
    }
}

LX.AssetView = AssetView;