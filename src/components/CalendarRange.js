// CalendarRange.js @jxarco
import { LX } from './core.js';

class CalendarRange {

    /**
     * @constructor CalendarRange
     * @param {Array} range ["DD/MM/YYYY", "DD/MM/YYYY"]
     * @param {Object} options
     */

    constructor( range, options = {} ) {

        this.root = LX.makeContainer( ["auto", "auto"], "flex flex-row" );

        console.assert( range && range.constructor === Array, "Range cannot be empty and has to be an Array!" );

        let mustSetMonth = null;
        let dateReversed = false;

        // Fix any issues with date range picking
        {
            const t0 = LX.dateFromDateString( range[ 0 ] );
            const t1 = LX.dateFromDateString( range[ 1 ] );

            if( t0 > t1 )
            {
                const tmp = range[ 0 ];
                range[ 0 ] = range[ 1 ];
                range[ 1 ] = tmp;
                dateReversed = true;
            }

            mustSetMonth = (dateReversed ? t1.getMonth() : t0.getMonth() ) + 2; // +1 to convert range, +1 to use next month
        }

        this.from = range[ 0 ];
        this.to = range[ 1 ];

        this._selectingRange = false;

        const onChange = ( date ) => {

            const newDateString = `${ date.day }/${ date.month }/${ date.year }`;

            if( !this._selectingRange )
            {
                this.from = this.to = newDateString;
                this._selectingRange = true;
            }
            else
            {
                this.to = newDateString;
                this._selectingRange = false;
            }

            const newRange = [ this.from, this.to ];

            this.fromCalendar.setRange( newRange );
            this.toCalendar.setRange( newRange );

            if( options.onChange )
            {
                options.onChange( newRange );
            }

        };

        this.fromCalendar = new LX.Calendar( this.from, {
            skipNextMonth: true,
            onChange,
            onPreviousMonth: () => {
                this.toCalendar._previousMonth();
            },
            range
        });

        this.toCalendar = new LX.Calendar( this.to, {
            skipPrevMonth: true,
            onChange,
            onNextMonth: () => {
                this.fromCalendar._nextMonth();
            },
            range
        });

        console.assert( mustSetMonth && "New Month must be valid" );
        this.toCalendar.setMonth( mustSetMonth );

        this.root.appendChild( this.fromCalendar.root );
        this.root.appendChild( this.toCalendar.root );
    }

    getFullDate() {

        const d0 = LX.dateFromDateString( this.from );
        const d0Month = this.fromCalendar.getMonthName( d0.getMonth() );

        const d1 = LX.dateFromDateString( this.to );
        const d1Month = this.toCalendar.getMonthName( d1.getMonth() );

        return `${ this.fromCalendar.getFullDate( d0Month, d0.getDate(), d0.getFullYear() ) } to ${ this.toCalendar.getFullDate( d1Month, d1.getDate(), d1.getFullYear() ) }`;
    }
}

LX.CalendarRange = CalendarRange;

export { CalendarRange };