# GuiaSys Studio — Site oficial

Site público da GuiaSys Studio.

- Domínio: https://www.guiasys.online/
- Estrutura inicial: site estático compatível com GitHub Pages
- Identidade: #019A98 e #18212D
- M01: fundação visual, páginas públicas e páginas iniciais de projetos
- M02: Firebase Web + Authentication + perfil completo no Firestore

## Estrutura
- `/` — Início
- `/projetos/` — Projetos
- `/projetos/guiacopy/` — GuiaCopy
- `/projetos/guiaplay/` — GuiaPlay
- `/sobre/` — Sobre
- `/contato/` — Contato
- `/login/` — Login
- `/cadastro/` — Cadastro
- `/conta/` — Área autenticada
- `/conta/perfil/` — Perfil completo do cliente
- `/admin/` — Painel administrativo (mensagens e visibilidade de projetos)

## Próximas etapas
Publicar `firestore.rules` no Firebase Console, cadastrar o primeiro administrador em `admins/{UID}` e validar mensagens/visibilidade de projetos. Depois: favoritos, carrinho, compras, licenças e PagBank.

## Administração
- O menu da conta mostra `Painel administrativo` somente quando `admins/{uid}.enabled == true`.
- Usuários comuns nunca recebem o item ADM no menu.
- O painel `/admin/` valida novamente a permissão antes de carregar dados.

## Projetos
- A visibilidade pública é controlada pelo ADM.
- Cada projeto pode usar de 1 até 3 categorias: Programa, Aplicativo e Site.
- Os filtros da página `/projetos/` usam as categorias configuradas no painel administrativo.
- Um projeto pode aparecer em mais de um filtro ao mesmo tempo.
