declare const vec2: any;
declare const Area: any;
declare const Sidebar: any;
declare const PocketDialog: any;
export declare class BoundingBox {
    origin: typeof vec2;
    size: typeof vec2;
    constructor(o: typeof vec2, s: typeof vec2);
    merge(bb: BoundingBox): void;
    inside(bb: BoundingBox, full?: boolean): boolean;
}
/**
 * @class GraphEditor
 */
export declare class GraphEditor {
    static __instances: GraphEditor[];
    static MIN_SCALE: number;
    static MAX_SCALE: number;
    static EVENT_MOUSEMOVE: number;
    static EVENT_MOUSEWHEEL: number;
    static LAST_GROUP_ID: number;
    static LAST_FUNCTION_ID: number;
    static STOPPED: number;
    static RUNNING: number;
    static NODE_IO_INPUT: number;
    static NODE_IO_OUTPUT: number;
    static NODE_TYPES: Record<string, GraphNode>;
    static onCustomNodeRegistered: (s: string, n: GraphNode) => void;
    static onNodeTypeReplaced: (s: string, n: GraphNode, p: GraphNode) => void;
    root: HTMLElement;
    area: typeof Area;
    propertiesDialog: typeof PocketDialog;
    currentGraph: Graph | null;
    keys: any;
    graphs: Record<string, any>;
    nodes: Record<string, any>;
    variables: Record<string, any>;
    groups: any;
    supportedCastTypes: any;
    selectedNodes: any[];
    main: string;
    mustStop: boolean;
    state: number;
    isFocused: boolean;
    _graphContainer: HTMLElement;
    _sidebarDom: HTMLElement;
    _sidebarActive: boolean;
    _sidebar: typeof Sidebar;
    _domLinks: HTMLElement;
    _domNodes: HTMLElement;
    _mousePosition: typeof vec2;
    _deltaMousePosition: typeof vec2;
    _snappedDeltaMousePosition: typeof vec2;
    _lastMousePosition: typeof vec2;
    _lastSnappedMousePosition: typeof vec2;
    _generatingLink: any;
    _snapToGrid: boolean;
    _snapValue: number;
    _nodeBackgroundOpacity: number;
    _patternSizeF: number;
    _patternSize: typeof vec2;
    _circlePatternSize: number;
    _circlePatternColor: string;
    _background: SVGSVGElement | undefined;
    _undoSteps: any[];
    _redoSteps: any[];
    _clipboardData: any;
    _lastMouseDown: number;
    _boxSelecting: any;
    _boxSelectRemoving: any;
    _currentBoxSelectionSVG: SVGSVGElement | undefined;
    constructor(area: typeof Area, options?: any);
    static getInstances(): GraphEditor[];
    /**
     * Register a node class so it can be listed when the user wants to create a new one
     * @method registerCustomNode
     * @param {String} type: name of the node and path
     * @param {Class} baseClass class containing the structure of the custom node
     */
    static registerCustomNode(type: string, baseClass: any): void;
    /**
     * Create a node of a given type with a name. The node is not attached to any graph yet.
     * @method createNode
     * @param {String} type full name of the node class. p.e. "math/sin"
     * @param {String} title a name to distinguish from other nodes
     * @param {Object} options Store node options
     */
    static addNode(type: string, title?: string, options?: any): any;
    /**
     * @method setGraph
     * @param {Graph} graph
     */
    setGraph(graph: Graph): void;
    /**
     * @method loadGraph
     * @param {String} url
     * @param {Function} callback Function to call once the graph is loaded
     */
    loadGraph(url: string, callback?: (g: Graph) => void): void;
    /**
     * @method addGraph
     * @param {Object} o Options to configure the graph
     */
    addGraph(o?: any): Graph;
    /**
     * @method addGraphFunction
     * @param {Object} o Options to configure the graph
     */
    addGraphFunction(o?: any): GraphFunction;
    /**
     * @method clear
     */
    clear(): void;
    setVariable(name: string, value: any): void;
    getVariable(name: string): any;
    propagateEventToAllNodes(eventName: string, params?: any): void;
    /**
     * @method addCastType
     * @param {String} type: Type to cast
     * @param {String} targetType: Types to be casted from original type
     * @param {Function} fn: Function to know how to cast
     */
    addCastType(type: string, targetType: string, fn: any): void;
    /**
     * @method unSelectAll
     */
    unSelectAll(keepPropDialog?: boolean): void;
    _createNodeDOM(node: any): HTMLDivElement;
    _updateNodeDOMIOs(dom: HTMLElement, node: GraphNode): void;
    _addNodeIOEvents(nodeContainer: HTMLElement): void;
    _getAllDOMNodes(includeGroups?: boolean, exclude?: HTMLElement): ChildNode[];
    _onMoveNodes(target: HTMLElement): void;
    _onDragNode(target: HTMLElement, e: DragEvent): void;
    _onMoveGroup(target: any): void;
    _onDragGroup(target: any): void;
    _selectNode(dom: HTMLElement, multiSelection?: boolean, forceOrder?: boolean): void;
    _unSelectNode(dom: HTMLElement): void;
    _translateNode(dom: any, deltaTranslation: typeof vec2, updateBasePosition?: boolean): void;
    _deleteNode(nodeId: string): void;
    _deleteGroup(groupId: string): void;
    _cloneNode(nodeId: string, graphId?: string, position?: typeof vec2): void;
    _cloneNodes(): void;
    _getNodePosition(dom: HTMLElement): any;
    _getNodeDOMElement(nodeId: string): any;
    _getLinks(nodeSrcId: string, nodeDstId: string): any;
    _deleteLinks(nodeId: string, io: any): void;
    _processFocus(active?: boolean): void;
    _processKeyDown(e: KeyboardEvent): void;
    _processKeyUp(e: KeyboardEvent): void;
    _processMouse(e: any): void;
    _processClick(e: MouseEvent): void;
    _processBackgroundClick(e: MouseEvent): void;
    _processMouseDown(e: MouseEvent): void;
    _processMouseUp(e: MouseEvent): void;
    _processMouseMove(e: MouseEvent): void;
    _processWheel(e: WheelEvent): void;
    _processContextMenu(e: any, autoConnect?: any): void;
    /**
     * @method start
     */
    start(): void;
    /**
     * @method stop
     */
    stop(): void;
    /**
     * @method _frame
     */
    _frame(): void;
    _generatePattern(): void;
    _updatePattern(): void;
    _getPatternPosition(renderPosition: typeof vec2): any;
    _getRenderPosition(patternPosition: typeof vec2): any;
    _onLink(e: any): true | undefined;
    _updatePreviewLink(e: any, endIO?: any): any;
    _createLink(link: any): void;
    _createLinkPath(path: any, startPos: typeof vec2, endPos: typeof vec2, color?: any, exactEnd?: boolean): void;
    _updateNodeLinks(nodeId: string): void;
    _drawBoxSelection(e: MouseEvent): void;
    _getNonVisibleNodes(): GraphNode[];
    _selectNodesInBox(lt: typeof vec2, rb: typeof vec2, remove?: boolean): void;
    _deleteSelection(e?: any): void;
    _getBoundingFromGroup(groupDOM: HTMLElement): BoundingBox;
    _getBoundingFromNodes(nodeIds: string[]): BoundingBox | null;
    /**
     * @method _createGroup
     * @description Creates a node group from the bounding box of the selected nodes
     * @returns JSON data from the serialized graph
     */
    _createGroup(bb?: BoundingBox): HTMLDivElement | undefined;
    _addUndoStep(deleteRedo?: boolean): void;
    _doUndo(): void;
    _addRedoStep(): void;
    _doRedo(): void;
    _togglePropertiesDialog(force?: boolean): void;
    _setSnappingValue(value: number): void;
    _toggleSnapping(): void;
    _onSidebarCreate(e: Event): void;
    _showRenameGraphDialog(): void;
    _updateGraphName(name: string): void;
    _addGlobalActions(): void;
}
/**
 * @class Graph
 */
