// Pagination.ts @jxarco

import { LX } from './../core/Namespace';
import { Button } from './Button';

/**
 * @class Pagination
 */

export class Pagination
{
    root: HTMLElement;

    page: number = 1;
    pages: number = 1;

    _alwaysShowEdges: boolean = true;
    _useEllipsis: boolean = true;
    _maxButtons: number = 3;

    onChange: (page: number) => void = () => {};

    constructor( options: any = {} )
    {
        this.pages = options.pages ?? 1;
        this.page = LX.clamp( options.page ?? 1, 1, this.pages );

        this._alwaysShowEdges = options.alwaysShowEdges ?? this._alwaysShowEdges;
        this._useEllipsis = options.useEllipsis ?? this._useEllipsis;
        this._maxButtons = options.maxButtons ?? this._maxButtons;

        if( typeof options.onChange === 'function' )
        {
            this.onChange = options.onChange;
        }

        this.root = LX.makeContainer( [ "auto", "auto" ], "flex flex-row overflow-scroll" );

        this.refresh();
    }

    setPage( n: number )
    {
        const newPage = LX.clamp( n, 1, this.pages );

        if( newPage === this.page )
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

        if( this.page > this.pages )
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
        this.root.innerHTML = "";

        // Previous page button
        this._makeButton( LX.makeIcon( "ChevronLeft" ).innerHTML, this.page === 1, () => this.prev(), `bg-none ${ this.page === 1 ? "" : "hover:bg-tertiary" }` );

        const pagesContainer = LX.makeContainer( [ "auto", "auto" ], "flex flex-row items-center", "", this.root );
        const maxButtons = this._maxButtons + 2; // + next and prev
        
        if( this.pages <= maxButtons )
        {
            for( let i = 1; i <= this.pages; i++ )
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
            let end   = Math.min( total - edgesOffset, page + half );

            // Adjust cluster if too close to edges
            if( start <= 2 )
            {
                start = 1 + edgesOffset;
                end = start + clusterSize - 1;
            }

            if( end >= total - 1 )
            {
                end = total - edgesOffset;
                start = end - clusterSize + 1;
            }

            // First page
            if( this._alwaysShowEdges )
            {
                this._makePageButton( pagesContainer, showFirst );
            }

            // Ellipsis after first if needed
            if( this._useEllipsis && start > 2 )
            {
                LX.makeElement( 'span', "h-6 px-2 text-lg font-semibold whitespace-nowrap", "...", pagesContainer );
            }

            // Page button cluster
            for( let i = start; i <= end; i++ )
            {
                this._makePageButton( pagesContainer, i );
            }

            // Ellipsis before last if needed
            if( this._useEllipsis && end < total - 1 )
            {
                LX.makeElement( 'span', "h-6 px-2 text-lg font-semibold whitespace-nowrap", "...", pagesContainer );
            }

            // Last page
            if( this._alwaysShowEdges )
            {
                this._makePageButton( pagesContainer, showLast );
            }
        }

        // Next page button
        this._makeButton( LX.makeIcon( "ChevronRight" ).innerHTML, this.page === this.pages, () => this.next(), `bg-none ${ this.page === this.pages ? "" : "hover:bg-tertiary" }` );
    }

    _emitChange()
    {
        // Event callback
        this.onChange?.( this.page );

        // DOM event for DOM workflows?
        this.root.dispatchEvent( new CustomEvent( 'change', {
            detail: { page: this.page }
        }));
    }

    _makeButton( label: string, disabled: boolean, onclick: () => void, buttonClass?: string, parent?: HTMLElement )
    {
        const btn = new Button( null, label, onclick, { disabled, buttonClass } );
        btn.root.querySelector( "button" ).style.paddingInline = "0.5rem";

        parent = parent ?? this.root;
        parent.appendChild( btn.root );

        return btn.root;
    }

    _makePageButton( container: HTMLElement, i: number )
    {
        const buttonClass = i === this.page ? "bg-secondary border" : "bg-none";
        return this._makeButton( String( i ), false, () => this.setPage( i ), buttonClass, container );
    }
};

LX.Pagination = Pagination;