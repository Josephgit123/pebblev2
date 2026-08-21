class SemanticAnalyzer {
    constructor() {
        this.functions = new Map();
        this.currentFunction = null;
    }

    analyze(ast) {
        // First pass:
        // collect all function declarations.
        for (const node of ast.body) {
            if (node.type === "FunctionDeclaration") {
                this.declareFunction(node);
            }
        }

        // Second pass:
        // check everything.
        for (const node of ast.body) {
            this.checkNode(node);
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

    checkNode(node) {
        switch (node.type) {
            case "FunctionDeclaration":
                this.checkFunction(node);
                break;

            case "PrintStatement":
                this.checkExpression(node.value);
                break;

            default:
                throw new Error(
                    `Semantic Error: Unsupported node '${node.type}'.`
                );
        }
    }

    checkFunction(node) {
        this.currentFunction = node;

        const localNames = new Set();

        // Register parameters
        for (const parameter of node.parameters) {
            if (localNames.has(parameter.name)) {
                throw new Error(
                    `Semantic Error: Parameter '${parameter.name}' is declared more than once.`
                );
            }

            localNames.add(parameter.name);
        }

        for (const statement of node.body) {
            if (statement.type === "ReturnStatement") {
                this.checkExpression(
                    statement.value,
                    localNames
                );
            } else {
                throw new Error(
                    `Semantic Error: Unsupported statement '${statement.type}'.`
                );
            }
        }

        this.currentFunction = null;
    }

    checkExpression(node, localNames = new Set()) {
        switch (node.type) {
            case "IntegerLiteral":
                return "int";

            case "Identifier":
                if (!localNames.has(node.name)) {
                    throw new Error(
                        `Semantic Error: Undefined identifier '${node.name}'` +
                        this.getFunctionContext()
                    );
                }

                return "int";

            case "BinaryExpression": {
                const leftType = this.checkExpression(
                    node.left,
                    localNames
                );

                const rightType = this.checkExpression(
                    node.right,
                    localNames
                );

                if (node.operator === "+") {
                    if (leftType !== "int" || rightType !== "int") {
                        throw new Error(
                            `Semantic Error: Operator '+' requires two integers.`
                        );
                    }

                    return "int";
                }

                throw new Error(
                    `Semantic Error: Unsupported operator '${node.operator}'.`
                );
            }

            case "FunctionCall":
                return this.checkFunctionCall(
                    node,
                    localNames
                );

            default:
                throw new Error(
                    `Semantic Error: Unsupported expression '${node.type}'.`
                );
        }
    }

    checkFunctionCall(node, localNames) {
        const functionInfo = this.functions.get(node.name);

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
            const argumentType = this.checkExpression(
                argument,
                localNames
            );

            if (argumentType !== "int") {
                throw new Error(
                    `Semantic Error: Function argument must be an integer.`
                );
            }
        }

        return "int";
    }

    getFunctionContext() {
        if (!this.currentFunction) {
            return "";
        }

        return ` in function '${this.currentFunction.name}'`;
    }
}

module.exports = SemanticAnalyzer;