// Checkbox.ts @jxarco

import { LX } from './../core/Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';
import { IEvent } from './Event';

/**
 * @class Checkbox
 * @description Checkbox Component
 */

export class Checkbox extends BaseComponent
{
    constructor( name: string | null, value: boolean, callback: any, options: any = {} )
    {
        if( !name && !options.label )
        {
            throw( "Set Component Name or at least a label!" );
        }

        super( ComponentType.CHECKBOX, name, value, options );

        this.onGetValue = () => {
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {

            if( newValue == value )
            {
                return;
            }

            checkbox.checked = value = newValue;

            // Update suboptions menu
            this.root.querySelector( ".lexcheckboxsubmenu" )?.toggleAttribute( 'hidden', !newValue );

            if( !skipCallback )
            {
                this._trigger( new IEvent( name, newValue, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = options.inputWidth ?? `calc( 100% - ${ realNameWidth })`;
        };

        var container = document.createElement( "div" );
        container.className = "lexcheckboxcont";
        this.root.appendChild( container );

        let checkbox = document.createElement( "input" );
        checkbox.type = "checkbox";
        checkbox.className = "lexcheckbox " + ( options.className ?? "primary" );
        checkbox.checked = value;
        checkbox.disabled = options.disabled ?? false;
        container.appendChild( checkbox );

        let valueName = document.createElement( "span" );
        valueName.className = "checkboxtext";
        valueName.innerHTML = options.label ?? "On";
        container.appendChild( valueName );

        checkbox.addEventListener( "change" , e => {
            this.set( checkbox.checked, false, e );
        });

        if( options.suboptions )
        {
            let suboptions = document.createElement( "div" );
            suboptions.className = "lexcheckboxsubmenu";
            suboptions.toggleAttribute( "hidden", !checkbox.checked );

            const suboptionsPanel = new LX.Panel();
            suboptionsPanel.queue( suboptions );
            options.suboptions.call(this, suboptionsPanel);
            suboptionsPanel.clearQueue();

            this.root.appendChild( suboptions );
        }

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.Checkbox = Checkbox;