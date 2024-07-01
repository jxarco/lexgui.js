import { LX } from 'lexgui';
import 'lexgui/components/codeeditor.js';
import 'lexgui/components/timeline.js';

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

// menu bar
area.addMenubar( m => {

    // {options}: callback, icon, short

    m.add( "Scene/New Scene", () => { console.log("New scene created!") });
    m.add( "Scene/Open Scene", { icon: "fa-solid fa-folder-open", short:  "S", callback: () => { console.log("Opening SCENE Dialog") } } );
    m.add( "Scene/Open Recent/hello.scene", name => { console.log("Opening " + name) });
    m.add( "Scene/Open Recent/goodbye.scene", name => { console.log("Opening " + name) });
    m.add( "Project/Project Settings" );
    m.add( "Project/Export", { icon: "fa-solid fa-download" });
    m.add( "Project/Export/DAE", { icon: "fa-solid fa-cube", short: "D", callback: () => { console.log("Exporting DAE...") }} );
    m.add( "Project/Export/GLTF", { short:  "G" } );
    m.add( "Editor/Autosave", { type: 'checkbox', icon: "fa fa-floppy-disk", callback: (v, name) => { console.log(name + ": " + v ) } });
    m.add( "Editor/Test", () => LX.prompt("Editor", "Test?"));
    m.add( "Editor/Settings", { icon: "fa-solid fa-gears", callback: () => {
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
    }} );
    m.add( "Editor/Write BML", { icon: "fa-solid fa-gears", callback: () => {

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
    }} );
    m.add( "Editor/Open AssetView", { icon: "fa-solid fa-rect", callback: () => {
        createAssetDialog();
    }} );
    m.add( "Help/Search Help", { icon: "fa-solid fa-magnifying-glass", short:  "F1", callback: () => { window.open("./docs/") }});
    m.add( "Help/Support LexGUI/Please", { icon: "fa-solid fa-heart" } );
    m.add( "Help/Support LexGUI/Do it" );
    m.add( "Timeline/Shortcuts", { disabled: true });
    m.add( "Timeline/Shortcuts/Play-Pause", { short: "SPACE" });
    m.add( "Timeline/Shortcuts/Zoom", { short: "Wheel" });
    m.add( "Timeline/Shortcuts/Change time", { short: "Left Click+Drag" });
    m.add( "Timeline/Shortcuts/Move keys", { short: "Hold CTRL" });
    m.add( "Timeline/Shortcuts/Add keys", { short: "Right Click" });
    m.add( "Timeline/Shortcuts/Delete keys");
    m.add( "Timeline/Shortcuts/Delete keys/Single", { short: "DEL" });
    m.add( "Timeline/Shortcuts/Delete keys/Multiple", { short: "Hold LSHIFT" });
    m.add( "Timeline/Shortcuts/Key Selection");
    m.add( "Timeline/Shortcuts/Key Selection/Single", { short: "Left Click" });
    m.add( "Timeline/Shortcuts/Key Selection/Multiple", { short: "Hold LSHIFT" });
    m.add( "Timeline/Shortcuts/Key Selection/Box", { short: "Hold LSHIFT+Drag" });
    m.addButtons( [
        {
            title: "Play",
            icon: "fa-solid fa-play",
            callback:  (domEl) => { 
                console.log("play!"); 
                domEl.classList.toggle('fa-play'), domEl.classList.toggle('fa-stop');
            }
        },
        {
            title: "Pause",
            icon: "fa-solid fa-pause",
            disabled: true,
            callback:  (domEl) => { console.log("pause!") }
        },
        {
            icon: "fa-solid fa-magnifying-glass",
            callback:  (domEl) => { console.log("glass!") }
        }
    ]);
    
    m.getButton("Play");
    m.setButtonIcon("Github", "fa-brands fa-github", () => {window.open("https://github.com/jxarco/lexgui.js/")})
    m.setButtonImage("lexgui.js", "images/icon.png", () => {window.open("https://jxarco.github.io/lexgui.js/")}, {float: "left"})
});

// split main area
var [left, right] = area.split({ sizes:["80%","20%"], minimizable: true });

// split left area
var [up, bottom] = left.split({ type: 'vertical', sizes:["50%", null], minimizable: true });

