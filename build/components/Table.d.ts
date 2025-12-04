import { BaseComponent } from './BaseComponent';
import { Button } from './Button';
import { Pagination } from './Pagination';
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
    _paginator: Pagination | undefined;
    _showSelectedNumber: boolean;
    private _centered;
    get centered(): any;
    set centered(v: any);
    private _rowsPerPage;
    get rowsPerPage(): any;
    set rowsPerPage(v: any);
    constructor(name: string, data: any, options?: any);
    getSelectedRows(): any[];
    _makeRowId(row: any[]): any;
    _onChangePage(page: number): void;
    _getNumPages(total?: number): number;
    _setRowsPerPage(n: number): void;
    _setCentered(v: any): void;
}
