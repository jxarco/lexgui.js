import { LX } from 'lexgui';
import 'lexgui/components/codeeditor.js';
import 'lexgui/components/timeline.js';
import 'lexgui/components/audio.js';

window.LX = LX;

let area = LX.init( { strictViewport: false } );

// Menubar
{
    area.addMenubar( m => {
        
        m.setButtonImage("lexgui.js", "images/icon.png", () => {window.open("https://jxarco.github.io/lexgui.js/")}, {float: "left"})
    
        m.add( "Docs", { icon: "fa-solid fa-magnifying-glass", short: "F1", callback: () => { window.open("./docs/") }});
    
        const panel = new LX.Panel();
        panel.addButton(null, "Search command...", () => { LX.setCommandbarState( true ) }, { width: "256px", className: "right", buttonClass: "outline left" });
        m.root.appendChild( panel.root.childNodes[ 0 ] );
    
        m.addButtons( [
            {
                title: "Github",
                icon: "fa-brands fa-github",
                callback:  (event) => {
                    window.open( "https://github.com/jxarco/lexgui.js/", "_blank" );
                }
            },
            {
                title: "Change Theme",
                icon: "fa-solid fa-sun",
                swap: "fa-solid fa-moon",
                callback:  (event, swapValue) => { LX.setTheme( swapValue ? "light" : "dark" ) }
            }
        ], { float: "right" });
    });
}

// Header
{
    const header = LX.makeContainer( [ null, "auto" ], "col", {
        border: "1px solid rgba(255, 255, 255, 0.08)",
        padding: "36px 24px 36px 24px",
        gap: "8px"
    } );
    
    header.innerHTML = `
        <a>Get started with LexGUI.js</a>
        <h1>Build your application interface</h1>
        <p style="max-width:42rem">A set of beautifully-designed, accessible components and a code distribution platform. 
        Works with your favorite frameworks. Open Source. Open Code.</p>
    `;
    
    area.attach( header );
}

// Content
{
    area.attach( document.createElement('br') );

    const tabs = area.addTabs( { sizes: [ "auto", "auto" ] } );

    const examplesContainer = LX.makeContainer( [ "auto", "850px" ], "", {
        backgroundColor: "red"
    } );

    const tasksContainer = LX.makeContainer( [ "auto", "850px" ], "", {
        backgroundColor: "red"
    } );

    const codeContainer = LX.makeContainer( [ "auto", "850px" ], "", {
        backgroundColor: "red"
    } );

    const audioContainer = LX.makeContainer( [ "auto", "850px" ], "", {
        backgroundColor: "red"
    } );

    tabs.add( "Examples", examplesContainer, { selected: true } );
    tabs.add( "Tasks", tasksContainer );
    tabs.add( "Code", codeContainer );
    tabs.add( "Audio", audioContainer );
}

// Footer
{
    const footer = new LX.Footer( {
        parent: area.root,
        columns: [
            {
                title: "LexGUI",
                items: [
                    { title: "Download", link: "" },
                    { title: "Documentation", link: "" },
                    { title: "Web demo", link: "" },
                    { title: "Source code", link: "" }
                ]
            },
            {
                title: "Projects",
                items: [
                    { title: "Animics", link: "" },
                    { title: "Performs", link: "" }
                ]
            },
            {
                title: "Other stuff",
                items: [
                    { title: "Some section", link: "" },
                    { title: "Just filling", link: "" },
                    { title: "No more ideas", link: "" },
                ]
            }
        ],
        credits: `2019-${ new Date().getUTCFullYear() } Alex Rodríguez and contributors. Website source code on GitHub.`,
        socials: [
            { title: "Github", link: "https://github.com/jxarco/lexgui.js/", icon: `<a class="fa-brands fa-github"></a>` },
            { title: "Discord", link: "https://discord.gg/vwqVrMZBXv", icon: `<a class="fa-brands fa-discord"></a>` }
        ]
    } );
}