section .data
format db "%lld", 10, 0

section .text
default rel
global main
extern printf

add:
    mov rax, rcx
    push rax
    mov rax, rdx
    mov rcx, rax
    pop rax
    add rax, rcx
    ret

main:
    sub rsp, 40
    mov rcx, 10
    mov rdx, 20
    call add
    mov rdx, rax
    lea rcx, [rel format]
    call printf
    add rsp, 40
    xor eax, eax
    ret