const { TokenType } = require("../lexer/token");

class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.current = 0;
    }

    // -------------------------
    // Utility functions
    // -------------------------

    peek() {
        return this.tokens[this.current];
    }

    previous() {
        return this.tokens[this.current - 1];
    }

    isAtEnd() {
        return this.peek().type === TokenType.EOF;
    }

    advance() {
        if (!this.isAtEnd()) {
            this.current++;
        }

        return this.previous();
    }

    check(type) {
        if (this.isAtEnd()) {
            return type === TokenType.EOF;
        }

        return this.peek().type === type;
    }

    match(...types) {
        for (const type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }

        return false;
    }

    consume(type, message) {
        if (this.check(type)) {
            return this.advance();
        }

        const token = this.peek();

        throw new Error(
            `Parser error: ${message}. Found '${token.value}'.`
        );
    }

    // -------------------------
    // Program
    // -------------------------

    parse() {
        const declarations = [];

        while (!this.isAtEnd()) {
            if (this.check(TokenType.CRAFT)) {
                declarations.push(this.functionDeclaration());
            } else {
                declarations.push(this.statement());
            }
        }

        return {
            type: "Program",
            body: declarations
        };
    }

    // -------------------------
    // Function declaration
    // -------------------------

    functionDeclaration() {
        this.consume(
            TokenType.CRAFT,
            "Expected 'craft'"
        );

        const name = this.consume(
            TokenType.IDENTIFIER,
            "Expected function name"
        );

        this.consume(
            TokenType.PIPE,
            "Expected '|' after function name"
        );

        const parameters = [];

        if (!this.check(TokenType.PIPE)) {
            do {
                const parameter = this.consume(
                    TokenType.IDENTIFIER,
                    "Expected parameter name"
                );

                parameters.push({
                    type: "Identifier",
                    name: parameter.value
                });

            } while (this.match(TokenType.COMMA));
        }

        this.consume(
            TokenType.PIPE,
            "Expected '|' after parameters"
        );

        this.consume(
            TokenType.LPAREN,
            "Expected '(' before function body"
        );

        const body = [];

        while (!this.check(TokenType.RPAREN) && !this.isAtEnd()) {
            body.push(this.statement());
        }

        this.consume(
            TokenType.RPAREN,
            "Expected ')' after function body"
        );

        return {
            type: "FunctionDeclaration",
            name: name.value,
            parameters,
            body
        };
    }

    // -------------------------
    // Statements
    // -------------------------

    statement() {
        if (this.match(TokenType.MAKE)) {
            return this.returnStatement();
        }

        if (this.match(TokenType.MOULD)) {
            return this.printStatement();
        }

        throw new Error(
            `Parser error: Unexpected token '${this.peek().value}'.`
        );
    }

    // -------------------------
    // make statement
    // -------------------------

    returnStatement() {
        const value = this.expression();

        this.consume(
            TokenType.SEMICOLON,
            "Expected ';' after return expression"
        );

        return {
            type: "ReturnStatement",
            value
        };
    }

    // -------------------------
    // mould statement
    // -------------------------

    printStatement() {
        this.consume(
            TokenType.LPAREN,
            "Expected '(' after 'mould'"
        );

        const value = this.expression();

        this.consume(
            TokenType.RPAREN,
            "Expected ')' after expression"
        );

        this.consume(
            TokenType.SEMICOLON,
            "Expected ';' after mould statement"
        );

        return {
            type: "PrintStatement",
            value
        };
    }

    // -------------------------
    // Expressions
    // -------------------------

    expression() {
        return this.addition();
    }

    addition() {
        let expression = this.primary();

        while (this.match(TokenType.PLUS)) {
            const operator = this.previous();
            const right = this.primary();

            expression = {
                type: "BinaryExpression",
                left: expression,
                operator: operator.value,
                right
            };
        }

        return expression;
    }

    // -------------------------
    // Primary expressions
    // -------------------------

    primary() {
        if (this.match(TokenType.INTEGER)) {
            return {
                type: "IntegerLiteral",
                value: Number(this.previous().value)
            };
        }

        if (this.match(TokenType.IDENTIFIER)) {
            const identifier = this.previous();

            // Function call:
            // add | 10, 20 |
            if (this.match(TokenType.PIPE)) {
                const argumentsList = [];

                if (!this.check(TokenType.PIPE)) {
                    do {
                        argumentsList.push(
                            this.expression()
                        );
                    } while (this.match(TokenType.COMMA));
                }

                this.consume(
                    TokenType.PIPE,
                    "Expected '|' after function arguments"
                );

                return {
                    type: "FunctionCall",
                    name: identifier.value,
                    arguments: argumentsList
                };
            }

            return {
                type: "Identifier",
                name: identifier.value
            };
        }

        throw new Error(
            `Parser error: Unexpected token '${this.peek().value}'.`
        );
    }
}

module.exports = Parser;