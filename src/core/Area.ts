// Area.ts @jxarco

import { ContextMenu } from '../components/ContextMenu';
import { Menubar } from '../components/Menubar';
import { Tabs } from '../components/Tabs';
import { LX } from './Namespace';
import { Panel } from './Panel';

export class AreaOverlayButtons
{
    area: Area;
    options: any;
    buttons: any;

    constructor( area: Area, buttonsArray: any[], options = {} )
    {
        this.area = area;
        this.options = options;
        this.buttons = {};

        this._buildButtons( buttonsArray, options );
    }

    _buildButtons( buttonsArray: any[], options: any = {} )
    {
        options.className = 'lexoverlaybuttons flex justify-start gap-2 bg-card m-2 p-1 rounded-2xl border-color';

        let overlayPanel = this.area.addPanel( options );
        let overlayGroup: any = null;

        const container = LX.makeElement( 'div', 'lexoverlaybuttonscontainer absolute flex top-0 w-full pointer-events-none' );
        container.appendChild( overlayPanel.root );
        this.area.attach( container );

        const float = options.float;
        let floatClass = '';

        if ( float )
        {
            for ( let i = 0; i < float.length; i++ )
            {
                const t = float[i];
                switch ( t )
                {
                    case 'h':
                        break;
                    case 'v':
                        floatClass += ' vertical';
                        break;
                    case 't':
                        break;
                    case 'm':
                        floatClass += ' middle';
                        break;
                    case 'b':
                        floatClass += ' bottom';
                        break;
                    case 'l':
                        break;
                    case 'c':
                        floatClass += ' center';
                        break;
                    case 'r':
                        floatClass += ' right';
                        break;
                }
            }

            container.className += ` ${floatClass}`;
        }

        const _addButton = ( b: any, group?: any, last?: boolean ) => {
            const _options: any = {
                width: 'auto',
                selectable: b.selectable,
                selected: b.selected,
                icon: b.icon,
                img: b.img,
                className: b.class ?? '',
                buttonClass: b.buttonClass ?? 'x', // Avoid using default outline
                title: b.name,
                overflowContainerX: overlayPanel.root,
                swap: b.swap
            };

            if ( group )
            {
                if ( !overlayGroup )
                {
                    overlayGroup = document.createElement( 'div' );
                    overlayGroup.className = 'lexoverlaygroup flex flex-none bg-secondary rounded-xl';
                    overlayPanel.queuedContainer = overlayGroup;
                }

                _options.parent = overlayGroup;
            }

            let callback = b.callback;
            let component: any = null;

            if ( b.options )
            {
                component = overlayPanel.addSelect( null, b.options, b.value ?? b.name, callback, _options );
            }
            else
            {
                component = overlayPanel.addButton( null, b.name, function( value: any, event: any )
                {
                    if ( b.selectable )
                    {
                        if ( b.group )
                        {
                            let _prev = b.selected;
                            b.group.forEach( ( sub: any ) => sub.selected = false );
                            b.selected = !_prev;
                        }
                        else
                        {
                            b.selected = !b.selected;
                        }
                    }

                    if ( callback )
                    {
                        callback( value, event, component.root );
                    }
                }, _options );
            }

            this.buttons[b.name] = component;

            // ends the group
            if ( overlayGroup && last )
            {
                overlayPanel.root.appendChild( overlayGroup );
                overlayGroup = null;
                overlayPanel.clearQueue();
            }
        };

        const _refreshPanel = function()
        {
            overlayPanel.clear();

            for ( let b of buttonsArray )
            {
                if ( b === null )
                {
                    // Add a separator
                    const separator = document.createElement( 'div' );
                    separator.className = 'lexoverlayseparator' + floatClass;
                    overlayPanel.root.appendChild( separator );
                    continue;
                }

                if ( b.constructor === Array )
                {
                    for ( let i = 0; i < b.length; ++i )
                    {
                        let sub = b[i];
                        sub.group = b;
                        _addButton( sub, true, i == ( b.length - 1 ) );
                    }
                }
                else
                {
                    _addButton( b );
                }
            }

            // Add floating info
            if ( float )
            {
                var height = 0;
                overlayPanel.root.childNodes.forEach( ( c: HTMLElement ) => {
                    height += c.offsetHeight;
                } );

                if ( container.className.includes( 'middle' ) )
                {
                    container.style.top = '-moz-calc( 50% - ' + ( height * 0.5 ) + 'px )';
                    container.style.top = '-webkit-calc( 50% - ' + ( height * 0.5 ) + 'px )';
                    container.style.top = 'calc( 50% - ' + ( height * 0.5 ) + 'px )';
                }
            }
        };

        _refreshPanel();
    }
}

