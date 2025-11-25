import { Dialog } from './Dialog';
/**
 * @class PocketDialog
 */
export declare class PocketDialog extends Dialog {
    static TOP: number;
    static BOTTOM: number;
    dockPosition: number;
    minimized: boolean;
    constructor(title: string, callback: any, options?: any);
}