var kfTimeline = null;
var clipsTimeline = null;
var curvesTimeline = null;

bottom.onresize = bounding => {
    if(kfTimeline) kfTimeline.resize( [ bounding.width, bounding.height ] );
    if(clipsTimeline) clipsTimeline.resize( [ bounding.width, bounding.height ] );
    if(curvesTimeline) curvesTimeline.resize( [ bounding.width, bounding.height ] );
}

// another menu bar
bottom.addMenubar( m => {
    m.add( "Information", e => { 
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
    });

    m.add( "Keyframes Timeline", e => { 
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
            kfTimeline = new LX.KeyFramesTimeline("kf-timeline", { width: m.root.clientWidth, height: m.parent.root.parentElement.clientHeight - m.root.clientHeight });
            bottom.attach(kfTimeline.root);
            kfTimeline.setSelectedItems(["Item 1", "Item 2", "Item 3"]);
            kfTimeline.setAnimationClip({tracks: [{name: "Item 1.position", values: [0,1,0, 1], times: [0, 0.1, 0.2, 0.3]}, {name: "Item 1.scale", values: [0,1,0, 0.5], times: [0, 0.1, 0.2, 0.3]}, {name: "Item 2", values: [0,1,0,1], times: [0.1, 0.2, 0.3, 0.8]}, {name: "Item 3.position", values: [0,1,0], times: [0, 0.1, 0.2, 0.3]}, {name: "Item 3.scale", values: [0,1,0], times: [0, 0.1, 0.2, 0.3]}], duration: 1});
            
            kfTimeline.addButtons([
                { icon: 'fa fa-wand-magic-sparkles', name: 'autoKeyEnabled' },
                { icon: 'fa fa-filter', name: "optimize", callback: (value, event) => {   kfTimeline.onShowOptimizeMenu(event);}},
                { icon: 'fa-regular fa-rectangle-xmark', name: 'unselectAll', callback: (value, event) => { kfTimeline.unSelectAllKeyFrames();}}
            ]);
            
            kfTimeline.draw(0);
        }
    });

    m.add( "Clips Timeline", e => { 
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
            clipsTimeline = new LX.ClipsTimeline("clips-timeline", {width: m.root.clientWidth, height: m.parent.root.parentElement.clientHeight - m.root.clientHeight});
            bottom.attach(clipsTimeline.root);
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
  
            clipsTimeline.draw(0);
        }
    });

    m.add( "Curves Timeline", e => { 
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
            curvesTimeline = new LX.CurvesTimeline("curves-timeline", {width: m.root.clientWidth, height: m.parent.root.parentElement.clientHeight - m.root.clientHeight, range: [-1,1]});
            curvesTimeline.setSelectedItems(["Item 1", "Item 2", "Item 3"]);
            curvesTimeline.setAnimationClip({tracks: [{name: "Item 1.position", values: [0,1,0,-1], times: [0, 0.1, 0.2, 0.3]}, {name: "Item 1.scale", values: [0,1,0, 0.5], times: [0, 0.1, 0.2, 0.3]}, {name: "Item 2", values: [0,1,0,1], times: [0.1, 0.2, 0.3, 0.8]}, {name: "Item 3.position", values: [0,0,0,1], times: [0, 0.1, 0.2, 0.3]}, {name: "Item 3.scale", values: [0,1,0], times: [0, 0.1, 0.2, 0.3]}], duration: 1});
            bottom.attach(curvesTimeline.root);
            curvesTimeline.draw(0);
        }
    });

    bottom.onresize = bounding => {
        if(clipsTimeline)
            clipsTimeline.resize(  );
        
        if(kfTimeline)
            kfTimeline.resize();
        
        if(curvesTimeline)
            curvesTimeline.resize();
    }
} );

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

topTabs.add( "Canvas", canvas, { selected: true, onCreate: resizeCanvas } );
topTabs.add( "Debug", document.createElement('div'));

// add on resize event to control canvas size
topTabs.area.onresize = resizeCanvas;