LX.AreaOverlayButtons = AreaOverlayButtons;

export class Area
{
    /**
     * @constructor Area
     * @param {Object} options
     * id: Id of the element
     * className: Add class to the element
     * width: Width of the area element [fit space]
     * height: Height of the area element [fit space]
     * skipAppend: Create but not append to GUI root [false]
     * minWidth: Minimum width to be applied when resizing
     * minHeight: Minimum height to be applied when resizing
     * maxWidth: Maximum width to be applied when resizing
     * maxHeight: Maximum height to be applied when resizing
     * layout: Layout to automatically split the area
     */

    offset: number = 0;
    root: any;
    size: any[];
    resize: boolean = false;
    sections: any[] = [];
    panels: any[] = [];

    minWidth: number = 0;
    minHeight: number = 0;
    maxWidth: number = Infinity;
    maxHeight: Number = Infinity;

    layout: any;
    type?: string;
    parentArea?: Area;
    splitBar?: any;
    splitExtended?: boolean;
    overlayButtons?: AreaOverlayButtons;
    onresize?: any;

    _autoVerticalResizeObserver?: ResizeObserver;
    _root: any;

    constructor( options: any = {} )
    {
        var root = document.createElement( 'div' );

        if ( options.id )
        {
            root.id = options.id;
        }

        root.className = LX.mergeClass( 'lexarea m-0 bg-background text-foreground', options.className );

        var width: any = options.width || '100%';
        var height: any = options.height || '100%';

        // This has default options..
        this.setLimitBox( options.minWidth, options.minHeight, options.maxWidth, options.maxHeight );

        if ( width.constructor == Number )
        {
            width = `${width}px`;
        }
        if ( height.constructor == Number )
        {
            height = `${height}px`;
        }

        root.style.width = width;
        root.style.height = height;

        this.root = root;
        this.size = [ this.root.offsetWidth, this.root.offsetHeight ];

        let lexroot = document.getElementById( 'lexroot' );
        if ( lexroot && !options.skipAppend )
        {
            lexroot.appendChild( this.root );
        }

        if ( options.layout )
        {
            this.setLayout( options.layout );
        }

        let overlay = options.overlay;

        if ( overlay )
        {
            this.root.classList.add( 'overlay-' + overlay );

            if ( options.left )
            {
                this.root.style.left = options.left;
            }
            else if ( options.right )
            {
                this.root.style.right = options.right;
            }
            else if ( options.top )
            {
                this.root.style.top = options.top;
            }
            else if ( options.bottom )
            {
                this.root.style.bottom = options.bottom;
            }

            const draggable = options.draggable ?? true;
            if ( draggable )
            {
                LX.makeDraggable( root, options );
            }

            if ( options.resizeable )
            {
                root.classList.add( 'resizeable' );
            }

            if ( options.resize )
            {
                this.splitBar = document.createElement( 'div' );
                let type = ( overlay == 'left' ) || ( overlay == 'right' ) ? 'horizontal' : 'vertical';
                this.type = overlay;
                this.splitBar.className = 'lexsplitbar ' + type;

                if ( overlay == 'right' )
                {
                    this.splitBar.style.width = LX.DEFAULT_SPLITBAR_SIZE + 'px';
                    this.splitBar.style.left = -( LX.DEFAULT_SPLITBAR_SIZE / 2.0 ) + 'px';
                }
                else if ( overlay == 'left' )
                {
                    let size = Math.min( document.body.clientWidth - LX.DEFAULT_SPLITBAR_SIZE, this.root.clientWidth );
                    this.splitBar.style.width = LX.DEFAULT_SPLITBAR_SIZE + 'px';
                    this.splitBar.style.left = size + ( LX.DEFAULT_SPLITBAR_SIZE / 2.0 ) + 'px';
                }
                else if ( overlay == 'top' )
                {
                    let size = Math.min( document.body.clientHeight - LX.DEFAULT_SPLITBAR_SIZE, this.root.clientHeight );
                    this.splitBar.style.height = LX.DEFAULT_SPLITBAR_SIZE + 'px';
                    this.splitBar.style.top = size + ( LX.DEFAULT_SPLITBAR_SIZE / 2.0 ) + 'px';
                }
                else if ( overlay == 'bottom' )
                {
                    this.splitBar.style.height = LX.DEFAULT_SPLITBAR_SIZE + 'px';
                    this.splitBar.style.top = -( LX.DEFAULT_SPLITBAR_SIZE / 2.0 ) + 'px';
                }

                this.splitBar.addEventListener( 'mousedown', innerMouseDown );
                this.root.appendChild( this.splitBar );

                const that = this;
                let lastMousePosition = [ 0, 0 ];

                function innerMouseDown( e: MouseEvent )
                {
                    const doc = that.root.ownerDocument;
                    doc.addEventListener( 'mousemove', innerMouseMove );
                    doc.addEventListener( 'mouseup', innerMouseUp );
                    lastMousePosition[0] = e.x;
                    lastMousePosition[1] = e.y;
                    e.stopPropagation();
                    e.preventDefault();
                    document.body.classList.add( 'nocursor' );
                    that.splitBar.classList.add( 'nocursor' );
                }

                function innerMouseMove( e: MouseEvent )
                {
                    switch ( that.type )
                    {
                        case 'right':
                            var dt = lastMousePosition[0] - e.x;
                            var size: number = that.root.offsetWidth + dt;
                            that.root.style.width = size + 'px';
                            break;
                        case 'left':
                            var dt = lastMousePosition[0] - e.x;
                            var size: number = Math.min( document.body.clientWidth - LX.DEFAULT_SPLITBAR_SIZE, that.root.offsetWidth - dt );
                            that.root.style.width = size + 'px';
                            that.splitBar.style.left = size + LX.DEFAULT_SPLITBAR_SIZE / 2 + 'px';
                            break;
                        case 'top':
                            var dt = lastMousePosition[1] - e.y;
                            var size: number = Math.min( document.body.clientHeight - LX.DEFAULT_SPLITBAR_SIZE, that.root.offsetHeight - dt );
                            that.root.style.height = size + 'px';
                            that.splitBar.style.top = size + LX.DEFAULT_SPLITBAR_SIZE / 2 + 'px';
                            break;
                        case 'bottom':
                            var dt = lastMousePosition[1] - e.y;
                            var size: number = that.root.offsetHeight + dt;
                            that.root.style.height = size + 'px';
                            break;
                    }

                    lastMousePosition[0] = e.x;
                    lastMousePosition[1] = e.y;
                    e.stopPropagation();
                    e.preventDefault();

                    // Resize events
                    if ( that.onresize )
                    {
                        that.onresize( that.root.getBoundingClientRect() );
                    }
                }

                function innerMouseUp( e: MouseEvent )
                {
                    const doc = that.root.ownerDocument;
                    doc.removeEventListener( 'mousemove', innerMouseMove );
                    doc.removeEventListener( 'mouseup', innerMouseUp );
                    document.body.classList.remove( 'nocursor' );
                    that.splitBar.classList.remove( 'nocursor' );
                }
            }
        }
    }

