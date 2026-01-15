// Checkbox.ts @jxarco

import { IEvent } from './../core/Event';
import { LX } from './../core/Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';

/**
 * @class Checkbox
 * @description Checkbox Component
 */

export class Checkbox extends BaseComponent
{
    constructor( name: string | null, value: boolean, callback: any, options: any = {} )
    {
        if ( !name && !options.label )
        {
            throw ( 'Set Component Name or at least a label!' );
        }

        super( ComponentType.CHECKBOX, name, value, options );

        this.onGetValue = () => {
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            if ( newValue == value )
            {
                return;
            }

            checkbox.checked = value = newValue;

            // Update suboptions menu
            this.root.querySelector( '.lexcheckboxsubmenu' )?.toggleAttribute( 'hidden', !newValue );

            if ( !skipCallback )
            {
                this._trigger( new IEvent( name, newValue, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = this.root.domName?.style.width ?? '0px';
            container.style.width = options.inputWidth ?? `calc( 100% - ${realNameWidth})`;
        };

        var container = document.createElement( 'div' );
        container.className = 'flex items-center gap-2 my-0 mx-auto [&_span]:truncate [&_span]:flex-auto-fill';
        this.root.appendChild( container );

        let checkbox: HTMLInputElement = LX.makeElement( 'input', LX.mergeClass( 'lexcheckbox rounded-xl', options.className ?? 'primary' ) );
        checkbox.type = 'checkbox';
        checkbox.checked = value;
        checkbox.disabled = this.disabled;
        container.appendChild( checkbox );

        let valueName = LX.makeElement( 'span', 'text-sm', options.label ?? 'On', container );

        checkbox.addEventListener( 'change', ( e ) => {
            this.set( checkbox.checked, false, e );
        } );

        if ( options.suboptions )
        {
            let suboptions = LX.makeElement( 'div', 'lexcheckboxsubmenu' );
            suboptions.toggleAttribute( 'hidden', !checkbox.checked );

            const suboptionsPanel = new LX.Panel();
            suboptionsPanel.queue( suboptions );
            options.suboptions.call( this, suboptionsPanel );
            suboptionsPanel.clearQueue();

            this.root.appendChild( suboptions );
        }

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.Checkbox = Checkbox;
