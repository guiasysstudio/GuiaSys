# GuiaSys Studio — site oficial

Site institucional e CMS da GuiaSys Studio, publicado exclusivamente no Firebase.

- Produção: <https://www.guiasys.online/>
- Projeto Firebase: `guiasys`
- Repositório: <https://github.com/guiasysstudio/GuiaSys>
- Stack: HTML, CSS e JavaScript modular; Firebase Authentication, Cloud Firestore, Storage, Hosting e Cloud Functions.

## Arquitetura

- `/` — Home institucional e projetos em destaque carregados do Firestore.
- `/projetos/` — catálogo dinâmico de projetos públicos.
- `/projetos/{slug}/` — página dinâmica de um projeto; não exige um HTML por projeto.
- `/admin/` — CMS protegido por `admins/{uid}.enabled == true`.
- `/conta/` e `/conta/perfil/` — conta autenticada e perfil do cliente.
- `contactMessages` — atendimento em tempo real no ADM.
- `projects/{slug}` — conteúdo administrável dos projetos.
- `projects/{slug}/...` no Storage — logo, banner e galeria.
- `sitemap` — Cloud Function que inclui somente projetos públicos.

Não há seed automático nem projetos hardcoded. Um ambiente novo começa com o catálogo vazio.

## Configuração e publicação

```powershell
npm --prefix functions install
firebase emulators:start
firebase deploy --project guiasys
```

Os arquivos `.firebaserc`, `firebase.json`, `firestore.rules`, `storage.rules` e `firestore.indexes.json` são a fonte de verdade da infraestrutura versionada. GitHub Pages e `CNAME` não fazem parte do fluxo de produção.

## Primeiro administrador

O usuário deve existir no Firebase Authentication. Crie manualmente o documento `admins/{UID}` com:

```json
{ "enabled": true }
```

As regras não permitem que clientes criem ou promovam administradores.

## Modelo de projeto

O CMS mantém nome, slug, logo, banner, galeria, descrições, categorias, plataformas, status, versão, requisitos, recursos, FAQ, links de download/suporte/licença, ordem, visibilidade, destaque na Home e metadados SEO.

Um projeto oculto não aparece na Home, catálogo, busca, contato, sitemap ou página individual. Campos vazios não geram seções ou ações públicas.
