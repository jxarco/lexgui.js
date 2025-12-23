// Tags.ts @jxarco

import { IEvent } from './../core/Event';
import { LX } from './../core/Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';

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

        this.options.skipDuplicates = options.skipDuplicates ?? true;

        this.onGetValue = () => {
            return LX.deepCopy( value );
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            arrayValue = [].concat( newValue );
            this.generateTags( arrayValue );
            if ( !skipCallback )
            {
                this._trigger( new IEvent( name, arrayValue, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = this.root.domName?.style.width ?? '0px';
            tagsContainer.style.width = `calc( 100% - ${realNameWidth})`;
        };

        // Show tags

        const tagsContainer = document.createElement( 'div' );
        tagsContainer.className = 'inline-flex flex-wrap gap-1 bg-card/50 rounded-lg pad-xs [&_input]:w-2/3';
        this.root.appendChild( tagsContainer );

        this.generateTags = ( value ) => {
            tagsContainer.innerHTML = '';

            for ( let i = 0; i < value.length; ++i )
            {
                const tagName = value[i];
                const tag = LX.makeElement( 'span',
                    'lextag bg-primary px-2 py-1 rounded-xl min-w-2 justify-center text-primary-foreground gap-1 text-sm select-none', tagName );
                const removeButton = LX.makeIcon( 'X', { svgClass: 'sm' } );
                tag.appendChild( removeButton );

                removeButton.addEventListener( 'click', ( e: MouseEvent ) => {
                    tag.remove();
                    value.splice( value.indexOf( tagName ), 1 );
                    this.set( value, false, e );
                } );

                tagsContainer.appendChild( tag );
            }

            let tagInput = document.createElement( 'input' );
            tagInput.value = '';
            tagInput.placeholder = 'Add tag...';
            tagsContainer.appendChild( tagInput );

            tagInput.onkeydown = ( e ) => {
                if ( e.key == ' ' || e.key == 'Enter' )
                {
                    const val = tagInput.value.replace( /\s/g, '' );
                    e.preventDefault();
                    if ( !val.length || ( options.skipDuplicates && value.indexOf( val ) > -1 ) )
                    {
                        return;
                    }
                    value.push( val );
                    this.set( value, false, e );
                    tagsContainer.querySelector( 'input' )?.focus(); // generateTags creates a new tagInput instance
                }
            };
        };

        this.generateTags( arrayValue );

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.Tags = Tags;
