# Medição de audiência com Umami — Implementation Plan

> **For agentic workers:** este plano é executado pelo loop `/codex` — Claude
> escreve os testes e revisa o diff, Codex implementa. Uma fase por invocação do
> Codex, com gate do Gabriel entre fases. Codex **nunca** edita arquivo de teste.

**Goal:** medir quantas pessoas chegam à página, quanto tempo cada seção retém, e
se alguém clica no CTA do WhatsApp — sem cookie, sem banner e sem servidor.

**Architecture:** um único ponto de contato com o fornecedor (`src/lib/analytics.ts`),
dois componentes cliente globais que renderizam `null` (clique delegado e
cronômetro de seção), e um atributo `data-analytics-section` nas dez seções
ativas. Tudo é gated por uma constante pública: vazia, nada é medido e nada é
enviado.

**Tech Stack:** Next.js 16 (`output: "export"`), React 19, GSAP ScrollTrigger,
Umami Cloud (plano Hobby), Playwright contra o export construído.

**Spec:** `docs/superpowers/specs/2026-09-04-analytics-umami-design.md` — aprovada
pelo Gabriel em 2026-09-04. Ler antes de qualquer fase.

## Global Constraints

- **Export estático.** Sem route handler, sem server action, sem runtime Node.
  Nada que precise de servidor entra.
- **Caminhos de asset relativos.** `images/foo.jpg`, nunca `/images/foo.jpg`.
- **Só utilities, a partir de tokens.** Sem bloco `<style>`, sem `.css` ao lado
  de componente. Este plano não adiciona estilo nenhum.
- **Codex não edita arquivo de teste.** Nenhuma alteração em `tests/` por Codex,
  em nenhuma fase, por nenhum motivo. Se um teste parecer errado, parar e dizer
  qual e por quê, em vez de mexer nele.
- **Nenhuma checagem é silenciada.** Sem `// @ts-ignore`, `// @ts-expect-error`,
  `eslint-disable`, `test.skip`, `test.fixme` nem afrouxamento de limiar. Se o
  verde só for alcançável desligando algo, parar e dizer qual checagem teria de
  ser desligada.
- **Comentários e commits em inglês**, seguindo o tom dos arquivos existentes:
  explicam *por que* a decisão foi tomada, não o que a linha faz.
- **Comandos:** `npm run build`, `npm run lint`, `npm test`. Node >= 22.
- **Nomes das seções**, exatos, usados como valor de `data-analytics-section` e
  como chave no painel: `hero`, `citacao`, `problema`, `como-trabalhamos`,
  `servicos`, `planos`, `sobre-nos`, `faq`, `contato`, `rodape`.

---

## Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/analytics.ts` | Criar. A única porta para o fornecedor: as constantes de configuração e `track()`. |
| `src/components/analytics/WhatsappClickTracker.tsx` | Criar. Listener delegado de clique em link `wa.me`. Renderiza `null`. |
| `src/components/analytics/SectionTiming.tsx` | Criar. Um ScrollTrigger por seção, tempo no centro da viewport. Renderiza `null`. |
| `src/app/layout.tsx` | Modificar. Monta o script do Umami e os dois componentes. |
| As dez seções | Modificar. Um atributo `data-analytics-section` em cada. |
| `src/app/privacidade/page.tsx` | Modificar na fase 4. Três seções de texto e o `LAST_UPDATED`. |
| `tests/layout/analytics.spec.mjs` | Criar — **por Claude**, antes de cada handoff. Codex lê e não altera. |

### Por que `data-analytics-section` e não `data-name`

`data-name` já é seletor de teste em `tests/layout/sections/pricing.spec.mjs:5`
e `tests/layout/sections/services.spec.mjs:158`. Reaproveitá-lo acoplaria as
chaves do painel de analytics aos seletores da suíte: renomear uma seção no
painel quebraria testes de layout, e mudar um seletor de teste mudaria o dado
histórico. São dois eixos de mudança independentes, então são dois atributos.

### Por que `useEffect` e não `useGSAP`

