import { Menubar } from '../components/Menubar';
import { Tabs } from '../components/Tabs';
import { Panel } from './Panel';
export declare class AreaOverlayButtons {
    area: Area;
    options: any;
    buttons: any;
    constructor(area: Area, buttonsArray: any[], options?: {});
    _buildButtons(buttonsArray: any[], options?: any): void;
}
export declare class Area {
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
    offset: number;
    root: any;
    size: any[];
    resize: boolean;
    sections: any[];
    panels: any[];
    minWidth: number;
    minHeight: number;
    maxWidth: number;
    maxHeight: Number;
    layout: any;
    type?: string;
    parentArea?: Area;
    splitBar?: any;
    splitExtended?: boolean;
    overlayButtons?: AreaOverlayButtons;
    onresize?: any;
    _autoVerticalResizeObserver?: ResizeObserver;
    _root: any;
    constructor(options?: any);
    /**
     * @method attach
     * @param {Element} content child to append to area (e.g. a Panel)
     */
    attach(content: any): void;
    /**
     * @method setLayout
     * @description Automatically split the area to generate the desired layout
     * @param {Array} layout
     */
    setLayout(layout: any): void;
    /**
     * @method split
     * @param {Object} options
     * type: Split mode (horizontal, vertical) ["horizontal"]
     * sizes: CSS Size of each new area (Array) ["50%", "50%"]
     * resize: Allow area manual resizing [true]
     * sizes: "Allow the area to be minimized [false]
     */
    split(options?: any): any[];
    /**
     * @method setLimitBox
     * Set min max for width and height
     */
    setLimitBox(minw?: number, minh?: number, maxw?: number, maxh?: number): void;
    /**
     * @method resize
     * Resize element
     */
    setSize(size: any[]): void;
    /**
     * @method extend
     * Hide 2nd area split
     */
    extend(): void;
    /**
     * @method reduce
     * Show 2nd area split
     */
    reduce(): void;
    /**
     * @method hide
     * Hide element
     */
    hide(): void;
    /**
     * @method show
     * Show element if it is hidden
     */
    show(): void;
    /**
     * @method toggle
     * Toggle element if it is hidden
     */
    toggle(force: boolean): void;
    /**
     * @method propagateEvent
     */
    propagateEvent(eventName: string): void;
    /**
     * @method addPanel
     * @param {Object} options
     * Options to create a Panel
     */
    addPanel(options: any): Panel;
    /**
     * @method addMenubar
     * @param {Array} items Items to fill the menubar
     * @param {Object} options:
     * float: Justify content (left, center, right) [left]
     * sticky: Fix menubar at the top [true]
     */
    addMenubar(items: any[], options?: any): Menubar;
    /**
     * @method addSidebar
     * @param {Function} callback Function to fill the sidebar
     * @param {Object} options: Sidebar options
     * width: Width of the sidebar [16rem]
     * side: Side to attach the sidebar (left|right) [left]
     */
    addSidebar(callback: any, options?: any): any;
    /**
     * @method addOverlayButtons
     * @param {Array} buttons Buttons info
     * @param {Object} options:
     * float: Where to put the buttons (h: horizontal, v: vertical, t: top, m: middle, b: bottom, l: left, c: center, r: right) [htc]
     */
    addOverlayButtons(buttons: any[], options?: any): any;
    /**
     * @method addTabs
     * @param {Object} options:
     * parentClass: Add extra class to tab buttons container
     */
    addTabs(options?: any): Tabs;
    _moveSplit(dt: number, forceAnimation?: boolean, forceWidth?: number): void;
    _disableSplitResize(): void;
    _update(newSize?: any[], propagate?: boolean): void;
}