declare class Graph {
    name: string;
    type: string;
    id: string;
    editor: GraphEditor | undefined;
    nodes: GraphNode[];
    groups: any[];
    variables: any;
    links: any;
    scale: number;
    translation: typeof vec2;
    _executionNodes: string[];
    constructor(name?: string, options?: any);
    configure(o: any): void;
    /**
     * @method getNodeById
     */
    getNodeById(id: string): GraphNode | undefined;
    /**
     * @method _runStep
     */
    _runStep(mainId: string): void;
    /**
     * @method serialize
     * @param {Boolean} prettify
     * @returns JSON data from the serialized graph
     */
    serialize(prettify?: boolean): any;
    /**
     * @method export
     */
    export(): void;
}
/**
 * @class GraphNode
 */
export declare class GraphNode {
    static title: string;
    static blockDelete: boolean;
    static blockAdd: boolean;
    static description: string;
    id: string;
    type: string;
    title: string;
    inputs: any[];
    outputs: any[];
    properties: any[];
    position: typeof vec2;
    size: typeof vec2;
    color: any;
    editor: GraphEditor | undefined;
    graphID: string | undefined;
    constructor();
    _hasOutputsConnected(): boolean;
    onExecute(): void;
    execute(): void;
    addInput(name: string | null, type: string): void;
    addOutput(name: string | null, type: string): void;
    addProperty(name: string | null, type: string, value: any, selectOptions?: any): void;
    getInput(index: number): any;
    setOutput(index: number, data: any): void;
    serialize(): any;
}
/**
 * @class GraphFunction
 */
declare class GraphFunction extends Graph {
    constructor(name?: string, options?: any);
    getOutputData(inputValue: any): any;
}
export {};
