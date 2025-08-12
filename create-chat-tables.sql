-- Criar tabela de threads do chat
CREATE TABLE IF NOT EXISTS chat_threads (
  id SERIAL PRIMARY KEY,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMP NOT NULL DEFAULT NOW(),
  is_user_unread BOOLEAN NOT NULL DEFAULT FALSE,
  is_admin_unread BOOLEAN NOT NULL DEFAULT TRUE
);

-- Criar tabela de mensagens do chat
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  thread_id INTEGER NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_admin_message BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);