# Entrelinhas — versão web com salas

## O que esta versão faz
- 3 a 12 jogadores.
- Até 2 espiões.
- O anfitrião cria uma **sala com código de 6 caracteres**.
- Jogadores entram pelo código e escolhem seus nomes.
- O anfitrião vê o lobby e espera até o número configurado de jogadores entrar.
- A partida **não começa automaticamente**: o anfitrião decide quando apertar `Iniciar partida`.
- Sorteia um dos 15 locais do material fornecido.
- Usa as profissões correspondentes ao local.
- Distribui exatamente uma carta por jogador.
- A carta é enviada diretamente para a conexão daquele jogador.
- O cronômetro usa um horário de início comum, calculado pelo anfitrião, para manter as telas sincronizadas.
- Conversa e votação continuam no Discord.

## Como usar
1. Hospede esta pasta em uma hospedagem de site estático com HTTPS.
2. Abra o site e escolha `Criar sala`.
3. Defina jogadores, espiões e duração.
4. Envie o código da sala no Discord.
5. Cada jogador escolhe um nome e entra com o código.
6. O anfitrião aguarda a sala ficar completa.
7. Clique em `Iniciar partida`.
8. Cada jogador recebe automaticamente sua carta e o cronômetro começa para todos.

## Importante sobre a conexão
Esta versão usa **PeerJS** para a conexão entre navegador do anfitrião e navegadores dos jogadores. Isso permite manter o projeto sem banco de dados próprio. O anfitrião precisa permanecer com a página aberta durante a partida.

Para produção em grande escala, recomenda-se posteriormente usar um servidor de sinalização/infraestrutura própria e uma camada de servidor para maior controle.

## Regra de quantidade
Cada local foi modelado com 10 profissões. Assim:
- 3–10 jogadores: 0–2 espiões, respeitando o limite de até 2.
- 11 jogadores: pelo menos 1 espião.
- 12 jogadores: 2 espiões.

O anfitrião não ocupa automaticamente uma vaga de jogador; ele é o controlador da sala. Se o anfitrião quiser jogar, pode entrar na sala usando outro dispositivo/navegador como jogador.

## Segurança
As cartas não ficam em um banco de dados central. Cada carta é enviada pela conexão P2P ao jogador correspondente. Ainda assim, isto não deve ser tratado como um sistema de segurança forte: quem tiver acesso ao dispositivo do jogador pode ver a carta.

## Imagens das cartas
A versão atualizada inclui `assets/cartas/` com as imagens das cartas extraídas do material original e `assets/folhas/` com as folhas completas de referência.


## Cartas visuais
As cartas dos jogadores usam as imagens extraídas do PDF original enviado para o projeto. Cada profissão aponta para sua imagem correspondente em `assets/cartas/`. As cartas de espião usam a arte original de ESPIÃO.
