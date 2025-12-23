// Event.ts @jxarco

import { LX } from './Namespace';

/*
 *   Events and Signals
 */

export class IEvent
{
    name: any;
    value: any;
    domEvent: any;

    constructor( name: string | null | undefined, value: any, domEvent?: any )
    {
        this.name = name;
        this.value = value;
        this.domEvent = domEvent;
    }
}

LX.IEvent = IEvent;
