import { LX } from '../core/Namespace';
declare const Area: any;
declare const Panel: any;
declare const NodeTree: any;
declare const Tree: any;
export type AssetViewAction = 'select' | 'dbl_click' | 'check' | 'clone' | 'move' | 'delete' | 'rename' | 'enter_folder' | 'create-folder' | 'refresh-content' | 'node-drag' | 'enter-folder';
export interface AssetViewItem {
    id: string;
    type: string;
    children: AssetViewItem[];
    parent?: AssetViewItem;
    path?: string;
    src?: string;
    dir?: AssetViewItem[];
    domEl?: HTMLElement;
    metadata: any;
}
interface AssetViewEvent {
    type: AssetViewAction;
    items?: AssetViewItem[];
    result?: AssetViewItem[];
    from?: AssetViewItem;
    to?: AssetViewItem;
    where?: AssetViewItem;
    oldName?: string;
    newName?: string;
    search?: any[];
    userInitiated: boolean;
}
/**
 * Signature for cancelable events.
 * `resolve()` MUST be called by the user to perform the UI action
 */
export type AssetViewEventCallback = (event: AssetViewEvent, resolve?: (...args: any[]) => void) => boolean | void | Promise<void>;
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
    prevData: AssetViewItem[];
    nextData: AssetViewItem[];
    data: AssetViewItem[];
    currentData: AssetViewItem[];
    currentFolder: AssetViewItem | undefined;
    rootItem: AssetViewItem;
    path: string[];
    rootPath: string;
    selectedItems: AssetViewItem[];
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
    allowItemCheck: boolean;
    previewActions: any[];
    contextMenu: any[];
    itemContextMenuOptions: any;
    private _assetsPerPage;
    get assetsPerPage(): any;
    set assetsPerPage(v: any);
    _callbacks: Record<string, AssetViewEventCallback>;
    _lastSortBy: string;
    _paginator: typeof LX.Pagination | undefined;
    _scriptCodeDialog: typeof LX.Dialog | undefined;
    _moveItemDialog: typeof LX.Dialog | undefined;
    _movingItem: AssetViewItem | undefined;
    constructor(options?: any);
    /**
     * @method on
     * @description Stores an event callback for the desired action
     */
    on(eventName: string, callback: AssetViewEventCallback): void;
    /**
     * @method load
     * @description Loads and processes the input data
     */
    load(data: any): void;
    /**
     * @method addItem
     * @description Creates an item DOM element
     */
    addItem(item: AssetViewItem, childIndex: number | undefined, updateTree?: boolean): HTMLLIElement;
    /**
     * @method clear
     * @description Creates all AssetView container panels
     */
    clear(): void;
    _processData(data: any, parent?: AssetViewItem): void;
    _updatePath(): void;
    _createNavigationBar(panel: typeof Panel): void;
    _createTreePanel(area: typeof Area): void;
    _subscribeTreeEvents(tree: typeof Tree): void;
    _setContentLayout(layoutMode: number): void;
    _createContentPanel(area: typeof Area): void;
    _makeNameFilterFn(searchValue: string): (name: string) => boolean;
    _refreshContent(searchValue?: string, filter?: string, userInitiated?: boolean): void;
    _previewAsset(file: AssetViewItem): void;
    _processDrop(e: DragEvent): void;
    _sortData(sortBy?: string, sortMode?: number): void;
    _requestEnterFolder(folderItem: AssetViewItem | undefined, storeCurrent?: boolean): void;
    _enterFolder(folderItem: AssetViewItem | undefined, storeCurrent: boolean, mustRefresh: boolean): void;
    _removeItemFromParent(item: AssetViewItem): boolean;
    _requestDeleteItem(items: AssetViewItem[]): void;
    _deleteItem(item: AssetViewItem): void;
    _requestMoveItemToFolder(item: AssetViewItem, folder: AssetViewItem): void;
    _moveItemToFolder(item: AssetViewItem, folder: AssetViewItem): void;
    _moveItem(item: AssetViewItem, defaultFolder?: AssetViewItem | AssetViewItem[]): void;
    _requestCloneItem(item: AssetViewItem): false | undefined;
    _cloneItem(item: AssetViewItem): AssetViewItem;
    _getClonedName(originalName: string, siblings: any[]): string;
    _requestRenameItem(item: AssetViewItem, newName: string, treeEvent?: boolean): void;
    _renameItem(item: AssetViewItem, newName: string, data?: AssetViewItem[]): void;
    _renameItemPopover(item: AssetViewItem): void;
    _requestCreateFolder(folder?: AssetViewItem): void;
    _createFolder(folder?: AssetViewItem, newFolderName?: string): AssetViewItem;
    _openScriptInEditor(script: any): void;
    _setAssetsPerPage(n: number): void;
    _lastModifiedToStringDate(lm: number): string;
}
export {};