topTabs.area.addOverlayButtons( [ 
    [
        {
            name: "Select",
            icon: "fa fa-arrow-pointer",
            callback: (value, event) => console.log(value),
            selectable: true
        },
        {
            name: "Move",
            icon: "fa-solid fa-arrows-up-down-left-right",
            img: "https://webglstudio.org/latest/imgs/mini-icon-gizmo.png",
            callback: (value, event) => console.log(value),
            selectable: true
        },
        {
            name: "Rotate",
            icon: "fa-solid fa-rotate-right",
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
            icon: "fa fa-table-cells",
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
        img: "https://webglstudio.org/latest/imgs/mini-icon-gizmo.png",
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
                        'icon': 'fa-solid fa-cube',
                        'children': [],
                        'actions': [
                            {
                                'name': 'Open script',
                                'icon': 'fa-solid fa-scroll',
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
                'icon': 'fa-solid fa-circle-play',
                'children': []
            }
        ]
    };

    // This is optional!
    const treeIcons = [
        {
            'name':'Add node',
            'icon': 'fa-solid fa-plus',
            'callback': () => { console.log("Node added!") }
        },
        {
            'name':'Instantiate scene',
            'icon': 'fa-solid fa-link',
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
    panel.branch("Preferences", {icon: "fa-solid fa-gear"});
    panel.addButton(null, "Click me, Im Full Width...");
    panel.addText("Text", "Warning text", null, { warning: true });
    panel.sameLine(2);
    panel.addFile("Img1", data => { console.log(data) }, {} );
    panel.addFile("Img2", data => { console.log(data) }, {} );
    panel.addDropdown("Best Engine", ["Godot", "Unity", "Unreal Engine"], "Unity", (value, event) => {
        console.log(value);
    });

    panel.addDropdown("Best Logo", [{value:"Godot", src: "https://godotengine.org/assets/press/logo_vertical_color_light.webp"}, {value: "Unity", src: "https://logos-world.net/wp-content/uploads/2023/01/Unity-Logo.png"}, {value:"Unreal Engine", src: "https://cdn2.unrealengine.com/ue-logo-stacked-unreal-engine-w-677x545-fac11de0943f.png"}], "Godot", (value, event) => {
        console.log(value);
    }, {filter: true});

    panel.addDropdown("Best Gif", [{value:"Godot", src: "https://i.redd.it/4vepr95bye861.gif"}, {value: "Unity", src: "https://i.gifer.com/origin/db/db3cb258e9bbb78c5851a000742e5468_w200.gif"}, {value:"Unreal Engine", src: "https://d3kjluh73b9h9o.cloudfront.net/original/4X/e/0/d/e0deb23c10cc7852c6ab91c28083e27f9c8228f8.gif"}], "Godot", (value, event) => {
        console.log(value);
    }, {filter: true});

    panel.addVector3("Im a Vec3", [0.1, 0.4, 0.5], (value, event) => {
        console.log(value);
    });
    panel.addLayers("Layers", 10, (value, event) => {
        console.log(value);
    });
    panel.addArray("Array", ['GPTeam', 'Blat Panthers', 'Blat Bunny'], (value, event) => {
        console.log(value);
    });
    panel.addTags("Game Tags", "2d, karate, ai, engine, ps5, console", (value, event) => {
        console.log(value);
    });
    panel.addComboButtons("Alignment", [
        {
            value: 'left',
            icon: 'fa fa-align-left',
            callback: (value, event) => {
                console.log(value);
            }
        }, {
            value: 'center',
            icon: 'fa fa-align-center',
            callback: (value, event) => {
                console.log(value);
            }
        }, {
            value: 'right',
            icon: 'fa fa-align-right',
            callback: (value, event) => {
                console.log(value);
            }
        }
    ], {selected: "center"});
    panel.addList(null, ['GPTeam', 'Blat Bunny', ['Blat Panthers', 'fa-solid fa-paw']], 'Blat Panthers',  (value, event) => {
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

    // another branch
    panel.branch("Canvas", {icon: "fa-solid fa-palette", filter: true});
    panel.addColor("Background", "#b7a9b1");
    panel.addText("Text", "Lexgui.js @jxarco", null, {placeholder: "e.g. ColorPicker", icon: "fa fa-font"});
    panel.addColor("Font Color", [1, 0.1, 0.6], (value, event) => {
        console.log("Font Color: ", value);
    });
    panel.addNumber("Font Size", 36, (value, event) => {
        console.log(value);
    }, { min: 1, max: 48, step: 1});
    panel.addVector2("2D Position", [250, 350], (value, event) => {
        console.log(value);
    }, { min: 0, max: 1024 });
    panel.addSeparator();
    panel.addTitle("Configuration (Im a title)");
    panel.addCheckbox("Toggle me", true, (value, event) => {
        console.log(value);
    }, { suboptions: (p) => {
        p.addText(null, "Suboption 1");
        p.addNumber("Suboption 2", 12);
    } });
    panel.addFile("Image", data => { console.log(data) }, {} );
    panel.merge();

    // This is outside a branch
    panel.addText("Im out :(", "", null, { placeholder: "Alone..." });
    panel.addVector4("Im a Vec4", [0.3, 0.3, 0.5, 1], (value, event) => {
        console.log(value);
    });
    panel.addButton(null, "Click me, Im Full Width...");
    panel.addButton("Test Button", "Reduced width...");
    panel.addBlank(12);
}

function fillRightBottomPanel( panel, tab ) {
    
    panel.clear();

    panel.branch("Bottom", {icon: "fa-solid fa-table-list"});

    if(tab == 'Horizontal')
    {
        panel.addTabs([
            { 
                name: "First tab",
                icon: "fa-brands fa-discord",
                callback: p => {
                    p.addTitle("Discord tab");
                    p.addButton(null, "Connect");
                }
            },
            { 
                name: "Second tab",
                icon: "fa-brands fa-twitter",
                callback: p => {
                    p.addTitle("Twitter tab");
                    p.addText("Tweet", "", null, {placeholder: "Tyler Rake 2"});
                }
            },
            { 
                name: "Third tab",
                icon: "fa-brands fa-github",
                callback: p => {
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
        panel.addProgress("HeadRoll", 0, { min: -1, max: 1, showValue: true, editable: true, callback: (value, event) => {
            panel.setValue('HeadRoll Value', value);
        } });
    }
    else if(tab == 'Vertical')
    {
        panel.addTabs([
            { 
                name: "First tab",
                icon: "fa-brands fa-discord",
                callback: (p, content) => {
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
                icon: "fa-brands fa-twitter",
                callback: p => {
                    p.addTitle("Twitter tab");
                    p.addText("Tweet", "", null, {placeholder: "Tyler Rake 2"});
                }
            },
            { 
                name: "Third tab",
                icon: "fa-brands fa-github",
                callback: p => {
                    p.addTitle("Github tab");
                    p.addButton(null, "Go", (value, event) => {window.open("https://github.com/jxarco/lexgui.js/")});
                }
            }
        ]);

        /************** */
        // Custom Widget

        LX.ADD_CUSTOM_WIDGET( 'Shader', {
            // icon: "fa-dice-d6",
            default: {
                'position': [0, 0],
                'velocity': [0, 0, 0],
                'color': [0, 0, 0, 0],
                'hex_color': '#000',
                'high_res': false
            }
        });

        const shaderInstance = {
            'hex_color': '#f5f505',
            'high_res': true
        };

        panel.addShader( "PBR Shader", shaderInstance, (instance) => { console.log(instance) } );
        panel.addShader( "Empty", null );

        /************** */
    }

    panel.merge();
}

function fillBottomPanel( panel ) {
    
    // add widgets to panel branch
    panel.branch("Information", {icon: "fa fa-circle-info"});
    panel.addText("Camera", "Canon EOS 80D", null, {disabled: true}); 
    panel.addText("Serial number", "194E283DD", (value, event) => {
        console.log(value);
    });
    panel.addTextArea("Notes", "", (value, event) => {
        console.log(value);
    }, { placeholder: 'Some notes...' });
    panel.addButton("Apply", "Add button to branch", (value, event) => {
        const branch = panel.getBranch("Information");
        panel.queue( branch.content );
        panel.addButton(null, "Hello");
        panel.clearQueue();
    });

    panel.branch("A collapsed branch", {closed: true});
    panel.addText(null, "Nothing here", null, {disabled: true});
    panel.merge();
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
            skip_browser: true,
            skip_navigation: true,
            preview_actions: previewActions
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
LX.popup("Hello! I'm a popup :)", null, {position: ["50px", "100px"]})