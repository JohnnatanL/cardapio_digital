import Link from "next/link";
import {
  QrCode, Languages, Ban, BarChart3, FileDown, WifiOff, ArrowRight, Check,
} from "lucide-react";
import { DemoAoVivo } from "@/components/marketing/DemoAoVivo";

export const metadata = {
  title: "Cardápio digital que o cliente entende",
  description:
    "QR Code na mesa, preço que muda em segundos e filtro por restrição alimentar. Teste 14 dias sem cartão.",
};

/* PENDÊNCIA: os preços abaixo estão fixos na página. Quando quiser mudar,
   troque também na tabela `plans` — ou puxe daqui do banco com uma query. */
const PLANOS = [
  {
    codigo: "essencial",
    nome: "Essencial",
    preco: "49,90",
    linha: "Para um restaurante",
    inclui: [
      "5 cardápios",
      "150 pratos",
      "30 mesas com QR",
      "2 idiomas",
      "Relatórios de visualização",
      "Exportar cardápio em PDF",
    ],
    destaque: true,
  },
  {
    codigo: "pro",
    nome: "Pro",
    preco: "99,90",
    linha: "Sem limites",
    inclui: [
      "Cardápios, pratos e mesas ilimitados",
      "5 idiomas",
      "Domínio próprio",
      "Sem marca do Comanda no rodapé",
      "Suporte prioritário",
    ],
    destaque: false,
  },
];

const RECURSOS = [
  {
    Icone: Ban,
    titulo: "Acabou? Some do cardápio num toque",
    texto:
      "Marque o prato como esgotado e escolha quando ele volta: em uma hora, no fim do expediente ou só quando você mandar. Ele reaparece sozinho.",
  },
  {
    Icone: QrCode,
    titulo: "Um QR por mesa",
    texto:
      "Gere as etiquetas em PDF com marcas de corte e cole nas mesas. Você descobre quais mesas mais consultam o cardápio.",
  },
  {
    Icone: Languages,
    titulo: "Cardápio em outro idioma",
    texto:
      "Você escreve a versão em inglês ou espanhol e o cliente troca com um toque. Nada de tradução automática errando o nome do prato.",
  },
  {
    Icone: BarChart3,
    titulo: "O que seus clientes procuram",
    texto:
      "Pratos mais vistos, horário de pico e — o mais revelador — quais restrições alimentares seus clientes mais filtram.",
  },
  {
    Icone: WifiOff,
    titulo: "Abre mesmo com internet ruim",
    texto:
      "O cardápio fica guardado no celular do cliente depois da primeira visita. Wi-Fi caiu no meio do salão? Ele abre igual.",
  },
  {
    Icone: FileDown,
    titulo: "Versão impressa quando precisar",
    texto:
      "Exporte o cardápio em A4 para ter em mãos. Cliente sem bateria e cliente que prefere papel continuam atendidos.",
  },
];

