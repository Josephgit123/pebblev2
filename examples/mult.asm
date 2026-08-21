section .data
format db "%lld", 10, 0

section .text
default rel
global main
extern printf

multiplication:
    push rbp
    mov rbp, rsp
    sub rsp, 48
    mov [rbp - 8], rcx
    mov [rbp - 16], rdx
    mov rax, [rbp - 8]
    push rax
    mov rax, [rbp - 16]
    mov rcx, rax
    pop rax
    imul rax, rcx
    mov rsp, rbp
    pop rbp
    ret
    xor eax, eax
    mov rsp, rbp
    pop rbp
    ret

main:
    push rbp
    mov rbp, rsp
    sub rsp, 32
    mov rax, 3
    push rax
    mov rax, 10
    push rax
    pop rcx
    pop rdx
    sub rsp, 32
    call multiplication
    add rsp, 32
    mov rdx, rax
    lea rcx, [rel format]
    sub rsp, 32
    call printf
    add rsp, 32
    xor eax, eax
    mov rsp, rbp
    pop rbp
    ret