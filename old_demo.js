import { LX } from 'lexgui';
import 'lexgui/components/codeeditor.js';
import 'lexgui/components/timeline.js';
import 'lexgui/components/audio.js';

window.LX = LX;

// Init library and get main area
let area = LX.init();

// Change global properties after init
// LX.DEFAULT_NAME_WIDTH = "10%";
// LX.DEFAULT_SPLITBAR_SIZE = 16;
// LX.OPEN_CONTEXTMENU_ENTRY = 'mouseover';

// LX.message("Im in another position", null, { position: [10, 10] });
// LX.message("Welcome to Lexgui", "Welcome!");

// Change some theme colors...
// LX.setThemeColor('global-color-primary', "#211");
// LX.setThemeColor('global-selected', "#a74");
// LX.setThemeColor('global-text', "#f21");

LX.toast( "Scheduled: Catch up", "Friday, February 10, 2023 at 5:57 PM", { action: { name: "Undo", callback: ( toast, actionName, event ) => {
    console.log( toast, actionName );
    toast.close();
} } } );

const code = `
import { LX } from 'lexgui';

class Test {

    constructor() {

        this.foo = 1;

        var div = document.createElement('div');
        div.style.width = "100px"
        div.style.height = "100px"

        // single line comment

        document.body.appendChild( div );

        let a = 1; /* single line block comment */ let b = 2;

        /*
            multiple line block comment
        */
    }
}
`;

const snippet = LX.makeCodeSnippet(code, ["780px", "auto"], {
    tabName: "script.js",
    language: "JavaScript",
    linesAdded: [2, [10, 12]],
    linesRemoved: [14, 16],
    xlineNumbers: false,
    windowMode: true
});
snippet.style.left = "200px";
snippet.style.top = "200px";
snippet.style.position = "absolute";
// document.body.appendChild( snippet );

// menu bar
const menubar = area.addMenubar( [

    { name: "Scene", submenu: [
        { name: "New Scene", callback: () => { console.log("New scene created!") }},
        { name: "Open Scene", icon: "FolderOpen", kbd: "S", callback: () => { console.log("Opening SCENE Dialog") } },
        { name: "Open Recent", icon: "File",  submenu: [
            { name: "hello.scene", callback: name => { console.log("Opening " + name) }},
            { name: "goodbye.scene", callback: name => { console.log("Opening " + name) }}
        ] }
    ] },
    { name: "Project", submenu: [
        { name: "Project Settings", disabled: true, callback: () => { console.log("Opening Project Settings") } },
        null,
        { name: "Export", submenu: [
            { name: "DAE", icon: "Frame", kbd: "D", callback: () => { console.log("Exporting DAE...") }},
            { name: "GLTF", kbd:  "G" }
        ] },
        { name: "Export", icon: "Download" }
    ] },
    { name: "Editor", submenu: [
        { name: "Autosave", checked: true, icon: "Save", callback: (key, v, menuItem) => { console.log(key, v) } },
        { name: "Settings",  icon: "Settings2", callback: () => {
            const dialog = new LX.Dialog( "Settings", p => {
                p.addText("A Text", "Testing first widget");
                p.sameLine(3);
                p.addLabel("Buttons:");
                p.addButton(null, "Click me", () => {
                    console.log( p.getValue("A Text") );
                });
                p.addButton(null, "Click me v2!", () => {
                    console.log( p.getValue("A Text") );
                });
            });
        }},
        { name: "Write BML", icon: "FileCode", callback: () => {

            new LX.PocketDialog( "BML Instruction", p => {

                let htmlStr = "Write in the text area below the bml instructions to move the avatar from the web application. A sample of BML instructions can be tested through the helper tabs in the right panel.";
                p.addTextArea(null, htmlStr, null, {disabled: true, fitHeight: true});

                p.addButton(null, "Click here to see BML instructions and attributes", () => {
                    window.open("https://github.com/upf-gti/SignON-realizer/blob/SiGMLExperiments/docs/InstructionsBML.md");
                });

                htmlStr = "Note: In 'speech', all text between '%' is treated as actual words. An automatic translation from words (dutch) to phonemes (arpabet) is performed.";
                htmlStr += "\n\nNote: Each instruction is inside '{}'. Each instruction is separated by a coma ',' except que last one.";
                p.addTextArea(null, htmlStr, null, {disabled: true, fitHeight: true});

                htmlStr = 'An example: { "type":"speech", "start": 0, "text": "%hallo%.", "sentT": 1, "sentInt": 0.5 }, { "type": "gesture", "start": 0, "attackPeak": 0.5, "relax": 1, "end": 2, "locationBodyArm": "shoulder", "lrSym": true, "hand": "both", "distance": 0.1 }';
                p.addTextArea(null, htmlStr, null, {disabled: true, fitHeight: true});

                const area = new LX.Area({ height: "250px" });
                p.attach( area.root );

                window.editor = new LX.CodeEditor(area, {
                    highlight: 'JSON',
                    skip_info: true
                });

                p.addButton(null, "Send", () => {
                    console.log(":)")
                });

            }, { size: ["30%", null], float: "right", draggable: false});
        }},
        { name: "Open AssetView", icon: "Monitor", callback: createAssetDialog },
    ] },
    { name: "Account", submenu: [
        { name: "Login", icon: "User", callback: createLoginForm },
    ] },
    { name: "Notifications", submenu: [
        { name: "Toast", callback: createToast },
        { name: "Prompt",  callback: () => { LX.prompt("This action cannot be undone. This will permanently delete your account and remove your data from our servers.",
            "Are you absolutely sure?", null, {xposition: ["50px", "100px"]}); } },
    ] },
    { name: "Help", submenu: [
        { name: "Search Help", icon: "Search", kbd:  "F1", callback: () => { window.open("./docs/") }},
        { name: "Support LexGUI", icon: "Heart" },
    ] },

], { sticky: false });

