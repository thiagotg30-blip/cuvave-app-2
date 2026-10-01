# Cube Baby Studio

Editor **desktop nativo** (Qt/PySide6, sem navegador) para o pedal M-VAVE/CUVAVE **CUBE Baby**.
Projeto independente, não afiliado à fabricante.

## Rodar (Windows)
Precisa do **Python 3.12** (o 3.14 ainda não tem pacote pronto do `python-rtmidi`).
Se não tiver: `winget install Python.Python.3.12`. Pode ficar com o 3.14 instalado também.

- **`run_debug.bat`**: cria um ambiente isolado (`.venv`), instala tudo e abre o programa com o console aberto.
- **`build_exe.bat`**: gera `dist\CubeBabyStudio\CubeBabyStudio.exe`.
- Sem pedal: `.venv\Scripts\python main.py --sim` abre com um pedal simulado.

> Feche o CubeSuite antes: dois programas não podem usar a porta MIDI do pedal ao mesmo tempo.
> Se der erro, ele aparece numa janela e fica em `%USERPROFILE%\CubeBabyStudio\crash.log`.

## O que faz
- Conecta no pedal por USB-MIDI (SysEx), detecta a porta sozinho e lê os 3 presets (A/B/C).
- Edita em tempo real: tipo de pré-amp, gain, tom, delay, reverb, modulação, cabinet, volume.
- Importa/exporta presets `.json` (compatível com o preset-studio web e com bancos do CubeControl/ToneHub).
- Biblioteca local em `~/CubeBabyStudio/biblioteca`. Backup automático em `~/CubeBabyStudio/backups`
  antes de gravar um preset importado no pedal.

## Ainda não tem
- Upload/exportação de IR (.wav): mexe na flash do pedal, fica pra uma segunda etapa.
- Atualização de firmware: de propósito, por ser a operação mais arriscada.

## Estrutura
```
cubebaby/protocol.py    SysEx: codificação 7-bit, envelope, checksum, presets, endereços
cubebaby/client.py      conexão rtmidi (CubeBabyClient) + pedal simulado
cubebaby/presetfile.py  .json de presets e biblioteca
cubebaby/ui.py          janela Qt
tests/                  testes do protocolo
```

## Créditos
O protocolo vem da engenharia reversa comunitária: cubecontrol (MIT) e cuvave-midi (GPL-3.0, usado só como referência).
Se for distribuir o programa, confira as licenças desses projetos.
