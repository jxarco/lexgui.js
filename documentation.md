# Docs

- [Docs](#docs)
  - [Getting Started](#getting-started)
    - [Download](#download)
    - [Usage](#usage)
    - [Namespace Globals](#namespace-globals)
  - [Area](#area)
    - [Menubar](#menubar)
    - [Panel](#panel)
    - [Branch](#branch)
  - [Widgets](#widgets)
    - [Title](#title)
    - [Text](#text)
    - [Button](#button)
    - [Number](#number)
    - [Vector](#vector)
    - [Checkbox](#checkbox)
    - [Dropdown](#dropdown)
      - [String values](#string-values)
      - [Media values](#media-values)
    - [Tree](#tree)
    - [Progress](#progress)
    - [Other Widgets](#other-widgets)
  - [Event Handling](#event-handling)

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
* `options (Object/Function)`: `callback`, `icon` at ([Fontawesome](https://fontawesome.com/search)) and `short` for shortcuts

<sup>Note: In case of no-icon and no-shortcut, you can use `options` as the `Function` callback.<sup>

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

### Panel

Panels are the DOM elements that will enclose your UI [widgets](#widgets). The pipeline is simple, create a Panel, attach it to an Area and fill it!

You could do it manually instancing a `LX.Panel` and attaching it using `Area.attach(content)` but you might want to call `Area.addPanel(options)` to get an instanced panel already attached to that area:

```js
var panel = area.addPanel();
fillPanel( side_panel );
```

As `options` you can pass `id` and `className` to be added to your new panel.

### Branch

...

## Widgets

LexGUI.js provides a set of commonly used UI widgets that you can use to show or modify your application state. 

<sup>Note: In most cases where you set a Widget Name, you will have the option to reset the Widget Value to its default value by pressing a *reset button* what will appear on changing the initial state of the widget.<sup>

### Title

Represents a text title section inside a [Branch](#branch). Call `Panel.addTitle(name, value, callback, options)` to add a Text Widget to your panel:

* `name (String)`: Widget name
* `value (String)`: Text
* `callback (Function)`: Function called when the input 

### Text

Represents a text input. Call `Panel.addText(name, value, callback, options)` to add a Text Widget to your panel:

* `name (String)`: Widget name
* `value (String)`: Text
* `callback (Function)`: Function called when the input changes
* `options (Object)`:
  * `disabled`: Make the widget disabled
  * `placeholder`: Add input placeholder
  * `trigger`: Choose onchange trigger (default, input)
  * `inputWidth`: Width of the text input

### Button

Represents a clickable element typically used to trigger an action. Call `Panel.addButton(name, value, callback, options)` to add a Button Widget to your panel:

* `name (String)`: Widget name
* `value (String)`: Button text
* `callback (Function)`: Function called when the button is clicked
* `options (Object)`:
  * `disabled`: Make the widget disabled

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

### Checkbox

Represent a classic checkbox that allows users to select or deselect an option as a binary choice (either checked or unchecked). Call `Panel.addCheckbox(name, value, callback, options)` to add a Number Widget to your panel:

* `name (String)`: Widget name
* `value (Boolean)`: Boolean value (true/false)
* `callback (Function)`: Function called when the checkbox value changes
* `options (Object)`:
  * `disabled`: Make the widget disabled

### Dropdown

Represents a classic Drop-down list. It works as a HTML Select element, but it can handle media options. Call `Panel.addDropdown(name, values, value, callback, options)` function to add a Dropdown Widget to your Panel:

* `name (String)`: Widget name
* `values (Array)`: Array of the values of the list. The values can be [strings](#string-values) or [media](#media-values) (images or GIFs). For the media, the entries of the array must be an object containing a `value` and `src` fields.
* `values (String)`: Current selected value from the drop-down list.
* `callback (Function)`: Function called when an list value is selected.
* `options (Object)`:
  * `filter`: Boolean field to specify if the drop-down needs a search bar

#### String values

```js
panel.addDropdown("Dropdown", ["Option 1", "Option 2"], "Option 1", (value, event) => {
      console.log(value);
  }, options);
```
#### Media values

```js
const options = [
  { value: "Option 1", src: "/option1.png" }, 
  { value: "Option 2", src: "/option2.gif" },
  { value: "Option 3", src: "/option3.jpg" }
];
panel.addDropdown("Dropdown", options, "Option 1", (value, event) => {
      console.log(value);
  }, options);
```

### Tree

...

### Progress

...

### Other Widgets

* `Panel.addBlank(height)`: Add vertical space (in pixels) inside a branch.

## Event Handling

...