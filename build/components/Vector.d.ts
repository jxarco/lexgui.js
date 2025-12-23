import { BaseComponent } from './BaseComponent';
/**
 * @class Vector
 * @description Vector Component
 */
export declare class Vector extends BaseComponent {
    locked: boolean;
    setLimits: (newMin: number | null, newMax: number | null, newStep: number | null) => void;
    constructor(numComponents: number, name: string, value: number[], callback: any, options?: any);
}
