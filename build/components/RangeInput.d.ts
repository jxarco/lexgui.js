import { BaseComponent } from './BaseComponent';
/**
 * @class RangeInput
 * @description RangeInput Component
 */
export declare class RangeInput extends BaseComponent {
    _maxSlider: HTMLInputElement | null;
    _labelTooltip: HTMLElement | null;
    setLimits: (newMin: number | null, newMax: number | null, newStep: number | null) => void;
    constructor(name: string, value: any, callback: any, options?: any);
}
