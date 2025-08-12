import { createContext, ReactNode, useContext, useEffect, useRef } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User, insertUserSchema } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useLocation } from "wouter";

// Extended user schema for registration that includes promo code
const registerUserSchema = insertUserSchema.extend({
  promoCode: z.string().optional(),
});

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  isAdmin: boolean;
  isEMaster: boolean;
  isETool: boolean;
  isEBasic: boolean;
  loginMutation: UseMutationResult<Omit<User, "password">, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<Omit<User, "password">, Error, RegisterData>;
  usePromoCodeMutation: UseMutationResult<{ message: string; days: number; user: Omit<User, "password"> }, Error, { code: string }>;
};

type LoginData = {
  email: string;
  password: string;
};

type RegisterData = z.infer<typeof registerUserSchema>;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const checkIntervalRef = useRef<number | null>(null);
  
  const {
    data: user,
    error,
    isLoading,
    refetch
  } = useQuery<User | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ 
      on401: "returnNull",
      onResponse: async (response) => {
        // Verificar se a resposta contém a flag de sessão expirada
        if (response.status === 401) {
          try {
            const data = await response.json();
            if (data.sessionExpired) {
              toast({
                title: "Sessão expirada",
                description: data.message || "Sua conta foi acessada em outro dispositivo. Por favor, faça login novamente.",
                variant: "destructive",
              });
              // Redirecionar para a página de login
              setLocation("/auth");
            }
          } catch (e) {
            // Se não for possível analisar o JSON, apenas deixe o processo normal continuar
          }
        }
        return response;
      }
    }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (userData: Omit<User, "password">) => {
      queryClient.setQueryData(["/api/user"], userData);
      toast({
        title: "Login bem-sucedido",
        description: `Bem-vindo, ${userData.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no login",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (userData: Omit<User, "password">) => {
      queryClient.setQueryData(["/api/user"], userData);
      toast({
        title: "Registro bem-sucedido",
        description: `Bem-vindo, ${userData.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no registro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logout bem-sucedido",
        description: "Você saiu da sua conta.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no logout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const usePromoCodeMutation = useMutation({
    mutationFn: async ({ code }: { code: string }) => {
      const res = await apiRequest("POST", "/api/promocodes/use", { code });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/user"], data.user);
      toast({
        title: "Código promocional ativado",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha ao ativar código",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Check if user is admin
  const isAdmin = user?.role === "admin";
  
  // Check if user is E-MASTER (highest tier before admin)
  const isEMaster = user?.role === "E-MASTER" || isAdmin;
  
  // Check if user is E-TOOL or higher
  const isETool = user?.role === "E-TOOL" || isEMaster || isAdmin;
  
  // Check if user has basic access
  const isEBasic = user?.role === "E-BASIC" || isETool || isEMaster || isAdmin;
  
  // Configurar verificação periódica da sessão se estiver logado
  useEffect(() => {
    const checkSession = async () => {
      if (user) {
        try {
          // Verificar o status da sessão a cada intervalo
          await refetch();
        } catch (error) {
          console.error("Erro ao verificar sessão:", error);
        }
      }
    };
    
    // Limpar intervalo anterior
    if (checkIntervalRef.current) {
      window.clearInterval(checkIntervalRef.current);
    }

    // Configurar nova verificação se estiver logado
    if (user) {
      // Verificar a cada 5 segundos para detectar rapidamente quando o usuário for desconectado
      // Este é um intervalo curto especificamente para detectar outros logins na mesma conta
      checkIntervalRef.current = window.setInterval(checkSession, 5000);
      
      // Executar uma verificação imediata
      checkSession();
    }
    
    return () => {
      // Limpar na desmontagem
      if (checkIntervalRef.current) {
        window.clearInterval(checkIntervalRef.current);
      }
    };
  }, [user, refetch]);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        isAdmin,
        isEMaster,
        isETool,
        isEBasic,
        loginMutation,
        logoutMutation,
        registerMutation,
        usePromoCodeMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
