# Medição de audiência com Umami — design

Data: 2026-09-04
Status: aprovado por Gabriel em 2026-09-04

## O problema

A página não tem nenhuma medição. GitHub Pages não expõe log de acesso ao dono do
repositório, então hoje não existe resposta para três perguntas:

1. Quantas pessoas passaram pela página.
2. Onde elas passaram a maior parte do tempo.
3. Se alguém clica no CTA do WhatsApp.

## A decisão: Umami Cloud, plano Hobby

Cookieless, script de ~2 kB, gratuito de forma permanente. Segundo os
comparativos consultados o Hobby dá ~100 mil eventos/mês, 3 sites e 6 meses de
retenção — a página de preços é renderizada em JS e não foi possível ler direto,
então os números exatos se confirmam no cadastro. O FAQ oficial confirma o
modelo de cota: cada pageview e cada evento customizado conta como um evento.

Alternativas descartadas e por quê:

- **Cloudflare Web Analytics** — gratuito e ilimitado, mas não tem evento
  customizado. Morre na pergunta 2.
- **Microsoft Clarity** — responde a pergunta 2 sozinho, com heatmap de atenção,
  e é gratuito. Descartado por exigir consentimento de cookie desde 31/10/2025:
  traz banner para uma landing cujo trabalho é a primeira impressão. Fica como
  ferramenta de um segundo momento, quando o número apontar *onde* investigar e
  a pergunta virar *por quê*.
- **Swetrix** — 2.500 eventos/mês no gratuito, apertado demais para o orçamento
  de eventos abaixo.
- **GoatCounter** — o gratuito é para uso não-comercial. A Tessele é empresa.
- **Plausible / Fathom / Simple Analytics** — sem tier gratuito real.
- **GA4** — cookie e consentimento como o Clarity, sem o heatmap que justificaria
  o custo, com script muito mais pesado.

## O que fica de fora, de propósito

- `data-performance` (Core Web Vitals). Consome cota e não responde a nenhuma das
  três perguntas.
- Funil, retenção, coorte. Não há volume que sustente.
- Eventos em abertura de FAQ, links do rodapé e escolha de plano. Entram depois,
  se o número mostrar que há tráfego para analisar.
- Variável de ambiente para o website-id. Ele é um identificador **público** —
  vai no HTML entregue — e o repositório já trata valor público assim: o número
  do WhatsApp está fixo em `src/lib/whatsapp.ts`. Uma env var exigiria variável
  de repositório no `deploy.yml` para proteger algo que não é segredo.

## Arquitetura

Cinco unidades, cada uma com uma responsabilidade.

### 1. `src/lib/analytics.ts` — a única porta para o fornecedor

Exporta `track(event: string, data?: Record<string, string | number>)`. Não faz
nada quando `window.umami` não existe: desenvolvimento, bloqueador de anúncio,
teste. Nenhuma seção importa o global do fornecedor, então trocar de ferramenta
é editar um arquivo.

### 2. A tag do script, em `src/app/layout.tsx`

`next/script` com `strategy="afterInteractive"`, que no export estático emite
uma tag no HTML. Atributos, todos verificados na doc do tracker:

- `data-website-id` — o UUID que o painel do Umami gera para o site.
- `data-do-not-track="true"` — respeita quem pediu para não ser rastreado.
  Postura coerente com o resto da página e custa um atributo.
- `data-domains="tessele.com.br"` — o tracker só roda nesse hostname. É o que
  impede `localhost` e qualquer preview de sujarem o dado, sem precisar de
  switch por ambiente.

### 3. `src/components/analytics/WhatsappClickTracker.tsx` — listener delegado

Todo CTA da página passa por `whatsappHref()` e vira um `<a href="https://wa.me/…">`.
São sete pontos de chamada (`Hero.tsx:216`, `OurProcessSection.tsx:361`,
`PricingSection.tsx:527` e `:638`, `ContactUsSection.tsx:547`,
`FooterSection.tsx:61`, e o da política). Em vez de instrumentar os sete, um
componente cliente escuta clique no `document`, casa `a[href^="https://wa.me/"]`
e emite `whatsapp-click` com a seção de origem, lida do
`[data-analytics-section]` mais próximo.

