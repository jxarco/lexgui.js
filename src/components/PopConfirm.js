// PopConfirm.js @jxarco
import { LX } from './core.js';

/**
 * @class PopConfirm
 */

class PopConfirm {

    constructor( reference, options = {} ) {

        const okText = options.confirmText ?? "Yes";
        const cancelText = options.cancelText ?? "No";
        const title = options.title ?? "Confirm";
        const content = options.content ?? "Are you sure you want to proceed?";
        const onConfirm = options.onConfirm;
        const onCancel = options.onCancel;

        const popoverContainer = LX.makeContainer( ["auto", "auto"], "tour-step-container" );

        {
            const headerDiv = LX.makeContainer( ["100%", "auto"], "flex flex-row", "", popoverContainer );
            const titleDiv = LX.makeContainer( ["100%", "auto"], "p-1 font-medium text-md", title, headerDiv );
        }

        LX.makeContainer( ["100%", "auto"], "p-1 text-md", content, popoverContainer, { maxWidth: "400px" } );
        const footer = LX.makeContainer( ["100%", "auto"], "flex flex-row text-md", "", popoverContainer );
        const footerButtons = LX.makeContainer( ["100%", "auto"], "text-md", "", footer );
        const footerPanel = new LX.Panel();
        footerButtons.appendChild( footerPanel.root );

        footerPanel.sameLine( 2, "justify-end" );
        footerPanel.addButton( null, cancelText, () => {
            if( onCancel ) onCancel();
            this._popover?.destroy();
        }, { xbuttonClass: "contrast" } );
        footerPanel.addButton( null, okText, () => {
            if( onConfirm ) onConfirm();
            this._popover?.destroy();
        }, { buttonClass: "accent" } );

        this._popover?.destroy();
        this._popover = new LX.Popover( null, [ popoverContainer ], {
            reference,
            side: options.side ?? "top",
            align: options.align,
            sideOffset: options.sideOffset,
            alignOffset: options.alignOffset,
        } );

    }
}

LX.PopConfirm = PopConfirm;

export { PopConfirm };