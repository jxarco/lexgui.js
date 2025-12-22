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
            p.root.className = LX.mergeClass( p.root.className, 'pad-2xl flex flex-col gap-2' );

            LX.makeContainer( [ '100%', '100%' ], 'text-lg font-medium text-foreground', title, p );

            p.addTextArea( null, message, null, { disabled: true, fitHeight: true, inputClass: 'bg-none text-sm text-muted-foreground' } );

            p.sameLine( 2, 'justify-end' );
            p.addButton( null, options.cancelText ?? 'Cancel', () => this.destroy(), {
                buttonClass: 'outline'
            } );
            p.addButton( null, options.continueText ?? 'Continue', () => {
                this.destroy();
                if ( callback ) callback();
            }, { buttonClass: 'primary' } );
        }, options );
    }
}

LX.AlertDialog = AlertDialog;
