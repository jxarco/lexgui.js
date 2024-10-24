import { LX } from 'lexgui';

if(!LX) {
    throw("lexgui.js missing!");
}

LX.components.push( 'Audio' );

function remapRange(oldValue, oldMin, oldMax, newMin, newMax)
{
    return (((oldValue - oldMin) * (newMax - newMin)) / (oldMax - oldMin)) + newMin;
}

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

let Panel = LX.Panel;
let Widget = LX.Widget;

Panel.prototype.addKnob = function( name, value, min, max, callback, options = {} ) {

    let widget = this.create_widget( name, Widget.KNOB, options );

    widget.onGetValue = () => {
        return +vecinput.value;
    };
    widget.onSetValue = ( newValue, skipCallback ) => {
        vecinput.value = newValue;
        Panel._dispatch_event( vecinput, "change", skipCallback );
    };

    let element = widget.domEl;

    // Add reset functionality
    if( widget.name ) {
        Panel._add_reset_property( element.domName, function() {
            this.style.display = "none";
            vecinput.value = vecinput.iValue;
            Panel._dispatch_event( vecinput, "change" );
        });
    }

    var container = document.createElement( 'div' );
    container.className = "lexknob " + ( options.size ?? '' );
    container.style.width = options.inputWidth || "calc( 100% - " + LX.DEFAULT_NAME_WIDTH + ")";

    let knobCircle = document.createElement( 'div' );
    knobCircle.className = "knobcircle";

    let innerKnobCircle = document.createElement( 'div' );
    innerKnobCircle.className = "innerknobcircle";
    innerKnobCircle.min = min;
    innerKnobCircle.max = max;
    knobCircle.appendChild( innerKnobCircle );

    let knobMarker = document.createElement( 'div' );
    knobMarker.className = "knobmarker";
    innerKnobCircle.appendChild( knobMarker );

    if( value.constructor == Number )
    {
        value = LX.clamp( value, min, max );
        value = options.precision ? LX.round( value, options.precision ) : value;
    }

    innerKnobCircle.value = innerKnobCircle.iValue = value;

    const angle = remapRange( value, min, max, -135.0, 135.0 );
    innerKnobCircle.style.rotate = angle + 'deg';

    if( options.disabled )
    {
        // vecinput.disabled = true;
    }

    // Add wheel input

    // vecinput.addEventListener( "wheel", function( e ) {
    //     e.preventDefault();
    //     if( this !== document.activeElement )
    //         return;
    //     let mult = options.step ?? 1;
    //     if( e.shiftKey ) mult *= 10;
    //     else if( e.altKey ) mult *= 0.1;
    //     let new_value = ( +this.valueAsNumber - mult * ( e.deltaY > 0 ? 1 : -1 ) );
    //     this.value = ( +new_value ).toFixed( 4 ).replace( /([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, '$1' );
    //     Panel._dispatch_event(vecinput, "change");
    // }, { passive: false });

    innerKnobCircle.addEventListener( "change", e => {

        const knob = e.target;

        const skipCallback = e.detail;

        let val = knob.value = LX.clamp( knob.value, knob.min, knob.max );
        val = options.precision ? LX.round( val, options.precision ) : val;

        // Convert val between (-135 and 135)
        const angle = remapRange( val, knob.min, knob.max, -135.0, 135.0 );

        console.log(angle);

        knob.style.rotate = angle + 'deg';

        // // Update slider!
        // if( box.querySelector( ".lexinputslider" ) )
        //     box.querySelector( ".lexinputslider" ).value = val;

        // vecinput.value = val;

        // // Reset button (default value)
        // if( !skipCallback )
        // {
        //     let btn = element.querySelector( ".lexwidgetname .lexicon" );
        //     if( btn ) btn.style.display = val != vecinput.iValue ? "block": "none";
        // }

        // if( !skipCallback ) this._trigger( new LX.IEvent( name, val, e ), callback );
    }, { passive: false });
    
    // Add drag input

    innerKnobCircle.addEventListener( "mousedown", inner_mousedown );

    var that = this;
    var lastY = 0;
    function inner_mousedown( e ) {
        if( document.activeElement == innerKnobCircle ) return;
        var doc = that.root.ownerDocument;
        doc.addEventListener("mousemove",inner_mousemove);
        doc.addEventListener("mouseup",inner_mouseup);
        lastY = e.pageY;
        document.body.classList.add('nocursor');
        document.body.classList.add('noevents');
        e.stopImmediatePropagation();
        e.stopPropagation();
    }

    function inner_mousemove( e ) {
        if (lastY != e.pageY) {
            let dt = lastY - e.pageY;
            let mult = options.step ?? 1;
            if(e.shiftKey) mult *= 10;
            else if(e.altKey) mult *= 0.1;
            let new_value = (innerKnobCircle.value - mult * dt);
            innerKnobCircle.value = new_value;//.toFixed( 4 ).replace(/([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/,'$1');
            Panel._dispatch_event( innerKnobCircle, 'change' );
        }

        lastY = e.pageY;
        e.stopPropagation();
        e.preventDefault();
    }

    function inner_mouseup( e ) {
        var doc = that.root.ownerDocument;
        doc.removeEventListener( 'mousemove', inner_mousemove );
        doc.removeEventListener( 'mouseup', inner_mouseup );
        document.body.classList.remove( 'nocursor' );
        document.body.classList.remove( 'noevents' );
    }
    
    container.appendChild( knobCircle );
    element.appendChild( container );

    // Remove branch padding and margins
    if( !widget.name ) {
        element.className += " noname";
        container.style.width = "100%";
    }

    return widget;
}