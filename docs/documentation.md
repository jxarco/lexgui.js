# Docs

- [Docs](#docs)
  - [Getting Started](#getting-started)
    - [Download](#download)
    - [Usage](#usage)
    - [Namespace Globals](#namespace-globals)
  - [Area](#area)
    - [Menubar](#menubar)
      - [Searchbar for Menu Entries](#searchbar-for-menu-entries)
    - [Panel](#panel)
    - [Branch](#branch)
  - [Widgets](#widgets)
    - [Getter and Setters](#getter-and-setters)
    - [Reset Value](#reset-value)
    - [Same line](#same-line)
  
  - <details><summary><a href=#widget-list>Widget List</a></summary>

    - [Title](#title)
    - [Text](#text)
    - [Button](#button)
    - [Combo Buttons](#combo-buttons)
    - [Number](#number)
    - [Vector](#vector)
    - [Checkbox](#checkbox)
    - [Color](#color)
    - [Dropdown](#dropdown)
    - [Tags](#tags)
    - [Tree](#tree)
    - [Array](#array)
    - [List](#list)
    - [Layers](#layers)
    - [File](#file)
    - [Progress](#progress)
    - [Curve](#curve)
    - [Other Widgets](#other-widgets)

    </details>

  - [Dialogs](#dialogs)
  - [Event Handling](#event-handling)
  - [Components](#components)
    - [Timeline](#timeline)
      - [Keyframes timeline](#keyframe-timeline)
      - [Clips timeline](#clips-timeline)
      - [Curves timeline](#curves-timeline)


## Getting Started

### Download

To use LexGUI.js, download it at the `build` folder (the best option is to *clone this repository in your project folder* to facilitate next updates) and include it directly in your HTML file using a script tag:

```html
<script src="build/lexgui.js"></script>
```

### Usage

Once you have included **lexgui.js** in your project, you can start using its API to create web interfaces. The library exposes several functions and components that you can utilize to build your UI.

The first thing to do is initializing the library. Calling `LX.init` will initialize the necessary stuff and build the main [Area](#area), which by default will fit the root container:

```js
let area = LX.init();
```

Optionally, you can pass an `Object` parameter to define a few properties: 
* `container (String)`: Root container for the entire UI (default is `document.body`)
* `id (String)`: id of the generated Main Area (default is *mainarea*)

### Namespace Globals

You can modify global namespace (`LX`) variables before you start creating UI elements. For now, the customizable vars are the following:
* `LX.DEFAULT_NAME_WIDTH`: Width of the name container inside a widget (Default `"30%"`)
* `LX.DEFAULT_SPLITBAR_SIZE`: Width (in pixels) of the area resize bar created on split (Default `4`)
* `LX.OPEN_CONTEXTMENU_ENTRY`: Specify how the subentries of a Context Menu will be opened, '*mouseover*' or '*click*' (Default `click`)

## Area

An **Area** is the main container used in lexgui.js. You can have as many Areas you need using `Area.split(options)`, which allows you to split horizontally or vertically a given Area:

* `type (String)`: Split mode, either horizontal (default) or vertical
* `sizes (Array)`: Size of each new area. Default is ["50%", "50%"]

From here, you can already build your UI adding [Panels](#panel), but in most cases you will want to split the main Area first:

```js
// Split main area in 2 sections (2 Areas)
area.split({ sizes: ["70%", "30%"] });
let [leftArea, rightArea] = area.sections;

// Split again left area this time vertically
leftArea.split({ type: 'vertical', sizes: ["80vh", "20vh"] });
let [leftUpArea, leftBottomArea] = leftArea.sections;
```

### Menubar

You can build a **Menubar** directly into any Area using `Area.addMenubar(callback, options)`. To specify each of the menu entries, you should pass a *callback function* to be called when the Menubar is constructed. **Callbacks will have a Menubar instance as parameter**, so use `Menubar.add(entryPath, options)` on that instance inside your callback to build each of the menu entries:

* `entryPath (String)`: The path menu/submenu/etc of each entry
* `options (Object/Function)`: 
  * `callback (Function)`: To be called when interacting with the entry
  * `icon (String)` at ([Fontawesome](https://fontawesome.com/search))
  * `short (String)` for shortcuts
  * `type (String)` options: *checkbox*

<sup>Note: In case of no options rather than the callback, you can use `options` as the `Function` callback.<sup>

```js
area.addMenubar( m => {
    m.add( "Scene/New Scene", () => { console.log("New scene created!") } );
    m.add( "Scene/Open Scene" );
    m.add( "Scene/" ); // This is a separator!
    m.add( "Scene/Open Recent/hello.scene");
    m.add( "Scene/Open Recent/goodbye.scene" );
    m.add( "Project/Export/DAE", { short: "E" } );
    m.add( "Project/Export/GLTF" );
    m.add( "Help/About" );
    m.add( "Help/Support", { callback: () => { console.log("Support!") }, icon: "fa-solid fa-heart" } );
});
```

The `options` in `Area.addMenubar(callback, options)` are by now the following: 
* `float (String)`: Justify main entries to left (default), center, right

```js
area.addMenubar( m => {
    // Fill entries...
}, { float: 'center' });
```

#### Searchbar for Menu Entries

Pressing `Ctrl+Space` you can open a search bar as a shortcut for any Menubar entry created in the whole UI.

### Panel

Panels are the DOM elements that will enclose your UI [widgets](#widgets). The pipeline is simple, create a Panel, attach it to an Area and fill it!

You could do it manually instancing a `LX.Panel` and attaching it using `Area.attach(content)` but you might want to call `Area.addPanel(options)` to get an instanced panel already attached to that area:

```js
var panel = area.addPanel();
fillPanel( side_panel );
```

As `options` you can pass `id` and `className` to be added to your new panel.

### Branch

A Branch essentially serves as a Panel Section, allowing you to effectively organize widgets within your panels. By opening and merging branches at any time, you can seamlessly incorporate widgets into your panels using `Panel.branch(name, options)`:

```js
panel.branch("Section Title");

// Add widgets here...

panel.merge();
```

When branching, you can use some options:

 * `className`: Add class to the branch
 * `closed`: Set branch collapsed/opened [false]
 * `icon`: Set branch icon (Fontawesome class e.g. "fa-solid fa-skull")
 * `filter`: Allow filter widgets in branch by name [false]

## Widgets

A widget is a *fundamental building block that represents a graphical user interface (GUI) element*. Widgets are the visual components with which users interact and provide input within an application, from basic elements like buttons and text fields to more complex elements such as dropdown menus, sliders, and checkboxes. 

LexGUI.js provides a wide range of pre-built widgets that developers can utilize to construct intuitive and visually appealing interfaces. These widgets are designed to be customizable, allowing developers to adjust their appearance and behavior to suit the specific requirements of their application.

### Getter and Setters

One of the features of LexGUI is the ability to effortlessly retrieve and modify values for any widget that has been added. This functionality provides developers with a convenient way to interact with and manipulate the UI elements within their applications:

```js
// Getting Values by Widget Name
const color = panel.getValue('Background');

// Settings Values
panel.setValue('Font Color', color);
```

<sup>Note: It's important to ensure that the new value provided is compatible with the widget's data type and constraints. Incorrect data types or out-of-range values may result in unexpected behavior or errors.<sup>

### Reset Value

In most cases where you set a Widget Name, you will have the option to reset the Widget Value to its default value by pressing a *reset button* what will appear on changing the initial state of the widget.

### Same line

You can also add multiple widgets in the same panel row to create well-organized and visually optimized user interface layouts and by calling `panel.sameLine(number)`, where `number` is the number of widgets to be inlined.

## Widget List

### Title

Represents a text title section inside a [Branch](#branch). Call `Panel.addTitle(name, value, callback, options)` to add a Title Widget to your panel:

* `name (String)`: Widget name
* `options (Object)`: Basic options for a Widget

```js
panel.addTitle("A title!");
```

### Text

Represents a text input. Call `Panel.addText(name, value, callback, options)` to add a Text Widget to your panel:

* `name (String)`: Widget name
* `value (String)`: Text
* `callback (Function)`: Function called when the input changes
* `options (Object)`:
  * `disabled`: Make the widget disabled
  * `placeholder`: Add input placeholder
  * `icon`: Icon to be added before the input
  * `trigger`: Choose onchange trigger (default, input)
  * `inputWidth`: Width of the text input

```js
panel.addText("Text Name", "Text value", (value, event) => {
    console.log(value);
}, { placeholder: "Something" });
```

### Button

Represents a clickable element typically used to trigger an action. Call `Panel.addButton(name, value, callback, options)` to add a Button Widget to your panel:

* `name (String)`: Widget name
* `value (String)`: Button text
* `callback (Function)`: Function called when the button is clicked
* `options (Object)`:
  * `disabled`: Make the widget disabled

```js
panel.addButton("A Name", "Print event", (value, event) => {
    console.log(event);
});
```

### Combo Buttons

Multiple inlined (buttons)[#button] as selectable options. Call `Panel.addComboButtons(name, values, options)` to add a ComboButtons Widget to your panel:

* `name (String)`: Widget name
* `values (Array)`: Each of the {value, callback} items (you can add an `icon`)
* `options (Object)`:
  * `float`: Justify content (left, center, right) [center]

```js
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
```

### Number

Represents a number input. Call `Panel.addNumber(name, value, callback, options)` to add a Number Widget to your panel:

* `name (String)`: Widget name
* `value (Number)`: Number value
* `callback (Function)`: Function called when the input changes
* `options (Object)`:
  * `disabled`: Make the widget disabled
  * `step`: Change value step
  * `min`, `max`: Min and Max input values

<sup>Note: Setting `min`, `max` values will automatically add a slider below the number input.<sup>

```js
panel.addNumber("Font Size", 36, (value, event) => {
    console.log(value);
}, { min: 1, max: 48 });
```

You can change the value of this widget manually, using the mouse wheel, and dragging (up/down). In the last two cases, pressing *Alt* and *Left Shift* will apply a factor of ``0.1`` and ``10`` in that order.

### Vector

Similar to the Number widget, it represents a numeric vector input. It's composed by multiple Number Widgets. Call `Panel.addVectorN(name, value, callback, options)`, where N is a number in the range [2, 4], to add a Vector Widget to your panel:

* `name (String)`: Widget name
* `values (Number Array)`: Array containing the values for the vector
* `callback (Function)`: Function called when any of the N number inputs change
* `options (Object)`:
  * `disabled`: Make the widget disabled
  * `step`: Change values step
  * `min`, `max`: Min and Max inputs value

<sup>Note: Since a Vector Widget is a composition of multiple Number Widgets, you can change its value the same way as the Number inputs.<sup>

```js
panel.addVector2("2D Position", [250, 350], (value, event) => {
    console.log(value);
}, { min: 0, max: 1024 });

panel.addVector3("Velocity", [0.1, 1, 0.5], (value, event) => {
    console.log(value);
});

panel.addVector4("Shader Color", [1, 1, 1, 1], (value, event) => {
    console.log(value);
});
```

### Checkbox

Represents a classic checkbox that allows users to select or deselect an option as a binary choice (either checked or unchecked). Call `Panel.addCheckbox(name, value, callback, options)` to add a Checkbox Widget to your panel:

* `name (String)`: Widget name
* `value (Boolean)`: Boolean value (true/false)
* `callback (Function)`: Function called when the checkbox value changes
* `options (Object)`:
  * `disabled`: Make the widget disabled
  * `suboptions`: Callback to add widgets shown if value = `TRUE`

```js
panel.addCheckbox("Toggle me", true, (value, event) => {
    console.log(value);
});

// Suboptions in case checkbox is enabled
panel.addCheckbox("Toggle me too", true, (value, event) => {
        console.log(value);
    }, { suboptions: (p) => {
        p.addText(null, "Suboption 1");
        p.addNumber("Suboption 2", 12);
    } });
```

### Color

Represents a color input. Allows users to select a color using a color picker, providing an interactive way to choose colors for various elements in your web interface. Call `Panel.addColor(name, value, callback, options)` to add a Color Widget to your panel:

* `name (String)`: Widget name
* `value (String or Array)`: Color value in hex ("#fff") or Array[r, g, b]
* `callback (Function)`: Function called when the input changes
* `options (Object)`:
  * `disabled`: Make the widget disabled
  * `useRGB`: The callback returns color as Array[r, g, b] and not hex [`false`]

```js
panel.addColor("Font Color", [1, 0.1, 0.6], (value, event) => {
    console.log("Font Color: ", value);
});

panel.addColor("Background", "#b7a9b1");
```

### Dropdown

Represents a classic Drop-down list. It works as a HTML Select element, but it can handle media options. Call `Panel.addDropdown(name, values, value, callback, options)` function to add a Dropdown Widget to your Panel:

* `name (String)`: Widget name
* `values (Array)`: Array of the values of the list. The values can be [strings](#string-values) or [media](#media-values) (images or GIFs). For the media, the entries of the array must be an object containing a `value` and `src` fields.
* `values (String)`: Current selected value from the drop-down list.
* `callback (Function)`: Function called when an list value is selected.
* `options (Object)`:
  * `filter`: Boolean field to specify if the drop-down needs a search bar

```js
// String values

panel.addDropdown("String Dropdown", ["Option 1", "Option 2"], "Option 1", (value, event) => {
      console.log(value);
}, options);

// Media values

const options = [
  { value: "Option 1", src: "/option1.png" }, 
  { value: "Option 2", src: "/option2.gif" },
  { value: "Option 3", src: "/option3.jpg" }
];
panel.addDropdown("Media Dropdown", options, "Option 1", (value, event) => {
      console.log(value);
}, options);
```

### Tags

Represents a collection of tags that can be added, removed, and modified dynamically. It provides a user-friendly way to manage and display multiple tags. Call `Panel.addTags(name, value, callback, options)` to add a Tags Widget to your panel:

* `name (String)`: Widget name
* `value (Boolean)`: Comma separated tags
* `callback (Function)`: Function called when a tag is either removed or added
* `options (Object)`: Basic options for a Widget

```js
panel.addTags("Game Tags", "2d, ai, engine, ps5, console", (value, event) => {
    console.log(value);
});
```

### Tree

...TODO

### Array

...TODO

### List

...TODO

### Layers

...TODO

### File

...TODO

### Progress

Represents a horizontal bar that fills up gradually to indicate the completion progress of a task or operation or just show a numeric value. Call `Panel.addProgress(name, value, options)` to add a Progress Widget to your panel:

* `name (String)`: Widget name
* `value (Number)`: Progress value
* `options (Object)`:
  * `editable`: Allow to edit value manually
  * `callback (Function)`: If editable, function called when progress changes
  * `showValue`: Show current value
  * `min`, `max`: Min and Max values

```js
panel.addProgress("HeadRoll", 0, { 
  min: -1, 
  max: 1, 
  showValue: true, 
  editable: true, 
  callback: (value, event) => {
    console.log(value);
  }
});
```

### Curve

...TODO

### Other Widgets

* `Panel.addBlank(height)`: Add vertical space (in pixels) inside a branch.

## Dialogs

...TODO

## Event Handling

...TODO

## Timeline

### Keyframes timeline
...TODO

### Clips timeline
...TODO

### Curves timeline
...TODO