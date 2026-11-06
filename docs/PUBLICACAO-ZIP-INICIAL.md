# Publicação da versão do ZIP inicial

Versão explicitamente selecionada pelo usuário na anotação da entrega local de aproximadamente 4,9 MB. Esta seleção é anterior à restauração da rotina completa; a publicação volta à rotina em três etapas conforme o pacote.

- Artefato: `missao-escola-beta-local-2026-11-05.zip`, disponível na pasta VERSÕES do repositório.
- SHA-256: `265cc58e3c5af9153fa8f5800ae8a3f4d0e8f4f077f8cf89f9189b6e4ae17d99`.
- Os arquivos do pacote foram conferidos pelo manifesto; os 98 arquivos da build recompilada correspondem byte a byte aos de `dist/` no ZIP.
- Destino configurado: Worker `missao-escola`, pela integração com a branch `main`.
- Código anterior preservado: `cbfb1660b2b7a1096f7006ae9b83cdc609410cbb`.
- Tag de retorno: `antes-zip-inicial-cbfb166`.
- Implantação anterior confirmada pelo Cloudflare: versão `20599256-7464-4f6a-88e6-578caecb59b6`.
- Não há alteração de banco de dados, execução de migração, edição de secrets ou troca da configuração do provedor de IA.

Os guias da restauração da rotina e da conversão em HTML descrevem entregas anteriores. Esta publicação segue o pacote inicial selecionado. O envio do código não comprova, sozinho, a conclusão da implantação: confirme o check `Workers Builds: missao-escola` correspondente ao commit no GitHub/Cloudflare.

Para retornar ao código anterior preservando o histórico, reverta o commit desta publicação e envie o revert à main, ou restaure a implantação anterior no Cloudflare. Um retorno de código não reverte dados do Supabase.
