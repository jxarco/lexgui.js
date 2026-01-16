import { BaseComponent } from './BaseComponent';
import { Button } from './Button';
/**
 * @class Form
 * @description Form Component
 */
export declare class Form extends BaseComponent {
    data: any;
    formData: any;
    primaryButton: Button | undefined;
    constructor(name: string, data: any, callback: any, options?: any);
    submit(): void;
    syncInputs(): void;
}
