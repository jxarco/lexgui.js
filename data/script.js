class Test {

    constructor() {
        this.foo = 1;

        var div = document.createElement('div');
        div.style.width = "100px"
        div.style.height = "100px"
        div.style.background = "red"
        div.style.position = "absolute"
        div.style.top = "0px"

        document.body.appendChild( div );

    }

    getFoo() {
        return this.foo;
    }

    setFoo( value ) {
        this.foo = value;
    }

}

let instance = new Test();