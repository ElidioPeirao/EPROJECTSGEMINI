-- Script SQL para corrigir problemas com códigos promocionais

-- 1. Primeiro, remova a restrição de chave estrangeira
ALTER TABLE promo_usage DROP CONSTRAINT IF EXISTS promo_usage_promo_id_promo_codes_id_fk;

-- 2. Remova qualquer registro de uso para o código promocional problemático
DELETE FROM promo_usage WHERE promo_id = 55;

-- 3. Remova o código promocional
DELETE FROM promo_codes WHERE id = 55;

-- 4. Recrie a restrição de chave estrangeira com a opção ON DELETE CASCADE
-- Esta opção fará com que registros em promo_usage sejam excluídos automaticamente 
-- quando o código promocional correspondente for excluído
ALTER TABLE promo_usage ADD CONSTRAINT promo_usage_promo_id_promo_codes_id_fk 
FOREIGN KEY (promo_id) REFERENCES promo_codes(id) ON DELETE CASCADE;