
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
panel.addText(null, "This do not have name");

// another branch
panel.branch("Preferences");
panel.addText("Browser", "Chrome");
panel.addText("Extensions", "", {placeholder: "e.g. ColorPicker"});
panel.addText(null, "Shitty");
panel.addButton(null, "Apply changes");
panel.addButton("Apply", "Some changes");
panel.merge();

panel.addButton(null, "Restart");

// another branch
panel.branch("Other things");
panel.addCombo("Pages", ["Federico", "Garcia", "Lorca"]);
panel.merge();