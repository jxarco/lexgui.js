import { LX } from 'lexgui';

if( !LX )
{
    throw("lexgui.js missing!");
}

LX.extensions.push( 'Audio' );

/**
 * @class Knob
 * @description Knob Widget
 */

class Knob extends LX.Widget {

    constructor( name, value, min, max, callback, options = {} ) {

        if( value.constructor == Number )
        {
            value = LX.clamp( value, min, max );
            value = options.precision ? LX.round( value, options.precision ) : value;
        }

        super( LX.Widget.KNOB, name, value, options );

        this.onGetValue = () => {
            return innerKnobCircle.value;
        };

        this.onSetValue = ( newValue, skipCallback ) => {
            innerSetValue( newValue );
            LX.Widget._dispatchEvent( innerKnobCircle, "change", skipCallback );
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        const snapEnabled = ( options.snap && options.snap.constructor == Number );
        const ticks = [];
        if( snapEnabled )
        {
            const range = (max - min) / options.snap;
            for( let i = 0; i < ( options.snap + 1 ); ++i )
            {
                ticks.push( min + (i  * range) );
            }
        }

        var container = document.createElement( 'div' );
        container.className = "lexknob";
        container.addClass( options.size );
        container.addClass( snapEnabled ? "show-ticks" : null );

        let knobCircle = document.createElement( 'div' );
        knobCircle.className = "knobcircle";
        if( snapEnabled )
        {
            knobCircle.style.setProperty( "--knob-snap-mark", ( 270 / options.snap ) + "deg" );
        }

        let innerKnobCircle = document.createElement( 'div' );
        innerKnobCircle.className = "innerknobcircle";
        innerKnobCircle.min = min;
        innerKnobCircle.max = max;
        knobCircle.appendChild( innerKnobCircle );

        let knobMarker = document.createElement( 'div' );
        knobMarker.className = "knobmarker";
        innerKnobCircle.appendChild( knobMarker );
        innerKnobCircle.value = innerKnobCircle.iValue = value;

        let mustSnap = false;
        let innerSetValue = function( v ) {
            // Convert val between (-135 and 135)
            const angle = LX.remapRange( v, innerKnobCircle.min, innerKnobCircle.max, -135.0, 135.0 );
            innerKnobCircle.style.rotate = angle + 'deg';
            innerKnobCircle.value = v;
        }

        const angle = LX.remapRange( value, min, max, -135.0, 135.0 );
        innerKnobCircle.style.rotate = angle + 'deg';

        if( options.disabled )
        {
            container.addClass( "disabled" );
        }

        innerKnobCircle.addEventListener( "change", e => {

            const knob = e.target;

            const skipCallback = e.detail;

            if( mustSnap )
            {
                knob.value = ticks.reduce(( prev, curr ) => Math.abs( curr - knob.value ) < Math.abs( prev - knob.value ) ? curr : prev );
            }

            let val = knob.value = LX.clamp( knob.value, knob.min, knob.max );
            val = options.precision ? LX.round( val, options.precision ) : val;

            innerSetValue( val );

            // Reset button (default value)
            if( !skipCallback )
            {
                let btn = this.root.querySelector( ".lexwidgetname .lexicon" );
                if( btn ) btn.style.display = val != innerKnobCircle.iValue ? "block": "none";

                if( !( snapEnabled && !mustSnap ) )
                {
                    this._trigger( new LX.IEvent( name, val, e ), callback );
                    mustSnap = false;
                }
            }

        }, { passive: false });

        // Add drag input

        innerKnobCircle.addEventListener( "mousedown", inner_mousedown );

        var that = this;

        function inner_mousedown( e ) {

            if( document.activeElement == innerKnobCircle || options.disabled )
            {
                return;
            }

            var doc = that.root.ownerDocument;
            doc.addEventListener("mousemove",inner_mousemove);
            doc.addEventListener("mouseup",inner_mouseup);
            document.body.classList.add('noevents');

            if( !document.pointerLockElement )
            {
                container.requestPointerLock();
            }

            e.stopImmediatePropagation();
            e.stopPropagation();
        }

        function inner_mousemove( e ) {

            let dt = -e.movementY;

            if ( dt != 0 )
            {
                let mult = options.step ?? 1;
                if(e.shiftKey) mult *= 10;
                else if(e.altKey) mult *= 0.1;
                let new_value = (innerKnobCircle.value - mult * dt);
                innerKnobCircle.value = new_value;
                LX.Widget._dispatchEvent( innerKnobCircle, 'change' );
            }

            e.stopPropagation();
            e.preventDefault();
        }

        function inner_mouseup( e ) {

            var doc = that.root.ownerDocument;
            doc.removeEventListener( 'mousemove', inner_mousemove );
            doc.removeEventListener( 'mouseup', inner_mouseup );
            document.body.classList.remove( 'noevents' );

            // Snap if necessary
            if( snapEnabled )
            {
                mustSnap = true;
                LX.Widget._dispatchEvent( innerKnobCircle, 'change' );
            }

            if( document.pointerLockElement )
            {
                document.exitPointerLock();
            }
        }

        container.appendChild( knobCircle );

        this.root.appendChild( container );

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.Knob = Knob;

/**
 * @method addKnob
 * @param {String} name Widget name
 * @param {Number} value Knob value
 * @param {Number} min Min Knob value
 * @param {Number} max Max Knob value
 * @param {Function} callback Callback function on change
 * @param {*} options:
 * minLabel (String): Label to show as min value
 * maxLabel (String): Label to show as max value
 */

LX.Panel.prototype.addKnob = function( name, value, min, max, callback, options = {} ) {
    const widget = new Knob( name, value, min, max, callback, options );
    return this._attachWidget( widget );
}