const { TokenType, Token } = require("./token");

class Lexer {
    constructor(source) {
        this.source = source;
        this.position = 0;
        this.tokens = [];
    }

    isAtEnd() {
        return this.position >= this.source.length;
    }

    peek() {
        if (this.isAtEnd()) {
            return "\0";
        }

        return this.source[this.position];
    }

    advance() {
        const character = this.peek();
        this.position++;
        return character;
    }

    isLetter(character) {
        return /[A-Za-z_]/.test(character);
    }

    isDigit(character) {
        return /[0-9]/.test(character);
    }

    isLetterOrDigit(character) {
        return this.isLetter(character) || this.isDigit(character);
    }

   scanIdentifier() {
    let value = "";

    while (this.isLetterOrDigit(this.peek())) {
        value += this.advance();
    }

    if (value === "craft") {
        this.tokens.push(
            new Token(TokenType.CRAFT, value)
        );
    } else if (value === "make") {
        this.tokens.push(
            new Token(TokenType.MAKE, value)
        );
    } else if (value === "mould") {
        this.tokens.push(
            new Token(TokenType.MOULD, value)
        );
    } else if (value === "point") {
        this.tokens.push(
            new Token(TokenType.POINT, value)
        );
    } else {
        this.tokens.push(
            new Token(TokenType.IDENTIFIER, value)
        );
    }
}

    scanNumber() {
        let value = "";

        while (this.isDigit(this.peek())) {
            value += this.advance();
        }

        this.tokens.push(
            new Token(TokenType.INTEGER, value)
        );
    }

    scanToken() {
        const character = this.advance();

        // Ignore whitespace
        if (character === " " ||
            character === "\n" ||
            character === "\t" ||
            character === "\r") {
            return;
        }

        // Identifiers and keywords
        if (this.isLetter(character)) {
            this.position--;
            this.scanIdentifier();
            return;
        }

        // Numbers
        if (this.isDigit(character)) {
            this.position--;
            this.scanNumber();
            return;
        }

        switch (character) {

            case "|":
                this.tokens.push(
                    new Token(TokenType.PIPE, "|")
                );
                break;

            case "+":
                this.tokens.push(
                    new Token(TokenType.PLUS, "+")
                );
                break;

            case "(":
                this.tokens.push(
                    new Token(TokenType.LPAREN, "(")
                );
                break;

            case ")":
                this.tokens.push(
                    new Token(TokenType.RPAREN, ")")
                );
                break;

            case ",":
                this.tokens.push(
                    new Token(TokenType.COMMA, ",")
                );
                break;

           case ";":
    this.tokens.push(
        new Token(TokenType.SEMICOLON, ";")
    );
    break;

case ".":
    this.tokens.push(
        new Token(TokenType.DOT, ".")
    );
    break;

case ":":
    this.tokens.push(
        new Token(TokenType.COLON, ":")
    );
    break;

case "=":
    this.tokens.push(
        new Token(TokenType.ASSIGN, "=")
    );
    break;

            default:
                throw new Error(
                    `Unexpected character: ${character}`
                );
        }
    }

    tokenize() {
        while (!this.isAtEnd()) {
            this.scanToken();
        }

        this.tokens.push(
            new Token(TokenType.EOF, "")
        );

        return this.tokens;
    }
}

module.exports = Lexer;