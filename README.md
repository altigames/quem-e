# Quem É?! v11.3 — Somente um chute

Atualização incremental sobre a v11.2. Mantém todos os arquivos, layouts, avatares e funcionalidades anteriores.

## Nova regra

- O host pode ativar **SOMENTE UM CHUTE** no lobby. Desligada por padrão.
- Se ativado, um jogador que errar o seu primeiro palpite será **ELIMINADO** da disputa. Não recebe novos turnos, não pode palpitar, passar ou editar o próprio tabuleiro.
- O jogador eliminado **permanece na sala** e pode acompanhar todas as abas, ver os jogadores e o tabuleiro de quem está na vez.
- No resultado final, será exibido como **ELIMINADO • PERDEU**, sem colocação.
- Quem acerta recebe posição no ranking normalmente. Quem ainda não terminou continua jogando até acertar ou ser eliminado.
- A partida termina quando não restam jogadores em disputa (todos classificados ou eliminados). Uma nova rodada remove os estados de eliminação.
- Se a configuração permanecer desativada, os erros continuam sem eliminar o jogador.

## Publicação

**ATENÇÃO — precisa da migração SQL:**

1. Fazer backup do projeto e do banco Supabase.
2. Executar `quem-e-v11.3-supabase.sql` (arquivo fornecido separadamente) no SQL Editor do Supabase, depois da migração v11.1.
3. Confirmar a execução sem erros.
4. Substituir arquivos no GitHub Pages pelo conteúdo do ZIP completo, ou pelo patch de quatro arquivos.
5. Recarregar a página sem cache. Criar uma **sala nova** e testar erro/certo com pelo menos dois navegadores.

**Não publique o frontend v11.3 antes da migração.** Ela cria as colunas `qe_rooms.one_guess_only` e `qe_players.eliminated`, adiciona a validação de palpite e ajusta a passagem de turno automática ao ignorar eliminados. Os nomes e imagens dos temas, as salas dos outros jogos e o Cloudflare R2 não são modificados.

Os testes de interface foram realizados com Supabase simulado; a migração **não foi executada no seu banco real** e deve ser validada após sua execução.
