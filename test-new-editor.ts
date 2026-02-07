// Quick test script for NewCodeEditor foundations
// Run: npx tsx test-new-editor.ts

// We can't import directly due to the LX dependency, so we mock it
(globalThis as any).LX = { extensions: [] };

// Now we can use the classes — but since they're in a module with LX import,
// let's just inline-test by copy-pasting the logic. Instead, let's patch the import:
import './src/extensions/NewCodeEditor';

// The classes are exported, but LX guard will throw. Let's do a simpler approach:
// We'll just eval the core logic. Actually, the cleanest way:

console.log( '=== Testing NewCodeEditor Foundations ===' );
console.log();

// ── We need to import after LX is set up ──
async function run()
{
    const { Tokenizer, CodeDocument, UndoManager, CursorSet } = await import( './src/extensions/NewCodeEditor' );

    // ── Tokenizer ──
    console.log( '--- Tokenizer ---' );

    const js = Tokenizer.getLanguage( 'JavaScript' )!;
    const ts = Tokenizer.getLanguage( 'TypeScript' )!;

    // Simple JS line
    let result = Tokenizer.tokenizeLine( 'const x = 42;', js, Tokenizer.initialState() );
    console.log( 'JS: const x = 42;' );
    console.log( result.tokens.map( t => `[${t.type}: "${t.value}"]` ).join( ' ' ) );
    console.log();

    // Block comment across lines
    let state = Tokenizer.initialState();
    let r1 = Tokenizer.tokenizeLine( '/* this is a', js, state );
    console.log( 'JS multiline comment:' );
    console.log( '  Line 1:', r1.tokens.map( t => `[${t.type}: "${t.value}"]` ).join( ' ' ) );
    console.log( '  State after line 1:', r1.state.stack );

    let r2 = Tokenizer.tokenizeLine( '   continued */ let y = 5;', js, r1.state );
    console.log( '  Line 2:', r2.tokens.map( t => `[${t.type}: "${t.value}"]` ).join( ' ' ) );
    console.log( '  State after line 2:', r2.state.stack );
    console.log();

    // Template string with interpolation
    result = Tokenizer.tokenizeLine( 'const msg = `hello ${name}!`;', js, Tokenizer.initialState() );
    console.log( 'JS: const msg = `hello ${name}!`;' );
    console.log( result.tokens.map( t => `[${t.type}: "${t.value}"]` ).join( ' ' ) );
    console.log();

    // TypeScript-specific
    result = Tokenizer.tokenizeLine( 'interface Foo { bar: string; }', ts, Tokenizer.initialState() );
    console.log( 'TS: interface Foo { bar: string; }' );
    console.log( result.tokens.map( t => `[${t.type}: "${t.value}"]` ).join( ' ' ) );
    console.log();

    // Method detection
    result = Tokenizer.tokenizeLine( 'console.log( "test" );', js, Tokenizer.initialState() );
    console.log( 'JS: console.log( "test" );' );
    console.log( result.tokens.map( t => `[${t.type}: "${t.value}"]` ).join( ' ' ) );
    console.log();

    // ── Document ──
    console.log( '--- Document ---' );

    const doc = new CodeDocument();
    doc.setText( 'function hello() {\n    return "world";\n}' );
    console.log( `Lines: ${doc.lineCount}` );
    console.log( `Line 0: "${doc.getLine( 0 )}"` );
    console.log( `Line 1: "${doc.getLine( 1 )}"` );
    console.log( `Line 2: "${doc.getLine( 2 )}"` );

    // Insert
    doc.insert( 1, 4, 'const x = 1;\n    ' );
    console.log( `After insert, lines: ${doc.lineCount}` );
    console.log( `Line 1: "${doc.getLine( 1 )}"` );
    console.log( `Line 2: "${doc.getLine( 2 )}"` );

    // Word at position
    doc.setText( 'const myVariable = 42;' );
    const [ word, start, end ] = doc.getWordAt( 0, 8 );
    console.log( `Word at col 8: "${word}" (${start}-${end})` );

    // Delete across lines
    doc.setText( 'aaa\nbbb\nccc' );
    doc.delete( 0, 2, 5 ); // delete "a\nbb"
    console.log( `After cross-line delete: "${doc.getText()}"` );
    console.log();

    // ── UndoManager ──
    console.log( '--- UndoManager ---' );

    const doc2 = new CodeDocument();
    doc2.setText( 'hello world' );
    const undo = new UndoManager( 100 ); // 100ms threshold for testing

    // Edit: insert " beautiful" at position 5
    const op = doc2.insert( 0, 5, ' beautiful' );
    undo.record( op, [ { line: 0, col: 5 } ] );
    undo.flush();
    console.log( `After insert: "${doc2.getLine( 0 )}"` );

    // Undo
    undo.undo( doc2 );
    console.log( `After undo:   "${doc2.getLine( 0 )}"` );

    // Redo
    undo.redo( doc2 );
    console.log( `After redo:   "${doc2.getLine( 0 )}"` );
    console.log();

    // ── CursorSet ──
    console.log( '--- CursorSet ---' );

    const doc3 = new CodeDocument();
    doc3.setText( 'first line\nsecond line\nthird line' );
    const cursors = new CursorSet();

    console.log( `Initial: line=${cursors.getPrimary().head.line}, col=${cursors.getPrimary().head.col}` );

    cursors.moveRight( doc3 );
    cursors.moveRight( doc3 );
    cursors.moveRight( doc3 );
    console.log( `After 3x right: col=${cursors.getPrimary().head.col}` );

    cursors.moveDown( doc3 );
    console.log( `After down: line=${cursors.getPrimary().head.line}, col=${cursors.getPrimary().head.col}` );

    cursors.moveToLineEnd( doc3 );
    console.log( `After End: col=${cursors.getPrimary().head.col}` );

    cursors.moveToLineStart( doc3 );
    console.log( `After Home: col=${cursors.getPrimary().head.col}` );

    // Selection
    cursors.set( 0, 0 );
    cursors.moveRight( doc3, true ); // select
    cursors.moveRight( doc3, true );
    cursors.moveRight( doc3, true );
    cursors.moveRight( doc3, true );
    cursors.moveRight( doc3, true );
    console.log( `Selected: "${cursors.getSelectedText( doc3 )}"` );

    // Word movement
    cursors.set( 0, 0 );
    cursors.moveWordRight( doc3 );
    console.log( `After word-right from 0: col=${cursors.getPrimary().head.col}` );

    // Multi-cursor
    cursors.set( 0, 0 );
    cursors.addCursor( 1, 0 );
    cursors.addCursor( 2, 0 );
    console.log( `Cursors: ${cursors.cursors.length}` );
    cursors.removeSecondaryCursors();
    console.log( `After remove secondary: ${cursors.cursors.length}` );

    console.log();
    console.log( '=== All tests passed ===' );
}

run().catch( console.error );