export default function Landing() {
  return (
    <>
      {/* ================= HERO ================= */}
      {/* No celular a demo sobe para logo depois do título: ela é a tese do
          hero, e enterrada abaixo do texto ninguém chega nela. No desktop
          volta para a coluna da direita. */}
      <section className="mx-auto grid max-w-6xl gap-8 px-6 pb-20 pt-14 lg:grid-cols-[1.05fr_auto] lg:gap-x-16 lg:gap-y-6 lg:pt-24">
        <div className="anim-sobe lg:col-start-1 lg:row-start-1 lg:self-end">
          <p className="eyebrow">Cardápio digital</p>

          <h1 className="mt-3 font-[family-name:var(--font-display)] text-[length:var(--text-hero)] leading-[0.95] tracking-[-0.02em]">
            O cardápio muda.
            <br />
            <span className="italic text-[var(--color-petroleo)]">A gráfica não precisa saber.</span>
          </h1>
        </div>

        <div
          className="anim-sobe lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center"
          style={{ animationDelay: "120ms" }}
        >
          <DemoAoVivo />
        </div>

        <div className="anim-sobe lg:col-start-1 lg:row-start-2 lg:self-start" style={{ animationDelay: "60ms" }}>
          <p className="max-w-[46ch] text-[1.0625rem] leading-relaxed text-[var(--color-fumaca)]">
            Mude um preço, esgote um prato ou lance o especial do dia direto do celular.
            O QR Code na mesa é sempre o mesmo — o que está atrás dele é você quem decide.
          </p>

          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
            <Link href="/cadastro" className="btn btn-primario">
              Começar teste de 14 dias
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="#planos" className="btn btn-fantasma">
              Ver planos
            </Link>
          </div>

          <p className="mt-3 text-[0.8125rem] text-[var(--color-fumaca)]">
            Sem cartão de crédito. Você só paga quando publicar.
          </p>
        </div>
      </section>

      {/* ================= O PROBLEMA ================= */}
      <section className="border-y border-[var(--color-risco)] bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-10 md:grid-cols-[auto_1fr] md:gap-16">
            <h2 className="max-w-[14ch] font-[family-name:var(--font-display)] text-[length:var(--text-titulo)] leading-[1.05]">
              Todo cardápio impresso já nasce vencido
            </h2>
            <div className="space-y-4 text-[1rem] leading-relaxed text-[var(--color-fumaca)] md:max-w-[52ch]">
              <p>
                O fornecedor sobe o preço da picanha e você tem duas opções: engolir a margem
                até a próxima tiragem ou colar uma etiqueta em cima do valor antigo. As duas
                custam caro — uma no caixa, a outra na percepção do cliente.
              </p>
              <p>
                E tem o outro lado: alguém senta, pergunta se o molho leva castanha, e o
                garçom precisa ir até a cozinha descobrir. Enquanto isso a mesa esfria.
              </p>
              <p className="text-[var(--color-tinta)]">
                O Comanda resolve os dois no mesmo lugar: você edita, o cliente vê na hora,
                e cada prato já carrega o que tem dentro dele.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= RECURSOS ================= */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <p className="eyebrow">O que vem junto</p>
        <div className="regua mt-3" />

        <div className="mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {RECURSOS.map(({ Icone, titulo, texto }) => (
            <div key={titulo}>
              <Icone className="h-5 w-5 text-[var(--color-petroleo)]" strokeWidth={1.75} />
              <h3 className="mt-3 text-[1.0625rem] font-medium leading-snug">{titulo}</h3>
              <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--color-fumaca)]">
                {texto}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= ALERGÊNICOS ================= */}
      <section className="bg-[var(--color-petroleo)] text-[var(--color-papel)]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-10 md:grid-cols-2 md:gap-16">
            <div>
              <p className="eyebrow" style={{ color: "var(--color-mostarda)" }}>
                Alergênicos
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-[length:var(--text-titulo)] leading-[1.05]">
                Diga o que tem dentro do prato — e o que <span className="italic">pode</span> ter
              </h2>
            </div>
            <div className="space-y-4 text-[0.9375rem] leading-relaxed text-[var(--color-papel)]/75">
              <p>
                Cada prato aceita duas marcações diferentes: <strong className="text-[var(--color-papel)]">contém</strong> e{" "}
                <strong className="text-[var(--color-papel)]">pode conter</strong>. A segunda existe porque
                contaminação cruzada na cozinha é real, e a RDC 26/2015 da Anvisa trata os dois
                casos de forma distinta.
              </p>
              <p>
                Quem tem doença celíaca marca &ldquo;sem glúten&rdquo; no cardápio e escolhe se quer
                esconder também os pratos de risco. Em vez de chamar o garçom três vezes,
                a pessoa decide sozinha em dez segundos.
              </p>
              <p>
                Os oito grupos alergênicos já vêm cadastrados com ícone. Você só marca quais
                aparecem em cada prato.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= PLANOS ================= */}
      <section id="planos" className="mx-auto max-w-6xl px-6 py-20">
        <p className="eyebrow">Planos</p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-[length:var(--text-titulo)]">
          Escolha depois de montar
        </h2>
        <p className="mt-2 max-w-[52ch] text-[0.9375rem] text-[var(--color-fumaca)]">
          Você cadastra os pratos, testa com a equipe e só decide quando for publicar.
          Os 14 dias começam no cadastro e não pedem cartão.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:max-w-3xl">
          {PLANOS.map((plano) => (
            <div
              key={plano.codigo}
              className="card-comanda flex flex-col p-6"
              style={
                plano.destaque
                  ? { borderColor: "var(--color-tinta)", borderWidth: 2 }
                  : undefined
              }
            >
              {plano.destaque && (
                <p className="eyebrow mb-3" style={{ color: "var(--color-mostarda-2)" }}>
                  Mais escolhido
                </p>
              )}

              <h3 className="font-[family-name:var(--font-display)] text-[1.5rem] leading-none">
                {plano.nome}
              </h3>
              <p className="mt-1 text-[0.8125rem] text-[var(--color-fumaca)]">{plano.linha}</p>

              <p className="mt-5 font-[family-name:var(--font-numero)] text-[2rem] leading-none tracking-tight">
                <span className="text-[0.875rem] text-[var(--color-fumaca)]">R$ </span>
                {plano.preco}
                <span className="text-[0.875rem] text-[var(--color-fumaca)]">/mês</span>
              </p>

              <ul className="mt-6 flex-1 space-y-2">
                {plano.inclui.map((linha) => (
                  <li key={linha} className="flex items-start gap-2 text-[0.875rem]">
                    <Check className="mt-[3px] h-3.5 w-3.5 flex-none text-[var(--color-musgo)]" />
                    {linha}
                  </li>
                ))}
              </ul>

              <Link
                href={`/cadastro?plano=${plano.codigo}`}
                className={`btn mt-6 w-full ${plano.destaque ? "btn-primario" : "btn-fantasma"}`}
              >
                Testar 14 dias
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-6 text-[0.8125rem] text-[var(--color-fumaca)]">
          Cancelamento a qualquer momento pelo painel. Sem multa e sem ligação.
        </p>
      </section>

      {/* ================= FAQ ================= */}
      <section className="border-t border-[var(--color-risco)]">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <p className="eyebrow">Perguntas frequentes</p>
          <div className="regua mt-3" />

          <dl className="mt-8 space-y-7">
            {[
              [
                "Preciso trocar o QR Code quando mudo o cardápio?",
                "Não. O QR aponta para um endereço fixo. O que muda é o que está do outro lado. Você imprime uma vez e usa para sempre.",
              ],
              [
                "Meu cliente precisa instalar algum aplicativo?",
                "Não. Ele aponta a câmera e o cardápio abre no navegador. Funciona em qualquer celular dos últimos dez anos.",
              ],
              [
                "E se a internet do restaurante cair?",
                "O cardápio fica guardado no celular de quem já acessou. E como o cliente costuma usar os dados dele, o Wi-Fi do salão nem entra na conta.",
              ],
              [
                "Consigo ter cardápio diferente por dia da semana?",
                "Sim. Cada cardápio tem os dias em que aparece — e horário, se você quiser separar almoço de jantar. Fora da janela, ele simplesmente não aparece.",
              ],
              [
                "Posso ter o mesmo prato com preços diferentes?",
                "Pode. O preço pertence ao cardápio, não ao prato. A mesma moqueca pode custar um valor no executivo e outro no jantar, sem cadastrar duas vezes.",
              ],
              [
                "Quem cuida do meu cadastro?",
                "Você mesmo, pelo painel, do celular. Se preferir, a gente monta o primeiro cardápio junto com você na primeira semana.",
              ],
            ].map(([pergunta, resposta]) => (
              <div key={pergunta}>
                <dt className="text-[1rem] font-medium">{pergunta}</dt>
                <dd className="mt-1.5 text-[0.9375rem] leading-relaxed text-[var(--color-fumaca)]">
                  {resposta}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ================= CTA FINAL ================= */}
      <section className="bg-[var(--color-tinta)] text-[var(--color-papel)]">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="mx-auto max-w-[18ch] font-[family-name:var(--font-display)] text-[length:var(--text-titulo)] leading-[1.05]">
            Monte o seu cardápio hoje e decida depois
          </h2>
          <Link href="/cadastro" className="btn btn-primario mt-7">
            Criar meu cardápio
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
