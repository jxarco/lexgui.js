# Docs

- [lexgui.js](#lexguijs)
  - [Getting Started](#getting-started)
    - [Download](#download)
    - [Usage](#usage)
  - [Area](#area)
    - [Menubar](#menubar)
    - [Panel](#panel)
  - [Widgets](#widgets)
    - [Title](#title)
    - [Text](#text)
    - [Button](#button)
    - [Number](#number)
    - [Vector](#vector)
    - [Checkbox](#checkbox)
    - [Dropdown](#dropdown)
    - [Tree](#tree)
    - [Progress](#progress)
  - [Event Handling](#event-handling)
  - [Styling](#styling)
  - [Examples](#examples)
  - [Contributing](#contributing)
  - [License](#license)

## Getting Started

### Download

To use LexGUI.js, download the library at the `build` folder and include it directly in your HTML file using a script tag. However, the best option is to *clone this repository in your project folder* to facilitate next updates:

```html
<script src="build/lexgui.js"></script>
```

### Usage

Once you have included **lexgui.js** in your project, you can start using its API to create web interfaces. The library exposes several functions and components that you can utilize to build your UI.

The first thing to do is initializing the library. Calling `LX.init` will initialize the necessary stuff and build the main [Area](#area), which will fit the root container:

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

An **Area** is the main container used in lexgui.js. You can have as many Areas you need using `Area.split(options)`, which allows you to split horizontally or vertically a given Area. It has a single `Object` parameter to specify different split options:

* `type (String)`: Split mode, either horizontal (default) or vertical
* `sizes (Array)`: Size of each new area. Default is ["50%", "50%"]

From here, you can already build your UI adding [Panels](#panel), but in most cases you will want to split the main Area first:

```js
// Split main area in 2 sections (2 Areas)
area.split({ sizes: ["70%", "30%"] });
var [leftArea, rightArea] = area.sections;

// Split again left area this time vertically
leftArea.split({ type: 'vertical', sizes: ["80vh", "20vh"] });
var [leftUpArea, leftBottomArea] = leftArea.sections;
```

### Menubar

You can build a **Menubar** directly into any Area using `Area.addMenubar(callback, options)`. To specify each of the menu entries, you should pass a *callback function* to be called when the Menubar is constructed. **Callbacks will have a Menubar instance as parameter**, so use `Menubar.add(entryPath, options)` on that instance inside your callback to build each of the menu entries:

* `entryPath (String)`: The path menu/submenu/etc of each entry
* `options (Object/Function)`: Specify `icon` for icons ([Fontawesome](https://fontawesome.com/search)) and `short` shortcut

<sup>Note: In case of no-icon and no-shortcut, you can use `options` as the `Function` callback.<sup>

```js
area.addMenubar( m => {
    m.add( "Scene/New Scene", () => { console.log("New scene created!") } );
    m.add( "Scene/Open Scene" );
    m.add( "Scene/" ); // This is a separator!
    m.add( "Scene/Open Recent/hello.scene");
    m.add( "Scene/Open Recent/goodbye.scene" );
    m.add( "Project/Export/DAE" );
    m.add( "Project/Export/GLTF" );
    m.add( "Help/About" );
    m.add( "Help/Support", { callback: () => { console.log("Support!") }, icon: "fa-solid fa-heart" } );
});
```

Again, the `options` parameter in `Area.addMenubar(callback, options)` allows you to specify a few Menubar options: 
* `float (String)`: Justify main entries to left (default), center, right

```js
area.addMenubar( m => {
    // Fill entries...
}, { float: 'center' });
```

### Panel

Panels are the DOM elements that will contain your UI [widgets](#widgets). The pipeline is simple, create a Panel, attach it to an Area and fill it!

You could do it manually instancing a `LX.Panel` and attaching it using `Area.attach(content)` or you can call `Area.addPanel(options)` to get an instanced panel attached to that area:

```js
var panel = area.addPanel();
fillPanel( side_panel );
```

As `options` you can pass `id` and `className` to be added to your new panel.

## Widgets

...

### Title

...

### Text

...

### Button

...

### Number

...

### Vector

...

### Checkbox

...

### Dropdown

...

### Tree

...

### Progress

...

## Event Handling

...

### Progress

...

## Styling

...