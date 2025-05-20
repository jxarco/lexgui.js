// asset_view.js @jxarco
import { LX } from './core.js';

class AssetViewEvent {

    static NONE             = 0;
    static ASSET_SELECTED   = 1;
    static ASSET_DELETED    = 2;
    static ASSET_RENAMED    = 3;
    static ASSET_CLONED     = 4;
    static ASSET_DBLCLICKED = 5;
    static ENTER_FOLDER     = 6;
    static ASSET_CHECKED    = 7;

    constructor( type, item, value ) {
        this.type = type || LX.TreeEvent.NONE;
        this.item = item;
        this.value = value;
        this.multiple = false; // Multiple selection
    }

    string() {
        switch( this.type )
        {
            case AssetViewEvent.NONE: return "assetview_event_none";
            case AssetViewEvent.ASSET_SELECTED: return "assetview_event_selected";
            case AssetViewEvent.ASSET_DELETED: return "assetview_event_deleted";
            case AssetViewEvent.ASSET_RENAMED: return "assetview_event_renamed";
            case AssetViewEvent.ASSET_CLONED: return "assetview_event_cloned";
            case AssetViewEvent.ASSET_DBLCLICKED: return "assetview_event_dblclicked";
            case AssetViewEvent.ENTER_FOLDER: return "assetview_event_enter_folder";
            case AssetViewEvent.ASSET_CHECKED: return "assetview_event_checked";
        }
    }
};

LX.AssetViewEvent = AssetViewEvent;

/**
 * @class AssetView
 * @description Asset container with Tree for file system
 */

class AssetView {

    static LAYOUT_CONTENT       = 0;
    static LAYOUT_LIST          = 1;
    static MAX_PAGE_ELEMENTS    = 50;