`SectionTiming` segue o padrão dos outros dois componentes globais do projeto,
`src/components/FocusRings.tsx` e `src/components/SmoothScroll.tsx`: cliente,
renderiza `null`, `useEffect` com cleanup explícito. O `useGSAP({ scope })` que o
`AGENTS.md` exige existe para reverter animação dentro do próprio subtree do
componente; aqui não há animação para reverter e o componente não tem subtree.
O cleanup dos ScrollTriggers é feito à mão, e um teste cobre isso.

---

## Fase 1 — a porta do fornecedor, a tag do script e os atributos de seção

Depois desta fase a página **não mede nada**: `UMAMI_WEBSITE_ID` fica vazio, não
há script no HTML e `track()` não faz nada. A política de privacidade continua
correta e não é tocada. O que a fase entrega é a máquina desligada, testável.

**Files:**
- Create: `src/lib/analytics.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/sections/Hero.tsx:51` (abertura do `<section>`)
- Modify: `src/components/sections/QuoteSection.tsx:312`
- Modify: `src/components/sections/ProblemSection.tsx:535`
- Modify: `src/components/sections/OurProcessSection.tsx:276`
- Modify: `src/components/sections/ServicesSection.tsx:909`
- Modify: `src/components/sections/PricingSection.tsx:743`
- Modify: `src/components/sections/AboutUsSection.tsx:393`
- Modify: `src/components/sections/FAQSection.tsx:252`
- Modify: `src/components/sections/ContactUsSection.tsx:810`
- Modify: `src/components/sections/FooterSection.tsx:172` (é um `<footer>`, não um `<section>`)
- Test: `tests/layout/analytics.spec.mjs` — já commitado por Claude. **Não alterar.**

**Interfaces produzidas** (as fases 2 e 3 dependem destes nomes exatos):

```ts
export const UMAMI_WEBSITE_ID: string;      // "" = medição desligada
export const UMAMI_SCRIPT_SRC: string;
export const UMAMI_ALLOWED_DOMAIN: string;
export function track(event: string, data?: Record<string, string | number>): void;
```

- [ ] **Passo 1 — criar `src/lib/analytics.ts`**

```ts
/*
 * The single door to the audience-measurement vendor.
 *
 * Every event on this page goes through `track`, so no section ever touches the
 * vendor's global and swapping tools is editing this file. Same reason the
 * WhatsApp number lives in src/lib/whatsapp.ts instead of at seven call sites.
 */

/*
 * The website id the Umami dashboard issues for tessele.com.br.
 *
 * Public by design: it ships inside the delivered HTML, exactly like
 * WHATSAPP_NUMBER. It is not a secret and does not belong in an environment
 * variable -- that would mean a repository variable in deploy.yml to protect a
 * value the page hands to every visitor.
 *
 * Empty is the off switch, and it is load-bearing: with no id, layout.tsx
 * renders no script, window.umami never exists, and `track` below returns
 * silently. The privacy policy's claim that this site uses no audience
 * measurement is true exactly while this string is empty, and
 * tests/layout/analytics.spec.mjs is what holds those two files together.
 */
export const UMAMI_WEBSITE_ID = "";

// Verbatim from the snippet the Umami Cloud dashboard shows for the site.
export const UMAMI_SCRIPT_SRC = "https://cloud.umami.is/script.js";

/*
 * The one hostname the tracker may run on. This is what keeps localhost, the
 * Playwright run and any preview out of the data, without an environment switch
 * -- the tracker itself compares this against window.location.hostname.
 */
export const UMAMI_ALLOWED_DOMAIN = "tessele.com.br";

type EventData = Record<string, string | number>;

declare global {
  interface Window {
    umami?: { track: (event: string, data?: EventData) => void };
  }
}

/*
 * Fire and forget. A missing vendor is the normal case, not an error --
 * development, an ad blocker, a measurement that is simply off -- so this
 * returns silently instead of throwing from inside a click handler or a scroll
 * callback, where an exception would break the thing being measured.
 */
export function track(event: string, data?: EventData): void {
  window.umami?.track(event, data);
}
```

- [ ] **Passo 2 — montar o script em `src/app/layout.tsx`**