    /**
     * @method attach
     * @param {Element} content child to append to area (e.g. a Panel)
     */

    attach( content: any )
    {
        // Append to last split section if area has been split
        if ( this.sections.length )
        {
            this.sections[1].attach( content );
            return;
        }

        if ( !content )
        {
            throw ( 'no content to attach' );
        }

        content.parent = this;

        let element = content.root ? content.root : content;
        this.root.appendChild( element );
    }

    /**
     * @method setLayout
     * @description Automatically split the area to generate the desired layout
     * @param {Array} layout
     */

    setLayout( layout: any )
    {
        this.layout = LX.deepCopy( layout );

        if ( !layout.splits )
        {
            console.warn( 'Area layout has no splits!' );
            return;
        }

        const _splitArea = ( area: Area, layout: any ) => {
            if ( layout.className )
            {
                area.root.className += ` ${layout.className}`;
            }

            if ( !layout.splits )
            {
                return;
            }

            const type = layout.type ?? 'horizontal';
            const resize = layout.resize ?? true;
            const minimizable = layout.minimizable ?? false;
            const [ splitA, splitB ] = area.split( { type, resize, minimizable, sizes: [ layout.splits[0].size, layout.splits[1].size ] } );

            _splitArea( splitA, layout.splits[0] );
            _splitArea( splitB, layout.splits[1] );
        };

        _splitArea( this, layout );
    }

