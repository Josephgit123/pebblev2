const TokenType = {
    // Keywords
    CRAFT: "CRAFT",
    MAKE: "MAKE",
    MOULD: "MOULD",
    HOLD: "HOLD",
    IF: "IF",
    ELSE: "ELSE",
    WHILE: "WHILE",
    TAKE: "TAKE",

    // Special types
    POINT: "POINT",

    // Values
    IDENTIFIER: "IDENTIFIER",
    INTEGER: "INTEGER",

    // Arithmetic
    PLUS: "PLUS",
    MINUS: "MINUS",
    STAR: "STAR",
    SLASH: "SLASH",

    // Comparison
    GREATER: "GREATER",
    LESS: "LESS",
    GREATER_EQUAL: "GREATER_EQUAL",
    LESS_EQUAL: "LESS_EQUAL",
    EQUAL_EQUAL: "EQUAL_EQUAL",
    NOT_EQUAL: "NOT_EQUAL",

    // Assignment
    ASSIGN: "ASSIGN",

    // Symbols
    PIPE: "PIPE",
    DOT: "DOT",
    COLON: "COLON",
    LPAREN: "LPAREN",
    RPAREN: "RPAREN",
    COMMA: "COMMA",
    SEMICOLON: "SEMICOLON",

    // Indentation
    NEWLINE: "NEWLINE",
    INDENT: "INDENT",
    DEDENT: "DEDENT",

    EOF: "EOF"
};

class Token {
    constructor(type, value) {
        this.type = type;
        this.value = value;
    }
}

module.exports = {
    TokenType,
    Token
};