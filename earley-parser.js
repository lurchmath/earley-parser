
// This module implements the Earley Parser, an algorithm [given on Wikipedia
// here](https://en.wikipedia.org/wiki/Earley_parser).  Much of this code was
// translated from [the desktop version of Lurch](www.lurchmath.org).

// An Earley state is an object of the following form.  The `lhs` and `rhs`
// together are the rule currently being matched, `pos` is the current
// position in that production, a zero-based index through all the interstitial
// points in `rhs` (zero being before the whole thing, 1 after the first
// entry, etc.), `ori` the position in the input text at which the match
// began (called the origin), and `got` is the list of tokens parsed so far.
// ```
// {
//     lhs : categoryname,
//     rhs : [ ... ],
//     pos : integerindex,
//     ori : integerindex,
//     got : [ ... ]
// }
// ```
// A parsed token is either a plain string containing the terminal or an array
// whose first element is the category name and the rest of which are the
// terminals and nonterminals in its parsing.

const getNext = state =>
    state.pos < state.rhs.length ? state.rhs[state.pos] : null

// The following simple tool is used to copy state objects.  It is a shallow
// copy in all except the `got` array.

const copyState = state => {
    return {
        lhs : state.lhs,
        rhs : state.rhs,
        pos : state.pos,
        ori : state.ori,
        got : state.got.slice(),
    }
}

// We will later need to compare two arrays of strings and/or regular
// expressions for equality.  This function does so.

const equalArrays = ( array1, array2 ) => {
    if ( array1.length != array2.length ) return false
    for ( let i = 0 ; i < array1.length ; i++ ) {
        const entry1 = array1[i]
        const entry2 = array2[i]
        if ( entry1 instanceof RegExp ) {
            if ( !( entry2 instanceof RegExp )
              || entry1.source != entry2.source )
                return false
        } else {
            if ( entry1 != entry2 ) return false
        }
    }
    return true
}

// All of the functionality of this module is embedded in a class called
// `Grammar`, which lets you define new grammars and then run them on strings
// to parse those strings.  This section defines that class.

// As mentioned on the Wikipedia page linked to above, a grammar is a set of
// rules of the form `C -> A1 A2 ... An` where `C` is the name of a category
// and each `Ai` can be a category name or a terminal.

// The `Grammar` class defined below stores a grammar as an object whose keys
// are category names with values of the following form.
// ```
//     [
//         [ 'catname', 'catname', /terminal/, /terminal/, ... ],
//         [ 'catname', /terminal/, 'catname', /terminal/, ... ],
//         ...
//     ],
// ```
// Each row in the two-dimensional array represents the right-hand side of one
// rule in the grammar, whose left hand side is the category name under which
// the entire two-dimensional array is stored.

// The entries in the arrays can be strings (which signify the names of
// non-terminals) or regular expressions (which signify that they are
// terminals, which must match the regular expression).

// Now we begin the class.

export class Grammar {

    // Indicate which of the categories is the starting category by passing its
    // name to a grammar when you construct one.
    
    constructor ( START ) {
        this.START = START
        this.rules = { }
        this.defaults = {
            addCategories : true,
            collapseBranches : false,
            showDebuggingOutput : false,
            expressionBuilder : null,
            tokenizer : null,
            comparator : sameJSON,
            maxIterations : -1 // no maximum
        }
    }

    // The default options for the parsing algorithm are initialized in the
    // constructor above, but you can change them using the following routine.  The
    // first parameter is the name of the option (from the list immediately above)
    // and the second parameter is its new value.  The meaning of these options is
    // documented [below](#earley-algorithm).

    setOption ( name, value ) {
        this.defaults[name] = value
    }

    // Add a rule to the grammar by specifying the category name and the sequence
    // of Ai that appear on the right hand side.  This creates/extends the
    // two-dimensional array described above.
    
    // You can pass more than one sequence by providing additional parameters, to
    // add them all at once.  You can also provide a string instead of an array,
    // and it will be converted into an array by splitting at spaces as if it were
    // a string.  Regular expressions will be automatically wrapped in `^...$` for
    // you, so that they are always tested against the entire string.

