import { BaseComponent } from './BaseComponent';
export type NodeTreeAction = 'select' | 'dbl_click' | 'move' | 'delete' | 'rename' | 'visibility' | 'caret' | 'context_menu';
export interface NodeTreeEvent {
    type: NodeTreeAction;
    domEvent?: Event;
    items?: any[];
    result?: any[];
    from?: any;
    to?: any;
    where?: any;
    oldName?: string;
    newName?: string;
    search?: any[];
    userInitiated: boolean;
}
/**
 * Signature for cancelable events.
 * `resolve()` MUST be called by the user to perform the UI action
 */
export type NodeTreeEventCallback = (event: NodeTreeEvent, resolve?: (...args: any[]) => void) => boolean | void | Promise<void>;
/**
 * @class NodeTree
 */
export declare class NodeTree {
    domEl: any;
    data: any;
    options: any;
    selected: any[];
    _forceClose: boolean;
    _callbacks: Record<string, NodeTreeEventCallback>;
    constructor(domEl: any, data: any, options?: any);
    _createItem(parent: any, node: any, level?: number, selectedId?: string): void;
    refresh(newData?: any, selectedId?: string): void;
    frefresh(id: string): void;
    select(id: string): void;
    deleteNodes(nodes: any[]): any[];
    deleteNode(node: any): boolean;
}
/**
 * @class Tree
 * @description Tree Component
 */
export declare class Tree extends BaseComponent {
    innerTree: NodeTree;
    constructor(name: string, data: any, options?: any);
    /**
     * @method on
     * @description Stores an event callback for the desired action
     */
    on(eventName: string, callback: NodeTreeEventCallback): void;
}
