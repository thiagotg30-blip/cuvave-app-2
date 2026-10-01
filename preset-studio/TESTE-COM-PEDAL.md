# Roteiro de teste com o CUBE Baby de verdade

Nada aqui foi validado contra um pedal físico (o ambiente onde eu trabalho não
tem porta USB). Siga esse roteiro com calma, **na ordem**, e me conta o que
aconteceu em cada etapa — principalmente se alguma coisa não bater com o que o
CubeSuite mostra.

## 0. Antes de tudo: backup

1. Abra o **CubeSuite oficial** (agora deve abrir normal — veja a nota sobre o
   erro do Qt mais abaixo) e exporte os 3 presets atuais (A, B, C), se o
   programa tiver essa opção. Guarde o arquivo em algum lugar seguro.
2. Se não conseguir exportar pelo CubeSuite, pelo menos anote à mão os valores
   dos knobs dos 3 presets (Type, Gain, Tone, Reverb, Time, FB, Mix, Mod,
   Cabinet) — é o seu plano B caso algo saia errado.

## 1. Conectar

1. Abra o **CUBE Baby Preset Studio** no **Google Chrome** ou **Edge** (Firefox
   e Safari não funcionam, não têm suporte a SysEx).
2. Plugue o CUBE Baby via USB nesse mesmo computador. Feche o CubeSuite, se
   estiver aberto (os dois não podem usar a porta MIDI ao mesmo tempo).
3. Na aba **Pedal**, confira se "Entrada MIDI" e "Saída MIDI" já vieram
   selecionadas automaticamente (deve aparecer algo como "Cube Baby" ou
   "MVAVE" no nome). Se não, selecione manualmente.
4. Clique em **Conectar**. O navegador deve pedir permissão de acesso a
   dispositivos MIDI — aceite.
   - ✅ Esperado: aparece "Pedal conectado".
   - ❌ Se der timeout ou erro: confira o cabo USB, tente uma porta USB
     diferente, e me avise a mensagem exata de erro.

## 2. Ler os presets existentes

1. Clique em **Ler do pedal**.
   - ✅ Esperado: os valores de Type/Gain/Tone/etc. mudam pra bater com o que
     está fisicamente nos presets A, B e C do seu pedal.
   - ❌ Se os valores ficarem todos zerados ou claramente errados, me avise —
     pode ser um detalhe do protocolo que precisa de ajuste.
2. Compare visualmente com o que o CubeSuite mostra pros mesmos 3 presets.

## 3. Editar um parâmetro simples (baixo risco)

1. Com o pedal tocando (ou monitorando o som), mexa devagar no slider de
   **Volume** do preset A.
   - ✅ Esperado: o volume muda em tempo real, igual mexer o knob físico.
2. Teste também o toggle de **IR ativa** (liga/desliga o gabinete) e ouça a
   diferença.

## 4. Exportar e importar um preset (o recurso principal)

1. Com o preset A soando do jeito que você gosta, clique em **Exportar este
   slot**. Um arquivo `cube-baby-slot-A.json` deve baixar.
2. Mude alguns valores no editor (sem gravar no pedal ainda).
3. Clique em **Importar arquivo...**, escolha o arquivo que você acabou de
   exportar.
   - ✅ Esperado: os valores voltam exatamente aos que você tinha exportado.
4. Quando perguntado se quer gravar no pedal, confirme e confira se o preset A
   físico voltou ao mesmo som de antes.
5. Teste também importar `examples/preset-exemplo-metal.json` (incluso no
   projeto) só pra ver o fluxo com um arquivo "de fora".

## 5. Biblioteca

1. Vá na aba **Biblioteca**, arraste 2 ou 3 arquivos `.json` de presets
   (os que você exportou acima) pra cima da página.
   - ✅ Esperado: eles aparecem como cartões na lista.
2. Clique em **Aplicar no pedal** num deles, escolha o slot B, confirme, e
   confira no pedal físico.

## 6. IR (upload de resposta de impulso) — **mais arriscado, faça por último**

> Essa é a operação que mais mexe na memória flash do pedal (apaga e regrava
> um setor inteiro). Faça com o pedal ligado na tomada/USB o tempo todo
> (nunca na bateria descarregando) e sem fechar a aba no meio do processo.

1. Pegue qualquer `.wav` curto (mono ou estéreo, não precisa ser uma IR de
   verdade pra esse teste) — uma gravação de 1 a 2 segundos já serve.
2. Na seção **Gabinetes / IR**, deixe selecionado **Cabinet 8** (é o slot
   recomendado pra upload, os outros 7 são de fábrica).
3. Clique em **Importar .wav para este slot**, escolha o arquivo, confirme o
   aviso.
4. Acompanhe a barra de progresso (apagando → gravando → verificando →
   selecionando cabinet).
   - ✅ Esperado: termina dizendo "gravada com sucesso" e o som muda quando
     você toca com o Cabinet 8 selecionado.
   - ❌ Se a verificação falhar ou o pedal travar: **não desligue o pedal**,
     me avise imediatamente e descreva o que apareceu na tela. Na pior das
     hipóteses, o CubeSuite com um IR de fábrica consegue regravar por cima.
5. Clique em **Exportar este slot como .wav** pra conferir se o que foi lido
   de volta soa parecido com o que você enviou.

## O que me contar depois

- Em qual etapa algo não funcionou (se funcionou tudo, me diga também!).
- Mensagens de erro exatas (print ou texto).
- Se os valores lidos/gravados bateram com o que o CubeSuite mostra.

## Nota sobre o erro do CubeSuite ("no Qt platform plugin")

Esse erro era porque o `CubeSuite.exe` do repositório estava incompleto —
faltavam as pastas `platforms/`, `imageformats/` e `styles/` com os plugins do
Qt 5.15.2 que o programa precisa pra abrir uma janela no Windows. Eu completei
isso usando os plugins oficiais do Qt 5.15.2 (mesma versão exata das DLLs que
já estavam aqui), então agora o `CubeSuite.exe` deve abrir normalmente. Baixe a
pasta inteira do repositório de novo (não só o `.exe`) para pegar as pastas
novas.
