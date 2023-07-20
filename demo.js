// init library and get main area
let area = LX.init();

// change global properties after init
// LX.DEFAULT_NAME_WIDTH = "10%";
// LX.DEFAULT_SPLITBAR_SIZE = 16;
// LX.OPEN_CONTEXTMENU_ENTRY = 'mouseover';

// LX.message("Im in another position", null, { position: [10, 10] });
// LX.message("Welcome to Lexgui", "Welcome!");

// menu bar
area.addMenubar( m => {

    // {options}: callback, icon, short

    m.add( "Scene/New Scene", () => { console.log("New scene created!") });
    m.add( "Scene/");
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
    m.add( "Help/Search Help", { icon: "fa-solid fa-magnifying-glass", short:  "F1", callback: () => { console.log("Opening HELP") }});
    m.add( "Help/Support LexGUI/Please", { icon: "fa-solid fa-heart" } );
    m.add( "Help/Support LexGUI/Do it" );

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
    m.setButtonImage("lexgui.js", "images/lexgui-min.png", () => {window.open("https://github.com/jxarco/lexgui.js/")}, {position: "left"})
});

// split main area
var [left,right] = area.split({sizes:["75%","25%"]});

// split left area
var [up, bottom] = left.split({type: 'vertical', sizes:["45vh","55vh"]});

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
        var bottom_panel = document.getElementById('bottom-panel');
        bottom_panel.style.display = 'block';
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
            kfTimeline.setSelectedItems(["Item 1", "Item 2", "Item 3"]);
            kfTimeline.setAnimationClip({tracks: [{name: "Item 1.position", values: [0,1,0, 1], times: [0, 0.1, 0.2, 0.3]}, {name: "Item 1.scale", values: [0,1,0, 0.5], times: [0, 0.1, 0.2, 0.3]}, {name: "Item 2", values: [0,1,0,1], times: [0.1, 0.2, 0.3, 0.8]}, {name: "Item 3.position", values: [0,1,0], times: [0, 0.1, 0.2, 0.3]}, {name: "Item 3.scale", values: [0,1,0], times: [0, 0.1, 0.2, 0.3]}], duration: 1});
            bottom.attach(kfTimeline.root);
            
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
            var clip = {name:"Clip1", start:0, duration:1, type:""};
            clipsTimeline.addClip(clip);
            var clip = {name:"Clip2", start:0, fadein: 0.5, fadeout: 0.8, duration:1, type:""};
            clipsTimeline.addClip(clip);
            // clipsTimeline.setAnimationClip({tracks: [{clips: [clip]}], duration: 2});
            clipsTimeline.selectedItems = ["Clip1"];
            bottom.attach(clipsTimeline.root);
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
            
            // kfTimeline.addButtons([
            //     { icon: 'fa fa-wand-magic-sparkles', name: 'autoKeyEnabled' },
            //     { icon: 'fa fa-filter', name: "optimize", callback: (value, event) => {   kfTimeline.onShowOptimizeMenu(event);}},
            //     { icon: 'fa-regular fa-rectangle-xmark', name: 'unselectAll', callback: (value, event) => { kfTimeline.unSelectAllKeyFrames();}}
            // ]);
            
            curvesTimeline.draw(0);
        }
    });

    bottom.onresize = bounding => {
        if(clipsTimeline)
            clipsTimeline.resize( [ bounding.width, bounding.height ] );
        
        if(kfTimeline)
            kfTimeline.resize( [ bounding.width, bounding.height ] );
        
        if(curvesTimeline)
            curvesTimeline.resize( [ bounding.width, bounding.height ] );
    }
} );

var bottom_panel = bottom.addPanel({id: "bottom-panel"});
fillBottomPanel( bottom_panel ); 

// split right area
var [rup, rbottom] = right.split({type: 'vertical', sizes:["70vh","30vh"]});

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

top_tabs.add( "Canvas", canvas, true, resize_canvas );

// add on resize event to control canvas size
top_tabs.area.onresize = resize_canvas;

