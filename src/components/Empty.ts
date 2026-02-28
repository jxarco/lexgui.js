// Empty.ts @jxarco

import { IEvent } from './../core/Event';
import { LX } from './../core/Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';
import { Button } from './Button';

/**
 * @class Empty
 * @description Empty Component
 */

export class Empty extends BaseComponent
{
    constructor( name: string, options: any = {} )
    {
        options.hideName = true;

        super( ComponentType.EMPTY, name, null, options );

        this.root.classList.add( 'place-content-center' );

        const container = LX.makeContainer( [ '100%', 'auto' ], 'lexcard max-w-sm flex flex-col gap-4 bg-card border-color rounded-xl py-6', '',
            this.root );

        if ( options.header )
        {
            let header = LX.makeContainer( [ '100%', 'auto' ], `flex flex-col gap-4 px-6 items-center`, '', container );

            if ( options.header.icon )
            {
                const icon = LX.makeIcon( options.header.icon, { iconClass: 'bg-secondary p-2 rounded-lg!', svgClass: 'lg' } );
                header.appendChild( icon );
            }
            else if ( options.header.avatar )
            {
                const avatar = new LX.Avatar( options.header.avatar );
                header.appendChild( avatar.root );
            }

            if ( options.header.title )
            {
                LX.makeElement( 'div', 'text-center text-foreground leading-none font-medium', options.header.title, header );
            }

            if ( options.header.description )
            {
                LX.makeElement( 'div', 'text-sm text-center text-balance text-muted-foreground', options.header.description, header );
            }
        }

        if ( options.actions )
        {
            const content = LX.makeContainer( [ '100%', 'auto' ], 'flex flex-row gap-1 px-6 justify-center', '', container );
            for ( let a of ( options.actions as any[] ) )
            {
                const action = new LX.Button( null, a.name, a.callback, { buttonClass: "sm outline", ...a.options } )
                content.appendChild( action.root );
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
    }
}

LX.Empty = Empty;
