// Este é um script para limpar um código promocional específico e seus registros de uso
import { db } from "../db/index.js";
import { promoCodes, promoUsage } from "../shared/schema.js";
import { eq, sql } from "drizzle-orm";

async function cleanPromoCode(promoCodeId) {
  try {
    console.log(`Tentando limpar o código promocional ID: ${promoCodeId}`);
    
    // 1. Verificar se o código existe
    const codeExists = await db.query.promoCodes.findFirst({
      where: eq(promoCodes.id, promoCodeId)
    });
    
    if (!codeExists) {
      console.log(`Código promocional ID ${promoCodeId} não encontrado.`);
      return;
    }
    
    console.log(`Código promocional encontrado: ${codeExists.code}`);
    
    // 2. Verificar registros de uso
    const usageRecords = await db.query.promoUsage.findMany({
      where: eq(promoUsage.promoId, promoCodeId)
    });
    
    console.log(`Encontrados ${usageRecords.length} registros de uso para este código.`);
    
    if (usageRecords.length > 0) {
      console.log("Detalhes dos registros de uso:");
      usageRecords.forEach(record => {
        console.log(`- ID: ${record.id}, User ID: ${record.userId}, Data: ${record.usedAt}`);
      });
    }
    
    // 3. Tentar remover registros de uso diretamente pelo SQL
    console.log("Tentando excluir registros de uso via SQL direto...");
    const deleteUsageResult = await db.execute(
      sql`DELETE FROM promo_usage WHERE promo_id = ${promoCodeId}`
    );
    console.log("Resultado da exclusão de registros de uso:", deleteUsageResult);
    
    // 4. Verificar se ainda existem registros de uso
    const remainingUsage = await db.query.promoUsage.findMany({
      where: eq(promoUsage.promoId, promoCodeId)
    });
    
    if (remainingUsage.length > 0) {
      console.log(`ATENÇÃO: Ainda existem ${remainingUsage.length} registros de uso não excluídos!`);
    } else {
      console.log("Todos os registros de uso foram excluídos com sucesso.");
      
      // 5. Tentar excluir o código promocional
      console.log("Tentando excluir o código promocional...");
      const deleteCodeResult = await db.execute(
        sql`DELETE FROM promo_codes WHERE id = ${promoCodeId}`
      );
      console.log("Resultado da exclusão do código promocional:", deleteCodeResult);
      
      // 6. Verificar se o código ainda existe
      const codeStillExists = await db.query.promoCodes.findFirst({
        where: eq(promoCodes.id, promoCodeId)
      });
      
      if (codeStillExists) {
        console.log("ERRO: O código promocional ainda existe após a tentativa de exclusão!");
      } else {
        console.log("Código promocional excluído com sucesso!");
      }
    }
  } catch (error) {
    console.error("ERRO durante a limpeza:", error);
  }
}

// Executar para o código com ID 55 (o que está causando problemas)
cleanPromoCode(55);