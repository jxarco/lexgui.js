import { BaseComponent } from './BaseComponent';
import { Button } from './Button';
/**
 * @class Table
 * @description Table Component
 */
export declare class Table extends BaseComponent {
    data: any;
    filter: string | false;
    customFilters: any[] | null;
    activeCustomFilters: any;
    rowOffsetCount: number;
    _currentFilter: string | undefined;
    _toggleColumns: boolean;
    _sortColumns: boolean;
    _resetCustomFiltersBtn: Button | null;
    _hiddenColumns: any[];
    private _centered;
    get centered(): any;
    set centered(v: any);
    constructor(name: string, data: any, options?: any);
    getSelectedRows(): any[];
    _setCentered(v: any): void;
}
