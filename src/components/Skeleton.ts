// Skeleton.ts @jxarco

import { LX } from './../Namespace';

export class Skeleton {

    root: any;

    constructor( elements: any[] ) {

        this.root = LX.makeContainer( [ "auto", "auto" ], "flex flex-row lexskeleton" );

        if( elements.constructor === String )
        {
            this.root.innerHTML = elements;
        }
        else
        {
            // Force array
            elements = [].concat( ( elements as any ) );

            for( let e of elements )
            {
                this.root.appendChild( e );
            }
        }
    }

    destroy() {

        this.root.dataset[ "closed" ] = true;

        LX.doAsync( () => {
            this.root.remove();
            this.root = null;
        }, 200 );
    }
}

LX.Skeleton = Skeleton;