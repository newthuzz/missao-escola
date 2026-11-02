# Testar o Tutor IA com a Groq

O site e o histórico continuam como estão. A função quick-endpoint usa a Groq quando TUTOR_PROVIDER=groq, sem consumir créditos da API OpenAI e sem alternar automaticamente para ela. O modelo padrão é openai/gpt-oss-20b, hospedado na Groq. O prefixo openai faz parte do nome do modelo; a chamada vai para api.groq.com, com uma chave Groq.

## 1. Criar a chave

Abra https://console.groq.com/keys, entre na conta, crie uma API key e guarde-a. Não cole a chave no GitHub, no HTML ou no chat. Confira que sua conta está no plano gratuito e consulte os modelos e limites disponíveis no painel: https://console.groq.com/docs/rate-limits . Os limites da Groq são compartilhados pelos alunos que usam a mesma conta de API.

## 2. Preparar os secrets no Supabase

No projeto pxnvttqsgjnakeukttdr, abra Edge Functions → Secrets. Use os campos Name e Value, Add another e Save.

| Name | Value |
| --- | --- |
| TUTOR_ENABLED | false durante a preparação |
| TUTOR_PROVIDER | groq |
| GROQ_API_KEY | sua chave criada na Groq |
| GROQ_MODEL | openai/gpt-oss-20b |
| TUTOR_ALLOWED_ORIGINS | endereço público do site, com https://, sem caminho ou barra final |

Mantenha os outros secrets. OPENAI_API_KEY pode permanecer cadastrada; ela não será usada com TUTOR_PROVIDER=groq. Não substitua seu valor por uma chave Groq. Se mudar GROQ_MODEL, use um identificador disponível na sua conta e valide a qualidade das respostas novamente.

## 3. Atualizar a função

1. Abra https://github.com/newthuzz/missao-escola/blob/main/supabase/functions/quick-endpoint/index.ts .
2. Clique em Raw e copie TODO o arquivo atualizado.
3. No Supabase, entre em Edge Functions → quick-endpoint → Code → index.ts.
4. Guarde uma cópia do código anterior. Substitua todo o conteúdo pelo novo e clique em Deploy updates.
5. Depois de instalar esse código completo, mantenha Verify JWT with legacy secret desativado nas configurações da função. O código valida o login no Supabase Auth; não aceita perguntas sem uma sessão válida.

Não há SQL novo para esta mudança. Se já executou supabase/tutor.sql, não precisa refazer as tabelas. Se ainda não executou, conclua a preparação descrita em ATIVAR-TUTOR-IA.md.

## 4. Ativar e testar

Altere TUTOR_ENABLED para true e salve. No site, entre na conta e feche/reabra o tutor. Pergunte “O que é número atômico?”; depois, “Dê um exemplo”. Confira se responde em português e usa a conversa anterior.

Se falhar, consulte Edge Functions → quick-endpoint → Logs/Invocations. Uma mensagem de limite pede que você aguarde; erro de chave pede que confira GROQ_API_KEY; modelo indisponível pede conferir GROQ_MODEL. Não envie os secrets ao compartilhar um erro. O tutor não salva respostas incompletas como se estivessem concluídas.

Publicar o site no Cloudflare NÃO atualiza a função do Supabase. É necessário fazer o passo 3. A alteração dos secrets vale para novas chamadas da função.

## Validação e limites

A integração, resumo do histórico, erros e streaming foram testados com respostas controladas. O teste real depende da sua chave, do acesso ao modelo e dos limites da conta; não foi executado com a sua conta. A IA pode errar: confira as explicações antes de liberar para alunos.

Referências: https://console.groq.com/docs/openai , https://console.groq.com/docs/model/openai/gpt-oss-20b , https://console.groq.com/docs/reasoning .
