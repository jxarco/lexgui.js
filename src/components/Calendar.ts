// Calendar.ts @jxarco

import { LX } from './../core/Namespace';

export class Calendar {

    /**
     * @constructor Calendar
     * @param {String} dateString D/M/Y
     * @param {Object} options
     */

    root: HTMLElement;

    day: number = -1;
    month: number = -1;
    year: number = -1;
    monthName: string = "";
    firstDay: number = -1;
    daysInMonth: number = -1;
    calendarDays: any[] = [];
    currentDate: any;
    range: string[];

    untilToday: boolean;
    fromToday: boolean;
    skipPrevMonth: boolean;
    skipNextMonth: boolean;
    
    onChange: any;
    onPreviousMonth: any;
    onNextMonth: any;

    constructor( dateString?: string, options: any = {} )
    {
        this.root = LX.makeContainer( ["256px", "auto"], "p-1 text-md" );

        this.onChange = options.onChange;
        this.onPreviousMonth = options.onPreviousMonth;
        this.onNextMonth = options.onNextMonth;

        this.untilToday = options.untilToday;
        this.fromToday = options.fromToday;
        this.range = options.range;

        this.skipPrevMonth = options.skipPrevMonth;
        this.skipNextMonth = options.skipNextMonth;

        if( dateString )
        {
            this.fromDateString( dateString );
        }
        else
        {
            const date = new Date();
            this.month = date.getMonth() + 1;
            this.year = date.getFullYear();
            this.fromMonthYear( this.month, this.year );
        }
    }

    _getCurrentDate()
    {
        return {
            day: this.day,
            month: this.month,
            year: this.year,
            fullDate: this.getFullDate()
        }
    }

    _previousMonth( skipCallback?: boolean )
    {
        this.month = Math.max( 1, this.month - 1 );

        if( this.month == 1 )
        {
            this.month = 12;
            this.year--;
        }

        this.fromMonthYear( this.month, this.year );

        if( !skipCallback && this.onPreviousMonth )
        {
            this.onPreviousMonth( this.currentDate );
        }
    }

    _nextMonth( skipCallback?: boolean )
    {
        this.month = Math.min( this.month + 1, 13 );

        if( this.month == 13 )
        {
            this.month = 1;
            this.year++;
        }

        this.fromMonthYear( this.month, this.year );

        if( !skipCallback && this.onNextMonth )
        {
            this.onNextMonth( this.currentDate );
        }
    }

    refresh()
    {
        this.root.innerHTML = "";

        // Header
        {
            const header = LX.makeContainer( ["100%", "auto"], "flex flex-row p-1", "", this.root );

            if( !this.skipPrevMonth )
            {
                const prevMonthIcon = LX.makeIcon( "Left", { title: "Previous Month", iconClass: "border p-1 rounded hover:bg-secondary", svgClass: "sm" } );
                header.appendChild( prevMonthIcon );
                prevMonthIcon.addEventListener( "click", () => {
                    this._previousMonth();
                } );
            }

            const monthYearLabel = LX.makeContainer( ["100%", "auto"], "text-center font-medium select-none", `${ this.monthName } ${ this.year }`, header );

            if( !this.skipNextMonth )
            {
                const nextMonthIcon = LX.makeIcon( "Right", { title: "Next Month", iconClass: "border p-1 rounded hover:bg-secondary", svgClass: "sm" } );
                header.appendChild( nextMonthIcon );
                nextMonthIcon.addEventListener( "click", () => {
                    this._nextMonth();
                } );
            }
        }

        // Body
        {
            const daysTable = document.createElement( "table" );
            daysTable.className = "w-full";
            this.root.appendChild( daysTable );

            // Table Head
            {
                const head = document.createElement( 'thead' );
                daysTable.appendChild( head );

                const hrow = document.createElement( 'tr' );

                for( const headData of [ "Mo", "Tu", "We", "Th", "Fr", "Sa", "Su" ] )
                {
                    const th = document.createElement( 'th' );
                    th.className = "fg-tertiary text-sm font-normal select-none";
                    th.innerHTML = `<span>${ headData }</span>`;
                    hrow.appendChild( th );
                }

                head.appendChild( hrow );
            }

            // Table Body
            {
                const body = document.createElement( 'tbody' );
                daysTable.appendChild( body );

                let fromRangeDate = this.range ? LX.dateFromDateString( this.range[ 0 ] ) : null;
                let toRangeDate = this.range ? LX.dateFromDateString( this.range[ 1 ] ) : null;

                for( let week = 0; week < 6; week++ )
                {
                    const hrow = document.createElement( 'tr' );
                    const weekDays = this.calendarDays.slice( week * 7, week * 7 + 7 );

                    for( const dayData of weekDays )
                    {
                        const th = document.createElement( 'th' );
                        th.className = "leading-loose font-normal rounded select-none cursor-pointer";

                        const dayDate = new Date( `${ this.month }/${ dayData.day }/${ this.year }` );
                        const date = new Date();
                        // today inclusives
                        const beforeToday = this.untilToday ? ( dayDate.getTime() < date.getTime() ) : true;
                        const afterToday = this.fromToday ? ( dayDate.getFullYear() > date.getFullYear() ||
                            (dayDate.getFullYear() === date.getFullYear() && dayDate.getMonth() > date.getMonth()) ||
                            (dayDate.getFullYear() === date.getFullYear() && dayDate.getMonth() === date.getMonth() && dayDate.getDate() >= date.getDate())
                        ) : true;
                        const selectable = dayData.currentMonth && beforeToday && afterToday;
                        const currentDay = this.currentDate && ( dayData.day == this.currentDate.day ) && ( this.month == this.currentDate.month )
                            && ( this.year == this.currentDate.year ) && dayData.currentMonth;
                        const currentFromRange = selectable && fromRangeDate && ( dayData.day == fromRangeDate.getDate() ) && ( this.month == ( fromRangeDate.getMonth() + 1 ) )
                            && ( this.year == fromRangeDate.getFullYear() );
                        const currentToRange = selectable && toRangeDate && ( dayData.day == toRangeDate.getDate() ) && ( this.month == ( toRangeDate.getMonth() + 1 ) )
                            && ( this.year == toRangeDate.getFullYear() );

                        if( ( !this.range && currentDay ) || this.range && ( currentFromRange || currentToRange ) )
                        {
                            th.className += ` bg-contrast fg-contrast`;
                        }
                        else if( this.range && selectable && ( dayDate > fromRangeDate ) && ( dayDate < toRangeDate ) )
                        {
                            th.className += ` bg-accent fg-contrast`;
                        }
                        else
                        {
                            th.className += ` ${ selectable ? "fg-primary" : "fg-tertiary" } hover:bg-secondary`;
                        }

                        th.innerHTML = `<span>${ dayData.day }</span>`;
                        hrow.appendChild( th );

                        if( selectable )
                        {
                            th.addEventListener( "click", () => {
                                this.day = dayData.day;
                                this.currentDate = this._getCurrentDate();
                                if( this.onChange )
                                {
                                    this.onChange( this.currentDate );
                                }
                            } );
                        }
                        // This event should only be applied in non current month days
                        else if( this.range === undefined && !dayData.currentMonth )
                        {
                            th.addEventListener( "click", () => {
                                if( dayData?.prevMonth )
                                {
                                    this._previousMonth();
                                }
                                else
                                {
                                    this._nextMonth();
                                }
                            } );
                        }
                    }

                    body.appendChild( hrow );
                }
            }
        }
    }

