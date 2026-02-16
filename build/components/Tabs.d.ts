import { Area } from './../core/Area';
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
    setIcon(name: string, icon: string): void;
    delete(name: string): void;
}
