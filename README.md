# Quem É?! — v8

Nova identidade em **Flat Vector Art**: interface colorida, ilustrações vetoriais originais, tons suaves e componentes sem contornos/bordas. Todo o CSS visual foi refeito em `assets/flat.css` (não usa os arquivos antigos `style.css`/`comic.css`).

## Publicação

Faça upload **somente** dos arquivos deste ZIP para a raiz do repositório GitHub Pages. Preserve `.nojekyll`. Remova quaisquer CSS antigos do repositório para não manter arquivos descontinuados. O jogo pode ser publicado como frontend estático, sem etapa de build.

## O que permanece

- Partidas multiplayer com 2 a 5 participantes usando as funções/tabelas `qe_*` do mesmo Supabase.
- Host participa da partida; seleção de temas oficiais e temas personalizados; 16 itens no mínimo.
- 15, 30, 45, 60, 90, 120 segundos ou tempo livre por turno.
- Identidades individuais; eliminação reversível dos cards somente durante o próprio turno.
- Palpite com resultado por 5 segundos; ranking por ordem de acertos; revanche, novo jogo e encerramento.
- Admin em `admin.html`, sem link na home. Mídia oficial em Cloudflare R2 por URL; upload direto via Worker só depois de habilitar `quem-e` no Worker compartilhado. Imagens temporárias de temas personalizados ainda são comprimidas no navegador e armazenadas temporariamente nos dados da sala, como antes.

## Banco

**Não executar SQL novo.** O frontend mantém as funções `qe_*` da v5/v7. Essa versão não renomeia tabelas, não migra dados, não modifica o Worker e não acessa segredos privados.

## Validação

Fluxos e responsividade testados localmente no Chromium com Supabase **simulado** em resoluções 320×640, 390×844 e 844×390. Ainda é necessário validar a partida real com dois dispositivos conectados e testar os fluxos do painel admin com a conta autorizada no seu ambiente.