    addRule ( categoryName, ...sequences ) {
        sequences.forEach( sequence => {
            if ( sequence instanceof RegExp )
                sequence = [ sequence ]
            if ( !( sequence instanceof Array ) )
                sequence = `${sequence}`.split( ' ' )
            sequence.forEach( ( entry, index ) => {
                if ( entry instanceof RegExp )
                    sequence[index] = new RegExp( `^${entry.source}$` )
            } )
            if ( !this.rules[categoryName] )
                this.rules[categoryName] = [ ]
            this.rules[categoryName].push( sequence )
        } )
    }

    // The following function is the workhorse of this module.  It assumes that the
    // input is a string of a nonzero length.  Options is not a required parameter,
    // but if it is present it should be an object with some subset of the
    // following properties.  Any unspecified properties take the defaults given in
    // the constructor for this class, unless you changed them with `setOption`,
    // defined [above](#constructor).
    //  * `addCategories : true` iff category names should be prepended to each
    //    match sequence
    //  * `collapseBranches : true` iff one-argument match sequences should be
    //    collapsed, as in `[[[[a]]]] -> a`
    //  * `showDebuggingOutput : true` iff lots of debugging spam should be dumped
    //    to the console as the algorithm executes
    //  * `expressionBuilder` can be set to a function that will be called each
    //    time a production is completed.  It will receive as input the results of
    //    that production (wrapped in an array if `collapseBranches` is true, with
    //    the category name prepended if `addCategories` is true) and it can return
    //    any object to replace that array in the final result.  Since this will be
    //    called at every level of the hierarchy, you can use this to recursively
    //    build expressions from the leaves upwards.  Because it will need to be
    //    copyable, outputs are restricted to JSON data.
    //  * `tokenizer` can be an instance of the `Tokenizer` class
    //    [defined later in this module](#tokenizing), and if it is, it will be
    //    applied to any string input received by the parser before the parser does
    //    anything with it.  This way you can simply place the tokenizer inside the
    //    parser and forget about it; it will be run automatically.
    //  * `comparator` is used to compare two results before returning the full
    //    list, so that duplicates can be removed.  This defaults to a JSON-based
    //    comparison, but will therefore go into an infinite loop for circular
    //    structures.  Feel free to provide a different one if the default does not
    //    meet your needs.  To return duplicates, simply set this to `-> no`.
    //  * `maxIterations` defaults to infinite, but can be specified as a positive
    //    integer, and the parsing algorithm will not iterate its innermost loops
    //    any more than this many times.  This can be useful if you have a
    //    suspected infinite loop in a grammar, and want to debug it.
    
    // This algorithm is documented to some degree, but it will make much more
    // sense if you have read the Wikipedia page cited at the top of this file.