Importar `next/script` e as constantes, e renderizar a tag apenas quando houver
id. `strategy="afterInteractive"` emite uma tag no HTML do export; não somar
`defer` a ela, porque a estratégia já governa o carregamento.

```tsx
import Script from "next/script";

import {
  UMAMI_ALLOWED_DOMAIN,
  UMAMI_SCRIPT_SRC,
  UMAMI_WEBSITE_ID,
} from "@/lib/analytics";
```

Dentro de `<body>`, junto de `<FocusRings />` e `<SmoothScroll />`:

```tsx
{/*
  No id, no script, no measurement -- see the comment on UMAMI_WEBSITE_ID.
  `data-do-not-track` honours the browser preference, and `data-domains` is
  what keeps localhost and previews out of the numbers.
*/}
{UMAMI_WEBSITE_ID ? (
  <Script
    strategy="afterInteractive"
    src={UMAMI_SCRIPT_SRC}
    data-website-id={UMAMI_WEBSITE_ID}
    data-domains={UMAMI_ALLOWED_DOMAIN}
    data-do-not-track="true"
  />
) : null}
```

- [ ] **Passo 3 — adicionar `data-analytics-section` nas dez seções**

Um atributo por seção, na tag de abertura, com o valor exato da tabela de
Global Constraints. Não mexer em nenhum outro atributo, className, id ou
`data-name` existente. Não reordenar atributos já presentes.

| Arquivo | Linha da abertura | Valor |
|---|---|---|
| `Hero.tsx` | 51 | `hero` |
| `QuoteSection.tsx` | 312 | `citacao` |
| `ProblemSection.tsx` | 535 | `problema` |
| `OurProcessSection.tsx` | 276 | `como-trabalhamos` |
| `ServicesSection.tsx` | 909 | `servicos` |
| `PricingSection.tsx` | 743 | `planos` |
| `AboutUsSection.tsx` | 393 | `sobre-nos` |
| `FAQSection.tsx` | 252 | `faq` |
| `ContactUsSection.tsx` | 810 | `contato` |
| `FooterSection.tsx` | 172 | `rodape` |

`TestimonialsSection.tsx` fica **fora**: está comentado em `src/app/page.tsx` e
não é entregue. `ExampleMotionSection.tsx` também fica fora, é scaffolding.

- [ ] **Passo 4 — rodar as checagens**

```bash
npm run lint && npm run build
```

- [ ] **Passo 5 — rodar os testes da fase**

```bash
npx playwright test tests/layout/analytics.spec.mjs --project=chromium
```

Esperado: os testes do grupo `configuration` e `section markup` passam. Os
grupos `whatsapp click` e `section timing` ainda falham — são as fases 2 e 3.

- [ ] **Passo 6 — commitar**

```bash
git add src/lib/analytics.ts src/app/layout.tsx src/components/sections/
git commit -m "feat(analytics): the vendor door, the script tag and the section keys"
```

**Acceptance:**
- `UMAMI_WEBSITE_ID` é `""` e o export **não contém** nenhuma tag apontando para
  `cloud.umami.is`.
- As dez seções carregam `data-analytics-section` com os valores exatos, e não
  existe nenhum décimo-primeiro elemento com o atributo.
- `npm run lint` e `npm run build` passam.

**Fora de escopo nesta fase:** os dois componentes cliente, qualquer edição na
política de privacidade, e preencher o `UMAMI_WEBSITE_ID`. Também **não**
adicionar `data-performance` (Core Web Vitals): consome cota de eventos e não
responde a nenhuma das três perguntas — a omissão é decisão da spec, não
esquecimento.

---

## Fase 2 — clique no CTA do WhatsApp

**Files:**
- Create: `src/components/analytics/WhatsappClickTracker.tsx`
- Modify: `src/app/layout.tsx`
- Test: `tests/layout/analytics.spec.mjs`, grupo `whatsapp click`. **Não alterar.**

**Interfaces consumidas:** `track` de `@/lib/analytics`;
`data-analytics-section` das seções (fase 1).

- [ ] **Passo 1 — criar o componente**

