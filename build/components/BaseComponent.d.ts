export declare enum ComponentType {
    NONE = 0,
    TEXT = 1,
    TEXTAREA = 2,
    BUTTON = 3,
    SELECT = 4,
    CHECKBOX = 5,
    TOGGLE = 6,
    RADIO = 7,
    BUTTONS = 8,
    COLOR = 9,
    RANGE = 10,
    NUMBER = 11,
    TITLE = 12,
    VECTOR = 13,
    TREE = 14,
    PROGRESS = 15,
    FILE = 16,
    LAYERS = 17,
    ARRAY = 18,
    LIST = 19,
    TAGS = 20,
    CURVE = 21,
    CARD = 22,
    IMAGE = 23,
    CONTENT = 24,
    CUSTOM = 25,
    SEPARATOR = 26,
    KNOB = 27,
    SIZE = 28,
    OTP = 29,
    PAD = 30,
    FORM = 31,
    DIAL = 32,
    COUNTER = 33,
    TABLE = 34,
    TABS = 35,
    DATE = 36,
    MAP2D = 37,
    LABEL = 39,
    BLANK = 40,
    RATE = 41,
    EMPTY = 42,
    DESCRIPTION = 43
}
/**
 * @class BaseComponent
 */
export declare class BaseComponent {
    type: ComponentType;
    name: string | null | undefined;
    customName?: string;
    options: any;
    root: any;
    customIdx: number;
    disabled: boolean;
    onSetValue?: (v: any, b?: boolean, e?: any) => void;
    onGetValue?: () => any;
    onAllowPaste?: (b: boolean) => boolean;
    onResize: (r?: any) => void;
    onSetDisabled?: (disabled: boolean) => void;
    _initialValue: any;
    static NO_CONTEXT_TYPES: ComponentType[];
    constructor(type: ComponentType, name?: string | null | undefined, value?: any, options?: any);
    static _dispatchEvent(element: any, type: any, data?: any, bubbles?: any, cancelable?: any): void;
    _addResetProperty(container: any, callback: any): any;
    _canPaste(): boolean;
    _trigger(event: any, callback: any, scope?: any): void;
    value(): any;
    set(value: any, skipCallback?: boolean, event?: any): void;
    oncontextmenu(e: any): void;
    copy(): void;
    paste(): void;
    typeName(): string | undefined;
    setDisabled(disabled: boolean): void;
    refresh(value?: any): void;
}
