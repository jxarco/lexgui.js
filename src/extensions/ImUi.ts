// ImUI.ts @jxarco

import { LX } from '../core/Namespace';

if ( !LX )
{
    throw ( 'Missing LX namespace!' );
}

LX.extensions.push( 'ImUI' );

const vec2 = LX.vec2;

/**
 * @class ImUI
 */

export class ImUI
{
    root: any;
    canvas: any;

    // Components
    components: any = {};

    // Mouse state
    mouseDown: boolean = false;
    mousePosition: typeof vec2 = new vec2();
    usePointerCursor: boolean = false;
    eventClick: MouseEvent | undefined = undefined;

    constructor( canvas: HTMLCanvasElement, options: any = {} )
    {
        console.assert( canvas !== undefined );

        // To capture key events
        canvas.tabIndex = -1;

        canvas.addEventListener( 'keydown', this._processKey.bind( this ), true );
        canvas.addEventListener( 'mousedown', this._processMouse.bind( this ) );
        canvas.addEventListener( 'mouseup', this._processMouse.bind( this ) );
        canvas.addEventListener( 'mousemove', this._processMouse.bind( this ) );
        canvas.addEventListener( 'click', this._processMouse.bind( this ) );

        // this.font = new FontFace("Ubuntu", "url(../data/Ubuntu-Bold.ttf)");
        // this.font.load().then(
        //     ( font ) => {
        //         document.fonts.add( font );
        //         if( options.onready ) options.onready();
        //     },
        //     (err) => {
        //         console.error(err);
        //     },
        // );

        this.root = this.canvas = canvas;
    }

    _processKey( e: KeyboardEvent )
    {
        const detail: any = e.detail;
        const key = e.key ?? detail.key;
        console.log( key );
    }

    _processMouse( e: MouseEvent )
    {
        if ( e.type == 'mousedown' )
        {
            this.mouseDown = true;
        }
        else if ( e.type == 'mouseup' )
        {
            this._processClick( e );
            this.mouseDown = false;
        }
        else if ( e.type == 'mousemove' )
        {
            this.mousePosition.set( e.clientX, e.clientY );
        }
    }

    _processClick( e: MouseEvent )
    {
        this.eventClick = e;
    }

    /**
     * @method Button
     * @param {String} text
     * @param {Number} x
     * @param {Number} y
     */

    Button( text: string, x: number, y: number, callback: any )
    {
        const ctx = this.canvas.getContext( '2d' );

        // Element properties

        let fontSize = 16;
        ctx.font = fontSize + 'px Arial';

        let padding = new LX.vec2( 12, 8 );
        let position = new LX.vec2( x, y );

        const metrics = ctx.measureText( text );
        let size = new LX.vec2( metrics.width, metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent );

        // Get mouse state

        const hovered = this.mousePosition.x >= position.x
            && this.mousePosition.x <= ( position.x + size.x + padding.x * 2.0 )
            && this.mousePosition.y >= position.y && this.mousePosition.y <= ( position.y + size.y + padding.y * 2.0 );

        const active = hovered && this.mouseDown;

        // Draw button

        ctx.beginPath();
        ctx.fillStyle = active ? '#666' : ( hovered ? '#444' : '#222' );
        ctx.roundRect( position.x, position.y, size.x + padding.x * 2.0, size.y + padding.y * 2.0, [ 8, 8, 8, 8 ] );
        ctx.fill();

        // Draw text

        ctx.fillStyle = hovered ? '#fff' : '#ddd';
        ctx.fillText( text, position.x + padding.x, position.y + metrics.actualBoundingBoxAscent + padding.y );

        this.usePointerCursor = this.usePointerCursor || hovered;

        if ( this.eventClick )
        {
            if ( callback ) callback();
            return true;
        }

        return false;
    }

    /**
     * @method Slider
     * @param {String} text
     * @param {Number} x
     * @param {Number} y
     * @param {Number} value
     */

