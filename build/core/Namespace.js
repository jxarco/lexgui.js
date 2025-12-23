// This is a generated file. Do not edit.
// Namespace.ts @jxarco
/**
 * Main namespace
 * @namespace LX
 */
const g = globalThis;
// Update global namespace if not present (Loading module)
// Extension scripts rely on LX being globally available
let LX = g.LX;
if (!LX) {
    LX = {
        version: '8.2',
        ready: false,
        extensions: [], // Store extensions used
        extraCommandbarEntries: [], // User specific entries for command bar
        signals: {}, // Events and triggers
        activeDraggable: null, // Watch for the current active draggable
        spacingMode: 'default',
        layoutMode: 'app',
        MOUSE_LEFT_CLICK: 0,
        MOUSE_MIDDLE_CLICK: 1,
        MOUSE_RIGHT_CLICK: 2,
        MOUSE_DOUBLE_CLICK: 2,
        MOUSE_TRIPLE_CLICK: 3,
        CURVE_MOVEOUT_CLAMP: 0,
        CURVE_MOVEOUT_DELETE: 1,
        DRAGGABLE_Z_INDEX: 101
    };
    g.LX = LX;
}

export { LX };
//# sourceMappingURL=Namespace.js.map
