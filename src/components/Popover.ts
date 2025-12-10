// Popover.js @jxarco
import { LX } from './../core/Namespace';

/**
 * @class Popover
 */

export class Popover
{
    static activeElement: any = null;

    root: any;
    side: string = 'bottom';
    align: string = 'center';
    sideOffset: number = 0;
    alignOffset: number = 0;
    avoidCollisions: boolean = true;
    reference: any;

    _windowPadding: number = 4;
    _trigger: any;
    _parent: any;
    _onClick: any;

    constructor( trigger: any, content: any, options: any = {} )
    {
        if ( Popover.activeElement )
        {
            Popover.activeElement.destroy();
            return;
        }

        this._trigger = trigger;

        if ( trigger )
        {
            trigger.classList.add( 'triggered' );
            trigger.active = this;
        }

        this.side = options.side ?? this.side;
        this.align = options.align ?? this.align;
        this.sideOffset = options.sideOffset ?? this.sideOffset;
        this.alignOffset = options.alignOffset ?? this.alignOffset;
        this.avoidCollisions = options.avoidCollisions ?? true;
        this.reference = options.reference;

        this.root = document.createElement( 'div' );
        this.root.dataset['side'] = this.side;
        this.root.tabIndex = '1';
        this.root.className = 'lexpopover';

        const refElement = trigger ?? this.reference;
        const nestedDialog = refElement.closest( 'dialog' );
        if ( nestedDialog && nestedDialog.dataset['modal'] == 'true' )
        {
            this._parent = nestedDialog;
        }
        else
        {
            this._parent = LX.root;
        }

        this._parent.appendChild( this.root );

        this.root.addEventListener( 'keydown', ( e: KeyboardEvent ) => {
            if ( e.key == 'Escape' )
            {
                e.preventDefault();
                e.stopPropagation();
                this.destroy();
            }
        } );

        if ( content )
        {
            content = [].concat( content );
            content.forEach( ( e: any ) => {
                const domNode = e.root ?? e;
                this.root.appendChild( domNode );
                if ( e.onPopover )
                {
                    e.onPopover();
                }
            } );
        }

        Popover.activeElement = this;

        LX.doAsync( () => {
            this._adjustPosition();

            if ( this._trigger )
            {
                this.root.focus();

                this._onClick = ( e: Event ) => {
                    if ( e.target && ( this.root.contains( e.target ) || e.target == this._trigger ) )
                    {
                        return;
                    }
                    this.destroy();
                };

                document.body.addEventListener( 'mousedown', this._onClick, true );
                document.body.addEventListener( 'focusin', this._onClick, true );
            }
        }, 10 );
    }

    destroy()
    {
        if ( this._trigger )
        {
            this._trigger.classList.remove( 'triggered' );
            delete this._trigger.active;

            document.body.removeEventListener( 'mousedown', this._onClick, true );
            document.body.removeEventListener( 'focusin', this._onClick, true );
        }

        this.root.remove();

        Popover.activeElement = null;
    }

    _adjustPosition()
    {
        const position = [ 0, 0 ];

        // Place menu using trigger position and user options
        {
            const el = this.reference ?? this._trigger;
            console.assert( el, 'Popover needs a trigger or reference element!' );
            const rect = el.getBoundingClientRect();

            let alignWidth = true;

            switch ( this.side )
            {
                case 'left':
                    position[0] += rect.x - this.root.offsetWidth - this.sideOffset;
                    alignWidth = false;
                    break;
                case 'right':
                    position[0] += rect.x + rect.width + this.sideOffset;
                    alignWidth = false;
                    break;
                case 'top':
                    position[1] += rect.y - this.root.offsetHeight - this.sideOffset;
                    alignWidth = true;
                    break;
                case 'bottom':
                    position[1] += rect.y + rect.height + this.sideOffset;
                    alignWidth = true;
                    break;
                default:
                    break;
            }

            switch ( this.align )
            {
                case 'start':
                    if ( alignWidth ) position[0] += rect.x;
                    else position[1] += rect.y;
                    break;
                case 'center':
                    if ( alignWidth ) position[0] += ( rect.x + rect.width * 0.5 ) - this.root.offsetWidth * 0.5;
                    else position[1] += ( rect.y + rect.height * 0.5 ) - this.root.offsetHeight * 0.5;
                    break;
                case 'end':
                    if ( alignWidth ) position[0] += rect.x - this.root.offsetWidth + rect.width;
                    else position[1] += rect.y - this.root.offsetHeight + rect.height;
                    break;
                default:
                    break;
            }

            if ( alignWidth ) position[0] += this.alignOffset;
            else position[1] += this.alignOffset;
        }

        if ( this.avoidCollisions )
        {
            position[0] = LX.clamp( position[0], 0, window.innerWidth - this.root.offsetWidth - this._windowPadding );
            position[1] = LX.clamp( position[1], 0, window.innerHeight - this.root.offsetHeight - this._windowPadding );
        }

        if ( this._parent instanceof HTMLDialogElement )
        {
            let parentRect = this._parent.getBoundingClientRect();
            position[0] -= parentRect.x;
            position[1] -= parentRect.y;
        }

        this.root.style.left = `${position[0]}px`;
        this.root.style.top = `${position[1]}px`;
    }
}

LX.Popover = Popover;

/**
 * @class PopConfirm
 */

class PopConfirm
{
    _popover: Popover | null = null;

    constructor( reference: any, options: any = {} )
    {
        const okText = options.confirmText ?? 'Yes';
        const cancelText = options.cancelText ?? 'No';
        const title = options.title ?? 'Confirm';
        const content = options.content ?? 'Are you sure you want to proceed?';
        const onConfirm = options.onConfirm;
        const onCancel = options.onCancel;

        const popoverContainer = LX.makeContainer( [ 'auto', 'auto' ], 'tour-step-container' );

        {
            const headerDiv = LX.makeContainer( [ '100%', 'auto' ], 'flex flex-row', '', popoverContainer );
            const titleDiv = LX.makeContainer( [ '100%', 'auto' ], 'p-1 font-medium text-md', title, headerDiv );
        }

        LX.makeContainer( [ '100%', 'auto' ], 'p-1 text-md', content, popoverContainer, { maxWidth: '400px' } );
        const footer = LX.makeContainer( [ '100%', 'auto' ], 'flex flex-row text-md', '', popoverContainer );
        const footerButtons = LX.makeContainer( [ '100%', 'auto' ], 'text-md', '', footer );
        const footerPanel = new LX.Panel();
        footerButtons.appendChild( footerPanel.root );

        footerPanel.sameLine( 2, 'justify-end' );
        footerPanel.addButton( null, cancelText, () => {
            if ( onCancel ) onCancel();
            this._popover?.destroy();
        }, { xbuttonClass: 'contrast' } );
        footerPanel.addButton( null, okText, () => {
            if ( onConfirm ) onConfirm();
            this._popover?.destroy();
        }, { buttonClass: 'accent' } );

        this._popover?.destroy();
        this._popover = new LX.Popover( null, [ popoverContainer ], {
            reference,
            side: options.side ?? 'top',
            align: options.align,
            sideOffset: options.sideOffset,
            alignOffset: options.alignOffset
        } );
    }
}

LX.PopConfirm = PopConfirm;
