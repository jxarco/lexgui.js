// ArrayInput.ts @jxarco

import { IEvent } from './../core/Event';
import { LX } from './../core/Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';
import { Button } from './Button';
import { NumberInput } from './NumberInput';
import { Select } from './Select';
import { TextInput } from './TextInput';

/**
 * @class ArrayInput
 * @description ArrayInput Component
 */

export class ArrayInput extends BaseComponent
{
    _updateItems: () => void;

    constructor( name: string, values: any[] = [], callback: any, options: any = {} )
    {
        options.nameWidth = 'auto';

        super( ComponentType.ARRAY, name, null, options );

        this.onGetValue = () => {
            return values;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            values = newValue;
            this._updateItems();
            if ( !skipCallback )
            {
                this._trigger( new IEvent( name, values, event ), callback );
            }
        };

        this.onSetDisabled = ( disabled: boolean ) => {
            if( this.root.dataset['opened'] == 'true' && disabled )
            {
                this.root.dataset['opened'] = false;
                this.root.querySelector( '.lexarrayitems' ).toggleAttribute( 'hidden', true );
            }
            toggleButton.setDisabled( disabled );
        };

        // Add open array button

        let container = document.createElement( 'div' );
        container.className = 'lexarray shrink-1 grow-1 ml-4';
        container.style.width = 'auto';
        this.root.appendChild( container );
        this.root.dataset['opened'] = false;

        let buttonName = `Array (size ${values.length})`;

        const toggleButton = new Button( null, buttonName, () => {
            this.root.dataset['opened'] = this.root.dataset['opened'] == 'true' ? false : true;
            this.root.querySelector( '.lexarrayitems' ).toggleAttribute( 'hidden' );
        }, { buttonClass: 'outline [&_a]:ml-auto' } );
        toggleButton.root.querySelector( 'button' ).appendChild( LX.makeIcon( 'Down', { svgClass: 'sm' } ) );
        container.appendChild( toggleButton.root );

        // Show elements

        let arrayItems = document.createElement( 'div' );
        arrayItems.className = 'lexarrayitems';
        arrayItems.toggleAttribute( 'hidden', true );
        this.root.appendChild( arrayItems );

        this._updateItems = () => {
            // Update num items
            let button = this.root.querySelector( 'button' );
            for ( let node of button.childNodes )
            {
                if ( node.nodeType === Node.TEXT_NODE )
                {
                    node.textContent = `Array (size ${values.length})`;
                    break;
                }
            }

            // Update inputs
            arrayItems.innerHTML = '';

            for ( let i = 0; i < values.length; ++i )
            {
                const value = values[i];
                let baseclass = options.innerValues ? 'select' : value.constructor;
                let component: any = null;

                switch ( baseclass )
                {
                    case String:
                        component = new TextInput( i + '', value, function( value: string )
                        {
                            values[i] = value;
                            callback( values );
                        }, { nameWidth: '12px', className: 'p-0', disabled: this.disabled, skipReset: true } );
                        break;
                    case Number:
                        component = new NumberInput( i + '', value, function( value: number )
                        {
                            values[i] = value;
                            callback( values );
                        }, { nameWidth: '12px', className: 'p-0', disabled: this.disabled, skipReset: true } );
                        break;
                    case 'select':
                        component = new Select( i + '', options.innerValues, value, function( value: any )
                        {
                            values[i] = value;
                            callback( values );
                        }, { nameWidth: '12px', className: 'p-0', disabled: this.disabled, skipReset: true } );
                        break;
                }

                console.assert( component, `Value of type ${baseclass} cannot be modified in ArrayInput` );

                arrayItems.appendChild( component.root );

                if ( !this.disabled )
                {
                    const removeComponent = new Button( null, '', ( v: any, event: MouseEvent ) => {
                        values.splice( values.indexOf( value ), 1 );
                        this._updateItems();
                        this._trigger( new IEvent( name, values, event ), callback );
                    }, { buttonClass: 'ghost sm p-0', title: 'Remove item', icon: 'Trash2' } );
                    component.root.appendChild( removeComponent.root );
                }
            }

            if ( !this.disabled )
            {
                const addButton = new Button( null, LX.makeIcon( 'Plus', { svgClass: 'sm' } ).innerHTML + 'Add item',
                    ( v: any, event: MouseEvent ) => {
                        values.push( options.innerValues ? options.innerValues[0] : '' );
                        this._updateItems();
                        this._trigger( new IEvent( name, values, event ), callback );
                    }, { buttonClass: 'ghost' } );

                arrayItems.appendChild( addButton.root );
            }
        };

        this._updateItems();
    }
}

LX.ArrayInput = ArrayInput;
