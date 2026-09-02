# Failure Archetypes — Tessele

Recurring root-cause classes that already let a bug escape a plan in this project.
Read by the plan-hardening skill during Phase A: every entry's "Ask when planning"
question gets asked against every new feature.

Rules for adding entries:
- Record the class, never the specific bug.
- Add a new escape to an existing class instead of duplicating it.
- Keep the list short enough to remain useful.
- Promote only stack-agnostic classes to the global archetypes file.

## Fixed-height animated containers hide padding intrusion
- **Archetype:** an animated container with a fixed height can pass external overflow checks while its own content extends into the reserved padding area, because the content remains inside the outer border box.
- **Ask when planning:** when animated surfaces contain variable text, are their heights derived from intrinsic content and are assertions checking content bounds against the padding box rather than only checking overflow beyond the border box?
- **Escaped in:** differential card stack with viewport-constrained card heights (2026-07-16)

## Independent scroll controllers initialize against transient layout
- **Archetype:** independently loaded GSAP controllers can measure shared document geometry in different layout states, leaving one trigger stale even though each controller initializes correctly in isolation.
- **Ask when planning:** when one scroll phase changes the geometry used by another controller, what guarantees that every trigger measures the final activated layout regardless of module execution order, reload position, resize, or page transition?
- **Escaped in:** differential curtain and card track initialization order (2026-07-16)

## Optional framework lifecycle treated as universal
- **Archetype:** client code can wait forever for a framework lifecycle event when the integration that emits it is optional or absent, leaving the feature in its fallback state without an error.
- **Ask when planning:** for every framework lifecycle event the feature depends on, what enables that event in this app, and what equivalent browser lifecycle path activates and cleans up the feature when the integration is absent?
- **Escaped in:** friction curtain activation waiting on a client-routing lifecycle event the app never emitted (2026-07-16, earlier prototype)

## Handoff geométrico entre renderizações com progressos temporais diferentes
- **Archetype:** superfícies visualmente equivalentes podem ter a mesma geometria estática e ainda produzir sobreposição ou salto quando são renderizadas por controllers independentes, capturadas em progressos temporais diferentes ou trocadas em frames distintos.
- **Ask when planning:** qual controller é o dono do limite, como todas as superfícies são fixadas no mesmo progresso final antes da captura e qual atualização atômica garante que exatamente uma versão visual esteja visível ao atravessar ou reverter o handoff?
- **Escaped in:** troca entre a narrativa e os recortes da cortina de atrito (2026-07-16)

## Eventos de lifecycle reutilizados para fases diferentes
- **Archetype:** produtores e consumidores podem atribuir significados diferentes ao mesmo evento de lifecycle, fazendo uma etapa dependente começar no início da etapa anterior em vez de após sua conclusão.
- **Ask when planning:** para cada evento de lifecycle, qual transição única ele representa, quem o emite, quem o consome e qual estado observável prova que a etapa anterior terminou antes de liberar a próxima?
- **Escaped in:** entrada do Hero liberada no início do Brand Opener (2026-07-18)

## Reinicialização restaura o estado oculto de animações one-shot
- **Archetype:** um controller que inicializa imediatamente e novamente por eventos opcionais de framework pode reverter uma animação one-shot em andamento para o estado oculto inicial, mesmo quando cada caminho de inicialização funciona isoladamente.
- **Ask when planning:** para cada caminho de inicialização repetida, qual estado visual persiste entre cleanup e reinit, como a operação permanece idempotente durante uma animação em andamento e qual teste dispara os dois caminhos antes da animação terminar?
- **Escaped in:** Word Reveal da seção de atrito interrompido durante a reinicialização do controller (2026-07-18)

## Contrato reescrito perde uma garantia que ninguém declarou
- **Archetype:** substituir o arquivo de teste de um componente durante um refactor pode remover uma garantia que só existia ali, sem aparecer em lugar nenhum: a suíte fica verde, o diff mostra apenas "test: novo contrato", e a proteção some. É pior quando a garantia era sobre algo *visível ao usuário* (um selo, um aviso, um estado de erro) e o contrato novo aceita um substituto mais fraco — um comentário no código em vez de um elemento na tela.
- **Ask when planning:** ao substituir ou reescrever um arquivo de teste, quais asserções dele não têm equivalente no arquivo novo, e para cada uma: era uma garantia sobre comportamento observável? Rodar `git show <base>:<caminho do teste>` e conferir item por item antes de commitar, em vez de confiar em que o contrato novo cobre o mesmo terreno.
- **Escaped in:** o selo visível "Conteúdo de exemplo" exigido para prova social placeholder, perdido ao reescrever `proof-contract.test.mjs` na fase 4 do revamp (2026-08-20)

