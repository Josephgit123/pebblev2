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

    // ---------------------------------------
    // Program
    // ---------------------------------------

    parse() {
        const body = [];

        while (!this.isAtEnd()) {
            if (this.check(TokenType.CRAFT)) {
                body.push(this.functionDeclaration());
            } else {
                body.push(this.statement());
            }
        }

        return {
            type: "Program",
            body
        };
    }

    // ---------------------------------------
    // Function
    // ---------------------------------------

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

        while (
            !this.check(TokenType.RPAREN) &&
            !this.isAtEnd()
        ) {
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

    // ---------------------------------------
    // Statements
    // ---------------------------------------

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

        if (this.match(TokenType.IF)) {
            return this.ifStatement();
        }

        if (this.match(TokenType.WHILE)) {
            return this.whileStatement();
        }

        // Assignment:
        // x = x + 1;
        if (
            this.check(TokenType.IDENTIFIER) &&
            this.tokens[this.current + 1]?.type === TokenType.ASSIGN
        ) {
            return this.assignmentStatement();
        }

        // Expression statement
        const expression = this.expression();

        this.consume(
            TokenType.SEMICOLON,
            "Expected ';' after expression"
        );

        return {
            type: "ExpressionStatement",
            expression
        };
    }

    // ---------------------------------------
    // Variable declaration
    // ---------------------------------------

    variableDeclaration() {
        const name = this.consume(
            TokenType.IDENTIFIER,
            "Expected variable name"
        );

        this.consume(
            TokenType.ASSIGN,
            "Expected '=' after variable name"
        );

        const initializer = this.expression();

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

    // ---------------------------------------
    // Assignment
    // ---------------------------------------

    assignmentStatement() {
        const name = this.consume(
            TokenType.IDENTIFIER,
            "Expected variable name"
        );

        this.consume(
            TokenType.ASSIGN,
            "Expected '='"
        );

        const value = this.expression();

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

    // ---------------------------------------
    // Return
    // ---------------------------------------

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

    // ---------------------------------------
    // Print
    // ---------------------------------------

    printStatement() {
        this.consume(
            TokenType.LPAREN,
            "Expected '(' after 'mould'"
        );

        const value = this.expression();

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

    // ---------------------------------------
    // If / Else
    // ---------------------------------------

    ifStatement() {
        const condition = this.expression();

        this.consume(
            TokenType.LPAREN,
            "Expected '(' before if block"
        );

        const thenBranch = [];

        while (
            !this.check(TokenType.RPAREN) &&
            !this.isAtEnd()
        ) {
            thenBranch.push(this.statement());
        }

        this.consume(
            TokenType.RPAREN,
            "Expected ')' after if block"
        );

        let elseBranch = null;

        if (this.match(TokenType.ELSE)) {
            this.consume(
                TokenType.LPAREN,
                "Expected '(' before else block"
            );

            elseBranch = [];

            while (
                !this.check(TokenType.RPAREN) &&
                !this.isAtEnd()
            ) {
                elseBranch.push(this.statement());
            }

            this.consume(
                TokenType.RPAREN,
                "Expected ')' after else block"
            );
        }

        return {
            type: "IfStatement",
            condition,
            thenBranch,
            elseBranch
        };
    }

    // ---------------------------------------
    // While
    // ---------------------------------------

    whileStatement() {
        const condition = this.expression();

        this.consume(
            TokenType.LPAREN,
            "Expected '(' before while block"
        );

        const body = [];

        while (
            !this.check(TokenType.RPAREN) &&
            !this.isAtEnd()
        ) {
            body.push(this.statement());
        }

        this.consume(
            TokenType.RPAREN,
            "Expected ')' after while block"
        );

        return {
            type: "WhileStatement",
            condition,
            body
        };
    }

    // ---------------------------------------
    // Expression precedence
    // ---------------------------------------

    expression() {
        return this.equality();
    }

    equality() {
        let expression = this.comparison();

        while (
            this.match(
                TokenType.EQUAL_EQUAL,
                TokenType.NOT_EQUAL
            )
        ) {
            const operator = this.previous();
            const right = this.comparison();

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
        let expression = this.term();

        while (
            this.match(
                TokenType.GREATER,
                TokenType.GREATER_EQUAL,
                TokenType.LESS,
                TokenType.LESS_EQUAL
            )
        ) {
            const operator = this.previous();
            const right = this.term();

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
        let expression = this.factor();

        while (
            this.match(
                TokenType.PLUS,
                TokenType.MINUS
            )
        ) {
            const operator = this.previous();
            const right = this.factor();

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
        let expression = this.unary();

        while (
            this.match(
                TokenType.STAR,
                TokenType.SLASH
            )
        ) {
            const operator = this.previous();
            const right = this.unary();

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
            const operator = this.previous();

            return {
                type: "UnaryExpression",
                operator: operator.value,
                right: this.unary()
            };
        }

        return this.primary();
    }

    // ---------------------------------------
    // Primary expressions
    // ---------------------------------------

    primary() {
        if (this.match(TokenType.INTEGER)) {
            return {
                type: "IntegerLiteral",
                value: Number(this.previous().value)
            };
        }

        if (this.match(TokenType.IDENTIFIER)) {
            const identifier = this.previous();

            // Function call
            if (this.match(TokenType.PIPE)) {
                const argumentsList = [];

                if (!this.check(TokenType.PIPE)) {
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
            const expression = this.expression();

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