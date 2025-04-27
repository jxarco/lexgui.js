import { LX } from 'lexgui';

// init library and get main area
let area = await LX.init();

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
        icon: "Search",
        callback:  (event) => { console.log("glass!") }
    }
]);
menubar.setButtonIcon("Github", "Github", () => { window.open("https://github.com/jxarco/lexgui.js/")})
menubar.setButtonImage("lexgui.js", "data/icon_godot_version.png", () => { window.open("https://github.com/jxarco/lexgui.js/")}, {float: "left"})

// split main area
var [_left,right] = area.split({sizes:["83%","17%"]});

// split main area
var [left,middle] = _left.split({sizes:["20%","80%"]});

// split left area
var [up, bottom] = middle.split({type: 'vertical', sizes:["70vh","30vh"]});

const bottom_tabs = bottom.addTabs({folding: "up"});

// Output
const output_area = new LX.Area({width: "calc(100% - 8px)", height: "calc(100% - 8px)"});
output_area.root.style.backgroundColor = LX.getThemeColor('global-color-secondary');
output_area.root.style.margin = "4px";
output_area.root.style.borderRadius = "6px";

const output_panel = output_area.addPanel();
output_panel.addTextArea(null, "Godot Engine v4.1.stable.official (c) 2007-present Juan Linietsky, Ariel Manzur & Godot Contributors.", null, {
    height: "100%",
    disabled: true,
    style: {
        'font-family': 'Inconsolata, monospace',
        'border': 'none',
        'resize': 'none'
    }
});

// Debugger
const debugger_area = new LX.Area({width: "calc(100% - 8px)", height: "calc(100% - 8px)"});
const debugger_tabs = debugger_area.addTabs();

debugger_tabs.add( "Stack Trace",  document.createElement('div'));
debugger_tabs.add( "Errors",  document.createElement('div'));

// const debug_tabs = output_area.addTabs();

bottom_tabs.add( "Output", output_area);
bottom_tabs.add( "Debugger", debugger_area);
bottom_tabs.add( "Search Results", document.createElement('div'));
bottom_tabs.add( "Audio", document.createElement('div'));
bottom_tabs.add( "Animation", document.createElement('div'));
bottom_tabs.add( "Shader Editor", document.createElement('div'));

// Get new content area to fill it
const top_tabs = up.addTabs();

// add canvas to left upper part
var canvas = document.createElement('canvas');
canvas.style.width = "100%";
canvas.style.height = "100%";

const resize_canvas = ( bounding ) => {
    canvas.width = bounding.width;
    canvas.height = bounding.height;
};

top_tabs.add( "Node_3D", canvas, true, resize_canvas );
top_tabs.add( "Scene_1", document.createElement('div'));

// add on resize event to control canvas size
top_tabs.area.onresize = resize_canvas;

top_tabs.area.addOverlayButtons( [ 
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
        },
        {
            name: "Unselect",
            icon: "X",
            callback: (value, event) => console.log(value),
            selectable: true
        }
    ]
], { float: "vtl" } );

// add widgets
fillRightSide( right );
fillLeftSide( left );

const img = new Image();
img.src = "data/godot_canvas.png";
img.onload = () => {
    requestAnimationFrame(loop);
}

function drawImageScaled(img, ctx) {
    var hRatio = canvas.width  / img.width    ;
    var vRatio =  canvas.height / img.height  ;
    var ratio  = Math.min ( hRatio, vRatio );
    var centerShift_x = ( canvas.width - img.width*ratio ) / 2;
    var centerShift_y = ( canvas.height - img.height*ratio ) / 2;  
    ctx.clearRect(0,0,canvas.width, canvas.height);
    ctx.drawImage(img, 0,0, img.width, img.height,
                       centerShift_x,centerShift_y,img.width*ratio, img.height*ratio);  
 }

