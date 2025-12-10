// Dial.ts @jxarco

import { IEvent } from './../core/Event';
import { LX } from './../core/Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';
import { CanvasDial } from './CanvasDial';

/**
 * @class Dial
 * @description Dial Component
 */

export class Dial extends BaseComponent
{
    dialInstance: CanvasDial;

    constructor( name: string, values: any[], callback: any, options: any = {} )
    {
        let defaultValues = JSON.parse( JSON.stringify( values ) );

        super( ComponentType.DIAL, name, defaultValues, options );

        this.onGetValue = () =>
        {
            return JSON.parse( JSON.stringify( dialInstance.element.value ) );
        };

        this.onSetValue = ( newValue, skipCallback, event ) =>
        {
            dialInstance.element.value = JSON.parse( JSON.stringify( newValue ) );
            dialInstance.redraw();
            if ( !skipCallback )
            {
                this._trigger( new IEvent( name, dialInstance.element.value, event ), callback );
            }
        };

        this.onResize = ( rect ) =>
        {
            const realNameWidth = this.root.domName?.style.width ?? '0px';
            container.style.width = `calc( 100% - ${realNameWidth})`;
            LX.flushCss( container );
            dialInstance.element.style.height = dialInstance.element.offsetWidth + 'px';
            dialInstance.canvas.width = dialInstance.element.offsetWidth;
            container.style.width = dialInstance.element.offsetWidth + 'px';
            dialInstance.canvas.height = dialInstance.canvas.width;
            dialInstance.redraw();
        };

        var container = document.createElement( 'div' );
        container.className = 'lexcurve';
        this.root.appendChild( container );

        options.callback = ( v: any, e: MouseEvent ) =>
        {
            this._trigger( new IEvent( name, v, e ), callback );
        };

        options.name = name;

        let dialInstance = new CanvasDial( values, options );
        container.appendChild( dialInstance.element );
        this.dialInstance = dialInstance;

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.CanvasDial = CanvasDial;
LX.Dial = Dial;
