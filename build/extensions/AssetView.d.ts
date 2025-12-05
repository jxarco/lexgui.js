import { LX } from '../core/Namespace';
declare const Area: any;
declare const Panel: any;
declare const NodeTree: any;
export declare class AssetViewEvent {
    static NONE: number;
    static ASSET_SELECTED: number;
    static ASSET_DELETED: number;
    static ASSET_RENAMED: number;
    static ASSET_CLONED: number;
    static ASSET_DBLCLICKED: number;
    static ASSET_CHECKED: number;
    static ASSET_MOVED: number;
    static ENTER_FOLDER: number;
    type: number;
    item: any;
    value: any;
    multiple: boolean;
    constructor(type: number, item: any, value?: any);
    string(): "assetview_event_none" | "assetview_event_selected" | "assetview_event_deleted" | "assetview_event_renamed" | "assetview_event_cloned" | "assetview_event_dblclicked" | "assetview_event_checked" | "assetview_event_moved" | "assetview_event_enter_folder" | undefined;
}
/**
 * @class AssetView
 * @description Asset container with Tree for file system
 */
export declare class AssetView {
    static LAYOUT_GRID: number;
    static LAYOUT_COMPACT: number;
    static LAYOUT_LIST: number;
    static CONTENT_SORT_ASC: number;
    static CONTENT_SORT_DESC: number;
    root: HTMLElement;
    area: typeof Area | null;
    content: HTMLElement;
    leftPanel: typeof Panel | null;
    toolsPanel: any;
    contentPanel: any;
    previewPanel: any;
    tree: typeof NodeTree | null;
    prevData: any[];
    nextData: any[];
    data: any[];
    currentData: any[];
    currentFolder: any;
    path: string[];
    rootPath: string;
    selectedItem: any;
    allowedTypes: any;
    searchValue: string;
    filter: string;
    gridScale: number;
    layout: number;
    sortMode: number;
    skipBrowser: boolean;
    skipPreview: boolean;
    useNativeTitle: boolean;
    onlyFolders: boolean;
    allowMultipleSelection: boolean;
    previewActions: any[];
    contextMenu: any[];
    onRefreshContent: any;
    itemContextMenuOptions: any;
    onItemDragged: any;
    onevent: any;
    private _assetsPerPage;
    get assetsPerPage(): any;
    set assetsPerPage(v: any);
    _lastSortBy: string;
    _paginator: typeof LX.Pagination | undefined;
    constructor(options?: any);
    /**
    * @method load
    */
    load(data: any, onevent: any): void;
    /**
    * @method addItem
    */
    addItem(item: any, childIndex: number | undefined, updateTree?: boolean): HTMLLIElement;
    /**
    * @method clear
    */
    clear(): void;
    /**
    * @method _processData
    */
    _processData(data: any, parent?: any): void;
    /**
    * @method _updatePath
    */
    _updatePath(): void;
    /**
    * @method _createTreePanel
    */
    _createTreePanel(area: typeof Area): void;
    /**
    * @method _setContentLayout
    */
    _setContentLayout(layoutMode: number): void;
    /**
    * @method _createContentPanel
    */
    _createContentPanel(area: typeof Area): void;
    _refreshContent(searchValue?: string, filter?: string): void;
    _previewAsset(file: any): void;
    _processDrop(e: DragEvent): void;
    _sortData(sortBy?: string, sortMode?: number): void;
    _enterFolder(folderItem: any, storeCurrent?: boolean): void;
    _moveItemToFolder(item: any, folder: any): void;
    _deleteItem(item: any): void;
    _cloneItem(item: any): void;
    _renameItem(item: any): void;
    _setAssetsPerPage(n: number): void;
    _lastModifiedToStringDate(lm: number): string;
}
export {};
