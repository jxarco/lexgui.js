// Card.ts @jxarco

import { IEvent } from './../core/Event';
import { LX } from './../core/Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';
import { Button } from './Button';

/**
 * @class Card
 * @description Card Component
 */

export class Card extends BaseComponent
{
    constructor( name: string, options: any = {} )
    {
        options.hideName = true;

        super( ComponentType.CARD, name, null, options );

        this.root.classList.add( 'place-content-center' );

        const container = LX.makeContainer( [ '100%', 'auto' ], 'lexcard max-w-sm flex flex-col gap-4 bg-card border-color rounded-xl py-6', '',
            this.root );

        if ( options.header )
        {
            const hasAction = options.header.action !== undefined;
            let header = LX.makeContainer( [ '100%', 'auto' ], `flex ${hasAction ? 'flex-row gap-4' : 'flex-col gap-1'} px-6`, '', container );

            if ( hasAction )
            {
                const actionBtn = new Button( null, options.header.action.name, options.header.action.callback, { buttonClass: 'secondary' } );
                header.appendChild( actionBtn.root );

                const titleDescBox = LX.makeContainer( [ '75%', 'auto' ], `flex flex-col gap-1`, '' );
                header.prepend( titleDescBox );
                header = titleDescBox;
            }

            if ( options.header.title )
            {
                LX.makeElement( 'div', 'text-sm text-foreground leading-none font-semibold', options.header.title, header );
            }

            if ( options.header.description )
            {
                LX.makeElement( 'div', 'text-xs text-muted-foreground', options.header.description, header );
            }
        }

        if ( options.content )
        {
            const content = LX.makeContainer( [ '100%', 'auto' ], 'flex flex-col gap-2 px-6', '', container );
            const elements = [].concat( options.content );
            for ( let e of ( elements as any[] ) )
            {
                content.appendChild( e.root ? e.root : e );
            }
        }

        if ( options.footer )
        {
            const footer = LX.makeContainer( [ '100%', 'auto' ], 'flex flex-col gap-1 px-6', '', container );
            const elements = [].concat( options.footer );

            for ( let e of ( elements as any[] ) )
            {
                footer.appendChild( e.root ? e.root : e );
            }
        }

        if ( options.callback )
        {
            container.classList.add( 'selectable' );
            container.style.cursor = 'pointer';
            container.addEventListener( 'click', ( e: MouseEvent ) => {
                this._trigger( new IEvent( name, null, e ), options.callback );
            } );
        }
    }
}

LX.Card = Card;
