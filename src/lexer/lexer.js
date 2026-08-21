const { TokenType, Token } = require("./token");

class Lexer {
    constructor(source) {
        this.source = source;
        this.position = 0;
        this.tokens = [];

        // Stack of indentation levels.
        // 0 means no indentation.
        this.indentStack = [0];

        // True when we are at the beginning of a line.
        this.atLineStart = true;
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

    // ==================================================
    // INDENTATION
    // ==================================================

    scanIndentation() {
        let tabCount = 0;

        // Count tabs at the beginning of the line.
        while (this.peek() === "\t") {
            this.advance();
            tabCount++;
        }

        // Spaces cannot be used for indentation.
        if (this.peek() === " ") {
            throw new Error(
                "Lexer Error: Spaces cannot be used for indentation. Use tabs."
            );
        }

        const currentIndent =
            this.indentStack[
                this.indentStack.length - 1
            ];

        // Entering a deeper block.
        if (tabCount > currentIndent) {
            this.indentStack.push(tabCount);

            this.tokens.push(
                new Token(
                    TokenType.INDENT,
                    ""
                )
            );
        }

        // Leaving one or more blocks.
        else if (tabCount < currentIndent) {
            while (
                this.indentStack.length > 1 &&
                tabCount <
                    this.indentStack[
                        this.indentStack.length - 1
                    ]
            ) {
                this.indentStack.pop();

                this.tokens.push(
                    new Token(
                        TokenType.DEDENT,
                        ""
                    )
                );
            }

            const finalIndent =
                this.indentStack[
                    this.indentStack.length - 1
                ];

            if (tabCount !== finalIndent) {
                throw new Error(
                    "Lexer Error: Invalid indentation level."
                );
            }
        }

        this.atLineStart = false;
    }

    // ==================================================
    // IDENTIFIERS / KEYWORDS
    // ==================================================

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

            case "take":
                this.tokens.push(
                    new Token(TokenType.TAKE, value)
                );
                break;

            case "point":
                this.tokens.push(
                    new Token(TokenType.POINT, value)
                );
                break;

            case "newline":
                this.tokens.push(
                    new Token(TokenType.NEWLINE, value)
                );
                break;

            default:
                this.tokens.push(
                    new Token(
                        TokenType.IDENTIFIER,
                        value
                    )
                );
                break;
        }
    }

    // ==================================================
    // NUMBERS
    // ==================================================

    scanNumber() {
        let value = "";

        while (this.isDigit(this.peek())) {
            value += this.advance();
        }

        this.tokens.push(
            new Token(
                TokenType.INTEGER,
                value
            )
        );
    }

    // ==================================================
    // SCAN ONE TOKEN
    // ==================================================

    scanToken() {
        const character = this.advance();

        // Newline
        if (character === "\n") {
            this.tokens.push(
                new Token(
                    TokenType.NEWLINE,
                    "\\n"
                )
            );

            this.atLineStart = true;
            return;
        }

        // Ignore carriage return.
        if (character === "\r") {
            return;
        }

        // Start of a line.
        if (this.atLineStart) {
            this.position--;

            this.scanIndentation();

            return;
        }

        // Spaces inside a line are ignored.
        if (character === " ") {
            return;
        }

        // Identifier / keyword.
        if (this.isLetter(character)) {
            this.position--;

            this.scanIdentifier();

            return;
        }

        // Number.
        if (this.isDigit(character)) {
            this.position--;

            this.scanNumber();

            return;
        }

        // ==================================================
        // TWO-CHARACTER OPERATORS
        // ==================================================

        if (
            character === "=" &&
            this.peek() === "="
        ) {
            this.advance();

            this.tokens.push(
                new Token(
                    TokenType.EQUAL_EQUAL,
                    "=="
                )
            );

            return;
        }

        if (
            character === "!" &&
            this.peek() === "="
        ) {
            this.advance();

            this.tokens.push(
                new Token(
                    TokenType.NOT_EQUAL,
                    "!="
                )
            );

            return;
        }

        if (
            character === ">" &&
            this.peek() === "="
        ) {
            this.advance();

            this.tokens.push(
                new Token(
                    TokenType.GREATER_EQUAL,
                    ">="
                )
            );

            return;
        }

        if (
            character === "<" &&
            this.peek() === "="
        ) {
            this.advance();

            this.tokens.push(
                new Token(
                    TokenType.LESS_EQUAL,
                    "<="
                )
            );

            return;
        }

        // ==================================================
        // ONE-CHARACTER OPERATORS
        // ==================================================

        switch (character) {
            case "|":
                this.tokens.push(
                    new Token(
                        TokenType.PIPE,
                        "|"
                    )
                );
                break;

            case "+":
                this.tokens.push(
                    new Token(
                        TokenType.PLUS,
                        "+"
                    )
                );
                break;

            case "-":
                this.tokens.push(
                    new Token(
                        TokenType.MINUS,
                        "-"
                    )
                );
                break;

            case "*":
                this.tokens.push(
                    new Token(
                        TokenType.STAR,
                        "*"
                    )
                );
                break;

            case "/":
                this.tokens.push(
                    new Token(
                        TokenType.SLASH,
                        "/"
                    )
                );
                break;

            case ">":
                this.tokens.push(
                    new Token(
                        TokenType.GREATER,
                        ">"
                    )
                );
                break;

            case "<":
                this.tokens.push(
                    new Token(
                        TokenType.LESS,
                        "<"
                    )
                );
                break;

            case "=":
                this.tokens.push(
                    new Token(
                        TokenType.ASSIGN,
                        "="
                    )
                );
                break;

            case ".":
                this.tokens.push(
                    new Token(
                        TokenType.DOT,
                        "."
                    )
                );
                break;

            case ":":
                this.tokens.push(
                    new Token(
                        TokenType.COLON,
                        ":"
                    )
                );
                break;

            case "(":
                this.tokens.push(
                    new Token(
                        TokenType.LPAREN,
                        "("
                    )
                );
                break;

            case ")":
                this.tokens.push(
                    new Token(
                        TokenType.RPAREN,
                        ")"
                    )
                );
                break;

            case ",":
                this.tokens.push(
                    new Token(
                        TokenType.COMMA,
                        ","
                    )
                );
                break;

            case ";":
                this.tokens.push(
                    new Token(
                        TokenType.SEMICOLON,
                        ";"
                    )
                );
                break;

            default:
                throw new Error(
                    `Lexer Error: Unexpected character '${character}' at position ${this.position - 1}`
                );
        }
    }

    // ==================================================
    // TOKENIZE
    // ==================================================

    tokenize() {
        while (!this.isAtEnd()) {

            if (this.atLineStart) {
                this.scanIndentation();

                if (this.isAtEnd()) {
                    break;
                }
            }

            this.scanToken();
        }

        // Close any remaining indentation levels.
        while (this.indentStack.length > 1) {
            this.indentStack.pop();

            this.tokens.push(
                new Token(
                    TokenType.DEDENT,
                    ""
                )
            );
        }

        this.tokens.push(
            new Token(
                TokenType.EOF,
                ""
            )
        );

        return this.tokens;
    }
}

module.exports = Lexer;