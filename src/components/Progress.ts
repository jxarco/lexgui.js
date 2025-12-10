// Button.ts @jxarco

import { IEvent } from './../core/Event';
import { LX } from './../core/Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';

/**
 * @class Progress
 * @description Progress Component
 */

export class Progress extends BaseComponent
{
    constructor( name: string, value: number, options: any = {} )
    {
        super( ComponentType.PROGRESS, name, value, options );

        this.onGetValue = () =>
        {
            return progress.value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) =>
        {
            newValue = LX.clamp( newValue, progress.min, progress.max );
            this.root.querySelector( 'meter' ).value = newValue;
            _updateColor();
            if ( this.root.querySelector( 'span' ) )
            {
                this.root.querySelector( 'span' ).innerText = newValue;
            }

            if ( !skipCallback )
            {
                this._trigger( new IEvent( name, newValue, event ), options.callback );
            }
        };

        this.onResize = ( rect ) =>
        {
            const realNameWidth = this.root.domName?.style.width ?? '0px';
            container.style.width = `calc( 100% - ${realNameWidth})`;
        };

        const container = document.createElement( 'div' );
        container.className = 'lexprogress';
        this.root.appendChild( container );

        // add slider (0-1 if not specified different )

        let progress: any = document.createElement( 'meter' );
        progress.id = 'lexprogressbar-' + name;
        progress.className = 'lexprogressbar';
        progress.step = 'any';
        progress.min = options.min ?? 0;
        progress.max = options.max ?? 1;
        progress.low = options.low ?? progress.low;
        progress.high = options.high ?? progress.high;
        progress.optimum = options.optimum ?? progress.optimum;
        progress.value = value;
        container.appendChild( progress );

        const _updateColor = () =>
        {
            let backgroundColor = LX.getThemeColor( 'global-selected' );

            if ( progress.low != undefined && progress.value < progress.low )
            {
                backgroundColor = LX.getThemeColor( 'global-color-error' );
            }
            else if ( progress.high != undefined && progress.value < progress.high )
            {
                backgroundColor = LX.getThemeColor( 'global-color-warning' );
            }

            progress.style.background = `color-mix(in srgb, ${backgroundColor} 20%, transparent)`;
        };

        if ( options.showValue )
        {
            const oldSpan: HTMLElement | null = document.getElementById( 'progressvalue-' + name );
            if ( oldSpan )
            {
                oldSpan.remove();
            }

            let span: any = document.createElement( 'span' );
            span.id = 'progressvalue-' + name;
            span.style.padding = '0px 5px';
            span.innerText = value;
            container.appendChild( span );
        }

        if ( options.editable ?? false )
        {
            progress.classList.add( 'editable' );

            let innerMouseDown = ( e: MouseEvent ) =>
            {
                var doc = this.root.ownerDocument;
                doc.addEventListener( 'mousemove', innerMouseMove );
                doc.addEventListener( 'mouseup', innerMouseUp );
                document.body.classList.add( 'noevents' );
                progress.classList.add( 'grabbing' );
                e.stopImmediatePropagation();
                e.stopPropagation();

                const rect = progress.getBoundingClientRect();
                const newValue = LX.round( LX.remapRange( e.offsetX, 0, rect.width, progress.min, progress.max ) );
                this.set( newValue, false, e );
            };

            let innerMouseMove = ( e: MouseEvent ) =>
            {
                let dt = e.movementX;

                if ( dt != 0 )
                {
                    const rect = progress.getBoundingClientRect();
                    const newValue = LX.round(
                        LX.remapRange( e.offsetX - rect.x, 0, rect.width, progress.min, progress.max )
                    );
                    this.set( newValue, false, e );
                }

                e.stopPropagation();
                e.preventDefault();
            };

            let innerMouseUp = ( e: MouseEvent ) =>
            {
                var doc = this.root.ownerDocument;
                doc.removeEventListener( 'mousemove', innerMouseMove );
                doc.removeEventListener( 'mouseup', innerMouseUp );
                document.body.classList.remove( 'noevents' );
                progress.classList.remove( 'grabbing' );
            };

            progress.addEventListener( 'mousedown', innerMouseDown );
        }

        _updateColor();

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.Progress = Progress;