menubar.addButtons( [
    {
        title: "Play",
        icon: "Play",
        swap: "Stop",
        callback:  (value, event) => {
            if( value ) console.log("play!");
            else console.log("stop!");
        }
    },
    {
        title: "Pause",
        icon: "Pause",
        disabled: true,
        callback:  (value, event) => { console.log("pause!"); }
    },
    {
        icon: "RotateLeft",
        callback:  (value, event) => {
            const playButton = m.getButton( "Play" );
            playButton.swap();
        }
    },
    {
        title: "Change Theme",
        icon: "Moon",
        swap: "Sun",
        callback:  (value, event) => { LX.setTheme( value ? "light" : "dark" ) }
    }
]);

menubar.setButtonIcon("Github", "Github", () => {window.open("https://github.com/jxarco/lexgui.js/")})
menubar.setButtonImage("lexgui.js", "images/icon.png", () => {window.open("https://jxarco.github.io/lexgui.js/")}, {float: "left"})

// split main area
var [ left, right ] = area.split({ sizes:["70%","30%"], minimizable: true });

const logParams = (entryName, value, event) => { console.log(entryName, value, event) };
const actionLogParams = (entryName, event) => { console.log("Action called!", entryName, event) };

const customFooter = document.createElement( 'div' );

const fpanel = new LX.Panel();
fpanel.addText(null, "", (value, event) => {}, { placeholder: "Search..." });
customFooter.appendChild( fpanel.root.childNodes[ 0 ] );

const customHeader = document.createElement('div');
customHeader.innerHTML = "Custom simple header";

const sidebar = left.addSidebar( m => {
    m.group( "Projects", { icon: "Plus", callback: (groupName, event) => { console.log(groupName) }} );
    m.add( "Getting Started", { icon: "Box" /*,collapsable: false*/ } );
    m.add( "Getting Started/Installation", { icon: "Box", callback: logParams } );
    m.add( "Getting Started/Project Structure", { icon: "Box", callback: logParams, action: { name: "ShowMenu", callback: actionLogParams, icon: null } } );
    m.add( "Building Your Application", { icon: "Code", callback: logParams, action: { name: "ShowMenu", callback: actionLogParams, icon: null } } );
    m.add( "Search Blocks", { icon: "Search", callback: logParams } );
    m.add( "Very loooooooooooooooooooooooong sun", { icon: "Sun",callback: logParams, action: { name: "ShowMenu", callback: actionLogParams, icon: null } } );
    m.separator();
    m.group( "API Reference" );
    m.add( "Components", { icon: "Box", callback: logParams } );
    m.add( "File Conventions", { icon: "Code", callback: logParams } );
    m.add( "Functions", { icon: "Search",callback: logParams } );
    m.add( "CLI", { icon: "Sun",callback: logParams } );
    m.separator();
    m.group( "Architecture" );
    m.add( "Accessibility ", { icon: "Box", callback: logParams } );
    m.add( "Fast Refresh", { icon: "Code", callback: logParams } );
    m.add( "Supported Browsers", { icon: "Search",callback: logParams } );
    m.separator();
    m.add( "Calendar ", { icon: "Calendar", collapsable: 3 } );
    m.add( "Personal ", { callback: logParams, type: "checkbox" } );
    m.add( "Work", { callback: logParams, type: "checkbox", value: true } );
    m.add( "Family", { callback: logParams, type: "checkbox" } );
}, { /* collapseToIcons: false, skipFooter: true, skipHeader: true,*/
    filter: true,
    headerTitle: "LexGUI",
    headerSubtitle: LX.version,
    headerImage: "https://raw.githubusercontent.com/jxarco/lexgui.js/refs/heads/master/images/icon.png",
    // header: customHeader,
    footerTitle: "jxarco",
    footerSubtitle: "alexroco.30@gmail.com",
    footerImage: "https://avatars.githubusercontent.com/u/25059187?s=400&u=ad8907b748c13e4e1a7cdd3882826acb6a2928b5&v=4",
    // footer: customFooter,
    onHeaderPressed: (e) => { console.log( "onHeaderPressed" ) },
    onFooterPressed: (e, element) => {
        new LX.DropdownMenu( element, [
            "My Account",
            null,
            { name: "Profile", kbd: ["Meta", "P"], icon: "User" },
            { name: "Billing", disabled: true, icon: "CreditCard" },
            { name: "Settings", kbd: "S" },
            null,
            { name: "Team" },
            { name: "Invite users", icon: "Search" },
            null,
            { name: "Github", icon: "Github" },
            { name: "Support", submenu: [
                { name: "Email", icon: "Mail" },
                { name: "Message", submenu: [
                    { name: "Whatsapp", kbd: "W" },
                    { name: "iMessage", kbd: "M" },
                ]},
            ]  }
        ], { side: "right", align: "end" });
    }
});

