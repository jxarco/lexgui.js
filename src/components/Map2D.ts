// Map2D.ts @jxarco

import { LX } from './Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';
import { CanvasMap2D } from './CanvasMap2D';
import { Button } from './Button';
import { Popover } from './Popover';

/**
 * @class Map2D
 * @description Map2D Component
 */

export class Map2D extends BaseComponent
{
    map2d: CanvasMap2D;
    _popover: Popover | null = null;

    constructor( name: string, points: any[], callback: any, options: any = {} )
    {
        super( ComponentType.MAP2D, name, null, options );

        this.onGetValue = () => {
            return this.map2d.weightsObj;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            // if( !skipCallback )
            // {
            //     this._trigger( new IEvent( name, curveInstance.element.value, event ), callback );
            // }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        var container = document.createElement( "div" );
        container.className = "lexmap2d";
        this.root.appendChild( container );

        this.map2d = new CanvasMap2D( points, callback, options );

        const calendarIcon = LX.makeIcon( "SquareMousePointer" );
        const calendarButton = new Button( null, "Open Map", () => {
            this._popover = new Popover( calendarButton.root, [ this.map2d ] );
        }, { buttonClass: `flex flex-row px-3 fg-secondary justify-between` } );

        calendarButton.root.querySelector( "button" ).appendChild( calendarIcon );
        container.appendChild( calendarButton.root );

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.Map2D = Map2D;