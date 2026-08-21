const { TokenType } = require("../lexer/token");

class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.current = 0;
    }

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
            `Parser Error: ${message}. Found '${token.value}'.`
        );
    }

    // ==================================================
    // PROGRAM
    // ==================================================

    parse() {
        const body = [];

        while (!this.isAtEnd()) {
            // Ignore blank lines.
            if (this.match(TokenType.NEWLINE)) {
                continue;
            }

            if (this.check(TokenType.CRAFT)) {
                body.push(
                    this.functionDeclaration()
                );
            } else {
                body.push(
                    this.statement()
                );
            }
        }

        return {
            type: "Program",
            body
        };
    }

    // ==================================================
    // FUNCTION
    // ==================================================

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
                const parameter =
                    this.consume(
                        TokenType.IDENTIFIER,
                        "Expected parameter name"
                    );

                parameters.push({
                    type: "Identifier",
                    name: parameter.value
                });
            } while (
                this.match(TokenType.COMMA)
            );
        }

        this.consume(
            TokenType.PIPE,
            "Expected '|' after parameters"
        );

        // Function declaration must end its line.
        this.consume(
            TokenType.NEWLINE,
            "Expected newline after function declaration"
        );

        // Function body must be indented.
        this.consume(
            TokenType.INDENT,
            "Expected indentation before function body"
        );

        const body = [];

        while (
            !this.check(TokenType.DEDENT) &&
            !this.isAtEnd()
        ) {
            if (this.match(TokenType.NEWLINE)) {
                continue;
            }

            body.push(
                this.statement()
            );

            this.match(TokenType.NEWLINE);
        }

        this.consume(
            TokenType.DEDENT,
            "Expected end of function body"
        );

        return {
            type: "FunctionDeclaration",
            name: name.value,
            parameters,
            body
        };
    }

    // ==================================================
    // STATEMENTS
    // ==================================================

    statement() {
        if (this.match(TokenType.MAKE)) {
            return this.returnStatement();
        }

        if (this.match(TokenType.MOULD)) {
            return this.printStatement();
        }

        if (this.match(TokenType.HOLD)) {
            return this.variableDeclaration();
        }

        if (this.match(TokenType.TAKE)) {
            return this.takeStatement();
        }

        if (this.match(TokenType.IF)) {
            return this.ifStatement();
        }

        if (this.match(TokenType.WHILE)) {
            return this.whileStatement();
        }

        // Assignment
        if (
            this.check(TokenType.IDENTIFIER) &&
            this.tokens[this.current + 1]?.type ===
                TokenType.ASSIGN
        ) {
            return this.assignmentStatement();
        }

        const expression =
            this.expression();

        this.consume(
            TokenType.SEMICOLON,
            "Expected ';' after expression"
        );

        return {
            type: "ExpressionStatement",
            expression
        };
    }

    // ==================================================
    // TAKE
    // ==================================================

    takeStatement() {
        this.consume(
            TokenType.LPAREN,
            "Expected '(' after 'take'"
        );

        const variable =
            this.consume(
                TokenType.IDENTIFIER,
                "Expected variable name inside take"
            );

        this.consume(
            TokenType.RPAREN,
            "Expected ')' after take variable"
        );

        this.consume(
            TokenType.SEMICOLON,
            "Expected ';' after take statement"
        );

        return {
            type: "InputStatement",
            name: variable.value
        };
    }

    // ==================================================
    // VARIABLE DECLARATION
    // ==================================================

    variableDeclaration() {
        const name =
            this.consume(
                TokenType.IDENTIFIER,
                "Expected variable name"
            );

        this.consume(
            TokenType.ASSIGN,
            "Expected '=' after variable name"
        );

        const initializer =
            this.expression();

        this.consume(
            TokenType.SEMICOLON,
            "Expected ';' after variable declaration"
        );

        return {
            type: "VariableDeclaration",
            name: name.value,
            initializer
        };
    }

    // ==================================================
    // ASSIGNMENT
    // ==================================================

    assignmentStatement() {
        const name =
            this.consume(
                TokenType.IDENTIFIER,
                "Expected variable name"
            );

        this.consume(
            TokenType.ASSIGN,
            "Expected '='"
        );

        const value =
            this.expression();

        this.consume(
            TokenType.SEMICOLON,
            "Expected ';' after assignment"
        );

        return {
            type: "Assignment",
            name: name.value,
            value
        };
    }

    // ==================================================
    // RETURN
    // ==================================================

    returnStatement() {
        const value =
            this.expression();

        this.consume(
            TokenType.SEMICOLON,
            "Expected ';' after return expression"
        );

        return {
            type: "ReturnStatement",
            value
        };
    }

    // ==================================================
    // PRINT
    // ==================================================

    printStatement() {
        this.consume(
            TokenType.LPAREN,
            "Expected '(' after 'mould'"
        );

        const value =
            this.expression();

        this.consume(
            TokenType.RPAREN,
            "Expected ')' after mould expression"
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

    // ==================================================
    // IF / ELSE
    // ==================================================

    ifStatement() {
        const condition =
            this.expression();

        this.consume(
            TokenType.NEWLINE,
            "Expected newline after if condition"
        );

        this.consume(
            TokenType.INDENT,
            "Expected indentation after if condition"
        );

        const thenBranch = [];

        while (
            !this.check(TokenType.DEDENT) &&
            !this.isAtEnd()
        ) {
            if (this.match(TokenType.NEWLINE)) {
                continue;
            }

            thenBranch.push(
                this.statement()
            );

            this.match(TokenType.NEWLINE);
        }

        this.consume(
            TokenType.DEDENT,
            "Expected end of if block"
        );

        let elseBranch = null;

        this.match(TokenType.NEWLINE);

        if (this.match(TokenType.ELSE)) {
            this.consume(
                TokenType.NEWLINE,
                "Expected newline after else"
            );

            this.consume(
                TokenType.INDENT,
                "Expected indentation after else"
            );

            elseBranch = [];

            while (
                !this.check(TokenType.DEDENT) &&
                !this.isAtEnd()
            ) {
                if (this.match(TokenType.NEWLINE)) {
                    continue;
                }

                elseBranch.push(
                    this.statement()
                );

                this.match(TokenType.NEWLINE);
            }

            this.consume(
                TokenType.DEDENT,
                "Expected end of else block"
            );
        }

        return {
            type: "IfStatement",
            condition,
            thenBranch,
            elseBranch
        };
    }

    // ==================================================
    // WHILE
    // ==================================================

    whileStatement() {
        const condition =
            this.expression();

        this.consume(
            TokenType.NEWLINE,
            "Expected newline after while condition"
        );

        this.consume(
            TokenType.INDENT,
            "Expected indentation after while condition"
        );

        const body = [];

        while (
            !this.check(TokenType.DEDENT) &&
            !this.isAtEnd()
        ) {
            if (this.match(TokenType.NEWLINE)) {
                continue;
            }

            body.push(
                this.statement()
            );

            this.match(TokenType.NEWLINE);
        }

        this.consume(
            TokenType.DEDENT,
            "Expected end of while block"
        );

        return {
            type: "WhileStatement",
            condition,
            body
        };
    }

    // ==================================================
    // EXPRESSIONS
    // ==================================================

    expression() {
        return this.equality();
    }

    equality() {
        let expression =
            this.comparison();

        while (
            this.match(
                TokenType.EQUAL_EQUAL,
                TokenType.NOT_EQUAL
            )
        ) {
            const operator =
                this.previous();

            const right =
                this.comparison();

            expression = {
                type: "BinaryExpression",
                left: expression,
                operator: operator.value,
                right
            };
        }

        return expression;
    }

    comparison() {
        let expression =
            this.term();

        while (
            this.match(
                TokenType.GREATER,
                TokenType.GREATER_EQUAL,
                TokenType.LESS,
                TokenType.LESS_EQUAL
            )
        ) {
            const operator =
                this.previous();

            const right =
                this.term();

            expression = {
                type: "BinaryExpression",
                left: expression,
                operator: operator.value,
                right
            };
        }

        return expression;
    }

    term() {
        let expression =
            this.factor();

        while (
            this.match(
                TokenType.PLUS,
                TokenType.MINUS
            )
        ) {
            const operator =
                this.previous();

            const right =
                this.factor();

            expression = {
                type: "BinaryExpression",
                left: expression,
                operator: operator.value,
                right
            };
        }

        return expression;
    }

    factor() {
        let expression =
            this.unary();

        while (
            this.match(
                TokenType.STAR,
                TokenType.SLASH
            )
        ) {
            const operator =
                this.previous();

            const right =
                this.unary();

            expression = {
                type: "BinaryExpression",
                left: expression,
                operator: operator.value,
                right
            };
        }

        return expression;
    }

    unary() {
        if (this.match(TokenType.MINUS)) {
            const operator =
                this.previous();

            return {
                type: "UnaryExpression",
                operator: operator.value,
                right: this.unary()
            };
        }

        return this.primary();
    }

    // ==================================================
    // PRIMARY
    // ==================================================

    primary() {
        if (this.match(TokenType.INTEGER)) {
            return {
                type: "IntegerLiteral",
                value: Number(
                    this.previous().value
                )
            };
        }

        if (this.match(TokenType.IDENTIFIER)) {
            const identifier =
                this.previous();

            // Function call
            if (this.match(TokenType.PIPE)) {
                const argumentsList = [];

                if (
                    !this.check(TokenType.PIPE)
                ) {
                    do {
                        argumentsList.push(
                            this.expression()
                        );
                    } while (
                        this.match(TokenType.COMMA)
                    );
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

        if (this.match(TokenType.LPAREN)) {
            const expression =
                this.expression();

            this.consume(
                TokenType.RPAREN,
                "Expected ')' after expression"
            );

            return expression;
        }

        throw new Error(
            `Parser Error: Unexpected token '${this.peek().value}'.`
        );
    }
}

module.exports = Parser;