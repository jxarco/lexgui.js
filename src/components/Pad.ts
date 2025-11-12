// Pad.ts @jxarco

import { LX } from './../Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';
import { IEvent } from './Event';
import { vec2 } from './Vec2';

/**
 * @class Pad
 * @description Pad Component
 */

export class Pad extends BaseComponent
{
    constructor( name: string, value: number[], callback: any, options: any = {} )
    {
        super( ComponentType.PAD, name, null, options );

        this.onGetValue = () => {
            return thumb.value.xy;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            thumb.value.set( newValue[ 0 ], newValue[ 1 ] );
            _updateValue( thumb.value );
            if( !skipCallback )
            {
                this._trigger( new IEvent( name, thumb.value.xy, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        var container = document.createElement( 'div' );
        container.className = "lexpad";
        this.root.appendChild( container );

        let pad: any = document.createElement('div');
        pad.id = "lexpad-" + name;
        pad.className = "lexinnerpad";
        pad.style.width = options.padSize ?? '96px';
        pad.style.height = options.padSize ?? '96px';
        container.appendChild( pad );

        let thumb: any = document.createElement('div');
        thumb.className = "lexpadthumb";
        thumb.value = new vec2( value[ 0 ], value[ 1 ] );
        thumb.min = options.min ?? 0;
        thumb.max = options.max ?? 1;
        pad.appendChild( thumb );

        let _updateValue = ( v: vec2 ) => {
            const [ w, h ] = [ pad.offsetWidth, pad.offsetHeight ];
            const value0to1 = new vec2( LX.remapRange( v.x, thumb.min, thumb.max, 0.0, 1.0 ), LX.remapRange( v.y, thumb.min, thumb.max, 0.0, 1.0 ) );
            thumb.style.transform = `translate(calc( ${ w * value0to1.x }px - 50% ), calc( ${ h * value0to1.y }px - 50%)`;
        }

        pad.addEventListener( "mousedown", innerMouseDown );

        let that = this;

        function innerMouseDown( e: MouseEvent )
        {
            if( document.activeElement == thumb )
            {
                return;
            }

            var doc = that.root.ownerDocument;
            doc.addEventListener( 'mousemove', innerMouseMove );
            doc.addEventListener( 'mouseup', innerMouseUp );
            document.body.classList.add( 'nocursor' );
            document.body.classList.add( 'noevents' );
            e.stopImmediatePropagation();
            e.stopPropagation();
            thumb.classList.add( "active" );

            if( options.onPress )
            {
                options.onPress.bind( thumb )( e, thumb );
            }
        }

        function innerMouseMove( e: MouseEvent )
        {
            const rect = pad.getBoundingClientRect();
            const relativePosition = new vec2( e.x - rect.x, e.y - rect.y );
            relativePosition.clp( 0.0, pad.offsetWidth, relativePosition);
            const [ w, h ] = [ pad.offsetWidth, pad.offsetHeight ];
            const value0to1 = relativePosition.div( new vec2( pad.offsetWidth, pad.offsetHeight ) );

            thumb.style.transform = `translate(calc( ${ w * value0to1.x }px - 50% ), calc( ${ h * value0to1.y }px - 50%)`;
            thumb.value = new vec2( LX.remapRange( value0to1.x, 0.0, 1.0, thumb.min, thumb.max ), LX.remapRange( value0to1.y, 0.0, 1.0, thumb.min, thumb.max ) );

            that._trigger( new IEvent( name, thumb.value.xy, e ), callback );

            e.stopPropagation();
            e.preventDefault();
        }

        function innerMouseUp( e: MouseEvent )
        {
            var doc = that.root.ownerDocument;
            doc.removeEventListener( 'mousemove', innerMouseMove );
            doc.removeEventListener( 'mouseup', innerMouseUp );
            document.body.classList.remove( 'nocursor' );
            document.body.classList.remove( 'noevents' );
            thumb.classList.remove( "active" );

            if( options.onRelease )
            {
                options.onRelease.bind( thumb )( e, thumb );
            }
        }

        LX.doAsync( () => {
            this.onResize();
            _updateValue( thumb.value )
        } );
    }
}

LX.Pad = Pad;