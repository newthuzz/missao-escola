# Missão Escola — teste local do beta

Esta versão foi preparada para avaliação. Não foi enviada ao GitHub nem publicada no Cloudflare.

## Abrir no Windows

1. Instale o **Node.js 20 ou superior**, se ainda não tiver.
2. Extraia todo o ZIP para uma pasta.
3. Abra **INICIAR-LOCAL.bat**. Mantenha a janela aberta enquanto testa.
4. Acesse **http://localhost:4173** no Chrome ou Opera. Se abrir antes de o servidor iniciar, atualize a página.

No macOS/Linux ou no terminal do Windows, entre na pasta extraída e execute `node scripts/serve-local.mjs`. Para encerrar, pressione Ctrl+C. Não é preciso rodar npm install para visualizar esta build: os arquivos públicos já estão em `dist/`.

Não abra index.html com duplo clique: os módulos e as rotas precisam do servidor local. Use sempre a mesma porta e o mesmo navegador para manter os estudos salvos. Para testar o primeiro acesso novamente, use uma janela anônima. Os dados locais deste endereço são separados dos dados locais do site público.

## Roteiro de teste

- Na primeira visita, escolha seu ano. Confira se a escolha permanece ao atualizar.
- Escolha uma matéria e comece. Abrir o estudo não dá pontos.
- Leia o exemplo e clique em “Entendi, ir para a prática”.
- Responda uma questão, saia para Início e use “Continuar estudo”. Deve abrir a questão pendente.
- Erre uma alternativa e atualize: a tentativa e o uso de apoio devem permanecer.
- Responda a última questão: a conclusão deve aparecer automaticamente.
- Atualize e reveja questões. Não deve haver XP duplicado.
- Troque o ano: os próximos conteúdos devem mudar; o histórico de respostas fica preservado.
- Crie uma rotina pelos passos Dias → Horários → Conferir. A sugestão só vira rotina salva depois da confirmação.
- Abra o Tutor sem conta: deve explicar o login e ocultar o campo de mensagem.
- Abra Apoio: deve orientar como buscar ajuda, sem simular envio de pedido.
- Teste no celular pelo modo de dispositivo do navegador, nas larguras 320, 360 e 390 px; confira também o modo claro/escuro e o zoom de texto.

## O que depende da internet e dos serviços existentes

O estudo, o perfil pedagógico, o histórico e a rotina funcionam localmente sem conta. O cadastro/login continua conectado ao Supabase já usado pelo projeto. **Ao entrar com uma conta real, a sincronização dessa conta continua ativa**; prefira uma conta de teste. Login e Tutor reais não foram executados pela equipe nesta entrega: os testes automatizados de interface usaram respostas controladas de teste.

O Tutor depende da Edge Function quick-endpoint, da chave/modelo Groq já configurados, de autenticação válida e da origem local autorizada em `TUTOR_ALLOWED_ORIGINS`. Se precisar testar o Tutor real, acrescente `http://localhost:4173` à lista existente no Supabase, preservando os domínios atuais. Esta configuração não foi alterada nesta entrega. Sem ela, o estudo local continua funcionando e o Tutor pode informar indisponibilidade.

Amigos e ligas usam `/api/social`. O servidor local executa essa rota com a mesma implementação existente, mas exige `SUPABASE_SERVICE_ROLE_KEY` apenas no ambiente do servidor e as migrações sociais já aplicadas. Sem essa configuração, a rota responde com indisponibilidade real; não há dados ou sucessos inventados. Não cole secrets no frontend nem envie chaves pelo chat.

O apoio não tem backend de atendimento: por isso não há coleta nem envio de relatos.

## Arquivos incluídos

- `dist/`: build pronta para o servidor local.
- Código-fonte e `supabase/`: implementação e migrações existentes; nenhuma migração nova é exigida por estas mudanças de interface/estado.
- `docs/BETA-LOCAL.md`: diagnóstico e limites.
- `docs/RELATORIO-EXECUCAO-BETA.md`: implementação, testes, métricas e pendências.
- `evidencias-beta/`: prints e resultados dos testes locais.

Para recompilar após editar o código, rode `npm ci` e `npm run build`. Nenhum desses comandos faz deploy. Não execute comandos de publicação enquanto esta versão estiver em avaliação.
