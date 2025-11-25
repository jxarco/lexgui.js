import { Panel } from './Panel';
/**
 * @class Branch
 */
export declare class Branch {
    name: string;
    components: any[];
    closed: boolean;
    root: any;
    content: any;
    grabber: any;
    panel: Panel | null;
    onclick: () => void;
    oncontextmenu: (e: any) => void;
    constructor(name: string, options?: any);
    _onMakeFloating(): void;
    _addBranchSeparator(): void;
    _updateComponents(): void;
}
