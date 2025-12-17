// Form.ts @jxarco

import { LX } from './../core/Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';
import { Button } from './Button';
import { TextInput } from './TextInput';

/**
 * @class Form
 * @description Form Component
 */

export class Form extends BaseComponent
{
    constructor( name: string, data: any, callback: any, options: any = {} )
    {
        if ( data.constructor != Object )
        {
            console.error( 'Form data must be an Object' );
            return;
        }

        // Always hide name for this one
        options.hideName = true;

        super( ComponentType.FORM, name, null, options );

        this.onGetValue = () => {
            return container.formData;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            container.formData = newValue;
            const entries = container.querySelectorAll( '.lexcomponent' );
            for ( let i = 0; i < entries.length; ++i )
            {
                const entry = entries[i];
                if ( entry.jsInstance.type != ComponentType.TEXT )
                {
                    continue;
                }
                let entryName = entries[i].querySelector( '.lexcomponentname' ).innerText;
                let entryInput = entries[i].querySelector( '.lextext input' );
                entryInput.value = newValue[entryName] ?? '';
                BaseComponent._dispatchEvent( entryInput, 'focusout', skipCallback );
            }
        };

        let container: any = document.createElement( 'div' );
        container.className = 'flex flex-col gap-1';
        container.style.width = '100%';
        container.formData = {};
        this.root.appendChild( container );

        for ( let entry in data )
        {
            let entryData = data[entry];

            if ( entryData.constructor != Object )
            {
                const oldValue = LX.deepCopy( entryData );
                entryData = { value: oldValue };
                data[entry] = entryData;
            }

            entryData.width = '100%';
            entryData.placeholder = entryData.placeholder ?? ( entryData.label ?? `Enter ${entry}` );
            entryData.ignoreValidation = true;

            if ( !( options.skipLabels ?? false ) )
            {
                const label = new TextInput( null, entryData.label ?? entry, null, { disabled: true,
                    inputClass: 'formlabel text-xs bg-none text-muted-foreground' } );
                container.appendChild( label.root );
            }

            entryData.textComponent = new TextInput( null, entryData.constructor == Object ? entryData.value : entryData,
                ( value: string, event: any ) => {
                    container.formData[entry] = value;
                    if ( entryData.submit && event.constructor === KeyboardEvent )
                    {
                        primaryButton?.click();
                    }
                }, entryData );
            container.appendChild( entryData.textComponent.root );

            container.formData[entry] = entryData.constructor == Object ? entryData.value : entryData;
        }

        const buttonContainer = LX.makeContainer( [ '100%', 'auto' ], 'flex flex-row mt-2', '', container );

        if ( options.secondaryActionName || options.secondaryActionCallback )
        {
            const secondaryButton = new Button( null, options.secondaryActionName ?? 'Cancel', ( value: any, event: MouseEvent ) => {
                if ( options.secondaryActionCallback )
                {
                    options.secondaryActionCallback( container.formData, event );
                }
            }, { width: '100%', minWidth: '0', buttonClass: options.secondaryButtonClass ?? 'secondary' } );

            buttonContainer.appendChild( secondaryButton.root );
        }

        const primaryButton = new Button( null, options.primaryActionName ?? 'Submit', ( value: any, event: MouseEvent ) => {
            const errors = [];

            for ( let entry in data )
            {
                let entryData = data[entry];

                const pattern = entryData.pattern;
                const matchField = pattern?.fieldMatchName ? container.formData[pattern.fieldMatchName] : undefined;

                if ( !entryData.textComponent.valid( undefined, matchField ) )
                {
                    const err = { entry, type: 'input_not_valid', messages: [] };
                    if ( pattern )
                    {
                        err.messages = LX.validateValueAtPattern(
                            container.formData[entry],
                            pattern,
                            matchField
                        );
                    }

                    errors.push( err );
                }
            }

            if ( callback )
            {
                callback( container.formData, errors, event );
            }
        }, { width: '100%', minWidth: '0', buttonClass: options.primaryButtonClass ?? 'primary' } );

        buttonContainer.appendChild( primaryButton.root );
    }
}

LX.Form = Form;
