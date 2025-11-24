// Button.ts @jxarco

import { LX } from './../core/Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';
import { IEvent } from './Event';

/**
 * @class Button
 * @description Button Component
 */

export class Button extends BaseComponent
{
    selectable: boolean = false;
    callback?: any;

    setState: ( v: any, b?: boolean ) => void;
    swap?: ( b?: boolean ) => void;

    constructor( name: string | null, value?: string, callback?: any, options: any = {} )
    {
        super( ComponentType.BUTTON, name, null, options );

        this.callback = callback;
        this.selectable = options.selectable ?? this.selectable;

        this.onGetValue = () => {
            const isSelected = LX.hasClass( wValue, "selected" );
            const swapInput = wValue.querySelector( "input" );
            return swapInput ? swapInput.checked : ( this.selectable ? isSelected : value );
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {

            if( ( options.swap ?? false ) )
            {
                this.setState( newValue, skipCallback );
                return;
            }

            // No-swap buttons

            wValue.innerHTML = "";

            if( options.icon )
            {
                const icon = LX.makeIcon( options.icon );
                wValue.prepend( icon );
            }
            else if( options.img )
            {
                let img = document.createElement( 'img' );
                img.src = options.img;
                wValue.prepend( img );
            }
            else
            {
                wValue.innerHTML = `<span>${ ( newValue ?? "" ) }</span>`;
            }
        };

        this.onResize = ( rect: any ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            wValue.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        // In case of swap, set if a change has to be performed
        this.setState = function( v, skipCallback ) {
            const swapInput = wValue.querySelector( "input" );

            if( swapInput )
            {
                swapInput.checked = v;
            }
            else if( this.selectable )
            {
                if( options.parent )
                {
                    options.parent.querySelectorAll(".lexbutton.selected").forEach( ( b: HTMLElement ) => { if( b == wValue ) return; b.classList.remove( "selected" ) } );
                }

                wValue.classList.toggle( "selected", v );
            }

            if( !skipCallback )
            {
                this._trigger( new IEvent( name, swapInput ? swapInput.checked : ( this.selectable ? v : value ), null ), callback );
            }
        };

        var wValue: any = document.createElement( 'button' );
        wValue.title = options.tooltip ? "" : ( options.title ?? "" );
        wValue.className = "lexbutton p-1 " + ( options.buttonClass ?? "" );
        this.root.appendChild( wValue );

        if( options.selected )
        {
            wValue.classList.add( "selected" );
        }

        if( options.img )
        {
            let img = document.createElement( 'img' );
            img.src = options.img;
            wValue.prepend( img );
        }
        else if( options.icon )
        {
            const icon = LX.makeIcon( options.icon, { iconClass: options.iconClass, svgClass: options.svgClass } );
            const iconPosition = options.iconPosition ?? "cover";

            // Default
            if( iconPosition == "cover" || ( options.swap !== undefined ) )
            {
                wValue.prepend( icon );
            }
            else
            {
                wValue.innerHTML = `<span>${ ( value || "" ) }</span>`;

                if( iconPosition == "start" )
                {
                    wValue.querySelector( "span" ).prepend( icon );
                }
                else // "end"
                {
                    wValue.querySelector( "span" ).appendChild( icon );
                }
            }

            wValue.classList.add( "justify-center" );
        }
        else
        {
            wValue.innerHTML = `<span>${ ( value || "" ) }</span>`;
        }

        if( options.fileInput )
        {
            const fileInput = document.createElement( "input" );
            fileInput.type = "file";
            fileInput.className = "file-input";
            fileInput.style.display = "none";
            wValue.appendChild( fileInput );

            fileInput.addEventListener( 'change', function( e: any ) {
                if( !e.target ) return;
                const files = e.target.files;
                if( !files.length ) return;

                const reader = new FileReader();
                if( options.fileInputType === 'text' ) reader.readAsText( files[ 0 ] );
                else if( options.fileInputType === 'buffer' ) reader.readAsArrayBuffer( files[ 0 ] );
                else if( options.fileInputType === 'bin' ) reader.readAsBinaryString( files[ 0 ] );
                else if( options.fileInputType === 'url' ) reader.readAsDataURL( files[ 0 ] );
                reader.onload = e => { callback.call( this, e.target?.result, files[ 0 ] ); } ;
            });
        }

        if( options.disabled )
        {
            this.disabled = true;
            wValue.setAttribute( "disabled", true );
        }

        let trigger = wValue;

        if( options.swap )
        {
            wValue.classList.add( "swap" );
            wValue.querySelector( "a" ).classList.add( "swap-off" );

            const input = document.createElement( "input" );
            input.className = "p-0 border-0";
            input.type = "checkbox";
            wValue.prepend( input );

            const swapIcon = LX.makeIcon( options.swap, { iconClass: "swap-on" } );
            wValue.appendChild( swapIcon );

            this.swap = function( skipCallback?: boolean ) {
                const swapInput = wValue.querySelector( "input" );
                swapInput.checked = !swapInput.checked;
                if( !skipCallback )
                {
                    trigger.click();
                }
            };
        }

        trigger.addEventListener( "click", ( e: MouseEvent ) => {
            let isSelected;
            if( this.selectable )
            {
                if( options.parent )
                {
                    options.parent.querySelectorAll(".lexbutton.selected").forEach( ( b: HTMLElement ) => { if( b == wValue ) return; b.classList.remove( "selected" ) } );
                }

                isSelected = wValue.classList.toggle('selected');
            }

            if( options.fileInput )
            {
                wValue.querySelector( ".file-input" ).click();
            }
            else if( options.mustConfirm )
            {
                new LX.PopConfirm( wValue, {
                    onConfirm: () => {
                        this._trigger( new IEvent( name, value, e ), callback );
                    },
                    side: options.confirmSide,
                    align: options.confirmAlign,
                    confirmText: options.confirmText,
                    cancelText: options.confirmCancelText,
                    title: options.confirmTitle,
                    content: options.confirmContent
                } );
            }
            else
            {
                const swapInput = wValue.querySelector( "input" );
                this._trigger( new IEvent( name, swapInput?.checked ?? ( this.selectable ? isSelected : value ), e ), callback );
            }
        });

        if( options.tooltip )
        {
            LX.asTooltip( wValue, options.title ?? name );
        }

        LX.doAsync( this.onResize.bind( this ) );
    }

    click()
    {
        const buttonDOM: HTMLButtonElement = this.root.querySelector( 'button' );
        buttonDOM.click();
    }
}

LX.Button = Button;