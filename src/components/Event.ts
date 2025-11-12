// Event.ts @jxarco

import { LX } from './../Namespace';
import { Panel } from './Panel';

/*
*   Events and Signals
*/

export class IEvent {

    name: any;
    value: any;
    domEvent: any;

    constructor( name: string | null, value: any, domEvent?: any )
    {
        this.name = name;
        this.value = value;
        this.domEvent = domEvent;
    }
};

LX.IEvent = IEvent;

export class TreeEvent
{
    static NONE                 = 0;
    static NODE_SELECTED        = 1;
    static NODE_DELETED         = 2;
    static NODE_DBLCLICKED      = 3;
    static NODE_CONTEXTMENU     = 4;
    static NODE_DRAGGED         = 5;
    static NODE_RENAMED         = 6;
    static NODE_VISIBILITY      = 7;
    static NODE_CARETCHANGED    = 8;

    type: number = TreeEvent.NONE;
    node: any;
    value: any;
    event: any;
    multiple : boolean = false; // Multiple selection
    panel: Panel|null = null;

    constructor( type: number, node: any, value: any, event: any )
    {
        this.type = type || TreeEvent.NONE;
        this.node = node;
        this.value = value;
        this.event = event;
    }

    string()
    {
        switch( this.type )
        {
            case TreeEvent.NONE: return "tree_event_none";
            case TreeEvent.NODE_SELECTED: return "tree_event_selected";
            case TreeEvent.NODE_DELETED: return "tree_event_deleted";
            case TreeEvent.NODE_DBLCLICKED:  return "tree_event_dblclick";
            case TreeEvent.NODE_CONTEXTMENU:  return "tree_event_contextmenu";
            case TreeEvent.NODE_DRAGGED: return "tree_event_dragged";
            case TreeEvent.NODE_RENAMED: return "tree_event_renamed";
            case TreeEvent.NODE_VISIBILITY: return "tree_event_visibility";
            case TreeEvent.NODE_CARETCHANGED: return "tree_event_caretchanged";
        }
    }
};

LX.TreeEvent = TreeEvent;