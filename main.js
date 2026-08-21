const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const Lexer = require("./src/lexer/lexer");
const Parser = require("./src/parser/parser");
const SemanticAnalyzer = require("./src/semantic/semantic");
const CodeGenerator = require("./src/codegen/codegen");



const sourceFile = process.argv[2];

if (!sourceFile) {
    console.error("Usage: node main.js <file.peb>");
    process.exit(1);
}

const sourcePath = path.resolve(sourceFile);

if (!fs.existsSync(sourcePath)) {
    console.error(`File not found: ${sourceFile}`);
    process.exit(1);
}

// ----------------------------------
// Read Pebble source
// ----------------------------------

const source = fs.readFileSync(sourcePath, "utf8");

// ----------------------------------
// Lexer
// ----------------------------------

const lexer = new Lexer(source);
const tokens = lexer.tokenize();

// ----------------------------------
// Parser
// ----------------------------------

const parser = new Parser(tokens);
const ast = parser.parse();

// semantic analysis

const semanticAnalyzer = new SemanticAnalyzer();

semanticAnalyzer.analyze(ast);

// ----------------------------------
// Code generation
// ----------------------------------

const codeGenerator = new CodeGenerator();
const assembly = codeGenerator.generate(ast);

// ----------------------------------
// Output file names
// ----------------------------------

const directory = path.dirname(sourcePath);

const baseName = path.basename(
    sourcePath,
    path.extname(sourcePath)
);

const assemblyPath = path.join(
    directory,
    `${baseName}.asm`
);

const objectPath = path.join(
    directory,
    `${baseName}.obj`
);

const executablePath = path.join(
    directory,
    `${baseName}.exe`
);

// ----------------------------------
// Write assembly
// ----------------------------------

fs.writeFileSync(assemblyPath, assembly);

// ----------------------------------
// Assemble with NASM
// ----------------------------------

execFileSync(
    "nasm",
    [
        "-f",
        "win64",
        assemblyPath,
        "-o",
        objectPath
    ],
    {
        stdio: "ignore"
    }
);

// ----------------------------------
// Link with GCC
// ----------------------------------

execFileSync(
    "gcc",
    [
        objectPath,
        "-o",
        executablePath
    ],
    {
        stdio: "ignore"
    }
);

// ----------------------------------
// Run compiled Pebble program
// ----------------------------------

execFileSync(
    executablePath,
    [],
    {
        stdio: "inherit"
    }
);