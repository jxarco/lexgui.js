declare const Area: any;
declare const Panel: any;
declare const Dialog: any;
type Nullable<T> = T | null | undefined;
/**
 * @class Timeline
 * @description Agnostic timeline, do not impose any timeline content. Renders to a canvas
 */
export declare abstract class Timeline {
    #private;
    static BACKGROUND_COLOR: string;
    static TRACK_COLOR_PRIMARY: string;
    static TRACK_COLOR_SECONDARY: string;
    static TRACK_COLOR_TERTIARY: string;
    static TRACK_SELECTED: string;
    static FONT: string;
    static FONT_COLOR_PRIMARY: string;
    static FONT_COLOR_TERTIARY: string;
    static FONT_COLOR_QUATERNARY: string;
    static KEYFRAME_COLOR: string;
    static KEYFRAME_COLOR_HOVERED: string;
    static KEYFRAME_COLOR_SELECTED: string;
    static KEYFRAME_COLOR_LOCK: string;
    static KEYFRAME_COLOR_EDITED: string;
    static KEYFRAME_COLOR_INACTIVE: string;
    static TIME_MARKER_COLOR: string;
    static TIME_MARKER_COLOR_TEXT: string;
    static BOX_SELECTION_COLOR: string;
    uniqueID: string;
    timelineTitle: string;
    animationClip: any;
    duration: number;
    currentTime: number;
    visualTimeRange: [number, number];
    visualOriginTime: number;
    pixelsPerSecond: number;
    secondsPerPixel: number;
    clickTime: number;
    clickDiscardTimeout: number;
    lastMouse: [number, number];
    boxSelection: boolean;
    boxSelectionStart: [number, number];
    boxSelectionEnd: [number, number];
    historyUndo: Array<any>;
    historyRedo: Array<any>;
    historySaveEnabler: boolean;
    historyMaxSteps: number;
    clipboard: any;
    grabbing: boolean;
    grabTime: number;
    grabbingTimeBar: boolean;
    grabbingScroll: boolean;
    movingKeys: boolean;
    timeBeforeMove: number;
    currentScroll: number;
    currentScrollInPixels: number;
    trackHeight: number;
    timeSeparators: number[];
    playing: boolean;
    loop: boolean;
    active: boolean;
    skipVisibility: boolean;
    skipLock: boolean;
    disableNewTracks: boolean;
    optimizeThreshold: number;
    selectedTracks: any[];
    selectedItems: any[];
    leftPanel: typeof Panel;
    trackTreesPanel: any;
    trackTreesComponent: any;
    trackTreesEvents: any;
    lastTrackTreesComponentOffset: any;
    mainArea: typeof Area;
    root: HTMLBodyElement;
    header: typeof Panel;
    canvasArea: typeof Area;
    canvas: HTMLCanvasElement;
    size: [number, number];
    topMargin: number;
    header_offset: number;
    updateTheme: () => void;
    onCreateBeforeTopBar: Nullable<(headerPanel: typeof Panel) => void>;
    onCreateAfterTopBar: Nullable<(headerPanel: typeof Panel) => void>;
    onCreateControlsButtons: Nullable<(headerPanel: typeof Panel) => void>;
    onCreateSettingsButtons: Nullable<(headerPanel: typeof Panel) => void>;
    onShowOptimizeMenu: Nullable<(event: any) => void>;
    onShowConfiguration: Nullable<(panel: typeof Panel) => void>;
    onMouse: Nullable<(event: any, t: number) => void>;
    onDblClick: Nullable<(event: any) => void>;
    onShowContextMenu: Nullable<(event: any) => void>;
    onAddNewTrackButton: Nullable<() => void>;
    onAddNewTrack: Nullable<(track: any, options: any) => void>;
    onBeforeDrawContent: Nullable<(ctx: CanvasRenderingContext2D) => void>;
    onStateStop: Nullable<() => void>;
    onStateChange: Nullable<(s: boolean) => void>;
    onChangeLoopMode: Nullable<(l: boolean) => void>;
    onSetDuration: Nullable<(d: number) => void>;
    onSetTime: Nullable<(t: number) => void>;
    onItemSelected: Nullable<(selected: any[], itemsToAdd: Nullable<any[]>, itemsToRemove: Nullable<any[]>) => void>;
    onSetTrackSelection: Nullable<(track: object, oldValue: boolean) => void>;
    onSetTrackState: Nullable<(track: object, oldValue: boolean) => void>;
    onSetTrackLock: Nullable<(track: object, oldValue: boolean) => void>;
    onUpdateTrack: Nullable<(tracks: number[] | string[]) => void>;
    configurationDialog: Nullable<typeof Dialog>;
    abstract onMouseUp(event: any, t: number): void;
    abstract onMouseDown(event: any, t: number): void;
    abstract onMouseMove(event: any, t: number): void;
    abstract drawContent(ctx: CanvasRenderingContext2D): void;
    abstract deleteSelectedContent(skipCallback: boolean): void;
    abstract copySelectedContent(): void;
    abstract pasteContent(time: number): void;
    abstract historyGenerateTrackStep(trackIdx: number): any;
    abstract historyApplyTrackStep(state: any, isUndo: boolean): any;
    /**
     * @param {String} id = string unique id
     * @param {Object} options = {skipLock, skipVisibility}
     */
    constructor(id: string, options?: any);
    clear(): void;
    /**
     * @method updateHeader
     */
    updateHeader(): void;
    setTrackTreeEventListener(type: string, callback: (event: any) => any): void;
    /**
     * @method updateLeftPanel
     */
    updateLeftPanel(): void;
    setTrackHeight(trackHeight: number): void;
    /**
     * @param {Object} options options for the new track
     *  { id: string, active: bool, locked: bool, }
     * @returns
     */
    addNewTrack(options?: any, skipCallback?: boolean): number;
    /**
     * Finds tracks ( wholy and partially ) inside the range minY maxY.
     * ( Full ) Canvas local coordinates.
     * @param {Number} minY pixels
     * @param {Number} maxY pixels
     * @returns array of trackDatas
     */
    getTracksInRange(minY: number, maxY: number): any;
    /**
     * @method setAnimationClip
     * @param {*} animation
     * @param {Boolean} needsToProcess
     * @param {Object} processOptions
     * [ KeyFrameTimeline ] - each track should contain an attribute "dim" to indicate the value dimension ( e.g. vector3 -> dim=3). Otherwise dimensions will be infered from track's values and times. Default is 1
     */
    setAnimationClip(animation: any, needsToProcess?: boolean): any;
    drawTimeInfo(w: number, h?: number): void;
    drawTracksBackground(w: number, h: number): void;
    /**
     * @method draw
     */
    draw(): void;
    /**
     * @method clearState
     */
    clearState(): void;
    /**
     * @method setDuration
     * @param {Number} t
     * @param {Boolean} skipCallback
     * @param {Boolean} updateHeader
     */
    setDuration(t: number, skipCallback?: boolean, updateHeader?: boolean): void;
    setTime(time: number, skipCallback?: boolean): void;
    xToTime(x: number): number;
    timeToX(t: number): number;
    /**
     * @method setScale
     * @param {*} pixelsPerSecond >0.  totalVisiblePixels / totalVisibleSeconds.
     */
    setScale(pixelsPerSecond: number): void;
    /**
     * @method setScroll
     * not delta from last state, but full scroll amount.
     * @param {Number} scrollY either pixels or [0,1 ]
     * @param {Boolean} normalized if true, scrollY is in range[0,1 ] being 1 fully scrolled. Otherwised scrollY represents pixels
     * @returns
     */
    setScroll(scrollY: number, normalized?: boolean): void;
    /**
     * @method processMouse
     * @param {*} e
     */
    processMouse(e: any): true | undefined;
    /**
     * keydown
     * @method processKeys
     * @param {*} e
     */
    processKeys(e: KeyboardEvent): void;
    /**
     * @method changeState
     * @param {Boolean} skipCallback defaults false
     * @description change play/pause state
     */
    changeState(skipCallback?: boolean): void;
    /**
     * @method setState
     * @param {Boolean} state
     * @param {Boolean} skipCallback defaults false
     * @description change play/pause state
     */
    setState(state: boolean, skipCallback?: boolean): void;
    /**
     * @method setLoopMode
     * @param {Boolean} loopState
     * @param {Boolean} skipCallback defaults false
     * @description change loop mode of the timeline
     */
    setLoopMode(loopState: boolean, skipCallback?: boolean): void;
    /**
     * @returns the tree elements ( tracks and grouops ) shown in the timeline.
     *  Each item has { treeData: { trackData: track } }, where track is the actual track information of the animationClip.
     *  If not a track, trackData will be undefined
     */
    getVisibleItems(): any;
    /**
     * [ trackIdx ]
     * @param {Array} itemsName array of numbers identifying tracks
     */
    setSelectedItems(items: any[], skipCallback?: boolean): void;
    /**
     * @param {Array} itemsToAdd [ trackIdx ], array of numbers identifying tracks by their index
     * @param {Array} itemsToRemove [ trackIdx ], array of numbers identifying tracks by their index
     */
    changeSelectedItems(itemsToAdd?: Nullable<any[]>, itemsToRemove?: Nullable<any[]>, skipCallback?: boolean): void;
    /**
     * It will find the first occurrence of trackId in animationClip.tracks
     * @param {String} trackId
     * @returns
     */
    getTrack(trackId: string): any;
    /**
     * @param {Boolean} updateTrackTree whether the track tree needs a refresh
     * @returns
     */
    deselectAllTracks(updateTrackTree?: boolean): void;
    /**
     * @param {Int} trackIdx
     * @param {Boolean} isSelected new "selected" state of the track
     * @param {Boolean} skipCallback whether to call onSetTrackSelection
     * @param {Boolean} updateTrackTree whether track tree panel needs a refresh
     * @returns
     */
    setTrackSelection(trackIdx: number, isSelected: boolean, skipCallback?: boolean, updateTrackTree?: boolean): void;
    /**
     * updates trackTreesComponent's nodes, to match the selectedTracks
     */
    _updateTrackTreeSelection(): void;
    deselectAllElements(): void;
    /**
     * @method setTrackState
     * @param {Int} trackIdx
     * @param {Boolean} isEnbaled
     * @param {Boolean} skipCallback onSetTrackState
     * @param {Boolean} updateTrackTree updates eye icon of the track, if it is visible in the timeline
     */
    setTrackState(trackIdx: number, isEnbaled?: boolean, skipCallback?: boolean, updateTrackTree?: boolean): void;
    /**
     * @param {Int} trackIdx
     * @param {Boolean} isLocked
     * @param {Boolean} skipCallback onSetTrackLock
     * @param {Boolean} updateTrackTree updates lock icon of the track, if it is visible in the timeline
     */
    setTrackLock(trackIdx: number, isLocked?: boolean, skipCallback?: boolean, updateTrackTree?: boolean): void;
    /**
     * @param {Int} trackIdx index of track in the animation ( not local index )
     * @param {Boolean} combineWithPrevious whether to create a new entry or unify changes into a single undo entry
     */
    saveState(trackIdx: number, combineWithPrevious?: boolean): void;
    undo(): boolean;
    redo(): boolean;
    /**
     * @method resize
     * @param {*} size
     */
    resize(size?: Nullable<[number, number]>): void;
    resizeCanvas(): void;
    /**
     * @method hide
     * Hide timeline area
     */
    hide(): void;
    /**
     * @method show
     * Show timeline area if it is hidden
     */
    show(): void;
    /**
        These functions might be overriden by child classes. Nonetheless, they must have the same attributes, at least.
        Usually call a super.whateverFunction to generate its base form, and expand it with extra attributes
    */
    /**
     * This functions uses the selectedItems and generates the data that will feed the LX.Tree Component.
     * This function is used by updateLeftPanel. Some timelines might allow grouping of tracks. Such timelines may override this function
     * WARNING: track entries MUST have an attribute of 'trackData' with the track info
     * @returns lexgui tree data as expected for the creation of a LX.Tree
     */
    generateSelectedItemsTreeData(): any;
    /**
     * @param {Object} options set some values for the track instance ( groups and trackIdx not included )
     * @returns
     */
    instantiateTrack(options?: any, clone?: boolean): {
        isTrack: boolean;
        id: any;
        active: any;
        locked: any;
        isSelected: boolean;
        trackIdx: number;
        data: any;
    };
    /**
     * Generates an animationClip using either the parameters set in the animation argument or using default values
     * @param {Object} options data with which to generate an animationClip
     * @param {Boolean} clone whether to clone clips or make a shallow copy
     * @returns
     */
    instantiateAnimationClip(options?: any, clone?: boolean): any;
}
/**
 * @class KeyFramesTimeline
 */
