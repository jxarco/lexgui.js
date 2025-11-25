/**
 * @class ContextMenu
 */
export declare class ContextMenu {
    root: any;
    items: any[];
    colors: any;
    _parent: any;
    constructor(event: any, title: string, options?: any);
    _adjustPosition(div: HTMLElement, margin: number, useAbsolute?: boolean): void;
    _createSubmenu(o: any, k: string, c: any, d: number): void;
    _createEntry(o: any, k: string, c: any, d: number): void;
    onCreate(): void;
    add(path: string, options?: any): void;
    setColor(token: string, color: any): void;
}
