const TokenType = {
    CRAFT: "CRAFT",
    MAKE: "MAKE",
    MOULD: "MOULD",
    POINT: "POINT",

    IDENTIFIER: "IDENTIFIER",
    INTEGER: "INTEGER",

    PIPE: "PIPE",
    PLUS: "PLUS",
    DOT: "DOT",
    COLON: "COLON",
    ASSIGN: "ASSIGN",

    LPAREN: "LPAREN",
    RPAREN: "RPAREN",
    COMMA: "COMMA",
    SEMICOLON: "SEMICOLON",

    EOF: "EOF"
};

class Token {
    constructor(type, value) {
        this.type = type;
        this.value = value;
    }
}

module.exports = { TokenType, Token };