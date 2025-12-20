// SizeInput.ts @jxarco

import { LX } from './../core/Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';
import { Button } from './Button';

/**
 * @class SizeInput
 * @description SizeInput Component
 */

export class SizeInput extends BaseComponent
{
    constructor( name: string, value: number[], callback: any, options: any = {} )
    {
        super( ComponentType.SIZE, name, value, options );

        this.onGetValue = () => {
            const value = [];
            for ( let i = 0; i < this.root.dimensions.length; ++i )
            {
                value.push( this.root.dimensions[i].value() );
            }
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            for ( let i = 0; i < this.root.dimensions.length; ++i )
            {
                this.root.dimensions[i].set( newValue[i], skipCallback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = this.root.domName?.style.width ?? '0px';
            container.style.width = `calc( 100% - ${realNameWidth})`;
        };

        this.root.aspectRatio = value.length == 2 ? value[0] / value[1] : null;
        this.root.dimensions = [];

        const container = LX.makeElement( 'div', 'flex', '', this.root );

        for ( let i = 0; i < value.length; ++i )
        {
            const p = new LX.Panel();
            this.root.dimensions[i] = p.addNumber( null, value[i], ( v: number ) => {
                const value = this.value();

                if ( this.root.locked )
                {
                    const ar = i == 0 ? 1.0 / this.root.aspectRatio : this.root.aspectRatio;
                    const index = ( 1 + i ) % 2;
                    value[index] = v * ar;
                    this.root.dimensions[index].set( value[index], true );
                }

                if ( callback )
                {
                    callback( value );
                }
            }, { min: 0, disabled: options.disabled, precision: options.precision, className: 'flex-auto-fill' } );

            container.appendChild( this.root.dimensions[i].root );

            if ( ( i + 1 ) != value.length )
            {
                const xIcon = LX.makeIcon( 'X', { svgClass: 'text-primary font-bold' } );
                container.appendChild( xIcon );
            }
        }

        if ( options.units )
        {
            LX.makeElement( 'span', 'text-muted-foreground align-center content-center font-medium flex-auto-keep select-none', options.units,
                container );
        }

        // Lock aspect ratio
        if ( this.root.aspectRatio )
        {
            const lockerButton = new Button( null, '', ( swapValue: boolean ) => {
                this.root.locked = swapValue;
                if ( swapValue )
                {
                    // Recompute ratio
                    const value = this.value();
                    this.root.aspectRatio = value[0] / value[1];
                }
            }, { title: 'Lock Aspect Ratio', icon: 'LockOpen', swap: 'Lock', className: 'flex-auto-keep', buttonClass: 'h-auto bg-none p-0' } );
            container.appendChild( lockerButton.root );
        }

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.SizeInput = SizeInput;
