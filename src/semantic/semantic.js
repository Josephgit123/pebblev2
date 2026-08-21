class SemanticAnalyzer {
    constructor() {
        this.functions = new Map();
        this.currentFunction = null;
        this.currentVariables = null;
    }

    analyze(ast) {
        // First pass: find all functions.
        for (const node of ast.body) {
            if (node.type === "FunctionDeclaration") {
                this.declareFunction(node);
            }
        }

        // Second pass: check every part of the program.
        for (const node of ast.body) {
            if (node.type === "FunctionDeclaration") {
                this.checkFunction(node);
            } else {
                this.checkMainStatement(node);
            }
        }

        return ast;
    }

    declareFunction(node) {
        if (this.functions.has(node.name)) {
            throw new Error(
                `Semantic Error: Function '${node.name}' is already declared.`
            );
        }

        this.functions.set(node.name, {
            name: node.name,
            parameterCount: node.parameters.length,
            parameters: node.parameters.map(
                parameter => parameter.name
            )
        });
    }

    checkFunction(node) {
        this.currentFunction = node;
        this.currentVariables = new Set();

        for (const parameter of node.parameters) {
            if (this.currentVariables.has(parameter.name)) {
                throw new Error(
                    `Semantic Error: Duplicate parameter '${parameter.name}'.`
                );
            }

            this.currentVariables.add(parameter.name);
        }

        for (const statement of node.body) {
            this.checkStatement(statement, true);
        }

        this.currentFunction = null;
        this.currentVariables = null;
    }

    checkMainStatement(node) {
        if (!this.currentVariables) {
            this.currentVariables = new Set();
        }

        this.checkStatement(node, false);
    }

    checkStatement(node, insideFunction) {
        switch (node.type) {

            case "VariableDeclaration": {
                if (this.currentVariables.has(node.name)) {
                    throw new Error(
                        `Semantic Error: Variable '${node.name}' is already declared.`
                    );
                }

                const type = this.checkExpression(
                    node.initializer
                );

                if (type !== "int") {
                    throw new Error(
                        `Semantic Error: Variable '${node.name}' must contain an integer.`
                    );
                }

                this.currentVariables.add(node.name);
                break;
            }

            case "Assignment": {
                if (!this.currentVariables.has(node.name)) {
                    throw new Error(
                        `Semantic Error: Undefined variable '${node.name}'.`
                    );
                }

                const type = this.checkExpression(node.value);

                if (type !== "int") {
                    throw new Error(
                        `Semantic Error: Assignment to '${node.name}' requires an integer.`
                    );
                }

                break;
            }

            case "ReturnStatement": {
                if (!insideFunction) {
                    throw new Error(
                        "Semantic Error: 'make' can only be used inside a function."
                    );
                }

                const type = this.checkExpression(
                    node.value
                );

                if (type !== "int") {
                    throw new Error(
                        "Semantic Error: 'make' must return an integer."
                    );
                }

                break;
            }

            case "PrintStatement": {
                const type = this.checkExpression(
                    node.value
                );

                if (type !== "int" && type !== "bool") {
                    throw new Error(
                        "Semantic Error: 'mould' can only print integers or booleans."
                    );
                }

                break;
            }

            case "ExpressionStatement":
                this.checkExpression(
                    node.expression
                );
                break;

            case "IfStatement": {
                const conditionType =
                    this.checkExpression(
                        node.condition
                    );

                if (conditionType !== "bool") {
                    throw new Error(
                        "Semantic Error: 'if' condition must be a comparison."
                    );
                }

                for (const statement of node.thenBranch) {
                    this.checkStatement(
                        statement,
                        insideFunction
                    );
                }

                if (node.elseBranch) {
                    for (const statement of node.elseBranch) {
                        this.checkStatement(
                            statement,
                            insideFunction
                        );
                    }
                }

                break;
            }

            case "WhileStatement": {
                const conditionType =
                    this.checkExpression(
                        node.condition
                    );

                if (conditionType !== "bool") {
                    throw new Error(
                        "Semantic Error: 'while' condition must be a comparison."
                    );
                }

                for (const statement of node.body) {
                    this.checkStatement(
                        statement,
                        insideFunction
                    );
                }

                break;
            }

            default:
                throw new Error(
                    `Semantic Error: Unsupported statement '${node.type}'.`
                );
        }
    }

    checkExpression(node) {
        switch (node.type) {

            case "IntegerLiteral":
                return "int";

            case "Identifier":
                if (!this.currentVariables.has(node.name)) {
                    throw new Error(
                        `Semantic Error: Undefined identifier '${node.name}'.`
                    );
                }

                return "int";

            case "UnaryExpression": {
                if (node.operator !== "-") {
                    throw new Error(
                        `Semantic Error: Unsupported unary operator '${node.operator}'.`
                    );
                }

                const type =
                    this.checkExpression(node.right);

                if (type !== "int") {
                    throw new Error(
                        "Semantic Error: Unary '-' requires an integer."
                    );
                }

                return "int";
            }

            case "BinaryExpression": {
                const leftType =
                    this.checkExpression(node.left);

                const rightType =
                    this.checkExpression(node.right);

                const arithmeticOperators = [
                    "+",
                    "-",
                    "*",
                    "/"
                ];

                const comparisonOperators = [
                    ">",
                    ">=",
                    "<",
                    "<=",
                    "==",
                    "!="
                ];

                if (
                    arithmeticOperators.includes(
                        node.operator
                    )
                ) {
                    if (
                        leftType !== "int" ||
                        rightType !== "int"
                    ) {
                        throw new Error(
                            `Semantic Error: Operator '${node.operator}' requires two integers.`
                        );
                    }

                    return "int";
                }

                if (
                    comparisonOperators.includes(
                        node.operator
                    )
                ) {
                    if (
                        leftType !== "int" ||
                        rightType !== "int"
                    ) {
                        throw new Error(
                            `Semantic Error: Comparison '${node.operator}' requires two integers.`
                        );
                    }

                    return "bool";
                }

                throw new Error(
                    `Semantic Error: Unsupported operator '${node.operator}'.`
                );
            }

            case "FunctionCall":
                return this.checkFunctionCall(node);

            default:
                throw new Error(
                    `Semantic Error: Unsupported expression '${node.type}'.`
                );
        }
    }

    checkFunctionCall(node) {
        const functionInfo =
            this.functions.get(node.name);

        if (!functionInfo) {
            throw new Error(
                `Semantic Error: Function '${node.name}' is not defined.`
            );
        }

        if (
            node.arguments.length !==
            functionInfo.parameterCount
        ) {
            throw new Error(
                `Semantic Error: Function '${node.name}' expects ` +
                `${functionInfo.parameterCount} arguments, ` +
                `but ${node.arguments.length} were provided.`
            );
        }

        for (const argument of node.arguments) {
            const type =
                this.checkExpression(argument);

            if (type !== "int") {
                throw new Error(
                    "Semantic Error: Function arguments must be integers."
                );
            }
        }

        return "int";
    }
}

module.exports = SemanticAnalyzer;