function loop(dt) {
    
    var ctx = canvas.getContext("2d");
    drawImageScaled(img, ctx);
    // var aspect = img.width / img.height;
    // ctx.drawImage(img, 0, 0, canvas.width * aspect, canvas.height);
    requestAnimationFrame(loop);
}

// **** **** **** **** **** **** **** **** **** **** **** **** 

function fillRightSide( area ) {
    
    const tabs = area.addTabs({ fit: true });

    var inspPanel = new LX.Panel();
    var nodePanel = new LX.Panel();
    var historyPanel = new LX.Panel();
    
    LX.ADD_CUSTOM_WIDGET( 'Skeleton', {
        icon: "Bone",
        default: {
            'position': [0, 0],
            'velocity': [0, 0, 0],
            'color': [0, 0, 0, 0],
            'hex_color': '#000',
            'high_res': false
        }
    });

    const skeleton_instance = {
        'hex_color': '#f5f505',
        'high_res': true
    };

    inspPanel.addTitle("Mesh Instance 3D", {icon: "Torus"});

    inspPanel.addFile("Mesh");
    inspPanel.branch("Skeleton");
    inspPanel.addText("Skin", "...");
    inspPanel.addNumber("NUMBER", 12);
    inspPanel.addSkeleton("Skeleton", skeleton_instance);
    inspPanel.merge();

    inspPanel.addTitle("Geometry Instance 3D", {icon: "Square", icon_color: "#d63434"});
    inspPanel.branch("Geometry", {closed: true});
    inspPanel.branch("Global Illumination", {closed: true});
    inspPanel.branch("Visibility Range", {closed: true});
    inspPanel.merge();
    inspPanel.addTitle("Node 3D", {icon: "Circle", icon_color: "#fff"});
    inspPanel.branch("Transform", {closed: true});
    inspPanel.branch("Visibility", {closed: true});
    inspPanel.merge();
    
    tabs.add( "Inspector", inspPanel );
    tabs.add( "Node", nodePanel );
    tabs.add( "History", historyPanel );
}

function fillLeftSide( area ) {
    
    const tabs = area.addTabs({ fit: true });

    var scenePanel = new LX.Panel();
    var importPanel = new LX.Panel();
    var filesPanel = new LX.Panel();

    tabs.add( "Scene", scenePanel );
    tabs.add( "Import", importPanel );
    tabs.add( "Files", filesPanel );

    // add data tree

    let sceneData = {
        'id': 'Node 3D',
        'children': [
            {
                'id': 'WorldEnvironment',
                'icon': 'Globe',
                'closed': true,
                'children': [
                    {
                        'id': 'node_1_1',
                        'icon': 'Box',
                        'children': [],
                        'actions': [
                            {
                                'name': 'Open script',
                                'icon': 'Script',
                                'callback': function(node) {
                                    console.log(node.id + ": Script opened!")
                                }
                            }
                        ]
                    }
                ]
            },
            {
                'id': 'AnimatedSprite3D',
                'icon': 'Film',
                'closed': true,
                'children': [
                    {
                        'id': 'node_2_1',
                        'icon': 'Circle',
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

    scenePanel.addTree("Scene Tree", sceneData, { 
        icons: treeIcons, 
        // filter: false,
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
                    console.log(event.node.id + " deleted"); 
                    break;
                case LX.TreeEvent.NODE_DBLCLICKED: 
                    console.log(event.node.id + " dbl clicked"); 
                    break;
                case LX.TreeEvent.NODE_CONTEXTMENU: 
                    LX.addContextMenu( event.multiple ? "Selected Nodes" : event.node.id, event.value, m => {

                        // {options}: callback, color

                        m.add( "Select Children", () => console.log("select children") );
                        m.add( "Clone", { callback: () => console.log("Clone"), color: "#0d5" } );
                        m.add( "Components/Transform");
                        m.add( "Components/MeshRenderer");
                        m.add( "Move before sibling" );
                        m.add( "Move after sibling" );
                        m.add( "Move to parent" );
                        m.add( "Delete" );
                    });
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
}

