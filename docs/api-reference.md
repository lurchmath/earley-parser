
# API Reference

## Getting started

### In the browser

Import the minified JavaScript, which you can [download from our repository
directly](https://raw.githubusercontent.com/lurchmath/earley-parser/master/earley-parser.js)
or import from a CDN with the following one-liner.

```html
<script src='https://cdn.jsdelivr.net/npm/earley-parser@1/earley-parser.js'></script>
```

### From the command line

Or install this package into your project the usual way:

```bash
npm install earley-parser
```

Then within any of your modules, import it as follows.

```js
Tokenizer = require( "earley-parser" ).Tokenizer;
Grammar = require( "earley-parser" ).Grammar;
```

After that, any of the example code snippets in this documentation should
function as-is.

## Tokenizing

Traditionally, parsing text is split first into a "tokenization" phase, in
which chunks of text are recognized as atomic units, and thus the string
becomes an array of its substrings, each of size 1 or greater, followed by
the parsing phase, which operates on that flat array, arranging it into a
tree structure.

For example, in standard arithmetic, the text "1+23*5" might first be
tokenized into the array `[ "1", "+", "23", "*", "5" ]`, and then parsed
into the (prefix-notation) tree structure
`[ "+", "1", [ "*", "23", "5" ] ]`.

A tokenizer is therefore an ordered list of regular expressions for
detecting tokens, popping them off of an input string, and then possibly
manipulating them before adding them to a growing array of tokens found in
the string.  This module provides a class for creating tokenizers.

### Constructor

The constructor takes no parameters, so it is very simple to use.

```js
T = new Tokenizer();
```

### Adding types to a tokenizer

There is precisely one function for adding types to the tokenizer.  Note,
however, that types are checked in the order in which they were added to the
tokenizer, so when you call this function repeatedly to add various types of
tokens, you should take care to order the calls correctly.

For instance, perhaps you are writing a tokenizer for simple algebraic
expressions, in which a sequence of letters will be seen as the
multiplication of variables (i.e., "abc" means "a times b times c") except
for a few special sequences of letters such as "sin" and "cos" and "pi" and
perhaps a few others.

It is important to add the tokens for "sin" and "cos" and so on first, and
then the generic single-letter token thereafter, so that the special cases
have a chance to be applied before the general case.  Otherwise the general
case would catch all sequences of letters, and the special cases would
never have a chance to be applied.

The function signature looks like so:

```js
T.addType( regexp, formatter );
```

The two parameters are documented thoroughly in
[the source code documentation](https://github.com/lurchmath/earley-parser/blob/master/earley-parser.litcoffee#tokenizing), so I do not repeat the information here.

### Tokenizing

To tokenize text, simply call `T.tokenize( input )` on the text.

Example:

<div class="runnable-example">
T = new Tokenizer();
T.addType( /sin/ );
T.addType( /cos/ );
T.addType( /pi/ );
T.addType( /[a-z]/, function ( name ) { return "Variable:" + name; } );
T.addType( /\s/, function () { return null; } );
console.log( T.tokenize( 'sin x' ) );
console.log( T.tokenize( 'cospiy' ) );
</div>

## Parsing

A grammar is a set of rules defining the language to parse.  For more
information on context-free grammars, see [the Wikipedia article on the
Earley parser](https://en.wikipedia.org/wiki/Earley_parser).

For the sake of having a concrete running example in this section, let's
assume we want to want to create the extremely simple grammar used as [an
example in that same
article](https://en.wikipedia.org/wiki/Earley_parser#Example).  We will make
one modification: we will accept any integer, rather than just the four
digits in that example.  Our grammar can thus be summarized as the following
rules.

 * P ::= S
 * S ::= S+M | M
 * M ::= M*T | T
 * T ::= any integer

We can represent the same grammar without the | symbol by separating single
lines into two separate lines.

 * P ::= S
 * S ::= S+M
 * S ::= M
 * M ::= M*T
 * M ::= T
 * T ::= any integer

Either way of representing a grammar is acceptable, and supported by this
module.  See [the section on specifying grammar
rules](#adding-grammar-rules), below.

### Constructor

There is just one constructor for grammars, and it takes as its sole
argument the name of the start nonterminal.  This need not be a single
capital letter, as it is in the example above; nonterminals can have any
word as their name.

```js
G = new Grammar( 'P' );
```

### Setting default options

After constructing a new grammar, you can choose to set some default options
that will govern its behavior.  Any of these can be overridden in any call
to the parse function, later, but you can set defaults here if you plan to
need them often.  You call `G.setOption( name, value )` to set the default
value for any option.

The options are documented thoroughly in [the source code
documentation](https://github.com/lurchmath/earley-parser/blob/master/earley-parser.litcoffee#earley-algorithm),
so I do not repeat that information here.  Examples of the output produced
by the various options appears in [the parsing
section](#running-the-parser), below.

### Adding grammar rules

A grammar rule requires a left-hand side, which must be a single
nonterminal, represented by a string.  Its right-hand side is typically an
array.  For instance, the grammar rule M ::= M*T has M as its left-hand side
and the three-element array M, *, and T as its right hand side.

The elements on the right hand side come in two types.  There are other
nonterminals (such as M and T) and there are terminals (the symbol *, in
this example).  Nonterminals are represented as strings, and terminals as
regular expressions.  Thus to create the grammar rule M ::= M*T, we would
use `'M'` as the left-hand side and `[ 'M', /\*/, 'T' ]` as the right-hand
side.

Our complete example grammar can then be created as follows.

```js
G = new Grammar( 'P' );
G.addRule( 'P', [ 'S' ] );
G.addRule( 'S', [ 'S', /\+/, 'M' ] );
G.addRule( 'S', [ 'M' ] );
G.addRule( 'M', [ 'M', /\*/, 'T' ] );
G.addRule( 'M', [ 'T' ] );
G.addRule( 'T', [ /-?[0-9]+/ ] );
```

There are a few things to improve upon here.

 1. We may combine rules that have the same left-hand side, just be listing
    the right-hand sides one after the other.
 1. We may express a one-element array containing a terminal by the regular
    expression alone, omitting the enclosing array.
 1. We may express a right-hand side consisting exclusively of one or more
    nonterminals by writing it as a single string, with the names of the
    nonterminals separated by spaces.

This reduces our grammar somewhat.

```js
G = new Grammar( 'P' );
G.addRule( 'P', 'S' );
G.addRule( 'S', [ 'S', /\+/, 'M' ], 'M' );
G.addRule( 'M', [ 'M', /\*/, 'T' ], 'T' );
G.addRule( 'T', /-?[0-9]+/ );
```

The P in this grammar is redundant; we could have left it out and declared
our grammar to start with S, but I leave it in to be consistent with the
Wikipedia article from which it was taken.

### Running the parser

We can then parse text by passing it to the grammar's `parse` member
function.

<div class="runnable-example">
T = new Tokenizer();
T.addType( /-?[0-9]+/ );
T.addType( /[+*]/ );
T.addType( /\s/, function () { return null; } );
G = new Grammar( 'P' );
G.setOption( 'tokenizer', T );
// Comment out either of these lines and re-run to see their effects:
G.setOption( 'addCategories', false );
G.setOption( 'collapseBranches', true );
G.addRule( 'P', 'S' );
G.addRule( 'S', [ 'S', /\+/, 'M' ], 'M' );
G.addRule( 'M', [ 'M', /\*/, 'T' ], 'T' );
G.addRule( 'T', /-?[0-9]+/ );
JSON.stringify( G.parse( '15 + -2 * 9' ), null, 2 );
</div>

The result of the `parse` function is an array of valid parsings.  In this
case, it has only one element, because there is only one way the expression
could be parsed.  For more complex grammars with ambiguities, more than one
result may be returned.

To override options chosen with `setOption()`, call the parse function with
an optional second argument, an object whose keys and values override the
existing options.  Example:

```js
G.parse( 'text', { collapseBranches : true } );
```

## Miscellany

This module extends the global `JSON` object with a routine that can compare
two JSON structures for structural equality.  Two atomic values are equal if
they are actually equal, two arrays are equal if they have the same lengths
and their corresponding entries are equal, and two objects are equal if they
have the same keys and the corresponding values in each are equal.

<div class="runnable-example">
JSON.equals( [ 1, 2, { 3 : 4 } ], [ 1, 2, { 3 : 4 } ] );
</div>

<div class="runnable-example">
JSON.equals( { a : 5 }, { b : 5 } );
</div>

## More Examples

In addition to the brief examples shown in this file, [the test suite in the
source code
repository](https://github.com/lurchmath/earley-parser/blob/master/earley-parser-spec.litcoffee)
is (naturally) a large set of examples of how the module works.

<script src="https://embed.runkit.com"></script>
<script>
var elements = document.getElementsByClassName( 'runnable-example' );
for ( var i = 0 ; i < elements.length ; i++ ) {
    var source = elements[i].textContent;
    elements[i].textContent = '';
    var notebook = RunKit.createNotebook( {
        element: elements[i],
        source: source,
        preamble: 'Tokenizer = require( "earley-parser" ).Tokenizer;\nGrammar = require( "earley-parser" ).Grammar;'
    } );
}
</script>
