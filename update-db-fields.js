import pg from 'pg';
const { Client } = pg;

async function updateDatabaseSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    
    // Adicionar campo roleExpiryDate na tabela users
    const checkRoleExpiryDate = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role_expiry_date'
    `);
    
    if (checkRoleExpiryDate.rows.length === 0) {
      console.log('Adicionando campo role_expiry_date na tabela users...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS role_expiry_date TIMESTAMP
      `);
      console.log('Campo role_expiry_date adicionado com sucesso!');
    } else {
      console.log('Campo role_expiry_date já existe na tabela users.');
    }
    
    // Criar tabela plan_prices se não existir
    const checkPlanPricesTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'plan_prices'
      )
    `);
    
    if (!checkPlanPricesTable.rows[0].exists) {
      console.log('Criando tabela plan_prices...');
      await client.query(`
        CREATE TABLE plan_prices (
          id SERIAL PRIMARY KEY,
          plan_type TEXT NOT NULL,
          monthly_price DECIMAL(10, 2) NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_by INTEGER REFERENCES users(id)
        )
      `);
      
      // Inserir valores padrão
      await client.query(`
        INSERT INTO plan_prices (plan_type, monthly_price)
        VALUES 
          ('E-TOOL', 49.00),
          ('E-MASTER', 99.00)
      `);
      
      console.log('Tabela plan_prices criada e valores padrão inseridos com sucesso!');
    } else {
      console.log('Tabela plan_prices já existe.');
    }
    
    console.log('Atualização do banco de dados concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao atualizar o banco de dados:', error);
  } finally {
    await client.end();
  }
}

updateDatabaseSchema();
