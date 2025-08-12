import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorText;
    
    // Tentar analisar como JSON primeiro (para mensagens de erro estruturadas)
    try {
      const contentType = res.headers.get('content-type');
      
      // Se é JSON, vamos analisar
      if (contentType && contentType.includes('application/json')) {
        const data = await res.clone().json();
        
        // Verificar especificamente por sessão expirada
        if (res.status === 401 && data.sessionExpired) {
          // Notificar o usuário sobre sessão expirada
          if (typeof window !== 'undefined') {
            // Armazenar a mensagem para ser exibida após o redirecionamento
            sessionStorage.setItem('sessionExpiredMessage', data.message || 'Sua sessão expirou. Por favor, faça login novamente.');
            
            // Redirecionar para a página de login
            window.location.href = '/auth';
            return; // Interromper a execução para evitar o erro
          }
        }
        
        // Usar a mensagem do erro se disponível
        errorText = data.message || JSON.stringify(data);
      } else {
        // Se não for JSON, pegar o texto normal
        errorText = await res.clone().text() || res.statusText;
      }
    } catch (e) {
      // Se falhar ao analisar o JSON, pegar o texto normal
      errorText = await res.text() || res.statusText;
    }
    
    throw new Error(`${res.status}: ${errorText}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
type QueryFnOptions = {
  on401: UnauthorizedBehavior;
  onResponse?: (response: Response) => Promise<Response> | Response;
};

export const getQueryFn: <T>(options: QueryFnOptions) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior, onResponse }) =>
  async ({ queryKey }) => {
    let res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });
    
    // Aplicar callback personalizado na resposta, se fornecido
    if (onResponse) {
      res = await onResponse(res);
    }

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
