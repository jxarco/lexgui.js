// NumberInput.ts @jxarco

import { IEvent } from './../core/Event';
import { LX } from './../core/Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';

/**
 * @class NumberInput
 * @description NumberInput Component
 */

export class NumberInput extends BaseComponent
{
    setLimits: ( newMin: number | null, newMax: number | null, newStep: number | null ) => void;

    constructor( name: string | null, value: number, callback: any, options: any = {} )
    {
        super( ComponentType.NUMBER, name, value, options );

        this.onGetValue = () =>
        {
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) =>
        {
            if ( isNaN( newValue ) )
            {
                return;
            }

            value = LX.clamp( +newValue, +vecinput.min, +vecinput.max );
            vecinput.value = value = LX.round( value, options.precision );

            // Update slider!
            const slider: any = box.querySelector( '.lexinputslider' );
            if ( slider )
            {
                slider.value = value;
            }

            if ( !skipCallback )
            {
                this._trigger( new IEvent( name, value, event ), callback );
            }
        };

        this.onResize = ( rect ) =>
        {
            const realNameWidth = this.root.domName?.style.width ?? '0px';
            container.style.width = options.inputWidth ?? `calc( 100% - ${realNameWidth})`;
        };

        this.setLimits = ( newMin, newMax, newStep ) =>
        {};

        var container = document.createElement( 'div' );
        container.className = 'lexnumber';
        this.root.appendChild( container );

        let box = document.createElement( 'div' );
        box.className = 'numberbox';
        container.appendChild( box );

        let valueBox = LX.makeContainer( [ 'auto', '100%' ], 'relative flex flex-row cursor-text', '', box );

        let vecinput: any = document.createElement( 'input' );
        vecinput.id = 'number_' + LX.guidGenerator();
        vecinput.className = 'vecinput';
        vecinput.min = options.min ?? -1e24;
        vecinput.max = options.max ?? 1e24;
        vecinput.step = options.step ?? 'any';
        vecinput.type = 'number';

        if ( value.constructor == Number )
        {
            value = LX.clamp( value, +vecinput.min, +vecinput.max );
            value = LX.round( value, options.precision );
        }

        vecinput.value = vecinput.iValue = value;
        valueBox.appendChild( vecinput );

        const dragIcon = LX.makeIcon( 'MoveVertical', { iconClass: 'drag-icon hidden-opacity', svgClass: 'sm' } );
        valueBox.appendChild( dragIcon );

        if ( options.units )
        {
            let unitBox = LX.makeContainer( [ 'auto', 'auto' ], 'px-2 bg-secondary content-center', options.units,
                valueBox, { 'word-break': 'keep-all' } );
            vecinput.unitBox = unitBox;
        }

        if ( options.disabled )
        {
            this.disabled = vecinput.disabled = true;
        }

        // Add slider below
        if ( !options.skipSlider && options.min !== undefined && options.max !== undefined )
        {
            let sliderBox = LX.makeContainer( [ '100%', 'auto' ], 'z-1 input-box', '', box );
            let slider: any = document.createElement( 'input' );
            slider.className = 'lexinputslider';
            slider.min = options.min;
            slider.max = options.max;
            slider.step = options.step ?? 1;
            slider.type = 'range';
            slider.value = value;
            slider.disabled = this.disabled;

            slider.addEventListener( 'input', ( e: InputEvent ) =>
            {
                this.set( slider.valueAsNumber, false, e );
            }, false );

            slider.addEventListener( 'mousedown', function( e: MouseEvent )
            {
                if ( options.onPress )
                {
                    options.onPress.bind( slider )( e, slider );
                }
            }, false );

            slider.addEventListener( 'mouseup', function( e: MouseEvent )
            {
                if ( options.onRelease )
                {
                    options.onRelease.bind( slider )( e, slider );
                }
            }, false );

            sliderBox.appendChild( slider );

            // Method to change min, max, step parameters
            this.setLimits = ( newMin, newMax, newStep ) =>
            {
                vecinput.min = slider.min = newMin ?? vecinput.min;
                vecinput.max = slider.max = newMax ?? vecinput.max;
                vecinput.step = newStep ?? vecinput.step;
                slider.step = newStep ?? slider.step;
                this.set( value, true );
            };
        }

        vecinput.addEventListener( 'input', function( e: InputEvent )
        {
            value = +vecinput.valueAsNumber;
            value = LX.round( value, options.precision );
        }, false );

        vecinput.addEventListener( 'wheel', ( e: WheelEvent ) =>
        {
            e.preventDefault();
            if ( vecinput !== document.activeElement )
            {
                return;
            }
            let mult = options.step ?? 1;
            if ( e.shiftKey ) mult *= 10;
            else if ( e.altKey ) mult *= 0.1;
            value = +vecinput.valueAsNumber - mult * ( e.deltaY > 0 ? 1 : -1 );
            this.set( value, false, e );
        }, { passive: false } );

        vecinput.addEventListener( 'change', ( e: InputEvent ) =>
        {
            this.set( vecinput.valueAsNumber, false, e );
        }, { passive: false } );

        // Add drag input

        var that = this;

        let innerMouseDown = ( e: MouseEvent ) =>
        {
            if ( ( document.activeElement == vecinput ) || ( e.button != LX.MOUSE_LEFT_CLICK ) )
            {
                return;
            }

            var doc = that.root.ownerDocument;
            doc.addEventListener( 'mousemove', innerMouseMove );
            doc.addEventListener( 'mouseup', innerMouseUp );
            document.body.classList.add( 'noevents' );
            dragIcon.classList.remove( 'hidden-opacity' );
            e.stopImmediatePropagation();
            e.stopPropagation();

            if ( !document.pointerLockElement )
            {
                valueBox.requestPointerLock();
            }

            if ( options.onPress )
            {
                options.onPress.bind( vecinput )( e, vecinput );
            }
        };

        let innerMouseMove = ( e: MouseEvent ) =>
        {
            let dt = -e.movementY;

            if ( dt != 0 )
            {
                let mult = options.step ?? 1;
                if ( e.shiftKey ) mult *= 10;
                else if ( e.altKey ) mult *= 0.1;
                value = +vecinput.valueAsNumber + mult * dt;
                this.set( value, false, e );
            }

            e.stopPropagation();
            e.preventDefault();
        };

        let innerMouseUp = ( e: MouseEvent ) =>
        {
            var doc = that.root.ownerDocument;
            doc.removeEventListener( 'mousemove', innerMouseMove );
            doc.removeEventListener( 'mouseup', innerMouseUp );
            document.body.classList.remove( 'noevents' );
            dragIcon.classList.add( 'hidden-opacity' );

            if ( document.pointerLockElement )
            {
                document.exitPointerLock();
            }

            if ( options.onRelease )
            {
                options.onRelease.bind( vecinput )( e, vecinput );
            }
        };

        valueBox.addEventListener( 'mousedown', innerMouseDown );

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.NumberInput = NumberInput;
