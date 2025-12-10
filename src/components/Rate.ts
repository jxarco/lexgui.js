// Rate.ts @jxarco

import { IEvent } from './../core/Event';
import { LX } from './../core/Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';

/**
 * @class Rate
 * @description Rate Component
 */

export class Rate extends BaseComponent
{
    constructor( name: string, value: number, callback: any, options: any = {} )
    {
        const allowHalf = options.allowHalf ?? false;

        if ( !allowHalf )
        {
            value = Math.floor( value );
        }

        super( ComponentType.RATE, name, value, options );

        this.onGetValue = () =>
        {
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) =>
        {
            value = newValue;

            _updateStars( value );

            if ( !skipCallback )
            {
                this._trigger( new IEvent( name, newValue, event ), callback );
            }
        };

        this.onResize = ( rect ) =>
        {
            const realNameWidth = this.root.domName?.style.width ?? '0px';
            container.style.width = `calc( 100% - ${realNameWidth})`;
        };

        const container = document.createElement( 'div' );
        container.className = 'lexrate relative';
        this.root.appendChild( container );

        const starsContainer = LX.makeContainer( [ 'fit-content', 'auto' ], 'flex flex-row gap-1', '', container );
        const filledStarsContainer = LX.makeContainer( [ 'fit-content', 'auto' ],
            'absolute top-0 flex flex-row gap-1 pointer-events-none', '', container );
        const halfStarsContainer = LX.makeContainer( [ 'fit-content', 'auto' ],
            'absolute top-0 flex flex-row gap-1 pointer-events-none', '', container );

        starsContainer.addEventListener( 'mousemove', ( e: MouseEvent ) =>
        {
            const star: any = e.target;
            const idx = star.dataset['idx'];

            if ( idx !== undefined )
            {
                const rect = star.getBoundingClientRect();
                const half = allowHalf && e.offsetX < ( rect.width * 0.5 );
                _updateStars( idx - ( half ? 0.5 : 0.0 ) );
            }
        }, false );

        starsContainer.addEventListener( 'mouseleave', ( e: MouseEvent ) =>
        {
            _updateStars( value );
        }, false );

        // Create all layers of stars

        for ( let i = 0; i < 5; ++i )
        {
            const starIcon = LX.makeIcon( 'Star', { svgClass: `lg fill-current fg-secondary` } );
            starIcon.dataset['idx'] = i + 1;
            starsContainer.appendChild( starIcon );

            starIcon.addEventListener( 'click', ( e: MouseEvent ) =>
            {
                const star: any = e.target;
                const rect = star.getBoundingClientRect();
                const half = allowHalf && e.offsetX < ( rect.width * 0.5 );
                this.set( parseFloat( star.dataset['idx'] ) - ( half ? 0.5 : 0.0 ) );
            }, false );

            const filledStarIcon = LX.makeIcon( 'Star', { svgClass: `lg fill-current fg-yellow-500` } );
            filledStarsContainer.appendChild( filledStarIcon );

            const halfStarIcon = LX.makeIcon( 'StarHalf', { svgClass: `lg fill-current fg-yellow-500` } );
            halfStarsContainer.appendChild( halfStarIcon );
        }

        const _updateStars = ( v: number ) =>
        {
            for ( let i = 0; i < 5; ++i )
            {
                const filled = v > ( i + 0.5 );
                const starIcon = filledStarsContainer.childNodes[i];
                const halfStarIcon = halfStarsContainer.childNodes[i];
                if ( filled )
                {
                    starIcon.style.opacity = 1;
                }
                else
                {
                    starIcon.style.opacity = 0;

                    const halfFilled = allowHalf && ( v > i );
                    if ( halfFilled )
                    {
                        halfStarIcon.style.opacity = 1;
                    }
                    else
                    {
                        halfStarIcon.style.opacity = 0;
                    }
                }
            }
        };

        _updateStars( value );

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.Rate = Rate;