// split left area
var [up, bottom] = sidebar.siblingArea.split({ type: 'vertical', sizes:["50%", null], minimizable: true });

var kfTimeline = null;
var clipsTimeline = null;
var curvesTimeline = null;

bottom.onresize = bounding => {
    if(kfTimeline) kfTimeline.resize( [ bounding.width, bounding.height ] );
    if(clipsTimeline) clipsTimeline.resize( [ bounding.width, bounding.height ] );
    if(curvesTimeline) curvesTimeline.resize( [ bounding.width, bounding.height ] );
}

// another menu bar
const bottomMenubar = bottom.addMenubar([
    { name: "Information", callback: e => {
        console.log(e);
        var el = document.getElementById('kf-timeline');
        if(el)
            el.style.display = 'none';
        el = document.getElementById('clips-timeline');
        if(el)
            el.style.display = 'none';
        el = document.getElementById('curves-timeline');
        if(el)
            el.style.display = 'none';
        var bottomPanel = document.getElementById('bottom-panel');
        bottomPanel.style.display = 'block';
    } },
    { name: "Keyframes Timeline", callback: e => {
        console.log(e);
        let el = document.getElementById('bottom-panel');
        if(el)
            el.style.display = 'none';
        el = document.getElementById('clips-timeline');
        if(el)
            el.style.display = 'none';
        el = document.getElementById('curves-timeline');
        if(el)
            el.style.display = 'none';
        var timeline = document.getElementById('kf-timeline');
        if(timeline) {
            timeline.style.display = 'block';
            kfTimeline.resize();
        }
        else {
            kfTimeline = new LX.KeyFramesTimeline("kf-timeline", {
                onBeforeCreateTopBar: panel => {
                    panel.addSelect("Animation", ["walk", "run", "idle"], "idle", (v)=> {
                        console.log(v)
                    }, { inputWidth: "50%" })
                },
                onAfterCreateTopBar: panel => {
                    panel.addButton("customBtn", '', ( value, event ) => { }, { title: "Custom Action", icon: "WandSparkles", hideName: true });
                    panel.addButton("anotherCustomBtn", '', ( value, event ) => { }, { title: "Other Custom Action", icon: "Box", hideName: true });
                }
            });

            bottom.attach(kfTimeline.mainArea);
            kfTimeline.setAnimationClip({tracks: [{name: "Item 1.position", values: [0,1,0, 1], times: [0, 0.1, 0.2, 0.3]}, {name: "Item 1.scale", values: [0,1,0, 0.5], times: [0, 0.1, 0.2, 0.3]}, {name: "Item 2", values: [0,1,0,1], times: [0.1, 0.2, 0.3, 0.8]}, {name: "Item 3.position", values: [0,1,0], times: [0, 0.1, 0.2, 0.3]}, {name: "Item 3.scale", values: [0,1,0], times: [0, 0.1, 0.2, 0.3]}], duration: 1});
            kfTimeline.setSelectedItems(["Item 1", "Item 2", "Item 3"]);
            kfTimeline.resize();
            kfTimeline.draw( 0 );
        }
    } },
    { name: "Clips Timeline", callback: e => {
        console.log(e);
        let el = document.getElementById('bottom-panel');
        if(el)
            el.style.display = 'none';

        el = document.getElementById('kf-timeline');
        if(el)
            el.style.display = 'none';
        el = document.getElementById('curves-timeline');
        if(el)
            el.style.display = 'none';
        var ctimeline = document.getElementById('clips-timeline');
        if(ctimeline) {
            ctimeline.style.display = 'block';
            clipsTimeline.resize();
        }
        else {
            clipsTimeline = new LX.ClipsTimeline("clips-timeline");
            bottom.attach(clipsTimeline.mainArea);
            var clip = {id:"Clip1", start:0, duration:1, type:""};
            clipsTimeline.addClip(clip);
            var clip = {id:"Clip2", start:0, fadein: 0.5, fadeout: 0.8, duration:1, type:""};
            clipsTimeline.addClip(clip);
            var clip = {id:"Clip3", start:0, fadein: 0.5, fadeout: 0.8, duration:1, type:""};
            clipsTimeline.addClip(clip);
            var clip = {id:"Clip4", start:0, fadein: 0.5, fadeout: 0.8, duration:1, type:""};
            clipsTimeline.addClip(clip);
            var clip = {id:"Clip5", start:0, fadein: 0.5, fadeout: 0.8, duration:1, type:""};
            clipsTimeline.addClip(clip);

            // clipsTimeline.setAnimationClip({tracks: [{clips: [clip]}], duration: 2});
            clipsTimeline.selectedItems = ["Clip1"];
            clipsTimeline.resize();
            clipsTimeline.draw(0);
        }
    } },
    { name: "Curves Timeline", callback: e => {
        console.log(e);
        let el = document.getElementById('bottom-panel');
        if(el)
            el.style.display = 'none';
        el = document.getElementById('kf-timeline');
        if(el)
            el.style.display = 'none';
        el = document.getElementById('clips-timeline');
        if(el)
            el.style.display = 'none';

        var timeline = document.getElementById('curves-timeline');
        if(timeline) {
            timeline.style.display = 'block';
            curvesTimeline.resize();
        }
        else {
            curvesTimeline = new LX.CurvesTimeline("curves-timeline");
            curvesTimeline.setAnimationClip({tracks: [{name: "Item 1.position", values: [0,1,0,-1], times: [0, 0.1, 0.2, 0.3]}, {name: "Item 1.scale", values: [0,1,0, 0.5], times: [0, 0.1, 0.2, 0.3]}, {name: "Item 2", values: [0,1,0,1], times: [0.1, 0.2, 0.3, 0.8]}, {name: "Item 3.position", values: [0,0,0,1], times: [0, 0.1, 0.2, 0.3]}, {name: "Item 3.scale", values: [0,1,0], times: [0, 0.1, 0.2, 0.3]}], duration: 1});
            curvesTimeline.setSelectedItems(["Item 1", "Item 2", "Item 3"]);
            bottom.attach(curvesTimeline.mainArea);
            curvesTimeline.resize();
            curvesTimeline.draw(0);
        }
    } },

]);

