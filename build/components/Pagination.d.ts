/**
 * @class Pagination
 */
export declare class Pagination {
    static ITEMS_PER_PAGE_VALUES: number[];
    root: HTMLElement;
    pagesRoot: HTMLElement;
    page: number;
    pages: number;
    _alwaysShowEdges: boolean;
    _useEllipsis: boolean;
    _maxButtons: number;
    _itemsPerPage: number;
    _itemsPerPageValues: number[];
    onChange: (page: number) => void;
    onItemsPerPageChange: (n: number) => void;
    constructor(options?: any);
    setPage(n: number): void;
    setPages(n: number): void;
    next(): void;
    prev(): void;
    refresh(): void;
    _emitChange(): void;
    _makeButton(label: string, disabled: boolean, onclick: () => void, buttonClass?: string, parent?: HTMLElement): any;
    _makePageButton(container: HTMLElement, i: number): any;
}
