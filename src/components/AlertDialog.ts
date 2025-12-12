// AlertDialog.ts @jxarco

import { LX } from './../core/Namespace';
import { Panel } from './../core/Panel';
import { Dialog } from './Dialog';

/**
 * @class AlertDialog
 */

export class AlertDialog extends Dialog
{
    constructor( title: string, message: string, callback: any, options: any = {} )
    {
        options.closable = false;
        options.draggable = false;
        options.modal = true;

        super( undefined, ( p: Panel ) => {
            p.root.classList.add( 'p-4', 'flex', 'flex-col', 'gap-2' );

            LX.makeContainer( [ '100%', '100%' ], 'text-xl font-medium', title, p );

            p.addTextArea( null, message, null, { disabled: true, fitHeight: true,
                inputClass: 'bg-none fg-tertiary' } );

            p.sameLine( 2, 'justify-end' );
            p.addButton( null, options.cancelText ?? 'Cancel', () => this.destroy(), {
                buttonClass: 'border-color bg-primary'
            } );
            p.addButton( null, options.continueText ?? 'Continue', () => {
                this.destroy();
                if ( callback ) callback();
            }, { buttonClass: 'contrast' } );
        }, options );
    }
}

LX.AlertDialog = AlertDialog;
