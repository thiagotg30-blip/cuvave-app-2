"""Conexão USB/MIDI (SysEx) com o CUBE Baby via python-rtmidi, e um pedal simulado."""
from __future__ import annotations

import threading
import time
from typing import Callable, Optional

from . import protocol as P

DEFAULT_TIMEOUT = 2.0
NAME_HINTS = ("cube", "mvave", "m-vave", "cuvave")


class PedalError(Exception):
    pass


class PedalTimeout(PedalError):
    def __init__(self, msg="O pedal não respondeu a tempo. Verifique o cabo USB e se o CubeSuite está fechado."):
        super().__init__(msg)


def list_ports() -> tuple[list[str], list[str]]:
    """Retorna (entradas, saídas) MIDI do sistema."""
    try:
        import rtmidi
    except ImportError as exc:  # pragma: no cover
        raise PedalError("Biblioteca python-rtmidi não instalada (pip install python-rtmidi).") from exc
    try:
        mi, mo = rtmidi.MidiIn(), rtmidi.MidiOut()
    except Exception as exc:  # noqa: BLE001 - rtmidi levanta SystemError sem subsistema MIDI
        raise PedalError(f"Sistema MIDI indisponível neste computador ({exc}).") from exc
    try:
        return list(mi.get_ports()), list(mo.get_ports())
    finally:
        mi.delete(); mo.delete()


def guess_port(ports: list[str]) -> int:
    for i, name in enumerate(ports):
        if any(h in name.lower() for h in NAME_HINTS):
            return i
    return 0 if ports else -1


class _Assembler:
    """Remonta SysEx que chegam fatiados."""

    def __init__(self, emit: Callable[[bytes], None]):
        self._emit, self._buf, self._in = emit, bytearray(), False

    def push(self, chunk) -> None:
        for b in chunk:
            if b >= 0xF8:
                continue
            if self._in:
                self._buf.append(b)
                if b == 0xF7:
                    self._emit(bytes(self._buf)); self._buf = bytearray(); self._in = False
            elif b == 0xF0:
                self._buf = bytearray([b]); self._in = True


class BasePedal:
    """Interface comum (pedal real e simulado). Todas as chamadas são bloqueantes:
    rode em thread de trabalho, nunca na thread da interface."""

    connected: bool = False
    device_name: str = ""

    def identify(self) -> str: raise NotImplementedError
    def read_memory(self, memory: int, address: int, length: int) -> bytes: raise NotImplementedError
    def write_memory(self, memory: int, address: int, data: bytes) -> bool: raise NotImplementedError
    def disconnect(self) -> None: self.connected = False

    # ---- operações de alto nível --------------------------------------------
    def read_bank(self) -> dict:
        data = self.read_memory(P.BANK_MEMORY, P.BANK_ADDRESS, P.PRESET_BANK_BYTES)
        return P.decode_preset_bank(data)

    def write_live_param(self, slot: str, name: str, value: int) -> bool:
        addr = P.live_param_address(name, slot)
        return self.write_memory(P.LIVE_PARAM_MEMORY, addr, bytes((P.clamp_param(name, value),)))

    def write_all_params(self, slot: str, params: dict, progress: Optional[Callable[[int], None]] = None) -> None:
        for i, name in enumerate(P.PARAM_NAMES):
            if not self.write_live_param(slot, name, params[name]):
                raise PedalError(f"O pedal recusou o parâmetro '{name}'.")
            if progress:
                progress(int((i + 1) / len(P.PARAM_NAMES) * 100))
            time.sleep(0.015)


