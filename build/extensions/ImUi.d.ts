declare const vec2: any;
/**
 * @class ImUI
 */
export declare class ImUI {
    root: any;
    canvas: any;
    components: any;
    mouseDown: boolean;
    mousePosition: typeof vec2;
    usePointerCursor: boolean;
    eventClick: MouseEvent | undefined;
    constructor(canvas: HTMLCanvasElement, options?: any);
    _processKey(e: KeyboardEvent): void;
    _processMouse(e: MouseEvent): void;
    _processClick(e: MouseEvent): void;
    /**
     * @method Button
     * @param {String} text
     * @param {Number} x
     * @param {Number} y
     */
    Button(text: string, x: number, y: number, callback: any): boolean;
    /**
     * @method Slider
     * @param {String} text
     * @param {Number} x
     * @param {Number} y
     * @param {Number} value
     */
    Slider(text: string, x: number, y: number, value: number | undefined, callback: any): void;
    /**
     * @method Checkbox
     * @param {String} text
     * @param {Number} x
     * @param {Number} y
     * @param {Number} value
     */
    Checkbox(text: string, x: number, y: number, value: boolean | undefined, callback: any): void;
    /**
     * @method endFrame
     * @description Clears the information stored during the last frame
     */
    endFrame(): void;
}
export {};
