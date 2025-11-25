import { vec2 } from './../core/Vec2';
export declare class CanvasMap2D {
    static COLORS: number[][];
    static GRID_SIZE: number;
    /**
     * @constructor Map2D
     * @param {Array} initialPoints
     * @param {Function} callback
     * @param {Object} options
     * circular
     * showNames
     * size
     */
    canvas: HTMLCanvasElement;
    imageCanvas: HTMLCanvasElement | null;
    root: any;
    circular: boolean;
    showNames: boolean;
    size: number[];
    points: any[];
    callback: any;
    weights: number[];
    weightsObj: any;
    currentPosition: vec2;
    circleCenter: number[];
    circleRadius: number;
    margin: number;
    dragging: boolean;
    _valuesChanged: boolean;
    _selectedPoint: any;
    _precomputedWeightsGridSize: number;
    _precomputedWeights: Float32Array | null;
    constructor(initialPoints: any, callback: any, options?: any);
    /**
     * @method computeWeights
     * @param {vec2} p
     * @description Iterate for every cell to see if our point is nearer to the cell than the nearest point of the cell,
     * If that is the case we increase the weight of the nearest point. At the end we normalize the weights of the points by the number of near points
     * and that give us the weight for every point
     */
    computeWeights(p: vec2): number[] | undefined;
    /**
     * @method precomputeWeights
     * @description Precompute for every cell, which is the closest point of the points set and how far it is from the center of the cell
     * We store point index and distance in this._precomputedWeights. This is done only when the points set change
     */
    precomputeWeights(): Float32Array<ArrayBufferLike>;
    /**
     * @method precomputeWeightsToImage
     * @param {vec2} p
     */
    precomputeWeightsToImage(p: vec2): HTMLCanvasElement | null | undefined;
    addPoint(name: string, pos?: number[] | null): {
        name: string;
        pos: number[];
    } | undefined;
    removePoint(name: string): void;
    findPoint(name: string): any;
    clear(): void;
    renderToCanvas(ctx: CanvasRenderingContext2D | null): void;
}
