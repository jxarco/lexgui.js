import { BaseComponent } from './BaseComponent';
/**
 * @class TabSections
 * @description TabSections Component
 */
export declare class TabSections extends BaseComponent {
    tabs: any[];
    tabDOMs: Record<string, HTMLElement>;
    constructor(name: string, tabs: any[], options?: any);
    select(name: string): void;
}
