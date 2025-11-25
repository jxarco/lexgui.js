export declare class Calendar {
    /**
     * @constructor Calendar
     * @param {String} dateString D/M/Y
     * @param {Object} options
     */
    root: HTMLElement;
    day: number;
    month: number;
    year: number;
    monthName: string;
    firstDay: number;
    daysInMonth: number;
    calendarDays: any[];
    currentDate: any;
    range: string[];
    untilToday: boolean;
    fromToday: boolean;
    skipPrevMonth: boolean;
    skipNextMonth: boolean;
    onChange: any;
    onPreviousMonth: any;
    onNextMonth: any;
    constructor(dateString?: string, options?: any);
    _getCurrentDate(): {
        day: number;
        month: number;
        year: number;
        fullDate: string;
    };
    _previousMonth(skipCallback?: boolean): void;
    _nextMonth(skipCallback?: boolean): void;
    refresh(): void;
    fromDateString(dateString: string): void;
    fromMonthYear(month: number, year?: number): void;
    getMonthName(monthIndex: number, locale?: string): string;
    getFullDate(monthName?: string, day?: number, year?: number): string;
    setRange(range: string[]): void;
    setMonth(month: number): void;
    _getOrdinalSuffix(day: number): "th" | "st" | "nd" | "rd";
}
