// ES module imports
import defaultExport from './utils/helpers';
import { foo, bar } from '../core/math';
import * as LX from '../../lexgui';
import MyClass, { helper } from './components/MyClass';

// Dynamic import
const module = await import('./lazy/module');
import('./plugins/optional').then( m => m.init() );

// CommonJS require
const fs = require('fs');
const path = require( 'path' );
const { readFile, writeFile } = require('fs/promises');

// Re-exports
export { default } from './index';
export { something } from '../shared/utils';


function testFunction() {
    const alt = 1;
    console.log("This is a test function", alt);
}

class Test {

    constructor() {

        var div = document.createElement('div');
        div.style.background = "red";

        const name = "Pep";
        const textWithStringInterpolation = `hello ${ name }!`;

        // single line comment

        document.body.appendChild( div );

        let a = 1; /* single line block comment */ let b = 2;

        /*
            multiple line block comment
        */
    }

    getFoo() {
        return this.foo;
    }

    setFoo( value ) {
        this.foo = value;
    }
}

let instance = new Test();

var canvas = document.querySelector('canvas');
var ctx = canvas.getContext("2d");
ctx.fillStyle = "#b7a9b1";
ctx.font = "48px Monospace";
ctx.strokeStyle = "#ff1999";

testFunction();