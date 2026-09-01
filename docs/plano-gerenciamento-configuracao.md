## Plano de Gerência de Configuração de Software (BI-SETDIG)

## Contexto 
Formalizar e padronizar, ferramentas e métodos utilizado na evolução e correção do código fonte do (BI-SETDIG).

## Termos e suas definições
**Termo	Definição
**GCS	Gerência de Configuração de Software
**PGCS	Plano de Gerência de Configuração de Software
**IC	Item de Configuração - Artefato sob controle de versão
**PR	Pull Request - Solicitação de integração de código

## Escopo 
Esse Plano é voltado a equipe de análise e desenvolvimento, e estará relacionado com o código fonte e a atualização do código, portanto seu ciclo será até a morte do projeto.

## Objetivos 
Trazer mais confiabilidade na qualidade dos códigos subidos, e evitar erros de versão;
## Ferramentas
Git -> como sistema de controle de versão;
GitHub -> como plataforma de hospedagem e colaboração;
GitHub Issues -> para registro e acompanhamento de mudanças;
Pull Requests -> para revisão e integração de código;


## Nomenclaturas da branches
Tipo   |	Prefixo	Formato | Principal
Main |           main            | main
Funcionalidade |      feature/         | feature/decricaoDaFeature

## Consequências 
Nas Políticas de Commit os commits devem ser frequentes, focados em alterações lógicas isoladas e seguir estritamente o padrão Convencional Commits, auditado automaticamente via Commitlint.

## Tipos de commits semânticos
**Tipo	Uso
**Feat      Nova funcionalidade
**Fix	Correção de bug
**Docs	Alteração em documentação
**Style	Formatação de código (sem mudança lógica)
**Refactor	Mudança interna sem alterar comportamento
**Perf	Melhoria de desempenho
**Test	Adição ou correção de testes
**Build	Mudanças no sistema de build
**Ci	Alterações em CI/CD
**Chore	Manutenção de ferramentas ou tarefas
**Env	Configurações de ambiente