## Asserção sobre presença em vez de efeito
- **Archetype:** um teste que verifica se um token, classe ou propriedade *aparece* no fonte passa enquanto a construção não faz nada. `width: min(100%, var(--container-wide))` dentro de um contêiner mais estreito resolve para a largura do contêiner; `grid-template-columns: repeat(2, …)` com fluxo padrão preenche na direção errada. O código lê como se funcionasse e o verificador concorda.
- **Ask when planning:** para cada asserção que procura um nome, qual valor computado ou comportamento ela pretende garantir, e existe uma construção que satisfaz a asserção e falha a intenção? Se sim, asseverar o mecanismo — a margem negativa, a direção do fluxo, o valor derivado — e não o nome.
- **Escaped in:** `--container-wide` sem efeito nos dois cards largos, e o `ChecklistGrid` preenchendo row-major (2026-08-20)

## Trigger anexado a uma animação ainda vazia
- **Archetype:** anexar um scroll trigger no mesmo objeto de configuração que cria a timeline faz o trigger avaliar uma animação de duração zero. Zero lê como "já satisfeita", ele dispara na hora, e um `once: true` se mata em seguida. Os tweens adicionados depois entram numa timeline que ninguém está segurando e rodam imediatamente — a sequência acontece no load, fora da tela, e a seção já está no estado final quando o usuário chega. Nenhum erro aparece, e um tween único criado completo (`gsap.fromTo` com scrollTrigger) não sofre disso, então o padrão que funciona ao lado esconde o que quebra.
- **Ask when planning:** a animação está completamente populada no instante em que o trigger é criado? Se ela é montada em etapas, quem garante que ela nasce `paused: true` e que só um `onEnter` explícito a solta? Um teste que proíba `scrollTrigger` dentro do construtor da timeline vale mais que um que confira o `start`.
- **Escaped in:** revelação da seção how-we-work rodando no carregamento da página (2026-08-20)

## Guard de runtime que transforma um desvio cosmético em apagão
- **Archetype:** uma checagem defensiva que lança dentro do bloco que monta uma animação, envolvido por um try/catch que restaura o estado estático, converte um erro cosmético — um delay fora da spec — em nenhuma animação, sem nada na tela dizendo isso. Some com o guard e o pior caso é um tempo errado; mantenha o guard e o pior caso é a seção inteira parada. Pior ainda quando os valores comparados são somas de ponto flutuante: `0.4 + 0.2` não é `0.6`, então o guard reprova valores corretos.
- **Ask when planning:** essa checagem roda em runtime ou em teste? Se em runtime, qual é o pior caso quando ela dispara comparado ao pior caso do desvio que ela previne? Se o guard é mais destrutivo que o bug, ele pertence à suíte de testes. E qualquer comparação de igualdade entre floats derivados de soma precisa de inteiros ou tolerância.
- **Escaped in:** guard de delays do how-we-work reprovando 8 dos 18 valores gerados e impedindo toda a sequência (2026-08-20)

## Teste que confere presença passa por um valor que nunca é usado
- **Archetype:** já registrado como "asserção sobre presença em vez de efeito", e reincidiu numa forma nova e pior: os números da spec estavam no fonte — dentro do literal de um `Set` de validação — enquanto os valores realmente entregues à animação eram outros. O teste ficou verde durante uma falha total. Um valor pode estar presente no arquivo e não estar em nenhum caminho de execução.
- **Ask when planning:** o lugar onde a asserção encontra esse valor é o mesmo lugar de onde o runtime o lê? Se o dado pode existir em duas formas no mesmo arquivo — uma tabela e uma derivação, um literal e um cálculo — a asserção tem de casar com a que executa.
- **Escaped in:** contrato de motion do how-we-work verde com zero animação rodando (2026-08-20)