O motivo de escolher delegação e não um `<WhatsappCTA>` compartilhado: um CTA
novo no futuro é medido sem ninguém precisar lembrar de instrumentar.

Restrição que vem do arquétipo *"Camada global de input reivindica eventos
destinados a um controle aninhado"*: este listener não pode reivindicar nada.
Registra em fase de captura, nunca chama `preventDefault` nem
`stopPropagation`, e nunca depende do resultado do `track` para deixar a
navegação seguir. A página já tem uma camada global de input (`FocusRings`); a
nova não pode interferir nela.

### 4. `src/components/analytics/SectionTiming.tsx` — tempo por seção

Um ScrollTrigger por `[data-analytics-section]`, com `start: "top center"` e
`end: "bottom center"`: a seção está *ativa* enquanto cruza o centro da
viewport. A escolha do centro em vez de "visível na tela" é deliberada — com
"visível", duas seções contam tempo ao mesmo tempo na virada e a soma passa da
duração da visita, o que torna o ranking sem sentido. Pelo centro, exatamente
uma seção está ativa a cada instante e os intervalos particionam a visita.

Ao sair, acumula `performance.now()` e emite `section-view` com
`{ section, seconds }`. Emite **na saída**, não no fim da visita: flush em
`pagehide` é frágil e perderia o dado. Só a seção ativa no momento da saída
precisa do flush em `pagehide` e em `visibilitychange` → `hidden` (trocar de aba
não é leitura).

Regras de qualidade do dado:

- Abaixo de 1 segundo não emite. Scroll rápido não queima cota com ruído.
- `seconds` arredondado a uma decimal. A doc do Umami dá precisão máxima de 4
  para número em event data, então uma decimal é seguro.
- Cada saída emite o seu próprio intervalo; voltar para uma seção emite um
  segundo evento em vez de acumular no primeiro. O painel soma, o componente
  não carrega estado entre visitas à mesma seção, e reler uma seção é de fato
  mais tempo gasto nela.

Dois pontos que vêm direto do `docs/failure-archetypes.md`:

- *"Independent scroll controllers initialize against transient layout"* e
  *"Altura independente da viewport alimentando o start de um scroll trigger"*:
  na carga, o Hero já está cruzando o centro, então o trigger nasce depois do
  próprio `start`. A criação tem de consultar `isActive` de cada trigger e
  começar a contar a seção já ativa em t=0, em vez de esperar um `onEnter` que
  não vai vir. Vale também para recarregar a página no meio do scroll.
- *"Preferência de acessibilidade colapsa um parâmetro para um valor
  degenerado"*: `prefers-reduced-motion` **não** desliga este componente. Ele
  não anima nada, mede. O `AGENTS.md` exige caminho de movimento reduzido para
  seção animada; a regra não se aplica aqui, e isso está escrito para que uma
  revisão futura não "corrija" isso.

### 5. `data-analytics-section` nas seções

Um atributo em cada um dos dez `<section>` ativos: Hero, Quote, Problem,
OurProcess, Services, Pricing, AboutUs, FAQ, ContactUs, Footer.
`TestimonialsSection` está comentado em `src/app/page.tsx` e fica fora até
voltar.

A marcação hoje é inconsistente — `id="faq"` no FAQ, `data-name` no contato,
nada nos outros — então um atributo próprio e explícito é melhor que inferir por
posição ou reaproveitar `id`.

## Orçamento de eventos

Por visita completa: 1 pageview + até 10 `section-view` + 0 a 2
`whatsapp-click` ≈ 11 a 13 eventos. Com ~100 mil eventos/mês, isso comporta
cerca de 7.700 visitas/mês. Folga confortável para uma landing institucional
nova.

## Política de privacidade — o que muda

