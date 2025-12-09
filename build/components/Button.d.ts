import { BaseComponent } from './BaseComponent';
/**
 * @class Button
 * @description Button Component
 */
export declare class Button extends BaseComponent {
    selectable: boolean;
    callback?: any;
    setState: (v: any, b?: boolean) => void;
    swap?: (b?: boolean) => void;
    constructor(name: string | null, value?: string, callback?: any, options?: any);
    click(): void;
    setSwapIcon(iconName: string): void;
}