    /**
     * @method split
     * @param {Object} options
     * type: Split mode (horizontal, vertical) ["horizontal"]
     * sizes: CSS Size of each new area (Array) ["50%", "50%"]
     * resize: Allow area manual resizing [true]
     * sizes: "Allow the area to be minimized [false]
     */

    split( options: any = {} )
    {
        if ( this.sections.length )
        {
            // In case Area has been split before, get 2nd section as root
            this.offset = this.root.childNodes[0].offsetHeight; // store offset to take into account when resizing
            this._root = this.sections[0].root;
            this.root = this.sections[1].root;
        }

        const type = options.type ?? 'horizontal';
        const sizes = options.sizes || [ '50%', '50%' ];
        const auto = ( options.sizes === 'auto' )
            || ( options.sizes && options.sizes[0] == 'auto' && options.sizes[1] == 'auto' );
        const rect = this.root.getBoundingClientRect();

        // Secondary area fills space
        if ( !sizes[1] || ( sizes[0] != 'auto' && sizes[1] == 'auto' ) )
        {
            let size = sizes[0];
            let margin = options.top ? options.top : 0;
            if ( size.constructor == Number )
            {
                size += margin;
                size = `${size}px`;
            }

            sizes[1] = 'calc( 100% - ' + size + ' )';
        }

        let minimizable = options.minimizable ?? false;
        let resize = ( options.resize ?? true ) || minimizable;
        let fixedSize = options.fixedSize ?? !resize;
        let splitbarOffset = 0;
        let primarySize = [];
        let secondarySize = [];

        this.offset = 0;

        if ( resize )
        {
            this.resize = resize;
            this.splitBar = document.createElement( 'div' );
            this.splitBar.className = 'lexsplitbar ' + type;

            if ( type == 'horizontal' )
            {
                this.splitBar.style.width = LX.DEFAULT_SPLITBAR_SIZE + 'px';
            }
            else
            {
                this.splitBar.style.height = LX.DEFAULT_SPLITBAR_SIZE + 'px';
            }

            this.splitBar.addEventListener( 'mousedown', innerMouseDown );

            splitbarOffset = LX.DEFAULT_SPLITBAR_SIZE / 2; // updates
        }

        if ( type == 'horizontal' )
        {
            this.root.style.display = 'flex';

            if ( !fixedSize )
            {
                const parentWidth = rect.width;
                const leftPx = LX.parsePixelSize( sizes[0], parentWidth );
                const rightPx = LX.parsePixelSize( sizes[1], parentWidth );
                const leftPercent = ( leftPx / parentWidth ) * 100;
                const rightPercent = ( rightPx / parentWidth ) * 100;

                // Style using percentages
                primarySize[0] = `calc(${leftPercent}% - ${splitbarOffset}px)`;
                secondarySize[0] = `calc(${rightPercent}% - ${splitbarOffset}px)`;
            }
            else
            {
                primarySize[0] = `calc(${sizes[0]} - ${splitbarOffset}px)`;
                secondarySize[0] = `calc(${sizes[1]} - ${splitbarOffset}px)`;
            }

            primarySize[1] = '100%';
            secondarySize[1] = '100%';
        }
        // vertical
        else
        {
            if ( auto )
            {
                primarySize[1] = 'auto';
                secondarySize[1] = 'auto';
            }
            else if ( !fixedSize )
            {
                const parentHeight = rect.height;
                const topPx = LX.parsePixelSize( sizes[0], parentHeight );
                const bottomPx = LX.parsePixelSize( sizes[1], parentHeight );
                const topPercent = ( topPx / parentHeight ) * 100;
                const bottomPercent = ( bottomPx / parentHeight ) * 100;

                primarySize[1] = sizes[0] == 'auto' ? 'auto' : `calc(${topPercent}% - ${splitbarOffset}px)`;
                secondarySize[1] = sizes[1] == 'auto' ? 'auto' : `calc(${bottomPercent}% - ${splitbarOffset}px)`;
            }
            else
            {
                primarySize[1] = sizes[0] == 'auto' ? 'auto' : `calc(${sizes[0]} - ${splitbarOffset}px)`;
                secondarySize[1] = sizes[1] == 'auto' ? 'auto' : `calc(${sizes[1]} - ${splitbarOffset}px)`;
            }

            primarySize[0] = '100%';
            secondarySize[0] = '100%';
        }

        // Create areas
        let area1 = new Area( { width: primarySize[0], height: primarySize[1], skipAppend: true,
            className: 'split' + ( options.menubar || options.sidebar ? '' : ' origin' ) } );
        let area2 = new Area( { width: secondarySize[0], height: secondarySize[1], skipAppend: true, className: 'split' } );

        /*
            If the parent area is not in the DOM, we need to wait for the resize event to get the its correct size
            and set the sizes of the split areas accordingly.
        */
        if ( !fixedSize && ( !rect.width || !rect.height ) )
        {
            const observer = new ResizeObserver( ( entries ) => {
                console.assert( entries.length == 1, 'AreaResizeObserver: more than one entry' );

                const rect = entries[0].contentRect;
                if ( !rect.width || !rect.height )
                {
                    return;
                }

                this._update( [ rect.width, rect.height ], false );

                // On auto splits, we only need to set the size of the parent area
                if ( !auto )
                {
                    if ( type == 'horizontal' )
                    {
                        const parentWidth = rect.width;
                        const leftPx = LX.parsePixelSize( sizes[0], parentWidth );
                        const rightPx = LX.parsePixelSize( sizes[1], parentWidth );
                        const leftPercent = ( leftPx / parentWidth ) * 100;
                        const rightPercent = ( rightPx / parentWidth ) * 100;

                        // Style using percentages
                        primarySize[0] = `calc(${leftPercent}% - ${splitbarOffset}px)`;
                        secondarySize[0] = `calc(${rightPercent}% - ${splitbarOffset}px)`;
                    }
                    // vertical
                    else
                    {
                        const parentHeight = rect.height;
                        const topPx = LX.parsePixelSize( sizes[0], parentHeight );
                        const bottomPx = LX.parsePixelSize( sizes[1], parentHeight );
                        const topPercent = ( topPx / parentHeight ) * 100;
                        const bottomPercent = ( bottomPx / parentHeight ) * 100;

                        primarySize[1] = sizes[0] == 'auto' ? 'auto' : `calc(${topPercent}% - ${splitbarOffset}px)`;
                        secondarySize[1] = sizes[1] == 'auto'
                            ? 'auto'
                            : `calc(${bottomPercent}% - ${splitbarOffset}px)`;
                    }

                    area1.root.style.width = primarySize[0];
                    area1.root.style.height = primarySize[1];

                    area2.root.style.width = secondarySize[0];
                    area2.root.style.height = secondarySize[1];
                }

                area1._update();
                area2._update();

                // Stop observing
                observer.disconnect();
            } );

            // Observe the parent area until the DOM is ready
            // and the size is set correctly.
            LX.doAsync( () => {
                observer.observe( this.root );
            }, 100 );
        }

        if ( auto && type == 'vertical' )
        {
            // Listen resize event on first area
            this._autoVerticalResizeObserver = new ResizeObserver( ( entries ) => {
                for ( const entry of entries )
                {
                    const size = LX.getComputedSize( entry.target );
                    area2.root.style.height = 'calc(100% - ' + ( size.height ) + 'px )';
                }
            } );

            this._autoVerticalResizeObserver.observe( area1.root );
        }

        // Being minimizable means it's also resizeable!
        if ( resize && minimizable )
        {
            this.splitExtended = false;

            // Keep state of the animation when ends...
            area2.root.addEventListener( 'animationend', ( e: any ) => {
                const opacity = getComputedStyle( area2.root ).opacity;
                area2.root.classList.remove( e.animationName + '-' + type );
                area2.root.style.opacity = opacity;
                LX.flushCss( area2.root );
            } );

            this.splitBar.addEventListener( 'contextmenu', ( e: any ) => {
                e.preventDefault();
                LX.addContextMenu( null, e, ( c: ContextMenu ) => {
                    c.add( 'Extend', { disabled: this.splitExtended, callback: () => {
                        this.extend();
                    } } );
                    c.add( 'Reduce', { disabled: !this.splitExtended, callback: () => {
                        this.reduce();
                    } } );
                } );
            } );
        }

        area1.parentArea = this;
        area2.parentArea = this;

        this.root.appendChild( area1.root );

        if ( resize )
        {
            this.root.appendChild( this.splitBar );
        }

        this.root.appendChild( area2.root );

        this.sections = [ area1, area2 ];
        this.type = type;

        // Update sizes
        this._update( rect.width || rect.height ? [ rect.width, rect.height ] : undefined );

        if ( !resize )
        {
            return this.sections;
        }

        const that = this;

        function innerMouseDown( e: MouseEvent )
        {
            const doc = that.root.ownerDocument;
            doc.addEventListener( 'mousemove', innerMouseMove );
            doc.addEventListener( 'mouseup', innerMouseUp );
            e.stopPropagation();
            e.preventDefault();
        }

        function innerMouseMove( e: MouseEvent )
        {
            const rect = that.root.getBoundingClientRect();
            if ( ( ( e.x ) < rect.x || ( e.x ) > ( rect.x + rect.width ) )
                || ( ( e.y ) < rect.y || ( e.y ) > ( rect.y + rect.height ) ) )
            {
                return;
            }

            if ( that.type == 'horizontal' )
            {
                that._moveSplit( -e.movementX );
            }
            else
            {
                that._moveSplit( -e.movementY );
            }

            e.stopPropagation();
            e.preventDefault();
        }

        function innerMouseUp( e: MouseEvent )
        {
            const doc = that.root.ownerDocument;
            doc.removeEventListener( 'mousemove', innerMouseMove );
            doc.removeEventListener( 'mouseup', innerMouseUp );
        }

        return this.sections;
    }

