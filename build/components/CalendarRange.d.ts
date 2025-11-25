import { Calendar } from './Calendar';
export declare class CalendarRange {
    /**
     * @constructor CalendarRange
     * @param {Array} range ["DD/MM/YYYY", "DD/MM/YYYY"]
     * @param {Object} options
     */
    root: HTMLElement;
    fromCalendar: Calendar;
    toCalendar: Calendar;
    from: string;
    to: string;
    _selectingRange: boolean;
    constructor(range: string[], options?: any);
    getFullDate(): string;
}
