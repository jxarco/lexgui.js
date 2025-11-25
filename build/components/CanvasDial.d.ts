/**
 * @class CanvasDial
 * @description A canvas-based dial, used internally by the Dial component.
 */
declare class CanvasDial {
    element: any;
    canvas: HTMLCanvasElement;
    constructor(value: any[], options?: any);
    redraw(options?: any): void;
}
export { CanvasDial };
