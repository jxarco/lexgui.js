// RangeInput.ts @jxarco

import { LX } from './../core/Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';
import { IEvent } from './Event';

/**
 * @class RangeInput
 * @description RangeInput Component
 */

export class RangeInput extends BaseComponent
{
    _maxSlider: HTMLInputElement | null = null;
    _labelTooltip: HTMLElement | null = null;

    setLimits: ( newMin: number | null, newMax: number | null, newStep: number | null ) => void;

    constructor( name: string, value: any, callback: any, options: any = {} )
    {
        const ogValue = LX.deepCopy( value );

        super( ComponentType.RANGE, name, LX.deepCopy( ogValue ), options );

        const isRangeValue = ( value.constructor == Array && value.length == 2 );
        if( isRangeValue )
        {
            value = ogValue[ 0 ];
            options.fill = false; // Range inputs do not fill by default
        }

        this.onGetValue = () => {
            let finalValue = value;
            if( isRangeValue )
            {
                finalValue = [ value, ogValue[ 1 ] ];
            }
            else if( options.left )
            {
                finalValue = ( ( +slider.max ) - value + ( +slider.min ) );
            }
            return finalValue;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {

            let newTpContent = "";

            const diff = ( options.max - options.min );

            if( isRangeValue && this._maxSlider )
            {
                slider.value = value = LX.clamp( +newValue[ 0 ], +slider.min, +slider.max );
                this._maxSlider.value = ogValue[ 1 ] = LX.clamp( +newValue[ 1 ], +slider.min, +slider.max );

                // Update the range slider
                const diffOffset = ( value / diff ) - 0.5;
                const diffMaxOffset = ( ogValue[ 1 ] / diff ) - 0.5;
                const remappedMin = LX.remapRange( value, options.min, options.max, 0, 1 );
                const remappedMax = LX.remapRange( ogValue[ 1 ], options.min, options.max, 0, 1 );
                slider.style.setProperty("--range-min-value", `${ remappedMin * 100 }%`);
                slider.style.setProperty("--range-max-value", `${ remappedMax * 100 }%`);
                slider.style.setProperty("--range-fix-min-offset", `${ -diffOffset }rem`);
                slider.style.setProperty("--range-fix-max-offset", `${ diffMaxOffset }rem`);

                container.dataset[ "tooltipOffsetX" ] = `${ container.offsetWidth * remappedMin + container.offsetWidth * ( remappedMax - remappedMin ) * 0.5 - ( container.offsetWidth * 0.5 ) }`;
                newTpContent = `${ value } - ${ ogValue[ 1 ] }`;
            }
            else
            {
                if( isNaN( newValue ) )
                {
                    return;
                }

                slider.value = value = LX.clamp( +newValue, +slider.min, +slider.max );
                const remapped = LX.remapRange( value, options.min, options.max, 0, 1 ) * 0.5;
                container.dataset[ "tooltipOffsetX" ] = `${ container.offsetWidth * remapped - ( container.offsetWidth * 0.5 ) }`;
                newTpContent = `${ value }`;
            }

            container.dataset[ "tooltipContent" ] = newTpContent;
            if( this._labelTooltip )
            {
                this._labelTooltip.innerHTML = newTpContent;
            }

            if( !skipCallback )
            {
                let finalValue = value;
                if( isRangeValue )
                {
                    finalValue = [ value, ogValue[ 1 ] ];
                }
                else if( options.left )
                {
                    finalValue = ( ( +slider.max ) - value + ( +slider.min ) );
                }

                this._trigger( new IEvent( name, finalValue, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = options.inputWidth ?? `calc( 100% - ${ realNameWidth })`;
            if( isRangeValue )
            {
                const diff = ( options.max - options.min );
                const diffOffset = ( value / diff ) - 0.5;
                const diffMaxOffset = ( ogValue[ 1 ] / diff ) - 0.5;
                slider.style.setProperty("--range-min-value", `${ LX.remapRange( value, options.min, options.max, 0, 1 ) * 100 }%`);
                slider.style.setProperty("--range-max-value", `${ LX.remapRange( ogValue[ 1 ], options.min, options.max, 0, 1 ) * 100 }%`);
                slider.style.setProperty("--range-fix-min-offset", `${ -diffOffset }rem`);
                slider.style.setProperty("--range-fix-max-offset", `${ diffMaxOffset }rem`);
            }
        };

        const container = document.createElement( 'div' );
        container.className = "lexrange relative";
        this.root.appendChild( container );

        let slider: any = document.createElement( 'input' );
        slider.className = "lexrangeslider " + ( isRangeValue ? "pointer-events-none " : "" ) + ( options.className ?? "" );
        slider.min = options.min ?? 0;
        slider.max = options.max ?? 100;
        slider.step = options.step ?? 1;
        slider.type = "range";
        slider.disabled = options.disabled ?? false;

        if( value.constructor == Number )
        {
            value = LX.clamp( value, +slider.min, +slider.max );
        }

        if( options.left ?? false )
        {
            value = ( ( +slider.max ) - value + ( +slider.min ) );
            slider.classList.add( "left" );
        }

        if( !( options.fill ?? true ) )
        {
            slider.classList.add( "no-fill" );
        }

        slider.value = value;
        container.appendChild( slider );

        slider.addEventListener( "input", ( e: any ) => {
            this.set( isRangeValue ? [ Math.min( e.target.valueAsNumber, ogValue[ 1 ] ), ogValue[ 1 ] ] : e.target.valueAsNumber, false, e );
        }, { passive: false });

        // If its a range value, we need to update the slider using the thumbs
        if( !isRangeValue )
        {
            slider.addEventListener( "mousedown", function( e: MouseEvent ) {
                if( options.onPress )
                {
                    options.onPress.bind( slider )( e, slider );
                }
            }, false );

            slider.addEventListener( "mouseup", function( e: MouseEvent ) {
                if( options.onRelease )
                {
                    options.onRelease.bind( slider )( e, slider );
                }
            }, false );
        }

        // Method to change min, max, step parameters
        this.setLimits = ( newMin, newMax, newStep ) => {
            slider.min = newMin ?? slider.min;
            slider.max = newMax ?? slider.max;
            slider.step = newStep ?? slider.step;
            BaseComponent._dispatchEvent( slider, "input", true );
        };

        LX.doAsync( () => {

            this.onResize();

            let offsetX = 0;
            if( isRangeValue )
            {
                const remappedMin = LX.remapRange( value, options.min, options.max, 0, 1 );
                const remappedMax = LX.remapRange( ogValue[ 1 ], options.min, options.max, 0, 1 );
                offsetX = container.offsetWidth * remappedMin + container.offsetWidth * ( remappedMax - remappedMin ) * 0.5 - ( container.offsetWidth * 0.5 );
            }
            else
            {
                const remapped = LX.remapRange( value, options.min, options.max, 0, 1 ) * 0.5;
                offsetX = container.offsetWidth * remapped - ( container.offsetWidth * 0.5 );
            }
            LX.asTooltip( container, `${ value }${ isRangeValue ? `- ${ ogValue[ 1 ] }` : `` }`, { offsetX, callback: ( tpDom: HTMLElement ) => {
                this._labelTooltip = tpDom;
            } } );
        } );

        if( ogValue.constructor == Array ) // Its a range value
        {
            let maxSlider = document.createElement( 'input' );
            maxSlider.className = "lexrangeslider no-fill pointer-events-none overlap absolute top-0 left-0 " + ( options.className ?? "" );
            maxSlider.min = options.min ?? 0;
            maxSlider.max = options.max ?? 100;
            maxSlider.step = options.step ?? 1;
            maxSlider.type = "range";
            maxSlider.disabled = options.disabled ?? false;
            this._maxSlider = maxSlider;

            let maxRangeValue = ogValue[ 1 ];
            maxSlider.value = maxRangeValue = LX.clamp( maxRangeValue, +maxSlider.min, +maxSlider.max );
            container.appendChild( maxSlider );

            maxSlider.addEventListener( "input", ( e: any ) => {
                ogValue[ 1 ] = Math.max( value, +e.target.valueAsNumber );
                this.set( [ value, ogValue[ 1 ] ], false, e );
            }, { passive: false });
        }
    }
}

LX.RangeInput = RangeInput;