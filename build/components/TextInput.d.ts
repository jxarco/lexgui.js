import { BaseComponent } from './BaseComponent';
/**
 * @class TextInput
 * @description TextInput Component
 */
export declare class TextInput extends BaseComponent {
    valid: (s: string, m?: string) => boolean;
    _triggerEvent: Event | undefined;
    _lastValueTriggered?: any;
    constructor(name: string | null, value?: string, callback?: any, options?: any);
}
