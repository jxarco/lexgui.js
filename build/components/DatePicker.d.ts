import { BaseComponent } from './BaseComponent';
import { Calendar } from './Calendar';
import { CalendarRange } from './CalendarRange';
import { Popover } from './Popover';
/**
 * @class DatePicker
 * @description DatePicker Component
 */
export declare class DatePicker extends BaseComponent {
    calendar: Calendar | CalendarRange;
    _popover: Popover | undefined;
    constructor(name: string, dateValue: string | string[], callback: any, options?: any);
}