bottom.onresize = bounding => {
    if(clipsTimeline)
        clipsTimeline.resize(  );

    if(kfTimeline)
        kfTimeline.resize();

    if(curvesTimeline)
        curvesTimeline.resize();
}

var bottomPanel = bottom.addPanel({id: "bottom-panel"});
fillBottomPanel( bottomPanel );

// split right area
var [rup, rbottom] = right.split({type: 'vertical', sizes:["70%","30%"]});

// Get new content area to fill it
const topTabs = up.addTabs();

// add canvas to left upper part
var canvas = document.createElement('canvas');
canvas.style.width = "100%";
canvas.style.height = "100%";

const resizeCanvas = ( bounding ) => {
    canvas.width = bounding.width;
    canvas.height = bounding.height;
};

topTabs.add( "Canvas", canvas, { icon: "Palette", selected: true, onCreate: resizeCanvas } );
topTabs.add( "Debug", document.createElement('div'));

// add on resize event to control canvas size
topTabs.area.onresize = resizeCanvas;

topTabs.area.addOverlayButtons( [
    [
        {
            name: "Select",
            icon: "MousePointer",
            callback: (value, event) => console.log(value),
            selectable: true
        },
        {
            name: "Move",
            icon: "Move",
            callback: (value, event) => console.log(value),
            selectable: true
        },
        {
            name: "Rotate",
            icon: "RotateRight",
            callback: (value, event) => console.log(value),
            selectable: true
        }
    ],
    {
        name: "Lit",
        options: ["Lit", "Unlit", "Wireframe"],
        callback: (value, event) => console.log(value)
    },
    [
        {
            name: "Enable Snap",
            icon: "Frame",
            callback: (value, event) => console.log(value),
            selectable: true
        },
        {
            name: 10,
            options: [10, 100, 1000],
            callback: value => console.log(value)
        }
    ], {
        name: "Button 4",
        icon: "Box",
        callback: (value, event) => console.log(value)
    }
], { float: "htc" } );

// add panels
var sidePanel = rup.addPanel();
fillPanel( sidePanel );

const bottomTabs = rbottom.addTabs({ fit: true });
var sideBottomPanel = new LX.Panel();
var sideBottomPanelH = new LX.Panel();
fillRightBottomPanel( sideBottomPanel, 'Vertical' );
fillRightBottomPanel( sideBottomPanelH, 'Horizontal' );

bottomTabs.add( "Panel V", sideBottomPanel );
bottomTabs.add( "Panel H", sideBottomPanelH );

function loop(dt) {

    var ctx = canvas.getContext("2d");

    // Get values from panel widgets (e.g. color value)
    ctx.fillStyle = sidePanel.getValue('Background');

    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = sidePanel.getValue('Font Size') + "px Monospace";

    ctx.fillStyle = sidePanel.getValue('Font Color');

    const text = sidePanel.getValue('Text');
    const pos2D = sidePanel.getValue('2D Position');
    ctx.fillText(text, pos2D[0], pos2D[1]);

    if(kfTimeline)
        kfTimeline.draw();

    if(clipsTimeline)
        clipsTimeline.draw();

    if(curvesTimeline)
        curvesTimeline.draw();

    requestAnimationFrame(loop);
}

