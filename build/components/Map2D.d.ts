import { BaseComponent } from './BaseComponent';
import { CanvasMap2D } from './CanvasMap2D';
import { Popover } from './Popover';
/**
 * @class Map2D
 * @description Map2D Component
 */
export declare class Map2D extends BaseComponent {
    map2d: CanvasMap2D;
    _popover: Popover | null;
    constructor(name: string, points: any[], callback: any, options?: any);
}