    parse ( input, options = { } ) {
        options = Object.assign( this.defaults, options )
        const expressionBuilderFlag = { }
        const debug = ( ...args ) => {
            if ( options.showDebuggingOutput ) console.log( ...args )
        }
        debug( '\n\n' )
        // Run the tokenizer if there is one, and the input needs it.
        if ( options.tokenizer && typeof( input ) == 'string' )
            input = options.tokenizer.tokenize( input )
        // Initialize the set of states to the array `[ [], [], ..., [] ]`, one entry
        // for each interstice between characters in `input`, including one for before
        // the first character and one for after the last.
        const stateGrid = new Array( input.length + 1 ).fill( null ).map( () => [ ] )
        // Push all productions for the starting non-terminal onto the initial state
        // set.
        stateGrid[0].push( {
            lhs : '',
            rhs : [ this.START ],
            pos : 0,
            ori : 0,
            got : [ ]
        } )
        // Do the main nested loop which solves the whole problem.
        let numIterationsDone = 0
        stateGrid.forEach( ( stateSet, i ) => {
            debug( `processing stateSet ${i} in this stateGrid (with input ${input}):` )
            debug( '----------------------' )
            for ( let tmpi = 0 ; tmpi < stateGrid.length ; tmpi++ ) {
                debug( `|    state set ${tmpi}:` )
                let skipped = 0
                for ( let tmpj = 0 ; tmpj < stateGrid[tmpi].length ; tmpj++ ) {
                    if ( stateGrid[tmpi].length < 15
                      || stateGrid[tmpi][tmpj].pos > 0 )
                        debug( `|        entry ${tmpj}: ${debugState(stateGrid[tmpi][tmpj])}` )
                    else
                        skipped++
                }
                if ( skipped > 0 )
                debug( `|    (plus ${skipped} at pos 0 not shown)` )
            }
            debug( '----------------------' )
            // The following loop is written in this indirect way (not using `for`) because
            // the contents of `stateSet` may be modified within the loop, so we need to be
            // sure that we do not pre-compute its length, but allow it to grow.
            let j = 0
            while ( j < stateSet.length ) {
                const state = stateSet[j]
                debug( `entry ${j}:`, debugState( state ) )
                // There are three possibilities.
                //  * The next state is a terminal,
                //  * the next state is a production, or
                //  * there is no next state.
                // Each of these is handled by a separate sub-task of the Earley algorithm.
                const next = getNext( state )
                debug( 'next:', next )
                if ( next === null ) {
                    // This is the case in which there is no next state.  It is handled by running
                    // the "completer":  We just completed a nonterminal, so mark progress in
                    // whichever rules spawned it by copying them into the next column in
                    // `stateGrid`, with progress incremented one step.
                    
                    // Then we proceed with the code for the completer.
                    debug( 'considering if this completion matters to state set', state.ori )
                    stateGrid[state.ori].forEach( s => {
                        if ( getNext( s ) == state.lhs ) {
                            s = copyState( s )
                            s.pos++
                            let got = state.got.slice()
                            if ( options.addCategories )
                                got.unshift( state.lhs )
                            if ( options.expressionBuilder )
                                got.unshift( expressionBuilderFlag )
                            if ( options.collapseBranches && got.length == 1 )
                                got = got[0]
                            s.got.push( got )
                            stateGrid[i].push( s )
                            debug( `completer added this to ${i}:`, debugState( s ) )
                            if ( numIterationsDone++ > options.maxIterations
                              && options.maxIterations > 0 )
                                throw new Error( 'Maximum number of iterations reached.' )
                        }
                    } )
                    j++
                    continue
                }
                if ( i >= input.length ) {
                    j++
                    continue
                }
                debug( 'is it a terminal?', next instanceof RegExp )
                if ( next instanceof RegExp ) {
                    // This is the case in which the next state is a terminal.  It is handled by
                    // running the "scanner":  If the next terminal in `state` is the one we see
                    // coming next in the input string, then find every production at that
                    // terminal's origin that contained that terminal, and mark progress here.
                    if ( next.test( input[i] ) ) {
                        const copy = copyState( state )
                        copy.pos++
                        copy.got.push( input[i] )
                        stateGrid[i+1].push( copy )
                        debug( `scanner added this to ${i+1}:`, debugState( copy ) )
                    }
                    j++
                    continue
                }
                if ( !this.rules.hasOwnProperty( next ) )
                    throw new Error( `Unknown non-terminal in grammar rule: ${next}` )
                // This is the case in which the next state is a non-terminal, i.e., the lhs of
                // one or more rules.  It is handled by running the "predictor:"  For every
                // rule that starts with the non-terminal that's coming next, add that rule to
                // the current state set so that it will be explored in future passes through
                // the inner of the two main loops.
                const rhss = this.rules[next]
                debug( `rhss: [${rhss.join('],[')}]` )
                rhss.forEach( rhs => {
                    let found = false
                    for ( let s of stateSet ) {
                        if ( s.lhs == next && equalArrays( s.rhs, rhs ) && s.pos == 0 ) {
                            found = true
                            break
                        }
                    }
                    if ( !found ) {
                        stateSet.push( {
                            lhs : next,
                            rhs : rhs,
                            pos : 0,
                            ori : i,
                            got : [ ]
                        } )
                        debug( 'adding this state:', debugState( stateSet[stateSet.length-1] ) )
                    }
                } )
                j++
                if ( numIterationsDone++ > options.maxIterations
                  && options.maxIterations > 0 )
                    throw new Error( 'Maximum number of iterations reached.' )
            }
        } )
        debug( `finished processing this stateGrid (with input ${input}):` )
        debug( '----------------------' )
        for ( let tmpi = 0 ; tmpi < stateGrid.length ; tmpi++ ) {
            debug( `|    state set ${tmpi}:` )
            let skipped = 0
            for ( let tmpj = 0 ; tmpj < stateGrid[tmpi].length ; tmpj++ ) {
                if ( stateGrid[tmpi].length < 15
                    || stateGrid[tmpi][tmpj].pos > 0 )
                    debug( `|        entry ${tmpj}: ${debugState( stateGrid[tmpi][tmpj])}` )
                else
                    skipped++
            }
            if ( skipped > 0 )
                debug( `|    (plus ${skipped} at pos 0 not shown)` )
        }
        debug( '----------------------' )
        // The main loop is complete.  Any completed production in the final state set
        // that's marked as a result (and thus coming from state 0 to boot) is a valid
        // parsing and should be returned.  We find such productions with this loop:
        const results = [ ]
        stateGrid[stateGrid.length-1].forEach( stateSet => {
            if ( stateSet.lhs == '' && getNext( stateSet ) == null ) {
                let result = stateSet.got[0]
                // When we find one, we have some checks to do before returning it.  First,
                // recursively apply `expressionBuilder`, if the client asked us to.
                if ( options.expressionBuilder ) {
                    const recur = obj => {
                        if ( !( obj instanceof Array ) || obj[0] != expressionBuilderFlag )
                            return obj
                        let args = obj.slice( 1 ).map( recur )
                        if ( args.length == 1 && options.collapseBranches )
                            args = args[0]
                        // If the expression builder function returns undefined for any subexpression
                        // of the whole, we treat that as an error (saying the expression cannot be
                        // built for whatever application-specific reason the builder function has) and
                        // we thus do not include that result in the list.
                        if ( args.indexOf( undefined ) > -1 )
                            return undefined
                        return options.expressionBuilder( args )
                    }
                    result = recur( result )
                    if ( !result ) return
                }
                // Second, don't return any duplicates.  So check to see if we've already seen
                // this result before we add it to the final list of results to return.
                if ( !results.some( old => options.comparator( old, result ) ) )
                    results.push( result )
            }
        } )
        // Now return the final result list.
        return results
    }
    
}

