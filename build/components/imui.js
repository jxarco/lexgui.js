import { LX } from 'lexgui';

if(!LX) {
    throw("lexgui.js missing!");
}

LX.components.push( 'ImUI' );

function swapElements (obj, a, b) {
    [obj[a], obj[b]] = [obj[b], obj[a]];
}

function swapArrayElements (array, id0, id1) {
    [array[id0], array[id1]] = [array[id1], array[id0]];
};

/**
 * @class ImUI
 */

class ImUI {

    /**
     * @param {*} options
     * 
     */

    constructor( canvas, options = {} ) {

        console.assert( canvas );
        
        // To capture key events
        canvas.tabIndex = -1;
        
        canvas.addEventListener( 'keydown', this._processKey.bind(this), true);
        canvas.addEventListener( 'mousedown', this._processMouse.bind(this) );
        canvas.addEventListener( 'mouseup', this._processMouse.bind(this) );
        canvas.addEventListener( 'mousemove', this._processMouse.bind(this) );
        canvas.addEventListener( 'click', this._processMouse.bind(this) );
        
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

        // Widgets

        this.widgets = { };

        // Mouse state

        this.mousePosition = new LX.vec2();

        this.root = this.canvas = canvas;
    }

    _processKey(e) {

        var key = e.key ?? e.detail.key;
        console.log( key );
    }

    _processMouse(e) {

        if( e.type == 'mousedown' )
        {
            this.mouseDown = true;
        }
        
        else if( e.type == 'mouseup' )
        {
            this._processClick(e);
            this.mouseDown = false;
        }

        else if( e.type == 'mousemove' )
        {
            this.mousePosition.set( e.clientX, e.clientY );
        }
    }

    _processClick( e ) {

        this.eventClick = e;
    }

    /**
     * @method Button
     * @param {String} text
     * @param {Number} x
     * @param {Number} y
     */

