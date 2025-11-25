/**
 * @class DropdownMenu
 */
export declare class DropdownMenu {
    static currentMenu: DropdownMenu | null;
    root: any;
    side: string;
    align: string;
    sideOffset: number;
    alignOffset: number;
    avoidCollisions: boolean;
    onBlur: any;
    event: any;
    inPlace: boolean;
    _trigger: any;
    _items: any[];
    _parent: any;
    _windowPadding: number;
    _onClick: any;
    _radioGroup: {
        name: string;
        selected: any;
    } | undefined;
    invalid: boolean;
    constructor(trigger: any, items: any[], options?: any);
    destroy(blurEvent?: boolean): void;
    _create(items: any[], parentDom?: any): void;
    _createItem(item: any, parentDom: any, applyIconPadding?: boolean): void;
    _adjustPosition(): void;
    _addSeparator(parent?: HTMLElement | null): void;
}
export declare function addDropdownMenu(trigger: any, items: any[], options?: any): DropdownMenu | null;