export declare class KeyFramesTimeline extends Timeline {
    #private;
    static ADDKEY_VALUESINARRAYS: number;
    lastKeyFramesSelected: any[];
    keyValuePerPixel: number;
    defaultCurves: boolean;
    defaultCurvesRange: [number, number];
    keyframeSize: number;
    keyframeSizeHovered: number;
    lastHovered: Nullable<[number, number]>;
    moveKeyMinTime: number;
    onContentMoved: Nullable<(trackIdx: number, keyIdx: number) => void>;
    onOptimizeTracks: Nullable<(trackIdx: number) => void>;
    onDeleteKeyFrames: Nullable<(trackIdx: number, indices: number[]) => void>;
    onSelectKeyFrame: Nullable<(selection: [number, number, number][]) => void>;
    onDeselectKeyFrames: Nullable<(lastSelected: any[]) => void>;
    /**
     * @param {String} name unique string
     * @param {Object} options = {animationClip, selectedItems, x, y, width, height, canvas, trackHeight}
     */
    constructor(name: string, options?: any);
    generateSelectedItemsTreeData(): any;
    /**
     * OVERRIDE
     * @param {Object} options track information that wants to be set to the new track
     *  id, dim, values, times, selected, edited, hovered
     * @returns
     */
    instantiateTrack(options?: any, clone?: boolean): any;
    /**
     * Generates an animationClip using either the parameters set in the animation argument or using default values
     * @param {Object} animation data with which to generate an animationClip
     * @returns
     */
    instantiateAnimationClip(animation: Nullable<any>, clone?: boolean): any;
    deselectAllElements(): void;
    /**
     * OVERRIDE
     * @param {Array} itemsToAdd [ trackIdx, "groupId" ], array of strings and/or number identifying groups and/or tracks
     * @param {Array} itemsToRemove [ trackIdx, "groupId" ], array of strings and/or number identifying groups and/or tracks
     */
    changeSelectedItems(itemsToAdd?: Nullable<any[]>, itemsToRemove?: Nullable<any[]>, skipCallback?: boolean): void;
    /**
     * @param {String} groupId unique identifier
     * @param {Array} groupTracks [ "trackID", trackIdx ] array of strings and/or numbers of the existing tracks to include in this group. A track can only be part of 1 group
     *  if groupTracks == null, groupId is removed from the list
     */
    setTracksGroup(groupId: string, groupTracks?: Nullable<(string | number)[]>): void;
    /**
     * @param {String} groupId
     * @returns array of tracks or null
     */
    getTracksGroup(groupId: string): any[] | null;
    /**
     * OVERRIDE
     * @param {String} trackId
     * @param {String} groupId optionl. If not set, it will find the first occurrence of trackId in animationClip.tracks
     * @returns
     */
    getTrack(trackId: string, groupId?: Nullable<string>): any;
    /**
     * @param {Number} size pixels, height of keyframe
     * @param {Number} sizeHovered optional, size in pixels when hovered
     */
    setKeyframeSize(size: number, sizeHovered?: Nullable<number>): void;
    onMouseUp(e: any, time: number): void;
    onMouseDown(e: any, time: number): void;
    onMouseMove(e: any, time: number): void;
    drawContent(ctx: CanvasRenderingContext2D): void;
    /**
     * @method drawTrackWithKeyframes
     * @param {*} ctx
     * ...
     * @description helper function, you can call it from drawContent to render all the keyframes
     */
    drawTrackWithKeyframes(ctx: CanvasRenderingContext2D, trackHeight: number, track: any): void;
    drawTrackWithCurves(ctx: CanvasRenderingContext2D, trackHeight: number, track: any): void;
    _getValidTrackName(uglyName: string): (string | null)[];
    /**
     * updates an existing track with new values and times.
     * @param {Int} trackIdx index of track in the animationClip
     * @param {*} newTrack object with two arrays: values and times. These will be set to the selected track
     * @returns
     */
    updateTrack(trackIdx: number, newTrack: any): boolean;
    /**
     * removes equivalent sequential keys either because of equal times or values
     * ( 0,0,0,0,1,1,1,0,0,0,0,0,0,0 ) --> ( 0, 0,1,1,0, 0 )
     * @param {Int} trackIdx index of track in the animation
     * @param {Boolean} onlyEqualTime if true, removes only keyframes with equal times. Otherwise, values are ALSO compared through the class threshold
     * @param {Boolean} skipCallback if false, triggers "onOptimizeTracks" after optimizing
     */
    optimizeTrack(trackIdx: number, onlyEqualTime?: boolean, skipCallback?: boolean): void;
    optimizeTracks(onlyEqualTime?: boolean): void;
    /**
     * saveState function uses this to generate a "copy" of the track.
     * @param {Number} trackIdx
     * @returns All necessary information to reconstruct the track state
     */
    historyGenerateTrackStep(trackIdx: number): {
        trackIdx: number;
        t: any;
        v: any;
        edited: any;
    };
    /**
     * It should swap the previous state with the incoming state of the track. It must return the previous state.
     * historyGenerateTrackStep could be used to copy the previous state. However, as it is a swap, it suffices to just copy the references.
     * @param {Object} state object with a trackIdx:Number and whatever information was saved in historyGenerateTrackStep
     * @param {Boolean} isUndo
     * @returns previous state object
     */
    historyApplyTrackStep(state: any, isUndo: boolean): {
        trackIdx: any;
        t: any;
        v: any;
        edited: any;
    };
    /**
     * @param {*} track
     * @param {Number} srcIdx keyFrame index
     * @param {Number} trgIdx keyFrame index
     */
    swapKeyFrames(track: any, srcIdx: number, trgIdx: number): void;
    copySelectedContent(): void;
    copyKeyFrameValue(track: any, index: number): void;
    copyKeyFrames(track: any, indices: number[]): void;
    canPasteKeyFrame(): boolean;
    pasteContentValue(): boolean;
    pasteContent(time?: number): boolean;
    pasteKeyFrameValue(track: any, index: number): void;
    pasteKeyFrames(pasteTime?: number): boolean;
    /**
     *
     * @param {Int} trackIdx
     * @param {Array} newValues array of values for each keyframe. It should be a flat array of size track.dim*numKeyframes. Check ADDKEY_VALUESINARRAYS flag
     * @param {Array of numbers } newTimes must be ordered ascendently
     * @param {Number} timeOffset
     * @param {Int} flags
     *      KeyFramesTimeline.ADDKEY_VALUESINARRAYS: if set, newValues is an array of arrays, one for each entry [ [1,2,3], [5,6,7] ]. Times is still a flat array of values [ 0, 0.2 ]

     * @returns
     */
    addKeyFrames(trackIdx: number, newValues: any[], newTimes: number[], timeOffset?: number, flags?: number): number[] | null;
    deleteSelectedContent(skipCallback?: boolean): void;
    deleteKeyFrames(trackIdx: number, indices: number[], skipCallback?: boolean): boolean;
    /**
     * Binary search. Relies on track.times being a sorted array
     * @param {Object} track
     * @param {Number} time
     * @param {Number} mode on of the possible values
     *  - -1 = nearest frame with t[ f ] <= time
     *  - 0 = nearest frame
     *  - 1 = nearest frame with t[ f ] >= time
     * @returns a zero/positive value if successful. On failure returnes -1 meaning either there are no frames ( 0 ), no frame-time is lower ( -1 ) or no frame-time is higher (1 )
     */
    getNearestKeyFrame(track: any, time: number, mode?: number): number;
    /**
     * get the nearest keyframe to "time" given a maximum threshold.
     * @param {Object} track
     * @param {Number} time
     * @param {Number} threshold must be positive value
     * @returns returns a postive/zero value if there is a frame inside the threshold range. Otherwise, -1
     */
    getCurrentKeyFrame(track: any, time: number, threshold?: number): number;
    /**
     * Returns the interval of frames between minTime and maxTime (both included )
     * @param {Object} track
     * @param {Number} minTime
     * @param {Number} maxTime
     * @param {Number} threshold must be positive value
     * @returns an array with two values [ minFrame, maxFrame ]. Otherwise null
     */
    getKeyFramesInRange(track: any, minTime: number, maxTime: number, threshold?: number): number[] | null;
    unHoverAll(): Nullable<[number, number]>;
    deselectAllKeyFrames(): boolean;
    isKeyFrameSelected(track: any, index: number): any;
    /**
     * @param {Int} trackIdx track index of animation clip
     * @param {Int} frameIdx frame ( index ) to select inside the track
     * @param {Boolean} skipCallback
     * @returns
     */
    selectKeyFrame(trackIdx: number, frameIdx: number, skipCallback?: boolean): any[] | null;
    deselectKeyFrame(trackIdx: number, frameIdx: number): boolean;
    getNumKeyFramesSelected(): number;
    /**
     * helper function to process a selection with multiple keyframes. Sets the time of the timeline to the first selected keyframe
     * @param {Number} trackIdx
     * @param {Number} keyFrameIndex
     * @param {Boolean} multipleSelection whether to append to selection or reset it and make this keyframe the only current selection
     * @returns
     */
    processSelectionKeyFrame(trackIdx: number, keyFrameIndex: number, multipleSelection?: boolean): void;
    /**
     * @method clearTrack
     */
    clearTrack(trackIdx: number): number | undefined;
}
/**
 * @class ClipsTimeline
 */
