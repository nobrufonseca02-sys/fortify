import json, sys, glob, os
S=os.path.dirname(os.path.abspath(__file__))
PT_COND = {
 'trading-pit-prime-futures-2026|best_day_vs_profit_target': 'Só no Challenge. Contas de 14/07/2026 em diante: meta = melhor dia ÷ 40%.',
 'trading-pit-prime-cfd-one-step-2026|best_day_vs_total_profit': 'Só contas de US$ 100 mil e US$ 200 mil criadas a partir de 06/07/2026.',
 'fundingpips-one-step-2026|best_day_vs_total_profit': 'Só no saque On Demand. Zera a cada saque.',
 'fundingpips-two-step-standard-2026|best_day_vs_total_profit': 'Só no saque On Demand. Zera a cada saque.',
 'fundingpips-two-step-standard-2026|profitable_days': 'Só no saque On Demand. Zera a cada saque.',
 'fundednext-stellar-two-step-2026|best_day_vs_total_profit': 'Só no saque On-Demand, que também pede 2% de crescimento.',
 'fundednext-stellar-two-step-2026|profitable_days': 'Só na opção de saque a cada 3 dias.',
 'the5ers-high-stakes-new-2026|profitable_days': 'Em cada fase.',
 'the5ers-high-stakes-classic-2026|profitable_days': 'Em cada fase.',
 'fxify-two-phase-classic-2026|best_day_vs_total_profit': 'Melhor dia não zera depois do saque.',
 'fxify-two-phase-pro-2026|daily_profit_cap': 'Passou de US$ 4.000 no dia, a conta trava até o dia seguinte.',
 'fxify-two-phase-pro-2026|profitable_days': 'Em cada fase e no funded.',
 'fxify-instant-funding-lite-2026|best_day_vs_total_profit': 'Melhor dia não zera depois do saque.',
 'fxify-lightning-2026|best_day_vs_total_profit': 'No Challenge e no funded. Melhor dia não zera depois do saque.',
 'e8-one-forex-2026|best_day_vs_total_profit': 'Conta só o ciclo de saque atual.',
 'e8-one-crypto-2026|best_day_vs_total_profit': 'Conta só o ciclo de saque atual.',
 'e8-pro-forex-2026|daily_profit_cap': 'No Challenge e no funded.',
 'e8-pro-crypto-2026|daily_profit_cap': 'No Challenge e no funded.',
 'e8-signature-forex-2026|best_day_vs_total_profit': 'Conta só o ciclo de saque atual.',
 'e8-signature-crypto-2026|best_day_vs_total_profit': 'Conta só o ciclo de saque atual.',
 'e8-signature-futures-2026|best_day_vs_total_profit': 'Conta só o ciclo de saque atual.',
 'e8-signature-forex-2026|profitable_days': 'Entre saques; não vale para o primeiro.',
 'e8-signature-crypto-2026|profitable_days': 'Entre saques; não vale para o primeiro.',
 'e8-signature-futures-2026|profitable_days': 'Entre saques; não vale para o primeiro.',
 'e8-zero-futures-starter-2026|best_day_vs_profit_target': 'Só no Challenge. Meta = melhor dia ÷ 40%.',
 'e8-zero-futures-max-2026|best_day_vs_profit_target': 'Só no Challenge. Meta = melhor dia ÷ 40%.',
 'alpha-capital-pro-10-2026|best_day_vs_total_profit': 'Só no saque On-Demand.',
 'alpha-capital-pro-8-2026|best_day_vs_total_profit': 'Só no saque On-Demand.',
 'alpha-capital-pro-6-2026|best_day_vs_total_profit': 'Só no saque On-Demand.',
 'alpha-capital-swing-2026|best_day_vs_total_profit': 'Sempre (o Swing só tem saque On-Demand).',
 'alpha-capital-one-2026|best_day_vs_total_profit': 'Só no saque On-Demand.',
 'alpha-capital-three-2026|best_day_vs_total_profit': 'Só no saque On-Demand.',

 'asap-funded-express|largest_trade_vs_net_profit': 'Trade Value Score. A mesa não define o ciclo.',
 'asap-instant-account|largest_trade_vs_net_profit': 'Trade Value Score. A mesa não define o ciclo.',
 'npfuture-standard-blackarrow|best_day_vs_total_profit': 'Na avaliação.',
 'npfuture-standard-mt5|best_day_vs_total_profit': 'Na avaliação.',
 'npfuture-funded-blackarrow|best_day_vs_total_profit': 'No saque.',
 'npfuture-funded-mt5|best_day_vs_total_profit': 'No saque.',
 'npfuture-flash-blackarrow|best_day_vs_total_profit': 'No saque.',
 'npfuture-flash-mt5|best_day_vs_total_profit': 'No saque.',
 'ftmo-challenge-1-step-2026|best_day_vs_total_profit': 'Ordens de 12/10/2026 em diante. Lucro total inclui dias negativos.',
 'apex-eod-evaluation-2026|best_day_vs_total_profit': 'Na conta PA, desde o último saque.',
 'apex-intraday-evaluation-2026|best_day_vs_total_profit': 'Na conta PA, desde o último saque.',
 'hantec-enhanced-2026|profitable_days': 'Na avaliação e em cada ciclo de saque.',
 'hantec-enhancedx-2026|best_day_vs_total_profit': 'No Challenge pode ser removida com add-on.',
 'topstep-trading-combine-2026|best_day_vs_profit_target': 'Só no Combine.',
 'topstep-trading-combine-2026|best_day_vs_total_profit': 'Só na XFA com o caminho de saque Consistency (3 dias).',
}
# 'other' que viram regra calculável
OTHER_AS = {'fxify-two-phase-pro-2026': ('daily_profit_cap', 'locks_trading')}
def ts(v):
    return json.dumps(v, ensure_ascii=False)
