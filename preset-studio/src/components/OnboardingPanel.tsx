import { useState } from "react";
import { GraduationCap, ChevronDown } from "lucide-react";

const STEPS = [
  {
    title: "O que é um \"preset\"?",
    text: "É uma combinação salva de todos os ajustes (tipo de distorção, delay, reverb...) que forma um som completo. O CUBE Baby guarda 3 presets, chamados A, B e C — como 3 pedais diferentes dentro de um só.",
  },
  {
    title: "O que são os \"slots A / B / C\"?",
    text: "São os 3 espaços de memória do pedal. Escolha um deles aqui em cima pra ver e editar o que está salvo ali. Trocar de slot no app é igual trocar de preset apertando o pedal com o pé.",
  },
  {
    title: "Preciso conectar o pedal pra usar o app?",
    text: "Só pra ler ou gravar algo no hardware de verdade. Sem conectar, você ainda pode abrir arquivos de preset, editar os valores e guardar na Biblioteca — útil pra organizar ideias antes de mexer no pedal.",
  },
  {
    title: "Como funciona \"importar um arquivo\"?",
    text: "Alguém te manda um preset pronto (arquivo .json, de um colega ou da aba Biblioteca)? Clique em \"Importar arquivo\", escolha o arquivo, e os knobs mudam na hora pro som daquele preset. Se o pedal estiver conectado, o app pergunta se quer gravar direto nele.",
  },
];

export function OnboardingPanel() {
  const [open, setOpen] = useState(true);
  return (
    <section className="onboarding">
      <button className="onboarding-toggle" onClick={() => setOpen((v) => !v)}>
        <GraduationCap size={16} />
        <span>Primeiros passos (clique pra ver/esconder)</span>
        <ChevronDown size={16} className={open ? "chev open" : "chev"} />
      </button>
      {open && (
        <div className="onboarding-grid">
          {STEPS.map((step) => (
            <div className="onboarding-card" key={step.title}>
              <strong>{step.title}</strong>
              <p className="muted small">{step.text}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