top_tabs.area.addOverlayButtons( [ 
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
var side_panel = rup.addPanel();
fillPanel( side_panel );

const bottom_tabs = rbottom.addTabs();
var side_bottom_panel = new LX.Panel();
var side_bottom_panel_h = new LX.Panel();
fillRightBottomPanel( side_bottom_panel, 'Vertical' );
fillRightBottomPanel( side_bottom_panel_h, 'Horizontal' );

bottom_tabs.add( "Panel V", side_bottom_panel );
bottom_tabs.add( "Panel H", side_bottom_panel_h );

function loop(dt) {
    
    var ctx = canvas.getContext("2d");

    // Get values from panel widgets (e.g. color value)
    ctx.fillStyle = side_panel.getValue('Background');

    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = side_panel.getValue('Font Size') + "px Monospace";

    ctx.fillStyle = side_panel.getValue('Font Color');

    const text = side_panel.getValue('Text');
    const pos_2d = side_panel.getValue('2D Position');
    ctx.fillText(text, pos_2d[0], pos_2d[1]);

    if(kfTimeline)
        kfTimeline.draw();

    if(clipsTimeline)
        clipsTimeline.draw();

    if(curvesTimeline)
        curvesTimeline.draw();

    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

// **** **** **** **** **** **** **** **** **** **** **** **** 

function fillPanel( panel ) {
    
    // add data tree

    let scene_data = {
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

    // this is optional!
    const tree_icons = [
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

    window.tree = panel.addTree("Scene Tree", scene_data, { 
        icons: tree_icons, 
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
        },
    });    

    // add widgets to panel branch
    panel.branch("Preferences", {icon: "fa-solid fa-gear"});
    panel.addButton(null, "Click me, Im Full Width...");
    panel.addDropdown("Best Engine", ["Godot", "Unity", "Unreal Engine"], "Godot", (value, event) => {
        console.log(value);
    });

    panel.addDropdown("Best Logo", [{value:"Godot", src: "https://pbs.twimg.com/profile_images/1631591220630757377/nKSCjeS3_400x400.png"}, {value: "Unity", src: "https://logos-world.net/wp-content/uploads/2023/01/Unity-Logo.png"}, {value:"Unreal Engine", src: "https://cdn2.unrealengine.com/ue-logo-stacked-unreal-engine-w-677x545-fac11de0943f.png"}], "Godot", (value, event) => {
        console.log(value);
    }, {filter:true});

    panel.addDropdown("Best Gif", [{value:"Godot", src: "https://thumbs.gfycat.com/CaringDefensiveAndeancondor-size_restricted.gif"}, {value: "Unity", src: "https://i.gifer.com/origin/db/db3cb258e9bbb78c5851a000742e5468_w200.gif"}, {value:"Unreal Engine", src: "https://d3kjluh73b9h9o.cloudfront.net/original/4X/e/0/d/e0deb23c10cc7852c6ab91c28083e27f9c8228f8.gif"}], "Godot", (value, event) => {
        console.log(value);
    }, {filter:true});

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
    ]);
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

        const shader_instance = {
            'hex_color': '#f5f505',
            'high_res': true
        };

        panel.addShader( "PBR Shader", shader_instance, (instance) => { console.log(instance) } );
        panel.addShader( "Empty", null );

        /************** */
    }

    // panel.tab("Another tab");

    // // update panel values uising widget name
    // panel.addNumber("Roll", 0, (value, event) => {
    //     panel.setValue('PRoll', value);
    // }, { min: -1, max: 1, step: 0.1 });
    // panel.addProgress("PRoll", 0, { min: -1, max: 1 });

    // panel.tab("Another One");

    // panel.addText("Im out :(", "", null, { placeholder: "Alone..." });
    // panel.addVector4("Im a Vec4", [0.3, 0.3, 0.5, 1], (value, event) => {
    //     console.log(value);
    // });
    // panel.addButton(null, "Click me, Im Full Width...");
    // panel.addButton("Test Button", "Reduced width...");

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