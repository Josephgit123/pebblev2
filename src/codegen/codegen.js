class CodeGenerator {
    constructor() {
        this.output = [];
    }

    emit(line = "") {
        this.output.push(line);
    }

    generate(ast) {
        this.output = [];

        // Data section
        this.emit("section .data");
        this.emit('format db "%lld", 10, 0');
        this.emit("");

        // Code section
        this.emit("section .text");
        this.emit("default rel");
        this.emit("global main");
        this.emit("extern printf");
        this.emit("");

        // Generate user functions
        for (const node of ast.body) {
            if (node.type === "FunctionDeclaration") {
                this.generateFunction(node);
            }
        }

        // Generate program entry point
        this.emit("main:");
        this.emit("    sub rsp, 40");

        for (const node of ast.body) {
            if (node.type === "PrintStatement") {
                this.generatePrintStatement(node);
            }
        }

        this.emit("    add rsp, 40");
        this.emit("    xor eax, eax");
        this.emit("    ret");

        return this.output.join("\n");
    }

    generateFunction(node) {
        this.emit(`${node.name}:`);

        for (const statement of node.body) {
            this.generateStatement(statement);
        }

        this.emit("");
    }

    generateStatement(node) {
        switch (node.type) {
            case "ReturnStatement":
                this.generateExpressionIntoRAX(node.value);
                this.emit("    ret");
                break;

            default:
                throw new Error(
                    `Unsupported statement: ${node.type}`
                );
        }
    }

    generatePrintStatement(node) {
        // Evaluate the expression.
        // The result ends up in RAX.
        this.generateExpressionIntoRAX(node.value);

        // Windows x64 printf arguments:
        // RCX = format string
        // RDX = value
        this.emit("    mov rdx, rax");
        this.emit("    lea rcx, [rel format]");
        this.emit("    call printf");
    }

    generateExpressionIntoRAX(node) {
        switch (node.type) {
            case "IntegerLiteral":
                this.emit(`    mov rax, ${node.value}`);
                break;

            case "Identifier":
                this.generateIdentifierIntoRAX(node);
                break;

            case "BinaryExpression":
                this.generateBinaryExpression(node);
                break;

            case "FunctionCall":
                this.generateFunctionCall(node);
                break;

            default:
                throw new Error(
                    `Unsupported expression: ${node.type}`
                );
        }
    }

    generateIdentifierIntoRAX(node) {
        if (node.name === "a") {
            this.emit("    mov rax, rcx");
            return;
        }

        if (node.name === "b") {
            this.emit("    mov rax, rdx");
            return;
        }

        throw new Error(
            `Unknown identifier: ${node.name}`
        );
    }

    generateBinaryExpression(node) {
        if (node.operator !== "+") {
            throw new Error(
                `Unsupported operator: ${node.operator}`
            );
        }

        // Evaluate left side.
        this.generateExpressionIntoRAX(node.left);

        // Save left side.
        this.emit("    push rax");

        // Evaluate right side.
        this.generateExpressionIntoRAX(node.right);

        // Save right in RCX.
        this.emit("    mov rcx, rax");

        // Restore left to RAX.
        this.emit("    pop rax");

        // RAX = left + right
        this.emit("    add rax, rcx");
    }

    generateFunctionCall(node) {
        if (node.name !== "add") {
            throw new Error(
                `Unknown function: ${node.name}`
            );
        }

        if (node.arguments.length !== 2) {
            throw new Error(
                `Function '${node.name}' expects 2 arguments`
            );
        }

        // First argument -> RCX
        this.generateExpressionIntoRegister(
            node.arguments[0],
            "rcx"
        );

        // Second argument -> RDX
        this.generateExpressionIntoRegister(
            node.arguments[1],
            "rdx"
        );

        this.emit("    call add");
    }

    generateExpressionIntoRegister(node, register) {
        switch (node.type) {
            case "IntegerLiteral":
                this.emit(
                    `    mov ${register}, ${node.value}`
                );
                break;

            default:
                throw new Error(
                    `Cannot place ${node.type} into ${register}`
                );
        }
    }
}

module.exports = CodeGenerator;