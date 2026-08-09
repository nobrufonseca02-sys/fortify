import type { BlogPostMeta } from "./types";

export const meta: BlogPostMeta = {
  slug: "ftmo-vs-fundednext-regras-de-risco",
  title: "FTMO vs FundedNext: regras de risco comparadas",
  description:
    "Perda diária, drawdown e dias mínimos da FTMO e da FundedNext lado a lado, com os números vindos direto do catálogo de regras auditado do Fortify.",
  publishedAt: "2026-08-09",
};

export default function FtmoVsFundedNextPost() {
  return (
    <>
      <p className="lead">
        Se você está escolhendo entre FTMO e FundedNext, a decisão não deveria ser só sobre preço
        do challenge — é sobre qual conjunto de regras combina com o seu estilo de operação. Uma
        violação de regra de risco zera a conta, então vale entender a letra miúda antes de
        comprar.
      </p>

      <h2>FTMO</h2>

      <h3>Programa de 1 fase (EOD Trailing)</h3>
      <ul>
        <li>Perda diária máxima: <strong>3%</strong> do saldo</li>
        <li>
          Drawdown máximo: <strong>10%</strong>, tipo <strong>trailing</strong> (calculado no
          fechamento do dia — o teto acompanha o seu pico de equity, não fica fixo)
        </li>
        <li>Dias mínimos de operação: nenhum — prazo ilimitado</li>
        <li>
          Regra de consistência: Best Day Rule de 50% (exceder não reprova automaticamente, mas
          exige continuar operando pra diluir a proporção)
        </li>
      </ul>

      <h3>Programa 2-Step</h3>
      <ul>
        <li>Perda diária máxima: <strong>5%</strong></li>
        <li>
          Drawdown máximo: <strong>10%</strong>, tipo <strong>estático</strong> (teto fixo a
          partir do saldo inicial, não se move com o seu lucro)
        </li>
        <li>Dias mínimos: 4 dias em cada fase — prazo ilimitado</li>
        <li>Sem regra de consistência na aprovação</li>
      </ul>

      <h2>FundedNext</h2>

      <h3>Programa Express</h3>
      <ul>
        <li>
          Perda diária máxima: <strong>3%</strong> do saldo inicial (reset à meia-noite, horário
          do servidor)
        </li>
        <li>Drawdown máximo: <strong>6%</strong>, tipo <strong>estático</strong></li>
        <li>Dias mínimos: 2 dias separados de operação — sem prazo máximo</li>
        <li>
          Sem regra de consistência padrão (um add-on opcional aplica 40% já na conta financiada)
        </li>
      </ul>

      <h3>Programa Evaluation</h3>
      <ul>
        <li>Perda diária máxima: <strong>5%</strong> do saldo inicial</li>
        <li>Drawdown máximo: <strong>10%</strong>, tipo <strong>estático</strong></li>
        <li>
          Dias mínimos: 5 dias, com pelo menos 1 trade por dia em cada fase — sem prazo máximo
        </li>
        <li>Sem regra de consistência padrão</li>
      </ul>

      <h2>Comparação lado a lado</h2>
      <div className="not-prose my-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-[hsl(var(--surface-1))] text-left">
              <th className="px-4 py-3 font-semibold text-foreground">Programa</th>
              <th className="px-4 py-3 font-semibold text-foreground">Perda diária</th>
              <th className="px-4 py-3 font-semibold text-foreground">Drawdown</th>
              <th className="px-4 py-3 font-semibold text-foreground">Dias mínimos</th>
              <th className="px-4 py-3 font-semibold text-foreground">Consistência</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b border-border">
              <td className="px-4 py-3 text-foreground">FTMO 1-Fase</td>
              <td className="px-4 py-3">3%</td>
              <td className="px-4 py-3">10% trailing</td>
              <td className="px-4 py-3">Nenhum</td>
              <td className="px-4 py-3">Best Day 50%</td>
            </tr>
            <tr className="border-b border-border">
              <td className="px-4 py-3 text-foreground">FTMO 2-Step</td>
              <td className="px-4 py-3">5%</td>
              <td className="px-4 py-3">10% estático</td>
              <td className="px-4 py-3">4 por fase</td>
              <td className="px-4 py-3">Sem regra</td>
            </tr>
            <tr className="border-b border-border">
              <td className="px-4 py-3 text-foreground">FundedNext Express</td>
              <td className="px-4 py-3">3%</td>
              <td className="px-4 py-3">6% estático</td>
              <td className="px-4 py-3">2</td>
              <td className="px-4 py-3">Sem regra padrão</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-foreground">FundedNext Evaluation</td>
              <td className="px-4 py-3">5%</td>
              <td className="px-4 py-3">10% estático</td>
              <td className="px-4 py-3">5</td>
              <td className="px-4 py-3">Sem regra padrão</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>O que isso muda na prática</h2>
      <ul>
        <li>
          <strong>Drawdown trailing (FTMO 1-fase) é o mais rigoroso dos quatro</strong> — o teto
          sobe junto com seu lucro, então um dia muito bom hoje pode reduzir sua margem de erro
          amanhã. Programas com drawdown estático (FundedNext Express/Evaluation, FTMO 2-Step) dão
          mais previsibilidade: o limite não se move.
        </li>
        <li>
          <strong>FundedNext Express tem o drawdown mais apertado do grupo (6%)</strong> —
          compensado por dias mínimos bem baixos (2 dias) e sem exigência de consistência.
        </li>
        <li>
          <strong>Nenhum dos dois é "mais fácil" de forma genérica</strong> — depende de como você
          já opera. Quem segura posição por vários dias sofre mais com drawdown trailing; quem
          varia muito o tamanho do lote entre trades sofre mais com regra de consistência.
        </li>
      </ul>

      <h2>O ponto cego de todo mundo</h2>
      <p>
        Nenhuma dessas regras é complexa de <em>entender</em> — o problema é lembrar delas no meio
        de uma sessão de operação, sob pressão, quando o mercado está se movendo contra você. É
        exatamente aí que uma conta financiada é perdida: não por falta de estratégia, por uma
        regra mal calculada na hora H.
      </p>
      <p>
        O Fortify lê essas regras junto com o seu MT5 em tempo real e avisa antes da violação —
        para FTMO, FundedNext e as outras firmas já auditadas no catálogo.
      </p>

      <hr />
      <p className="text-sm text-muted-foreground">
        <em>
          Nota de compliance: este texto é puramente informativo sobre regras operacionais de cada
          programa — não constitui recomendação de investimento nem promessa de resultado.
        </em>
      </p>
    </>
  );
}
