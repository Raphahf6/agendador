alter table public.ai_agent_settings
  add column if not exists opening_message text not null default 'Oi, tudo bem? Me passa o melhor dia e horario para voce, por favor?',
  add column if not exists conversation_example text not null default '';

comment on column public.ai_agent_settings.opening_message is 'Mensagem de abertura que o agente deve usar como base no primeiro contato.';
comment on column public.ai_agent_settings.conversation_example is 'Exemplo completo de atendimento usado como referencia de estilo e fluxo.';