`src/app/privacidade/page.tsx` afirma hoje o contrário do que a página passará a
fazer, e o comentário no topo do arquivo já prevê este momento. Quatro edições:

1. **"O que este site coleta — e o que ele não coleta"**: substituir o parágrafo
   "Não usamos ferramentas de análise de audiência…" por uma descrição honesta —
   medição agregada de audiência, sem cookie, sem identificador persistente,
   sem perfil individual, com respeito ao Do Not Track do navegador. **E a frase
   "não registra o que você faz enquanto navega", no parágrafo anterior**, que a
   medição de tempo por seção torna falsa — encontrada na auto-revisão do plano,
   depois desta spec ter sido aprovada.

   Uma quarta edição, também encontrada depois: a seção **"Com base em quê
   tratamos esses dados"** lista as hipóteses legais, e o legítimo interesse
   precisa passar a mencionar a medição de audiência.
2. **"Cookies"**: a frase "este site não grava cookies" **continua verdadeira**,
   e é exatamente por isso que a ferramenta escolhida é cookieless. O ajuste é
   dizer que existe medição e que ela não usa cookie — não inverter a seção.

   **Verificar antes de escrever isso na política**, e não afirmar de memória:
   abrir a página com o tracker ativo e conferir na aba de rede e no
   armazenamento do navegador que o Umami não grava cookie nem escreve em
   `localStorage`. É a única frase deste design com consequência jurídica; se a
   verificação contrariar, a seção de cookies muda de sentido e a escolha da
   ferramenta volta para a mesa.
3. **"Com quem seus dados são compartilhados"**: acrescentar o Umami à lista de
   fornecedores, e a transferência internacional que ele implica.
4. `LAST_UPDATED` para a data em que isso for publicado.

Base legal: legítimo interesse. Sem dado pessoal, sem identificador entre sites
e sem cookie, não há consentimento a coletar e não entra banner.

## Testes

O `tests/layout/` mede o export construído. O arquétipo *"Asserção sobre
presença em vez de efeito"* — e sua reincidência, *"Teste que confere presença
passa por um valor que nunca é usado"* — proíbe o teste óbvio aqui: procurar a
tag do script no HTML passa verde enquanto nada é medido.

Os testes ficam no nível do efeito, em `tests/layout/analytics.spec.mjs`:

1. Substituir `window.umami` por um espião antes da carga, rolar a página de
   ponta a ponta e afirmar que cada uma das dez seções produziu um
   `section-view` com `seconds` positivo.
2. Afirmar que a soma dos `seconds` não passa da duração medida da visita — é o
   que prova a escolha do centro em vez de "visível", e falharia com sobreposição.
3. Clicar num CTA do WhatsApp com a navegação interceptada e afirmar um
   `whatsapp-click` com a seção de origem correta.
4. Afirmar que uma seção atravessada em menos de 1 segundo não emite evento.

Nível de presença, aceitável porque é configuração e não comportamento: o export
contém a tag com o `data-website-id` e o `data-domains`.

## Limitações conhecidas

- **Bloqueador de anúncio derruba o script.** Num export estático no GitHub
  Pages não existe proxy para contornar. A contagem fica subestimada, na faixa de
  10% a 30% dependendo do público. Serve para tendência e comparação relativa,
  não como número absoluto.
- **`seconds` mede tempo com a seção no centro da viewport**, não tempo de
  leitura. Uma pessoa que deixa a aba aberta e sai do computador não é
  distinguível durante o intervalo anterior ao `visibilitychange`.
- **Retenção de 6 meses** no plano gratuito. Comparação ano contra ano não
  existe.

## O que preciso do Gabriel para implementar

Uma coisa só, do painel do Umami Cloud depois de criar a conta e adicionar
`tessele.com.br`:

1. O **website ID** (UUID, formato `94db1cb1-74f4-4a40-ad6c-962362670409`).
2. O **src do script** que o painel mostrar no snippet, verbatim — para Umami
   Cloud costuma ser `https://cloud.umami.is/script.js`, mas vale copiar o que
   o painel der em vez de eu supor.
