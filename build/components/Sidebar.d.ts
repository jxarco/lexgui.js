import { Area } from './../core/Area';
/**
 * @class Sidebar
 */
export declare class Sidebar {
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
    root: any;
    callback: any;
    items: any[];
    icons: any;
    groups: any;
    side: string;
    collapsable: boolean;
    collapsed: boolean;
    filterString: string;
    filter: any;
    header: any;
    content: any;
    footer: any;
    resizeObserver: ResizeObserver | undefined;
    siblingArea: Area | undefined;
    currentGroup: any;
    collapseQueue: any;
    collapseContainer: any;
    _collapseWidth: string;
    private _displaySelected;
    get displaySelected(): boolean;
    set displaySelected(v: boolean);
    constructor(options?: any);
    _generateDefaultHeader(options?: any): HTMLDivElement;
    _generateDefaultFooter(options?: any): HTMLDivElement;
    /**
     * @method toggleCollapsed
     * @param {Boolean} force: Force collapsed state
     */
    toggleCollapsed(force?: boolean): void;
    /**
     * @method separator
     */
    separator(): void;
    /**
     * @method group
     * @param {String} groupName
     * @param {Object} action: { icon, callback }
     */
    group(groupName: string, action: any): void;
    /**
     * @method add
     * @param {String} path
     * @param {Object} options:
     * callback: Function to call on each item
     * className: Add class to the entry DOM element
     * collapsable: Add entry as a collapsable section
     * icon: Entry icon
     */
    add(path: string, options?: any): void;
    /**
     * @method select
     * @param {String} name Element name to select
     */
    select(name: string): void;
    update(): void;
}