## Spec transplantada de uma ferramenta de autoria cujo viewport não existe no destino
- **Archetype:** um timeline exportado de uma ferramenta de autoria carrega as premissas de *visualização* dela, não só os valores. No canvas do Figma o frame inteiro está visível enquanto o timeline roda, então um delay de 2.1s é assistido; não existe dobra. Na página o mesmo frame é mais alto que a viewport, o trigger dispara com 20% dele na tela, e todo elemento cuja posição fica abaixo da dobra termina de animar fora de vista. A implementação fica fiel ao arquivo em cada valor e errada no único que importa: **a unidade de disparo.** Nada quebra, nenhum erro aparece, e a fidelidade ao frame é justamente o que produz o defeito — o que faz esse caso resistir a review, porque conferir valor por valor confirma tudo.
- **Ask when planning:** a região que essa animação cobre cabe na viewport no instante em que ela começa? Medir: altura do elemento disparador, altura da viewport, linha de start, e a posição de cada elemento animado nesse instante. Se algum elemento animado está abaixo da dobra quando o timeline começa, a unidade de disparo está grande demais — um trigger por grupo visual, e nenhum grupo mais alto que a tela. Vale para qualquer autoria → destino com scroll ou paginação, não só Figma → web.
- **Escaped in:** revelações de how-we-work e oferta, fiéis ao frame e invisíveis na página — 5 de 6 faixas da oferta terminavam entre 600 e 1200px abaixo da dobra (2026-08-20)

## Contrato rigoroso sobre um valor que não deveria existir
- **Archetype:** o inverso do "asserção sobre presença em vez de efeito", e mais difícil de ver. O teste estava no nível do efeito, comparava entrada por entrada, e travava exatamente o número que o runtime usava — rigor correto aplicado a uma decisão de design errada. O efeito é que o contrato passa a *defender* o defeito: mudar a coisa certa exige apagar asserções que parecem boas, e a pressão de "não enfraquecer um teste" empurra para manter o design ruim. Um teste só é uma garantia se o que ele fixa for uma propriedade que se quer preservar.
- **Ask when planning:** essa asserção fixa uma garantia observável ou uma escolha de implementação? Se a resposta for "o valor que decidimos usar", ela documenta uma decisão em vez de proteger um comportamento — e quando a decisão cair, apagá-la é a correção, não a fraqueza. Nomear no commit qual premissa morreu, para diferenciar de silenciar um teste que incomoda.
- **Escaped in:** `process-motion-contract` e `offer-motion-contract` fixando os delays absolutos do Figma entrada por entrada, retirados em 72c9ee2 (2026-08-20)

## Scroll container que recorta o eixo que ninguém declarou
- **Archetype:** declarar `overflow-x: auto` (ou `-y`) deixa o outro eixo em `visible`, e o CSS coage `visible` para `auto` quando o par não é visível. O elemento vira clipper num eixo que ninguém escolheu, e recorta no *padding box* tudo que pinta fora da caixa — sombra, focus ring, hover lift, tooltip, dropdown. Nada quebra: a caixa em si está certa, o layout mede certo, e o recorte aparece como uma aresta dura que parece decisão de design.
- **Ask when planning:** algum ancestral do elemento tem overflow não-visible? Para cada um, o que esse elemento pinta *fora* da própria caixa, e quanto? Medir o alcance (blur + spread ± offset de cada camada de sombra; a espessura do ring) contra o padding box do clipper, não contra a border box do elemento.
- **Escaped in:** `shadow-lifted` do card de depoimento cortada em 114px embaixo e 10px em cima pelo `.cases-rail`, que só declarava `overflow-x-auto` (2026-09-01)

## Espaço devolvido por margem negativa continua ocupado para hit-testing
- **Archetype:** padding adicionado para caber algo que pinta fora do conteúdo (sombra, ring) e devolvido com margem negativa mantém o *padding box* por cima dos irmãos seguintes. O layout fica correto — os irmãos posicionam onde deviam — mas o ponteiro sobre a sobreposição vai para a caixa que ganha o hit-test, e entre caixas não-posicionadas essa resolução **difere por engine**. Um navegador passa, outro engole o clique, e o teste que roda num só diz que está tudo bem.
- **Ask when planning:** toda margem negativa: que área ela faz sobrepor, o que é interativo ali dentro, e o que garante que o de cima é o de baixo na ordem de pintura? Elemento não-posicionado não garante nada — `position: relative` no irmão que precisa receber o clique, e o teste rodando em mais de uma engine.
- **Escaped in:** `-mb-space-32` no `.cases-rail` interceptando o clique nos dots no WebKit e não no Chromium (2026-09-01)

