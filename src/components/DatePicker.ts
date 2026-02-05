// DatePicker.ts @jxarco

import { IEvent } from './../core/Event';
import { LX } from './../core/Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';
import { Button } from './Button';
import { Calendar } from './Calendar';
import { CalendarRange } from './CalendarRange';
import { Popover } from './Popover';

/**
 * @class DatePicker
 * @description DatePicker Component
 */

export class DatePicker extends BaseComponent
{
    calendar: Calendar | CalendarRange;

    _popover: Popover | undefined = undefined;

    constructor( name: string, dateValue: string | string[], callback: any, options: any = {} )
    {
        super( ComponentType.DATE, name, null, options );

        const dateAsRange = dateValue?.constructor === Array;

        if ( !dateAsRange && options.today )
        {
            const date = new Date();
            dateValue = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
        }

        this.onGetValue = () => {
            return dateValue;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            if ( !dateAsRange )
            {
                ( this.calendar as Calendar ).fromDateString( newValue );
            }

            dateValue = newValue;

            refresh( this.calendar.getFullDate() );

            if ( !skipCallback )
            {
                this._trigger( new IEvent( name, newValue, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = this.root.domName?.style.width ?? '0px';
            container.style.width = `calc( 100% - ${realNameWidth})`;
        };

        const container = LX.makeContainer( [ 'auto', 'auto' ], 'lexdate flex flex-row' );
        this.root.appendChild( container );

        if ( !dateAsRange )
        {
            this.calendar = new Calendar( dateValue as string, {
                onChange: ( date: any ) => {
                    const newDateString = `${date.day}/${date.month}/${date.year}`;
                    this.set( newDateString );
                },
                ...options
            } );
        }
        else
        {
            this.calendar = new CalendarRange( dateValue as string[], {
                onChange: ( dateRange: any ) => {
                    this.set( dateRange );
                },
                ...options
            } );
        }

        const refresh = ( currentDate?: any ) => {
            const emptyDate = !!currentDate;

            container.innerHTML = '';

            currentDate = currentDate ?? 'Pick a date';

            const dts = currentDate.split( ' to ' );
            const d0 = dateAsRange ? dts[0] : currentDate;

            const calendarIcon = LX.makeIcon( 'Calendar' );
            const calendarButton = new Button( null, d0, () => {
                this._popover = new Popover( calendarButton.root, [ this.calendar ] );
            }, { disabled: this.disabled, buttonClass: `outline flex flex-row px-3 ${emptyDate ? '' : 'text-muted-foreground'} justify-between` } );
            calendarButton.root.querySelector( 'button' ).appendChild( calendarIcon );
            calendarButton.root.style.width = '100%';
            container.appendChild( calendarButton.root );

            if ( dateAsRange )
            {
                const arrowRightIcon = LX.makeIcon( 'ArrowRight' );
                LX.makeContainer( [ '32px', 'auto' ], 'content-center', arrowRightIcon.innerHTML, container );

                const d1 = dts[1];
                const calendarIcon = LX.makeIcon( 'Calendar' );
                const calendarButton = new Button( null, d1, () => {
                    this._popover = new Popover( calendarButton.root, [ this.calendar ] );
                }, { disabled: this.disabled,
                    buttonClass: `outline flex flex-row px-3 ${emptyDate ? '' : 'text-muted-foreground'} justify-between` } );
                calendarButton.root.querySelector( 'button' ).appendChild( calendarIcon );
                calendarButton.root.style.width = '100%';
                container.appendChild( calendarButton.root );
            }
        };

        if ( dateValue )
        {
            refresh( this.calendar.getFullDate() );
        }
        else
        {
            refresh();
        }

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.Calendar = Calendar;
LX.CalendarRange = CalendarRange;
LX.DatePicker = DatePicker;
