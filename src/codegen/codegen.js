class CodeGenerator {
    constructor() {
        this.output = [];
        this.labelCounter = 0;
        this.variables = new Map();
    }

    // ==========================================
    // HELPER METHODS
    // ==========================================

    emit(line = "") {
        this.output.push(line);
    }

    newLabel(prefix) {
        const label = `${prefix}_${this.labelCounter}`;
        this.labelCounter++;
        return label;
    }

    // ==========================================
    // START CODE GENERATION
    // ==========================================

    generate(ast) {
        this.output = [];
        this.labelCounter = 0;

        // -----------------------------
        // DATA SECTION
        // -----------------------------

        this.emit("section .data");

        // Used by mould()
        this.emit('format db "%lld", 10, 0');

        // Used by take()
        this.emit('input_format db "%lld", 0');

        this.emit("");

        // -----------------------------
        // TEXT SECTION
        // -----------------------------

        this.emit("section .text");
        this.emit("default rel");
        this.emit("global main");

        // C library functions
        this.emit("extern printf");
        this.emit("extern scanf");

        this.emit("");

        // Generate user functions first
        for (const node of ast.body) {
            if (node.type === "FunctionDeclaration") {
                this.generateFunction(node);
            }
        }

        // Generate main program statements
        const mainStatements = ast.body.filter(
            node => node.type !== "FunctionDeclaration"
        );

        this.generateMain(mainStatements);

        return this.output.join("\n");
    }

    // ==========================================
    // VARIABLE MANAGEMENT
    // ==========================================

    collectVariables(statements, parameters = []) {
        const names = [];

        // Add function parameters
        for (const parameter of parameters) {
            if (!names.includes(parameter.name)) {
                names.push(parameter.name);
            }
        }

        const visit = statement => {
            // hold x = ...
            if (statement.type === "VariableDeclaration") {
                if (!names.includes(statement.name)) {
                    names.push(statement.name);
                }
            }

            // Variables inside if
            if (statement.type === "IfStatement") {
                for (const child of statement.thenBranch) {
                    visit(child);
                }

                if (statement.elseBranch) {
                    for (const child of statement.elseBranch) {
                        visit(child);
                    }
                }
            }

            // Variables inside while
            if (statement.type === "WhileStatement") {
                for (const child of statement.body) {
                    visit(child);
                }
            }
        };

        for (const statement of statements) {
            visit(statement);
        }

        return names;
    }

    createVariableMap(names) {
        this.variables.clear();

        names.forEach((name, index) => {
            const offset = (index + 1) * 8;
            this.variables.set(name, offset);
        });
    }

    calculateFrameSize(variableCount) {
        const variableBytes = variableCount * 8;

        // Round up to a multiple of 16
        const alignedVariableBytes =
            Math.ceil(variableBytes / 16) * 16;

        // 32 bytes shadow space + variables
        return 32 + alignedVariableBytes;
    }

    // ==========================================
    // FUNCTION GENERATION
    // ==========================================

    generateFunction(node) {
        const variableNames = this.collectVariables(
            node.body,
            node.parameters
        );

        this.createVariableMap(variableNames);

        const frameSize = this.calculateFrameSize(
            variableNames.length
        );

        this.emit(`${node.name}:`);

        // Function setup
        this.emit("    push rbp");
        this.emit("    mov rbp, rsp");
        this.emit(`    sub rsp, ${frameSize}`);

        // Windows x64 argument registers
        const parameterRegisters = [
            "rcx",
            "rdx",
            "r8",
            "r9"
        ];

        // Store parameters in local variable slots
        node.parameters.forEach((parameter, index) => {
            const offset = this.variables.get(parameter.name);

            if (offset === undefined) {
                throw new Error(
                    `Code Generator: unknown parameter '${parameter.name}'.`
                );
            }

            this.emit(
                `    mov [rbp - ${offset}], ${parameterRegisters[index]}`
            );
        });

        // Function body
        for (const statement of node.body) {
            this.generateStatement(statement);
        }

        // Default return value = 0
        this.emit("    xor eax, eax");

        this.generateFunctionEpilogue();

        this.emit("");
    }

    // ==========================================
    // MAIN
    // ==========================================

    generateMain(statements) {
        const variableNames =
            this.collectVariables(statements);

        this.createVariableMap(variableNames);

        const frameSize =
            this.calculateFrameSize(variableNames.length);

        this.emit("main:");

        this.emit("    push rbp");
        this.emit("    mov rbp, rsp");
        this.emit(`    sub rsp, ${frameSize}`);

        for (const statement of statements) {
            this.generateStatement(statement);
        }

        // return 0
        this.emit("    xor eax, eax");

        this.generateFunctionEpilogue();
    }

    // ==========================================
    // FUNCTION END
    // ==========================================

    generateFunctionEpilogue() {
        this.emit("    mov rsp, rbp");
        this.emit("    pop rbp");
        this.emit("    ret");
    }

    // ==========================================
    // STATEMENTS
    // ==========================================

    generateStatement(node) {
        switch (node.type) {
            case "VariableDeclaration":
                this.generateVariableDeclaration(node);
                break;

            case "Assignment":
                this.generateAssignment(node);
                break;

            // NEW: take(x)
            case "InputStatement":
                this.generateTakeStatement(node);
                break;

            case "ReturnStatement":
                this.generateReturnStatement(node);
                break;

            case "PrintStatement":
                this.generatePrintStatement(node);
                break;

            case "IfStatement":
                this.generateIfStatement(node);
                break;

            case "WhileStatement":
                this.generateWhileStatement(node);
                break;

            case "ExpressionStatement":
                this.generateExpressionIntoRAX(
                    node.expression
                );
                break;

            default:
                throw new Error(
                    `Code Generator: unsupported statement '${node.type}'.`
                );
        }
    }

    // ==========================================
    // VARIABLE DECLARATION
    // ==========================================

    generateVariableDeclaration(node) {
        // Example:
        // hold x = 10;

        this.generateExpressionIntoRAX(
            node.initializer
        );

        const offset = this.variables.get(node.name);

        if (offset === undefined) {
            throw new Error(
                `Code Generator: unknown variable '${node.name}'.`
            );
        }

        this.emit(
            `    mov [rbp - ${offset}], rax`
        );
    }

    // ==========================================
    // ASSIGNMENT
    // ==========================================

    generateAssignment(node) {
        // Example:
        // x = x + 1;

        this.generateExpressionIntoRAX(
            node.value
        );

        const offset = this.variables.get(node.name);

        if (offset === undefined) {
            throw new Error(
                `Code Generator: unknown variable '${node.name}'.`
            );
        }

        this.emit(
            `    mov [rbp - ${offset}], rax`
        );
    }

    // ==========================================
    // TAKE INPUT
    // ==========================================

    generateTakeStatement(node) {
        // Example:
        // take(x);

        const offset = this.variables.get(node.name);

        if (offset === undefined) {
            throw new Error(
                `Code Generator: unknown variable '${node.name}'.`
            );
        }

        // scanf("%lld", &x)

        // RDX = address of x
        this.emit(
            `    lea rdx, [rbp - ${offset}]`
        );

        // RCX = "%lld"
        this.emit(
            "    lea rcx, [rel input_format]"
        );

        // Windows x64 requires shadow space
        this.emit("    sub rsp, 32");

        // Call scanf
        this.emit("    call scanf");

        // Restore stack
        this.emit("    add rsp, 32");
    }

    // ==========================================
    // RETURN
    // ==========================================

    generateReturnStatement(node) {
        // Result goes into RAX
        this.generateExpressionIntoRAX(
            node.value
        );

        this.generateFunctionEpilogue();
    }

    // ==========================================
    // MOULD / PRINT
    // ==========================================

    generatePrintStatement(node) {
        // Evaluate expression
        this.generateExpressionIntoRAX(
            node.value
        );

        // printf("%lld\n", value)

        // RDX = value
        this.emit("    mov rdx, rax");

        // RCX = format string
        this.emit(
            "    lea rcx, [rel format]"
        );

        // Shadow space
        this.emit("    sub rsp, 32");

        this.emit("    call printf");

        // Restore stack
        this.emit("    add rsp, 32");
    }

    // ==========================================
    // IF / ELSE
    // ==========================================

    generateIfStatement(node) {
        const elseLabel =
            this.newLabel("else");

        const endLabel =
            this.newLabel("endif");

        // Evaluate condition
        this.generateExpressionIntoRAX(
            node.condition
        );

        // If RAX == 0 -> false
        this.emit("    cmp rax, 0");
        this.emit(`    je ${elseLabel}`);

        // THEN BLOCK
        for (const statement of node.thenBranch) {
            this.generateStatement(statement);
        }

        this.emit(`    jmp ${endLabel}`);

        // ELSE BLOCK
        this.emit(`${elseLabel}:`);

        if (node.elseBranch) {
            for (const statement of node.elseBranch) {
                this.generateStatement(statement);
            }
        }

        // END IF
        this.emit(`${endLabel}:`);
    }

    // ==========================================
    // WHILE LOOP
    // ==========================================

    generateWhileStatement(node) {
        const startLabel =
            this.newLabel("while_start");

        const endLabel =
            this.newLabel("while_end");

        // Start loop
        this.emit(`${startLabel}:`);

        // Check condition
        this.generateExpressionIntoRAX(
            node.condition
        );

        this.emit("    cmp rax, 0");

        // Exit when false
        this.emit(`    je ${endLabel}`);

        // Loop body
        for (const statement of node.body) {
            this.generateStatement(statement);
        }

        // Go back to start
        this.emit(`    jmp ${startLabel}`);

        // End loop
        this.emit(`${endLabel}:`);
    }

    // ==========================================
    // EXPRESSIONS
    // ==========================================

    generateExpressionIntoRAX(node) {
        switch (node.type) {
            case "IntegerLiteral":
                this.emit(
                    `    mov rax, ${node.value}`
                );
                break;

            case "Identifier":
                this.generateIdentifier(node);
                break;

            case "UnaryExpression":
                this.generateUnaryExpression(node);
                break;

            case "BinaryExpression":
                this.generateBinaryExpression(node);
                break;

            case "FunctionCall":
                this.generateFunctionCall(node);
                break;

            default:
                throw new Error(
                    `Code Generator: unsupported expression '${node.type}'.`
                );
        }
    }

    // ==========================================
    // IDENTIFIER
    // ==========================================

    generateIdentifier(node) {
        const offset = this.variables.get(node.name);

        if (offset === undefined) {
            throw new Error(
                `Code Generator: unknown variable '${node.name}'.`
            );
        }

        this.emit(
            `    mov rax, [rbp - ${offset}]`
        );
    }

    // ==========================================
    // UNARY EXPRESSION
    // ==========================================

    generateUnaryExpression(node) {
        this.generateExpressionIntoRAX(
            node.right
        );

        if (node.operator === "-") {
            this.emit("    neg rax");
            return;
        }

        throw new Error(
            `Code Generator: unsupported unary operator '${node.operator}'.`
        );
    }

    // ==========================================
    // BINARY EXPRESSION
    // ==========================================

    generateBinaryExpression(node) {
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
            arithmeticOperators.includes(node.operator)
        ) {
            this.generateArithmetic(node);
            return;
        }

        if (
            comparisonOperators.includes(node.operator)
        ) {
            this.generateComparison(node);
            return;
        }

        throw new Error(
            `Code Generator: unsupported operator '${node.operator}'.`
        );
    }

    // ==========================================
    // ARITHMETIC
    // ==========================================

    generateArithmetic(node) {
        // LEFT SIDE
        this.generateExpressionIntoRAX(
            node.left
        );

        // Save left value
        this.emit("    push rax");

        // RIGHT SIDE
        this.generateExpressionIntoRAX(
            node.right
        );

        // Save right in RCX
        this.emit("    mov rcx, rax");

        // Restore left into RAX
        this.emit("    pop rax");

        switch (node.operator) {
            case "+":
                this.emit("    add rax, rcx");
                break;

            case "-":
                this.emit("    sub rax, rcx");
                break;

            case "*":
                this.emit("    imul rax, rcx");
                break;

            case "/":
                // RAX = dividend
                // RCX = divisor

                // Put divisor somewhere safe
                this.emit("    mov r11, rcx");

                // Sign extend RAX into RDX:RAX
                this.emit("    cqo");

                // RAX = quotient
                // RDX = remainder
                this.emit("    idiv r11");
                break;

            default:
                throw new Error(
                    `Unsupported arithmetic operator '${node.operator}'.`
                );
        }
    }

    // ==========================================
    // COMPARISONS
    // ==========================================

    generateComparison(node) {
        // LEFT
        this.generateExpressionIntoRAX(
            node.left
        );

        this.emit("    push rax");

        // RIGHT
        this.generateExpressionIntoRAX(
            node.right
        );

        this.emit("    mov rcx, rax");

        // LEFT BACK INTO RAX
        this.emit("    pop rax");

        // Compare left and right
        this.emit("    cmp rax, rcx");

        let instruction;

        switch (node.operator) {
            case ">":
                instruction = "setg";
                break;

            case ">=":
                instruction = "setge";
                break;

            case "<":
                instruction = "setl";
                break;

            case "<=":
                instruction = "setle";
                break;

            case "==":
                instruction = "sete";
                break;

            case "!=":
                instruction = "setne";
                break;

            default:
                throw new Error(
                    `Unsupported comparison '${node.operator}'.`
                );
        }

        // AL becomes 0 or 1
        this.emit(`    ${instruction} al`);

        // Convert AL to full 64-bit RAX
        this.emit("    movzx rax, al");
    }

    // ==========================================
    // FUNCTION CALLS
    // ==========================================

    generateFunctionCall(node) {
        const argumentRegisters = [
            "rcx",
            "rdx",
            "r8",
            "r9"
        ];

        if (node.arguments.length > 4) {
            throw new Error(
                `Function '${node.name}' has more than 4 arguments.`
            );
        }

        // Evaluate arguments from right to left
        for (
            let i = node.arguments.length - 1;
            i >= 0;
            i--
        ) {
            this.generateExpressionIntoRAX(
                node.arguments[i]
            );

            this.emit("    push rax");
        }

        // Move arguments into registers
        for (
            let i = 0;
            i < node.arguments.length;
            i++
        ) {
            this.emit(
                `    pop ${argumentRegisters[i]}`
            );
        }

        // Keep stack aligned when needed
        const needsPadding =
            node.arguments.length % 2 !== 0;

        if (needsPadding) {
            this.emit("    sub rsp, 8");
        }

        // Windows x64 shadow space
        this.emit("    sub rsp, 32");

        // Call function
        this.emit(`    call ${node.name}`);

        // Remove shadow space
        this.emit("    add rsp, 32");

        // Remove alignment padding
        if (needsPadding) {
            this.emit("    add rsp, 8");
        }

        // Function result remains in RAX
    }
}

module.exports = CodeGenerator;