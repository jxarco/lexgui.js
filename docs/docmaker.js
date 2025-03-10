// @jxarco

const KEY_WORDS = ['var', 'let', 'const', 'static', 'function', 'null', 'undefined', 'new', 'delete', 'true', 'false', 'NaN'];
const STATEMENT_WORDS = ['for', 'if', 'else', 'return', 'continue', 'break', 'case', 'switch', 'while', 'import', 'from'];
const HTML_ATTRIBUTES = ['html', 'charset', 'rel', 'src', 'href', 'crossorigin', 'type', 'lang'];
const HTML_TAGS = ['html', 'DOCTYPE', 'head', 'meta', 'title', 'link', 'script', 'body', 'style'];

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

function MAKE_CODE( text )
{
    console.assert(text);

    text.replaceAll('<', '&lt;');
    text.replaceAll('>', '&gt;');

    let highlight = "";
    let content = "";

    const getHTML = ( h, c ) => {
        return `<span class="${ h }">${ c }</span>`;
    };

    for( let i = 0; i < text.length; ++i )
    {
        const char = text[ i ];
        const string = text.substr( i );

        const endLineIdx = string.indexOf( '\n' );        
        const line = string.substring( 0, endLineIdx > -1 ? endLineIdx : undefined );
        
        if( char == '@' )
        {
            const str = line.substr( 1 );
            
            if ( !( str.indexOf( '@' ) > -1 ) && !( str.indexOf( '[' ) > -1 ) )
            {
                continue;
            }

            let html = null;

            const tagIndex = str.indexOf( '@' );

            // Highlight is specified
            if( text[ i + 1 ] == '[' )
            {
                highlight = str.substr( 1, 3 );
                content = str.substring( 5, tagIndex );

                const skipTag = ( str[ tagIndex - 1 ] == '|' );

                if( skipTag )
                {
                    const newString = str.substring( 6 + content.length );
                    const preContent = content;
                    const postContent = newString.substring( 0, newString.indexOf( '@' ) );
                    const finalContent = preContent.substring( 0, preContent.length - 1 ) + '@' + postContent;
                    html = getHTML( highlight, finalContent );

                    const ogContent = preContent + '@' + postContent;
                    text = text.replace( `@[${ highlight }]${ ogContent }@`, html );
                }
                else
                {
                    html = getHTML( highlight, content );
                    text = text.replace( `@[${ highlight }]${ content }@`, html );
                }
            }
            else
            {
                content = str.substring( 0, tagIndex );

                // if( str[ tagIndex - 1 ] == '|' )
                // {
                //     content = str.substring( tagIndex, str.indexOf( '@' ) );
                // }

                if( KEY_WORDS.includes( content ) )
                {
                    highlight = "kwd";    
                }
                else if( STATEMENT_WORDS.includes( content ) )
                {
                    highlight = "lit";    
                }
                else if( HTML_TAGS.includes( content ) )
                {
                    highlight = "tag";    
                }
                else if( HTML_ATTRIBUTES.includes( content ) )
                {
                    highlight = "atn";    
                }
                else if( parseFloat( content ) != NaN )
                {
                    highlight = "dec";    
                }
                else
                {
                    console.error( "ERROR[Code Parsing]: Unknown highlight type: " + content );
                    return;
                }

                html = getHTML( highlight, content );
                text = text.replace( `@${ content }@`, html );
            }

            i += ( html.length - 1 );
        }
    }
    
    let pre = document.createElement('pre');
    let code = document.createElement('code');
    code.innerHTML = text;

    let button = document.createElement('button');
    button.title = "Copy code sample";
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
        let li = document.createElement('li');
        li.innerHTML = el;
        ul.appendChild( li );
    }
    document.body.appendChild( ul );
}

function ADD_CODE_LIST_ITEM( item, target )
{
    target = target ?? window.listQueued;
    let split = (item.constructor === Array);
    if( split && item[0].constructor === Array ) {
        MAKE_CODE_BULLET_LIST( item, target );
        return;
    }
    let li = document.createElement('li');
    li.innerHTML = split ? ( item.length == 2 ? INLINE_CODE( item[0] ) + ": " + item[1] : INLINE_CODE( item[0] + " <span class='desc'>(" + item[1] + ")</span>" ) + ": " + item[2] ) : INLINE_CODE( item );
    target.appendChild( li );
}

function MAKE_CLASS_METHOD( name, desc, params, ret )
{
    START_CODE_BULLET_LIST();
    let paramsHTML = "";    
    for( var p of params ) {
        const name = p[ 0 ];
        const type = p[ 1 ];
        paramsHTML += name + ": <span class='desc'>" + type + "</span>" + ( params.indexOf( p ) != (params.length - 1) ? ', ' : '' );
    }
    let li = document.createElement('li');
    li.innerHTML = INLINE_CODE( "<span class='method'>" + name + " (" + paramsHTML + ")" + ( ret ? (": " + ret) : "" ) + "</span>" );
    window.listQueued.appendChild( li );
    END_CODE_BULLET_LIST();
    MAKE_PARAGRAPH( desc );
}

function MAKE_CLASS_CONSTRUCTOR( name, params )
{
    let paramsHTML = "";    
    for( var p of params ) {
        const name = p[ 0 ];
        const type = p[ 1 ];
        paramsHTML += name + ": <span class='desc'>" + type + "</span>" + ( params.indexOf( p ) != (params.length - 1) ? ', ' : '' );
    }
    let pr = document.createElement('p');
    pr.innerHTML = INLINE_CODE( "<span class='constructor'>" + name + "(" + paramsHTML + ")" + "</span>" );
    document.body.appendChild( pr );
}

function MAKE_CODE_BULLET_LIST( list, target )
{
    console.assert(list && list.length > 0);
    let ul = document.createElement('ul');
    for( var el of list ) {
        ADD_CODE_LIST_ITEM( el, ul );
    }
    if( target ) {
        target.appendChild( ul );
    } else {
        document.body.appendChild( ul );
    }
}

function START_CODE_BULLET_LIST()
{
    let ul = document.createElement('ul');
    window.listQueued = ul;
}

function END_CODE_BULLET_LIST()
{
    console.assert( window.listQueued );
    document.body.appendChild( window.listQueued );
    window.listQueued = undefined;
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

function INSERT_IMAGE( src, caption = "" )
{
    let img = document.createElement('img');
    img.src = src;
    img.alt = caption;
    document.body.appendChild( img );
}