// We also provide a class for doing simple tokenization of strings into arrays
// of tokens, which can then be passed to a parser.  To use this class, create
// an instance, add some token types using the `addType` function documented
// below, then either call its `tokenize` function yourself on a string, or
// just set this tokenizer as the default tokenizer on a parser.

export class Tokenizer {

    constructor () {
        this.tokenTypes = [ ]
    }

    // This function adds a token type to this object.  The first parameter is the
    // regular expression used to match the tokens.  The second parameter can be
    // either of three things:
    //  * If it is a function, that function will be run on every instance of the
    //    token that's found in any input being tokenized, and the output of the
    //    function used in place of the token string in the return value from this
    //    tokenizer.  But if the function returns null, the tokenizer will omit
    //    that token from the output array.  This is useful for, say, removing
    //    whitespace:  `addType( /\s/, -> null )`.  The function will actually
    //    receive two parameters, the second being the regular expresison match
    //    object, which can be useful if there were captured subexpressions.
    //  * If it is a string, that string will be used as the output token instead
    //    of the actual matched token.  All `%n` patterns in the output will be
    //    simultaneously replaced with the captured expressions of the type's
    //    regular expression (with zero being the entire match).  This is useful
    //    for reformatting tokens by adding detail.  Example:
    //    `addType( /-?[0-9]+/, 'Integer(%0)' )`
    //  * The second parameter may be omitted, and it will be treated as the
    //    identity function, as in the first bullet point above.

    addType ( regexp, formatter = x => x ) {
        if ( regexp.source[0] != '^' )
            regexp = new RegExp( `^(?:${regexp.source})` )
        this.tokenTypes.push( { regexp, formatter } )
    }
    