// createAssetDialog();

requestAnimationFrame(loop);

// **** **** **** **** **** **** **** **** **** **** **** ****

function fillPanel( panel ) {

    // Add data tree

    let sceneData = {
        'id': 'root',
        'children': [
            {
                'id': 'node_1',
                'children': [
                    {
                        'id': 'node_1_1',
                        'icon': 'Box',
                        'children': [],
                        'actions': [
                            {
                                'name': 'Open script',
                                'icon': 'Scroll',
                                'callback': function(node) {
                                    console.log(node.id + ": Script opened!")
                                }
                            }
                        ]
                    }
                ]
            },
            {
                'id': 'node_2',
                'icon': 'CirclePlay',
                'visible': false,
                'children': []
            },
            {
                'id': 'node_3',
                'children': [
                    {
                        'id': 'node_3_1',
                        'icon': 'Box',
                        'children': []
                    },
                    {
                        'id': 'node_3_2',
                        'icon': 'Box',
                        'children': []
                    }
                ]
            }
        ]
    };

    // This is optional!
    const treeIcons = [
        {
            'name':'Add node',
            'icon': 'Plus',
            'callback': () => { console.log("Node added!") }
        },
        {
            'name':'Instantiate scene',
            'icon': 'Link',
            'callback': () => { console.log("Scene instantiated!") }
        }
    ];

    window.tree = panel.addTree("Scene Tree", sceneData, {
        icons: treeIcons,
        // filter: false,
        addDefault: true,
        onevent: (event) => {
            console.log(event.string());

            switch(event.type) {
                case LX.TreeEvent.NODE_SELECTED:
                    if(event.multiple)
                        console.log("Selected: ", event.node);
                    else
                        console.log(event.node.id + " selected");
                    break;
                case LX.TreeEvent.NODE_DELETED:
                    if(event.multiple)
                        console.log("Deleted: ", event.node);
                    else
                        console.log(event.node.id + " deleted");
                    break;
                case LX.TreeEvent.NODE_DBLCLICKED:
                    console.log(event.node.id + " dbl clicked");
                    break;
                case LX.TreeEvent.NODE_CONTEXTMENU:
                    const m = event.panel;
                    m.add( "Components/Transform");
                    m.add( "Components/MeshRenderer");
                    break;
                case LX.TreeEvent.NODE_DRAGGED:
                    console.log(event.node.id + " is now child of " + event.value.id);
                    break;
                case LX.TreeEvent.NODE_RENAMED:
                    console.log(event.node.id + " is now called " + event.value);
                    break;
                case LX.TreeEvent.NODE_VISIBILITY:
                    console.log(event.node.id + " visibility: " + event.value);
                    break;
            }
        }
    });

    // add widgets to panel branch
    panel.branch("Canvas", {icon: "Palette", filter: true});
    panel.addColor("Background", "#b7a9b1", (value, event) => {
        console.log(value);
    }, { xuseAlpha: true });
    panel.addText("Text", "Lexgui.js @jxarco", null, {placeholder: "e.g. ColorPicker", icon: "Type"});
    panel.addColor("Font Color", { r: 1, g: 0.1, b: 0.6, a: 1 }, (value, event) => {
        console.log("Font Color: ", value);
    }, { xuseAlpha: true, xuseRGB: true });
    panel.addRange("A Default Range", 1, (value, event) => {
        console.log(value);
    }, { min: 0, max: 10, step: 1 });
    panel.addRange("Disabled NoFill Range", 10, (value, event) => {
        console.log(value);
    }, { min: 1, max: 48, step: 1, disabled: true, fill: false});
    panel.addRange("Colored Left Range", 25, (value, event) => {
        console.log(value);
    }, { min: 20, max: 48, step: 1, className: "warning", left: true});
    panel.addNumber("Font Size", 36, (value, event) => {
        console.log(value);
    }, { min: 1, max: 48, step: 1, units: "px"});
    panel.addVector2("2D Position", [250, 350], (value, event) => {
        console.log(value);
    }, { min: 0, max: 1024 });
    panel.addSeparator();
    panel.addRadioGroup( null, "Notify me about...", [ "All new messages", "Direct messages and mentions", "Nothing" ], (v) => { console.log(v) }, { className: "accent", xdisabled: true, selected: 1 } );
    panel.addSeparator();
    panel.addTitle("Configuration (Im a title)", { icon: "Settings3" });
    panel.addCheckbox("Toggle me", true, (value, event) => {
        console.log(value);
    }, { suboptions: (p) => {
        p.addText(null, "Suboption 1");
        p.addNumber("Suboption 2", 12);
    } });
    panel.merge();

    panel.branch("Preferences", {icon: "Settings"});
    panel.addButton(null, "Show Notifications" + LX.badge("+99", "accent sm"));
    panel.addCounter("Calories Counter ", 350, (v) => { console.log( v + " calories!" ) }, { label: "CALORIES/DAY", max: 500 });
    panel.addButton("Colored Tiny Button", "Click here!", () => {}, { buttonClass: "primary xs" });
    panel.addButton("Small Outlined Button", "Click here!", () => {}, { buttonClass: "accent sm outline" });
    panel.addButton("A Classic Button", "Click here!", () => {}, { buttonClass: "md" });
    panel.addCheckbox("I have a label", false, (value, event) => {
        console.log(value);
    }, { label: "Personal", className: "secondary" });
    panel.sameLine(2);
    panel.addToggle("Colored Toggle", false, (value, event) => {
        console.log(value);
    }, { label: "", className: "accent", nameWidth: "50%" });
    panel.addToggle("Outlined Toggle ", false, (value, event) => {
        console.log(value);
    }, { label: "", className: "secondary outline", nameWidth: "50%" });
    panel.addFile("I'm a File Input", data => { console.log(data) }, {  } );
    panel.addFile("A Disabled File Input", data => { console.log(data) }, { disabled: true } );
    panel.addSelect("Best Tool", ["@Engines", "Godot", "Unity", "Unreal Engine", "@Apps", "Visual Studio", "Visual Studio Code"], "Unity", (value, event) => {
        console.log(value);
    }, {filter: true, emptyMsg: "No engines found.", placeholder: "Search engines..."});
    panel.addSelect("Best Logo", [{value:"Godot", src: "https://godotengine.org/assets/press/logo_vertical_color_light.png"}, {value: "Unity", src: "https://logos-world.net/wp-content/uploads/2023/01/Unity-Logo.png"}, {value:"Unreal Engine", src: "https://cdn2.unrealengine.com/ue-logo-stacked-unreal-engine-w-677x545-fac11de0943f.png"}], "Godot", (value, event) => {
        console.log(value);
    });
    panel.addSelect("Best Gif", [{value:"Godot", src: "https://i.redd.it/4vepr95bye861.gif"}, {value: "Unity", src: "https://i.gifer.com/origin/db/db3cb258e9bbb78c5851a000742e5468_w200.gif"}, {value:"Unreal Engine", src: "https://d3kjluh73b9h9o.cloudfront.net/original/4X/e/0/d/e0deb23c10cc7852c6ab91c28083e27f9c8228f8.gif"}], "Godot", (value, event) => {
        console.log(value);
    });

    window.vec = panel.addVector3("Im a Vec3", [0.1, 0.4, 0.5], (value, event) => {
        console.log(value);
    });
    panel.addLayers("Layers", 10, (value, event) => {
        console.log(value);
    });
    panel.addArray("An Item Array", ['GPTeam', 'Blat Panthers', 'Blat Bunny'], (value, event) => {
        console.log(value);
    });
    panel.addTags("Game Tags", "2d, karate, ai, engine, ps5, console", (value, event) => {
        console.log(value);
    });
    panel.addComboButtons("Alignment", [
        {
            value: 'left',
            selected: true,
            icon: "AlignLeft",
            callback: (value, event) => {
                console.log(value);
            }
        }, {
            value: 'center',
            icon: "AlignCenter",
            callback: (value, event) => {
                console.log(value);
            }
        }, {
            value: 'right',
            disabled: true,
            icon: "AlignRight",
            callback: (value, event) => {
                console.log(value);
            }
        }
    ], { /* toggle: true, noSelection: true */ });
    panel.addList(null, ['GPTeam', 'Blat Bunny', ['Blat Panthers', 'PawPrint']], 'Blat Panthers',  (value, event) => {
        console.log(value);
    });
    const opacityValues = [
        [0.2, 0.3146875],
        [0.417313915857606, 0.8946875000000003],
        [0.5495145631067961, 0.6746875],
        [1, 1]
    ];
    panel.addCurve("Opacity", opacityValues, (value, event) => {
        console.log(value);
    });
    panel.addPad("2D Pad", [0.5, 0.5], (value, event) => {
        console.log(value);
    }, { padSize: "100px", min: -1, max: 2 });
    panel.addSize("Screen Res", [1280, 720], (value, event) => {
        console.log(value);
    }, { units: "p", precision: 0 });

    panel.branch("Contents", {icon: "Book"});
    panel.addCard( "MY PERSONAL CARD", { img: "data/Screenshot_Code.png" } );
    const anElement = document.createElement( "div" );
    anElement.style.width = anElement.style.height = "24px";
    anElement.style.backgroundColor = "red";
    panel.addContent( null, anElement );
    panel.addImage( null, "data/Screenshot_Graph.png" );
    panel.merge();

    // This is outside a branch
    panel.addText("Im out :(", "", null, { placeholder: "Alone..." });
    panel.addVector4("Im a Vec4", [0.3, 0.3, 0.5, 1], (value, event) => {
        console.log(value);
    });
    panel.addButton(null, "Click me, Im Full Width...");
    panel.addButton("Test Button", "Reduced width...");
    panel.addSeparator();
    panel.addBlank(12);
}

