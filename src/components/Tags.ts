// Tags.ts @jxarco

import { LX } from './../Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';
import { IEvent } from './Event';

/**
 * @class Tags
 * @description Tags Component
 */

export class Tags extends BaseComponent
{
    generateTags: ( value: string[] ) => void;

    constructor( name: string, value: string, callback: any, options: any = {} )
    {
        let arrayValue: string[] = value.replace( /\s/g, '' ).split( ',' );

        let defaultValue = LX.deepCopy( arrayValue );
        super( ComponentType.TAGS, name, defaultValue, options );

        this.onGetValue = () => {
            return LX.deepCopy( value );
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            arrayValue = [].concat( newValue );
            this.generateTags( arrayValue );
            if( !skipCallback )
            {
                this._trigger( new IEvent( name, arrayValue, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            tagsContainer.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        // Show tags

        const tagsContainer = document.createElement('div');
        tagsContainer.className = "lextags";
        this.root.appendChild( tagsContainer );

        this.generateTags = ( value ) => {

            tagsContainer.innerHTML = "";

            for( let i = 0; i < value.length; ++i )
            {
                const tagName = value[ i ];
                const tag = document.createElement('span');
                tag.className = "lextag";
                tag.innerHTML = tagName;

                const removeButton = LX.makeIcon( "X", { svgClass: "sm" } );
                tag.appendChild( removeButton );

                removeButton.addEventListener( 'click', ( e: MouseEvent ) => {
                    tag.remove();
                    value.splice( value.indexOf( tagName ), 1 );
                    this.set( value, false, e );
                } );

                tagsContainer.appendChild( tag );
            }

            let tagInput = document.createElement( 'input' );
            tagInput.value = "";
            tagInput.placeholder = "Add tag...";
            tagsContainer.appendChild( tagInput );

            tagInput.onkeydown = e => {
                const val = tagInput.value.replace( /\s/g, '' );
                if( e.key == ' ' || e.key == 'Enter' )
                {
                    e.preventDefault();
                    if( !val.length || value.indexOf( val ) > -1 )
                        return;
                    value.push( val );
                    this.set( value, false, e );
                }
            };

            tagInput.focus();
        }

        this.generateTags( arrayValue );

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.Tags = Tags;