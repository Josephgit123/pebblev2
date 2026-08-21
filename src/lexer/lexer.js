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

    peekNext() {
        if (this.position + 1 >= this.source.length) {
            return "\0";
        }

        return this.source[this.position + 1];
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
        return (
            this.isLetter(character) ||
            this.isDigit(character)
        );
    }

    scanIdentifier() {
        let value = "";

        while (this.isLetterOrDigit(this.peek())) {
            value += this.advance();
        }

        switch (value) {
            case "craft":
                this.tokens.push(
                    new Token(TokenType.CRAFT, value)
                );
                break;

            case "make":
                this.tokens.push(
                    new Token(TokenType.MAKE, value)
                );
                break;

            case "mould":
                this.tokens.push(
                    new Token(TokenType.MOULD, value)
                );
                break;

            case "hold":
                this.tokens.push(
                    new Token(TokenType.HOLD, value)
                );
                break;

            case "if":
                this.tokens.push(
                    new Token(TokenType.IF, value)
                );
                break;

            case "else":
                this.tokens.push(
                    new Token(TokenType.ELSE, value)
                );
                break;

            case "while":
                this.tokens.push(
                    new Token(TokenType.WHILE, value)
                );
                break;

            case "point":
                this.tokens.push(
                    new Token(TokenType.POINT, value)
                );
                break;

            default:
                this.tokens.push(
                    new Token(TokenType.IDENTIFIER, value)
                );
                break;
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
        if (
            character === " " ||
            character === "\n" ||
            character === "\t" ||
            character === "\r"
        ) {
            return;
        }

        // Identifier / keyword
        if (this.isLetter(character)) {
            this.position--;
            this.scanIdentifier();
            return;
        }

        // Number
        if (this.isDigit(character)) {
            this.position--;
            this.scanNumber();
            return;
        }

        // Two-character operators
        if (character === "=" && this.peek() === "=") {
            this.advance();

            this.tokens.push(
                new Token(TokenType.EQUAL_EQUAL, "==")
            );

            return;
        }

        if (character === "!" && this.peek() === "=") {
            this.advance();

            this.tokens.push(
                new Token(TokenType.NOT_EQUAL, "!=")
            );

            return;
        }

        if (character === ">" && this.peek() === "=") {
            this.advance();

            this.tokens.push(
                new Token(TokenType.GREATER_EQUAL, ">=")
            );

            return;
        }

        if (character === "<" && this.peek() === "=") {
            this.advance();

            this.tokens.push(
                new Token(TokenType.LESS_EQUAL, "<=")
            );

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

            case "-":
                this.tokens.push(
                    new Token(TokenType.MINUS, "-")
                );
                break;

            case "*":
                this.tokens.push(
                    new Token(TokenType.STAR, "*")
                );
                break;

            case "/":
                this.tokens.push(
                    new Token(TokenType.SLASH, "/")
                );
                break;

            case ">":
                this.tokens.push(
                    new Token(TokenType.GREATER, ">")
                );
                break;

            case "<":
                this.tokens.push(
                    new Token(TokenType.LESS, "<")
                );
                break;

            case "=":
                this.tokens.push(
                    new Token(TokenType.ASSIGN, "=")
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

            default:
                throw new Error(
                    `Lexer Error: Unexpected character '${character}' at position ${this.position - 1}`
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