import { Panel } from './Panel';
/**
 * @class Dialog
 */
export declare class Dialog {
    static _last_id: number;
    id: string;
    root: HTMLDialogElement;
    panel: Panel;
    title: HTMLDivElement;
    size: any[];
    branchData: any;
    close: () => void;
    _oncreate: any;
    constructor(title: string, callback: any, options?: any);
    destroy(): void;
    refresh(): void;
    setPosition(x: number, y: number): void;
    setTitle(title: string): void;
}
