// Toggle.ts @jxarco

import { IEvent } from './../core/Event';
import { LX } from './../core/Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';

/**
 * @class Toggle
 * @description Toggle Component
 */

export class Toggle extends BaseComponent
{
    constructor( name: string, value: boolean, callback: any, options: any = {} )
    {
        if ( !name && !options.label )
        {
            throw ( 'Set Component Name or at least a label!' );
        }

        super( ComponentType.TOGGLE, name, value, options );

        this.onGetValue = () => {
            return toggle.checked;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            if ( newValue == value )
            {
                return;
            }

            toggle.checked = value = newValue;

            // Update suboptions menu
            this.root.querySelector( '.lextogglesubmenu' )?.toggleAttribute( 'hidden', !newValue );

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
        container.className = 'flex flex-row gap-2 items-center';
        this.root.appendChild( container );

        let toggle: any = LX.makeElement( 'input',
            LX.mergeClass( 'lextoggle relative inline-grid place-content-center cursor-pointer shrink-0 select-none disabled:pointer-events-none disabled:opacity-50', options.className ) );
        toggle.type = 'checkbox';
        toggle.checked = value;
        toggle.iValue = value;
        toggle.disabled = this.disabled;
        container.appendChild( toggle );

        let valueName = document.createElement( 'span' );
        valueName.className = 'font-medium w-full overflow-hidden truncate';
        valueName.innerHTML = options.label ?? 'On';
        container.appendChild( valueName );

        toggle.addEventListener( 'change', ( e: InputEvent ) => {
            this.set( toggle.checked, false, e );
        } );

        if ( options.suboptions )
        {
            let suboptions = LX.makeElement( 'div', 'lextogglesubmenu w-full p-2' );
            suboptions.toggleAttribute( 'hidden', !toggle.checked );

            const suboptionsPanel = new LX.Panel();
            suboptionsPanel.queue( suboptions );
            options.suboptions.call( this, suboptionsPanel );
            suboptionsPanel.clearQueue();

            this.root.appendChild( suboptions );
        }

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.Toggle = Toggle;