    /**
     * @param {object} options
     */
    constructor( options = {} ) {

        this.rootPath = "https://raw.githubusercontent.com/jxarco/lexgui.js/master/";
        this.layout = options.layout ?? AssetView.LAYOUT_CONTENT;
        this.contentPage = 1;

        if( options.rootPath )
        {
            if(options.rootPath.constructor !== String)
                console.warn("Asset Root Path must be a String (now is " + path.constructor.name + ")");
            else
                this.rootPath = options.rootPath;
        }

        let div = document.createElement('div');
        div.className = 'lexassetbrowser';
        this.root = div;

        let area = new LX.Area( { width: "100%", height: "100%" } );
        div.appendChild( area.root );

        let left, right, contentArea = area;

        this.skipBrowser = options.skipBrowser ?? false;
        this.skipPreview = options.skipPreview ?? false;
        this.useNativeTitle = options.useNativeTitle ?? false;
        this.onlyFolders = options.onlyFolders ?? true;
        this.allowMultipleSelection = options.allowMultipleSelection ?? false;
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

        this.prevData = [];
        this.nextData = [];
        this.data = [];

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

    load( data, onevent ) {

        this.prevData.length = 0;
        this.nextData.length = 0;

        this.data = data;

        this._processData( this.data, null );
        this.currentData = this.data;
        this.path = [ '@' ];

        if( !this.skipBrowser )
        {
            this._createTreePanel( this.area );
        }

        this._refreshContent();

        this.onevent = onevent;
    }

    /**
    * @method clear
    */
    clear() {

        if( this.previewPanel )
        {
            this.previewPanel.clear();
        }

        if( this.leftPanel )
        {
            this.leftPanel.clear();
        }

        if( this.rightPanel )
        {
            this.rightPanel.clear()
        }
    }

    /**
    * @method _processData
    */

    _processData( data, parent ) {

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

    _updatePath( data ) {

        this.path.length = 0;

        const push_parents_id = i => {
            if( !i ) return;
            let list = i.children ? i.children : i;
            let c = list[ 0 ];
            if( !c ) return;
            if( !c.folder ) return;
            this.path.push( c.folder.id ?? '@' );
            push_parents_id( c.folder.folder );
        };

        push_parents_id( data );

        LX.emit( "@on_folder_change", this.path.reverse().join('/') );
    }

    /**
    * @method _createTreePanel
    */

    _createTreePanel( area ) {

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
            onevent: event => {

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
                            LX.emit("@on_folder_change", this.path.join('/'));
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

    _setContentLayout( layoutMode ) {

        this.layout = layoutMode;

        this._refreshContent();
    }

    /**
    * @method _createContentPanel
    */

    _createContentPanel( area ) {

        if( this.rightPanel )
        {
            this.rightPanel.clear();
        }
        else
        {
            this.rightPanel = area.addPanel({ className: 'lexassetcontentpanel flex flex-col overflow-hidden' });
        }

        const on_sort = ( value, event ) => {
            const cmenu = LX.addContextMenu( "Sort by", event, c => {
                c.add("Name", () => this._sortData('id') );
                c.add("Type", () => this._sortData('type') );
                c.add("");
                c.add("Ascending", () => this._sortData() );
                c.add("Descending", () => this._sortData(null, true) );
            } );
            const parent = this.parent.root.parentElement;
            if( parent.classList.contains('lexdialog') )
            {
                cmenu.root.style.zIndex = (+getComputedStyle( parent ).zIndex) + 1;
            }
        }

        const on_change_view = ( value, event ) => {
            const cmenu = LX.addContextMenu( "Layout", event, c => {
                c.add("Content", () => this._setContentLayout( AssetView.LAYOUT_CONTENT ) );
                c.add("");
                c.add("List", () => this._setContentLayout( AssetView.LAYOUT_LIST ) );
            } );
            const parent = this.parent.root.parentElement;
            if( parent.classList.contains('lexdialog') )
                cmenu.root.style.zIndex = (+getComputedStyle( parent ).zIndex) + 1;
        }

        const on_change_page = ( value, event ) => {
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
        }

        this.rightPanel.sameLine();
        this.rightPanel.addSelect( "Filter", this.allowedTypes, this.allowedTypes[ 0 ], v => this._refreshContent.call(this, null, v), { width: "30%", minWidth: "128px" } );
        this.rightPanel.addText( null, this.searchValue ?? "", v => this._refreshContent.call(this, v, null), { placeholder: "Search assets.." } );
        this.rightPanel.addButton( null, "", on_sort.bind(this), { title: "Sort", icon: "ArrowUpNarrowWide" } );
        this.rightPanel.addButton( null, "", on_change_view.bind(this), { title: "View", icon: "GripHorizontal" } );
        // Content Pages
        this.rightPanel.addButton( null, "", on_change_page.bind(this, -1), { title: "Previous Page", icon: "ChevronsLeft", className: "ml-auto" } );
        this.rightPanel.addButton( null, "", on_change_page.bind(this, 1), { title: "Next Page", icon: "ChevronsRight" } );
        const textString = "Page " + this.contentPage + " / " + ((((this.currentData.length - 1) / AssetView.MAX_PAGE_ELEMENTS )|0) + 1);
        this.rightPanel.addText(null, textString, null, {
            inputClass: "nobg", disabled: true, signal: "@on_page_change", maxWidth: "16ch" }
        );
        this.rightPanel.endLine();

        if( !this.skipBrowser )
        {
            this.rightPanel.sameLine();
            this.rightPanel.addComboButtons( null, [
                {
                    value: "Left",
                    icon: "ArrowLeft",
                    callback: domEl => {
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
                    callback: domEl => {
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
                    callback: domEl => { this._refreshContent(); }
                }
            ], { noSelection: true } );

            this.rightPanel.addText(null, this.path.join('/'), null, {
                inputClass: "nobg", disabled: true, signal: "@on_folder_change",
                style: { fontWeight: "600", fontSize: "15px" }
            });

            this.rightPanel.endLine();
        }

        this.content = document.createElement('ul');
        this.content.className = "lexassetscontent";
        this.rightPanel.root.appendChild(this.content);

        this.content.addEventListener('dragenter', function( e ) {
            e.preventDefault();
            this.classList.add('dragging');
        });
        this.content.addEventListener('dragleave', function( e ) {
            e.preventDefault();
            this.classList.remove('dragging');
        });
        this.content.addEventListener('drop', ( e ) => {
            e.preventDefault();
            this._processDrop( e );
        });
        this.content.addEventListener('click', function() {
            this.querySelectorAll('.lexassetitem').forEach( i => i.classList.remove('selected') );
        });

        this._refreshContent();
    }

    _refreshContent( searchValue, filter ) {

        const isContentLayout = ( this.layout == AssetView.LAYOUT_CONTENT ); // default

        this.filter = filter ?? ( this.filter ?? "None" );
        this.searchValue = searchValue ?? (this.searchValue ?? "");
        this.content.innerHTML = "";
        this.content.className = (isContentLayout ? "lexassetscontent" : "lexassetscontent list");
        let that = this;

        const add_item = function(item) {

            const type = item.type.charAt( 0 ).toUpperCase() + item.type.slice( 1 );
            const extension = LX.getExtension( item.id );
            const isFolder = type === "Folder";

            let itemEl = document.createElement('li');
            itemEl.className = "lexassetitem " + item.type.toLowerCase();
            itemEl.tabIndex = -1;
            that.content.appendChild( itemEl );

            if( !that.useNativeTitle )
            {
                let desc = document.createElement( 'span' );
                desc.className = 'lexitemdesc';
                desc.innerHTML = "File: " + item.id + "<br>Type: " + type;
                that.content.appendChild( desc );

                itemEl.addEventListener("mousemove", e => {

                    if( !isContentLayout )
                    {
                        return;
                    }

                    const rect = itemEl.getBoundingClientRect();
                    const targetRect = e.target.getBoundingClientRect();
                    const parentRect = desc.parentElement.getBoundingClientRect();

                    let localOffsetX = targetRect.x - parentRect.x - ( targetRect.x - rect.x );
                    let localOffsetY = targetRect.y - parentRect.y - ( targetRect.y - rect.y );

                    if( e.target.classList.contains( "lexassettitle" ) )
                    {
                        localOffsetY += ( targetRect.y - rect.y );
                    }

                    desc.style.left = (localOffsetX + e.offsetX + 12) + "px";
                    desc.style.top = (localOffsetY + e.offsetY) + "px";
                });

                itemEl.addEventListener("mouseenter", () => {
                    if( isContentLayout )
                    {
                        desc.style.display = "unset";
                    }
                });

                itemEl.addEventListener("mouseleave", () => {
                    if( isContentLayout )
                    {
                        setTimeout( () => {
                            desc.style.display = "none";
                        }, 100 );
                    }
                });
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
                checkbox.addEventListener('change', ( e, v ) => {
                    item.selected = !item.selected;
                    if( that.onevent )
                    {
                        const event = new AssetViewEvent(AssetViewEvent.ASSET_CHECKED, e.shiftKey ? [item] : item );
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
                let preview = null;
                const hasImage = item.src && (['png', 'jpg'].indexOf( LX.getExtension( item.src ) ) > -1 || item.src.includes("data:image/") ); // Support b64 image as src

                if( hasImage || isFolder || !isContentLayout)
                {
                    preview = document.createElement('img');
                    let real_src = item.unknown_extension ? that.rootPath + "images/file.png" : (isFolder ? that.rootPath + "images/folder.png" : item.src);
                    preview.src = (isContentLayout || isFolder ? real_src : that.rootPath + "images/file.png");
                    itemEl.appendChild( preview );
                }
                else
                {
                    preview = document.createElement('svg');
                    preview.className = "asset-file-preview";
                    itemEl.appendChild(preview);

                    let textEl = document.createElement('text');
                    preview.appendChild(textEl);
                    // If no extension, e.g. Clip, use the type...
                    textEl.innerText = (!extension || extension == item.id) ? item.type.toUpperCase() : ("." + extension.toUpperCase());

                    var newLength = textEl.innerText.length;
                    var charsPerLine = 2.5;
                    var newEmSize = charsPerLine / newLength;
                    var textBaseSize = 64;

                    if( newEmSize < 1 )
                    {
                        var newFontSize = newEmSize * textBaseSize;
                        textEl.style.fontSize = newFontSize + "px";
                        preview.style.paddingTop = "calc(50% - " + (textEl.offsetHeight * 0.5 + 10) + "px)"
                    }
                }
            }

            if( !isFolder )
            {
                let info = document.createElement('span');
                info.className = "lexassetinfo";
                info.innerText = type;
                itemEl.appendChild(info);
            }

            itemEl.addEventListener('click', function( e ) {
                e.stopImmediatePropagation();
                e.stopPropagation();

                const isDoubleClick = ( e.detail == LX.MOUSE_DOUBLE_CLICK );

                if( !isDoubleClick )
                {
                    if( !e.shiftKey )
                    {
                        that.content.querySelectorAll('.lexassetitem').forEach( i => i.classList.remove('selected') );
                    }

                    this.classList.add('selected');
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
                itemEl.addEventListener('contextmenu', function( e ) {
                    e.preventDefault();

                    const multiple = that.content.querySelectorAll('.selected').length;

                    LX.addContextMenu( multiple > 1 ? (multiple + " selected") :
                                isFolder ? item.id : item.type, e, m => {
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
                LX.request({ url: item.path, dataType: 'blob', success: (f) => {
                    item.bytesize = f.size;
                    fr.readAsDataURL( f );
                    fr.onload = e => {
                        item.src = e.currentTarget.result;  // This is a base64 string...
                        item._path = item.path;
                        delete item.path;
                        this._refreshContent( searchValue, filter );
                    };
                } });
            }else
            {
                item.domEl = add_item( item );
            }
        }

        this.allowNextPage = filteredData.length - 1 > AssetView.MAX_PAGE_ELEMENTS;

        const textString = "Page " + this.contentPage + " / " + ((((filteredData.length - 1) / AssetView.MAX_PAGE_ELEMENTS )|0) + 1);
        LX.emit( "@on_page_change", textString );

        if( this.onRefreshContent )
        {
            this.onRefreshContent( searchValue, filter );
        }
    }

    /**
    * @method _previewAsset
    */

    _previewAsset( file ) {

        const is_base_64 = file.src && file.src.includes("data:image/");

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
        if( file.lastModified ) this.previewPanel.addText("Last Modified", new Date( file.lastModified ).toLocaleString(), null, options);
        if( file._path || file.src ) this.previewPanel.addText("URL", file._path ? file._path : file.src, null, options);
        this.previewPanel.addText("Path", this.path.join('/'), null, options);
        this.previewPanel.addText("Type", file.type, null, options);
        if( file.bytesize ) this.previewPanel.addText("Size", (file.bytesize/1024).toPrecision(3) + " KBs", null, options);
        if( file.type == "folder" ) this.previewPanel.addText("Files", file.children ? file.children.length.toString() : "0", null, options);

        this.previewPanel.addSeparator();

        const previewActions = [...this.previewActions];

        if( !previewActions.length )
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
                continue;
            this.previewPanel.addButton( null, action.name, action.callback.bind( this, file ) );
        }

        this.previewPanel.merge();
    }

    _processDrop( e ) {

        const fr = new FileReader();
        const num_files = e.dataTransfer.files.length;

        for( let i = 0; i < e.dataTransfer.files.length; ++i )
        {
            const file = e.dataTransfer.files[ i ];

            const result = this.currentData.find( e => e.id === file.name );
            if(result) continue;

            fr.readAsDataURL( file );
            fr.onload = e => {

                let ext = file.name.substr(file.name.lastIndexOf('.') + 1).toLowerCase();

                let item = {
                    "id": file.name,
                    "src": e.currentTarget.result,
                    "extension": ext,
                    "lastModified": file.lastModified
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
                    item.unknown_extension = true;
                    break;
                }

                this.currentData.push( item );

                if( i == (num_files - 1) )
                {
                    this._refreshContent();
                    if( !this.skipBrowser )
                        this.tree.refresh();
                }
            };
        }
    }

    _sortData( sort_by, sort_descending = false ) {

        sort_by = sort_by ?? (this._lastSortBy ?? 'id');
        this.currentData = this.currentData.sort( (a, b) => {
            var r = sort_descending ? b[sort_by].localeCompare(a[sort_by]) : a[sort_by].localeCompare(b[sort_by]);
            if(r == 0) r = sort_descending ? b['id'].localeCompare(a['id']) : a['id'].localeCompare(b['id']);
            return r;
        } );

        this._lastSortBy = sort_by;
        this._refreshContent();
    }

    _enterFolder( folderItem ) {

        this.prevData.push( this.currentData );
        this.currentData = folderItem.children;
        this.contentPage = 1;
        this._refreshContent();

        // Update path
        this._updatePath(this.currentData);

        // Trigger event
        if( this.onevent )
        {
            const event = new AssetViewEvent( AssetViewEvent.ENTER_FOLDER, folderItem );
            this.onevent( event );
        }
    }

    _deleteItem( item ) {

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

        this.tree.refresh();
        this._processData( this.data );
    }

    _cloneItem( item ) {

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
}

LX.AssetView = AssetView;

export { AssetView, AssetViewEvent };