out=[]
programs=[]
for f in sorted(glob.glob(os.path.join(S,'..','docs','fortify','verificacao-regras-2026-11-12','result_*.json'))):
    programs += json.load(open(f,encoding='utf-8'))
entries=[]
for p in programs:
    clauses=[]
    for c in p.get('consistency') or []:
        kind=c.get('kind')
        effect=c.get('effect') or 'blocks_payout'
        if kind=='other' and p['programSlug'] in OTHER_AS:
            kind, effect = OTHER_AS[p['programSlug']]
        if kind in ('none','other',None): continue
        percent=c.get('percent'); amount=c.get('amount'); days=c.get('days')
        minpct=None
        if kind=='profitable_days':
            minpct=percent; percent=None
        if not isinstance(amount,(int,float)): amount=None
        quote=(c.get('quote') or '').split(' | ')[0].strip()[:300]
        clauses.append({
          'appliesTo': c.get('appliesTo') or 'both', 'kind': kind,
          'percent': percent, 'amount': amount, 'days': days if kind=='profitable_days' else None,
          'minDayProfitPercent': minpct, 'effect': effect,
          'condition': PT_COND.get(p['programSlug']+'|'+kind), 'estimated': not bool(c.get('precise')),
          'officialText': quote, 'sourceUrl': c.get('url') or '',
          '_conditionEn': c.get('condition') or '',
        })
    srcs=[x.get('url') for x in (p.get('sources') or []) if x.get('url')]
    doc=p.get('officialPdfUrl') or (srcs[0] if srcs else None)
    emb=str(p.get('embeddability') or '').lower()
    embeddable = ('embut' in emb) and ('não emb' not in emb) and ('nao emb' not in emb)
    # PDF em CDN costuma baixar em vez de abrir embutido: abre pelo botão.
    if doc and ('.pdf' in doc.lower() or 'cdn.' in doc.lower()): embeddable = False
    entries.append((p['programSlug'], p.get('programName'), p.get('programStillSold'), doc, clauses, embeddable))
lines=["// GERADO a partir da conferência nas fontes oficiais (pesquisa de 2026-11-12).",
"// Consistência estruturada por programa + documento oficial. Revisar à mão as",
"// condições em português (campo `condition`) a cada nova conferência.",
"import type { ConsistencyClause } from '../../../services/metaapi-gateway/src/ruleEngine/bindingTypes';","",
"export interface VerifiedProgramRules {","  verifiedAt: string;","  stillSold: boolean | null;","  officialDocumentUrl: string | null;","  /** A página/PDF oficial abre embutida (a mesa não bloqueia iframe). */","  embeddable: boolean;","  consistency: ConsistencyClause[];","}","",
"export const verifiedProgramRules: Record<string, VerifiedProgramRules> = {"]
for slug,name,sold,pdf,clauses,embeddable in entries:
    lines.append(f"  // {name}")
    lines.append(f"  {ts(slug)}: {{")
    lines.append(f"    verifiedAt: '2026-11-12',")
    lines.append(f"    stillSold: {ts(sold) if sold is not None else 'null'},")
    lines.append(f"    officialDocumentUrl: {ts(pdf) if pdf else 'null'},")
    lines.append(f"    embeddable: {'true' if embeddable else 'false'},")
    lines.append("    consistency: [")
    for c in clauses:
        en=c.pop('_conditionEn')
        if en: lines.append(f"      // fonte: {en[:150]}")
        body=', '.join(f"{k}: {ts(v) if v is not None else 'null'}" for k,v in c.items())
        lines.append(f"      {{ {body} }},")
    lines.append("    ],")
    lines.append("  },")
lines.append("};")
open(sys.argv[1],'w',encoding='utf-8').write('\n'.join(lines)+'\n')
print(len(entries),'programas')
