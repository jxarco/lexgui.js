// Pagination.ts @jxarco

import { LX } from './../core/Namespace';
import { Button } from './Button';
import { Select } from './Select';

/**
 * @class Pagination
 */

export class Pagination
{
    static ITEMS_PER_PAGE_VALUES: number[] = [ 8, 12, 24, 48, 96 ];

    root: HTMLElement;
    pagesRoot: HTMLElement;

    page: number = 1;
    pages: number = 1;

    _alwaysShowEdges: boolean = true;
    _useEllipsis: boolean = true;
    _maxButtons: number = 3;
    _itemsPerPage: number = 12;
    _itemsPerPageValues: number[] = Pagination.ITEMS_PER_PAGE_VALUES;

    onChange: ( page: number ) => void = () => {};
    onItemsPerPageChange: ( n: number ) => void = () => {};

    constructor( options: any = {} )
    {
        this.pages = options.pages ?? 1;
        this.page = LX.clamp( options.page ?? 1, 1, this.pages );

        this._alwaysShowEdges = options.alwaysShowEdges ?? this._alwaysShowEdges;
        this._useEllipsis = options.useEllipsis ?? this._useEllipsis;
        this._maxButtons = options.maxButtons ?? this._maxButtons;
        this._itemsPerPage = options.itemsPerPage ?? this._itemsPerPage;

        if ( this._itemsPerPageValues.indexOf( this._itemsPerPage ) === -1 )
        {
            this._itemsPerPageValues.push( this._itemsPerPage );
            this._itemsPerPageValues = this._itemsPerPageValues.sort( ( a: number, b: number ) => {
                if ( a < b ) return -1;
                if ( a > b ) return 1;
                return 0;
            } );
        }

        if ( typeof options.onChange === 'function' )
        {
            this.onChange = options.onChange;
        }

        if ( typeof options.onItemsPerPageChange === 'function' )
        {
            this.onItemsPerPageChange = options.onItemsPerPageChange;
        }

        this.root = LX.makeContainer( [ 'auto', 'auto' ], LX.mergeClass( 'flex flex-row gap-2', options.className ) );

        if ( options.allowChangeItemsPerPage ?? false )
        {
            const itemsPerPageSelectContainer = LX.makeContainer( [ 'auto', 'auto' ], 'flex flex-row items-center', '', this.root );
            const itemsPerPageSelect = new Select( null, Pagination.ITEMS_PER_PAGE_VALUES, this._itemsPerPage, ( v: number ) => {
                this._itemsPerPage = v;
                this.onItemsPerPageChange?.( this._itemsPerPage );
            }, { overflowContainer: null } );
            itemsPerPageSelectContainer.appendChild( itemsPerPageSelect.root );
        }

        this.pagesRoot = LX.makeContainer( [ 'auto', 'auto' ], 'flex flex-row overflow-scroll', '', this.root );

        this.refresh();
    }

    setPage( n: number )
    {
        const newPage = LX.clamp( n, 1, this.pages );

        if ( newPage === this.page )
        {
            return;
        }

        this.page = newPage;
        this.refresh();
        this._emitChange();
    }

    setPages( n: number )
    {
        this.pages = Math.max( 1, n );

        if ( this.page > this.pages )
        {
            this.page = this.pages;
        }

        this.refresh();
    }

    next()
    {
        this.setPage( this.page + 1 );
    }

    prev()
    {
        this.setPage( this.page - 1 );
    }

    refresh()
    {
        this.pagesRoot.innerHTML = '';

        // Previous page button
        this._makeButton( LX.makeIcon( 'ChevronLeft' ).innerHTML, this.page === 1, () => this.prev(),
            `bg-none ${this.page === 1 ? '' : 'hover:bg-secondary'}` );

        const pagesContainer = LX.makeContainer( [ 'auto', 'auto' ], 'flex flex-row items-center', '', this.pagesRoot );
        const maxButtons = this._maxButtons + 2; // + next and prev

        if ( this.pages <= maxButtons )
        {
            for ( let i = 1; i <= this.pages; i++ )
            {
                this._makePageButton( pagesContainer, i );
            }
        }
        else
        {
            const page = this.page;
            const total = this.pages;

            // Always show first and last pages and the middle cluster depends on current page!

            const showFirst = 1;
            const showLast = total;
            const edgesOffset = this._alwaysShowEdges ? 1 : 0;
            const clusterSize = maxButtons - 2; // reserve spots for first and last
            const half = Math.floor( clusterSize / 2 );

            let start = Math.max( 1 + edgesOffset, page - half );
            let end = Math.min( total - edgesOffset, page + half );

            // Adjust cluster if too close to edges
            if ( start <= 2 )
            {
                start = 1 + edgesOffset;
                end = start + clusterSize - 1;
            }

            if ( end >= total - 1 )
            {
                end = total - edgesOffset;
                start = end - clusterSize + 1;
            }

            // First page
            if ( this._alwaysShowEdges )
            {
                this._makePageButton( pagesContainer, showFirst );
            }

            // Ellipsis after first if needed
            if ( this._useEllipsis && start > 2 )
            {
                LX.makeElement( 'span', 'h-6 px-2 text-lg font-semibold whitespace-nowrap', '...', pagesContainer );
            }

            // Page button cluster
            for ( let i = start; i <= end; i++ )
            {
                this._makePageButton( pagesContainer, i );
            }

            // Ellipsis before last if needed
            if ( this._useEllipsis && end < total - 1 )
            {
                LX.makeElement( 'span', 'h-6 px-2 text-lg font-semibold whitespace-nowrap', '...', pagesContainer );
            }

            // Last page
            if ( this._alwaysShowEdges )
            {
                this._makePageButton( pagesContainer, showLast );
            }
        }

        // Next page button
        this._makeButton( LX.makeIcon( 'ChevronRight' ).innerHTML, this.page === this.pages, () => this.next(),
            `bg-none ${this.page === this.pages ? '' : 'hover:bg-secondary'}` );
    }

    _emitChange()
    {
        // Event callback
        this.onChange?.( this.page );

        // DOM event for DOM workflows?
        this.root.dispatchEvent( new CustomEvent( 'change', {
            detail: { page: this.page }
        } ) );
    }

    _makeButton( label: string, disabled: boolean, onclick: () => void, buttonClass?: string, parent?: HTMLElement )
    {
        const btn = new Button( null, label, onclick, { disabled, buttonClass } );
        btn.root.querySelector( 'button' ).style.paddingInline = '0.5rem';

        parent = parent ?? this.pagesRoot;
        parent.appendChild( btn.root );

        return btn.root;
    }

    _makePageButton( container: HTMLElement, i: number )
    {
        const buttonClass = `h-8 ${i === this.page ? 'bg-primary text-primary-foreground' : 'ghost'}`;
        return this._makeButton( String( i ), false, () => this.setPage( i ), buttonClass, container );
    }
}

LX.Pagination = Pagination;