function fillRightBottomPanel( panel, tab ) {

    panel.clear();

    panel.branch("Bottom", { icon: "Grid3x3" });

    if(tab == 'Horizontal')
    {
        panel.addTabSections( "H_tabs", [
            {
                name: "First tab",
                icon: "Discord",
                onCreate: p => {
                    p.addTitle("Discord tab");
                    p.addButton(null, "Connect");
                },
                onSelect: p => {
                    console.log( p );
                }
            },
            {
                name: "Second tab",
                icon: "X-Twitter",
                onCreate: p => {
                    p.addTitle("Twitter tab");
                    p.addText("Tweet", "", null, {placeholder: "Tyler Rake 2"});
                }
            },
            {
                name: "Third tab",
                icon: "Github",
                onCreate: p => {
                    p.addTitle("Github tab");
                    p.addButton(null, "Go", () => {window.open("https://github.com/jxarco/lexgui.js/")});
                }
            }
        ], { vertical: false /*, showNames: true */});

        panel.addText(null, "Widgets below are out the tabs", null, { disabled: true })

        // update panel values uising widget name
        panel.addNumber("HeadRoll Value", 0, (value, event) => {
            panel.setValue('HeadRoll', value);
        }, { min: -1, max: 1, step: 0.1 });
        panel.addProgress("HeadRoll", 0, { min: -1, max: 1, low: -0.25, high: 0.25, optimum: 0.75, showValue: true, editable: true, callback: (value, event) => {
            panel.setValue('HeadRoll Value', value);
        } });
    }
    else if(tab == 'Vertical')
    {
        panel.addTabSections( "V_tabs", [
            {
                name: "First tab",
                icon: "Discord",
                onCreate: (p, content) => {
                    p.addTitle("Discord tab");
                    p.addButton("Apply", "Add button to branch", (value, event) => {
                        p.queue( content );
                        p.addButton(null, "Hello");
                        p.clearQueue();
                    });
                }
            },
            {
                name: "Second tab",
                icon: "X-Twitter",
                onCreate: p => {
                    p.addTitle("Twitter tab");
                    p.addText("Tweet", "", null, {placeholder: "Tyler Rake 2"});
                }
            },
            {
                name: "Third tab",
                icon: "Github",
                onCreate: p => {
                    p.addTitle("Github tab");
                    p.addButton(null, "Go", (value, event) => {window.open("https://github.com/jxarco/lexgui.js/")});
                }
            }
        ]);

        /************** */
        // Custom Widget

        LX.ADD_CUSTOM_WIDGET( "Shader", {
            icon: "Box",
            default: {
                position: [0, 0],
                velocity: [0, 0, 0],
                color: [0, 0, 0, 0],
                hexColor: "#000",
                highRes: false
            }
        });

        const shaderInstance = {
            'hexColor': "#f5f505",
            'highRes': true
        };

        panel.addShader( "A Shader", shaderInstance, (instance) => { console.log(instance) } );
        panel.addShader( "Empty Instance", null );

        /************** */
    }

    panel.merge();
}

