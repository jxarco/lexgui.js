// Audio.ts @jxarco

import { LX } from '../core/Namespace';

if ( !LX )
{
    throw ( 'Missing LX namespace!' );
}

LX.extensions.push( 'Audio' );

const Panel = LX.Panel;
const BaseComponent = LX.BaseComponent;
const ComponentType = LX.ComponentType;
const IEvent = LX.IEvent;

/**
 * @class Knob
 * @description Knob Component
 */

export class Knob extends BaseComponent
{
    constructor( name: string, value: number, min: number, max: number, callback: any, options: any = {} )
    {
        if ( value.constructor == Number )
        {
            value = LX.clamp( value, min, max );
            value = options.precision ? LX.round( value, options.precision ) : value;
        }

        super( ComponentType.KNOB, name, value, options );

        this.onGetValue = () => {
            return innerKnobCircle.value;
        };

        this.onSetValue = ( newValue: any, skipCallback?: boolean, event?: any ) => {
            innerSetValue( newValue );
            LX.BaseComponent._dispatchEvent( innerKnobCircle, 'change', skipCallback );
        };

        this.onResize = () => {
            const realNameWidth = this.root.domName?.style.width ?? '0px';
            container.style.width = `calc( 100% - ${realNameWidth})`;
        };

        const snapEnabled = options.snap && options.snap.constructor == Number;
        const ticks: number[] = [];
        if ( snapEnabled )
        {
            const range = ( max - min ) / options.snap;
            for ( let i = 0; i < ( options.snap + 1 ); ++i )
            {
                ticks.push( min + ( i * range ) );
            }
        }

        var container: any = document.createElement( 'div' );
        container.className = 'lexknob';
        LX.addClass( container, options.size );
        LX.addClass( container, snapEnabled ? 'show-ticks' : null );

        let knobCircle = document.createElement( 'div' );
        knobCircle.className = 'knobcircle';
        if ( snapEnabled )
        {
            knobCircle.style.setProperty( '--knob-snap-mark', ( 270 / options.snap ) + 'deg' );
        }

        let innerKnobCircle: any = document.createElement( 'div' );
        innerKnobCircle.className = 'innerknobcircle';
        innerKnobCircle.min = min;
        innerKnobCircle.max = max;
        knobCircle.appendChild( innerKnobCircle );

        let knobMarker: any = document.createElement( 'div' );
        knobMarker.className = 'knobmarker';
        innerKnobCircle.appendChild( knobMarker );
        innerKnobCircle.value = innerKnobCircle.iValue = value;

        let mustSnap = false;
        let innerSetValue = function( v: number )
        {
            // Convert val between (-135 and 135)
            const angle = LX.remapRange( v, innerKnobCircle.min, innerKnobCircle.max, -135.0, 135.0 );
            innerKnobCircle.style.rotate = angle + 'deg';
            innerKnobCircle.value = v;
        };

        const angle = LX.remapRange( value, min, max, -135.0, 135.0 );
        innerKnobCircle.style.rotate = angle + 'deg';

        if ( options.disabled )
        {
            LX.addClass( container, 'disabled' );
        }

        innerKnobCircle.addEventListener( 'change', ( e: InputEvent ) => {
            const knob: any = e.target;

            const skipCallback = e.detail;

            if ( mustSnap )
            {
                knob.value = ticks.reduce( ( prev, curr ) => Math.abs( curr - knob.value ) < Math.abs( prev - knob.value ) ? curr : prev );
            }

            let val = knob.value = LX.clamp( knob.value, knob.min, knob.max );
            val = options.precision ? LX.round( val, options.precision ) : val;

            innerSetValue( val );

            // Reset button (default value)
            if ( !skipCallback )
            {
                let btn = this.root.querySelector( '.lexcomponentname .lexicon' );
                if ( btn ) btn.style.display = val != innerKnobCircle.iValue ? 'block' : 'none';

                if ( !( snapEnabled && !mustSnap ) )
                {
                    this._trigger( new IEvent( name, val, e ), callback );
                    mustSnap = false;
                }
            }
        }, { passive: false } );

        // Add drag input

        innerKnobCircle.addEventListener( 'mousedown', innerMouseDown );

        var that = this;

        function innerMouseDown( e: MouseEvent )
        {
            if ( document.activeElement == innerKnobCircle || options.disabled )
            {
                return;
            }

            var doc = that.root.ownerDocument;
            doc.addEventListener( 'mousemove', innerMouseMove );
            doc.addEventListener( 'mouseup', innerMouseUp );
            document.body.classList.add( 'noevents' );

            if ( !document.pointerLockElement )
            {
                container.requestPointerLock();
            }

            e.stopImmediatePropagation();
            e.stopPropagation();
        }

        function innerMouseMove( e: MouseEvent )
        {
            let dt = -e.movementY;

            if ( dt != 0 )
            {
                let mult = options.step ?? 1;
                if ( e.shiftKey ) mult *= 10;
                else if ( e.altKey ) mult *= 0.1;
                let new_value = innerKnobCircle.value - mult * dt;
                innerKnobCircle.value = new_value;
                LX.BaseComponent._dispatchEvent( innerKnobCircle, 'change' );
            }

            e.stopPropagation();
            e.preventDefault();
        }

        function innerMouseUp( e: MouseEvent )
        {
            var doc = that.root.ownerDocument;
            doc.removeEventListener( 'mousemove', innerMouseMove );
            doc.removeEventListener( 'mouseup', innerMouseUp );
            document.body.classList.remove( 'noevents' );

            // Snap if necessary
            if ( snapEnabled )
            {
                mustSnap = true;
                LX.BaseComponent._dispatchEvent( innerKnobCircle, 'change' );
            }

            if ( document.pointerLockElement )
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
 * @param {String} name Component name
 * @param {Number} value Knob value
 * @param {Number} min Min Knob value
 * @param {Number} max Max Knob value
 * @param {Function} callback Callback function on change
 * @param {*} options:
 * minLabel (String): Label to show as min value
 * maxLabel (String): Label to show as max value
 */

const panelProto: any = Panel.prototype;
panelProto.addKnob = function( name: string, value: number, min: number, max: number, callback: any, options: any = {} )
{
    const component = new Knob( name, value, min, max, callback, options );
    return this._attachComponent( component );
};
