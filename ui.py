"""Interface desktop (Qt / PySide6) do Cube Baby Studio."""
from __future__ import annotations

import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path

from PySide6.QtCore import QObject, Qt, QTimer, QUrl, Signal
from PySide6.QtGui import QAction, QDesktopServices
from PySide6.QtWidgets import (
    QApplication, QCheckBox, QComboBox, QFileDialog, QFrame, QGridLayout, QGroupBox, QHBoxLayout,
    QInputDialog, QLabel, QListWidget, QListWidgetItem, QMainWindow, QMessageBox, QProgressBar,
    QPushButton, QSlider, QTabWidget, QVBoxLayout, QWidget,
)

from . import __version__
from . import presetfile as PF
from . import protocol as P
from .client import BasePedal, CubeBabyClient, PedalError, SimulatedPedal, guess_port, list_ports

STYLE = """
* { font-family: 'Segoe UI', 'Inter', sans-serif; font-size: 13px; }
QMainWindow, QWidget#root { background: #14161a; }
QWidget { color: #e6e8ec; }
QTabWidget::pane { border: 0; }
QTabBar::tab { background: transparent; padding: 8px 18px; color: #8b93a1; border-bottom: 2px solid transparent; }
QTabBar::tab:selected { color: #fff; border-bottom: 2px solid #ff6b4a; }
QGroupBox { background: #1b1e24; border: 1px solid #2a2e37; border-radius: 10px; margin-top: 14px; padding: 14px 12px 10px 12px; font-weight: 600; }
QGroupBox::title { subcontrol-origin: margin; left: 12px; padding: 0 6px; color: var(--c); }
QPushButton { background: #252a33; border: 1px solid #323843; border-radius: 7px; padding: 7px 14px; }
QPushButton:hover { background: #2d333e; }
QPushButton:disabled { color: #5b6270; background: #1d2027; }
QPushButton#primary { background: #ff6b4a; border-color: #ff6b4a; color: #fff; font-weight: 600; }
QPushButton#primary:hover { background: #ff7f62; }
QPushButton#slot { padding: 9px 26px; font-weight: 600; }
QPushButton#slot:checked { background: #ff6b4a; border-color: #ff6b4a; color: #fff; }
QComboBox, QListWidget { background: #1d2027; border: 1px solid #323843; border-radius: 7px; padding: 5px 8px; }
QListWidget::item { padding: 8px; border-radius: 6px; }
QListWidget::item:selected { background: #2d333e; }
QSlider::groove:horizontal { height: 6px; background: #2a2e37; border-radius: 3px; }
QSlider::sub-page:horizontal { background: #ff6b4a; border-radius: 3px; }
QSlider::handle:horizontal { background: #fff; width: 16px; margin: -6px 0; border-radius: 8px; }
QProgressBar { background: #1d2027; border: 0; border-radius: 4px; height: 8px; text-align: center; }
QProgressBar::chunk { background: #38c488; border-radius: 4px; }
QStatusBar { color: #8b93a1; }
QLabel#muted { color: #8b93a1; }
"""

BLOCKS = [
    ("Drive / Pré-amp", "#ff6b4a", [("type", "Tipo de pré-amp"), ("gain", "Gain"), ("tone", "Tom")], ("toneSection", "Bloco de tom ativo")),
    ("Delay", "#4a9eff", [("time", "Tempo"), ("feedback", "Feedback"), ("mix", "Mix")], ("delaySection", "Delay ativo")),
    ("Reverb", "#38c488", [("reverb", "Quantidade")], None),
    ("Modulação", "#c374ff", [("modulation", "Chorus / Phaser")], None),
    ("Gabinete (IR)", "#f2b84b", [("cabinet", "Cabinet / IR")], ("irSection", "IR ativa")),
    ("Saída", "#9aa4b2", [("volume", "Volume")], None),
]


