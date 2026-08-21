class CodeGenerator {
    constructor() {
        // This array holds every assembly instruction we generate.
        this.output = [];

        // Used to create unique labels for if/else/while.
        this.labelCounter = 0;

        // Stores where each variable lives in the stack frame.
        //
        // Example:
        // a -> 8
        // b -> 16
        //
        // We will actually use:
        // [rbp - 8]
        // [rbp - 16]
        this.variables = new Map();

        // Number of bytes reserved for local variables.
        this.currentFrameSize = 0;
    }

    // ==================================================
    // GENERAL HELPERS
    // ==================================================

    emit(line = "") {
        this.output.push(line);
    }

    newLabel(prefix) {
        const label = `${prefix}_${this.labelCounter}`;
        this.labelCounter++;

        return label;
    }

    // ==================================================
    // PROGRAM
    // ==================================================

    generate(ast) {
        this.output = [];
        this.labelCounter = 0;

        // -----------------------------
        // Data section
        // -----------------------------

        this.emit("section .data");

        // Format string used by printf.
        this.emit('format db "%lld", 10, 0');

        this.emit("");

        // -----------------------------
        // Code section
        // -----------------------------

        this.emit("section .text");
        this.emit("default rel");
        this.emit("global main");
        this.emit("extern printf");

        this.emit("");

        // -----------------------------
        // Generate functions
        // -----------------------------

        for (const node of ast.body) {
            if (node.type === "FunctionDeclaration") {
                this.generateFunction(node);
            }
        }

        // -----------------------------
        // Generate main
        // -----------------------------

        const mainStatements = ast.body.filter(
            node => node.type !== "FunctionDeclaration"
        );

        this.generateMain(mainStatements);

        return this.output.join("\n");
    }

    // ==================================================
    // VARIABLE COLLECTION
    // ==================================================

    collectVariables(statements, parameters = []) {
        const names = [];

        // Add function parameters first.
        for (const parameter of parameters) {
            if (!names.includes(parameter.name)) {
                names.push(parameter.name);
            }
        }

        const visit = statement => {
            // Variable declaration
            if (statement.type === "VariableDeclaration") {
                if (!names.includes(statement.name)) {
                    names.push(statement.name);
                }
            }

            // Variables inside if/else
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

    // ==================================================
    // VARIABLE MEMORY MAP
    // ==================================================

    createVariableMap(names) {
        this.variables.clear();

        names.forEach((name, index) => {
            // First variable = 8 bytes below RBP
            // Second variable = 16 bytes below RBP
            // etc.
            const offset = (index + 1) * 8;

            this.variables.set(name, offset);
        });
    }

    // ==================================================
    // STACK FRAME SIZE
    // ==================================================

    calculateFrameSize(variableCount) {
        /*
         * Windows x64 requires 32 bytes of shadow space
         * for function calls.
         *
         * Each variable needs 8 bytes.
         *
         * We round the variable area to a multiple
         * of 16 bytes for proper stack alignment.
         */

        const variableBytes = variableCount * 8;

        const alignedVariableBytes =
            Math.ceil(variableBytes / 16) * 16;

        return 32 + alignedVariableBytes;
    }

    // ==================================================
    // FUNCTION GENERATION
    // ==================================================

    generateFunction(node) {
        // Find all variables used inside this function.
        const variableNames = this.collectVariables(
            node.body,
            node.parameters
        );

        // Create stack locations for them.
        this.createVariableMap(variableNames);

        // Calculate required stack space.
        const frameSize =
            this.calculateFrameSize(
                variableNames.length
            );

        // Function label.
        this.emit(`${node.name}:`);

        // -----------------------------
        // Function prologue
        // -----------------------------

        // Save old RBP.
        this.emit("    push rbp");

        // RBP becomes our fixed frame pointer.
        this.emit("    mov rbp, rsp");

        // Reserve local stack space.
        this.emit(
            `    sub rsp, ${frameSize}`
        );

        // -----------------------------
        // Save parameters
        // -----------------------------

        /*
         * Windows x64 argument registers:
         *
         * 1st argument -> RCX
         * 2nd argument -> RDX
         * 3rd argument -> R8
         * 4th argument -> R9
         */

        const parameterRegisters = [
            "rcx",
            "rdx",
            "r8",
            "r9"
        ];

        node.parameters.forEach(
            (parameter, index) => {
                const offset =
                    this.variables.get(
                        parameter.name
                    );

                if (offset === undefined) {
                    throw new Error(
                        `Code Generator: unknown parameter '${parameter.name}'.`
                    );
                }

                this.emit(
                    `    mov [rbp - ${offset}], ${parameterRegisters[index]}`
                );
            }
        );

        // -----------------------------
        // Function body
        // -----------------------------

        for (const statement of node.body) {
            this.generateStatement(statement);
        }

        // -----------------------------
        // Default return
        // -----------------------------

        // Return 0 if no explicit return was reached.
        this.emit("    xor eax, eax");

        this.generateFunctionEpilogue();

        this.emit("");
    }

    // ==================================================
    // MAIN
    // ==================================================

    generateMain(statements) {
        // Find variables in main.
        const variableNames =
            this.collectVariables(statements);

        // Create memory locations.
        this.createVariableMap(variableNames);

        // Calculate stack size.
        const frameSize =
            this.calculateFrameSize(
                variableNames.length
            );

        this.emit("main:");

        // -----------------------------
        // Main prologue
        // -----------------------------

        this.emit("    push rbp");
        this.emit("    mov rbp, rsp");

        this.emit(
            `    sub rsp, ${frameSize}`
        );

        // -----------------------------
        // Main statements
        // -----------------------------

        for (const statement of statements) {
            this.generateStatement(statement);
        }

        // -----------------------------
        // Return 0
        // -----------------------------

        this.emit("    xor eax, eax");

        this.generateFunctionEpilogue();
    }

    // ==================================================
    // FUNCTION EPILOGUE
    // ==================================================

    generateFunctionEpilogue() {
        // Put stack pointer back where it was.
        this.emit("    mov rsp, rbp");

        // Restore previous RBP.
        this.emit("    pop rbp");

        // Return to caller.
        this.emit("    ret");
    }

    // ==================================================
    // STATEMENTS
    // ==================================================

    generateStatement(node) {
        switch (node.type) {

            case "VariableDeclaration":
                this.generateVariableDeclaration(node);
                break;

            case "Assignment":
                this.generateAssignment(node);
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

    // ==================================================
    // VARIABLE DECLARATION
    // ==================================================

    generateVariableDeclaration(node) {
        /*
         * Example:
         *
         * hold a = 10;
         */

        // Calculate the initial value.
        // Result goes into RAX.
        this.generateExpressionIntoRAX(
            node.initializer
        );

        const offset =
            this.variables.get(node.name);

        if (offset === undefined) {
            throw new Error(
                `Code Generator: unknown variable '${node.name}'.`
            );
        }

        // Store RAX in the variable's stack slot.
        this.emit(
            `    mov [rbp - ${offset}], rax`
        );
    }

    // ==================================================
    // ASSIGNMENT
    // ==================================================

    generateAssignment(node) {
        /*
         * Example:
         *
         * a = a - 1;
         */

        // Calculate right side.
        this.generateExpressionIntoRAX(
            node.value
        );

        const offset =
            this.variables.get(node.name);

        if (offset === undefined) {
            throw new Error(
                `Code Generator: unknown variable '${node.name}'.`
            );
        }

        // Save new value.
        this.emit(
            `    mov [rbp - ${offset}], rax`
        );
    }

    // ==================================================
    // RETURN STATEMENT
    // ==================================================

    generateReturnStatement(node) {
        /*
         * The return value must be in RAX.
         */

        this.generateExpressionIntoRAX(
            node.value
        );

        // Restore stack and return.
        this.generateFunctionEpilogue();
    }

    // ==================================================
    // PRINT STATEMENT
    // ==================================================

    generatePrintStatement(node) {
        /*
         * Evaluate expression.
         *
         * Example:
         *
         * mould(a + b);
         *
         * RAX = result
         */

        this.generateExpressionIntoRAX(
            node.value
        );

        /*
         * printf(format, value)
         *
         * Windows x64:
         *
         * RCX = first argument
         * RDX = second argument
         */

        // value -> RDX
        this.emit("    mov rdx, rax");

        // format string -> RCX
        this.emit(
            "    lea rcx, [rel format]"
        );

        /*
         * Windows x64 requires 32 bytes
         * of shadow space before calling
         * another function.
         */

        this.emit("    sub rsp, 32");

        this.emit("    call printf");

        this.emit("    add rsp, 32");
    }

    // ==================================================
    // IF / ELSE
    // ==================================================

    generateIfStatement(node) {
        const elseLabel =
            this.newLabel("else");

        const endLabel =
            this.newLabel("endif");

        /*
         * Generate condition.
         *
         * RAX:
         * 0 = false
         * 1 = true
         */

        this.generateExpressionIntoRAX(
            node.condition
        );

        // Compare RAX with zero.
        this.emit("    cmp rax, 0");

        // If false, jump to ELSE.
        this.emit(
            `    je ${elseLabel}`
        );

        // -----------------------------
        // THEN branch
        // -----------------------------

        for (const statement of node.thenBranch) {
            this.generateStatement(statement);
        }

        // Skip ELSE.
        this.emit(
            `    jmp ${endLabel}`
        );

        // -----------------------------
        // ELSE branch
        // -----------------------------

        this.emit(`${elseLabel}:`);

        if (node.elseBranch) {
            for (const statement of node.elseBranch) {
                this.generateStatement(statement);
            }
        }

        // -----------------------------
        // END
        // -----------------------------

        this.emit(`${endLabel}:`);
    }

    // ==================================================
    // WHILE LOOP
    // ==================================================

    generateWhileStatement(node) {
        const startLabel =
            this.newLabel("while_start");

        const endLabel =
            this.newLabel("while_end");

        // Start of loop.
        this.emit(`${startLabel}:`);

        // Calculate condition.
        this.generateExpressionIntoRAX(
            node.condition
        );

        // Compare with false.
        this.emit("    cmp rax, 0");

        // If false, leave loop.
        this.emit(
            `    je ${endLabel}`
        );

        // -----------------------------
        // Loop body
        // -----------------------------

        for (const statement of node.body) {
            this.generateStatement(statement);
        }

        // Go back to beginning.
        this.emit(
            `    jmp ${startLabel}`
        );

        // End of loop.
        this.emit(`${endLabel}:`);
    }

    // ==================================================
    // EXPRESSIONS
    // ==================================================

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

    // ==================================================
    // IDENTIFIER
    // ==================================================

    generateIdentifier(node) {
        const offset =
            this.variables.get(node.name);

        if (offset === undefined) {
            throw new Error(
                `Code Generator: unknown variable '${node.name}'.`
            );
        }

        /*
         * Load variable from stack.
         *
         * Example:
         *
         * a -> [rbp - 8]
         * b -> [rbp - 16]
         */

        this.emit(
            `    mov rax, [rbp - ${offset}]`
        );
    }

    // ==================================================
    // UNARY EXPRESSION
    // ==================================================

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

    // ==================================================
    // BINARY EXPRESSION
    // ==================================================

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
            arithmeticOperators.includes(
                node.operator
            )
        ) {
            this.generateArithmetic(node);
            return;
        }

        if (
            comparisonOperators.includes(
                node.operator
            )
        ) {
            this.generateComparison(node);
            return;
        }

        throw new Error(
            `Code Generator: unsupported operator '${node.operator}'.`
        );
    }

    // ==================================================
    // ARITHMETIC
    // ==================================================

    generateArithmetic(node) {
        /*
         * We want:
         *
         * LEFT operator RIGHT
         *
         * Example:
         *
         * 10 - 3
         */

        // -----------------------------
        // Calculate LEFT
        // -----------------------------

        this.generateExpressionIntoRAX(
            node.left
        );

        // Save LEFT.
        this.emit("    push rax");

        // -----------------------------
        // Calculate RIGHT
        // -----------------------------

        this.generateExpressionIntoRAX(
            node.right
        );

        /*
         * RIGHT is now in RAX.
         *
         * Move it to RCX.
         */

        this.emit(
            "    mov rcx, rax"
        );

        /*
         * LEFT comes back into RAX.
         */

        this.emit(
            "    pop rax"
        );

        // -----------------------------
        // Perform operation
        // -----------------------------

        switch (node.operator) {

            case "+":
                // RAX = left + right
                this.emit(
                    "    add rax, rcx"
                );
                break;

            case "-":
                // RAX = left - right
                this.emit(
                    "    sub rax, rcx"
                );
                break;

            case "*":
                // RAX = left * right
                this.emit(
                    "    imul rax, rcx"
                );
                break;

            case "/":
                /*
                 * Signed integer division:
                 *
                 * RAX = dividend
                 * RCX = divisor
                 *
                 * CQO prepares RDX:RAX.
                 *
                 * IDIV RCX:
                 *
                 * RAX = quotient
                 * RDX = remainder
                 */

                // Keep divisor safe.
                this.emit(
                    "    mov r11, rcx"
                );

                // Prepare RDX:RAX.
                this.emit(
                    "    cqo"
                );

                // Divide RAX by R11.
                this.emit(
                    "    idiv r11"
                );

                break;

            default:
                throw new Error(
                    `Unsupported arithmetic operator '${node.operator}'.`
                );
        }
    }

    // ==================================================
    // COMPARISON
    // ==================================================

    generateComparison(node) {
        // -----------------------------
        // LEFT
        // -----------------------------

        this.generateExpressionIntoRAX(
            node.left
        );

        // Save LEFT.
        this.emit(
            "    push rax"
        );

        // -----------------------------
        // RIGHT
        // -----------------------------

        this.generateExpressionIntoRAX(
            node.right
        );

        /*
         * RIGHT -> RCX
         */

        this.emit(
            "    mov rcx, rax"
        );

        /*
         * LEFT -> RAX
         */

        this.emit(
            "    pop rax"
        );

        /*
         * Compare:
         *
         * RAX with RCX
         */

        this.emit(
            "    cmp rax, rcx"
        );

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

        /*
         * SET instructions write 0 or 1
         * into AL.
         */

        this.emit(
            `    ${instruction} al`
        );

        /*
         * Turn:
         *
         * AL = 0/1
         *
         * into:
         *
         * RAX = 0/1
         */

        this.emit(
            "    movzx rax, al"
        );
    }

    // ==================================================
    // FUNCTION CALL
    // ==================================================

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

        /*
         * Windows x64:
         *
         * argument 1 -> RCX
         * argument 2 -> RDX
         * argument 3 -> R8
         * argument 4 -> R9
         *
         * We evaluate from right to left.
         */

        for (
            let i = node.arguments.length - 1;
            i >= 0;
            i--
        ) {
            this.generateExpressionIntoRAX(
                node.arguments[i]
            );

            this.emit(
                "    push rax"
            );
        }

        // -----------------------------
        // Move arguments into registers
        // -----------------------------

        for (
            let i = 0;
            i < node.arguments.length;
            i++
        ) {
            this.emit(
                `    pop ${argumentRegisters[i]}`
            );
        }

        /*
         * Windows x64 requires 32 bytes
         * of shadow space.
         */

        this.emit(
            "    sub rsp, 32"
        );

        this.emit(
            `    call ${node.name}`
        );

        this.emit(
            "    add rsp, 32"
        );

        /*
         * Function return value remains
         * in RAX.
         */
    }
}

module.exports = CodeGenerator;