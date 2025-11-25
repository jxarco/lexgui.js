import { BaseComponent } from './BaseComponent';
/**
 * @class NodeTree
 */
export declare class NodeTree {
    domEl: any;
    data: any;
    onevent: any;
    options: any;
    selected: any[];
    _forceClose: boolean;
    constructor(domEl: any, data: any, options?: any);
    _createItem(parent: any, node: any, level?: number, selectedId?: string): void;
    refresh(newData?: any, selectedId?: string): void;
    frefresh(id: string): void;
    select(id: string): void;
    deleteNode(node: any): boolean;
}
/**
 * @class Tree
 * @description Tree Component
 */
export declare class Tree extends BaseComponent {
    innerTree: NodeTree;
    constructor(name: string, data: any, options?: any);
}
