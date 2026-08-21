section .data
format db "%lld", 10, 0

section .text
default rel
global main
extern printf

add:
    sub rsp, 56
    mov [rsp + 40], rcx
    mov [rsp + 48], rdx
    mov rax, [rsp + 40]
    push rax
    mov rax, [rsp + 48]
    mov rdx, rax
    pop rax
    add rax, rdx
    add rsp, 56
    ret
    add rsp, 56
    xor eax, eax
    ret

main:
    sub rsp, 40
    mov rax, 20
    push rax
    mov rax, 30
    push rax
    pop rcx
    pop rdx
    sub rsp, 32
    call add
    add rsp, 32
    mov rdx, rax
    lea rcx, [rel format]
    call printf
    add rsp, 40
    xor eax, eax
    ret