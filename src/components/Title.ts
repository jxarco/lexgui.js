// Title.ts @jxarco

import { LX } from './../core/Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';

/**
 * @class Title
 * @description Title Component
 */

export class Title extends BaseComponent
{
    constructor( name: string, options: any = {} )
    {
        console.assert( name.length !== 0, "Can't create Title Component without text!" );

        // Note: Titles are not registered in Panel.components by now
        super( ComponentType.TITLE, null, null, options );

        const cn = 'lextitle !w-fit bg-muted text-foreground text-sm font-semibold leading-normal m-3 flex content-center rounded-xl select-none';

        this.root.className = LX.mergeClass( cn, options.className );

        if ( options.icon )
        {
            let icon = LX.makeIcon( options.icon, { iconClass: 'mr-2' } );
            icon.querySelector( 'svg' ).style.color = options.iconColor || '';
            this.root.appendChild( icon );
        }

        let text = document.createElement( 'span' );
        text.innerText = name;
        this.root.appendChild( text );

        if ( options.link != undefined )
        {
            let linkDom = LX.makeElement( 'a', `${cn} link`, name );
            linkDom.href = options.link;
            linkDom.target = options.target ?? '';
            this.root.replaceWith( linkDom );
            this.root = linkDom;
        }

        Object.assign( this.root.style, options.style ?? {} );
    }
}

LX.Title = Title;
