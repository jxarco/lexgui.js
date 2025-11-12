// Card.ts @jxarco

import { LX } from './Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';
import { IEvent } from './Event';

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

        let container = document.createElement('div');
        container.className = "lexcard";
        container.style.width = "100%";
        this.root.appendChild( container );

        if( options.img )
        {
            let img = document.createElement('img');
            img.src = options.img;
            container.appendChild( img );

            if( options.link != undefined )
            {
                img.style.cursor = "pointer";
                img.addEventListener('click', function() {
                    const hLink = container.querySelector('a');
                    if( hLink )
                    {
                        hLink.click();
                    }
                });
            }
        }

        let cardNameDom = document.createElement('span');
        cardNameDom.innerText = name;
        container.appendChild( cardNameDom );

        if( options.link != undefined )
        {
            let cardLinkDom = document.createElement( 'a' );
            cardLinkDom.innerText = name;
            cardLinkDom.href = options.link;
            cardLinkDom.target = options.target ?? "";
            cardNameDom.innerText = "";
            cardNameDom.appendChild( cardLinkDom );
        }

        if( options.callback )
        {
            container.style.cursor = "pointer";
            container.addEventListener("click", ( e ) => {
                this._trigger( new IEvent( name, null, e ), options.callback );
            });
        }
    }
}

LX.Card = Card;