import { Panel } from './Panel';
export declare class IEvent {
    name: any;
    value: any;
    domEvent: any;
    constructor(name: string | null | undefined, value: any, domEvent?: any);
}
export declare class TreeEvent {
    static NONE: number;
    static NODE_SELECTED: number;
    static NODE_DELETED: number;
    static NODE_DBLCLICKED: number;
    static NODE_CONTEXTMENU: number;
    static NODE_DRAGGED: number;
    static NODE_RENAMED: number;
    static NODE_VISIBILITY: number;
    static NODE_CARETCHANGED: number;
    type: number;
    node: any;
    value: any;
    event: any;
    multiple: boolean;
    panel: Panel | null;
    constructor(type: number, node: any, value: any, event: any);
    string(): "tree_event_none" | "tree_event_selected" | "tree_event_deleted" | "tree_event_dblclick" | "tree_event_contextmenu" | "tree_event_dragged" | "tree_event_renamed" | "tree_event_visibility" | "tree_event_caretchanged" | undefined;
}
