# Quem É?! v10 — Pixel Arcade

Versão estática para GitHub Pages. Extraia o conteúdo deste ZIP na raiz do repositório. Não precisa de Node, compilação ou Worker local.

## Mudanças implementadas

- **Home:** novo background PNG com cubo de interrogação ampliado e centralizado, mantendo logo e botões HTML independentes.
- **Lobby do host:** código da sala sem duplicação; três ícones de compartilhamento em keycaps azuis; coroa simples em PNG transparente; clique no próprio avatar abre seleção de quatro personagens, com repetições permitidas.
- **Temas:** lista compacta de uma coluna com busca instantânea, rolagem interna, ícones Pixel Art em PNG e possibilidade de adicionar novos temas pelo admin sem alterar código.
- **Configuração:** botões `+` e `−` em estilo arcade; relógio Pixel Art PNG; tempo infinito em botão de largura total, símbolo infinito em PNG.
- **Lobby do jogador:** background exclusivo da nave, jogadores em fila com até cinco por linha, nomes sob os avatares, coroa acima do host, barra decorativa animada, botão vermelho para sair.
- **Partida:** turno sem moldura, cronômetro com moldura Pixel Art espessa e tabuleiro dimensionado pela área disponível, com cards de bordas mais grossas.
- **Palpite:** acontece no tabuleiro, sem popup de escolha. Todos os itens ficam em preto e branco; um toque colore apenas o item escolhido; ações viram Cancelar (vermelho) e Confirmar (verde). Itens já eliminados com X continuam elegíveis.
- **Resultado do palpite:** popup ornamentado e estrelado, variações de acerto (verde) e erro (vermelho mais apagado), nome/imagem do item e fechamento automático em 5 segundos.
- **Resultado final:** classificação compacta, posições em badges pixelados, avatares, nomes e itens no lugar de pontos. Mantém Jogar de novo / Novo jogo / Encerrar sala (host).

## Infraestrutura e dados

- **Supabase:** preservados o projeto, as tabelas, e as funções `qe_*` da v9. **Não há SQL adicional obrigatório** para essa versão.
- **Cloudflare R2:** as imagens das categorias são servidas pelas URLs cadastradas. Upload administrativo direto depende do Worker já aceitar `game=quem-e` e do CORS do domínio publicado.
- **Avatares personalizados:** escolha visual por partida guardada no `sessionStorage` do navegador e anunciada aos outros jogadores pelo canal Supabase Realtime (`avatar`/`avatar-hello`). Essa escolha **não é salva no banco**. Um visitante que não receber esses eventos poderá ver temporariamente o avatar padrão. As quatro opções podem se repetir.
- **Fontes:** Pixelify Sans e Press Start 2P carregadas do Google Fonts, com fallback do navegador.
- **Admin oculto:** `admin.html` continua disponível somente pelo endereço direto e login Supabase Auth existente; não aparece na home.

## Publicação

1. Faça backup da v9 do repositório.
2. Substitua os arquivos da raiz pelo conteúdo do ZIP. Mantenha `assets/config.js` com a URL e a chave **pública** existentes do Supabase.
3. Aguarde o GitHub Pages publicar; recarregue ignorando o cache.
4. Teste uma sala real com 2 a 5 celulares: avatar, tempo, palpite certo/errado, saída, revanche, novo jogo e encerramento.

## Validação

- Teste de sintaxe JavaScript com `node --check`.
- Testes de renderização e interação em Chromium com conteúdo injetado e Supabase simulado nas resoluções 320×640, 390×844 e 844×390: home, lobby host, seleção de avatar, catálogo, tabuleiro, entrada/saída do modo de palpite, popup de resultado e ranking.
- Teste visual adicional do lobby de jogador sem host.
- **Não foi possível testar diretamente no Supabase real**. A navegação do navegador automatizado a sites locais foi bloqueada pelo ambiente, por isso os testes foram feitos com HTML/CSS/JS injetados e dados simulados. Verifique o multiplayer e os assets após deploy.
