export declare class Color {
    private _rgb;
    private _hex;
    private _hsv;
    css: any;
    get rgb(): any;
    set rgb(v: any);
    get hex(): string;
    set hex(v: string);
    get hsv(): any;
    set hsv(v: any);
    constructor(value: any);
    set(value: any): void;
    setHSV(hsv: any): void;
    setRGB(rgb: any): void;
    setHex(hex: string): void;
    _fromHex(hex: string): void;
    _fromRGB(rgb: any): void;
    _fromHSV(hsv: any): void;
}