export declare class ClipsTimeline extends Timeline {
    #private;
    static CLONEREASON_COPY: number;
    static CLONEREASON_PASTE: number;
    static CLONEREASON_HISTORY: number;
    static CLONEREASON_TRACKCLONE: number;
    lastClipsSelected: any;
    lastTrackClipsMove: number;
    dragClipMode: Nullable<string>;
    lastHovered: Nullable<[number, number]>;
    onSelectClip: Nullable<(clip: Nullable<any>) => void>;
    onContentMoved: Nullable<(clip: Nullable<any>, delta: number) => void>;
    onDeleteSelectedClips: Nullable<(selected: any[]) => void>;
    onDeleteClip: Nullable<(trackIdx: number, clipIdx: number, clip: any) => void>;
    /**
     * @param {String} name
     * @param {Object} options = {animationClip, selectedItems, x, y, width, height, canvas, trackHeight}
     */
    constructor(name: string, options?: any);
    /**
     * Generates an animationClip using either the parameters set in the animation argument or using default values
     * @param {Object} animation data with which to generate an animationClip
     * @returns
     */
    instantiateAnimationClip(animation: any, clone?: boolean): any;
    /**
     * @param {Object} options set some values for the track instance ( groups and trackIdx not included )
     * @returns
     */
    instantiateTrack(options?: any, clone?: boolean): any;
    instantiateClip(options?: any): {
        id: any;
        start: any;
        duration: any;
        fadein: any;
        fadeout: any;
        clipColor: any;
        fadeColor: any;
        active: any;
        trackIdx: number;
    };
    addNewTrack(options?: any, updateLeftPanel?: boolean, skipCallback?: boolean): any;
    setAnimationClip(animation: any, needsToProcess?: boolean): any;
    deselectAllElements(): void;
    /**
     * OVERRIDE ITEM SELECTION.
     * CLIPS WILL OFFER NO SELECTION. All tracks are visible
     */
    changeSelectedItems(): void;
    unHoverAll(): Nullable<[number, number]>;
    onMouseUp(e: any): void;
    onMouseDown(e: any, time: number): void;
    onMouseMove(e: any, time: number): true | undefined;
    drawContent(ctx: CanvasRenderingContext2D): void;
    /**
     * @method drawTrackWithBoxes
     * @param {*} ctx
     */
    drawTrackWithBoxes(ctx: CanvasRenderingContext2D, y: number, trackHeight: number, track: any): void;
    /**
     * @method optimizeTrack
     */
    optimizeTrack(trackIdx: number): void;
    /**
     * @method optimizeTracks
     */
    optimizeTracks(): void;
    /**
     * @param {Object} clip  clip to be added
     * @param {Int} trackIdx ( optional ) track where to put the clip. -1 will find the first free slot. ***WARNING*** Must call getClipsInRange, before calling this function with a valid trackdIdx
     * @param {Number} offsetTime ( optional ) offset time of current time
     * @param {Number} searchStartTrackIdx ( optional ) if trackIdx is set to -1, this idx will be used as the starting point to find a valid track
     * @returns  a zero/positive value if successful. Otherwise, -1
     */
    addClip(clip: any, trackIdx?: number, offsetTime?: number, searchStartTrackIdx?: number): any;
    /**
     *  Add an array of clips to the timeline in the first suitable tracks. It tries to put clips in the same track if possible. All clips will be in adjacent tracks to each other
     * @param {Object[] } clips
     * @param {Number} offsetTime
     * @param {Int} searchStartTrackIdx
     * @returns
     */
    addClips(clips: any[], offsetTime?: number, searchStartTrackIdx?: number): boolean;
    deleteSelectedContent(skipCallback?: boolean): void;
    /** Delete clip from the timeline
     * @param {Number} trackIdx
     * @param {Number} clipIdx clip to be deleted
     */
    deleteClip(trackIdx: number, clipIdx: number, skipCallback?: boolean): void;
    /**
     * User defined. Used when copying and pasting
     * @param {Array of clips } clipsToClone array of original clips. Do not modify clips in this array
     * @param {Number} timeOffset Value of time that should be added ( or subtracted ) from the timing attributes
     * @param {Int} reason Flag to signal the reason of the clone
     * @returns {Array of clips }
     */
    cloneClips(clipsToClone: any[], timeOffset: number, reason?: number): any;
    /**
     * Overwrite the "cloneClips" function to provide a custom cloning of clips. Otherwise, JSON serialization is used
     */
    copySelectedContent(): void;
    pasteContent(time?: number): void;
    /**
     * @method clearTrack
     */
    clearTrack(trackIdx: number): void;
    /**
     * saveState function uses this to generate a "copy" of the track.
     * @param {Number} trackIdx
     * @returns All necessary information to reconstruct the track state
     */
    historyGenerateTrackStep(trackIdx: number): {
        trackIdx: number;
        clips: any;
        edited: any;
    };
    /**
     * It should swap the previous state with the incoming state of the track. It must return the previous state.
     * historyGenerateTrackStep could be used to copy the previous state. However, as it is a swap, it suffices to just copy the references.
     * @param {Object} state object with a trackIdx:Number and whatever information was saved in historyGenerateTrackStep
     * @param {Boolean} isUndo
     * @returns previous state object
     */
    historyApplyTrackStep(state: any, isUndo: boolean): {
        trackIdx: any;
        clips: any;
        edited: any;
    };
    getClipOnTime(track: any, time: number, threshold: number): number;
    deselectAllClips(): boolean;
    selectAll(skipCallback?: boolean): void;
    selectClip(trackIdx: number, clipIndex: number, deselect?: boolean, skipCallback?: boolean): number;
    deselectClip(trackIdx: number, clipIndex: number): number;
    getClipsInRange(track: any, minTime: number, maxTime: number, threshold?: number): number[] | null;
    validateDuration(t: number): number;
    setDuration(t: number, skipCallback?: boolean, updateHeader?: boolean): void;
}
export {};
