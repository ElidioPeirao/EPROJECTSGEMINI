import pkg from 'pg';
const { Pool } = pkg;

// Função para criar tabelas diretamente com SQL
async function setupTables() {
  try {
    console.log('Iniciando criação/atualização das tabelas...');
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Verificar se as tabelas já existem
    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'courses'
      );
    `);
    
    const tablesExist = checkResult.rows[0].exists;
    
    if (!tablesExist) {
      console.log('Criando tabelas de cursos, aulas e materiais...');
      
      // Tabela de cursos
      await pool.query(`
        CREATE TABLE IF NOT EXISTS courses (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          category TEXT NOT NULL,
          instructor TEXT NOT NULL,
          duration TEXT NOT NULL,
          level TEXT NOT NULL,
          image_url TEXT,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          created_by INTEGER REFERENCES users(id)
        );
      `);
      
      // Tabela de aulas
      await pool.query(`
        CREATE TABLE IF NOT EXISTS lessons (
          id SERIAL PRIMARY KEY,
          course_id INTEGER REFERENCES courses(id) NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          youtube_url TEXT NOT NULL,
          "order" INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `);
      
      // Tabela de materiais
      await pool.query(`
        CREATE TABLE IF NOT EXISTS materials (
          id SERIAL PRIMARY KEY,
          course_id INTEGER REFERENCES courses(id) NOT NULL,
          lesson_id INTEGER REFERENCES lessons(id),
          title TEXT NOT NULL,
          description TEXT,
          file_url TEXT NOT NULL,
          file_type TEXT NOT NULL,
          icon_type TEXT DEFAULT 'file',
          downloadable BOOLEAN DEFAULT TRUE NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `);
      
      console.log('Tabelas criadas com sucesso!');
    } else {
      console.log('Tabelas já existem. Verificando se precisa atualizar estrutura...');
      
      // Verificar e adicionar colunas que podem estar faltando
      await pool.query(`
        DO $$
        BEGIN
          -- Verificar e adicionar coluna icon_type na tabela materials se não existir
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'materials' 
            AND column_name = 'icon_type'
          ) THEN
            ALTER TABLE materials ADD COLUMN icon_type TEXT DEFAULT 'file';
          END IF;
          
          -- Verificar e adicionar coluna is_hidden na tabela courses se não existir
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'courses' 
            AND column_name = 'is_hidden'
          ) THEN
            ALTER TABLE courses ADD COLUMN is_hidden BOOLEAN DEFAULT FALSE;
          END IF;
          
          -- Verificar se a tabela notifications existe
          IF NOT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'notifications'
          ) THEN
            CREATE TABLE notifications (
              id SERIAL PRIMARY KEY,
              title TEXT NOT NULL,
              message TEXT NOT NULL,
              type TEXT DEFAULT 'info' NOT NULL,
              target_role TEXT DEFAULT 'all' NOT NULL,
              is_read BOOLEAN DEFAULT FALSE NOT NULL,
              user_id INTEGER REFERENCES users(id),
              created_at TIMESTAMP DEFAULT NOW() NOT NULL,
              created_by INTEGER REFERENCES users(id),
              expires_at TIMESTAMP
            );
          END IF;
          
          -- Verificar se a tabela session existe
          IF NOT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'session'
          ) THEN
            CREATE TABLE session (
              sid VARCHAR NOT NULL,
              sess JSON NOT NULL,
              expire TIMESTAMP(6) NOT NULL,
              CONSTRAINT session_pkey PRIMARY KEY (sid)
            );
            CREATE INDEX idx_session_expire ON session (expire);
          END IF;
        END
        $$;
      `);
      
      console.log('Estrutura das tabelas atualizada!');
    }
    
    await pool.end();
    console.log('Operação concluída com sucesso!');
    
  } catch (error) {
    console.error('Erro ao criar/atualizar tabelas:', error);
  }
}

setupTables();