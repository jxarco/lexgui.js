import { BaseComponent } from './BaseComponent';
import { ColorPicker } from './ColorPicker';
import { Popover } from './Popover';
/**
 * @class ColorInput
 * @description ColorInput Component
 */
export declare class ColorInput extends BaseComponent {
    picker: ColorPicker;
    _skipTextUpdate?: boolean;
    _popover: Popover | undefined;
    constructor(name: string, value: any, callback: any, options?: any);
}