```tsx
"use client";

import { useEffect } from "react";

import { track } from "@/lib/analytics";

/*
 * Records a click on any WhatsApp CTA, and which section it came from.
 *
 * Delegated rather than instrumented at the call sites, and that is the whole
 * point: there are seven of them today (Hero, Como trabalhamos, three plan
 * cards, por demanda, footer) and an eighth added next month is measured
 * without anyone remembering to wire it up. Every one of them is built by
 * whatsappHref(), so `https://wa.me/` is a reliable shape to match.
 *
 * This listener must never claim the event. Capture phase so it sees the click
 * before any handler can stopPropagation, but no preventDefault, no
 * stopPropagation, and no dependency on the send completing -- the page already
 * has one global input layer in FocusRings, and a second one that interfered
 * would break the anchors this exists to measure.
 */
export default function WhatsappClickTracker() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;

      const link = event.target.closest('a[href^="https://wa.me/"]');
      if (!link) return;

      /*
       * The privacy policy's WhatsApp link lives outside any measured section,
       * so a missing key is a real case rather than a bug -- naming it beats
       * dropping the event, because a click from there is still a click.
       */
      const section =
        link
          .closest("[data-analytics-section]")
          ?.getAttribute("data-analytics-section") ?? "fora-de-secao";

      track("whatsapp-click", { section });
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
```

- [ ] **Passo 2 — montar em `src/app/layout.tsx`**

Ao lado de `<FocusRings />` e `<SmoothScroll />`. Montar **sempre**, não só
quando houver id: sem `window.umami` o `track` já não faz nada, e montar
condicionalmente faria os testes exercitarem um caminho que não é o de produção.

- [ ] **Passo 3 — checagens e testes**

```bash
npm run lint && npm run build && npx playwright test tests/layout/analytics.spec.mjs --project=chromium
```

Esperado: `configuration`, `section markup` e `whatsapp click` passam.
`section timing` ainda falha.

- [ ] **Passo 4 — commitar**

```bash
git add src/components/analytics/WhatsappClickTracker.tsx src/app/layout.tsx
git commit -m "feat(analytics): record which section a WhatsApp CTA click came from"
```

**Acceptance:**
- Clicar num CTA emite exatamente um `whatsapp-click` com a seção de origem.
- O clique continua navegando: nada de `preventDefault` nem `stopPropagation`.
- Nenhum outro clique na página emite o evento.

---

## Fase 3 — tempo por seção

**Files:**
- Create: `src/components/analytics/SectionTiming.tsx`
- Modify: `src/app/layout.tsx`
- Test: `tests/layout/analytics.spec.mjs`, grupo `section timing`. **Não alterar.**

- [ ] **Passo 1 — criar o componente**

```tsx
"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { track } from "@/lib/analytics";

gsap.registerPlugin(ScrollTrigger);

/*
 * How long each section held the reader.
 *
 * A section is *active* while it crosses the viewport centre -- start "top
 * center", end "bottom center" -- and not while it is merely on screen. The
 * difference decides whether the number means anything: with "on screen", two
 * sections accrue time simultaneously at every boundary and the total exceeds
 * the visit, which makes the ranking useless. At the centre, exactly one
 * section is active at any instant and the intervals partition the visit. A
 * test asserts that sum, because it is the property that would rot silently.
 *
 * Emitted on leave, not at the end of the visit: a flush in `pagehide` is
 * unreliable and would lose the data. Only the section active at departure
 * needs the flush.
 */

// Below this, a section was scrolled past rather than read. Keeps the quota for
// signal instead of noise.
const MINIMUM_SECONDS = 1;