def fmt_value(name: str, v: int) -> str:
    if name == "type":
        return next((f"{n}" for i, n, _ in P.PREAMP_TYPES if i == v), f"Tipo {v}")
    if name == "modulation":
        return P.modulation_label(v)
    if name == "cabinet":
        return P.cabinet_label(v)
    return f"{v} / {P.PARAM_MAX[name]}"


class Runner(QObject):
    """Executa chamadas bloqueantes ao pedal numa thread única (mantém a ordem) e devolve na UI."""
    _result = Signal(object, object, object)
    progress = Signal(int)

    def __init__(self) -> None:
        super().__init__()
        self._pool = ThreadPoolExecutor(max_workers=1)
        self._result.connect(lambda cb, res, err: cb(res, err) if cb else None)

    def submit(self, fn, cb=None) -> None:
        def run():
            try:
                res, err = fn(), None
            except Exception as exc:  # noqa: BLE001
                res, err = None, exc
            self._result.emit(cb, res, err)
        self._pool.submit(run)


class ParamRow(QWidget):
    changed = Signal(str, int)

    def __init__(self, name: str, label: str) -> None:
        super().__init__()
        self.name = name
        lay = QGridLayout(self); lay.setContentsMargins(0, 2, 0, 2)
        self.title = QLabel(label); self.title.setObjectName("muted")
        self.value_lbl = QLabel(); self.value_lbl.setAlignment(Qt.AlignRight)
        lay.addWidget(self.title, 0, 0); lay.addWidget(self.value_lbl, 0, 1)
        if name == "type":
            self.combo = QComboBox()
            for i, n, cat in P.PREAMP_TYPES:
                self.combo.addItem(f"{n}  ({cat})", i)
            self.combo.currentIndexChanged.connect(lambda _: self.changed.emit(self.name, self.combo.currentData()))
            lay.addWidget(self.combo, 1, 0, 1, 2)
            self.slider = None
            self.value_lbl.hide()
        else:
            self.combo = None
            self.slider = QSlider(Qt.Horizontal)
            self.slider.setRange(0, P.PARAM_MAX[name])
            self.slider.valueChanged.connect(self._on_slider)
            lay.addWidget(self.slider, 1, 0, 1, 2)
            self.value_lbl.setText(fmt_value(name, 0))

    def _on_slider(self, v: int) -> None:
        self.value_lbl.setText(fmt_value(self.name, v))
        self.changed.emit(self.name, v)

    def set_value(self, v: int) -> None:
        w = self.combo or self.slider
        w.blockSignals(True)
        if self.combo:
            self.combo.setCurrentIndex(max(0, self.combo.findData(v)))
        else:
            self.slider.setValue(v)
            self.value_lbl.setText(fmt_value(self.name, v))
        w.blockSignals(False)


