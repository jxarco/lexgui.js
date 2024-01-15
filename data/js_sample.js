import { LX } from 'lexgui';

class Test {

    constructor() {

        this.foo = 1;

        var div = document.createElement('div');
        div.style.width = "100px"
        div.style.height = "100px"
        div.style.background = "red"
        div.style.position = "absolute"
        div.style.top = "0px"

        LX.makeDraggable(div);

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