export default function SectionTiming() {
  useEffect(() => {
    const sections = gsap.utils.toArray<HTMLElement>("[data-analytics-section]");
    if (sections.length === 0) return;

    let active: string | null = null;
    let since = 0;

    const emit = () => {
      if (active === null) return;
      const seconds = (performance.now() - since) / 1000;
      if (seconds >= MINIMUM_SECONDS) {
        // Umami stores numbers with a max precision of 4, so one decimal is
        // safely inside what the vendor keeps.
        track("section-view", {
          section: active,
          seconds: Math.round(seconds * 10) / 10,
        });
      }
      active = null;
    };

    /*
     * Adjacent sections hand off at the same scroll position, so onEnter of the
     * new one and onLeave of the old one fire in an order this component does
     * not control. Keying the leave by name makes both orderings correct: enter
     * closes whatever was active, and a late leave for a section that is no
     * longer active is a no-op. Without the key, the late leave would cancel the
     * section that just started and its time would vanish.
     */
    const enter = (name: string) => {
      if (active === name) return;
      emit();
      active = name;
      since = performance.now();
    };

    const leave = (name: string) => {
      if (active !== name) return;
      emit();
    };

    const triggers = sections.map((section) => {
      const name = section.dataset.analyticsSection ?? "sem-nome";
      return ScrollTrigger.create({
        trigger: section,
        start: "top center",
        end: "bottom center",
        onEnter: () => enter(name),
        onEnterBack: () => enter(name),
        onLeave: () => leave(name),
        onLeaveBack: () => leave(name),
      });
    });

    /*
     * The section already crossing the centre at mount never gets an onEnter --
     * the trigger is created past its own start. On a fresh load that is the
     * Hero, and on a reload mid-page it is whatever the reader left off at, so
     * without this the most-read section of the visit is the one that goes
     * unmeasured. Same scan is reused when the tab comes back to the front.
     */
    const startFromLayout = () => {
      const current = triggers.find((trigger) => trigger.isActive);
      if (current) {
        enter(
          (current.trigger as HTMLElement).dataset.analyticsSection ?? "sem-nome",
        );
      }
    };

    startFromLayout();

    // A backgrounded tab is not reading. Close the interval on the way out and
    // open a fresh one on the way back, instead of counting the time away.
    const onVisibility = () => {
      if (document.visibilityState === "hidden") emit();
      else startFromLayout();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", emit);

    return () => {
      // Leaving the page is a leave. Flush before tearing anything down, or the
      // interval that was running is the one interval always lost.
      emit();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", emit);
      for (const trigger of triggers) trigger.kill();
    };
  }, []);

  return null;
}
```

- [ ] **Passo 2 — montar em `src/app/layout.tsx`**

Sempre montado, pelo mesmo motivo da fase 2.

**`prefers-reduced-motion` não desliga este componente.** Ele não anima nada,
mede. A regra do `AGENTS.md` sobre caminho de movimento reduzido vale para seção
animada e não se aplica aqui. Isso está escrito porque uma revisão futura
tenderia a "corrigir" a ausência do guard — e um teste roda sob movimento
reduzido justamente para travar isso.

- [ ] **Passo 3 — checagens e testes, nos três engines**

```bash
npm run lint && npm run build && npx playwright test tests/layout/analytics.spec.mjs
```

Esperado: os quatro grupos passam em `chromium`, `webkit` e `mobile-safari`.

- [ ] **Passo 4 — commitar**

```bash
git add src/components/analytics/SectionTiming.tsx src/app/layout.tsx
git commit -m "feat(analytics): time each section spent crossing the viewport centre"
```

**Acceptance:**
- Cada uma das dez seções produz um `section-view` com `seconds` positivo numa
  passada completa pela página.
- A soma dos `seconds` não passa da duração medida da visita.
- Uma seção atravessada em menos de 1 segundo não emite nada.
- A seção ativa no carregamento é contada desde t=0.
- Passa sob `prefers-reduced-motion: reduce`, que é o default do helper.

---

## Fase 4 — ligar: o id real e a política de privacidade

**Bloqueada até o Gabriel entregar dois valores** do painel do Umami Cloud:
o website id (UUID) e o `src` do script, verbatim. Esta fase é um único commit,
de propósito: o tracker e a política ligam juntos.

**Files:**
- Modify: `src/lib/analytics.ts` (as duas constantes)
- Modify: `src/app/privacidade/page.tsx` — quatro edições de copy mais o `LAST_UPDATED`
- Test: `tests/layout/analytics.spec.mjs`, grupo `policy agrees with the tracker`.

- [ ] **Passo 1 — preencher as constantes** com os valores que o Gabriel deu.

- [ ] **Passo 2 — aplicar a copy da política, verbatim**

A copy abaixo é escrita por Claude e revisada pelo Gabriel neste plano. Codex
**aplica o texto como está** e não reescreve, não resume e não "melhora" — é
texto com consequência jurídica, na voz de uma página que já foi escrita.
São **quatro** edições, não três: a auto-revisão do plano encontrou uma quarta
afirmação que a medição torna falsa.

**(a) `src/app/privacidade/page.tsx:132`** — a frase "não registra o que você faz
enquanto navega" passa a ser falsa e é a correção mais importante desta fase.
Substituir os dois primeiros parágrafos da seção "O que este site coleta — e o
que ele não coleta" por:

```
Este site é uma página estática. Ele não tem banco de dados e não tem cadastro.

Usamos uma ferramenta de medição de audiência chamada Umami, que conta os
acessos à página e registra em quais partes dela as pessoas passam mais tempo.
Ela funciona sem cookie e sem identificador que te acompanhe entre sites: o que
fica registrado é a visita, não você. Não montamos perfil individual, não
sabemos quem você é e não temos como ligar um acesso a uma pessoa.

Se o seu navegador estiver configurado para pedir que não seja rastreado — a
opção conhecida como "Do Not Track" —, essa medição não roda para você.

Não usamos pixels de rastreamento nem cookies de publicidade.
```

O terceiro parágrafo da seção, sobre os registros técnicos do provedor de
hospedagem, fica como está.

**(b) `src/app/privacidade/page.tsx:198`** — acrescentar a medição à hipótese de
legítimo interesse, na lista da seção "Com base em quê tratamos esses dados".
Substituir o item existente por:

```
"Legítimo interesse, para medir a audiência do site de forma agregada, manter o registro dos contatos recebidos e proteger o serviço contra abuso.",
```

**(c) `src/app/privacidade/page.tsx:215`** — acrescentar o fornecedor à lista da
seção "Com quem seus dados são compartilhados", **antes** do item das
autoridades públicas:

```
"Umami, a ferramenta que mede a audiência deste site;",
```

O parágrafo seguinte, sobre transferência internacional, já cobre o Umami sem
alteração — ele fala de "parte desses serviços" e não enumera.

**(d) `src/app/privacidade/page.tsx:230`** — a seção "Cookies". O segundo
parágrafo dela prevê literalmente este momento ("se um dia passarmos a usar
medição de audiência"), então ele muda. Substituir os dois parágrafos por:

```
Este site não grava cookies. A medição de audiência descrita acima foi escolhida
justamente por funcionar sem eles, e é por isso que não existe banner de cookies
aqui: não há cookie a consentir.

Se isso mudar — se um dia passarmos a usar cookies ou pixels de campanha —, esta
política será atualizada antes, e a data no topo da página mudará junto.
```

**(e)** `LAST_UPDATED` para a data em que a fase for commitada, no formato já
usado no arquivo (`"1º de setembro de 2026"`).

- [ ] **Passo 3 — checagens e a suíte inteira**

```bash
npm run lint && npm run build && npm test
```

- [ ] **Passo 4 — commitar**

```bash
git add src/lib/analytics.ts src/app/privacidade/page.tsx
git commit -m "feat(analytics): turn measurement on and say so in the privacy policy"
```

**Acceptance:**
- O export contém a tag com o `data-website-id` real, `data-domains` e
  `data-do-not-track`.
- A política não contém mais a frase que nega a medição, e nomeia o Umami.
- `npm test` passa nos três engines.

### Verificação que não é do Codex e não é automatizável aqui

`data-domains="tessele.com.br"` impede o tracker de rodar em localhost, então
**nenhum teste local pode observar o comportamento real do script.** Depois do
deploy, no domínio de produção, conferir na aba de rede e no armazenamento do
navegador que o Umami não grava cookie nem escreve em `localStorage`. É a única
frase deste trabalho com consequência jurídica e ela está sendo afirmada a
partir da documentação do fornecedor, não de medição. Se a verificação
contrariar, a seção de cookies muda de sentido e a escolha da ferramenta volta
para a mesa.

---

## Os testes

`tests/layout/analytics.spec.mjs` é escrito e commitado por **Claude** antes de
cada handoff, e o Codex apenas o lê. O arquivo é o artefato; este plano lista os
casos para que o Codex saiba o que precisa ser satisfeito sem ter de inferir.

O arquivo segue os idiomas da suíte: `gotoLanding` de
`tests/layout/sections/helpers.mjs`, movimento reduzido como default, e
constantes **duplicadas** em vez de importadas do código sob teste — a razão
está escrita em `tests/layout/ctas.spec.mjs:22`: um teste que importa o valor que
testa passaria com qualquer valor.

O espião entra por `page.addInitScript`, antes de qualquer JS da aplicação:
substitui `window.umami` por um coletor em `window.__events`. Isso é necessário
porque o script real nunca carrega em teste — `data-domains` o impede em
localhost — então sem o espião não haveria nada para observar.

**Grupo `configuration`** (fase 1)
1. Com `UMAMI_WEBSITE_ID` vazio, o export não contém nenhuma referência a
   `cloud.umami.is`. Com id preenchido, contém exatamente uma tag, com
   `data-domains="tessele.com.br"` e `data-do-not-track="true"`.

**Grupo `section markup`** (fase 1)
2. Exatamente dez elementos carregam `data-analytics-section`, e o conjunto de
   valores é igual à lista de Global Constraints — nem a mais, nem a menos.

**Grupo `whatsapp click`** (fase 2)
3. Clicar no CTA do Hero emite um `whatsapp-click` com `section: "hero"`.
4. Clicar no CTA do rodapé emite `section: "rodape"`.
5. Um clique em algo que não é link `wa.me` não emite nada.
6. Todo link `wa.me` abre em nova aba (`target="_blank"`). Não é decoração: em
   navegação na mesma aba o envio do evento pode ser cancelado no unload, então
   esta asserção é o que sustenta a entrega dos eventos acima.

**Grupo `section timing`** (fase 3)
7. Uma passada controlada pela página, com uma parada de ~1,5s no centro de cada
   seção, produz um `section-view` por seção, todos com `seconds > 0`.
8. A soma dos `seconds` não passa da duração de parede da sequência. É o que
   prova a escolha do centro em vez de "visível na tela", e falharia com
   sobreposição.
9. Uma seção atravessada em menos de 1 segundo não emite evento.
10. A seção ativa no carregamento (o Hero) aparece nos eventos mesmo sem nenhum
    `onEnter` — cobre o trigger criado depois do próprio `start`.
11. Voltar a uma seção já visitada emite um segundo evento, em vez de acumular
    no primeiro.
12. Tudo acima passa sob `prefers-reduced-motion: reduce`.

**Grupo `policy agrees with the tracker`** (fase 4)
13. Se o export tem a tag do Umami, `/privacidade/` **não** contém a frase que
    nega a medição, e **contém** o nome do fornecedor. Se não tem a tag, a
    negação é permitida. É o teste que impede os dois arquivos de divergirem, e
    a razão de a fase 4 ser um commit só.

### Arquétipos que decidiram estes testes

De `docs/failure-archetypes.md`, lidos antes de escrever a suíte:

- *"Asserção sobre presença em vez de efeito"* e *"Teste que confere presença
  passa por um valor que nunca é usado"*: proíbem o teste óbvio aqui — procurar
  a tag do script no HTML passaria verde com nada sendo medido. Daí os testes
  serem sobre eventos observados, com a presença da tag restrita ao caso 1, que
  é configuração e não comportamento.
- *"Independent scroll controllers initialize against transient layout"* e
  *"Altura independente da viewport alimentando o start de um scroll trigger"*:
  o caso 10.
- *"Camada global de input reivindica eventos destinados a um controle
  aninhado"*: os casos 5 e 6, e a proibição explícita de `preventDefault` no
  componente da fase 2.
- *"Preferência de acessibilidade colapsa um parâmetro para um valor
  degenerado"*: o caso 12.
