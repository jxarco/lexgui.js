/**
 * @class Popover
 */
export declare class Popover {
    static activeElement: any;
    root: any;
    side: string;
    align: string;
    sideOffset: number;
    alignOffset: number;
    avoidCollisions: boolean;
    reference: any;
    _windowPadding: number;
    _trigger: any;
    _parent: any;
    _onClick: any;
    constructor(trigger: any, content: any, options?: any);
    destroy(): void;
    _adjustPosition(): void;
}