    /**
     * @method setLimitBox
     * Set min max for width and height
     */
    setLimitBox( minw = 0, minh = 0, maxw = Infinity, maxh = Infinity )
    {
        this.minWidth = minw;
        this.minHeight = minh;
        this.maxWidth = maxw;
        this.maxHeight = maxh;

        if ( minw != 0 ) this.root.style.minWidth = `${minw}px`;
        if ( minh != 0 ) this.root.style.minHeight = `${minh}px`;
        if ( maxw != Infinity ) this.root.style.maxWidth = `${maxw}px`;
        if ( maxh != Infinity ) this.root.style.maxHeight = `${maxh}px`;
    }

    /**
     * @method resize
     * Resize element
     */
    setSize( size: any[] )
    {
        let [ width, height ] = size;

        if ( width != undefined && width.constructor == Number )
        {
            width = `${width}px`;
        }

        if ( height != undefined && height.constructor == Number )
        {
            height = `${height}px`;
        }

        if ( width )
        {
            this.root.style.width = width;
        }

        if ( height )
        {
            this.root.style.height = height;
        }

        if ( this.onresize )
        {
            this.onresize( this.root.getBoundingClientRect() );
        }

        LX.doAsync( () => {
            this.size = [ this.root.clientWidth, this.root.clientHeight ];
            this.propagateEvent( 'onresize' );
        }, 150 );
    }

