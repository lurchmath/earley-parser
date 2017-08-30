
// This file is only for when this package is installed via npm.
// It is what will be imported when users require this package.
// It imports the utilities from earley-parser.litcoffee.

path = require( 'path' );
var EP = require( path.resolve( __dirname, 'earley-parser' ) );
exports.Tokenizer = EP.Tokenizer;
exports.Grammar = EP.Grammar;

