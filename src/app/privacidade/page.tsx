import type { Metadata } from "next";

import Link from "next/link";

import Wordmark from "@/components/ui/Wordmark";
import { whatsappHref } from "@/lib/whatsapp";

/*
 * The privacy policy, written straight into its route rather than into a
 * section component.
 *
 * `src/app/page.tsx` only stacks sections because the landing is a sequence of
 * independent, animated blocks that get reordered. This page is one continuous
 * legal document with no motion and no reordering, so splitting it into
 * sections/ would add a file without giving a reader anything.
 *
 * The copy describes what the site ACTUALLY does — no analytics, no cookies, a
 * form that only opens WhatsApp. If any of that changes, this page changes with
 * it, and so does the date below.
 */

const LAST_UPDATED = "4 de setembro de 2026";

export const metadata: Metadata = {
  title: "Política de Privacidade — Tessele",
  description:
    "Como a Tessele Estúdio trata os dados de quem visita este site e entra em contato.",
};

const privacyWhatsappHref = whatsappHref(
  "Olá! Tenho uma dúvida sobre privacidade e o tratamento dos meus dados.",
);

const linkClassName =
  "text-accent underline decoration-hairline underline-offset-4 transition-colors duration-(--duration-fast) ease-(--ease-out) hover:text-highlight-deep hover:decoration-highlight-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-highlight";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-space-4">
      <h2 className="text-heading-3 text-ink">{title}</h2>

      <div className="flex flex-col gap-space-4 text-body text-muted">
        {children}
      </div>
    </section>
  );
}

