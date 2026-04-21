# Mente Clínica: Perfil da Lombalgia

Aplicação web educacional em português do Brasil, inspirada no jogo Perfil, para mediação em sala de aula com foco no tema lombalgia.

## Stack

- React 18
- TypeScript
- Vite
- Zustand
- JSON local para cartas e desafios
- `localStorage` para persistência da partida

## Como rodar localmente

1. Instale o Node.js 18 ou superior.
2. No diretório do projeto, instale as dependências:

```bash
npm install
```

3. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

4. Abra o endereço exibido pelo Vite no navegador.

## Estrutura principal

- `src/App.tsx`: composição da aplicação e telas principais
- `src/store/useGameStore.ts`: estado global, regras do jogo, persistência e fluxos
- `src/components/`: componentes reutilizáveis da interface
- `src/data/cards.json`: banco de 44 cartas
- `src/data/challengeQuestions.json`: banco de 36 questões de desafio
- `src/types.ts`: tipagens centrais

## Fluxos implementados

- configuração inicial com 2 a 8 grupos
- 20 cartas simultâneas
- revelação de dicas na ordem visual `6 → 5 → 4 → 3 → 2 → 1`
- throttle de 1 segundo por carta
- resposta mediada manualmente
- substituição de cartas resolvidas por novas cartas inéditas
- cronômetro por turno
- módulo de desafio com seleção manual de grupos
- exportação e importação do estado da partida em JSON
- persistência automática em `localStorage`
- modo de demonstração

## Como trocar os bancos depois

- Para substituir cartas, edite `src/data/cards.json`.
- Para substituir desafios, edite `src/data/challengeQuestions.json`.
- A interface consome esses arquivos via store; não é necessário alterar os componentes se a estrutura for mantida.

## Observações

- O ambiente atual em que o projeto foi gerado não possui `node`/`npm` instalados, então a execução local não pôde ser validada aqui.
- Se desejar, o próximo passo pode ser instalar o ambiente Node e fazer uma rodada de validação com build e ajustes finos.
