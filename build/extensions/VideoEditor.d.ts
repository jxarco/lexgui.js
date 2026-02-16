declare const vec2: any;
declare const Area: any;
/**
 * @class TimeBar
 */
export declare class TimeBar {
    static TIMEBAR_PLAY: number;
    static TIMEBAR_TRIM: number;
    static BACKGROUND_COLOR: any;
    static COLOR: any;
    static ACTIVE_COLOR: any;
    type: number;
    duration: number;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D | null;
    options: any;
    markerWidth: number;
    markerHeight: number;
    offset: typeof vec2;
    lineWidth: number;
    lineHeight: number;
    linePosition: typeof vec2;
    startX: number;
    endX: number;
    currentX: number;
    hovering: string | undefined;
    dragging: string | undefined;
    _onMouseUpListener: (e: MouseEvent) => void;
    _onMouseMoveListener: (e: MouseEvent) => void;
    _mouseDownCanvasRect: any;
    updateTheme: () => void;
    onChangeCurrent: any;
    onChangeStart: any;
    onChangeEnd: any;
    onDraw: any;
    onMouse: any;
    constructor(area: typeof Area, type?: number, options?: any);
    unbind(): void;
    setDuration(duration: number): void;
    xToTime(x: number): number;
    timeToX(time: number): any;
    setCurrentTime(time: number): void;
    setStartTime(time: number): void;
    setEndTime(time: number): void;
    onSetCurrentValue(x: number): void;
    onSetStartValue(x: number): void;
    onSetEndValue(x: number): void;
    _draw(): void;
    _drawTrimMarker(name: string, x: number, options?: any): void;
    _drawTimeMarker(name: string, x: number, options?: any): void;
    update(x: number): void;
    onMouseDown(e: MouseEvent): void;
    onMouseUp(e: MouseEvent): void;
    onMouseMove(e: MouseEvent): void;
    resize(size: number[]): void;
}
/**
 * @class VideoEditor
 */
export declare class VideoEditor {
    static CROP_HANDLE_L: number;
    static CROP_HANDLE_R: number;
    static CROP_HANDLE_T: number;
    static CROP_HANDLE_B: number;
    static CROP_HANDLE_TL: number;
    static CROP_HANDLE_BL: number;
    static CROP_HANDLE_TR: number;
    static CROP_HANDLE_BR: number;
    options: any;
    playing: boolean;
    videoReady: boolean;
    controls: boolean;
    speed: number;
    startTime: number;
    endTime: number;
    requestId: any;
    video: HTMLVideoElement;
    loop: boolean;
    isDragging: boolean;
    isResizing: any;
    crop: boolean;
    dragOffsetX: number;
    dragOffsetY: number;
    timebar: any | TimeBar;
    mainArea: typeof Area;
    cropArea: any;
    videoArea: typeof Area;
    controlsArea: typeof Area;
    controlsComponents: any;
    onChangeCurrent: any;
    onChangeStart: any;
    onChangeEnd: any;
    onKeyUp: any;
    onSetTime: any;
    onVideoLoaded: any;
    onResize: any;
    onCropArea: any;
    onChangeSpeed: any;
    onChangeState: any;
    onChangeLoop: any;
    _updateTime: boolean;
    _onCropMouseUp: (e: MouseEvent) => void;
    _onCropMouseMove: (e: MouseEvent) => void;
    resize: any | (() => void);
    resizeControls: any | (() => void);
    resizeVideo: any | (() => void);
    constructor(area: typeof Area, options?: any);
    createControls(controlsLayoutOptions?: any): void;
    /**
     * Creates the areas where components will be.
     * Attaches all (desired) components of controlsComponents except the timebar
     * @returns {Area} for the timebar
     * Layout:
     * |--------------------------timebar--------------------------|
     * play speed loop resetCrop     curTime     trimStart / trimEnd
     */
    _createControlsLayout_1(): any;
    /**
     * Creates the areas where components will be.
     * Attaches all (desired) components of controlsComponents except the timebar
     * @returns {Area} for the timebar
     * Layout:
     *                              curTime
     * play speed loop trimStart |---timebar---| trimend
     */
    _createControlsLayout_0(): any;
    setCropAreaHandles(flags: number): void;
    resizeCropArea(sx: number, sy: number, isNormalized?: boolean): void;
    moveCropArea(x: number, y: number, isNormalized?: boolean): void;
    loadVideo(options?: any): Promise<void>;
    _update(): void;
    timeToString(t: number): string;
    _setCurrentTime(t: number): void;
    _setStartTime(t: number): void;
    _setEndTime(t: number): void;
    getStartTime(): number;
    getEndTime(): number;
    getTrimedTimes(): {
        start: number;
        end: number;
    };
    getCroppedArea(): any;
    showCropArea(): void;
    hideCropArea(): void;
    showControls(): void;
    hideControls(): void;
    stopUpdates(): void;
    unbind(): void;
}
export {};
