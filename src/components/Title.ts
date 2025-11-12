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
        console.assert( name, "Can't create Title Component without text!" );

        // Note: Titles are not registered in Panel.components by now
        super( ComponentType.TITLE, null, null, options );

        this.root.className = `lextitle ${ this.root.className }`;

        if( options.icon )
        {
            let icon = LX.makeIcon( options.icon, { iconClass: "mr-2" } );
            icon.querySelector( "svg" ).style.color = options.iconColor || "";
            this.root.appendChild( icon );
        }

        let text = document.createElement( "span" );
        text.innerText = name;
        this.root.appendChild( text );

        Object.assign( this.root.style, options.style ?? {} );

        if( options.link != undefined )
        {
            let linkDom = document.createElement('a');
            linkDom.innerText = name;
            linkDom.href = options.link;
            linkDom.target = options.target ?? "";
            linkDom.className = "lextitle link";
            Object.assign( linkDom.style, options.style ?? {} );
            this.root.replaceWith( linkDom );
        }
    }
}

LX.Title = Title;