# Publicação do beta com a rotina anterior

Versão autorizada pelo usuário após teste local e restauração da rotina completa. O site servido usa a build normal em `dist/`; as adaptações de arquivo HTML são exclusivas do gerador portátil.

- Destino configurado: Worker `missao-escola`, com integração da branch `main`.
- Comando de build: `npm run build`.
- Versão de código anterior: `795049ad012871dc417608aa08db5b1cd89fe852`.
- Referência de retorno: tag `pre-beta-rotina-original-2026-11-05`.
- Sem migração SQL, mudança de chave pública, configuração de secrets ou alteração da Edge Function do Tutor nesta publicação.
- Build e `npm test` passaram antes do envio. A interface restaurada, persistência, compromissos, conflitos de horários e demais fluxos do beta foram validados no navegador conforme `ROTINA-RESTAURADA.md`.

## Retorno ao código anterior

Para reimplantar o código anterior preservando o histórico da branch: reverta o commit da publicação e envie o revert à `main`. Pelo Cloudflare, também é possível selecionar uma implantação anterior disponível no histórico e restaurá-la. Uma restauração de código não altera dados ou secrets do Supabase.

Um push confirma o envio do código; a conclusão da implantação deve ser verificada no Cloudflare. Não use o estado do GitHub isoladamente como confirmação de que o site está no ar.
