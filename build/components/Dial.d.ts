import { BaseComponent } from './BaseComponent';
import { CanvasDial } from './CanvasDial';
/**
 * @class Dial
 * @description Dial Component
 */
export declare class Dial extends BaseComponent {
    dialInstance: CanvasDial;
    constructor(name: string, values: any[], callback: any, options?: any);
}
