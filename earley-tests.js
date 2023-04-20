
import { Grammar, Tokenizer } from './earley-parser.js'

describe( 'Grammar and Tokenizer classes', () => {

    it( 'should be defined', () => {
        expect( Grammar ).to.be.ok
        expect( Tokenizer ).to.be.ok
    } )

} )

describe( 'A simple grammar', () => {

    let G

    // Define the grammar here.  D is for digit, I for (nonnegative) integer, M for
    // multiplication expression, and S for summation expression.    
    beforeEach( () => {
        G = new Grammar( 'S' )
        G.addRule( 'D', /[0-9]/ )
        G.addRule( 'I', 'D', 'I D' )
        G.addRule( 'M', 'I', [ 'M', /\*/, 'I' ] )
        G.addRule( 'S', 'M', [ 'S', /\+/, 'M' ] )
    } )

    it( 'Should correctly parse nonnegative integers', () => {
        expect( G.parse( '5' ) ).to.eql(
            [ [ 'S', [ 'M', [ 'I', [ 'D', '5' ] ] ] ] ] )
        expect( G.parse( '19' ) ).to.eql(
            [ [ 'S', [ 'M', [ 'I', [ 'I', [ 'D', '1' ] ], [ 'D', '9' ] ] ] ] ] )
        G.setOption( 'addCategories', false )
        G.setOption( 'collapseBranches', true )
        expect( G.parse( '5' ) ).to.eql( [ '5' ] )
        expect( G.parse( '19' ) ).to.eql( [ [ '1', '9' ] ] )
    } )

    it( 'should parse products of nonnegative integers', () => {
        expect( G.parse( '7*5' ) ).to.eql(
            [ [ 'S', [ 'M', [ 'M', [ 'I', [ 'D', '7' ] ] ], '*',
                            [ 'I', [ 'D', '5' ] ] ] ] ] )
        G.setOption( 'addCategories', false )
        G.setOption( 'collapseBranches', true )
        expect( G.parse( '7*5*3*1' ) ).to.eql(
            [ [ [ [ '7', '*', '5' ], '*', '3' ], '*', '1' ] ] )
    } )

    it( 'should parse sums of products of nonnegative integers', () => {
        expect( G.parse( '1+2' ) ).to.eql(
            [ [ 'S', [ 'S', [ 'M', [ 'I', [ 'D', '1' ] ] ] ], '+',
                    [ 'M', [ 'I', [ 'D', '2' ] ] ] ] ] )
        G.setOption( 'addCategories', false )
        G.setOption( 'collapseBranches', true )
        expect( G.parse( '3*6+9' ) ).to.eql(
            [ [ [ '3', '*', '6' ], '+', '9' ] ] )
        expect( G.parse( '3+6*9' ) ).to.eql(
            [ [ '3', '+', [ '6', '*', '9' ] ] ] )
        G.setOption( 'expressionBuilder', x =>
            x instanceof Array ? `(${x.join('')})` : `${x}` )
        expect( G.parse( '3+6*9' ) ).to.eql( [ '(3+(6*9))' ] )
    } )

} )

describe( 'A simple Tokenizer', () => {

    it( 'should tokenize arithmetic expressions', () => {
        const T = new Tokenizer
        T.addType( /[a-zA-Z_][a-zA-Z_0-9]*/ )
        T.addType( /\.[0-9]+|[0-9]+\.?[0-9]*/ )
        T.addType( /"(?:[^\\"]|\\\\|\\")*"/ )
        T.addType( /[()+/*-]/ )
        expect( T.tokenize( '5' ) ).to.eql( [ '5' ] )
        expect( T.tokenize( '19' ) ).to.eql( [ '19' ] )
        expect( T.tokenize( '6-9' ) ).to.eql( [ '6', '-', '9' ] )
        expect( T.tokenize( 'x*-5.0/(_tmp+k)' ) ).to.eql(
            [ 'x', '*', '-', '5.0', '/', '(', '_tmp', '+', 'k', ')' ] )
        expect( T.tokenize( 'alert("message")' ) ).to.eql(
            [ 'alert', '(', '"message"', ')' ] )
    } )

    it( 'should support format functions', () => {
        const T = new Tokenizer
        T.addType( /\s/, () => null )
        T.addType( /[a-zA-Z_][a-zA-Z_0-9]*/ )
        T.addType( /\.[0-9]+|[0-9]+\.?[0-9]*/ )
        T.addType( /"(?:[^\\"]|\\\\|\\")*"/ )
        T.addType( /\/((?:[^\\\/]|\\\\|\\\/)*)\//,
            ( text, match ) => `RegExp(${match[1]})` )
        T.addType( /[()+/*-]/ )
        expect( T.tokenize( '5' ) ).to.eql( [ '5' ] )
        expect( T.tokenize( '19' ) ).to.eql( [ '19' ] )
        expect( T.tokenize( '6-9' ) ).to.eql( [ '6', '-', '9' ] )
        expect( T.tokenize( 'x*-5.0/(_tmp+k)' ) ).to.eql(
            [ 'x', '*', '-', '5.0', '/', '(', '_tmp', '+', 'k', ')' ] )
        expect( T.tokenize( 'alert("message")' ) ).to.eql(
            [ 'alert', '(', '"message"', ')' ] )
        expect( T.tokenize( 'my(/regexp/)+6' ) ).to.eql(
            [ 'my', '(', 'RegExp(regexp)', ')', '+', '6' ] )
        expect( T.tokenize( '64 - 8320   + K' ) ).to.eql(
            [ '64', '-', '8320', '+', 'K' ] )
    } )

    it( 'should support format strings', () => {
        const T = new Tokenizer
        T.addType( /[a-zA-Z_][a-zA-Z_0-9]*/ )
        T.addType( /\.[0-9]+|[0-9]+\.?[0-9]*/ )
        T.addType( /"(?:[^\\"]|\\\\|\\")*"/ )
        T.addType( /\/((?:[^\\\/]|\\\\|\\\/)*)\//, 'RegExp(%1)' )
        T.addType( /[()+/*-]/ )
        expect( T.tokenize( '5' ) ).to.eql( [ '5' ] )
        expect( T.tokenize( '19' ) ).to.eql( [ '19' ] )
        expect( T.tokenize( '6-9' ) ).to.eql( [ '6', '-', '9' ] )
        expect( T.tokenize( 'x*-5.0/(_tmp+k)' ) ).to.eql(
            [ 'x', '*', '-', '5.0', '/', '(', '_tmp', '+', 'k', ')' ] )
        expect( T.tokenize( 'alert("message")' ) ).to.eql(
            [ 'alert', '(', '"message"', ')' ] )
        expect( T.tokenize( 'my(/regexp/)+6' ) ).to.eql(
            [ 'my', '(', 'RegExp(regexp)', ')', '+', '6' ] )
    } )

} )

describe( 'Tokenizing and parsing', () => {

    it( 'should support parsing arrays', () => {
        const G = new Grammar( 'S' )
        G.addRule( 'I', /[0-9]+/ )
        G.addRule( 'M', 'I', [ 'M', /\*/, 'I' ] )
        G.addRule( 'S', 'M', [ 'S', /\+/, 'M' ] )
        expect( G.parse( [ '5' ] ) ).to.eql(
            [ [ 'S', [ 'M', [ 'I', '5' ] ] ] ] )
        expect( G.parse( [ '19' ] ) ).to.eql(
            [ [ 'S', [ 'M', [ 'I', '19' ] ] ] ] )
        G.setOption( 'addCategories', false )
        G.setOption( 'collapseBranches', true )
        expect( G.parse( [ '5' ] ) ).to.eql( [ '5' ] )
        expect( G.parse( [ '19' ] ) ).to.eql( [ '19' ] )
        expect( G.parse( [ '7', '*', '50', '*', '33', '*', '1' ] ) )
            .to.eql( [ [ [ [ '7', '*', '50' ], '*', '33' ], '*', '1' ] ] )
        G.setOption( 'expressionBuilder', x =>
            x instanceof Array ? `(${x.join('')})` : `${x}` )
        expect( G.parse( [ '333', '+', '726', '*', '2349' ] ) )
            .to.eql( [ '(333+(726*2349))' ] )
    } )

    it( 'should be chainable', () => {
        const T = new Tokenizer
        T.addType( /\s/, () => null )
        T.addType( /[a-zA-Z_][a-zA-Z_0-9]*/ )
        T.addType( /\.[0-9]+|[0-9]+\.?[0-9]*/ )
        T.addType( /"(?:[^\\"]|\\\\|\\")*"/ )
        T.addType( /[()+/*-]/ )
        const G = new Grammar( 'expr' )
        G.addRule( 'expr', 'sumdiff' )
        G.addRule( 'atomic', /[a-zA-Z_][a-zA-Z_0-9]*/ )
        G.addRule( 'atomic', /\.[0-9]+|[0-9]+\.?[0-9]*/ )
        G.addRule( 'atomic', /"(?:[^\\"]|\\\\|\\")*"/ )
        G.addRule( 'atomic', [ /\(/, 'sumdiff', /\)/ ] )
        G.addRule( 'prodquo', [ 'atomic' ] )
        G.addRule( 'prodquo', [ 'prodquo', /[*/]/, 'atomic' ] )
        G.addRule( 'sumdiff', [ 'prodquo' ] )
        G.addRule( 'sumdiff', [ 'sumdiff', /[+-]/, 'prodquo' ] )
        G.setOption( 'addCategories', false )
        G.setOption( 'collapseBranches', true )
        G.setOption( 'expressionBuilder', expr =>
            ( expr[0] == '(' && expr[2] == ')' && expr.length == 3 ) ?
                expr[1] : expr )
        expect( G.parse( T.tokenize( 'ident-7.8/other' ) ) ).to.eql(
            [ [ 'ident', '-', [ '7.8', '/', 'other' ] ] ] )
        expect( G.parse( T.tokenize( 'ident*7.8/other' ) ) ).to.eql(
            [ [ [ 'ident', '*', '7.8' ], '/', 'other' ] ] )
        expect( G.parse( T.tokenize( 'ident*(7.8/other)' ) ) ).to.eql(
            [ [ 'ident', '*', [ '7.8', '/', 'other' ] ] ] )
    } )

    it( 'should be connectable using a parser option', () => {
        const T = new Tokenizer
        T.addType( /\s/, () => null )
        T.addType( /[a-zA-Z_][a-zA-Z_0-9]*/ )
        T.addType( /\.[0-9]+|[0-9]+\.?[0-9]*/ )
        T.addType( /"(?:[^\\"]|\\\\|\\")*"/ )
        T.addType( /[()+/*-]/ )
        const G = new Grammar( 'expr' )
        G.addRule( 'expr', 'sumdiff' )
        G.addRule( 'atomic', /[a-zA-Z_][a-zA-Z_0-9]*/ )
        G.addRule( 'atomic', /\.[0-9]+|[0-9]+\.?[0-9]*/ )
        G.addRule( 'atomic', /"(?:[^\\"]|\\\\|\\")*"/ )
        G.addRule( 'atomic', [ /\(/, 'sumdiff', /\)/ ] )
        G.addRule( 'prodquo', [ 'atomic' ] )
        G.addRule( 'prodquo', [ 'prodquo', /[*\/]/, 'atomic' ] )
        G.addRule( 'sumdiff', [ 'prodquo' ] )
        G.addRule( 'sumdiff', [ 'sumdiff', /[+-]/, 'prodquo' ] )
        G.setOption( 'addCategories', false )
        G.setOption( 'collapseBranches', true )
        G.setOption( 'expressionBuilder', expr =>
            ( expr[0] == '(' && expr[2] == ')' && expr.length == 3 ) ?
                expr[1] : expr )
        G.setOption( 'tokenizer', T )
        expect( G.parse( T.tokenize( 'ident-7.8/other' ) ) ).to.eql(
            [ [ 'ident', '-', [ '7.8', '/', 'other' ] ] ] )
        expect( G.parse( T.tokenize( 'ident*7.8/other' ) ) ).to.eql(
            [ [ [ 'ident', '*', '7.8' ], '/', 'other' ] ] )
        expect( G.parse( T.tokenize( 'ident*(7.8/other)' ) ) ).to.eql(
            [ [ 'ident', '*', [ '7.8', '/', 'other' ] ] ] )
    } )

} )

