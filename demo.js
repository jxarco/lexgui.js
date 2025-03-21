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
            { title: "Github", link: "", icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512"><path d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6.0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6.0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3.0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1.0-6.2-.3-40.4-.3-61.4.0.0-70 15-84.7-29.8.0.0-11.4-29.1-27.8-36.6.0.0-22.9-15.7 1.6-15.4.0.0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5.0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9.0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4.0 33.7-.3 75.4-.3 83.6.0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3.7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3.3 2.9 2.3 3.9 1.6 1 3.6.7 4.3-.7.7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3.7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3.7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6.0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9.0-6.2-1.4-2.3-4-3.3-5.6-2z"></path></svg>` },
            { title: "BlueSky", link: "", icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path d="M407.8 294.7c-3.3-.4-6.7-.8-10-1.3 3.4.4 6.7.9 10 1.3zM288 227.1C261.9 176.4 190.9 81.9 124.9 35.3 61.6-9.4 37.5-1.7 21.6 5.5 3.3 13.8.0 41.9.0 58.4S9.1 194 15 213.9c19.5 65.7 89.1 87.9 153.2 80.7 3.3-.5 6.6-.9 10-1.4-3.3.5-6.6 1-10 1.4-93.9 14-177.3 48.2-67.9 169.9C220.6 589.1 265.1 437.8 288 361.1c22.9 76.7 49.2 222.5 185.6 103.4 102.4-103.4 28.1-156-65.8-169.9-3.3-.4-6.7-.8-10-1.3 3.4.4 6.7.9 10 1.3 64.1 7.1 133.6-15.1 153.2-80.7C566.9 194 576 75 576 58.4s-3.3-44.7-21.6-52.9c-15.8-7.1-40-14.9-103.2 29.8C385.1 81.9 314.1 176.4 288 227.1z"></path></svg>` },
            { title: "Mastodon", link: "", icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M433 179.1c0-97.2-63.7-125.7-63.7-125.7-62.5-28.7-228.6-28.4-290.5.0.0.0-63.7 28.5-63.7 125.7.0 115.7-6.6 259.4 105.6 289.1 40.5 10.7 75.3 13 103.3 11.4 50.8-2.8 79.3-18.1 79.3-18.1l-1.7-36.9s-36.3 11.4-77.1 10.1c-40.4-1.4-83-4.4-89.6-54a102.5 102.5.0 01-.9-13.9c85.6 20.9 158.7 9.1 178.8 6.7 56.1-6.7 105-41.3 111.2-72.9 9.8-49.8 9-121.5 9-121.5zm-75.1 125.2h-46.6V190.1c0-49.7-64-51.6-64 6.9v62.5H201V197c0-58.5-64-56.6-64-6.9v114.2H90.2c0-122.1-5.2-147.9 18.4-175 25.9-28.9 79.8-30.8 103.8 6.1l11.6 19.5 11.6-19.5c24.1-37.1 78.1-34.8 103.8-6.1 23.7 27.3 18.4 53 18.4 175z"></path></svg>` },
            { title: "Discord", link: "", icon: `<a class="fa-brands fa-discord"></a>` },
            { title: "Reddit", link: "", icon: `<a class="fa-brands fa-reddit"></a>` }
        ]
    } );
}