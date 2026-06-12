# Bolão Copa do Mundo 2026

Site simples de bolão entre amigos feito com React, Vite, TypeScript, TailwindCSS e Supabase.

## Funcionalidades

- Login, criação de conta e recuperação de senha por email.
- Palpites de placar por partida.
- Bloqueio automático de palpites 1 hora antes do início do jogo.
- Palpite de classificados da fase de grupos, bloqueado após confirmação.
- Palpite de campeão, vice e terceiro lugar, bloqueado após confirmação.
- Ranking com pontos de jogos, classificação, final e total.
- Múltiplos bolões no mesmo app, como "Resenha sem regras" e "Amigos de papinha".
- Usuário pode pedir entrada em mais de um bolão e o admin aprova ou recusa.
- Seletor no topo para trocar qual bolão está sendo visualizado.
- Área admin para cadastrar, editar e remover jogos.
- Seleções ficam fixas no catálogo inicial.
- Admin também lança resultados reais, marca classificados reais, define pódio real, recalcula pontuação e acompanha usuários.
- Modo demo local com dados mockados quando Supabase não está configurado.

## Regras de pontuação

### Partidas

- Placar exato: 3 pontos.
- Apenas desfecho correto, vitória/empate/derrota: 1 ponto.
- Erro completo: 0 ponto.

### Classificação

O usuário escolhe dois classificados por grupo. O script SQL inicial calcula 1 ponto por seleção corretamente classificada quando o admin marca os classificados reais em `app_settings.real_group_classified` e executa o recálculo.

### Palpite final

- Campeão correto: 10 pontos.
- Vice-campeão correto: 7 pontos.
- Terceiro lugar correto: 5 pontos.

## Rodando localmente

```bash
npm install
npm run dev
```

Sem `.env`, o app abre em modo demo. Use qualquer email e senha na tela de login.

Para usar Supabase, copie o exemplo:

```bash
cp .env.example .env
```

Preencha:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

## Configurando o Supabase

1. Crie um projeto gratuito em [Supabase](https://supabase.com).
2. Abra `SQL Editor`.
3. Rode todo o conteúdo de `supabase/schema.sql`.
4. Em `Authentication > Providers`, deixe `Email` habilitado.
5. Em `Authentication > URL Configuration`, configure:

```text
Site URL: https://seu-site.vercel.app
Redirect URLs:
https://seu-site.vercel.app/**
http://localhost:5173/**
```

Sem essas URLs, os links de confirmação de email e recuperação de senha podem abrir uma página indisponível.

### Erro `email rate limit exceeded`

O Supabase limita o envio de emails quando você usa o servidor padrão dele. Na documentação oficial, endpoints que enviam email, como cadastro e recuperação de senha, ficam limitados no provedor embutido e esse limite só aumenta com SMTP próprio.

Para resolver em produção:

1. Aguarde o limite liberar, se estiver apenas testando.
2. Ou configure SMTP em `Supabase > Authentication > SMTP Settings`.
3. Uma opção comum é usar Resend, Brevo, SendGrid, Postmark ou outro serviço SMTP.

Depois de configurar SMTP próprio, os emails de confirmação e recuperação passam a usar seu provedor.

6. Crie uma conta pelo app.
7. Se a confirmação por email estiver ativa, abra o email recebido e confirme a conta antes de fazer login.
8. Para tornar seu usuário admin, rode no SQL Editor:

```sql
update public.users_profile
set is_admin = true
where email = 'seu-email@example.com';
```

O arquivo `supabase/schema.sql` cria:

- Tabelas do modelo pedido.
- Tabelas `pool_competitions` e `pool_memberships` para separar núcleos de amigos.
- Índices e constraints principais.
- Trigger para criar `users_profile` ao criar usuário no Auth.
- View `ranking` por bolão.
- Funções `recalculate_match_points` e `recalculate_all_points`.
- Políticas RLS para proteger dados.

Depois de criar seu primeiro usuário admin, ele pode abrir a área Admin mesmo sem estar aprovado em um bolão. Para participar de um bolão, peça acesso no topo da tela e aprove o pedido em `Admin > Pedidos de participação`.

Se preferir aprovar direto pelo SQL:

```sql
insert into public.pool_memberships (pool_id, user_id, status)
select
  '10000000-0000-0000-0000-000000000001',
  id,
  'approved'
from public.users_profile
where email = 'seu-email@example.com'
on conflict (pool_id, user_id)
do update set status = 'approved', reviewed_at = now();
```

## Realtime

No Supabase, a aplicação assina mudanças nas tabelas:

- `matches`
- `match_predictions`
- `group_predictions`
- `final_predictions`
- `pool_memberships`
- `pool_competitions`

Se necessário, confira em `Database > Replication` se essas tabelas estão incluídas na publicação realtime do projeto.

## Deploy gratuito na Vercel

1. Suba o projeto para um repositório no GitHub.
2. Importe o repositório na [Vercel](https://vercel.com).
3. Configure as variáveis de ambiente:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

4. Use o comando de build padrão:

```bash
npm run build
```

5. Publique.

## Estrutura principal

```text
src/
  components/       componentes reutilizáveis
  lib/              Supabase, autenticação, dados e pontuação
  pages/            páginas do sistema
  types.ts          tipos do domínio
supabase/
  schema.sql        tabelas, funções e políticas RLS
```

## Observações de segurança

- Usuário comum só insere/edita seus próprios palpites.
- Usuário comum só vê e pontua dentro dos bolões em que foi aprovado.
- Pedidos de participação começam como `pending` e só o admin altera para `approved` ou `rejected`.
- Palpites de jogos são bloqueados no frontend e também por RLS no banco.
- Palpites de classificação e final só aceitam inserção; edição comum não é liberada.
- Apenas admins podem alterar jogos, resultados e configurações reais.
- Ao remover um jogo, os palpites ligados a ele são removidos no Supabase por cascade.
