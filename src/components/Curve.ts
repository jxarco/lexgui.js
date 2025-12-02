// Curve.ts @jxarco

import { LX } from './../core/Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';
import { IEvent } from './../core/Event';
import { CanvasCurve } from './CanvasCurve';

/**
 * @class Curve
 * @description Curve Component
 */

export class Curve extends BaseComponent
{
    curveInstance: CanvasCurve;

    constructor( name: string, values: any[], callback: any, options: any = {} )
    {
        let defaultValues = JSON.parse( JSON.stringify( values ) );

        super( ComponentType.CURVE, name, defaultValues, options );

        this.onGetValue = () => {
            return JSON.parse(JSON.stringify( curveInstance.element.value ));
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            curveInstance.element.value = JSON.parse( JSON.stringify( newValue ) );
            curveInstance.redraw();
            if( !skipCallback )
            {
                this._trigger( new IEvent( name, curveInstance.element.value, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        var container = document.createElement( "div" );
        container.className = "lexcurve";
        this.root.appendChild( container );

        options.callback = ( v: any[], e: MouseEvent ) => {
            this._trigger( new IEvent( name, v, e ), callback );
        };

        options.name = name;

        let curveInstance = new CanvasCurve( values, options );
        container.appendChild( curveInstance.element );
        this.curveInstance = curveInstance;

        const observer = new ResizeObserver( entries => {
            for ( const entry of entries )
            {
                curveInstance.canvas.width = entry.contentRect.width;
                curveInstance.redraw();
            }
        });

        observer.observe( container );

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.CanvasCurve = CanvasCurve;
LX.Curve = Curve;