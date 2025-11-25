import { BaseComponent } from './BaseComponent';
import { CanvasCurve } from './CanvasCurve';
/**
 * @class Curve
 * @description Curve Component
 */
export declare class Curve extends BaseComponent {
    curveInstance: CanvasCurve;
    constructor(name: string, values: any[], callback: any, options?: any);
}
