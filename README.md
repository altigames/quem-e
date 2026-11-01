# Quem É?! v11 — Pixel Arcade / AltiGames

Pacote do frontend estático pronto para **GitHub Pages**, sem dependências de build. **Esta versão requer migração SQL antes de publicar.**

## Novidades v11

- Até **12 participantes** (antes: 5), com rolagem da lista no lobby.
- Barra inferior da partida com **três ícones**, sem rótulos: Jogadores | **Home** (maior, central, amarelo) | Meu tabuleiro.
- **Home** acompanha o jogador ativo, o tempo e o tabuleiro real dele; só o dono edita. A identidade do jogador da vez é mostrada aos demais, mas **nunca ao próprio jogador antes do acerto**.
- **Jogadores** apresenta todos os nomes, avatares e identidades (a própria continua secreta).
- **Meu tabuleiro** mantém suas marcações disponíveis mesmo quando outro jogador está na vez. O host pode habilitar edição contínua nas configurações antes de jogar (desabilitada por padrão).
- Os X de cada jogador são sincronizados pelo Supabase via RPC, separados por jogador e por rodada. Não há acesso público direto à tabela de tabuleiros.
- **Passar** só funciona para o jogador da vez. O host não tem mais privilégio para passar o turno dos demais; a regra é validada no Supabase.
- Palpite, temporizador, avatares, admin, temas personalizados, revanche, novo jogo, ranking e layout Pixel Art da v10.1 preservados.

## Implantação obrigatória (ordem)

1. **Faça backup** do projeto Supabase e da versão atual do repositório.
2. Abra o **SQL Editor** do projeto Supabase atual e execute todo o arquivo separado `quem-e-v11-supabase.sql` fornecido com esta entrega. Esta migração altera somente objetos `qe_*`. Ao final, verifique que o SQL retornou 5 funções, 1 coluna e a tabela `qe_player_boards`.
3. Se o SQL apontar uma incompatibilidade de funções, **não publique a v11 ainda**: o arquivo realiza transação com rollback em caso de erro; compartilhe a mensagem exata para adaptar a migração à sua instalação.
4. Extraia o ZIP na raiz do repositório da versão v10.1; inclua `index.html`, `admin.html`, `.nojekyll`, `README.md` e `assets/`. Preserve o valor já configurado de `assets/config.js` no seu repositório se for diferente do arquivo de exemplo.
5. Publique no GitHub Pages e faça atualização sem cache (Ctrl+Shift+R no desktop ou janela privada no celular).
6. Teste com **2 a 3 dispositivos reais**: edição desabilitada, edição habilitada, sincronização de X, visualização de identidades e passagem de turno, depois uma sala de mais de 5 participantes.

## Regras e segurança

- A configuração é de **sala** e só pode ser alterada pelo **host no lobby**.
- A alteração de um X usa `qe_board_toggle` e exige token de sessão válido. O backend verifica sala, item e se o jogador tem direito a editar naquele momento.
- `qe_board_state` só retorna tabuleiros de participantes autenticados com token de sessão da mesma sala.
- A configuração habilitada **não** autoriza palpite, passagem de turno ou edição no tabuleiro de outra pessoa. O próprio turno continua controlando essas ações.
- Os tabuleiros são **temporários**: removidos quando a sala é excluída e reiniciados no próximo round; não são salvos como temas permanentes.
- A v11 não altera Cloudflare R2 nem o catálogo permanente.
- A página administrativa permanece fora da home, acessível por `admin.html` e autenticação existentes.

## Validação local

- `node --check assets/app.js` sem erros de sintaxe.
- Renderização/interação em Chromium com Supabase simulado para sala de 12 jogadores em 390×844 e 844×390: troca de abas, identidade própria oculta, host sem botão de passagem alheia, edição fora da vez desligada/ligada, marcação pela RPC simulada e lobby de 12 jogadores.
- **Migração SQL e Realtime reais ainda não testados no projeto de produção.** Execute SQL primeiro e valide a comunicação em dispositivos diferentes antes de adotar em uma partida real.