    Slider( text: string, x: number, y: number, value: number = 0, callback: any )
    {
        const ctx = this.canvas.getContext( '2d' );

        // Store slider value

        if ( !this.components[text] )
        {
            this.components[text] = { value: value };
        }
        else
        {
            value = this.components[text].value;
        }

        // Element properties

        let fontSize = 16;
        ctx.font = fontSize + 'px Arial';

        let padding = new LX.vec2( 12, 8 );
        let position = new LX.vec2( x, y );

        const metrics = ctx.measureText( text );
        let size = new LX.vec2( metrics.width, metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent );
        let fullSize = size.add( padding.mul( 2.0 ) );

        // Get mouse state

        const hovered = this.mousePosition.x >= position.x && this.mousePosition.x <= ( position.x + fullSize.x )
            && this.mousePosition.y >= position.y && this.mousePosition.y <= ( position.y + fullSize.y );

        const active = hovered && this.mouseDown;

        // Draw box

        ctx.beginPath();
        ctx.fillStyle = hovered ? '#444' : '#222';
        ctx.roundRect( position.x, position.y, fullSize.x, fullSize.y, [ 8, 8, 8, 8 ] );
        ctx.fill();

        // Draw value

        const min = position.x;
        const max = position.x + fullSize.x;

        if ( active )
        {
            value = LX.clamp( ( this.mousePosition.x - min ) / ( max - min ), 0.0, 1.0 );
            this.components[text].value = value;
        }

        let valueSize = new LX.vec2( fullSize.x * value, size.y );

        ctx.beginPath();
        ctx.fillStyle = hovered ? '#6074e7' : '#3e57e4';
        if ( valueSize.x > ( fullSize.x - 8 ) )
        { // 8: radius
            ctx.roundRect( position.x, position.y, valueSize.x, valueSize.y + padding.y * 2.0, [ 8, 8, 8, 8 ] );
            ctx.fill();
        }
        else
        {
            ctx.fillRect( position.x, position.y, valueSize.x, valueSize.y + padding.y * 2.0 );
        }

        // Draw text

        ctx.fillStyle = hovered ? '#fff' : '#ddd';
        ctx.fillText( text, position.x + padding.x, position.y + metrics.actualBoundingBoxAscent + padding.y );

        this.usePointerCursor = this.usePointerCursor || hovered;

        if ( active )
        {
            if ( callback ) callback( value );
        }
    }

    /**
     * @method Checkbox
     * @param {String} text
     * @param {Number} x
     * @param {Number} y
     * @param {Number} value
     */

    Checkbox( text: string, x: number, y: number, value: boolean = false, callback: any )
    {
        const ctx = this.canvas.getContext( '2d' );

        // Store slider value

        if ( !this.components[text] )
        {
            this.components[text] = { value: value };
        }
        else
        {
            value = this.components[text].value;
        }

        // Element properties

        let fontSize = 16;
        ctx.font = fontSize + 'px Arial';

        let padding = new LX.vec2( 12, 8 );
        let position = new LX.vec2( x, y );

        const metrics = ctx.measureText( text );
        let size = new LX.vec2( metrics.width, metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent );

        let boxMargin = 12;
        let fullSize = new LX.vec2( boxMargin * 2.0, 0 );
        fullSize.add( size, fullSize );

        // Get mouse state

        const boxStartX = position.x + size.x + padding.x + boxMargin;
        const boxStartY = position.y + padding.y;
        const hovered = this.mousePosition.x >= boxStartX && this.mousePosition.x <= ( boxStartX + size.y )
            && this.mousePosition.y >= boxStartY && this.mousePosition.y <= ( boxStartY + size.y );

        const active = hovered && this.mouseDown;
        const pressed = hovered && this.eventClick;

        // Draw button

        ctx.fillStyle = active ? '#666' : ( hovered ? '#444' : '#222' );
        ctx.fillRect( position.x, position.y, fullSize.x + padding.x * 2.0, fullSize.y + padding.y * 2.0 );

        // Draw checkbox

        if ( pressed )
        {
            value = !value;
            this.components[text].value = value;
            if ( callback )
            {
                callback( value );
            }
        }

        ctx.fillStyle = value
            ? ( active ? '#ddd' : ( hovered ? '#6074e7' : '#3e57e4' ) )
            : ( active ? '#bbb' : ( hovered ? '#777' : '#888' ) );
        ctx.fillRect( position.x + size.x + padding.x + boxMargin, position.y + padding.y, size.y, size.y );

        // Draw text

        ctx.fillStyle = hovered ? '#fff' : '#ddd';
        ctx.fillText( text, position.x + padding.x, position.y + metrics.actualBoundingBoxAscent + padding.y );

        this.usePointerCursor = this.usePointerCursor || hovered;
    }

    /**
     * @method endFrame
     * @description Clears the information stored during the last frame
     */

    endFrame()
    {
        delete this.eventClick;

        // Pointer cursor on hover
        document.body.style.cursor = this.usePointerCursor ? 'pointer' : 'default';

        // Clear info
        this.usePointerCursor = false;
    }
}

LX.ImUI = ImUI;