    fromDateString( dateString: string )
    {
        const tokens = dateString.split( '/' );

        this.day = parseInt( tokens[ 0 ] );
        this.month = parseInt( tokens[ 1 ] );
        this.monthName = this.getMonthName( this.month - 1 );
        this.year = parseInt( tokens[ 2 ] );

        this.currentDate = this._getCurrentDate();

        this.fromMonthYear( this.month, this.year );
    }

    fromMonthYear( month: number, year?: number )
    {
        // Month is 0-based (0 = January, ... 11 = December)
        month = Math.max( month - 1, 0 );
        year = year ?? new Date().getFullYear();

        const weekDay = new Date( year, month, 1 ).getDay();
        const firstDay = weekDay === 0 ? 6 : weekDay - 1; // 0 = Monday, 1 = Tuesday...
        const daysInMonth = new Date( year, month + 1, 0 ).getDate();

        // Previous month
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        const daysInPrevMonth = new Date( prevYear, prevMonth + 1, 0 ).getDate();

        // Prepare full grid (up to 6 weeks = 42 days)
        const calendarDays = [];

        // Fill in days from previous month
        for( let i = firstDay - 1; i >= 0; i--)
        {
            calendarDays.push( { day: daysInPrevMonth - i, currentMonth: false, prevMonth: true } );
        }

        // Fill in current month days
        for ( let i = 1; i <= daysInMonth; i++ )
        {
            calendarDays.push( { day: i, currentMonth: true } );
        }

        // Fill in next month days to complete the grid (if needed)
        const remaining = 42 - calendarDays.length;
        for( let i = 1; i <= remaining; i++ )
        {
            calendarDays.push( { day: i, currentMonth: false, nextMonth: true } );
        }

        this.monthName = this.getMonthName( month );
        this.firstDay = firstDay;
        this.daysInMonth = daysInMonth;
        this.calendarDays = calendarDays;

        this.refresh();
    }

    getMonthName( monthIndex: number, locale = "en-US" )
    {
        const formatter = new Intl.DateTimeFormat( locale, { month: "long" } );
        return formatter.format( new Date( 2000, monthIndex, 1 ) );
    }

    getFullDate( monthName?: string, day?: number, year?: number )
    {
        return `${ monthName ?? this.monthName } ${ day ?? this.day }${ this._getOrdinalSuffix( day ?? this.day ) }, ${ year ?? this.year }`;
    }

    setRange( range: string[] )
    {
        console.assert( range.constructor === Array, "Date Range must be in Array format" );
        this.range = range;
        this.refresh();
    }

    setMonth( month: number )
    {
        this.month = month;
        this.fromMonthYear( this.month, this.year );
    }

    _getOrdinalSuffix( day: number )
    {
        if ( day > 3 && day < 21 ) return "th";
        switch ( day % 10 )
        {
            case 1: return "st";
            case 2: return "nd";
            case 3: return "rd";
            default: return "th";
        }
    }
}

LX.Calendar = Calendar;