// FileInput.ts @jxarco

import { LX } from './../core/Namespace';
import { Panel } from '../core/Panel';
import { BaseComponent, ComponentType } from './BaseComponent';
import { Button } from './Button';

/**
 * @class FileInput
 * @description FileInput Component
 */

export class FileInput extends BaseComponent
{
    constructor( name: string, callback: any, options: any = {} )
    {
        super( ComponentType.FILE, name, null, options );

        let local = options.local ?? true;
        let type = options.type ?? 'text';
        let read = options.read ?? true;

        this.onResize = ( rect ) =>
        {
            const realNameWidth = this.root.domName?.style.width ?? '0px';
            input.style.width = `calc( 100% - ${realNameWidth})`;
        };

        // Create hidden input
        let input = document.createElement( 'input' );
        input.className = 'lexfileinput';
        input.type = 'file';
        input.disabled = options.disabled ?? false;
        this.root.appendChild( input );

        if ( options.placeholder )
        {
            input.placeholder = options.placeholder;
        }

        input.addEventListener( 'change', function( e: any )
        {
            const files = e.target.files;
            if ( !files.length ) return;
            if ( read )
            {
                if ( options.onBeforeRead )
                {
                    options.onBeforeRead();
                }

                const reader = new FileReader();

                if ( type === 'text' ) reader.readAsText( files[0] );
                else if ( type === 'buffer' ) reader.readAsArrayBuffer( files[0] );
                else if ( type === 'bin' ) reader.readAsBinaryString( files[0] );
                else if ( type === 'url' ) reader.readAsDataURL( files[0] );

                reader.onload = e =>
                {
                    callback.call( this, e.target?.result, files[0] );
                };
            }
            else
            {
                callback( files[0] );
            }
        } );

        input.addEventListener( 'cancel', function( e )
        {
            callback( null );
        } );

        if ( local )
        {
            let settingsDialog: any = null;

            const settingButton = new Button( null, '', () =>
            {
                if ( settingsDialog )
                {
                    return;
                }

                settingsDialog = new LX.Dialog( 'Load Settings', ( p: Panel ) =>
                {
                    p.addSelect( 'Type', [ 'text', 'buffer', 'bin', 'url' ], type, ( v: any ) =>
                    {
                        type = v;
                    } );
                    p.addButton( null, 'Reload', () =>
                    {
                        input.dispatchEvent( new Event( 'change' ) );
                    } );
                }, { onclose: ( root: HTMLElement ) =>
                {
                    root.remove();
                    settingsDialog = null;
                } } );
            }, { skipInlineCount: true, title: 'Settings', disabled: options.disabled, icon: 'Settings' } );

            this.root.appendChild( settingButton.root );
        }

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.FileInput = FileInput;