describe( 'A larger, useful grammar', () => {

    let G
    const comparator = ( a, b ) => JSON.stringify( a ) == JSON.stringify( b )

    // The following function defines a large, complex grammar based on the
    // types of content that can be produced by the MathQuill interactive
    // equation-builder widget used in some web pages.  The exact details are
    // not important, but merely that it supports a large set of common
    // mathematical content.
    // We use the names of various OpenMath symbols here for historical reasons.
    // For a time, this repository aimed to support the construction of OpenMath
    // objects, though that is no longer a priority.  It still makes for a
    // useful set of tests.
    beforeEach( () => {
        G = new Grammar( 'expression' )
        // Rules for numbers
        G.addRule( 'digit', /[0-9]/ )
        G.addRule( 'nonnegint', 'digit' )
        G.addRule( 'nonnegint', [ 'digit', 'nonnegint' ] )
        G.addRule( 'integer', 'nonnegint' )
        G.addRule( 'integer', [ /\u2212|-/, 'nonnegint' ] )
        G.addRule( 'float', [ 'integer', /\./, 'nonnegint' ] )
        G.addRule( 'float', [ 'integer', /\./ ] )
        G.addRule( 'infinity', [ /\u221e/ ] )
        // Rules for variables
        G.addRule( 'variable', /[a-zA-Z\u0374-\u03FF]/ )
        // The above together are called "atomics"
        G.addRule( 'atomic', 'integer' )
        G.addRule( 'atomic', 'float' )
        G.addRule( 'atomic', 'variable' )
        G.addRule( 'atomic', 'infinity' )
        // Rules for the operations of arithmetic
        G.addRule( 'factor', 'atomic' )
        G.addRule( 'factor', [ 'atomic', /sup/, 'atomic' ] )
        G.addRule( 'factor', [ 'factor', /[%]/ ] )
        G.addRule( 'factor', [ /\$/, 'factor' ] )
        G.addRule( 'factor', [ 'factor', /sup/, /\u2218/ ] ) // # degree symbol
        G.addRule( 'prodquo', 'factor' )
        G.addRule( 'prodquo', [ 'prodquo', /[\u00f7\u00d7\u00b7]/, 'factor' ] )
            // the above three are divide, times, and cdot
        G.addRule( 'prodquo', [ /\u2212|-/, 'prodquo' ] )
        G.addRule( 'sumdiff', 'prodquo' )
        G.addRule( 'sumdiff', [ 'sumdiff', /[+\u00b1\u2212-]/, 'prodquo' ] )
            // the escapes above are for the \pm symbol and the alternate - sign
        // Rules for logarithms
        G.addRule( 'ln', [ /ln/, 'atomic' ] )
        G.addRule( 'log', [ /log/, 'atomic' ] )
        G.addRule( 'log', [ /log/, /sub/, 'atomic', 'atomic' ] )
        G.addRule( 'prodquo', 'ln' )
        G.addRule( 'prodquo', 'log' )
        // Rules for factorial
        G.addRule( 'factorial', [ 'atomic', /!/ ] )
        G.addRule( 'factor', 'factorial' )
        // Rules for the operations of set theory (still incomplete)
        G.addRule( 'setdiff', 'variable' )
        G.addRule( 'setdiff', [ 'setdiff', /[\u223c]/, 'variable' ] )
        // Rules for subscripts, which count as function application (so that "x sub i"
        // still contains i as a free variable)
        G.addRule( 'subscripted', [ 'atomic', /sub/, 'atomic' ] )
        G.addRule( 'noun', 'subscripted' )
        // Rules for various structures, like fractions, which are treated indivisibly,
        // and thus as if they were atomics
        G.addRule( 'fraction', [ /fraction/, /\(/, 'atomic', 'atomic', /\)/ ] )
        G.addRule( 'atomic', 'fraction' )
        G.addRule( 'root', [ /\u221a/, 'atomic' ] )
        G.addRule( 'root', [ /nthroot/, 'atomic', /√/, 'atomic' ] )
        G.addRule( 'atomic', 'root' )
        G.addRule( 'decoration', [ /overline/, 'atomic' ] )
        G.addRule( 'decoration', [ /overarc/, 'atomic' ] )
        G.addRule( 'atomic', 'decoration' )
        G.addRule( 'trigfunc', [ /sin|cos|tan|cot|sec|csc/ ] )
        G.addRule( 'trigapp', [ 'trigfunc', 'prodquo' ] )
        G.addRule( 'trigapp', [ 'trigfunc', /sup/, /\(/, /-|\u2212/, /1/, /\)/, 'prodquo' ] )
        G.addRule( 'atomic', 'trigapp' )
        // Rules for limits and summations
        G.addRule( 'limit',
            [ /lim/, /sub/, /\(/, 'variable', /[\u2192]/, 'expression', /\)/, 'prodquo' ] )
            // 2192 is a right arrow
        G.addRule( 'takesleftcoeff', 'limit' )
        G.addRule( 'sum', [ /[\u03a3]/, // summation sign
            /sub/, /\(/, 'variable', /[=]/, 'expression', /\)/,
            /sup/, 'atomic', 'prodquo' ] )
        G.addRule( 'sum', [ /[\u03a3]/, /sup/, 'atomic', // summation sign
            /sub/, /\(/, 'variable', /[=]/, 'expression', /\)/,
            'prodquo' ] )
        G.addRule( 'takesleftcoeff', 'sum' )
        // Rules for differential and integral calculus
        G.addRule( 'differential', [ /d/, 'atomic' ] )
        G.addRule( 'difffrac', [ /fraction/, /\(/, /d/, /\(/, /d/, 'variable', /\)/, /\)/ ] )
        G.addRule( 'indefint', [ /[\u222b]/, 'prodquo' ] ) // integral sign
        G.addRule( 'defint', [ /[\u222b]/, /sub/, 'atomic', /sup/, 'atomic', 'prodquo' ] ) // again
        G.addRule( 'defint', [ /[\u222b]/, /sup/, 'atomic', /sub/, 'atomic', 'prodquo' ] ) // again
        G.addRule( 'factor', 'differential' )
        G.addRule( 'factor', 'difffrac' )
        G.addRule( 'takesleftcoeff', 'indefint' )
        G.addRule( 'takesleftcoeff', 'defint' )
        // The category `takesleftcoeff` contains those things that can be multiplied
        // on the left, unambiguously, by a coefficient.  For instance, a limit, when
        // multiplied on the left by a coefficient, is clearly the coefficient times
        // the entire limit, as a consequence of the opening marker "lim" which removes
        // the possibility for ambiguity.  The same is true of summations and
        // integrals.
        G.addRule( 'sumdiff', 'takesleftcoeff' )
        G.addRule( 'sumdiff', [ 'factor', /[\u00f7\u00d7\u00b7]/, 'takesleftcoeff' ] )
        G.addRule( 'sumdiff', [ 'prodquo', /[+\u00b1\u2212-]/, 'takesleftcoeff' ] )
        // So far we've only defined rules for forming mathematical nouns, so we wrap
        // the highest-level non-terminal defined so far, sumdiff, in the label "noun."
        G.addRule( 'noun', 'sumdiff' )
        G.addRule( 'noun', 'setdiff' )
        // Rules for forming sentences from nouns, by placing relations between them
        G.addRule( 'atomicsentence',
            [ 'noun', /[=\u2260\u2248\u2243\u2264\u2265<>]/, 'noun' ] )
            // =, \ne, \approx, \cong, \le, \ge, <, >
        G.addRule( 'atomicsentence', [ /[\u00ac]/, 'atomicsentence' ] )
        G.addRule( 'sentence', 'atomicsentence' )
        G.addRule( 'sentence', [ /[\u2234]/, 'sentence' ] ) // the therefore symbol
        // Rules for groupers
        G.addRule( 'atomic', [ /\(/, 'noun', /\)/ ] )
        G.addRule( 'atomicsentence', [ /\(/, 'sentence', /\)/ ] )
        G.addRule( 'interval', [ /[\(\[]/, 'noun', /,/, 'noun', /[\)\]]/ ] )
        G.addRule( 'atomic', 'interval' )
        G.addRule( 'absval', [ /\|/, 'noun', /\|/ ] )
        G.addRule( 'atomic', 'absval' )
        // And finally, place "expression" at the top of the grammar; one is permitted
        // to use this grammar to express mathematical nouns or complete sentences
        G.addRule( 'expression', 'noun' )
        G.addRule( 'expression', 'sentence' )
        // A function that recursively assembles a made-up proprietary data
        // structure from the hierarchy of arrays created by the parser
        const makeSym = ( name, category ) => ['Sym:',name+'.'+category]
        G.setOption( 'comparator', comparator )
        const symbols = {
            '+' : makeSym( 'plus', 'arith1' ),
            '-' : makeSym( 'minus', 'arith1' ),
            '\u2212' : makeSym( 'minus', 'arith1' ),
            '\u00b1' : makeSym( 'plusminus', 'multiops' ),
            '\u00d7' : makeSym( 'times', 'arith1' ),
            '\u00b7' : makeSym( 'times', 'arith1' ),
            '\u00f7' : makeSym( 'divide', 'arith1' ),
            '^' : makeSym( 'power', 'arith1' ),
            '\u221e' : makeSym( 'infinity', 'nums1' ),
            '\u221a' : makeSym( 'root', 'arith1' ),
            '\u223c' : makeSym( 'set1', 'setdiff' ), // alternate form of ~
            '=' : makeSym( 'eq', 'relation1' ),
            '<' : makeSym( 'lt', 'relation1' ),
            '>' : makeSym( 'gt', 'relation1' ),
            '\u2260' : makeSym( 'neq', 'relation1' ),
            '\u2248' : makeSym( 'approx', 'relation1' ),
            '\u2264' : makeSym( 'le', 'relation1' ),
            '\u2265' : makeSym( 'ge', 'relation1' ),
            '\u2243' : makeSym( 'modulo_relation', 'integer2' ),
            '\u00ac' : makeSym( 'not', 'logic1' ),
            '\u2218' : makeSym( 'degrees', 'units' ),
            '$' : makeSym( 'dollars', 'units' ),
            '%' : makeSym( 'percent', 'units' ),
            '\u222b' : makeSym( 'int', 'calculus1' ),
            'def\u222b' : makeSym( 'defint', 'calculus1' ),
            'ln' : makeSym( 'ln', 'transc1' ),
            'log' : makeSym( 'log', 'transc1' ),
            'unary-' : makeSym( 'unary_minus', 'arith1' ),
            'overarc' : makeSym( 'overarc', 'decoration' ),
            'overline' : makeSym( 'overline', 'decoration' ),
            'd' : makeSym( 'd', 'diff' ),
            'interval_oc' : makeSym( 'interval_oc', 'interval1' ),
            'interval_co' : makeSym( 'interval_co', 'interval1' ),
            'interval_oo' : makeSym( 'interval_oo', 'interval1' ),
            'interval_cc' : makeSym( 'interval_cc', 'interval1' )
        }
        G.setOption( 'expressionBuilder', expr => {
            // console.log( 'eBuilder', JSON.stringify( expr ) )
            const build = ( ...args ) => {
                // const orig = args.slice()
                args = args.map( a => {
                    if ( typeof( a ) == 'number' ) a = expr[a]
                    if ( symbols.hasOwnProperty( a ) ) a = symbols[a]
                    if ( typeof( a ) == 'string' ) a = ['Atomic:',a]
                    return a
                } )
                // console.log( '\t', JSON.stringify([orig,args]) )
                const tmp = ['App:',...args]
                if ( G.expressionBuilderDebug )
                    console.log( 'build', JSON.stringify( args ), '-->', tmp )
                return tmp
            }
            const atomicValue = atomic =>
                [ 'Int:', 'Float:', 'Var:', 'Sym:' ].includes( atomic[0] ) ?
                atomic[1] : null
            let result
            switch ( expr[0] ) {
                case 'digit':
                case 'nonnegint':
                    result = expr.slice( 1 ).join( '' )
                    break
                case 'integer':
                    result = ['Int:',parseInt(expr.slice(1).join(''))]
                    break
                case 'float':
                    result = [
                        'Float:',
                        parseFloat(atomicValue(expr[1])+expr.slice(2).join(''))
                    ]
                    break
                case 'variable':
                    result = ['Var:',expr[1]]
                    break
                case 'infinity':
                    result = symbols[expr[1]]
                    break
                case 'sumdiff':
                case 'prodquo':
                    if ( expr.length == 3 )
                        result = build( 'unary-', 2 )
                    else if ( expr.length == 4 )
                        result = build( 2, 1, 3 )
                    break
                case 'factor':
                    if ( expr.length == 3 )
                        result = expr[2] == '%' ?
                            build( '\u00d7', 1, symbols['%'] ) :
                            build( '\u00d7', 2, symbols['$'] )
                    else if ( expr.length == 4 )
                        result = expr[3] == '\u2218' ?
                            build( '\u00d7', 1, symbols['\u2218'] ) :
                            build( '^', 1, 3 )
                    break
                case 'fraction':
                    result = build( '\u00f7', 3, 4 )
                    break
                case 'root':
                    if ( expr.length == 3 )
                        result = build( '\u221a', 2, ['Int:',2] )
                    else if ( expr.length == 5 )
                        result = build( '\u221a', 4, 2 )
                    break
                case 'ln':
                    result = build( 'ln', 2 )
                    break
                case 'log':
                    if ( expr.length == 3 )
                        result = build( 'log', ['Int:',10], 2 )
                    else if ( expr.length == 5 )
                        result = build( 'log', 3, 4 )
                    break
                case 'atomic':
                    result = expr.length == 4 && expr[1] == '(' && expr[3] == ')' ?
                        expr[2] : undefined
                    break
                case 'atomicsentence':
                    if ( expr.length == 3 )
                        result = build( 1, 2 )
                    else if ( expr.length == 4 )
                        result = build( 2, 1, 3 )
                    break
                case 'decoration':
                    result = build( 1, 2 )
                    break
                case 'sentence':
                    result = expr[1] == '\u2234' ? expr[2] : undefined
                    break
                case 'interval':
                    const left = expr[1] == '(' ? 'o' : 'c'
                    const right = expr[5] == ')' ? 'o' : 'c'
                    result = build( `interval_${left}${right}`, 2, 4 )
                    break
                case 'absval':
                    result = build( makeSym( 'abs', 'arith1' ), 2 )
                    break
                case 'trigapp':
                    if ( expr.length == 3 )
                        result = build( makeSym( expr[1], 'transc1' ), 2 )
                    else if ( expr.length == 8 )
                        result = build( makeSym( 'arc' + expr[1], 'transc1' ), 7 )
                    break
                case 'subscripted':
                    result = build( 1, 3 )
                    break
                case 'factorial':
                    result = build( makeSym( 'factorial', 'integer1' ), 1 )
                    break
                case 'limit':
                    result = build(
                        makeSym( 'limit', 'limit1' ), 6,
                        makeSym( 'both_sides', 'limit1' ),
                        [ 'Bind:', makeSym( 'lambda', 'fns1' ), expr[4], expr[8] ] )
                    break
                case 'sum':
                    let [ varname, from, to ] = expr[2] == 'sup' ?
                        [ 6, 8, 3 ] : [ 4, 6, 9 ]
                    result = build(
                        makeSym( 'sum', 'arith1' ),
                        [ 'App:', makeSym( 'interval', 'interval1' ),
                                  expr[from], expr[to] ],
                        [ 'Bind:', makeSym( 'lambda', 'fns1' ),
                                   expr[varname], expr[10] ] )
                    break
                case 'differential':
                    result = build( 'd', 2 )
                    break
                case 'difffrac':
                    result = build( '\u00f7', 'd', build( 'd', 6 ) )
                    break
                case 'indefint':
                    result = build( '\u222b', 2 )
                    break
                case 'defint':
                    let [ a, b ] = expr[2] == 'sup' ? [ 5, 3 ] : [ 3, 5 ]
                    result = build( 'def\u222b', a, b, 6 )
                    break
            }
            if ( !result ) {
                result = expr[1]
                // console.log( 'No result, so choosing expr[1] = ',
                //     JSON.stringify( result ) )
            }
            if ( G.expressionBuilderDebug )
                console.log( JSON.stringify( expr ), '--->', JSON.stringify( result ) )
            return result
        } )
    } )

    let input, output

    it( 'should parse numbers', () => {
        // An integer first (which also counts as a float)
        input = '1 0 0'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql( ['Int:',100] )
        // A floating point value second
        input = '3 . 1 4 1 5 9'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql( ['Float:',3.14159] )
        // Let's pretend infinity is a number, and include it in this test.
        input = [ '\u221e' ] // infinity symbol
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql( ['Sym:','infinity.nums1'] )
    } )

    it( 'should parse variables', () => {
        // Roman letters, upper and lower case
        input = [ "x" ]
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql( ['Var:','x'] )
        input = [ "R" ]
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql( ['Var:','R'] )
        // Greek letters
        input = [ "α" ]
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql( ['Var:','α'] )
        input = [ "π" ]
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql( ['Var:','π'] )
        // Subscripted variables
        input = 'x sub i'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql( ['App:',['Var:','x'],['Var:','i']] )
        input = 'T sub ( j + k )'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Var:','T'],
                ['App:',['Sym:','plus.arith1'],['Var:','j'],['Var:','k']]
            ]
        )
    } )

    it( 'should parse simple arithmetic expressions', () => {
        // Try one of each operation in isolation
        input = '6 + k'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',['Sym:','plus.arith1'],['Int:',6],['Var:','k']]
        )
        input = '1 . 9 - T'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',['Sym:','minus.arith1'],['Float:',1.9],['Var:','T']]
        )
        input = '0 . 2 · 0 . 3'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',['Sym:','times.arith1'],['Float:',0.2],['Float:',0.3]]
        )
        input = 'v ÷ w'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',['Sym:','divide.arith1'],['Var:','v'],['Var:','w']]
        )
        input = 'v ± w'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',['Sym:','plusminus.multiops'],['Var:','v'],['Var:','w']]
        )
        input = '2 sup k'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',['Sym:','power.arith1'],['Int:',2],['Var:','k']]
        )
        // Now try same-precedence operators in sequence, and ensure that they
        // left-associate.
        input = '5 . 0 - K + e'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','plus.arith1'],
                ['App:',['Sym:','minus.arith1'],['Float:',5.0],['Var:','K']],
                ['Var:','e']
            ]
        )
        input = '5 . 0 × K ÷ e'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','divide.arith1'],
                ['App:',['Sym:','times.arith1'],['Float:',5.0],['Var:','K']],
                ['Var:','e']
            ]
        )
        input = '( a sup b ) sup c'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','power.arith1'],
                ['App:',['Sym:','power.arith1'],['Var:','a'],['Var:','b']],
                ['Var:','c']
            ]
        )
        // Now try different-precendence operators in combination, and ensure that
        // precedence is respected.
        input = '5 . 0 - K · e'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','minus.arith1'],
                ['Float:',5.0],
                ['App:',['Sym:','times.arith1'],['Var:','K'],['Var:','e']]
            ]
        )
        input = '5 . 0 × K + e'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','plus.arith1'],
                ['App:',['Sym:','times.arith1'],['Float:',5.0],['Var:','K']],
                ['Var:','e']
            ]
        )
        input = 'u sup v × w sup x'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','times.arith1'],
                ['App:',['Sym:','power.arith1'],['Var:','u'],['Var:','v']],
                ['App:',['Sym:','power.arith1'],['Var:','w'],['Var:','x']]
            ]
        )
        // Verify that unary negation works.
        // Note that this is the first time where there are two possible
        // parsing results--just this first test in this section.
        // The answer can be unary negation of 7 OR a single atomic number -7.
        input = '- 7'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 2 )
        expect( output[0] ).to.eql( ['Int:',-7] )
        expect( output[1] ).to.eql( ['App:',['Sym:','unary_minus.arith1'],['Int:',7]] )
        input = 'A + - B'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','plus.arith1'],
                ['Var:','A'],
                ['App:',['Sym:','unary_minus.arith1'],['Var:','B']]
            ]
        )
        input = '- A + B'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','plus.arith1'],
                ['App:',['Sym:','unary_minus.arith1'],['Var:','A']],
                ['Var:','B']
            ]
        )
        input = '- A sup B'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','unary_minus.arith1'],
                ['App:',['Sym:','power.arith1'],['Var:','A'],['Var:','B']]
            ]
        )
    } )

    it( 'should respect parentheses', () => {
        // First, verify that a chain of sums left-associates.
        input = '6 + k + 5'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','plus.arith1'],
                ['App:',['Sym:','plus.arith1'],['Int:',6],['Var:','k']],
                ['Int:',5]
            ]
        )
        // Now verify that we can override that with parentheses.
        input = '6 + ( k + 5 )'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','plus.arith1'],
                ['Int:',6],
                ['App:',['Sym:','plus.arith1'],['Var:','k'],['Int:',5]]
            ]
        )
        // And verify that parentheses override precedence as well.  Contrast the
        // following tests to those at the end of the previous section, which tested
        // the default precendence of these operators.
        input = '( 5 . 0 - K ) · e'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','times.arith1'],
                ['App:',['Sym:','minus.arith1'],['Float:',5.0],['Var:','K']],
                ['Var:','e']
            ]
        )
        input = '5 . 0 × ( K + e )'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','times.arith1'],
                ['Float:',5.0],
                ['App:',['Sym:','plus.arith1'],['Var:','K'],['Var:','e']]
            ]
        )
        input = '- ( K + e )'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','unary_minus.arith1'],
                ['App:',['Sym:','plus.arith1'],['Var:','K'],['Var:','e']]
            ]
        )
        input = '- ( A sup B )'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','unary_minus.arith1'],
                ['App:',['Sym:','power.arith1'],['Var:','A'],['Var:','B']]
            ]
        )
    } )

    it( 'should support fractions', () => {
        // Let's begin with fractions of atomics.
        input = 'fraction ( 1 2 )'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',['Sym:','divide.arith1'],['Int:',1],['Int:',2]]
        )
        input = 'fraction ( p q )'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',['Sym:','divide.arith1'],['Var:','p'],['Var:','q']]
        )
        // Now we'll try fractions of larger things
        input = 'fraction ( ( 1 + t ) 3 )'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','divide.arith1'],
                ['App:',['Sym:','plus.arith1'],['Int:',1],['Var:','t']],
                ['Int:',3]
            ]
        )
        input = 'fraction ( ( a + b ) ( a - b ) )'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','divide.arith1'],
                ['App:',['Sym:','plus.arith1'],['Var:','a'],['Var:','b']],
                ['App:',['Sym:','minus.arith1'],['Var:','a'],['Var:','b']]
            ]
        )
        // And lastly we verify that parsing takes place correctly inside the
        // numerator and denominator of fractions.
        input = 'fraction ( ( 1 + 2 × v ) ( - w ) )'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','divide.arith1'],
                ['App:',
                    ['Sym:','plus.arith1'],
                    ['Int:',1],
                    ['App:',['Sym:','times.arith1'],['Int:',2],['Var:','v']]
                ],
                ['App:',['Sym:','unary_minus.arith1'],['Var:','w']]
            ]
        )
    } )

    it( 'should support square roots and nth roots', () => {
        // First, square roots of simple expressions.
        input = '√ 2'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',['Sym:','root.arith1'],['Int:',2],['Int:',2]]
        )
        input = '√ ( 1 0 - k + 9 . 6 )'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','root.arith1'],
                ['App:',
                    ['Sym:','plus.arith1'],
                    ['App:',['Sym:','minus.arith1'],['Int:',10],['Var:','k']],
                    ['Float:',9.6]
                ],
                ['Int:',2]
            ]
        )
        // Second, nth roots of simple expressions.
        input = 'nthroot p √ 2'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',['Sym:','root.arith1'],['Int:',2],['Var:','p']]
        )
        input = 'nthroot 5 0 √ ( 1 0 - k + 9 . 6 )'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','root.arith1'],
                ['App:',
                    ['Sym:','plus.arith1'],
                    ['App:',['Sym:','minus.arith1'],['Int:',10],['Var:','k']],
                    ['Float:',9.6]
                ],
                ['Int:',50]
            ]
        )
        // Next, square roots of fractions and of other roots, and placed in context.
        input = 'fraction ( 6 √ fraction ( 1 2 ) )'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','divide.arith1'],
                ['Int:',6],
                ['App:',
                    ['Sym:','root.arith1'],
                    ['App:',['Sym:','divide.arith1'],['Int:',1],['Int:',2]],
                    ['Int:',2]
                ]
            ]
        )
        input = '√ ( 1 + √ 5 ) + 1'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','plus.arith1'],
                ['App:',
                    ['Sym:','root.arith1'],
                    ['App:',
                        ['Sym:','plus.arith1'],
                        ['Int:',1],
                        ['App:',['Sym:','root.arith1'],['Int:',5],['Int:',2]]
                    ],
                    ['Int:',2]
                ],
                ['Int:',1]
            ]
        )
        // Finally, nth roots containing more complex expressions.
        input = 'nthroot ( 2 + t ) √ ( 1 ÷ ∞ )'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','root.arith1'],
                ['App:',['Sym:','divide.arith1'],['Int:',1],['Sym:','infinity.nums1']],
                ['App:',['Sym:','plus.arith1'],['Int:',2],['Var:','t']]
            ]
        )
    } )

    it( 'should support logarithms of all types', () => {
        // Natural logarithms of a simple thing and a larger thing.
        input = 'ln x'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql( ['App:',['Sym:','ln.transc1'],['Var:','x']] )
        input = 'ln fraction ( 2 ( x + 1 ) )'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','ln.transc1'],
                ['App:',
                    ['Sym:','divide.arith1'],
                    ['Int:',2],
                    ['App:',['Sym:','plus.arith1'],['Var:','x'],['Int:',1]]
                ]
            ]
        )
        // Logarithms with an implied base 10, of a simple thing and a larger thing.
        input = 'log 1 0 0 0'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',['Sym:','log.transc1'],['Int:',10],['Int:',1000]]
        )
        input = 'log ( e sup x × y )'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','log.transc1'],
                ['Int:',10],
                ['App:',
                    ['Sym:','times.arith1'],
                    ['App:',['Sym:','power.arith1'],['Var:','e'],['Var:','x']],
                    ['Var:','y']
                ]
            ]
        )
        // Logarithms with an explicit base, of a simple thing and a larger thing.
        input = 'log sub ( 3 1 ) 6 5'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',['Sym:','log.transc1'],['Int:',31],['Int:',65]]
        )
        input = 'log sub ( - t ) ( k + 5 )'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','log.transc1'],
                ['App:',['Sym:','unary_minus.arith1'],['Var:','t']],
                ['App:',['Sym:','plus.arith1'],['Var:','k'],['Int:',5]]
            ]
        )
    } )

    it( 'should support sentences', () => {
        // First, relations among nouns.
        input = '2 < 3'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',['Sym:','lt.relation1'],['Int:',2],['Int:',3]]
        )
        input = '- 6 > k'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 2 )
        expect( output[0] ).to.eql(
            ['App:',['Sym:','gt.relation1'],['Int:',-6],['Var:','k']]
        )
        expect( output[1] ).to.eql(
            ['App:',
                ['Sym:','gt.relation1'],
                ['App:',['Sym:','unary_minus.arith1'],['Int:',6]],
                ['Var:','k']
            ]
        )
        input = 't + u = t + v'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','eq.relation1'],
                ['App:',['Sym:','plus.arith1'],['Var:','t'],['Var:','u']],
                ['App:',['Sym:','plus.arith1'],['Var:','t'],['Var:','v']]
            ]
        )
        input = 't + u ≠ t + v'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','neq.relation1'],
                ['App:',['Sym:','plus.arith1'],['Var:','t'],['Var:','u']],
                ['App:',['Sym:','plus.arith1'],['Var:','t'],['Var:','v']]
            ]
        )
        input = 'fraction ( a ( 7 + b ) ) ≈ 0 . 7 5'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','approx.relation1'],
                ['App:',
                    ['Sym:','divide.arith1'],
                    ['Var:','a'],
                    ['App:',['Sym:','plus.arith1'],['Int:',7],['Var:','b']]
                ],
                ['Float:',0.75]
            ]
        )
        input = 't sup 2 ≤ 1 0'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','le.relation1'],
                ['App:',['Sym:','power.arith1'],['Var:','t'],['Int:',2]],
                ['Int:',10]
            ]
        )
        input = '1 + 2 + 3 ≥ 6'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','ge.relation1'],
                ['App:',
                    ['Sym:','plus.arith1'],
                    ['App:',['Sym:','plus.arith1'],['Int:',1],['Int:',2]],
                    ['Int:',3]
                ],
                ['Int:',6]
            ]
        )
        input = 'k ≃ l'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',['Sym:','modulo_relation.integer2'],['Var:','k'],['Var:','l']]
        )
        // Second, sentences with a "therefore" at the front.
        input = '∴ 1 < 2'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',['Sym:','lt.relation1'],['Int:',1],['Int:',2]]
        )
        // Finally, sentences that are negated.
        input = '¬ A + B = C sup D'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','not.logic1'],
                ['App:',
                    ['Sym:','eq.relation1'],
                    ['App:',['Sym:','plus.arith1'],['Var:','A'],['Var:','B']],
                    ['App:',['Sym:','power.arith1'],['Var:','C'],['Var:','D']]
                ]
            ]
        )
        input = '¬ ¬ x = x'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','not.logic1'],
                ['App:',
                    ['Sym:','not.logic1'],
                    ['App:',['Sym:','eq.relation1'],['Var:','x'],['Var:','x']]
                ]
            ]
        )
    } )

    it( 'should support units', () => {
        input = '1 0 0 %'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',['Sym:','times.arith1'],['Int:',100],['Sym:','percent.units']]
        )
        input = '$ ( d + 5 0 )'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','times.arith1'],
                ['App:',['Sym:','plus.arith1'],['Var:','d'],['Int:',50]],
                ['Sym:','dollars.units']
            ]
        )
        input = '4 5 sup ∘'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',['Sym:','times.arith1'],['Int:',45],['Sym:','degrees.units']]
        )
    } )

    it( 'should support decorations (overline, overarc)', () => {
        input = 'overline ( x )'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',['Sym:','overline.decoration'],['Var:','x']]
        )
        input = 'overarc ( 6 - fraction ( e 3 ) )'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','overarc.decoration'],
                ['App:',
                    ['Sym:','minus.arith1'],
                    ['Int:',6],
                    ['App:',['Sym:','divide.arith1'],['Var:','e'],['Int:',3]]
                ]
            ]
        )
    } )

    it( 'should support intervals of all four types', () => {
        // First, just some simple tests with easy contents.
        input = '( 1 , 2 ]'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',['Sym:','interval_oc.interval1'],['Int:',1],['Int:',2]]
        )
        input = '( t , k )'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',['Sym:','interval_oo.interval1'],['Var:','t'],['Var:','k']]
        )
        input = '[ I , J ]'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',['Sym:','interval_cc.interval1'],['Var:','I'],['Var:','J']]
        )
        input = '[ 3 0 , 5 2 . 9 )'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',['Sym:','interval_co.interval1'],['Int:',30],['Float:',52.9]]
        )
        // Now tests that are trickier because of intervals near other intervals, or
        // intervals within intervals, or parentheses in or around intervals.
        input = '( 4 × ( t + u ) , 2 sup 9 ]'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','interval_oc.interval1'],
                ['App:',
                    ['Sym:','times.arith1'],
                    ['Int:',4],
                    ['App:',['Sym:','plus.arith1'],['Var:','t'],['Var:','u']]
                ],
                ['App:',['Sym:','power.arith1'],['Int:',2],['Int:',9]]
            ]
        )
        input = '( 3 - [ 1 , 2 ] ) × 4'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','times.arith1'],
                ['App:',
                    ['Sym:','minus.arith1'],
                    ['Int:',3],
                    ['App:',['Sym:','interval_cc.interval1'],['Int:',1],['Int:',2]]
                ],
                ['Int:',4]
            ]
        )
        input = '[ ( 2 , 3 ] , ( j , j + 1 ] )'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','interval_co.interval1'],
                ['App:',['Sym:','interval_oc.interval1'],['Int:',2],['Int:',3]],
                ['App:',
                    ['Sym:','interval_oc.interval1'],
                    ['Var:','j'],
                    ['App:',['Sym:','plus.arith1'],['Var:','j'],['Int:',1]]
                ]
            ]
        )
    } )

    it( 'should support absolute values', () => {
        // First, absolute values of atomics.
        input = '| a |'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',['Sym:','abs.arith1'],['Var:','a']]
        )
        input = '| - 9 6 2 |'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 2 )
        expect( output[0] ).to.eql(
            ['App:',['Sym:','abs.arith1'],['Int:',-962]]
        )
        expect( output[1] ).to.eql(
            ['App:',
                ['Sym:','abs.arith1'],
                ['App:',['Sym:','unary_minus.arith1'],['Int:',962]]
            ]
        )
        // Second, absolute values of some expressions.
        input = '| fraction ( ( a sup b ) 1 0 ) |'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','abs.arith1'],
                ['App:',
                    ['Sym:','divide.arith1'],
                    ['App:',['Sym:','power.arith1'],['Var:','a'],['Var:','b']],
                    ['Int:',10]
                ]
            ]
        )
        input = '| 9 - 8 + 7 - 6 |'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','abs.arith1'],
                ['App:',
                    ['Sym:','minus.arith1'],
                    ['App:',
                        ['Sym:','plus.arith1'],
                        ['App:',
                            ['Sym:','minus.arith1'],
                            ['Int:',9],
                            ['Int:',8]
                        ],
                        ['Int:',7]
                    ],
                    ['Int:',6]
                ]
            ]
        )
        // Finally, multiple absolute values in the same expression.
        input = '| 6 + r | - | 6 - r |'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','minus.arith1'],
                ['App:',
                    ['Sym:','abs.arith1'],
                    ['App:',
                        ['Sym:','plus.arith1'],
                        ['Int:',6],
                        ['Var:','r']
                    ]
                ],
                ['App:',
                    ['Sym:','abs.arith1'],
                    ['App:',
                        ['Sym:','minus.arith1'],
                        ['Int:',6],
                        ['Var:','r']
                    ]
                ]
            ]
        )
        input = '| fraction ( ( | x | ) x ) |'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','abs.arith1'],
                ['App:',
                    ['Sym:','divide.arith1'],
                    ['App:',
                        ['Sym:','abs.arith1'],
                        ['Var:','x']
                    ],
                    ['Var:','x']
                ]
            ]
        )
        input = '| | 1 | + | 1 | |'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','abs.arith1'],
                ['App:',
                    ['Sym:','plus.arith1'],
                    ['App:',
                        ['Sym:','abs.arith1'],
                        ['Int:',1]
                    ],
                    ['App:',
                        ['Sym:','abs.arith1'],
                        ['Int:',1]
                    ]
                ]
            ]
        )
    } )

    it( 'should support trigonometric functions and inverses', () => {
        // Simple application of a few of the trig functions and/or inverse trig
        // functions.
        input = 'sin x'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',['Sym:','sin.transc1'],['Var:','x']]
        )
        input = 'tan π'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',['Sym:','tan.transc1'],['Var:','π']]
        )
        input = 'sec sup ( - 1 ) 0'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',['Sym:','arcsec.transc1'],['Int:',0]]
        )
        // Now place them inside expressions, or expressions inside them, or both.
        input = 'cos x + 1'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','plus.arith1'],
                ['App:',['Sym:','cos.transc1'],['Var:','x']],
                ['Int:',1]
            ]
        )
        input = 'cot ( a - 9 . 9 )'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','cot.transc1'],
                ['App:',['Sym:','minus.arith1'],['Var:','a'],['Float:',9.9]]
            ]
        )
        input = '| csc sup ( - 1 ) ( 1 + g ) | sup 2'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','power.arith1'],
                ['App:',
                    ['Sym:','abs.arith1'],
                    ['App:',
                        ['Sym:','arccsc.transc1'],
                        ['App:',['Sym:','plus.arith1'],['Int:',1],['Var:','g']]
                    ]
                ],
                ['Int:',2]
            ]
        )
    } )

    it( 'should support factorials', () => {
        input = '1 0 !'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',['Sym:','factorial.integer1'],['Int:',10]]
        )
        input = 'W × R !'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','times.arith1'],
                ['Var:','W'],
                ['App:',['Sym:','factorial.integer1'],['Var:','R']]
            ]
        )
        input = '( W + R ) !'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','factorial.integer1'],
                ['App:',['Sym:','plus.arith1'],['Var:','W'],['Var:','R']]
            ]
        )
    } )

    it( 'should support limits', () => {
        // We only support limits of one variable as it goes to a specific value.
        // These tests follow the convention given for this OpenMath symbol:
        // http://www.openmath.org/cd/limit1.xhtml#limit
        input = 'lim sub ( x → t sub 0 ) sin x'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','limit.limit1'],
                ['App:',['Var:','t'],['Int:',0]],
                ['Sym:','both_sides.limit1'],
                ['Bind:',
                    ['Sym:','lambda.fns1'],
                    ['Var:','x'],
                    ['App:',['Sym:','sin.transc1'],['Var:','x']]
                ]
            ]
        )
        input = '3 × lim sub ( a → 1 ) fraction ( a 1 ) + 9'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','plus.arith1'],
                ['App:',
                    ['Sym:','times.arith1'],
                    ['Int:',3],
                    ['App:',
                        ['Sym:','limit.limit1'],
                        ['Int:',1],
                        ['Sym:','both_sides.limit1'],
                        ['Bind:',
                            ['Sym:','lambda.fns1'],
                            ['Var:','a'],
                            ['App:',['Sym:','divide.arith1'],['Var:','a'],['Int:',1]]
                        ]
                    ]
                ],
                ['Int:',9]
            ]
        )
    } )

    it( 'should support sums', () => {
        // We only support sum of one variable between two specific values.
        // These tests follow the convention given for this OpenMath symbol:
        // http://www.openmath.org/cd/arith1.xhtml#sum
        input = 'Σ sub ( x = 1 ) sup 5 x sup 2'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','sum.arith1'],
                ['App:',['Sym:','interval.interval1'],['Int:',1],['Int:',5]],
                ['Bind:',
                    ['Sym:','lambda.fns1'],
                    ['Var:','x'],
                    ['App:',['Sym:','power.arith1'],['Var:','x'],['Int:',2]]
                ]
            ]
        )
        input = 'Σ sup ( n + 1 ) sub ( m = 0 ) m - 1'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','minus.arith1'],
                ['App:',
                    ['Sym:','sum.arith1'],
                    ['App:',
                        ['Sym:','interval.interval1'],
                        ['Int:',0],
                        ['App:',['Sym:','plus.arith1'],['Var:','n'],['Int:',1]]
                    ],
                    ['Bind:',
                        ['Sym:','lambda.fns1'],
                        ['Var:','m'],
                        ['Var:','m']
                    ]
                ],
                ['Int:',1]
            ]
        )
    } )

    it( 'should support differential and integral calculus', () => {
        // Differentials are d followed by a variable:
        input = 'd x'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql( ['App:',['Sym:','d.diff'],['Var:','x']] )
        input = 'd Q'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql( ['App:',['Sym:','d.diff'],['Var:','Q']] )
        // Differential fractions are like d/dx (i.e., d over d times a variable):
        input = 'fraction ( d ( d x ) )'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 2 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','divide.arith1'],
                ['Sym:','d.diff'],
                ['App:',['Sym:','d.diff'],['Var:','x']]
            ]
        )
        expect( output[1] ).to.eql(
            ['App:',
                ['Sym:','divide.arith1'],
                ['Var:','d'],
                ['App:',['Sym:','d.diff'],['Var:','x']]
            ]
        )
        // Indefinite integrals:
        input = '∫ x sup 2 · d x'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','int.calculus1'],
                ['App:',
                    ['Sym:','times.arith1'],
                    ['App:',['Sym:','power.arith1'],['Var:','x'],['Int:',2]],
                    ['App:',['Sym:','d.diff'],['Var:','x']]
                ]
            ]
        )
        input = '∫ ( fraction ( x k ) - 1 0 ) · d k'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','int.calculus1'],
                ['App:',
                    ['Sym:','times.arith1'],
                    ['App:',
                        ['Sym:','minus.arith1'],
                        ['App:',['Sym:','divide.arith1'],['Var:','x'],['Var:','k']],
                        ['Int:',10]
                    ],
                    ['App:',['Sym:','d.diff'],['Var:','k']]
                ]
            ]
        )
        // Definite integrals:
        input = '∫ sub 0 sup 2 ( s + t ) · d t'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','defint.calculus1'],
                ['Int:',0],
                ['Int:',2],
                ['App:',
                    ['Sym:','times.arith1'],
                    ['App:',['Sym:','plus.arith1'],['Var:','s'],['Var:','t']],
                    ['App:',['Sym:','d.diff'],['Var:','t']]
                ]
            ]
        )
        input = '∫ sup b sub a | x - 1 | · d x'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','defint.calculus1'],
                ['Var:','a'],
                ['Var:','b'],
                ['App:',
                    ['Sym:','times.arith1'],
                    ['App:',
                        ['Sym:','abs.arith1'],
                        ['App:',['Sym:','minus.arith1'],['Var:','x'],['Int:',1]]
                    ],
                    ['App:',['Sym:','d.diff'],['Var:','x']]
                ]
            ]
        )
    } )

    it( 'should read arithmetic around limit-like things correctly', () => {
        // For instance, if we see ∫ A · B, we know that the B is inside the integral,
        // but if we see ∫ A + B, we know that the B is outside the integral.  And yet
        // on the left side, as in B · ∫ A or B + ∫ A, both are outside the integral.
        // We test here to be sure that this distincion is parsed correctly.  These
        // same tests must also pass for limits and summations, and for quotients and
        // differences.
        // We test all the possible combinations regarding integrals first.
        // Multiplication:
        input = '∫ A · B'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','int.calculus1'],
                ['App:',['Sym:','times.arith1'],['Var:','A'],['Var:','B']]
            ]
        )
        input = 'B · ∫ A'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','times.arith1'],
                ['Var:','B'],
                ['App:',['Sym:','int.calculus1'],['Var:','A']]
            ]
        )
        // Division:
        input = '∫ A ÷ B'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','int.calculus1'],
                ['App:',['Sym:','divide.arith1'],['Var:','A'],['Var:','B']]
            ]
        )
        input = 'B ÷ ∫ A'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','divide.arith1'],
                ['Var:','B'],
                ['App:',['Sym:','int.calculus1'],['Var:','A']]
            ]
        )
        // Addition:
        input = '∫ A + B'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','plus.arith1'],
                ['App:',['Sym:','int.calculus1'],['Var:','A']],
                ['Var:','B']
            ]
        )
        input = 'B + ∫ A'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','plus.arith1'],
                ['Var:','B'],
                ['App:',['Sym:','int.calculus1'],['Var:','A']]
            ]
        )
        // Subtraction:
        input = '∫ A - B'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','minus.arith1'],
                ['App:',['Sym:','int.calculus1'],['Var:','A']],
                ['Var:','B']
            ]
        )
        input = 'B - ∫ A'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','minus.arith1'],
                ['Var:','B'],
                ['App:',['Sym:','int.calculus1'],['Var:','A']]
            ]
        )
        // Repeat all the previous tests, but now for limits.
        // Multiplication:
        input = 'lim sub ( x → t ) A · B'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','limit.limit1'],
                ['Var:','t'],
                ['Sym:','both_sides.limit1'],
                ['Bind:',
                    ['Sym:','lambda.fns1'],
                    ['Var:','x'],
                    ['App:',['Sym:','times.arith1'],['Var:','A'],['Var:','B']]
                ]
            ]
        )
        input = 'B · lim sub ( x → t ) A'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','times.arith1'],
                ['Var:','B'],
                ['App:',
                    ['Sym:','limit.limit1'],
                    ['Var:','t'],
                    ['Sym:','both_sides.limit1'],
                    ['Bind:',
                        ['Sym:','lambda.fns1'],
                        ['Var:','x'],
                        ['Var:','A']
                    ]
                ]
            ]
        )
        // Division:
        input = 'lim sub ( x → t ) A ÷ B'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','limit.limit1'],
                ['Var:','t'],
                ['Sym:','both_sides.limit1'],
                ['Bind:',
                    ['Sym:','lambda.fns1'],
                    ['Var:','x'],
                    ['App:',['Sym:','divide.arith1'],['Var:','A'],['Var:','B']]
                ]
            ]
        )
        input = 'B ÷ lim sub ( x → t ) A'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','divide.arith1'],
                ['Var:','B'],
                ['App:',
                    ['Sym:','limit.limit1'],
                    ['Var:','t'],
                    ['Sym:','both_sides.limit1'],
                    ['Bind:',
                        ['Sym:','lambda.fns1'],
                        ['Var:','x'],
                        ['Var:','A']
                    ]
                ]
            ]
        )
        // Addition:
        input = 'lim sub ( x → t ) A + B'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','plus.arith1'],
                ['App:',
                    ['Sym:','limit.limit1'],
                    ['Var:','t'],
                    ['Sym:','both_sides.limit1'],
                    ['Bind:',
                        ['Sym:','lambda.fns1'],
                        ['Var:','x'],
                        ['Var:','A']
                    ]
                ],
                ['Var:','B']
            ]
        )
        input = 'B + lim sub ( x → t ) A'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','plus.arith1'],
                ['Var:','B'],
                ['App:',
                    ['Sym:','limit.limit1'],
                    ['Var:','t'],
                    ['Sym:','both_sides.limit1'],
                    ['Bind:',
                        ['Sym:','lambda.fns1'],
                        ['Var:','x'],
                        ['Var:','A']
                    ]
                ]
            ]
        )
        // Subtraction:
        input = 'lim sub ( x → t ) A - B'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','minus.arith1'],
                ['App:',
                    ['Sym:','limit.limit1'],
                    ['Var:','t'],
                    ['Sym:','both_sides.limit1'],
                    ['Bind:',
                        ['Sym:','lambda.fns1'],
                        ['Var:','x'],
                        ['Var:','A']
                    ]
                ],
                ['Var:','B']
            ]
        )
        input = 'B - lim sub ( x → t ) A'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','minus.arith1'],
                ['Var:','B'],
                ['App:',
                    ['Sym:','limit.limit1'],
                    ['Var:','t'],
                    ['Sym:','both_sides.limit1'],
                    ['Bind:',
                        ['Sym:','lambda.fns1'],
                        ['Var:','x'],
                        ['Var:','A']
                    ]
                ]
            ]
        )
    } )

    it( 'should avoid difficult pitfalls', () => {
        // As I encountered bugs in the parser, I created new tests here that
        // showcase those bugs, then leverage those tests to fix the bugs and
        // act as regression preventers in the future.

        // This pitfall is basically just that the minus character is the
        // nonstandard one, not the regular hyphen typed with a keyboard.
        input = 'lim sub ( x → ∞ ) tan sup ( − 1 ) x'.split( ' ' )
        output = G.parse( input )
        expect( output.length ).to.equal( 1 )
        expect( output[0] ).to.eql(
            ['App:',
                ['Sym:','limit.limit1'],
                ['Sym:','infinity.nums1'],
                ['Sym:','both_sides.limit1'],
                ['Bind:',
                    ['Sym:','lambda.fns1'],
                    ['Var:','x'],
                    ['App:',['Sym:','arctan.transc1'],['Var:','x']]
                ]
            ]
        )
    } )

} )

