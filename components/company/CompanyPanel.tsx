"use client";

import {
  ACTIONS_PER_QUARTER, CONTACTS, UNICORN, adjustedDevCost, canFly, debtUsd, devQuarters, fixedCostsPerQuarter, ipoEligibility,
  quarterLabel, rocketStatus, valuationUsd, type Company, type ContactId, type Mission,
} from "@/lib/company";
import { countryById } from "@/lib/countries";
import type { DesignAnalysis, RocketDesign } from "@/lib/design";
import { usd } from "@/lib/economics";
import { mass, num, ORBIT_SHORT } from "@/lib/format";
import { Button } from "../ui/Button";
import { InfoTip } from "../ui/InfoTip";
import { Stat } from "../ui/Stat";
import type { GlossaryKey } from "@/lib/glossary";
import { flag } from "./CompanySetup";

type Props = {
  company: Company;
  design: RocketDesign;
  analysis: DesignAnalysis;
  devCostUsd: number;
  missionCost: (m: Mission) => number;
  busy: boolean;
  onDevelop: () => void;
  onContact: (id: ContactId) => void;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onRepay: () => void;
  onLaunch: (m: Mission) => void;
  onIpo: () => void;
  onAdvance: () => void;
  onRestart: () => void;
  onOpenBuilder: () => void;
};

