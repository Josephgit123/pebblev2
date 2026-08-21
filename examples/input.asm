section .data
format db "%lld", 10, 0
input_format db "%lld", 0

section .text
default rel
global main
extern printf
extern scanf

main:
    push rbp
    mov rbp, rsp
    sub rsp, 48
    mov rax, 0
    mov [rbp - 8], rax
    lea rdx, [rbp - 8]
    lea rcx, [rel input_format]
    sub rsp, 32
    call scanf
    add rsp, 32
    mov rax, [rbp - 8]
    mov rdx, rax
    lea rcx, [rel format]
    sub rsp, 32
    call printf
    add rsp, 32
    xor eax, eax
    mov rsp, rbp
    pop rbp
    ret