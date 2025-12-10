// ColorInput.ts @jxarco

import { IEvent } from './../core/Event';
import { LX } from './../core/Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';
import { Color } from './Color';
import { ColorPicker } from './ColorPicker';
import { Popover } from './Popover';
import { TextInput } from './TextInput';

/**
 * @class ColorInput
 * @description ColorInput Component
 */

export class ColorInput extends BaseComponent
{
    picker: ColorPicker;

    _skipTextUpdate?: boolean = false;
    _popover: Popover | undefined = undefined;

    constructor( name: string, value: any, callback: any, options: any = {} )
    {
        value = value ?? '#000000';

        const useAlpha = options.useAlpha
            ?? ( ( value.constructor === Object && 'a' in value )
                || ( value.constructor === String && [ 5, 9 ].includes( value.length ) ) );

        const componentColor = new Color( value );

        // Force always hex internally
        value = useAlpha ? componentColor.hex : componentColor.hex.substr( 0, 7 );

        super( ComponentType.COLOR, name, value, options );

        this.onGetValue = () =>
        {
            const currentColor = new Color( value );
            return options.useRGB ? currentColor.rgb : value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) =>
        {
            const newColor = new Color( newValue );

            colorSampleRGB.style.color = value = newColor.hex.substr( 0, 7 );

            if ( useAlpha )
            {
                colorSampleAlpha.style.color = value = newColor.hex;
            }

            if ( !this._skipTextUpdate )
            {
                textComponent.set( value, true, event );
            }

            if ( !skipCallback )
            {
                let retValue = value;

                if ( options.useRGB )
                {
                    retValue = newColor.rgb;

                    if ( !useAlpha )
                    {
                        delete retValue.a;
                    }
                }

                this._trigger( new IEvent( name, retValue, event ), callback );
            }
        };

        this.onResize = ( rect ) =>
        {
            const realNameWidth = this.root.domName?.style.width ?? '0px';
            container.style.width = `calc( 100% - ${realNameWidth})`;
        };

        var container = document.createElement( 'span' );
        container.className = 'lexcolor';
        this.root.appendChild( container );

        this.picker = new ColorPicker( value, {
            colorModel: options.useRGB ? 'RGB' : 'Hex',
            useAlpha,
            onChange: ( color: Color ) =>
            {
                this.set( color.hex );
            }
        } );

        let sampleContainer = LX.makeContainer( [ '18px', '18px' ], 'flex flex-row bg-contrast rounded overflow-hidden',
            '', container );
        sampleContainer.tabIndex = '1';
        sampleContainer.addEventListener( 'click', ( e: MouseEvent ) =>
        {
            if ( ( options.disabled ?? false ) )
            {
                return;
            }

            this._popover = new Popover( sampleContainer, [ this.picker ] );
        } );

        let colorSampleRGB = document.createElement( 'div' );
        colorSampleRGB.className = 'lexcolorsample';
        colorSampleRGB.style.color = value;
        sampleContainer.appendChild( colorSampleRGB );

        let colorSampleAlpha: any = null;

        if ( useAlpha )
        {
            colorSampleAlpha = document.createElement( 'div' );
            colorSampleAlpha.className = 'lexcolorsample';
            colorSampleAlpha.style.color = value;
            sampleContainer.appendChild( colorSampleAlpha );
        }
        else
        {
            colorSampleRGB.style.width = '18px';
        }

        const textComponent = new TextInput( null, value, ( v: string ) =>
        {
            this._skipTextUpdate = true;
            this.set( v );
            delete this._skipTextUpdate;
            this.picker.fromHexColor( v );
        }, { width: 'calc( 100% - 24px )', disabled: options.disabled } );

        textComponent.root.style.marginLeft = '6px';
        container.appendChild( textComponent.root );

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.Color = Color;
LX.ColorPicker = ColorPicker;
LX.ColorInput = ColorInput;