    /**
     * @method extend
     * Hide 2nd area split
     */
    extend()
    {
        if ( this.splitExtended )
        {
            return;
        }

        let [ area1, area2 ] = this.sections;
        this.splitExtended = true;

        area1.root.classList.add( `maximize-${this.type}` );
        area2.root.classList.add( `minimize-${this.type}` );
        area2.root.classList.add( `fadeout-${this.type}` );
        area2.root.classList.remove( `fadein-${this.type}` );

        if ( this.type == 'vertical' )
        {
            this.offset = area2.root.offsetHeight;
            this._moveSplit( -Infinity, true );
        }
        else
        {
            this.offset = area2.root.offsetWidth - 8; // Force some height here...
            this._moveSplit( -Infinity, true, 8 );
        }

        LX.doAsync( () => {
            this.propagateEvent( 'onresize' );
        }, 100 );
    }

    /**
     * @method reduce
     * Show 2nd area split
     */
    reduce()
    {
        if ( !this.splitExtended )
        {
            return;
        }

        this.splitExtended = false;

        let [ area1, area2 ] = this.sections;

        area1.root.classList.add( `minimize-${this.type}` );
        area2.root.classList.add( `maximize-${this.type}` );
        area2.root.classList.add( `fadein-${this.type}` );
        area2.root.classList.remove( `fadeout-${this.type}` );

        this._moveSplit( this.offset );

        LX.doAsync( () => {
            this.propagateEvent( 'onresize' );
        }, 100 );
    }

