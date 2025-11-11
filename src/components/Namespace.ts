// Namespace.ts @jxarco

/**
 * Main namespace
 * @namespace LX
*/

// interface SignalSubscriber {
//   [key: string]: (value: any) => void;
// }

// export interface Core {
//     version: string;
//     ready: boolean;
//     extensions: string[];
//     extraCommandbarEntries: any[];
//     signals: Record<string, any[]>;
//     activeDraggable: any,
//     spacingMode: string,
//     layoutMode: string,
//     // Methods
//     setSpacingMode: ( mode: string ) => void,
//     setLayoutMode: ( mode: string ) => void,
//     addSignal: (name: string, obj: any, callback: (value: any) => void) => void,
//     emitSignal: (name: string, value: any, options: Record<string, any>) => void,
// }

export const LX: any =
{
    version: "0.8.0",
    ready: false,
    extensions: [],                 // Store extensions used
    extraCommandbarEntries: [],     // User specific entries for command bar
    signals: {},                    // Events and triggers
    activeDraggable: null,          // Watch for the current active draggable

    spacingMode: "default",
    layoutMode: "app",
    
    MOUSE_LEFT_CLICK: 0,
    MOUSE_MIDDLE_CLICK: 1,
    MOUSE_RIGHT_CLICK: 2,

    MOUSE_DOUBLE_CLICK: 2,
    MOUSE_TRIPLE_CLICK: 3,

    CURVE_MOVEOUT_CLAMP: 0,
    CURVE_MOVEOUT_DELETE: 1,
    
    DRAGGABLE_Z_INDEX: 101
}