class PedalTab(QWidget):
    def __init__(self, win: "MainWindow") -> None:
        super().__init__()
        self.win = win
        self.slot = "A"
        self.params = {s: P.empty_params() for s in P.SLOT_IDS}
        self.rows: dict[str, ParamRow] = {}
        self.toggles: dict[str, QCheckBox] = {}
        self._timers: dict[str, QTimer] = {}

        root = QVBoxLayout(self)
        bar = QHBoxLayout()
        self.slot_btns = {}
        for s in P.SLOT_IDS:
            b = QPushButton(f"Preset {s}"); b.setObjectName("slot"); b.setCheckable(True)
            b.clicked.connect(lambda _=False, s=s: self.select_slot(s))
            self.slot_btns[s] = b; bar.addWidget(b)
        self.slot_btns["A"].setChecked(True)
        bar.addStretch()
        self.btn_read = QPushButton("Ler do pedal"); self.btn_read.clicked.connect(self.read_from_pedal)
        self.btn_import = QPushButton("Importar arquivo..."); self.btn_import.clicked.connect(self.import_file)
        self.btn_export = QPushButton("Exportar este slot..."); self.btn_export.clicked.connect(self.export_slot)
        self.btn_lib = QPushButton("Salvar na biblioteca"); self.btn_lib.clicked.connect(self.save_to_library)
        for b in (self.btn_read, self.btn_import, self.btn_export, self.btn_lib):
            bar.addWidget(b)
        root.addLayout(bar)

        grid = QGridLayout(); grid.setSpacing(12)
        for i, (title, color, knobs, toggle) in enumerate(BLOCKS):
            box = QGroupBox(title)
            box.setStyleSheet(f"QGroupBox::title {{ color: {color}; }}")
            v = QVBoxLayout(box)
            for name, label in knobs:
                row = ParamRow(name, label); row.changed.connect(self.on_param)
                self.rows[name] = row; v.addWidget(row)
            if toggle:
                cb = QCheckBox(toggle[1])
                cb.toggled.connect(lambda on, n=toggle[0]: self.on_param(n, int(on)))
                self.toggles[toggle[0]] = cb; v.addWidget(cb)
            v.addStretch()
            grid.addWidget(box, i // 3, i % 3)
        root.addLayout(grid, 1)
        self.refresh_widgets()

    # ---- estado ------------------------------------------------------------------
    def select_slot(self, s: str) -> None:
        self.slot = s
        for k, b in self.slot_btns.items():
            b.setChecked(k == s)
        self.refresh_widgets()

    def refresh_widgets(self) -> None:
        p = self.params[self.slot]
        for n, row in self.rows.items():
            row.set_value(p[n])
        for n, cb in self.toggles.items():
            cb.blockSignals(True); cb.setChecked(bool(p[n])); cb.blockSignals(False)

    def set_enabled_pedal(self, on: bool) -> None:
        self.btn_read.setEnabled(on)

    def on_param(self, name: str, value: int) -> None:
        self.params[self.slot][name] = int(value)
        if not self.win.pedal or not self.win.pedal.connected:
            return
        slot = self.slot
        key = f"{slot}:{name}"
        t = self._timers.get(key)
        if t is None:  # um timer por parâmetro, conectado uma vez só
            t = QTimer(self); t.setSingleShot(True)
            t.timeout.connect(lambda s=slot, n=name: self._flush(s, n))
            self._timers[key] = t
        t.start(60)  # debounce: não inunda o pedal enquanto o slider se mexe

    def _flush(self, slot: str, name: str) -> None:
        pedal = self.win.pedal
        if not pedal or not pedal.connected:
            return
        value = self.params[slot][name]
        self.win.runner.submit(
            lambda: pedal.write_live_param(slot, name, value),
            lambda ok, err: self.win.status(f"Falha ao gravar {name}: {err}") if err else None)

    # ---- ações -------------------------------------------------------------------
    def read_from_pedal(self) -> None:
        if not self.win.require_pedal():
            return
        self.win.busy("Lendo presets do pedal...")
        def done(bank, err):
            self.win.idle()
            if err:
                self.win.status(str(err)); return
            self.params = {s: P.clamp_params(bank[s]) for s in P.SLOT_IDS}
            self.refresh_widgets()
            self.win.status("Presets lidos do pedal.")
        self.win.runner.submit(self.win.pedal.read_bank, done)

    def apply_params(self, name: str, params: dict) -> None:
        """Coloca os parâmetros no editor do slot atual e, se conectado e confirmado, grava no pedal."""
        previous = dict(self.params[self.slot])
        self.params[self.slot] = P.clamp_params(params)
        self.refresh_widgets()
        self.win.status(f'"{name}" carregado no editor do slot {self.slot}.')
        pedal = self.win.pedal
        if not pedal or not pedal.connected:
            return
        ask = QMessageBox.question(
            self, "Gravar no pedal?",
            f'Gravar "{name}" direto no slot {self.slot} do pedal agora?\n\n'
            "Um backup do que estava no editor é salvo automaticamente antes.")
        if ask != QMessageBox.Yes:
            return
        self.win.backup(self.slot, previous)
        slot, p = self.slot, dict(self.params[self.slot])
        self.win.busy(f"Gravando no slot {slot}...")
        def done(_r, err):
            self.win.idle()
            self.win.status(f"Falha ao gravar: {err}" if err else f'"{name}" gravado no slot {slot} do pedal.')
        self.win.runner.submit(lambda: pedal.write_all_params(slot, p, self.win.runner.progress.emit), done)

    def import_file(self) -> None:
        path, _ = QFileDialog.getOpenFileName(self, "Importar preset", str(Path.home()), "Presets (*.json);;Todos (*)")
        if not path:
            return
        try:
            presets, warns = PF.load_file(path)
            if not presets:
                raise ValueError("O arquivo não tinha nenhum preset.")
        except Exception as exc:  # noqa: BLE001
            QMessageBox.warning(self, "Importar", str(exc)); return
        for extra in presets[1:]:
            PF.library_add(extra["name"], extra["params"])
        if len(presets) > 1:
            self.win.library.reload()
            self.win.status(f"O arquivo tinha {len(presets)} presets; os outros foram para a biblioteca.")
        self.apply_params(presets[0]["name"], presets[0]["params"])
        if warns:
            self.win.status(self.win.statusBar().currentMessage() + " — " + " ".join(warns))

    def export_slot(self) -> None:
        path, _ = QFileDialog.getSaveFileName(self, "Exportar slot", str(Path.home() / f"cube-baby-slot-{self.slot}.json"), "Preset (*.json)")
        if path:
            PF.save_file(path, f"CUBE Baby - Slot {self.slot}", self.params[self.slot])
            self.win.status(f"Slot {self.slot} exportado.")

    def save_to_library(self) -> None:
        name, ok = QInputDialog.getText(self, "Biblioteca", "Nome do preset:", text=f"Slot {self.slot} - {datetime.now():%d/%m/%Y}")
        if ok and name.strip():
            PF.library_add(name.strip(), self.params[self.slot])
            self.win.library.reload()
            self.win.status(f'Preset "{name.strip()}" salvo na biblioteca.')


class LibraryTab(QWidget):
    def __init__(self, win: "MainWindow") -> None:
        super().__init__()
        self.win = win
        lay = QVBoxLayout(self)
        self.listw = QListWidget()
        self.listw.itemDoubleClicked.connect(lambda _: self.load_selected())
        lay.addWidget(self.listw, 1)
        row = QHBoxLayout()
        for text, fn, primary in (
            ("Carregar no slot atual", self.load_selected, True),
            ("Importar arquivos...", self.import_files, False),
            ("Exportar...", self.export_selected, False),
            ("Excluir", self.delete_selected, False),
            ("Abrir pasta", lambda: QDesktopServices.openUrl(QUrl.fromLocalFile(str(PF.library_dir()))), False),
        ):
            b = QPushButton(text); b.clicked.connect(fn)
            if primary:
                b.setObjectName("primary")
            row.addWidget(b)
        row.addStretch()
        lay.addLayout(row)
        self.reload()

    def reload(self) -> None:
        self.listw.clear()
        for path, name, p in PF.library_list():
            it = QListWidgetItem(f"{name}\n{P.PREAMP_TYPES[p['type']][1]} · gain {p['gain']} · cab {p['cabinet']} · vol {p['volume']}")
            it.setData(Qt.UserRole, (str(path), name, p))
            self.listw.addItem(it)

    def _current(self):
        it = self.listw.currentItem()
        return it.data(Qt.UserRole) if it else None

    def load_selected(self) -> None:
        cur = self._current()
        if cur:
            self.win.pedal_tab.apply_params(cur[1], cur[2])
            self.win.tabs.setCurrentIndex(0)

    def import_files(self) -> None:
        paths, _ = QFileDialog.getOpenFileNames(self, "Importar presets", str(Path.home()), "Presets (*.json)")
        n = 0
        for p in paths:
            try:
                presets, _ = PF.load_file(p)
                for pr in presets:
                    PF.library_add(pr["name"], pr["params"]); n += 1
            except Exception as exc:  # noqa: BLE001
                QMessageBox.warning(self, "Importar", f"{Path(p).name}: {exc}")
        self.reload(); self.win.status(f"{n} preset(s) importado(s).")

    def export_selected(self) -> None:
        cur = self._current()
        if not cur:
            return
        path, _ = QFileDialog.getSaveFileName(self, "Exportar", str(Path.home() / f"{cur[1]}.json"), "Preset (*.json)")
        if path:
            PF.save_file(path, cur[1], cur[2])

    def delete_selected(self) -> None:
        cur = self._current()
        if cur and QMessageBox.question(self, "Excluir", f'Excluir "{cur[1]}" da biblioteca?') == QMessageBox.Yes:
            Path(cur[0]).unlink(missing_ok=True); self.reload()


class MainWindow(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle(f"Cube Baby Studio {__version__}")
        self.resize(1040, 680)
        self.pedal: BasePedal | None = None
        self.runner = Runner()

        root = QWidget(); root.setObjectName("root"); self.setCentralWidget(root)
        lay = QVBoxLayout(root)

        conn = QHBoxLayout()
        self.cb_in, self.cb_out = QComboBox(), QComboBox()
        for c in (self.cb_in, self.cb_out):
            c.setMinimumWidth(190)
        self.btn_refresh = QPushButton("Atualizar portas"); self.btn_refresh.clicked.connect(self.refresh_ports)
        self.btn_connect = QPushButton("Conectar"); self.btn_connect.setObjectName("primary"); self.btn_connect.clicked.connect(self.toggle_connection)
        self.btn_sim = QPushButton("Modo simulado"); self.btn_sim.clicked.connect(self.start_simulated)
        self.lbl_state = QLabel("● desconectado"); self.lbl_state.setStyleSheet("color:#8b93a1")
        for w in (QLabel("Entrada"), self.cb_in, QLabel("Saída"), self.cb_out, self.btn_refresh, self.btn_connect, self.btn_sim):
            conn.addWidget(w)
        conn.addStretch(); conn.addWidget(self.lbl_state)
        lay.addLayout(conn)

        self.tabs = QTabWidget()
        self.pedal_tab = PedalTab(self)
        self.library = LibraryTab(self)
        self.tabs.addTab(self.pedal_tab, "Pedal")
        self.tabs.addTab(self.library, "Biblioteca")
        lay.addWidget(self.tabs, 1)

        self.progress = QProgressBar(); self.progress.setRange(0, 100); self.progress.setTextVisible(False); self.progress.hide()
        self.runner.progress.connect(self.progress.setValue)
        lay.addWidget(self.progress)

        foot = QLabel("Projeto independente, não afiliado à M-VAVE/CUVAVE. Faça backup dos seus presets antes de gravar no pedal.")
        foot.setObjectName("muted"); lay.addWidget(foot)

        act = QAction("Sair", self); act.triggered.connect(self.close)
        self.pedal_tab.set_enabled_pedal(False)
        self.refresh_ports()

    # ---- helpers ---------------------------------------------------------------------
    def status(self, msg: str) -> None:
        self.statusBar().showMessage(msg)

    def busy(self, msg: str) -> None:
        self.status(msg); self.progress.setValue(0); self.progress.show()

    def idle(self) -> None:
        self.progress.hide()

    def require_pedal(self) -> bool:
        if self.pedal and self.pedal.connected:
            return True
        QMessageBox.information(self, "Pedal", "Conecte o pedal primeiro (ou use o Modo simulado).")
        return False

    def backup(self, slot: str, params: dict) -> None:
        d = Path.home() / "CubeBabyStudio" / "backups"; d.mkdir(parents=True, exist_ok=True)
        PF.save_file(d / f"slot-{slot}-{datetime.now():%Y%m%d-%H%M%S}.json", f"Backup slot {slot}", params)

    def set_connected(self, pedal: BasePedal | None) -> None:
        self.pedal = pedal
        on = bool(pedal and pedal.connected)
        self.btn_connect.setText("Desconectar" if on else "Conectar")
        self.lbl_state.setText(f"● {pedal.device_name or 'conectado'}" if on else "● desconectado")
        self.lbl_state.setStyleSheet(f"color:{'#38c488' if on else '#8b93a1'}")
        self.pedal_tab.set_enabled_pedal(on)

    # ---- conexão ---------------------------------------------------------------------
    def refresh_ports(self) -> None:
        self.cb_in.clear(); self.cb_out.clear()
        try:
            ins, outs = list_ports()
        except PedalError as exc:
            self.status(str(exc)); return
        self.cb_in.addItems(ins); self.cb_out.addItems(outs)
        if ins:
            self.cb_in.setCurrentIndex(guess_port(ins))
        if outs:
            self.cb_out.setCurrentIndex(guess_port(outs))
        self.status(f"{len(ins)} entrada(s) e {len(outs)} saída(s) MIDI encontradas.")

    def toggle_connection(self) -> None:
        if self.pedal and self.pedal.connected:
            self.pedal.disconnect(); self.set_connected(None); self.status("Desconectado."); return
        if self.cb_in.currentIndex() < 0 or self.cb_out.currentIndex() < 0:
            QMessageBox.information(self, "Conectar", "Nenhuma porta MIDI encontrada. Plugue o pedal e clique em Atualizar portas.")
            return
        client = CubeBabyClient()
        i, o = self.cb_in.currentIndex(), self.cb_out.currentIndex()
        self.busy("Conectando...")
        def done(_r, err):
            self.idle()
            if err:
                self.status(str(err)); QMessageBox.warning(self, "Conectar", str(err)); return
            self.set_connected(client); self.status(f"Conectado: {client.device_name}")
            self.pedal_tab.read_from_pedal()
        self.runner.submit(lambda: client.connect(i, o), done)

    def start_simulated(self) -> None:
        self.set_connected(SimulatedPedal()); self.status("Modo simulado: nada é enviado a um pedal de verdade.")
        self.pedal_tab.read_from_pedal()

    def closeEvent(self, e) -> None:  # noqa: N802
        if self.pedal:
            self.pedal.disconnect()
        super().closeEvent(e)


def _install_crash_handler() -> Path:
    """Registra erros (Python e crashes nativos) em ~/CubeBabyStudio/crash.log e mostra numa janela."""
    import faulthandler
    import traceback

    log_dir = Path.home() / "CubeBabyStudio"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / "crash.log"
    fh = open(log_path, "a", buffering=1, encoding="utf-8")
    faulthandler.enable(file=fh)  # pega até crash nativo (segfault) e escreve a pilha

    def hook(exc_type, exc, tb) -> None:
        text = "".join(traceback.format_exception(exc_type, exc, tb))
        fh.write(f"\n[{datetime.now():%Y-%m-%d %H:%M:%S}] v{__version__}\n{text}")
        try:
            QMessageBox.critical(None, "Erro no Cube Baby Studio", f"{text}\nSalvo em:\n{log_path}")
        except Exception:  # noqa: BLE001
            pass

    sys.excepthook = hook
    return log_path


def run(argv: list[str] | None = None) -> int:
    argv = argv if argv is not None else sys.argv
    app = QApplication(argv)
    _install_crash_handler()
    app.setStyle("Fusion")
    app.setStyleSheet(STYLE)
    win = MainWindow()
    win.show()
    if "--sim" in argv:
        win.start_simulated()
    return app.exec()
