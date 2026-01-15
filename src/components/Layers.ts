// Layers.ts @jxarco

import { IEvent } from './../core/Event';
import { LX } from './../core/Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';

/**
 * @class Layers
 * @description Layers Component
 */

export class Layers extends BaseComponent
{
    setLayers: ( val: number ) => void;

    constructor( name: string, value: number, callback: any, options: any = {} )
    {
        super( ComponentType.LAYERS, name, value, options );

        this.onGetValue = () => {
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            value = newValue;
            this.setLayers( value );
            if ( !skipCallback )
            {
                this._trigger( new IEvent( name, value, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = this.root.domName?.style.width ?? '0px';
            container.style.width = `calc( 100% - ${realNameWidth})`;
        };

        const container = LX.makeElement( 'div', 'lexlayers grid', '', this.root );
        const maxBits = options.maxBits ?? 16;

        this.setLayers = ( val ) => {
            container.innerHTML = '';

            let binary = val.toString( 2 );
            let nbits = binary.length;

            // fill zeros
            for ( let i = 0; i < ( maxBits - nbits ); ++i )
            {
                binary = '0' + binary;
            }

            for ( let bit = 0; bit < maxBits; ++bit )
            {
                let layer: any = document.createElement( 'button' );
                layer.className = `lexlayer size-6 text-secondary-foreground text-center content-center place-self-center cursor-pointer font-semibold text-xs rounded-lg select-none 
                    disabled:pointer-events-none disabled:opacity-50`;
                layer.disabled = this.disabled;

                if ( val != undefined )
                {
                    const valueBit = binary[maxBits - bit - 1];
                    if ( valueBit != undefined && valueBit == '1' )
                    {
                        layer.classList.add( 'selected' );
                    }
                }

                layer.innerText = bit + 1;
                layer.title = 'Bit ' + bit + ', value ' + ( 1 << bit );
                container.appendChild( layer );

                layer.addEventListener( 'click', ( e: any ) => {
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    e.target.classList.toggle( 'selected' );
                    const newValue = val ^ ( 1 << bit );
                    this.set( newValue, false, e );
                } );
            }
        };

        this.setLayers( value );

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.Layers = Layers;
