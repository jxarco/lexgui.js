import { Popover } from './Popover';
export declare class Tour {
    static ACTIVE_TOURS: any[];
    /**
     * @constructor Tour
     * @param {Array} steps
     * @param {Object} options
     * useModal: Use a modal to highlight the tour step [true]
     * offset: Horizontal and vertical margin offset [0]
     * horizontalOffset: Horizontal offset [0]
     * verticalOffset: Vertical offset [0]
     * radius: Radius for the tour step highlight [8]
     */
    steps: any[];
    currentStep: number;
    useModal: boolean;
    offset: number;
    horizontalOffset: number;
    verticalOffset: number;
    radius: number;
    tourContainer: any;
    tourMask: HTMLElement | undefined;
    _popover: Popover | null;
    constructor(steps: any[], options?: any);
    /**
     * @method begin
     */
    begin(): void;
    /**
     * @method stop
     */
    stop(): void;
    _showStep(stepOffset?: number): void;
    _generateMask(reference: HTMLElement): void;
    _createHighlight(step: any, previousStep: any, nextStep: any): void;
}
