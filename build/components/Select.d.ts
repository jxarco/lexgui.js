import { BaseComponent } from './BaseComponent';
/**
 * @class Select
 * @description Select Component
 */
export declare class Select extends BaseComponent {
    _lastPlacement: boolean[];
    constructor(name: string | null, values: any[], value: any, callback: any, options?: any);
    _filterOptions(options: any, value: string): any[];
}
