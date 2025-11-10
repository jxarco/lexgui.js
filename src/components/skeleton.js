// skeleton.js @jxarco
import { LX } from './core.js';

class Skeleton {

    constructor( elements ) {

        this.root = LX.makeContainer( [ "auto", "auto" ], "flex flex-row lexskeleton" );

        if( elements.constructor === String )
        {
            this.root.innerHTML = elements;
        }
        else
        {
            // Force array
            elements = [].concat( elements );

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

export { Skeleton };