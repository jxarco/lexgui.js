// Counter.ts @jxarco

import { IEvent } from './../core/Event';
import { LX } from './../core/Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';
import { Button } from './Button';

/**
 * @class Counter
 * @description Counter Component
 */

export class Counter extends BaseComponent
{
    count: number;

    constructor( name: string, value: number, callback: any, options: any = {} )
    {
        super( ComponentType.COUNTER, name, value, options );

        this.onGetValue = () => {
            return this.count;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            this.count = LX.clamp( newValue, min, max );
            input.value = this.count;
            if ( !skipCallback )
            {
                this._trigger( new IEvent( name, newValue, event ), callback );
            }
        };

        this.count = value;

        const min = options.min ?? 0;
        const max = options.max ?? 100;
        const step = options.step ?? 1;

        const container = document.createElement( 'div' );
        container.className = 'flex flex-row border bg-primary rounded-lg shadow';
        this.root.appendChild( container );

        const input = LX.makeElement( 'input', 'lexcounter w-12 bg-primary px-2 fg-primary', '', container );
        input.type = 'number';
        input.value = value;

        if ( options.disabled )
        {
            input.setAttribute( 'disabled', 'true' );
        }

        const substrButton = new Button( null, '', ( value: any, e: MouseEvent ) => {
            let mult = step ?? 1;
            if ( e.shiftKey ) mult *= 10;
            this.set( this.count - mult, false, e );
        }, { disabled: options.disabled,
            className: `p-0 ${options.disabled ? '' : 'hover:bg-secondary'} border-left border-right`,
            buttonClass: 'bg-none', icon: 'Minus' } );
        container.appendChild( substrButton.root );

        const addButton = new Button( null, '', ( value: any, e: MouseEvent ) => {
            let mult = step ?? 1;
            if ( e.shiftKey ) mult *= 10;
            this.set( this.count + mult, false, e );
        }, { disabled: options.disabled, className: `p-0 ${options.disabled ? '' : 'hover:bg-secondary'} rounded-r-lg`,
            buttonClass: 'bg-none', icon: 'Plus' } );
        container.appendChild( addButton.root );
    }
}

LX.Counter = Counter;