function fillBottomPanel( panel ) {

    // add widgets to panel branch
    panel.branch("Information", {icon: "Info"});
    window.tableWidget = panel.addTable("A Table", {
        head: [ "Name", "Status", "Priority" ],
        body: [
            [ "Alice", "In Progress", "High" ],
            [ "Bob", "Backlog", "Medium" ],
            [ "Prince", "Canceled", "Low" ],
            [ "Sean", "Done", "High" ],
            [ "Carter", "In Progress", "Medium" ],
            [ "James", "Backlog", "Low" ],
            [ "Mickey", "Todo", "Low" ],
            [ "Charlie", "Canceled", "Low" ],
            [ "Potato", "Todo", "High" ]
        ]
    }, {
        selectable: true,
        sortable: true,
        toggleColumns: true,
        filter: "Name",
        customFilters: [
            { name: "Status", options: ["Backlog", "Todo", "In Progress", "Done", "Cancelled"] },
            { name: "Priority", options: ["Low", "Medium", "High"] },
        ],
        rowActions: [
            { icon: "Edit", title: "Edit Row", callback: ( tableData ) => {} }, // custom: you can change the data and refresh will be called later!
            "delete",
            "menu"
        ],
        onMenuAction: ( index, tableData ) => {
            return [
                { name: "Export", callback: (a) => {
                    tableData.body[index][0] = "Alex";
                    tableWidget.refresh();
                } },
                { name: "Make a copy", callback: (a) => console.log(a) },
                { name: "Favourite", callback: (a) => console.log(a) }
            ]
        }
    });
    panel.addText("Camera", "Canon EOS 80D", null, {disabled: true});
    panel.addText("Text", "Warning text", null, { warning: true });
    const patternOptions = { uppercase: true }
    panel.addText("Text With Validator Pattern", "", (value, event) => {
        console.log(value);
    }, { pattern: LX.buildTextPattern( patternOptions ) });
    panel.addTextArea("Notes", "", (value, event) => {
        console.log(value);
    }, { placeholder: 'Some notes...' });
    panel.addKnob("A Small but disabled Knob", 4, 0, 200, value => { console.log( value ) }, { size: 'sm', disabled: true });
    panel.addKnob("A Knob", 4, 0, 200, value => { console.log( value ) } );
    panel.addKnob("A Big Knob with Snap", 4, 0, 200, value => { console.log( value ) }, { size: 'bg', snap: 4 });
    panel.addButton("Apply", "Add button to branch", (value, event) => {
        const branch = panel.getBranch("Information");
        panel.queue( branch.content );
        panel.addButton(null, "Hello");
        panel.clearQueue();
    });

    panel.branch("A collapsed branch", { closed: true });
    panel.addText(null, "Nothing here", null, { disabled: true });
    panel.merge();
}

