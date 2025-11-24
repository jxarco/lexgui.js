// Rate.ts @jxarco

import { LX } from './../core/Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';
import { Button } from './Button';
import { TextInput } from './TextInput';
import { Popover } from './Popover';
import { CalendarRange } from './CalendarRange';

/**
 * @class Table
 * @description Table Component
 */

export class Table extends BaseComponent
{
    data: any;
    filter: string | false;
    customFilters: any[] | null;
    activeCustomFilters: any;
    rowOffsetCount: number = 0;

    _currentFilter: string | undefined;
    _toggleColumns: boolean;
    _sortColumns: boolean;
    _resetCustomFiltersBtn: Button | null = null;

    private _centered: any;
    get centered(): any { return this._centered; }
    set centered( v: any ) { this._setCentered( v ); }

    constructor( name: string, data: any, options: any = {} )
    {
        if( !data )
        {
            throw( "Data is needed to create a table!" );
        }

        super( ComponentType.TABLE, name, null, options );

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        const container = document.createElement('div');
        container.className = "lextable";
        this.root.appendChild( container );

        this._centered = options.centered ?? false;
        if( this._centered === true )
        {
            container.classList.add( "centered" );
        }

        this.filter = options.filter ?? false;
        this.customFilters = options.customFilters;
        this.activeCustomFilters = {};
        this._toggleColumns = options.toggleColumns ?? false;
        this._sortColumns = options.sortColumns ?? true;
        this._currentFilter = options.filterValue;

        data.head = data.head ?? [];
        data.body = data.body ?? [];
        data.checkMap = { };
        data.colVisibilityMap = { };
        data.head.forEach( ( col: any, index: number ) => { data.colVisibilityMap[ index ] = true; })
        this.data = data;

        const getDate = ( text: string ): Date | null =>
        {
            // Match DD/MM/YYYY or DD-MM-YYYY
            const m = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2}|\d{4})$/);
            if( !m ) return null;

            let day = Number( m[ 1 ] );
            let month = Number( m[ 2 ] ) - 1; // JS months: 0-11
            let year = Number( m[ 3 ] );

            // Convert YY → 20YY
            if( year < 100 ) year += 2000;

            const d = new Date( year, month, day );

            // Validate (to avoid things like 32/13/2025 becoming valid)
            if( d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day )
            {
                return null;
            }

            return d;
        };

        const compareFn = ( idx: number, order: number, a: any, b: any ) =>
        {
            const va = a[ idx ];
            const vb = b[ idx ];

            // Date sort
            const da = getDate( va );
            const db = getDate( vb );
            if( da && db )
            {
                if( da.getTime() < db.getTime() ) return -order;
                if( da.getTime() > db.getTime() ) return order;
                return 0;
            }

            // Number sort
            const na = Number( va );
            const nb = Number( vb );
            if( !isNaN( na ) && !isNaN( nb ) )
            {
                if( na < nb ) return -order;
                if( na > nb ) return order;
                return 0;
            }

            // String sort
            if( va < vb ) return -order;
            else if( va > vb ) return order;
            return 0;
        }

        const sortFn = ( idx: number, sign: number ) =>
        {
            data.body = data.body.sort( compareFn.bind( this, idx, sign ) );
            this.refresh();
        }

        // Append header
        if( this.filter || this.customFilters || this._toggleColumns )
        {
            const headerContainer = LX.makeContainer( [ "100%", "auto" ], "flex flex-row" );

            if( this.filter )
            {
                const filterOptions = LX.deepCopy( options );
                filterOptions.placeholder = `Filter ${ this.filter }...`;
                filterOptions.skipComponent = true;
                filterOptions.trigger = "input";
                filterOptions.inputClass = "outline";

                let filter = new TextInput(null, this._currentFilter ?? "", ( v: string ) => {
                    this._currentFilter = v;
                    this.refresh();
                }, filterOptions );

                headerContainer.appendChild( filter.root );
            }

            if( this.customFilters !== null )
            {
                const icon = LX.makeIcon( "CirclePlus", { svgClass: "sm" } );
                const separatorHtml = `<div class="lexcontainer border-right self-center mx-1" style="width: 1px; height: 70%;"></div>`;

                for( let f of this.customFilters )
                {
                    f.component = new Button(null, icon.innerHTML + f.name, ( v: any ) => {

                        const spanName = f.component.root.querySelector( "span" );

                        if( f.options )
                        {
                            const menuOptions = f.options.map( ( colName: string, idx: number ) => {
                                const item = {
                                    name: colName,
                                    checked:  !!this.activeCustomFilters[ colName ],
                                    callback: ( key: string, v: boolean, dom: HTMLElement) => {
                                        if( v ) { this.activeCustomFilters[ key ] = f.name; }
                                        else {
                                            delete this.activeCustomFilters[ key ];
                                        }
                                        const activeFilters = Object.keys( this.activeCustomFilters ).filter(  k => this.activeCustomFilters[ k ] == f.name );
                                        const filterBadgesHtml = activeFilters.reduce( ( acc, key ) => acc += LX.badge( key, "bg-tertiary fg-secondary text-sm border-0" ), "" );
                                        spanName.innerHTML = icon.innerHTML + f.name + ( activeFilters.length ? separatorHtml : "" ) + filterBadgesHtml;
                                        this.refresh();
                                    }
                                }
                                return item;
                            } );
                            LX.addDropdownMenu( f.component.root, menuOptions, { side: "bottom", align: "start" });
                        }
                        else if( f.type == "range" )
                        {
                            console.assert( f.min != undefined && f.max != undefined, "Range filter needs min and max values!" );
                            const container = LX.makeContainer( ["240px", "auto"], "text-md" );
                            const panel: any = new LX.Panel();
                            LX.makeContainer( ["100%", "auto"], "px-3 p-2 pb-0 text-md font-medium", f.name, container );

                            f.start = f.start ?? f.min;
                            f.end = f.end ?? f.max;

                            panel.refresh = () => {
                                panel.clear();
                                panel.sameLine( 2, "justify-center" );
                                panel.addNumber( null, f.start, ( v: number ) => {
                                    f.start = v;
                                    const inUse = ( f.start != f.min || f.end != f.max );
                                    spanName.innerHTML = icon.innerHTML + f.name + ( inUse ? separatorHtml + LX.badge( `${ f.start } - ${ f.end } ${ f.units ?? "" }`, "bg-tertiary fg-secondary text-sm border-0" ) : "" );
                                    if( inUse ) this._resetCustomFiltersBtn?.root.classList.remove( "hidden" );
                                    this.refresh();
                                }, { skipSlider: true, min: f.min, max: f.max, step: f.step, units: f.units } );
                                panel.addNumber( null, f.end, ( v: number ) => {
                                    f.end = v;
                                    const inUse = ( f.start != f.min || f.end != f.max );
                                    spanName.innerHTML = icon.innerHTML + f.name + ( inUse ? separatorHtml + LX.badge( `${ f.start } - ${ f.end } ${ f.units ?? "" }`, "bg-tertiary fg-secondary text-sm border-0" ) : "" );
                                    if( inUse ) this._resetCustomFiltersBtn?.root.classList.remove( "hidden" );
                                    this.refresh();
                                }, { skipSlider: true, min: f.min, max: f.max, step: f.step, units: f.units } );
                                panel.addButton( null, "Reset", () => {
                                    f.start = f.min;
                                    f.end = f.max;
                                    spanName.innerHTML = icon.innerHTML + f.name;
                                    panel.refresh();
                                    this.refresh();
                                }, { buttonClass: "contrast" } );
                            }
                            panel.refresh();
                            container.appendChild( panel.root );
                            new Popover( f.component.root, [ container ], { side: "bottom" } );
                        }
                        else if( f.type == "date" )
                        {
                            const container = LX.makeContainer( ["auto", "auto"], "text-md" );
                            const panel: any = new LX.Panel();
                            LX.makeContainer( ["100%", "auto"], "px-3 p-2 pb-0 text-md font-medium", f.name, container );

                            panel.refresh = () => {
                                panel.clear();

                                // Generate default value once the filter is used
                                if( !f.default )
                                {
                                    const date = new Date();
                                    const todayStringDate = `${ date.getDate() }/${ date.getMonth() + 1 }/${ date.getFullYear() }`;
                                    f.default = [ todayStringDate, todayStringDate ];
                                }

                                const calendar = new CalendarRange( f.value, {
                                    onChange: ( dateRange: any ) => {
                                        f.value = dateRange;
                                        spanName.innerHTML = icon.innerHTML + f.name + ( separatorHtml + LX.badge( `${ calendar.getFullDate() }`, "bg-tertiary fg-secondary text-sm border-0" ) );
                                        this._resetCustomFiltersBtn?.root.classList.remove( "hidden" );
                                        this.refresh();
                                    }
                                });

                                panel.attach( calendar );
                            }
                            panel.refresh();
                            container.appendChild( panel.root );
                            new Popover( f.component.root, [ container ], { side: "bottom" } );
                        }

                    }, { buttonClass: "px-2 primary dashed" } );
                    headerContainer.appendChild( f.component.root );
                }

                this._resetCustomFiltersBtn = new Button(null, "resetButton", () => {
                    this.activeCustomFilters = {};
                    this._resetCustomFiltersBtn?.root.classList.add( "hidden" );
                    for( let f of this.customFilters ?? [] )
                    {
                        f.component.root.querySelector( "span" ).innerHTML = ( icon.innerHTML + f.name );
                        if( f.type == "range" )
                        {
                            f.start = f.min;
                            f.end = f.max;
                        }
                        else if( f.type == "date" )
                        {
                            delete f.default;
                        }
                    }
                    this.refresh();
                }, { title: "Reset filters", tooltip: true, icon: "X" } );
                headerContainer.appendChild( this._resetCustomFiltersBtn?.root );
                this._resetCustomFiltersBtn?.root.classList.add( "hidden" );
            }

            if( this._toggleColumns )
            {
                const icon = LX.makeIcon( "Settings2" );
                const toggleColumnsBtn = new Button( "toggleColumnsBtn", icon.innerHTML + "View", ( value: any, e: any ) => {
                    const menuOptions = data.head.map( ( colName: string, idx: number ) => {
                        const item: any = {
                            name: colName,
                            icon: "Check",
                            callback: () => {
                                data.colVisibilityMap[ idx ] = !data.colVisibilityMap[ idx ];
                                const cells = table.querySelectorAll( `tr > *:nth-child(${idx + this.rowOffsetCount + 1})` );
                                cells.forEach( ( cell: any ) => {
                                    cell.style.display = ( cell.style.display === "none" ) ? "" : "none";
                                } );
                            }
                        }
                        if( !data.colVisibilityMap[ idx ] ) delete item.icon;
                        return item;
                    } );
                    LX.addDropdownMenu( e.target, menuOptions, { side: "bottom", align: "end" });
                }, { hideName: true } );
                headerContainer.appendChild( toggleColumnsBtn.root );
                toggleColumnsBtn.root.style.marginLeft = "auto";
            }

            container.appendChild( headerContainer );
        }

        const table = document.createElement( 'table' );
        container.appendChild( table );

        this.refresh = () => {

            this._currentFilter = this._currentFilter ?? "";

            table.innerHTML = "";

            this.rowOffsetCount = 0;

            // Head
            {
                const head = document.createElement( 'thead' );
                head.className = "lextablehead";
                table.appendChild( head );

                const hrow = document.createElement( 'tr' );

                if( options.sortable ?? false )
                {
                    const th = document.createElement( 'th' );
                    th.style.width = "0px";
                    hrow.appendChild( th );
                    this.rowOffsetCount++;
                }

                if( options.selectable ?? false )
                {
                    const th = document.createElement( 'th' );
                    th.style.width = "0px";
                    const input = document.createElement( 'input' );
                    input.type = "checkbox";
                    input.className = "lexcheckbox accent";
                    input.checked = data.checkMap[ ":root" ] ?? false;
                    th.appendChild( input );

                    input.addEventListener( 'change', function() {

                        data.checkMap[ ":root" ] = this.checked;

                        const body: any = table.querySelector( "tbody" );
                        for( const el of body.childNodes )
                        {
                            const rowId = el.getAttribute( "rowId" );
                            if( !rowId ) continue;
                            data.checkMap[ rowId ] = this.checked;
                            el.querySelector( "input[type='checkbox']" ).checked = this.checked;
                        }
                    });

                    this.rowOffsetCount++;
                    hrow.appendChild( th );
                }

                for( const headData of data.head )
                {
                    const th: any = document.createElement( 'th' );
                    th.innerHTML = `<span>${ headData }</span>`;
                    th.querySelector( "span" ).appendChild( LX.makeIcon( "MenuArrows", { svgClass: "sm" } ) );

                    const idx = data.head.indexOf( headData );
                    if( this._centered?.indexOf && this._centered.indexOf( idx ) > -1 )
                    {
                        th.classList.add( "centered" );
                    }

                    const menuOptions: any[] = [];

                    if( options.columnActions )
                    {
                        for( let action of options.columnActions )
                        {
                            if( !action.name )
                            {
                                console.warn( "Invalid column action (missing name):", action );
                                continue;
                            }

                            menuOptions.push( { name: action.name, icon: action.icon, className: action.className, callback: () => {
                                const colRows = this.data.body.map( ( row: any[] ) => [ row[ idx ] ] );
                                const mustRefresh = action.callback( colRows, table );
                                if( mustRefresh )
                                {
                                    this.refresh();
                                }
                            } } );
                        }
                    }

                    if( this._sortColumns )
                    {
                        if(  menuOptions.length > 0 )
                        {
                            menuOptions.push( null );
                        }

                        menuOptions.push(
                            { name: "Asc", icon: "ArrowUpZA", callback: sortFn.bind( this, idx, 1 ) },
                            { name: "Desc", icon: "ArrowDownZA", callback: sortFn.bind( this, idx, -1 ) }
                        );
                    }

                    if( this._toggleColumns )
                    {
                        if(  menuOptions.length > 0 )
                        {
                            menuOptions.push( null );
                        }

                        menuOptions.push( {
                            name: "Hide", icon: "EyeOff", callback: () => {
                                data.colVisibilityMap[ idx ] = false;
                                const cells = table.querySelectorAll( `tr > *:nth-child(${idx + this.rowOffsetCount + 1})` );
                                cells.forEach( ( c: any ) => {
                                    c.style.display = ( c.style.display === "none" ) ? "" : "none";
                                } );
                            }
                        } );
                    }

                    th.addEventListener( 'click', ( e: MouseEvent ) => {
                        if( menuOptions.length === 0 ) return;
                        LX.addDropdownMenu( e.target, menuOptions, { side: "bottom", align: "start" });
                    });

                    hrow.appendChild( th );
                }

                // Add empty header column
                if( options.rowActions )
                {
                    const th = document.createElement( 'th' );
                    th.className = "sm";
                    hrow.appendChild( th );
                }

                head.appendChild( hrow );
            }

            // Body
            {
                const body = document.createElement( 'tbody' );
                body.className = "lextablebody";
                table.appendChild( body );

                let rIdx: any = null;
                let eventCatched: any = false;
                let movePending: any = null;

                document.addEventListener( 'mouseup', (e) => {
                    if( rIdx === null ) return;
                    document.removeEventListener( "mousemove", onMove );
                    const fromRow: any = table.rows[ rIdx ];
                    fromRow.dY = 0;
                    fromRow.classList.remove( "dragging" );
                    Array.from( table.rows ).forEach( v => {
                        v.style.transform = ``;
                        v.style.transition = `none`;
                    } );
                    LX.flushCss( fromRow );

                    if( movePending )
                    {
                        // Modify inner data first
                        // Origin row should go to the target row, and the rest should be moved up/down
                        const fromIdx = rIdx - 1;
                        const targetIdx = movePending[ 1 ] - 1;

                        LX.emitSignal( "@on_table_sort", { instance: this, fromIdx, targetIdx } );

                        const b = data.body[ fromIdx ];
                        let targetOffset = 0;

                        if( fromIdx == targetIdx ) return;
                        if( fromIdx > targetIdx ) // Move up
                        {
                            for( let i = fromIdx; i > targetIdx; --i )
                            {
                                data.body[ i ] = data.body[ i - 1 ];
                            }
                        }
                        else // Move down
                        {
                            targetOffset = 1;
                            for( let i = fromIdx; i < targetIdx; ++i )
                            {
                                data.body[ i ] = data.body[ i + 1 ];
                            }
                        }

                        data.body[targetIdx] = b;

                        const parent = movePending[ 0 ].parentNode;
                        LX.insertChildAtIndex( parent, movePending[ 0 ], targetIdx + targetOffset );
                        movePending = null;
                    }

                    rIdx = null;

                    LX.doAsync( () => {
                        Array.from( table.rows ).forEach( v => {
                            v.style.transition = `transform 0.2s ease-in`;
                        } );
                    } )
                } );

                let onMove = ( e: MouseEvent ) => {
                    if( !rIdx ) return;
                    const fromRow: any = table.rows[ rIdx ];
                    fromRow.dY = fromRow.dY ?? 0;
                    fromRow.dY += e.movementY;
                    fromRow.style.transform = `translateY(${ fromRow.dY }px)`;
                };

                for( let r = 0; r < data.body.length; ++r )
                {
                    const bodyData = data.body[ r ];

                    if( this.filter )
                    {
                        const filterColIndex = data.head.indexOf( this.filter );
                        if( filterColIndex > -1 )
                        {
                            const validRowValue = LX.stripHTML( bodyData[ filterColIndex ] ).toLowerCase();
                            if( !validRowValue.includes( this._currentFilter.toLowerCase() ) )
                            {
                                continue;
                            }
                        }
                    }

                    if( Object.keys( this.activeCustomFilters ).length )
                    {
                        let acfMap: Record<string, boolean> = {};

                        this._resetCustomFiltersBtn?.root.classList.remove( "hidden" );

                        for( let acfValue in this.activeCustomFilters )
                        {
                            const acfName = this.activeCustomFilters[ acfValue ];
                            acfMap[ acfName ] = acfMap[ acfName ] ?? false;

                            const filterColIndex = data.head.indexOf( acfName );
                            if( filterColIndex > -1 )
                            {
                                acfMap[ acfName ] = acfMap[ acfName ] || ( bodyData[ filterColIndex ] === acfValue );
                            }
                        }

                        const show = Object.values( acfMap ).reduce<boolean>( ( acc, e ) => acc && e, true );
                        if( !show )
                        {
                            continue;
                        }
                    }

                    // Check range/date filters
                    if( this.customFilters )
                    {
                        let acfMap: Record<string, boolean> = {};

                        for( let f of this.customFilters )
                        {
                            const acfName = f.name;

                            if( f.type == "range" )
                            {
                                acfMap[ acfName ] = acfMap[ acfName ] ?? false;

                                const filterColIndex = data.head.indexOf( acfName );
                                if( filterColIndex > -1 )
                                {
                                    const validRowValue = parseFloat( bodyData[ filterColIndex ] );
                                    const min = f.start ?? f.min;
                                    const max = f.end ?? f.max;
                                    acfMap[ acfName ] = acfMap[ acfName ] || ( ( validRowValue >= min ) && ( validRowValue <= max ) );
                                }
                            }
                            else if( f.type == "date" )
                            {
                                acfMap[ acfName ] = acfMap[ acfName ] ?? false;

                                const filterColIndex = data.head.indexOf( acfName );
                                if( filterColIndex > -1 )
                                {
                                    if( !f.default )
                                    {
                                        const date = new Date();
                                        const todayStringDate = `${ date.getDate() }/${ date.getMonth() + 1 }/${ date.getFullYear() }`;
                                        f.value = [ todayStringDate, todayStringDate ];
                                        acfMap[ acfName ] = true;
                                        continue;
                                    }

                                    f.value = f.value ?? f.default;

                                    const dateString = bodyData[ filterColIndex ];
                                    const date = LX.dateFromDateString( dateString );
                                    const minDate = LX.dateFromDateString( f.value[ 0 ] );
                                    const maxDate = LX.dateFromDateString( f.value[ 1 ] );
                                    acfMap[ acfName ] = acfMap[ acfName ] || ( ( date >= minDate ) && ( date <= maxDate ) );
                                }
                            }
                        }

                        const show = Object.values( acfMap ).reduce<boolean>( ( acc, e ) => acc && e, true );
                        if( !show )
                        {
                            continue;
                        }
                    }

                    const row = document.createElement( 'tr' );
                    const rowId = LX.getSupportedDOMName( bodyData.join( '-' ) ).substr(0, 32);
                    row.setAttribute( "rowId", rowId );

                    if( options.sortable ?? false )
                    {
                        const td = document.createElement( 'td' );
                        td.style.width = "0px";
                        const icon = LX.makeIcon( "GripVertical" );
                        td.appendChild( icon );

                        icon.draggable = true;

                        icon.addEventListener("dragstart", ( e: DragEvent ) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.stopImmediatePropagation();

                            rIdx = row.rowIndex;
                            row.classList.add( "dragging" );

                            document.addEventListener( "mousemove", onMove );
                        }, false );

                        row.addEventListener("mouseenter", function( e: MouseEvent ) {
                            e.preventDefault();

                            if( rIdx != null && ( this.rowIndex != rIdx ) && ( eventCatched != this.rowIndex ) )
                            {
                                eventCatched = this.rowIndex;
                                const fromRow = table.rows[ rIdx ];
                                const undo = ( this.style.transform != `` );
                                if (this.rowIndex > rIdx) {
                                    movePending = [ fromRow, undo ? (this.rowIndex-1) : this.rowIndex ];
                                    this.style.transform = undo ? `` : `translateY(-${this.offsetHeight}px)`;
                                } else {
                                    movePending = [ fromRow, undo ? (this.rowIndex+1) : (this.rowIndex) ];
                                    this.style.transform = undo ? `` : `translateY(${this.offsetHeight}px)`;
                                }
                                LX.doAsync( () => {
                                    eventCatched = false;
                                } )
                            }
                        });

                        row.appendChild( td );
                    }

                    if( options.selectable ?? false )
                    {
                        const td = document.createElement( 'td' );
                        const input = document.createElement( 'input' );
                        input.type = "checkbox";
                        input.className = "lexcheckbox accent";
                        input.checked = data.checkMap[ rowId ];
                        td.appendChild( input );

                        input.addEventListener( 'change', function() {
                            data.checkMap[ rowId ] = this.checked;

                            const headInput: any = table.querySelector( "thead input[type='checkbox']" );
                            console.assert( headInput, "Header checkbox not found!" );

                            if( !this.checked )
                            {
                                headInput.checked = data.checkMap[ ":root" ] = false;
                            }
                            else
                            {
                                const rowInputs = Array.from( table.querySelectorAll( "tbody input[type='checkbox']" ) );
                                const uncheckedRowInputs = rowInputs.filter( ( i: any ) => { return !i.checked; } );
                                if( !uncheckedRowInputs.length )
                                {
                                    headInput.checked = data.checkMap[ ":root" ] = true;
                                }
                            }
                        });

                        row.appendChild( td );
                    }

                    for( const rowData of bodyData )
                    {
                        const td = document.createElement( 'td' );
                        td.innerHTML = `${ rowData }`;

                        const idx = bodyData.indexOf( rowData );
                        if( this._centered?.indexOf && this._centered.indexOf( idx ) > -1 )
                        {
                            td.classList.add( "centered" );
                        }

                        row.appendChild( td );
                    }

                    if( options.rowActions )
                    {
                        const td = document.createElement( 'td' );
                        td.style.width = "0px";

                        const buttons = document.createElement( 'div' );
                        buttons.className = "lextablebuttons";
                        td.appendChild( buttons );

                        for( const action of options.rowActions )
                        {
                            let button = null;

                            if( action == "delete" )
                            {
                                button = LX.makeIcon( "Trash3", { title: "Delete Row" } );
                                button.addEventListener( 'click', function() {
                                    // Don't need to refresh table..
                                    data.body.splice( r, 1 );
                                    row.remove();
                                });
                            }
                            else if( action == "menu" )
                            {
                                button = LX.makeIcon( "EllipsisVertical", { title: "Menu" } );
                                button.addEventListener( 'click', function( e: MouseEvent ) {
                                    if( !options.onMenuAction )
                                    {
                                        return;
                                    }

                                    const menuOptions = options.onMenuAction( r, data );
                                    console.assert( menuOptions.length, "Add items to the Menu Action Dropdown!" );

                                    LX.addDropdownMenu( e.target, menuOptions, { side: "bottom", align: "end" });
                                });
                            }
                            else // custom actions
                            {
                                console.assert( action.constructor == Object );
                                button = LX.makeIcon( action.icon, { title: action.title } );

                                if( action.callback )
                                {
                                    button.addEventListener( 'click', ( e: MouseEvent ) => {
                                        const mustRefresh = action.callback( bodyData, table, e );
                                        if( mustRefresh )
                                        {
                                            this.refresh();
                                        }
                                    });
                                }
                            }

                            console.assert( button );
                            buttons.appendChild( button );
                        }

                        row.appendChild( td );
                    }

                    body.appendChild( row );
                }

                if( body.childNodes.length == 0 )
                {
                    const row = document.createElement( 'tr' );
                    const td = document.createElement( 'td' );
                    td.setAttribute( "colspan", data.head.length + this.rowOffsetCount + 1 ); // +1 for rowActions
                    td.className = "empty-row";
                    td.innerHTML = "No results.";
                    row.appendChild( td );
                    body.appendChild( row );
                }
            }

            for( const v in data.colVisibilityMap )
            {
                const idx = parseInt( v );
                if( !data.colVisibilityMap[ idx ] )
                {
                    const cells = table.querySelectorAll( `tr > *:nth-child(${idx + this.rowOffsetCount + 1})` );
                    cells.forEach( ( c: any ) => {
                        c.style.display = ( c.style.display === "none" ) ? "" : "none";
                    } );
                }
            }
        }

        this.refresh();

        LX.doAsync( this.onResize.bind( this ) );
    }

    getSelectedRows()
    {
        const selectedRows = [];

        for( const row of this.data.body )
        {
            const rowId = LX.getSupportedDOMName( row.join( '-' ) ).substr( 0, 32 );
            if( this.data.checkMap[ rowId ] === true )
            {
                selectedRows.push( row );
            }
        }

        return selectedRows;
    }

    _setCentered( v: any )
    {
        if( v.constructor == Boolean )
        {
            const container = this.root.querySelector( ".lextable" );
            container.classList.toggle( "centered", v );
        }
        else
        {
            // Make sure this is an array containing which columns have
            // to be centered
            v = Array.isArray( v ) ? v : [ v ];
        }

        this._centered = v;

        this.refresh();
    }
}

LX.Table = Table;