## Camada global de input reivindica eventos destinados a um controle aninhado
- **Archetype:** uma camada instalada no `window` para tratar input da página inteira — smooth scroll, atalho de teclado global, interceptador de gesto — cancela o evento antes do browser agir, e com isso engole também o input dirigido a um controle aninhado que já existia (um trilho horizontal, um slider, um campo). O sintoma raramente é "o controle não funciona": é o *outro* efeito, a página se movendo sozinha, porque o componente da direção que a camada entende continua sendo aplicado nela. Pior quando a camada *tem* uma válvula de escape que só abre num caso ideal — o Lenis se retira apenas quando `deltaY` é exatamente zero, e nenhum gesto real de trackpad é tão limpo, então a saída existe no código e nunca é atingida em uso.
- **Ask when planning:** ao adicionar qualquer handler global de input, quais controles da página já consomem esse mesmo evento, e o que decide quem fica com cada gesto? A condição de escape da camada é atingível por input humano ou só por input sintético? E ao corrigir do lado do controle: `onWheel`/`onTouchStart`/`onTouchMove` do React são registrados como **passive**, onde `preventDefault()` não faz nada e não avisa — precisa de `addEventListener` com `{ passive: false }` no elemento.
- **Escaped in:** Lenis (`SmoothScroll.tsx`) reivindicando o swipe lateral do `.cases-rail` — medido em 0px de trilho e 36px de página num gesto horizontal (2026-09-01)

## Altura independente da viewport alimentando o start de um scroll trigger
- **Archetype:** um trigger cujo `start` é derivado da posição de um elemento vizinho resolve para uma posição de scroll **negativa** quando o que vem antes dele é mais baixo que a viewport. O browser trava o scroll em zero; o `scrub` não trava o progresso — então a página carrega com a animação já em andamento, o leitor nunca vê os primeiros frames, e não há erro nenhum. A altura fixa que causa isso é escolhida olhando um device ("780px contra ~745px de dvh") e vira uma premissa sobre *todos* os outros. Sobrevive à review porque cada metade está certa isolada: a altura é uma decisão de design defensável, o trigger deriva o range do elemento certo em vez de repetir o comprimento em JS. E sobrevive à suíte porque os testes de movimento rodam numa geometria onde a conta fecha.
- **Ask when planning:** para cada `start` relativo ("top bottom", "top center"), qual elemento define essa posição, e o que garante que ela nunca fique acima do topo do documento? Medir: altura do elemento anterior contra a viewport, no menor e no maior viewport suportado. Toda altura que alimenta um trigger se expressa em unidade de viewport — `max(piso, 100dvh)` quando existe um piso a preservar — nunca em rem fixo com override só num breakpoint. E a asserção é sobre a geometria (`runwayTop - viewport >= 0`), não só sobre o estado renderizado, senão a falha não diz por quê.
- **Escaped in:** a Hero parando em `48.75rem` abaixo de `lg`, deixando a cortina 120px adiantada a 390×900 — conteúdo já em `opacity: 0.94` no load (2026-09-02)

## Preferência de acessibilidade colapsa um parâmetro para um valor degenerado
- **Archetype:** o ramo de `prefers-reduced-motion` costuma ser escrito como "o mesmo código, com a duração em zero" — e zero é exatamente o valor que quebra helpers otimizados para reuso, porque eles dividem pelo intervalo que deixou de existir. O resultado não é um erro: é `NaN` escrito numa propriedade CSS, e uma declaração CSS com um valor inválido é **descartada inteira e em silêncio**, devolvendo a página a um estado que ninguém desenhou (a máscara some e o que ela escondia aparece por completo). O ramo com preferência é também o que ninguém olha: um `gotoLanding` que roda tudo sob reduced motion cobre esse caminho e deixa o outro nu, ou o contrário — de qualquer forma, metade da feature é testada e a outra metade é presumida. Some-se que o primeiro valor costuma ser escrito à mão fora do helper, então o bug só aparece a partir da *segunda* interação, e a checagem manual passa.
- **Ask when planning:** para cada valor que a preferência de movimento zera: quem consome esse zero, e ele é um valor legítimo para esse consumidor ou uma divisão por zero disfarçada? Se o destino é CSS, o que acontece com a declaração inteira quando o valor sai inválido — some sozinha ou grita? E a suíte exercita os *dois* ramos da preferência, ou o default do harness escolheu um deles por você?
- **Escaped in:** `gsap.quickTo(..., { duration: 0 })` no `SpotlightGrid` escrevendo `--spotlight-x: NaNpx` a partir do segundo `pointermove`, derrubando o `mask` e revelando a grade inteira do hero — só para quem pede menos movimento (2026-09-01)
