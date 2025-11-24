Architecture:
- Source in TypeScript, builds in TS and JS

Fixes:
- Area Tabs drag & drop
- "All components" example on mobile
- multiline indentation on empty lines

API:
- BaseComponent._TYPE_ to ComponentType._TYPE_
- LX.emit -> LX.emitSignal
- Element.insertChildAtIndex -> LX.insertChildAtIndex
- Element.getParentArea -> LX.getParentArea
- Element.listen/ignore -> LX.listen/ignore
- Element.hasClass/addClass  -> LX.hasClas/addClass
- ItemArray -> ArrayInput
- LX.ADD_CUSTOM_COMPONENT -> LX.REGISTER_COMPONENT
- Removed support for Blank panel component
- LX.main_area -> LX.mainArea
- Docmaker Extension API full changed
- NodeGraph extension renamed to GraphEditor

Additions:
- Table now sort Date strings by date
- AssetView ctrl+wheel to increase grid item size
- Support options.submit in Form entries

Styling:
- More TW classes
- Main theme colors updates
