import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Criar arquivo temporário com configuração para atualização automática
const tempConfigPath = path.join(__dirname, 'temp-drizzle.config.ts');
const originalConfigPath = path.join(__dirname, 'drizzle.config.ts');

// Ler a configuração original
const originalConfig = fs.readFileSync(originalConfigPath, 'utf8');

// Adicionar opção para forçar a aplicação sem interação
const modifiedConfig = originalConfig.replace(
  'export default {',
  'export default {\n  force: true,'
);

// Escrever configuração temporária
fs.writeFileSync(tempConfigPath, modifiedConfig);

console.log('Executando migração do banco de dados...');

// Executar o comando drizzle-kit diretamente
exec('npx drizzle-kit push --config=./temp-drizzle.config.ts --verbose', (error, stdout, stderr) => {
  console.log(stdout);
  
  if (error) {
    console.error(`Erro ao aplicar migrações: ${error.message}`);
    console.error(stderr);
  } else {
    console.log('Migrações aplicadas com sucesso!');
  }
  
  // Limpar arquivo temporário
  fs.unlinkSync(tempConfigPath);
});