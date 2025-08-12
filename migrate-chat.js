import { pool } from './db/index.js';
import { db } from './db/index.js';
import path from 'path';
import fs from 'fs';

// Função para criar as tabelas de chat
async function createChatTables() {
  try {
    console.log('Criando tabelas de chat...');

    // SQL para criar tabela de threads do chat
    await pool.query(`
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
    `);
    console.log('Tabela chat_threads criada com sucesso');

    // SQL para criar tabela de mensagens do chat
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        thread_id INTEGER NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        is_admin_message BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('Tabela chat_messages criada com sucesso');

    console.log('Todas as tabelas de chat foram criadas com sucesso!');
  } catch (error) {
    console.error('Erro ao criar tabelas de chat:', error);
    throw error;
  }
}

// Executar a migração
async function runMigration() {
  try {
    await createChatTables();
    console.log('Migração concluída com sucesso!');
  } catch (error) {
    console.error('Erro durante a migração:', error);
  } finally {
    await pool.end();
  }
}

// Executar a função principal
runMigration();