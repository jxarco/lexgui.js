
// create main
LexGUI.init();

var area = new LexGUI.Area({id:"mainarea"});



// split main
area.split({sizes:["60%","40%"]});
var left = area.sections[0];
var right = area.sections[1];

// add panels
var panel = new LexGUI.Panel();
right.attach(panel);

// add widgets to panel branch
panel.branch("Information");
panel.addText("Camera", "Canon EOS 80D", {disabled: true});
panel.addText("Serial number", "194E283DD");

panel.merge();

// add widgets to panel directly
// add title?
panel.addText("null", "This do not have name");

// another branch
panel.branch("Market");
panel.addText("Camera", "Canon EOS 80D", {disabled: true});
panel.addText("Serial number", "194E283DD", {name_width: "50%"});
panel.merge();