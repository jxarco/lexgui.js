import { BaseComponent } from './BaseComponent';
/**
 * @class NumberInput
 * @description NumberInput Component
 */
export declare class NumberInput extends BaseComponent {
    setLimits: (newMin: number | null, newMax: number | null, newStep: number | null) => void;
    constructor(name: string | null, value: number, callback: any, options?: any);
}
