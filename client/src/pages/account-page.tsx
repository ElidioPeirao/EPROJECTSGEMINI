import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { format, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";

// Profile update schema
const profileSchema = z.object({
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
  email: z.string().email("Digite um e-mail válido"),
});

// Password change schema
const passwordSchema = z.object({
  currentPassword: z.string().min(1, "A senha atual é obrigatória"),
  newPassword: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(6, "A confirmação de senha deve ter pelo menos 6 caracteres"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não conferem",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function AccountPage() {
  const { toast } = useToast();
  const { user, isEMaster, isETool, isAdmin, usePromoCodeMutation } = useAuth();
  const isPro = isEMaster || isETool; // Define isPro como true se o usuário for E-MASTER ou E-TOOL
  const [promoCode, setPromoCode] = useState("");
  const [promoMessage, setPromoMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || "",
      email: user?.email || "",
    },
  });

  // Password form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const res = await apiRequest("PATCH", "/api/profile", data);
      return await res.json();
    },
    onSuccess: (userData) => {
      queryClient.setQueryData(["/api/user"], userData);
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("PATCH", "/api/profile", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Senha atualizada",
        description: "Sua senha foi atualizada com sucesso.",
      });
      passwordForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar senha",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onProfileSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordFormValues) => {
    updatePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  const handleActivatePromo = () => {
    if (!promoCode.trim()) {
      setPromoMessage({ text: "Por favor, insira um código promocional.", type: "error" });
      return;
    }

    usePromoCodeMutation.mutate({ code: promoCode }, {
      onSuccess: (data) => {
        setPromoMessage({ text: data.message, type: "success" });
        setPromoCode("");
      },
      onError: (error) => {
        setPromoMessage({ text: error.message, type: "error" });
      }
    });
  };

  // Calculate days left for Pro access
  const getProExpiryText = () => {
    if (!user?.roleExpiryDate) return "";
    
    const expiryDate = new Date(user.roleExpiryDate);
    if (!isAfter(expiryDate, new Date())) return "";
    
    return format(expiryDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow">
        <div className="py-6 sm:py-12">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-ep-black">Minha <span className="text-ep-orange">Conta</span></h1>
              <p className="mt-2 text-gray-600">Gerencie suas informações pessoais</p>
            </div>
            
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <h3 className="text-lg font-medium text-ep-black mb-4">Informações do Perfil</h3>
                
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                    <FormField
                      control={profileForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome de usuário</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Botão para salvar o perfil */}
                    <Button 
                      type="submit" 
                      className="bg-ep-orange hover:bg-ep-orange/90"
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </form>
                </Form>
                
                <div className="border-t pt-4 mt-6">
                  <h4 className="text-md font-medium text-ep-black mb-3">Alterar Senha</h4>
                  
                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha atual</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nova senha</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirmar nova senha</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        variant="outline"
                        className="mt-2"
                        disabled={updatePasswordMutation.isPending}
                      >
                        {updatePasswordMutation.isPending ? "Atualizando senha..." : "Atualizar Senha"}
                      </Button>
                    </form>
                  </Form>
                </div>
              </CardContent>
              
              <div className="bg-gray-50 p-6 border-t">
                <h3 className="text-lg font-medium text-ep-black mb-4">Status da Conta</h3>
                
                <div className="flex items-center space-x-2 mb-4">
                  {isAdmin ? (
                    <Badge className="bg-ep-black text-white">
                      <svg 
                        className="mr-1 h-4 w-4" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <path d="M12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      Administrador
                    </Badge>
                  ) : isPro ? (
                    <Badge className="bg-ep-orange text-white">
                      <svg 
                        className="mr-1 h-4 w-4" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <path d="M12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      Pro {getProExpiryText() ? `(até ${getProExpiryText()})` : ""}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-100 text-gray-800">
                      <svg 
                        className="mr-1 h-4 w-4" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      Básico
                    </Badge>
                  )}
                </div>
                
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-md font-medium text-ep-black mb-3">Ativar código promocional</h4>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Digite seu código"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                    />
                    <Button
                      className="bg-ep-orange hover:bg-ep-orange/90"
                      onClick={handleActivatePromo}
                      disabled={usePromoCodeMutation.isPending}
                    >
                      {usePromoCodeMutation.isPending ? "Ativando..." : "Ativar"}
                    </Button>
                  </div>
                  {promoMessage && (
                    <p className={`text-sm mt-2 ${promoMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                      {promoMessage.text}
                    </p>
                  )}
                </div>
                
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-md font-medium text-ep-black mb-3">Configurações de Segurança</h4>
                  
                  {/* Componente para controle de recuperação de senha */}
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Recuperação de senha</div>
                        <div className="text-sm text-gray-500">
                          {user?.disablePasswordRecovery 
                            ? "A recuperação de senha está desativada. Para recuperar sua senha, você precisará entrar em contato com o administrador via eprojects.contato@gmail.com." 
                            : "A recuperação de senha está ativada. Você pode recuperar sua senha usando seu e-mail e CPF."}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                            user?.disablePasswordRecovery ? "bg-ep-orange" : "bg-input"
                          }`}
                          onClick={() => {
                            if (!user?.id) return;
                            
                            const newState = !user.disablePasswordRecovery;
                            
                            apiRequest(
                              "PATCH", 
                              `/api/users/${user.id}/password-recovery`, 
                              { disablePasswordRecovery: newState }
                            )
                              .then(res => res.json())
                              .then(data => {
                                queryClient.setQueryData(["/api/user"], data);
                                toast({
                                  title: newState ? "Recuperação de senha desativada" : "Recuperação de senha ativada",
                                  description: newState 
                                    ? "Você agora precisará entrar em contato com o administrador para recuperar sua senha." 
                                    : "Você agora pode recuperar sua senha usando seu e-mail e CPF.",
                                });
                              })
                              .catch(() => {
                                toast({
                                  title: "Erro",
                                  description: "Não foi possível atualizar a configuração de recuperação de senha.",
                                  variant: "destructive",
                                });
                              });
                          }}
                        >
                          <span className={`${user?.disablePasswordRecovery ? "translate-x-5" : "translate-x-0"} inline-block h-5 w-5 transform rounded-full bg-white transition-transform`} />
                        </button>
                        <span className="text-sm text-gray-500">
                          {user?.disablePasswordRecovery ? "Desativada" : "Ativada"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}