    // Tokenizing is useful for grouping large, complex chunks of text into one
    // piece before parsing, so that the parsing rules can be simpler and clearer.
    // For example, a regular expression that groups double-quoted string literals
    // into single tokens is `/"(?:[^\\"]|\\\\|\\")*"/`.  That's a much shorter bit
    // of code to write than a complex set of parsing rules that accomplish the
    // same purpose; it will also run more efficiently than those rules would.
    
    // The following routine tokenizes the input, returning one of two things:
    //  * an array of tokens, each of which was the output of the formatter
    //    function/string provided to `addType()`, above, or
    //  * null, because some portion of the input string did not match any of the
    //    token types added with `addType()`.
    
    // The routine simply tries every regular expression of every token type added
    // with `addType()`, above, and when one succeeds, it pops that text off the
    // input string, saving it to a results list after passing it through the
    // corresponding formatter.  If at any point none of the regular expressions
    // matches the beginning of the remaining input, null is returned.

    tokenize ( input ) {
        const result = [ ]
        while ( input.length > 0 ) {
            const original = input.length
            for ( let type of this.tokenTypes ) {
                const match = type.regexp.exec( input )
                if ( !match ) continue
                input = input.substr( match[0].length )
                if ( type.formatter instanceof Function ) {
                    const next = type.formatter( match[0], match )
                    if ( next ) result.push( next )
                } else {
                    let format = `${type.formatter}`
                    let token = ''
                    let next
                    while ( next = /\%([0-9]+)/.exec( format ) ) {
                        token += format.slice( 0, next.index ) + match[next[1]]
                        format = format.slice( next.index + next[0].length )
                    }
                    result.push( token + format )
                }
                break
            }
            if ( input.length == original ) return null
        }
        return result
    }
    
}

// The following debugging routines are used in some of the code above.

const debugNestedArrays = array => {
    if ( array instanceof Array ) {
        if ( JSON.stringify( array[0] ) == '{}' ) array = array.slice( 1 )
        return '[' + array.map( debugNestedArrays ).join( ',' ) + ']'
    }
    return array
}
const debugState = state =>
    `(${state.lhs} -> ${state.pos}in[${state.rhs}], ${state.ori}) got ${debugNestedArrays(state.got)}`

// By a "JSON object" I mean an object where the only information we care about
// is that which would be preserved by `JSON.stringify` (i.e., an object that
// can be serialized and deserialized with JSON's `stringify` and `parse`
// without bringing any harm to our data).

// We wish to be able to compare such objects for semantic equality (not actual
// equality of objects in memory, as `==` would do).  We cannot simply do this
// by comparing the `JSON.stringify` of each, because [documentation on
// JSON.stringify](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)
// says that we cannot rely on a consistent ordering of the object keys.  Thus
// we implement the following comparison routine.

// Note that this only works for objects that fit the requirements above; if
// equality (in your situation) is affected by the prototype chain, or if your
// object contains functions, or any other similar difficulty, then this
// routine is not guaranteed to work for you.

// It yields the same result as `JSON.stringify(x) is JSON.stringify(y)` would
// if `stringify` always gave the same ordering of object keys.

const sameJSON = ( x, y ) => {
    // If only one is an object, or only one is an array, then they're not equal.
    // If neither is an object, you can use plain simple `is` to compare.
    if ( ( x instanceof Object ) != ( y instanceof Object ) ) return false
    if ( ( x instanceof Array ) != ( y instanceof Array ) ) return false
    if ( !( x instanceof Object ) ) return x === y
    // So now we know that both inputs are objects.

    // Get their keys in a consistent order.  If they aren't the same for both
    // objects, then the objects aren't equal.
    const xkeys = Object.keys( x ).sort()
    const ykeys = Object.keys( y ).sort()
    if ( JSON.stringify( xkeys ) != JSON.stringify( ykeys ) ) return false
    // If there's any key on which the objects don't match, then they aren't equal.
    // Otherwise, they are.
    return xkeys.every( key => sameJSON( x[key], y[key] ) )
}

