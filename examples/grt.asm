section .data
format db "%lld", 10, 0

section .text
default rel
global main
extern printf

greatest:
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
    cmp rax, rcx
    setg al
    movzx rax, al
    cmp rax, 0
    je else_0
    mov rax, [rbp - 8]
    mov rsp, rbp
    pop rbp
    ret
    jmp endif_1
else_0:
    mov rax, [rbp - 16]
    mov rsp, rbp
    pop rbp
    ret
endif_1:
    xor eax, eax
    mov rsp, rbp
    pop rbp
    ret

main:
    push rbp
    mov rbp, rsp
    sub rsp, 32
    mov rax, 20
    push rax
    mov rax, 10
    push rax
    pop rcx
    pop rdx
    sub rsp, 32
    call greatest
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