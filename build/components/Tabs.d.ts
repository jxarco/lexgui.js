import { Area } from './Area';
/**
 * @class Tabs
 */
export declare class Tabs {
    static TAB_ID: number;
    root: any;
    area: Area;
    tabs: any;
    tabDOMs: any;
    thumb?: any;
    selected: any;
    folding: boolean;
    folded: boolean;
    onclose: (s: string) => void;
    constructor(area: Area, options?: any);
    add(name: string, content: any, options?: any): void;
    select(name: string): void;
    delete(name: string): void;
}