class CubeBabyClient(BasePedal):
    def __init__(self) -> None:
        self._in = None
        self._out = None
        self._lock = threading.RLock()         # serializa pedidos: o pedal não lida com concorrência
        self._pending: list[tuple[Callable, threading.Event, list]] = []
        self._plock = threading.Lock()
        self._asm = _Assembler(self._on_sysex)
        self.connected = False
        self.device_name = ""

    # ---- conexão -------------------------------------------------------------
    def connect(self, in_index: int, out_index: int) -> None:
        import rtmidi
        self.disconnect()
        mi, mo = rtmidi.MidiIn(), rtmidi.MidiOut()
        try:
            mi.ignore_types(sysex=False, timing=True, active_sense=True)
            mi.open_port(in_index)
            mo.open_port(out_index)
        except Exception as exc:
            mi.delete(); mo.delete()
            raise PedalError(
                f"Não consegui abrir a porta MIDI ({exc}). Feche o CubeSuite e qualquer outro app que use o pedal."
            ) from exc
        mi.set_callback(lambda event, _data=None: self._asm.push(event[0]))
        self._in, self._out = mi, mo
        self.connected = True
        try:
            self.device_name = self.identify()
        except PedalTimeout:
            self.disconnect()
            raise

    def disconnect(self) -> None:
        for port in (self._in, self._out):
            if port is not None:
                try:
                    port.cancel_callback() if port is self._in else None
                    port.close_port()
                    port.delete()
                except Exception:
                    pass
        self._in = self._out = None
        self.connected = False

    # ---- plumbing ------------------------------------------------------------
    def _on_sysex(self, data: bytes) -> None:
        try:
            msg = P.decode_message(data)
        except P.DecodeError:
            return
        with self._plock:
            for entry in self._pending:
                match, event, box = entry
                if match(msg):
                    box.append(msg); event.set()
                    self._pending.remove(entry)
                    return

    def _send(self, sysex: bytes) -> None:
        if not self._out:
            raise PedalError("Pedal não conectado.")
        self._out.send_message(list(sysex))

    def _request(self, sysex: bytes, match: Callable, timeout: float) -> P.Message:
        event, box = threading.Event(), []
        entry = (match, event, box)
        with self._plock:
            self._pending.append(entry)
        self._send(sysex)
        if not event.wait(timeout):
            with self._plock:
                if entry in self._pending:
                    self._pending.remove(entry)
            raise PedalTimeout()
        return box[0]

    def _handshake(self) -> None:
        self._send(P.encode_identity_request())
        time.sleep(0.08)

    # ---- API -------------------------------------------------------------------
    def identify(self, timeout: float = DEFAULT_TIMEOUT) -> str:
        with self._lock:
            msg = self._request(P.encode_identity_request(), lambda m: m.kind == "identity-response", timeout)
            return msg.name

    def read_memory(self, memory: int, address: int, length: int, timeout: float = DEFAULT_TIMEOUT) -> bytes:
        with self._lock:
            self._handshake()
            msg = self._request(
                P.encode_memory_read_request(memory, address, length),
                lambda m: m.kind == "memory-read-response" and m.memory == memory
                and m.address == address and m.length == length,
                timeout,
            )
            return msg.data

    def write_memory(self, memory: int, address: int, data: bytes, timeout: float = DEFAULT_TIMEOUT) -> bool:
        with self._lock:
            self._handshake()
            msg = self._request(P.encode_memory_write_request(memory, address, data), lambda m: m.kind == "ack", timeout)
            return msg.accepted


class SimulatedPedal(BasePedal):
    """Pedal falso em memória: deixa testar a interface sem hardware."""

    def __init__(self) -> None:
        self.connected = True
        self.device_name = "CUBE Baby (simulado)"
        self._lock = threading.Lock()
        presets = [
            dict(type=2, gain=5, tone=8, reverb=4, feedback=10, volume=100, time=12, mix=20, modulation=8, cabinet=3, irSection=1, delaySection=1, toneSection=1),
            dict(type=0, gain=2, tone=6, reverb=8, feedback=30, volume=90, time=20, mix=40, modulation=3, cabinet=1, irSection=1, delaySection=0, toneSection=1),
            dict(type=8, gain=7, tone=10, reverb=2, feedback=0, volume=110, time=0, mix=0, modulation=8, cabinet=5, irSection=1, delaySection=0, toneSection=1),
        ]
        self._bank = bytearray()
        for p in presets:
            self._bank += bytes(p[n] for n in P.PARAM_NAMES) + b"\x00\x00\x00"

    def identify(self) -> str:
        return self.device_name

    def read_memory(self, memory, address, length) -> bytes:
        time.sleep(0.05)
        if memory == P.BANK_MEMORY and address == P.BANK_ADDRESS:
            return bytes(self._bank[:length])
        raise PedalError("Leitura não suportada no pedal simulado.")

    def write_memory(self, memory, address, data) -> bool:
        time.sleep(0.01)
        if memory == P.LIVE_PARAM_MEMORY and address >= P.LIVE_PARAM_BASE_ADDRESS:
            off = address - P.LIVE_PARAM_BASE_ADDRESS
            with self._lock:
                self._bank[off:off + len(data)] = data
            return True
        return False