function createToast() {

    const generatedToasts = [
        ["🏆 The Lakers secured a thrilling victory!", "Saturday, March 23 2024, at 7:30 PM"],
        ["⚽ Messi scores a last-minute goal!", "Friday, March 22 2024, at 9:15 PM"],
        ["🎾 Nadal wins another Grand Slam title!", "Thursday, March 21 2024, at 5:00 PM"],
        ["🏀 Warriors dominate in a stunning comeback!", "Wednesday, March 20 2024, at 8:45 PM"],
        ["⚾ Yankees hit a walk-off home run!", "Tuesday, March 19 2024, at 10:10 PM"],
        ["🏈 Chiefs claim another Super Bowl win!", "Monday, March 18 2024, at 6:00 PM"],
        ["🥊 Knockout! The champion retains the title!", "Sunday, March 17 2024, at 11:00 PM"],
        ["🏎️ Verstappen takes the checkered flag in style!", "Saturday, March 16 2024, at 3:30 PM"],
        ["🥇 Olympic record shattered in 100m sprint!", "Friday, March 15 2024, at 4:20 PM"],
        ["🏌️ Hole-in-one! Golf legend makes history!", "Thursday, March 14 2024, at 2:00 PM"]
    ];
    const idx = (Math.random() * (generatedToasts.length - 1))|0;

    LX.toast( generatedToasts[idx][0], generatedToasts[idx][1], { action: { name: "Got it!", callback: ( toast, actionName, event ) => {
        console.log( toast, actionName );
        toast.close();
    } } } );

}

function createLoginForm() {

    let dialog = new LX.Dialog('Login', panel => {

        const formData = {
            Username: {
                value: "",
                placeholder: "Enter username",
                icon: "User",
                pattern: LX.buildTextPattern( { minLength: 3 } )
            },
            Password: {
                value: "",
                type: "password",
                placeholder: "Enter password",
                icon: "KeyRound",
                pattern: LX.buildTextPattern( { lowercase: true, uppercase: true, digit: true, minLength: 6 } )
            }
        };

        panel.addForm("Test form", formData, (value, event) => {
            console.log(value);
        }, { actionName: "Login" });

        panel.addLabel( "Or", { float: 'center' } );

        panel.addButton( null, "Sign up", ( value, event ) => { });

    }, { close: true, minimize: false, size: ["25%"], scroll: true, resizable: true, draggable: true });
}

function createAssetDialog() {

    let dialog = new LX.Dialog('Non Manual Features lexemes', (p) => {

        const previewActions = [
            {
                name: 'Print Clip',
                type: 'clip',
                callback: ( item ) => {
                    console.log(item);
                }
            },
            {
                name: 'Print Image',
                type: 'image',
                callback: ( item ) => {
                    console.log(item);
                }
            },
            {
                name: 'Common',
                callback: ( item ) => {
                    console.log(item);
                }
            }
        ];

        var assetView = new LX.AssetView({
            skipBrowser: true,
            skipNavigation: true,
            previewActions: previewActions
        });

        p.attach( assetView );
        let assetData = [];
        const values = ['brow_lowerer.png', 'godot_pixelart.png', 'godot_canvas.png' ];

        for(let i = 0; i < values.length; i++){
            let data = {
                id: values[i],
                type: i == 0 ? "clip" : "image",
                src: "data/" + values[i].toLowerCase(),
            }
            assetData.push(data);
        }

        assetView.load( assetData, (e,v) => {
            switch(e.type) {
                case LX.AssetViewEvent.ASSET_SELECTED:
                    if(e.multiple)
                        console.log("Selected: ", e.item);
                    else
                        console.log(e.item.id + " selected");
                    break;
                case LX.AssetViewEvent.ASSET_DELETED:
                    console.log(e.item.id + " deleted");
                    break;
                case LX.AssetViewEvent.ASSET_CLONED:
                    console.log(e.item.id + " cloned");
                    break;
                case LX.AssetViewEvent.ASSET_RENAMED:
                    console.log(e.item.id + " is now called " + e.value);
                    break;
            }
        })
    },{ title:'Lexemes', close: true, minimize: false, size: ["80%"], scroll: true, resizable: true, draggable: true });
}