// And the following lines test to see if this function is running in a
// [WebWorker](https://www.w3.org/TR/workers/), and if so, they install an
// event handler for messages posted from the main thread, which exposes the
// key API from this module to the outside, through message-passing.
if ( typeof( WorkerGlobalScope ) !== 'undefined'
  || ( typeof( self ) !== 'undefined'
    && typeof( self.importScripts ) !== 'undefined' ) ) {

    // We keep track of a set of named parsers in this object.  Clients can create
    // them by passing messages to this thread, as defined below.
    const ParserStore = { }
    self.addEventListener( 'message', event => {
        const command = event.data[0]
        const name = event.data[1]
        switch( command ) {

            // Receiving a message of the form
            // `[ 'newParser', 'parser name', 'start token' ]`
            // creates a new parser.
            case 'newParser':
                const startToken = event.data[2]
                ParserStore[name] = new Grammar( startToken )
                break

            // Clients can add types to the parser's tokenizer (which is created if there
            // wasn't one before) with messages of the form
            // `[ 'addType', 'parser name', 'regular expression' ]`.  With two
            // exceptions, these messages are converted directly into function calls of
            // `addType()` in the tokenizer (so see its documentation above).

            // The exceptions:  First, because regular expressions cannot be passed to
            // workers, the client must pass `regexp.source` instead, and on this end, the
            // `RegExp` constructor will be called to rebuild the object.

            // Second, there is an optional fourth argument, the transformation function to
            // be applied to any token encountered of this type.  Because functions cannot
            // be passed to workers, the client must convert the function to a string
            // (e.g., `String(f)`).  It will be rebuilt into a function on this side,
            // obviously without its original environment/scope.
            case 'addType':
                if ( !ParserStore[name] ) return
                const regexp = event.data[2]
                let func = event.data[3]
                const funcre = /\s*function\s*\(((?:[a-zA-Z0-9,]|\s)*)\)\s*\{\s*((?:.|\n)*)\}\s*$/
                if ( func ) {
                    const match = funcre.exec( func )
                    match[1] = match[1].replace( /\s/g, '' )
                    func = new Function( ...match.slice( 1 ) )
                }
                ParserStore[name].defaults.tokenizer ||= new Tokenizer()
                ParserStore[name].defaults.tokenizer.addType( new RegExp( regexp ), func )
                break

            // Clients can add rules to the parser with messages of the form
            // `[ 'addRule', 'parser name', 'category', sequences... ]`.  These
            // messages are converted directly into function calls of `addRule()` in the
            // parser, so see its documentation above.

            // Because regular expressions cannot be passed to WebWorkers, we modify the
            // convention in storing the sequences.  Each item in a sequence must be of
            // the form "c:category name" or "t:terminal regexp" so that category names
            // and regular expressions for terminals can be distinguished.  We convert
            // them to strings or regular expressions before calling `addRule()`.
            case 'addRule':
                if ( !ParserStore[name] ) return
                const category = event.data[2]
                const sequences = event.data.slice( 3 )
                sequences.forEach( ( sequence, index ) => {
                    if ( /^t:/.test( sequence ) )
                        sequences[index] = [ new RegExp( sequence.slice( 2 ) ) ]
                    if ( !( sequence instanceof Array ) )
                        sequences[index] = sequence = `${sequence}`.split( ' ' )
                    sequence.forEach( ( entry, index2 ) => {
                        let rest = entry.slice( 2 )
                        if ( entry[0] == 't' )
                            rest = new RegExp( `^${rest}$` )
                        sequence[index2] = rest
                    } )
                } )
                ParserStore[name].addRule( category, ...sequences )
                break

            // Clients passing messages of the form `[ 'parse', 'parser name', 'text' ]`
            // are requesting the named parser to parse the given text and then send a
            // message back containing the results (which may be an empty list, as in the
            // documentation of the `parse()` function in the `Parser` class, above).
            case 'parse':
                if ( !ParserStore[name] ) return
                const text = event.data[2]
                self.postMessage( ParserStore[name].parse( text ) )
                break

            // Clients can pass a message `[ 'deleteParser', 'parser name' ]` to remove
            // the named parser from memory.
            case 'deleteParser':
                delete ParserStore[name]
        }
    } )

}

