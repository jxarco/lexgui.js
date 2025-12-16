/**
 * @class Menubar
 */
export declare class Menubar {
    root: any;
    siblingArea: any;
    buttonContainer?: any;
    items: any[];
    buttons: Record<string, any>;
    icons: any;
    shorts: any;
    focused: boolean;
    _currentDropdown?: any;
    constructor(items: any[], options?: any);
    _resetMenubar(focus?: boolean): void;
    /**
     * @method createEntries
     */
    createEntries(): void;
    /**
     * @method getButton
     * @param {String} name
     */
    getButton(name: string): any;
    /**
     * @method getSubitems
     * @param {Object} item: parent item
     * @param {Array} tokens: split path strings
     */
    getSubitem(item: any, tokens: any[]): any;
    /**
     * @method getItem
     * @param {String} path
     */
    getItem(path: string): any;
    /**
     * @method setButtonIcon
     * @param {String} name
     * @param {String} icon
     * @param {Function} callback
     * @param {Object} options
     */
    setButtonIcon(name: string, icon: string, callback: any, options?: any): void;
    /**
     * @method setButtonImage
     * @param {String} name
     * @param {String} src
     * @param {Function} callback
     * @param {Object} options
     */
    setButtonImage(name: string, src: string, callback: any, options?: any): void;
    /**
     * @method addButton
     * @param {Array} buttons
     * @param {Object} options
     * float: center (Default), right
     */
    addButtons(buttons: any[], options?: any): void;
}
