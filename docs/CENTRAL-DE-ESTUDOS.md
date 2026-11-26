# Início e permanência escolar

O Início apresenta a missão do projeto antes de pedir o ano escolar. O estudo atual e o resumo diário vêm antes dos cartões de meta semanal e unidades concluídas. O check-in apresenta quatro escolhas de imediato e duas em **Mais opções**. A Rede de Apoio, as recompensas e os detalhes da jornada abrem em seções recolhíveis. Os quatro pilares ficam em **Nosso Impacto**, acessível pelo menu.

## Dados do painel

| Indicador | Origem |
| --- | --- |
| Atividades educacionais | Respostas concluídas no plano ativo ou questões resolvidas registradas no progresso |
| Objetivo semanal | Blocos da rotina salva e marcações da semana |
| Conteúdos concluídos | Unidades distintas dos planos concluídos no histórico salvo |
| Atividades de recuperação | Questões já praticadas que o motor de revisão indica para hoje |
| Solicitações de ajuda | Primeira página de **Meus pedidos**, após a verificação do acesso do estudante |
| Frequência oficial | Registro da escola ainda sem integração. A interface mostra a ausência de dados |
| Mission Points | Saldo da carteira autenticada do Missão Rewards. As estrelas continuam no Ateliê |

O check-in utiliza apenas a interface da página. Selecionar uma opção revela caminhos de apoio e não altera o perfil, o plano ou os registros. A seleção é limpa ao sair do Início ou ao fechar **Mais opções** com uma das opções extras selecionada.

## Integrações

O resumo de pedidos usa a operação `requests` já autenticada do Supabase, no ambiente de estudante e com o filtro de pedidos próprios. Ele compartilha a consulta recente com a página **Meus pedidos**. Títulos e mensagens ficam no atendimento, com as permissões institucionais existentes em `edu_support_requests`, `edu_support_messages` e `edu_teacher_assignments`. Conta e backup continuam nos serviços existentes de Auth e `learner_backups`.

**Central de Oportunidades** reúne links oficiais de acesso público e orientações para buscar a equipe da escola. **Nosso Impacto** descreve o que a plataforma acompanha. Uma avaliação de permanência depende de registros oficiais, autorização das escolas e indicadores agregados validados. O projeto ainda não publica esses resultados.

## Verificação

Após `npm run build`:

```sh
npm test
node tests/browser/home.cjs
node tests/browser/mobile-spaces.cjs
node tests/browser/pedagogy.cjs
node tests/browser/beta.cjs
```

Os testes de apoio pedagógico usam usuários e registros locais de teste. A reestruturação utiliza o esquema do Supabase e as rotas do Cloudflare já existentes.
