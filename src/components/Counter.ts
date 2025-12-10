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
    constructor( name: string, value: number, callback: any, options: any = {} )
    {
        super( ComponentType.COUNTER, name, value, options );

        this.onGetValue = () =>
        {
            return counterText.count;
        };

        this.onSetValue = ( newValue, skipCallback, event ) =>
        {
            newValue = LX.clamp( newValue, min, max );
            counterText.count = newValue;
            counterText.innerHTML = newValue;
            if ( !skipCallback )
            {
                this._trigger( new IEvent( name, newValue, event ), callback );
            }
        };

        const min = options.min ?? 0;
        const max = options.max ?? 100;
        const step = options.step ?? 1;

        const container = document.createElement( 'div' );
        container.className = 'lexcounter';
        this.root.appendChild( container );

        const substrButton = new Button( null, '', ( value: any, e: MouseEvent ) =>
        {
            let mult = step ?? 1;
            if ( e.shiftKey ) mult *= 10;
            this.set( counterText.count - mult, false, e );
        }, { skipInlineCount: true, title: 'Minus', icon: 'Minus' } );

        container.appendChild( substrButton.root );

        const containerBox = document.createElement( 'div' );
        containerBox.className = 'lexcounterbox';
        container.appendChild( containerBox );

        const counterText: any = document.createElement( 'span' );
        counterText.className = 'lexcountervalue';
        counterText.innerHTML = value;
        counterText.count = value;
        containerBox.appendChild( counterText );

        if ( options.label )
        {
            const counterLabel = document.createElement( 'span' );
            counterLabel.className = 'lexcounterlabel';
            counterLabel.innerHTML = options.label;
            containerBox.appendChild( counterLabel );
        }

        const addButton = new Button( null, '', ( value: any, e: MouseEvent ) =>
        {
            let mult = step ?? 1;
            if ( e.shiftKey ) mult *= 10;
            this.set( counterText.count + mult, false, e );
        }, { skipInlineCount: true, title: 'Plus', icon: 'Plus' } );
        container.appendChild( addButton.root );
    }
}

LX.Counter = Counter;
