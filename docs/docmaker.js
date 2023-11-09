// @jxarco

function MAKE_LINE_BREAK()
{
    document.body.appendChild( document.createElement('br') );
}

function MAKE_HEADER( string, type, id )
{
    console.assert(string && type);
    let header = document.createElement(type);
    header.innerHTML = string;
    if(id) header.id = id;
    document.body.appendChild( header );
}

function MAKE_PARAGRAPH( string, sup )
{
    console.assert(string);
    let paragraph = document.createElement(sup ? 'sup' : 'p');
    paragraph.innerHTML = string;
    document.body.appendChild( paragraph );
}

function MAKE_CODE( string )
{
    console.assert(string);
    let pre = document.createElement('pre');
    let code = document.createElement('code');
    code.innerHTML = string;

    let button = document.createElement('button');
    button.title = "Copy";
    button.innerHTML = `<i class="fa-regular fa-copy"></i>`;
    button.addEventListener('click', COPY_SNIPPET.bind(this, button));

    code.appendChild( button );
    pre.appendChild( code );
    document.body.appendChild( pre );
}

function MAKE_BULLET_LIST( list )
{
    console.assert(list && list.length > 0);
    let ul = document.createElement('ul');
    for( var el of list ) {
        let split = (el.constructor === Array);
        let li = document.createElement('li');
        li.innerHTML = split ? INLINE_CODE( el[0] ) + ": " + el[1] : INLINE_CODE( el );
        ul.appendChild( li );
    }
    document.body.appendChild( ul );
}

function INLINE_LINK( string, href )
{
    console.assert(string && href);
    return `<a href="` + href + `">` + string + `</a>`;
}

function INLINE_CODE( string )
{
    console.assert(string);
    return `<code class="inline">` + string + `</code>`;
}

function COPY_SNIPPET( b )
{
    b.innerHTML = '<i class="fa-solid fa-check"></i>';
    b.classList.add('copied');

    setTimeout( () => {
        b.innerHTML = '<i class="fa-regular fa-copy"></i>';
        b.classList.remove('copied');
    }, 2000 );

    navigator.clipboard.writeText( b.dataset['snippet'] ?? b.parentElement.innerText );
    console.log("Copied!");
}