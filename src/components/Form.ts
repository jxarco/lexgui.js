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
    data: any;
    formData: any = {};
    primaryButton: Button | undefined;

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
            return this.formData;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            this.formData = newValue;
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
                    this.formData[entry] = value;
                    if ( entryData.submit && event?.constructor === KeyboardEvent )
                    {
                        this.submit();
                    }
                }, entryData );
            container.appendChild( entryData.textComponent.root );

            this.formData[entry] = entryData.constructor == Object ? entryData.value : entryData;
        }

        const buttonContainer = LX.makeContainer( [ '100%', 'auto' ], 'flex flex-row mt-2', '', container );

        if ( options.secondaryActionName || options.secondaryActionCallback )
        {
            const secondaryButton = new Button( null, options.secondaryActionName ?? 'Cancel', ( value: any, event: MouseEvent ) => {
                if ( options.secondaryActionCallback )
                {
                    options.secondaryActionCallback( this.formData, event );
                }
            }, { width: '100%', minWidth: '0', buttonClass: options.secondaryButtonClass ?? 'secondary' } );

            buttonContainer.appendChild( secondaryButton.root );
        }

        // This is basically the "submit" button
        this.primaryButton = new Button( null, options.primaryActionName ?? 'Submit', ( value: any, event: MouseEvent ) => {

            // Force sync before testing text patterns
            this.syncInputs();

            const errors = [];

            for ( let entry in data )
            {
                let entryData = data[entry];

                const pattern = entryData.pattern;
                const matchField = pattern?.fieldMatchName ? this.formData[pattern.fieldMatchName] : undefined;

                if ( !entryData.textComponent.valid( undefined, matchField ) )
                {
                    const err = { entry, type: 'input_not_valid', messages: [] };
                    if ( pattern )
                    {
                        err.messages = LX.validateValueAtPattern(
                            this.formData[entry],
                            pattern,
                            matchField
                        );
                    }

                    errors.push( err );
                }
            }

            if ( callback )
            {
                callback( this.formData, errors, event );
            }
        }, { width: '100%', minWidth: '0', buttonClass: options.primaryButtonClass ?? 'primary' } );

        buttonContainer.appendChild( this.primaryButton.root );

        if( !( options.skipEnterSubmit ?? false ) )
        {
            this.root.addEventListener( 'keydown', ( e: KeyboardEvent ) => {
                if ( e.key !== 'Enter' || e.shiftKey ) return;

                const target = e.target as HTMLElement;
                if ( target.tagName === 'TEXTAREA' ) return;

                e.preventDefault();

                this.submit();
            });
        }

        this.data = data;
    }

    submit()
    {
        this.syncInputs();

        this.primaryButton?.click();
    }

    syncInputs()
    {
        for ( const entry in this.data )
        {
            const component = this.data[ entry ].textComponent;
            if ( component instanceof TextInput )
            {
                component.syncFromDOM();
                this.formData[ entry ] = component.value();
            }
        }
    }
}

LX.Form = Form;
