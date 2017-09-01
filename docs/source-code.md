
# Source Code

## Reading the source

The code in [the repository](https://github.com/lurchmath/earley-parser)
resides in [one
file](https://github.com/lurchmath/earley-parser/blob/master/earley-parser.litcoffee),
written in [Literate CoffeeScript](http://coffeescript.org/#literate).

## Changing the source

If you don't like that language, you can always compile it directly to
JavaScript with the following command.

```
coffee --compile earley-parser.litcoffee
```

This assumes that you've [installed
CoffeeScript](http://coffeescript.org/#installation) and have the [source
file](https://github.com/lurchmath/earley-parser/blob/master/earley-parser.litcoffee)
accessible.

## Importing the source

To import the source into your project, you can include it directly from a
CDN at [this
URL](https://cdn.jsdelivr.net/npm/earley-parser@1/earley-parser.js). There is a
source map file in the same folder that your browser should detect.