    Button( text, x, y, callback ) {

        const ctx = this.canvas.getContext("2d");

        // Element properties

        let fontSize = 16;
        ctx.font = fontSize + "px Arial";

        let padding = new LX.vec2( 12, 8 );
        let position = new LX.vec2( x, y );

        const metrics = ctx.measureText( text );
        let size = new LX.vec2( metrics.width, metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent );

        // Get mouse state

        const hovered = this.mousePosition.x >= position.x && this.mousePosition.x <= (position.x + size.x + padding.x * 2.0)
        && this.mousePosition.y >= position.y && this.mousePosition.y <= (position.y + size.y + padding.y * 2.0);

        const active = hovered && this.mouseDown;

        // Draw button

        ctx.fillStyle = active ? "#666" : (hovered ? "#444" : "#222");
        ctx.fillRect( position.x, position.y, size.x + padding.x * 2.0, size.y + padding.y * 2.0 );

        // Draw text

        ctx.fillStyle = hovered ? "#fff" : "#ddd";
        ctx.fillText( text, position.x + padding.x, position.y + metrics.actualBoundingBoxAscent + padding.y );

        if( !hovered )
        {
            document.body.style.cursor = "default";
            return false;
        }

        // Pointer cursor on hover
        document.body.style.cursor = "pointer";

        if( this.eventClick )
        {
            if(callback) callback();
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

    Slider( text, x, y, value = 0, callback ) {

        const ctx = this.canvas.getContext("2d");

        // Store slider value
        
        if(!this.widgets[ text ])
            this.widgets[ text ] = { value: value };
        else
            value = this.widgets[ text ].value;

        // Element properties

        let fontSize = 16;
        ctx.font = fontSize + "px Arial";

        let padding = new LX.vec2( 12, 8 );
        let position = new LX.vec2( x, y );

        const metrics = ctx.measureText( text );
        let size = new LX.vec2( metrics.width, metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent );

        // Get mouse state

        const hovered = this.mousePosition.x >= position.x && this.mousePosition.x <= (position.x + size.x + padding.x * 2.0)
        && this.mousePosition.y >= position.y && this.mousePosition.y <= (position.y + size.y + padding.y * 2.0);

        const active = hovered && this.mouseDown;

        // Draw box

        ctx.fillStyle = hovered ? "#444" : "#222";
        ctx.fillRect( position.x, position.y, size.x + padding.x * 2.0, size.y + padding.y * 2.0 );

        // Draw thumb

        let thumbSize = new LX.vec2( 12, size.y );

        const min = position.x;
        const max = position.x + size.x + padding.x * 2.0 - thumbSize.x;

        if(active)
        {
            value = LX.UTILS.clamp((this.mousePosition.x - min - thumbSize.x * 0.5) / (max - min), 0.0, 1.0);
            this.widgets[ text ].value = value;
        }
        
        let thumbPos = new LX.vec2( min + (max - position.x) * value, position.y );

        ctx.fillStyle = active ? "#bbb" : (hovered ? "#777" : "#888");
        ctx.fillRect( thumbPos.x, thumbPos.y, thumbSize.x, thumbSize.y + padding.y * 2.0 );

        // Draw text

        ctx.fillStyle = hovered ? "#fff" : "#ddd";
        ctx.fillText( text, position.x + padding.x, position.y + metrics.actualBoundingBoxAscent + padding.y );

        if( !hovered )
        {
            document.body.style.cursor = "default";
            return;
        }

        // Pointer cursor on hover
        document.body.style.cursor = "pointer";

        if( active )
        {
            if(callback) callback( value );
        }
    }

    /**
     * @method Checkbox
     * @param {String} text
     * @param {Number} x
     * @param {Number} y
     * @param {Number} value
     */

    Checkbox( text, x, y, value = false, callback ) {

        const ctx = this.canvas.getContext("2d");

        // Store slider value
        
        if(!this.widgets[ text ])
            this.widgets[ text ] = { value: value };
        else
            value = this.widgets[ text ].value;

        // Element properties

        let fontSize = 16;
        ctx.font = fontSize + "px Arial";

        let padding = new LX.vec2( 12, 8 );
        let position = new LX.vec2( x, y );

        const metrics = ctx.measureText( text );
        let size = new LX.vec2( metrics.width, metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent );

        let boxMargin = 12;
        let fullSize = new LX.vec2(boxMargin * 2.0, 0);
        fullSize.add( size );

        // Get mouse state

        const boxStartX = position.x + size.x + padding.x + boxMargin;
        const boxStartY = position.y + padding.y;
        const hovered = this.mousePosition.x >= boxStartX && this.mousePosition.x <= (boxStartX + size.y)
        && this.mousePosition.y >= boxStartY && this.mousePosition.y <= (boxStartY + size.y);

        const active = hovered && this.mouseDown;
        const pressed = hovered && this.eventClick;

        // Draw button

        ctx.fillStyle = active ? "#666" : (hovered ? "#444" : "#222");
        ctx.fillRect( position.x, position.y, fullSize.x + padding.x * 2.0, fullSize.y + padding.y * 2.0 );

        // Draw checkbox

        if( pressed )
        {
            value = !value;
            this.widgets[ text ].value = value;
            if(callback) callback( value );
        }

        ctx.fillStyle = value ? (active ? "#ddd" : (hovered ? "#6074e7" : "#3e57e4")) : 
                            (active ? "#bbb" : (hovered ? "#777" : "#888"));
        ctx.fillRect( position.x + size.x + padding.x + boxMargin, position.y + padding.y, size.y, size.y );

        // Draw text

        ctx.fillStyle = hovered ? "#fff" : "#ddd";
        ctx.fillText( text, position.x + padding.x, position.y + metrics.actualBoundingBoxAscent + padding.y );

        // Pointer cursor on hover
        document.body.style.cursor = hovered ? "pointer" : "default";
    }

    /**
     * @method endFrame
     * @description Clears the information stored during the last frame
     */

    endFrame() {

        this.eventClick = null;

    }
}

LX.ImUI = ImUI;

export { ImUI };