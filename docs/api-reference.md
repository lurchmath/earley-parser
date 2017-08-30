
# API Reference

## Getting started

### In the browser

Import the minified JavaScript, which you can [download from our repository
directly](https://raw.githubusercontent.com/lurchmath/earley-parser/master/earley-parser.js)
or import from a CDN with the following one-liner.

```html
<script src='https://cdn.jsdelivr.net/npm/earley-parser@1.0.0/earley-parser.js'></script>
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

Example:

<div class="runnable-example">
G = new Grammar( 'name your grammar here' );
typeof( G.addRule )
</div>

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

## This API Reference is not complete!

Further documentation forthcoming.
