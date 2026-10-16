# C05-G — sitemap legado isolado

Esta preparação mantém a Function `sitemap` no projeto legado `guiasys`, lendo
exclusivamente a coleção histórica `projects` e trocando somente o domínio
canônico para `https://guiasys.com.br`.

O pacote não exporta nenhuma outra Function. A publicação futura deve usar
obrigatoriamente a seleção completa abaixo para não incluir nem remover outras
Functions da codebase `default`:

```powershell
firebase deploy --project guiasys --config firebase.sitemap-legacy.json --only functions:default:sitemap --non-interactive
```

Não executar `firebase deploy` sem `--only functions:default:sitemap` usando
esta configuração.
