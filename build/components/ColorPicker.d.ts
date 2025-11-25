import { Color } from './Color';
import { TextInput } from './TextInput';
/**
 * @class ColorPicker
 */
export declare class ColorPicker {
    static currentPicker: boolean;
    root: any;
    colorModel: string;
    useAlpha: boolean;
    callback: any;
    markerHalfSize: number;
    markerSize: number;
    currentColor: Color;
    labelComponent: TextInput;
    colorPickerBackground: any;
    intSatMarker: any;
    colorPickerTracker: any;
    alphaTracker: any;
    hueMarker: any;
    alphaMarker: any;
    onPopover: any;
    constructor(hexValue: string, options?: any);
    _placeMarkers(): void;
    _svToPosition(s: number, v: number): void;
    _positionToSv(left: number, top: number): void;
    _updateColorValue(newHexValue?: string | null, skipCallback?: boolean): void;
    fromHexColor(hexColor: string): void;
}
