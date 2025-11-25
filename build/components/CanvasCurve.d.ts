/**
 * @class CanvasCurve
 * @description A canvas-based curve editor, used internally by the Curve component.
 */
export declare class CanvasCurve {
    element: any;
    canvas: HTMLCanvasElement;
    constructor(value: any[], options?: any);
    redraw(options?: any): void;
}