function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-space-2 pl-space-5">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export default function PrivacyPolicy() {
  return (
    <main className="bg-canvas">
      <header className="px-page pt-space-8">
        <div className="mx-auto flex w-full max-w-copy items-center justify-between gap-space-4">
          {/* The aspect ratio is the wordmark's own viewBox, so the box has no
              slack around the glyphs to throw the header's alignment off. */}
          <Link
            href="/"
            aria-label="Voltar para a página inicial da Tessele"
            className="block aspect-[685/123] h-space-5 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-highlight"
          >
            <Wordmark />
          </Link>

          <Link
            href="/"
            className="text-small-medium text-muted transition-colors duration-(--duration-fast) ease-(--ease-out) hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-highlight"
          >
            Voltar ao site
          </Link>
        </div>
      </header>

      <article className="px-page py-section">
        <div className="mx-auto flex w-full max-w-copy flex-col gap-space-12">
          <div className="flex flex-col gap-space-4">
            <p className="text-label uppercase text-muted">
              Última atualização: {LAST_UPDATED}
            </p>

            <h1 className="text-display text-ink">Política de Privacidade</h1>

            <p className="text-lead text-muted">
              Esta política explica quais dados a Tessele recebe quando você
              navega por este site ou entra em contato com a gente, o que
              fazemos com eles e quais são os seus direitos. Está escrita em
              português comum de propósito: uma política que ninguém consegue
              ler não protege ninguém.
            </p>
          </div>

          <Section title="Quem é responsável pelos seus dados">
            <p>
              A Tessele Estúdio, com sede em Curitiba, Paraná, é a controladora
              dos dados pessoais tratados por meio deste site. Controladora, na
              linguagem da Lei Geral de Proteção de Dados (Lei nº 13.709/2018),
              é quem decide por que e como os dados são tratados.
            </p>

            <p>
              Para qualquer assunto relacionado a esta política, fale com a
              gente pelo{" "}
              <a
                href={privacyWhatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClassName}
              >
                WhatsApp
              </a>
              .
            </p>
          </Section>

          <Section title="O que este site coleta — e o que ele não coleta">
            <p>
              Este site é uma página estática. Ele não tem banco de dados e não
              tem cadastro.
            </p>

            <p>
              Usamos uma ferramenta de medição de audiência chamada Umami, que
              conta os acessos à página e registra em quais partes dela as
              pessoas passam mais tempo. Ela funciona sem cookie e sem
              identificador que te acompanhe entre sites: o que fica registrado
              é a visita, não você. Não montamos perfil individual, não sabemos
              quem você é e não temos como ligar um acesso a uma pessoa.
            </p>

            <p>
              Se o seu navegador estiver configurado para pedir que não seja
              rastreado — a opção conhecida como &quot;Do Not Track&quot; —, essa
              medição não roda para você.
            </p>

            <p>
              Não usamos pixels de rastreamento nem cookies de publicidade.
            </p>

            <p>
              Como acontece com qualquer site na internet, o serviço que hospeda
              esta página registra automaticamente dados técnicos de acesso —
              endereço IP, tipo de navegador, data e hora da requisição. Esses
              registros pertencem ao provedor de hospedagem, existem para operar
              e proteger o serviço, e não temos acesso a eles de forma
              individualizada.
            </p>
          </Section>

          <Section title="Como funciona o formulário de contato">
            <p>
              O formulário deste site não envia nada para um servidor nosso.
              Quando você preenche nome, empresa, forma de contato e a descrição
              do seu momento e clica em enviar, o site monta essa mensagem e
              abre uma conversa no WhatsApp com o texto já escrito. Nada sai do
              seu dispositivo até você tocar em enviar dentro do WhatsApp.
            </p>

            <p>
              A partir daí, o que você nos mandou fica nessa conversa e passa a
              ser tratado como qualquer outro contato comercial: para responder,
              entender o que a sua empresa precisa e, se fizer sentido,
              apresentar uma proposta.
            </p>
          </Section>

          <Section title="Para que usamos os dados que você nos envia">
            <List
              items={[
                "Responder ao seu contato e conduzir a conversa comercial;",
                "Entender o contexto da sua empresa para propor o escopo certo;",
                "Elaborar e enviar propostas, contratos e documentos do projeto;",
                "Cumprir obrigações legais, contábeis e fiscais quando um contrato existe.",
              ]}
            />

            <p>
              Não vendemos, alugamos nem cedemos seus dados para terceiros, e
              não usamos seus dados de contato para disparo de marketing em
              massa.
            </p>
          </Section>

          <Section title="Com base em quê tratamos esses dados">
            <p>
              A LGPD exige uma hipótese legal para cada tratamento. As que se
              aplicam aqui são:
            </p>

            <List
              items={[
                "Consentimento, quando você escolhe nos enviar uma mensagem;",
                "Procedimentos preliminares a um contrato, para responder a um pedido de proposta;",
                "Execução de contrato, quando o projeto começa;",
                "Cumprimento de obrigação legal ou regulatória, para a guarda fiscal e contábil;",
                "Legítimo interesse, para medir a audiência do site de forma agregada, manter o registro dos contatos recebidos e proteger o serviço contra abuso.",
              ]}
            />
          </Section>

          <Section title="Com quem seus dados são compartilhados">
            <p>
              Compartilhamos apenas o necessário para prestar o serviço, e
              sempre com fornecedores que também têm obrigação de proteger esses
              dados:
            </p>

            <List
              items={[
                "WhatsApp (Meta Platforms), que é o canal onde a conversa acontece;",
                "O serviço de hospedagem que entrega esta página;",
                "As ferramentas que usamos para trabalhar — e-mail, armazenamento em nuvem, gestão de projetos e contabilidade;",
                "Umami, a ferramenta que mede a audiência deste site;",
                "Autoridades públicas, quando a lei ou uma ordem judicial exigir.",
              ]}
            />

            <p>
              Parte desses serviços é operada fora do Brasil, o que caracteriza
              transferência internacional de dados. A LGPD permite isso quando o
              país ou o fornecedor oferece nível de proteção compatível com o da
              lei brasileira, e esse é um dos critérios que usamos ao escolher
              as ferramentas.
            </p>
          </Section>

          <Section title="Cookies">
            <p>
              Este site não grava cookies. A medição de audiência descrita acima
              foi escolhida justamente por funcionar sem eles, e é por isso que
              não existe banner de cookies aqui: não há cookie a consentir.
            </p>

            <p>
              Se isso mudar — se um dia passarmos a usar cookies ou pixels de
              campanha —, esta política será atualizada antes, e a data no topo
              da página mudará junto.
            </p>
          </Section>

          <Section title="Por quanto tempo guardamos">
            <List
              items={[
                "Contatos que não viraram projeto: enquanto a conversa for útil ao relacionamento comercial, e apagamos assim que você pedir;",
                "Clientes: pelo prazo do contrato e pelos prazos legais de guarda que vêm depois dele — em regra, cinco anos para documentos fiscais e contábeis;",
                "Registros técnicos de acesso: pelo prazo definido pelo provedor de hospedagem.",
              ]}
            />
          </Section>

          <Section title="Dados dos seus clientes dentro dos projetos">
            <p>
              Quando um projeto nos dá acesso a dados de clientes ou usuários da
              sua empresa — uma base de contatos, o painel de uma campanha, o
              banco de dados de um site que desenvolvemos — a sua empresa
              continua sendo a controladora desses dados e a Tessele atua como
              operadora.
            </p>

            <p>
              Na prática: tratamos esses dados apenas conforme as instruções da
              sua empresa e pelo tempo do projeto, não os usamos para nenhuma
              finalidade própria, e devolvemos ou eliminamos os acessos ao fim
              do trabalho.
            </p>
          </Section>

          <Section title="Segurança">
            <p>
              Adotamos medidas razoáveis para proteger os dados que recebemos:
              acesso restrito às pessoas do time envolvidas no projeto,
              autenticação em duas etapas nas ferramentas que usamos e remoção
              dos acessos quando o trabalho termina.
            </p>

            <p>
              Nenhum sistema é totalmente imune, e não vamos prometer o
              contrário. Se um incidente relevante acontecer, comunicamos você e
              a Autoridade Nacional de Proteção de Dados (ANPD), como a lei
              exige.
            </p>
          </Section>

          <Section title="Seus direitos">
            <p>
              A LGPD garante a você, a qualquer momento e sem custo, o direito
              de:
            </p>

            <List
              items={[
                "Confirmar que tratamos dados seus e acessar esses dados;",
                "Corrigir dados incompletos, inexatos ou desatualizados;",
                "Pedir a anonimização, o bloqueio ou a eliminação de dados desnecessários ou tratados fora da lei;",
                "Pedir a portabilidade dos dados a outro fornecedor;",
                "Pedir a eliminação dos dados tratados com base no seu consentimento;",
                "Saber com quem compartilhamos seus dados;",
                "Revogar o consentimento a qualquer momento;",
                "Opor-se a um tratamento feito com base em legítimo interesse.",
              ]}
            />

            <p>
              Para exercer qualquer um deles, mande uma mensagem pelo{" "}
              <a
                href={privacyWhatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClassName}
              >
                WhatsApp
              </a>
              . Respondemos em até 15 dias. Podemos pedir alguma informação
              adicional apenas para confirmar que o pedido é mesmo seu — nunca
              para dificultá-lo.
            </p>
          </Section>

          <Section title="Crianças e adolescentes">
            <p>
              Este site é dirigido a empresas e profissionais. Não coletamos
              intencionalmente dados de crianças e adolescentes e, se
              identificarmos um dado assim, ele é eliminado.
            </p>
          </Section>

          <Section title="Mudanças nesta política">
            <p>
              Se a forma como tratamos dados mudar, atualizamos esta página e a
              data de última atualização no topo. Vale sempre a versão publicada
              aqui.
            </p>
          </Section>

          <Section title="Fale com a gente">
            <p>
              Dúvida, pedido ou reclamação sobre privacidade: fale com a Tessele
              pelo{" "}
              <a
                href={privacyWhatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClassName}
              >
                WhatsApp
              </a>
              . Você também pode registrar uma reclamação diretamente na
              Autoridade Nacional de Proteção de Dados (ANPD).
            </p>
          </Section>
        </div>
      </article>

      <footer
        aria-label="Rodapé"
        className="border-t border-hairline px-page py-space-8"
      >
        <div className="mx-auto flex w-full max-w-copy flex-col items-center justify-center gap-space-3 text-center text-small text-muted md:flex-row md:gap-space-8">
          <p>© 2026 Tessele Estúdio</p>

          <Link
            href="/"
            className="transition-colors duration-(--duration-fast) ease-(--ease-out) hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-highlight"
          >
            Voltar ao site
          </Link>
        </div>
      </footer>
    </main>
  );
}
