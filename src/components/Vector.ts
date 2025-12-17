// Vector.ts @jxarco

import { IEvent } from './../core/Event';
import { LX } from './../core/Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';
import { Button } from './Button';

/**
 * @class Vector
 * @description Vector Component
 */

export class Vector extends BaseComponent
{
    setLimits: ( newMin: number | null, newMax: number | null, newStep: number | null ) => void;

    constructor( numComponents: number, name: string, value: number[], callback: any, options: any = {} )
    {
        numComponents = LX.clamp( numComponents, 2, 4 );
        value = value ?? new Array( numComponents ).fill( 0 );

        super( ComponentType.VECTOR, name, LX.deepCopy( value ), options );

        this.onGetValue = () => {
            let inputs = this.root.querySelectorAll( "input[type='number']" );
            let value = [];
            for ( var v of inputs )
            {
                value.push( +v.value );
            }
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            if ( vectorInputs.length != newValue.length )
            {
                console.error( 'Input length does not match vector length.' );
                return;
            }

            for ( let i = 0; i < vectorInputs.length; ++i )
            {
                let vecValue = newValue[i];
                vecValue = LX.clamp( vecValue, +vectorInputs[i].min, +vectorInputs[i].max );
                vecValue = LX.round( vecValue, options.precision ) ?? 0;
                vectorInputs[i].value = value[i] = vecValue;
            }

            if ( !skipCallback )
            {
                this._trigger( new IEvent( name, value, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = this.root.domName?.style.width ?? '0px';
            container.style.width = `calc( 100% - ${realNameWidth})`;
        };

        this.setLimits = ( newMin, newMax, newStep ) => {};

        const vectorInputs: any[] = [];

        var container = document.createElement( 'div' );
        container.className = 'lexvector';
        this.root.appendChild( container );

        this.disabled = options.disabled ?? false;
        const that = this;

        for ( let i = 0; i < numComponents; ++i )
        {
            let box = document.createElement( 'div' );
            box.className = 'vecbox';
            box.innerHTML = "<span class='" + LX.Panel.VECTOR_COMPONENTS[i] + "'></span>";

            let vecinput: any = document.createElement( 'input' );
            vecinput.className = 'vecinput v' + numComponents;
            vecinput.min = options.min ?? -1e24;
            vecinput.max = options.max ?? 1e24;
            vecinput.step = options.step ?? 'any';
            vecinput.type = 'number';
            vecinput.id = 'vec' + numComponents + '_' + LX.guidGenerator();
            vecinput.idx = i;
            vectorInputs[i] = vecinput;
            box.appendChild( vecinput );

            if ( value[i].constructor == Number )
            {
                value[i] = LX.clamp( value[i], +vecinput.min, +vecinput.max );
                value[i] = LX.round( value[i], options.precision );
            }

            vecinput.value = vecinput.iValue = value[i];

            const dragIcon = LX.makeIcon( 'MoveVertical', { iconClass: 'drag-icon hidden-opacity', svgClass: 'sm' } );
            box.appendChild( dragIcon );

            if ( this.disabled )
            {
                vecinput.disabled = true;
            }

            // Add wheel input
            vecinput.addEventListener( 'wheel', function( e: WheelEvent )
            {
                e.preventDefault();
                if ( vecinput !== document.activeElement )
                {
                    return;
                }
                let mult = options.step ?? 1;
                if ( e.shiftKey ) mult = 10;
                else if ( e.altKey ) mult = 0.1;

                if ( lockerButton.locked )
                {
                    for ( let v of vectorInputs )
                    {
                        v.value = LX.round( +v.valueAsNumber - mult * ( e.deltaY > 0 ? 1 : -1 ), options.precision );
                        BaseComponent._dispatchEvent( v, 'change' );
                    }
                }
                else
                {
                    vecinput.value = LX.round( +vecinput.valueAsNumber - mult * ( e.deltaY > 0 ? 1 : -1 ), options.precision );
                    BaseComponent._dispatchEvent( vecinput, 'change' );
                }
            }, { passive: false } );

            vecinput.addEventListener( 'change', ( e: any ) => {
                if ( isNaN( e.target.value ) )
                {
                    return;
                }

                let val = LX.clamp( e.target.value, +vecinput.min, +vecinput.max );
                val = LX.round( val, options.precision );

                if ( lockerButton.locked )
                {
                    for ( let v of vectorInputs )
                    {
                        v.value = val;
                        value[v.idx] = val;
                    }
                }
                else
                {
                    vecinput.value = val;
                    value[e.target.idx] = val;
                }

                this.set( value, false, e );
            }, false );

            // Add drag input

            function innerMouseDown( e: MouseEvent )
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
                    box.requestPointerLock();
                }

                if ( options.onPress )
                {
                    options.onPress.bind( vecinput )( e, vecinput );
                }
            }

            function innerMouseMove( e: MouseEvent )
            {
                let dt = -e.movementY;

                if ( dt != 0 )
                {
                    let mult = options.step ?? 1;
                    if ( e.shiftKey ) mult = 10;
                    else if ( e.altKey ) mult = 0.1;

                    if ( lockerButton.locked )
                    {
                        for ( let v of vectorInputs )
                        {
                            v.value = LX.round( +v.valueAsNumber + mult * dt, options.precision );
                            BaseComponent._dispatchEvent( v, 'change' );
                        }
                    }
                    else
                    {
                        vecinput.value = LX.round( +vecinput.valueAsNumber + mult * dt, options.precision );
                        BaseComponent._dispatchEvent( vecinput, 'change' );
                    }
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
                dragIcon.classList.add( 'hidden-opacity' );

                if ( document.pointerLockElement )
                {
                    document.exitPointerLock();
                }

                if ( options.onRelease )
                {
                    options.onRelease.bind( vecinput )( e, vecinput );
                }
            }

            box.addEventListener( 'mousedown', innerMouseDown );
            container.appendChild( box );
        }

        // Method to change min, max, step parameters
        if ( options.min !== undefined || options.max !== undefined )
        {
            this.setLimits = ( newMin, newMax, newStep ) => {
                for ( let v of vectorInputs )
                {
                    v.min = newMin ?? v.min;
                    v.max = newMax ?? v.max;
                    v.step = newStep ?? v.step;
                }

                this.set( value, true );
            };
        }

        const lockerButton: any = new Button( null, '', ( swapValue: boolean ) => {
            lockerButton.locked = swapValue;
        }, { title: 'Lock', icon: 'LockOpen', swap: 'Lock', buttonClass: 'no-h bg-none p-0' } );
        container.appendChild( lockerButton.root );

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.Vector = Vector;
