/**
 * Valida se um CPF é válido
 * @param cpf CPF a ser validado (apenas números)
 * @returns boolean indicando se o CPF é válido
 */
export function validateCPF(cpf: string | undefined): boolean {
  // Se for undefined ou vazio, aceitar para permitir campos opcionais
  if (!cpf) return true;
  
  // Remover todos os caracteres não numéricos
  const cleanCpf = cpf.replace(/\D/g, '');

  // Verificar se tem 11 dígitos
  if (cleanCpf.length !== 11) return false;

  // Verificar se é uma sequência de dígitos repetidos, como 11111111111
  if (/^(\d)\1+$/.test(cleanCpf)) return false;

  // Verificar os dígitos verificadores
  let sum = 0;
  let remainder;

  // Primeiro dígito verificador
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCpf.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCpf.substring(9, 10))) return false;

  // Segundo dígito verificador
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCpf.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCpf.substring(10, 11))) return false;

  return true;
}

/**
 * Formata um CPF para o formato XXX.XXX.XXX-XX
 * @param cpf CPF a ser formatado (apenas números)
 * @returns CPF formatado
 */
export function formatCPF(cpf: string | undefined): string {
  // Se for undefined ou vazio, retornar string vazia
  if (!cpf) return '';
  
  // Remover todos os caracteres não numéricos
  const cleanCpf = cpf.replace(/\D/g, '');
  
  // Aplicar a formatação
  if (cleanCpf.length <= 3) {
    return cleanCpf;
  } else if (cleanCpf.length <= 6) {
    return `${cleanCpf.substring(0, 3)}.${cleanCpf.substring(3)}`;
  } else if (cleanCpf.length <= 9) {
    return `${cleanCpf.substring(0, 3)}.${cleanCpf.substring(3, 6)}.${cleanCpf.substring(6)}`;
  } else {
    return `${cleanCpf.substring(0, 3)}.${cleanCpf.substring(3, 6)}.${cleanCpf.substring(6, 9)}-${cleanCpf.substring(9, 11)}`;
  }
}