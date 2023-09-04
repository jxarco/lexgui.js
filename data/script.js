class Test {

    constructor() {
        this.foo = 1;

        var div = document.createElement('div');
        div.style.width = "100px"
        div.style.height = "100px"
        div.style.background = "red"
        div.style.position = "absolute"
        div.style.top = "0px"

        // single line comment

        document.body.appendChild( div );

        let a = 1; /* single line block comment */ let b = 2;
    }

    getFoo() {
        return this.foo;
    }

    setFoo( value ) {
        this.foo = value;
    }

}

let instance = new Test();