import { BaseComponent } from './BaseComponent';
/**
 * @class TextInput
 * @description TextInput Component
 */
export declare class TextInput extends BaseComponent {
    valid: (s: string, m?: string) => boolean;
    input: HTMLInputElement | HTMLAnchorElement;
    _triggerEvent: Event | undefined;
    _lastValueTriggered?: any;
    constructor(name: string | null, value?: string, callback?: any, options?: any);
    syncFromDOM(skipCallback?: boolean): void;
}