    /**
     * @method hide
     * Hide element
     */
    hide()
    {
        this.root.classList.add( 'hidden' );
    }

    /**
     * @method show
     * Show element if it is hidden
     */
    show()
    {
        this.root.classList.remove( 'hidden' );
    }

    /**
     * @method toggle
     * Toggle element if it is hidden
     */
    toggle( force: boolean )
    {
        this.root.classList.toggle( 'hidden', force );
    }

    /**
     * @method propagateEvent
     */

    propagateEvent( eventName: string )
    {
        for ( let i = 0; i < this.sections.length; i++ )
        {
            const area = this.sections[i];

            if ( area[eventName] )
            {
                area[eventName].call( this, area.root.getBoundingClientRect() );
            }

            area.propagateEvent( eventName );
        }
    }

    /**
     * @method addPanel
     * @param {Object} options
     * Options to create a Panel
     */

    addPanel( options: any )
    {
        let panel = new Panel( options );
        this.attach( panel );
        this.panels.push( panel );
        return panel;
    }

    /**
     * @method addMenubar
     * @param {Array} items Items to fill the menubar
     * @param {Object} options:
     * float: Justify content (left, center, right) [left]
     * sticky: Fix menubar at the top [true]
     */

    addMenubar( items: any[], options: any = {} )
    {
        let menubar = new Menubar( items, options );

        LX.menubars.push( menubar );

        const [ bar, content ] = this.split( { type: 'vertical', sizes: [ '48px', null ], resize: false, menubar: true } );
        menubar.siblingArea = content;

        bar.attach( menubar );
        bar.isMenubar = true;

        if ( options.sticky ?? true )
        {
            bar.root.className += ' sticky top-0 z-100';
        }

        if ( options.parentClass )
        {
            bar.root.className = LX.mergeClass( bar.root.className, options.parentClass );
        }

        return menubar;
    }

    /**
     * @method addSidebar
     * @param {Function} callback Function to fill the sidebar
     * @param {Object} options: Sidebar options
     * width: Width of the sidebar [16rem]
     * side: Side to attach the sidebar (left|right) [left]
     */

    addSidebar( callback: any, options: any = {} )
    {
        let sidebar = new LX.Sidebar( { callback, ...options } );

        if ( callback )
        {
            callback( sidebar );
        }

        // Generate DOM elements after adding all entries
        sidebar.update();

        LX.sidebars.push( sidebar );

        const side = options.side ?? 'left';
        console.assert( side == 'left' || side == 'right', 'Invalid sidebar side: ' + side );
        const leftSidebar = side == 'left';

        const width = options.width ?? '16rem';
        const sizes = leftSidebar ? [ width, null ] : [ null, width ];
        const [ left, right ] = this.split( { type: 'horizontal', sizes, resize: false, sidebar: true } );
        sidebar.siblingArea = leftSidebar ? right : left;

        let bar = leftSidebar ? left : right;
        bar.attach( sidebar );
        bar.isSidebar = true;

        if ( options.parentClass )
        {
            bar.root.className = LX.mergeClass( bar.root.className, options.parentClass );
        }

        return sidebar;
    }

    /**
     * @method addOverlayButtons
     * @param {Array} buttons Buttons info
     * @param {Object} options:
     * float: Where to put the buttons (h: horizontal, v: vertical, t: top, m: middle, b: bottom, l: left, c: center, r: right) [htc]
     */

    addOverlayButtons( buttons: any[], options: any = {} )
    {
        // Add to last split section if area has been split
        if ( this.sections.length )
        {
            return this.sections[1].addOverlayButtons( buttons, options );
        }

        console.assert( buttons.constructor == Array && buttons.length !== 0 );

        // Set area to relative to use local position
        this.root.style.position = 'relative';

        // Reset if already exists
        this.overlayButtons = new AreaOverlayButtons( this, buttons, options );

        return this.overlayButtons;
    }

