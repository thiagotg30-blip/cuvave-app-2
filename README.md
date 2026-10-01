# cuvave-app-2

Este repositório continha apenas o `CubeSuite.exe` oficial (editor Windows da
M-VAVE/CUVAVE para a linha de pedais Cube — Cube Baby, Cube Sugar, IR Box,
etc.) compilado, sem código-fonte.

## CubeSuite.exe original: faltavam plugins do Qt

O `.exe` original falhava ao abrir com o erro *"This application failed to
start because no Qt platform plugin could be initialized"*. Isso acontecia
porque o deploy estava incompleto: faltavam as pastas `platforms/`,
`imageformats/` e `styles/` com os plugins do Qt 5.15.2 (mesma versão das DLLs
que já estavam no repo). Essas pastas foram adicionadas na raiz do repositório
— baixe o repositório inteiro (não só o `.exe`) para que o programa abra
normalmente.

## Editor web alternativo (não oficial)

Como não é possível modificar o executável fechado em si, foi adicionado em
[`preset-studio/`](preset-studio/) um **editor web alternativo (não oficial)**
para o Cube Baby, com o que faltava no app original: importar presets a partir
de um arquivo, biblioteca de presets, upload/exportação de IR (resposta de
impulso) e uma interface mais direta. Veja
[`preset-studio/README.md`](preset-studio/README.md) para instruções de uso e
[`preset-studio/TESTE-COM-PEDAL.md`](preset-studio/TESTE-COM-PEDAL.md) para um
roteiro de teste com o pedal físico.
