section .data
format db "%lld", 10, 0

section .text
default rel
global main
extern printf

main:
    push rbp
    mov rbp, rsp
    sub rsp, 48
    mov rax, 10
    mov [rbp - 8], rax
    mov rax, 3
    mov [rbp - 16], rax
    mov rax, [rbp - 8]
    push rax
    mov rax, [rbp - 16]
    mov rcx, rax
    pop rax
    add rax, rcx
    mov rdx, rax
    lea rcx, [rel format]
    sub rsp, 32
    call printf
    add rsp, 32
    mov rax, [rbp - 8]
    push rax
    mov rax, [rbp - 16]
    mov rcx, rax
    pop rax
    sub rax, rcx
    mov rdx, rax
    lea rcx, [rel format]
    sub rsp, 32
    call printf
    add rsp, 32
    mov rax, [rbp - 8]
    push rax
    mov rax, [rbp - 16]
    mov rcx, rax
    pop rax
    imul rax, rcx
    mov rdx, rax
    lea rcx, [rel format]
    sub rsp, 32
    call printf
    add rsp, 32
    mov rax, [rbp - 8]
    push rax
    mov rax, [rbp - 16]
    mov rcx, rax
    pop rax
    mov r11, rcx
    cqo
    idiv r11
    mov rdx, rax
    lea rcx, [rel format]
    sub rsp, 32
    call printf
    add rsp, 32
    xor eax, eax
    mov rsp, rbp
    pop rbp
    ret