describe( 'WebWorker support', () => {

    let worker
    beforeEach( () => {
        worker = new Worker( 'earley-parser.js', { type: 'module' } )
        worker.onmessage = event => {
            if ( worker.listener ) worker.listener( event )
        }
    } )
    const asyncTestParse = ( name, text, testfunc ) => {
        worker.listener = testfunc
        worker.postMessage( [ 'parse', name, text ] )
    }

    it( 'should work for a small parser', done => {
        // We just test to see if we can set up simple parser and parse some simple
        // text.
        worker.postMessage( [ 'newParser', 'test', 'expr' ] )
        worker.postMessage( [ 'addType', 'test', /\s+/.source,
                              `function () { return null }` ] )
        worker.postMessage( [ 'addType', 'test',
                             /[a-zA-Z_][a-zA-Z_0-9]*/.source ] )
        worker.postMessage( [ 'addType', 'test',
                             /\.[0-9]+|[0-9]+\.?[0-9]*/.source ] )
        worker.postMessage( [ 'addType', 'test',
                             /"(?:[^\\"]|\\\\|\\")*"/.source ] )
        worker.postMessage( [ 'addType', 'test', /[()+/*-]/.source ] )
        worker.postMessage( [ 'addRule', 'test', 'expr', 'c:sum' ] )
        worker.postMessage( [ 'addRule', 'test', 'atomic',
                             't:[a-zA-Z_][a-zA-Z_0-9]*' ] )
        worker.postMessage( [ 'addRule', 'test', 'atomic',
                             't:\\.[0-9]+|[0-9]+\\.?[0-9]*' ] )
        worker.postMessage( [ 'addRule', 'test', 'atomic',
                             't:"(?:[^\\\\"]|\\\\\\\\|\\\\")*"' ] )
        worker.postMessage( [ 'addRule', 'test', 'atomic',
                             [ 't:\\(', 'c:sum', 't:\\)' ] ] )
        worker.postMessage( [ 'addRule', 'test', 'prod',
                             [ 'c:atomic' ] ] )
        worker.postMessage( [ 'addRule', 'test', 'prod',
                             [ 'c:prod', 't:[*\\/]', 'c:atomic' ] ] )
        worker.postMessage( [ 'addRule', 'test', 'sum',
                             [ 'c:prod' ] ] )
        worker.postMessage( [ 'addRule', 'test', 'sum',
                             [ 'c:sum', 't:[+-]', 'c:prod' ] ] )
        asyncTestParse( 'test', 'ident - 7.8/other', result => {
            expect( result.data ).to.eql( [
                [ 'expr',
                    [ 'sum',
                        [ 'sum', [ 'prod', [ 'atomic', 'ident' ] ] ],
                        '-',
                        [ 'prod',
                            [ 'prod', [ 'atomic', '7.8' ] ],
                            '/',
                            [ 'atomic', 'other' ]
                        ]
                    ]
                ]
            ] )
            done()
        } )
    } )

} )