function Block({ title, info, children, aside }: { title: string; info?: GlossaryKey; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-line/40 pt-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="ds-label flex items-center gap-1.5">{title}{info && <InfoTip term={info} />}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Painel do simulador de empresa. Cada botão gasta uma das 3 ações do trimestre. */
export function CompanyPanel(p: Props) {
  const c = p.company;
  const country = countryById(c.countryId);
  const val = valuationUsd(c);
  const program = rocketStatus(c, p.design);
  const noActions = c.actionsLeft <= 0 || c.bankrupt;
  const ipo = ipoEligibility(c);
  const devCost = adjustedDevCost(p.devCostUsd, c.countryId);
  const installments = c.programs.filter((x) => x.quartersLeft > 0).reduce((a, x) => a + (x.devCostUsd - x.paidUsd) / x.quartersLeft, 0);
  const interest = c.loans.reduce((a, l) => a + (l.balanceUsd * l.ratePct) / 100, 0);
  const nextBill = installments + fixedCostsPerQuarter(c) + interest;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{flag(c.countryId)} {c.name}</p>
          <p className="text-xs text-ink-muted">{quarterLabel(c.quarter)} · {country.site}</p>
        </div>
        <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${c.status === "public" ? "bg-peach/20 text-peach" : "bg-primary/15 text-primary"}`}>
          {c.status === "public" ? "Capital aberto" : "Privada"} <InfoTip term="privatePublic" />
        </span>
      </div>

      {c.bankrupt && (
        <div className="rounded-2xl bg-danger/15 px-4 py-3 ring-1 ring-danger/50">
          <p className="font-semibold text-danger">Falência</p>
          <p className="mt-1 text-xs text-ink-muted">O dinheiro acabou. Foguetes caros precisam de investidores ou de missões pagando antes que o caixa zere.</p>
          <Button onClick={p.onRestart} className="mt-3 w-full">Fundar outra empresa</Button>
        </div>
      )}
      {c.unicornReached && !c.bankrupt && (
        <div className="rounded-2xl bg-primary/15 px-4 py-3 ring-1 ring-primary/50">
          <p className="font-semibold text-primary">🦄 Unicórnio espacial!</p>
          <p className="mt-1 text-xs text-ink-muted">A empresa passou de {usd(UNICORN)}. Poucas empresas reais chegam aqui.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Dinheiro em caixa" value={usd(c.cashUsd)} tone={c.cashUsd < nextBill ? "bad" : undefined} sub={debtUsd(c) ? `dívida ${usd(debtUsd(c))}` : "sem dívidas"} info="fixedCosts" />
        <Stat label="Valor da empresa" value={usd(val)} tone={val >= UNICORN ? "ok" : undefined} sub={`meta: ${usd(UNICORN)}`} info="valuation" />
        <Stat label="Sua parte" value={`${num(c.founderPct, 1)}%`} sub={`vale ${usd((val * c.founderPct) / 100)}`} info="founderPct" />
        <div className="rounded-2xl bg-bg-deep/50 px-3 py-2.5">
          <p className="flex items-center gap-1 text-[10px] tracking-widest text-ink-faint uppercase">Reputação <InfoTip term="reputation" /></p>
          <p className="text-base font-semibold tabular-nums">{Math.round(c.reputation)}/100</p>
          <div className="mt-1 h-1.5 rounded-full bg-surface"><div className="ds-gradient-primary h-full rounded-full" style={{ width: `${c.reputation}%` }} /></div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-bg-deep/40 px-4 py-3">
        <span className="flex items-center gap-1.5 text-xs text-ink-muted">Ações neste trimestre <InfoTip term="actions" /></span>
        <span className="flex gap-1.5" aria-label={`${c.actionsLeft} de ${ACTIONS_PER_QUARTER} ações`}>
          {Array.from({ length: ACTIONS_PER_QUARTER }, (_, i) => (
            <span key={i} className={`size-3 rounded-full ${i < c.actionsLeft ? "ds-gradient-primary shadow-[var(--shadow-glow)]" : "bg-surface-3"}`} />
          ))}
        </span>
      </div>

      <div className="rounded-2xl bg-surface/50 px-4 py-3">
        <p className="text-[10px] tracking-widest text-ink-faint uppercase">Cenário do mercado</p>
        <p className="font-semibold">{c.event.title}</p>
        <p className="text-xs text-ink-muted">{c.event.text}</p>
      </div>

      <Block title="Seu foguete" info="development">
        <div className="rounded-2xl bg-bg-deep/40 p-3.5 text-sm">
          <p className="font-semibold">{p.design.name}</p>
          <p className="text-xs text-ink-muted">Leva até {mass(p.analysis.maxPayload.LEO)} para órbita baixa · {mass(p.analysis.maxPayload.GTO)} GTO · {mass(p.analysis.maxPayload.Moon)} Lua</p>
          {!program && (
            <>
              <p className="mt-2 text-xs text-ink-muted">
                Desenvolver custa ~<strong className="text-ink">{usd(devCost)}</strong> em {devQuarters(devCost)} trimestre(s), pagos aos poucos.
                {devCost > c.cashUsd && <span className="text-coral"> É mais do que você tem: vai precisar de investidores.</span>}
              </p>
              <div className="mt-3 flex gap-2">
                <Button className="!h-10 flex-1 !text-[11px]" disabled={noActions || p.busy} onClick={p.onDevelop}>Desenvolver</Button>
                <Button variant="ghost" className="!h-10 !text-[11px]" onClick={p.onOpenBuilder}>Mudar o projeto</Button>
              </div>
            </>
          )}
          {program && program.quartersLeft > 0 && (
            <p className="mt-2 text-xs text-peach">Em desenvolvimento: pronto em {program.quartersLeft} trimestre(s). Já pago: {usd(program.paidUsd)} de {usd(program.devCostUsd)}.</p>
          )}
          {program && program.quartersLeft === 0 && <p className="mt-2 text-xs text-primary">✓ Pronto para voar.</p>}
        </div>
      </Block>

      <Block title="Missões disponíveis" info="missions">
        <ul className="space-y-2">
          {c.missions.map((m) => {
            const check = canFly(c, p.design, p.analysis.maxPayload, m);
            const cost = p.missionCost(m);
            return (
              <li key={m.id} className="rounded-2xl bg-bg-deep/40 p-3.5">
                <div className="flex justify-between gap-2">
                  <p className="text-sm font-semibold">{m.client}</p>
                  <p className="text-sm font-semibold text-primary">{usd(m.paymentUsd * (1 + country.missionBonus))}</p>
                </div>
                <p className="text-xs text-ink-muted">{m.description} · {mass(m.payloadKg)} para {ORBIT_SHORT[m.orbit]}</p>
                <p className="mt-1 text-[11px] text-ink-faint">Cliente paga {usd(m.paymentUsd)} + incentivo de {num(country.missionBonus * 100)}% · lançamento custa {usd(cost)}</p>
                <Button className="mt-2 !h-9 w-full !text-[11px]" disabled={!check.ok || noActions || p.busy} onClick={() => p.onLaunch(m)}>
                  {check.ok ? "🚀 Lançar missão" : check.reason}
                </Button>
              </li>
            );
          })}
        </ul>
      </Block>

      <Block title="Contatos" info="contacts">
        <ul className="space-y-2">
          {(Object.keys(CONTACTS) as ContactId[]).map((id) => {
            const ct = CONTACTS[id];
            const locked = c.reputation < ct.minReputation;
            return (
              <li key={id} className="flex items-center gap-3 rounded-2xl bg-bg-deep/40 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{ct.name}</p>
                  <p className="text-[11px] leading-snug text-ink-muted">{ct.text}</p>
                  {locked && <p className="text-[11px] text-coral">Precisa de reputação {ct.minReputation}.</p>}
                </div>
                <Button variant="ghost" className="!h-9 shrink-0 !px-3 !text-[11px]" disabled={locked || noActions || c.cashUsd < ct.costUsd || p.busy} onClick={() => p.onContact(id)}>
                  {usd(ct.costUsd)}
                </Button>
              </li>
            );
          })}
        </ul>
      </Block>

      {c.offers.length > 0 && (
        <Block title="Ofertas na mesa" info={c.offers[0].kind === "loan" ? "loan" : c.offers[0].kind === "grant" ? "government" : "investors"}>
          <ul className="space-y-2">
            {c.offers.map((o) => (
              <li key={o.id} className="rounded-2xl bg-peach/10 p-3.5 ring-1 ring-peach/40">
                <p className="text-sm font-semibold">{o.from} <span className="font-normal text-ink-faint">· {o.kind === "equity" ? "investimento" : o.kind === "grant" ? "contrato do governo" : "empréstimo"}</span></p>
                <p className="mt-1 text-xs text-ink">{o.text}</p>
                {o.kind === "equity" && (
                  <p className="mt-1 text-[11px] text-ink-faint">Sua parte iria de {num(c.founderPct, 1)}% para {num(c.founderPct * (1 - (o.equityPct ?? 0) / 100), 1)}%.</p>
                )}
                <p className="text-[11px] text-ink-faint">Vale até {quarterLabel(o.expiresQuarter - 1)}.</p>
                <div className="mt-2 flex gap-2">
                  <Button className="!h-9 flex-1 !text-[11px]" onClick={() => p.onAccept(o.id)} disabled={p.busy}>Aceitar</Button>
                  <Button variant="ghost" className="!h-9 flex-1 !text-[11px]" onClick={() => p.onDecline(o.id)} disabled={p.busy}>Recusar</Button>
                </div>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {(c.loans.length > 0 || c.obligations.length > 0) && (
        <Block title="Compromissos" info="loan" aside={c.loans.length > 0 && <button type="button" onClick={p.onRepay} className="text-xs text-primary hover:underline">Quitar dívidas</button>}>
          <ul className="space-y-1.5 text-xs">
            {c.loans.map((l, i) => <li key={i} className="text-ink-muted">🏦 {l.from}: {usd(l.balanceUsd)} a {num(l.ratePct, 1)}%/trimestre</li>)}
            {c.obligations.map((o) => (
              <li key={o.id} className="text-ink-muted">
                🏛️ {o.from}: {Math.min(o.requiredSuccesses, c.successes - o.successesAtStart)}/{o.requiredSuccesses} missões até {quarterLabel(o.deadlineQuarter)}
              </li>
            ))}
          </ul>
        </Block>
      )}

      <Block title="Abrir capital (IPO)" info="privatePublic">
        {c.status === "public" ? (
          <p className="text-xs text-ink-muted">Sua empresa está na bolsa. Os acionistas esperam missões todo trimestre.</p>
        ) : ipo.ok ? (
          <Button onClick={p.onIpo} className="w-full" disabled={p.busy}>Abrir capital: vender 20% na bolsa</Button>
        ) : (
          <ul className="space-y-1 text-xs text-ink-muted">{ipo.reasons.map((r) => <li key={r}>• {r}</li>)}</ul>
        )}
      </Block>

      <div className="space-y-2 border-t border-line/40 pt-4">
        <p className="text-xs text-ink-muted">
          Ao avançar: paga {usd(nextBill)} (custos fixos {usd(fixedCostsPerQuarter(c))}{installments > 0 ? `, desenvolvimento ${usd(installments)}` : ""}{interest > 0 ? `, juros ${usd(interest)}` : ""}).
        </p>
        <Button onClick={p.onAdvance} className="w-full" disabled={c.bankrupt || p.busy}>Avançar para {quarterLabel(c.quarter + 1)} ▸</Button>
      </div>

      <Block title="Diário da empresa">
        <ol className="space-y-1.5 text-xs">
          {c.log.slice(0, 10).map((l, i) => (
            <li key={i} className="flex gap-2">
              <span className="w-16 shrink-0 text-ink-faint">{quarterLabel(l.quarter)}</span>
              <span className={l.kind === "good" ? "text-primary" : l.kind === "bad" ? "text-coral" : "text-ink-muted"}>{l.text}</span>
            </li>
          ))}
        </ol>
        <button type="button" onClick={p.onRestart} className="text-[11px] text-ink-faint hover:text-coral">Fechar a empresa e começar outra</button>
      </Block>
    </div>
  );
}
