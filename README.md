# Tessele

Landing page institucional da Tessele.

## Desenvolvimento

```sh
npm install
npm run dev
```

## Validação

```sh
npm run check
npm run build
```

## Publicação

O site é publicado automaticamente no GitHub Pages a cada push para `main`:

https://gabrielantony.github.io/tessele/

O projeto usa o subdiretório `/tessele/`; links e assets internos devem ser formados a partir de `import.meta.env.BASE_URL`, acrescentando a barra entre a base e o caminho.

A página é construída seção por seção. As convenções e comandos do projeto estão em [`AGENTS.md`](./AGENTS.md).
