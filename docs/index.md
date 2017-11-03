
# Earley Parser Documentation

## Get started now

To import this code via a CDN or `npm`, check out the [API Reference
Page](api-reference.md).

## Background

The [Earley Parsing algorithm](https://en.wikipedia.org/wiki/Earley_parser)
can parse strings according to any context-free grammar.  This module lets
the user define tokens and grammar rules, then pass strings in to be
tokenized and parsed, or just pass in pre-tokenized arrays to be parsed.

Parse trees are returned as nested JavaScript arrays, but the user can also
provide callbacks that construct other kinds of hierarchical structures (or
do computation) instead of building parse trees.

## More Information

The following additional information is available in this documentation.

 * [Source Code](source-code.md) - see the source and/or import it into your
   own project
 * [API Reference](api-reference.md) - how to use the various functions and
   objects provided

   More documentation may be added here in the future. For now you can [view this repository ![github](img/GitHub-Mark-32px.png)](https://github.com/lurchmath/earley-parser).