    /**
     * @method addTabs
     * @param {Object} options:
     * parentClass: Add extra class to tab buttons container
     */

    addTabs( options: any = {} )
    {
        const tabs = new Tabs( this, options );

        if ( options.folding )
        {
            this.parentArea?._disableSplitResize();
            // Compensate split bar...
            this.root.style.paddingTop = '4px';
        }

        return tabs;
    }

    _moveSplit( dt: number, forceAnimation: boolean = false, forceWidth: number = 0 )
    {
        if ( !this.type )
        {
            throw ( 'No split area' );
        }

        if ( dt === undefined )
        { // Splitbar didn't move!
            return;
        }

        // When manual resizing, we don't need the observer anymore
        if ( this._autoVerticalResizeObserver )
        {
            this._autoVerticalResizeObserver.disconnect();
        }

        const a1 = this.sections[0];
        var a1Root = a1.root;

        if ( !a1Root.classList.contains( 'origin' ) )
        {
            a1Root = a1Root.parentElement;
        }

        const a2 = this.sections[1];
        const a2Root = a2.root;
        const splitData = '- ' + LX.DEFAULT_SPLITBAR_SIZE + 'px';

        let transition = null;
        if ( !forceAnimation )
        {
            // Remove transitions for this change..
            transition = a1Root.style.transition;
            a1Root.style.transition = a2Root.style.transition = 'none';
            // LX.flushCss( a1Root );
        }

        if ( this.type == 'horizontal' )
        {
            var size = Math.max( a2Root.offsetWidth + dt, parseInt( a2.minWidth ) );
            if ( forceWidth ) size = forceWidth;

            const parentWidth = this.size[0];
            const rightPercent = ( size / parentWidth ) * 100;
            const leftPercent = Math.max( 0, 100 - rightPercent );

            a1Root.style.width = `-moz-calc(${leftPercent}% ${splitData})`;
            a1Root.style.width = `-webkit-calc( ${leftPercent}% ${splitData})`;
            a1Root.style.width = `calc( ${leftPercent}% ${splitData})`;
            a2Root.style.width = `${rightPercent}%`;
            a2Root.style.width = `${rightPercent}%`;
            a2Root.style.width = `${rightPercent}%`;

            if ( a1.maxWidth != Infinity )
            {
                a2Root.style.minWidth = `calc( 100% - ${parseInt( a1.maxWidth )}px )`;
            }
        }
        else
        {
            const parentHeight = this.size[1];
            var size = Math.max( ( a2Root.offsetHeight + dt ) + a2.offset, parseInt( a2.minHeight ) );
            size = Math.min( parentHeight - LX.DEFAULT_SPLITBAR_SIZE, size );
            if ( forceWidth ) size = forceWidth;

            const bottomPercent = ( size / parentHeight ) * 100;
            const topPercent = Math.max( 0, 100 - bottomPercent );

            a1Root.style.height = `-moz-calc(${topPercent}% ${splitData})`;
            a1Root.style.height = `-webkit-calc( ${topPercent}% ${splitData})`;
            a1Root.style.height = `calc( ${topPercent}% ${splitData})`;
            a2Root.style.height = `${bottomPercent}%`;
            a2Root.style.height = `${bottomPercent}%`;
            a2Root.style.height = `${bottomPercent}%`;

            if ( a1.maxHeight != Infinity )
            {
                a2Root.style.minHeight = `calc( 100% - ${parseInt( a1.maxHeight )}px )`;
            }
        }

        if ( !forceAnimation )
        {
            // Reapply transitions
            a1Root.style.transition = a2Root.style.transition = transition;
        }

        LX.doAsync( () => {
            this._update();
            this.propagateEvent( 'onresize' );
        }, 10 );
    }

    _disableSplitResize()
    {
        this.resize = false;
        this.splitBar.remove();
        delete this.splitBar;
    }

    _update( newSize?: any[], propagate: boolean = true )
    {
        if ( !newSize )
        {
            const rect = this.root.getBoundingClientRect();
            this.size = [ rect.width, rect.height ];
        }
        else
        {
            this.size = newSize;
        }

        if ( propagate )
        {
            for ( var i = 0; i < this.sections.length; i++ )
            {
                this.sections[i]._update();
            }
        }
    }
}

LX.Area = Area;
