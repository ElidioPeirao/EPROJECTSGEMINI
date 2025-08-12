import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Eye, EyeOff, ArrowLeft, Home } from "lucide-react";
import logoImage from "@/assets/eprojects-logo.svg";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCPF, validateCPF } from "@/lib/cpf-utils";

// Login form schema
const loginSchema = z.object({
  email: z.string().email("Digite um e-mail válido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

// Register form schema
const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
  email: z.string().email("Digite um e-mail válido"),
  cpf: z.string()
    .min(11, "CPF deve conter 11 dígitos")
    .max(14, "CPF inválido")
    .refine(
      (val) => validateCPF(val.replace(/\D/g, '')), 
      { message: "CPF inválido" }
    ),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  promoCode: z.string().optional(),
});

// Password recovery schema - step 1
const recoverPasswordSchema = z.object({
  identifier: z.string().min(1, "Informe seu e-mail ou nome de usuário"),
  cpf: z.string()
    .min(11, "CPF deve conter 11 dígitos")
    .max(14, "CPF inválido")
    .refine(
      (val) => validateCPF(val.replace(/\D/g, '')), 
      { message: "CPF inválido" }
    ),
});

// Password reset schema - step 2
const resetPasswordSchema = z.object({
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(6, "A confirmação de senha deve ter pelo menos 6 caracteres"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;
type RecoverPasswordFormValues = z.infer<typeof recoverPasswordSchema>;
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null);
  const [recoveryStep, setRecoveryStep] = useState<'initial' | 'reset'>('initial');

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      cpf: "",
      password: "",
      promoCode: "",
    },
  });
  
  // Recover password form
  const recoverPasswordForm = useForm<RecoverPasswordFormValues>({
    resolver: zodResolver(recoverPasswordSchema),
    defaultValues: {
      identifier: "",
      cpf: "",
    },
  });
  
  // Reset password form
  const resetPasswordForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });
  
  // Recover password mutation
  const recoverPasswordMutation = useMutation({
    mutationFn: async (data: RecoverPasswordFormValues) => {
      const res = await apiRequest("POST", "/api/recover-password", data);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Recuperação iniciada",
        description: "Verificação realizada com sucesso. Agora você pode redefinir sua senha.",
      });
      setRecoveryToken(data.token);
      setRecoveryStep("reset");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na recuperação",
        description: error.message || "Não foi possível verificar sua identidade. Verifique os dados informados.",
        variant: "destructive",
      });
    },
  });
  
  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordFormValues & { token: string }) => {
      const res = await apiRequest("POST", "/api/reset-password", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Senha redefinida",
        description: "Sua senha foi alterada com sucesso. Agora você pode fazer login.",
      });
      setShowResetPassword(false);
      recoverPasswordForm.reset();
      resetPasswordForm.reset();
      setRecoveryStep("initial");
      setRecoveryToken(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao redefinir senha",
        description: error.message || "Não foi possível redefinir sua senha. Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  const onLoginSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values);
  };

  const onRegisterSubmit = (values: RegisterFormValues) => {
    // Garantir que o CPF esteja apenas com números para o backend
    const formattedValues = {
      ...values,
      cpf: values.cpf.replace(/\D/g, '')
    };
    registerMutation.mutate(formattedValues);
  };
  
  const onRecoverPasswordSubmit = (values: RecoverPasswordFormValues) => {
    // Garantir que o CPF esteja apenas com números para o backend
    const formattedValues = {
      ...values,
      cpf: values.cpf.replace(/\D/g, '')
    };
    recoverPasswordMutation.mutate(formattedValues);
  };
  
  const onResetPasswordSubmit = (values: ResetPasswordFormValues) => {
    if (recoveryToken) {
      resetPasswordMutation.mutate({
        ...values,
        token: recoveryToken,
      });
    } else {
      toast({
        title: "Erro ao redefinir senha",
        description: "Sessão de recuperação expirada. Por favor, inicie o processo novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full py-12 px-4 sm:px-6 lg:px-8 max-w-md mx-auto">
      {/* Botão Voltar ao Início */}
      <div className="mb-6">
        <Button
          variant="ghost"
          className="text-gray-600 hover:text-ep-orange"
          asChild
        >
          <Link href="/">
            <Home className="h-4 w-4 mr-2" />
            Voltar ao Início
          </Link>
        </Button>
      </div>

      <div className="text-center mb-10">
        <img src={logoImage} alt="EPROJECTS" className="mx-auto h-20 mb-2" />
        <p className="mt-2 text-sm text-gray-600">Soluções de Engenharia</p>
      </div>

      <Card className="overflow-hidden">
        <Tabs defaultValue="login">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="login" className="py-3">
              Entrar
            </TabsTrigger>
            <TabsTrigger value="register" className="py-3">
              Criar conta
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <CardContent className="p-6">
              <Form {...loginForm}>
                <form
                  onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="seu@email.com"
                            type="email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder="******"
                              type={showLoginPassword ? "text" : "password"}
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 text-gray-400 hover:text-gray-600"
                              onClick={() =>
                                setShowLoginPassword(!showLoginPassword)
                              }
                            >
                              {showLoginPassword ? (
                                <EyeOff size={16} />
                              ) : (
                                <Eye size={16} />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full bg-ep-orange hover:bg-ep-orange/90"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Entrando..." : "Entrar"}
                  </Button>

                  <div className="mt-4 text-center text-sm text-gray-500">
                    <button
                      type="button"
                      className="text-ep-orange hover:underline"
                      onClick={() => setShowResetPassword(true)}
                    >
                      Esqueceu sua senha? Clique aqui para recuperar.
                    </button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </TabsContent>

          <TabsContent value="register">
            <CardContent className="p-6">
              <Form {...registerForm}>
                <form
                  onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome de usuário</FormLabel>
                        <FormControl>
                          <Input placeholder="seunome" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="seu@email.com"
                            type="email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="cpf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="123.456.789-00"
                            maxLength={14}
                            {...field}
                            value={formatCPF(field.value)}
                            onChange={(e) => {
                              // Permite apenas números para processamento interno
                              const rawValue = e.target.value.replace(/\D/g, '');
                              field.onChange(rawValue);
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          CPF é obrigatório e será usado para recuperação de senha (XXX.XXX.XXX-XX)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder="******"
                              type={showRegisterPassword ? "text" : "password"}
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 text-gray-400 hover:text-gray-600"
                              onClick={() =>
                                setShowRegisterPassword(!showRegisterPassword)
                              }
                            >
                              {showRegisterPassword ? (
                                <EyeOff size={16} />
                              ) : (
                                <Eye size={16} />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="promoCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código promocional (opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="PROMO2023" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full bg-ep-black hover:bg-gray-800"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending
                      ? "Criando conta..."
                      : "Criar conta"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
      
      {/* Modal de Recuperação de Senha - Etapa 1: Verificação */}
      <Dialog open={showResetPassword && recoveryStep === 'initial'} onOpenChange={setShowResetPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recuperação de Senha</DialogTitle>
            <DialogDescription>
              Para recuperar sua senha, informe seu e-mail ou nome de usuário e seu CPF.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...recoverPasswordForm}>
            <form onSubmit={recoverPasswordForm.handleSubmit(onRecoverPasswordSubmit)} className="space-y-4 pt-4">
              <FormField
                control={recoverPasswordForm.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail ou nome de usuário</FormLabel>
                    <FormControl>
                      <Input placeholder="usuario@email.com ou seu_usuario" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={recoverPasswordForm.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="123.456.789-00" 
                        maxLength={14}
                        {...field}
                        value={formatCPF(field.value)}
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/\D/g, '');
                          field.onChange(rawValue);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Informe o CPF cadastrado na sua conta no formato XXX.XXX.XXX-XX
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowResetPassword(false);
                    recoverPasswordForm.reset();
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-ep-orange hover:bg-ep-orange/90"
                  disabled={recoverPasswordMutation.isPending}
                >
                  {recoverPasswordMutation.isPending ? "Verificando..." : "Verificar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Recuperação de Senha - Etapa 2: Nova Senha */}
      <Dialog open={showResetPassword && recoveryStep === 'reset'} onOpenChange={setShowResetPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Definir Nova Senha</DialogTitle>
            <DialogDescription>
              Digite sua nova senha abaixo.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...resetPasswordForm}>
            <form onSubmit={resetPasswordForm.handleSubmit(onResetPasswordSubmit)} className="space-y-4 pt-4">
              <FormField
                control={resetPasswordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="******"
                          type={showNewPassword ? "text" : "password"}
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 text-gray-400 hover:text-gray-600"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={resetPasswordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirme a nova senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="******"
                          type={showNewPassword ? "text" : "password"}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setRecoveryStep("initial");
                    resetPasswordForm.reset();
                  }}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-ep-orange hover:bg-ep-orange/90"
                  disabled={resetPasswordMutation.isPending}
                >
                  {resetPasswordMutation.isPending ? "Redefinindo..." : "Redefinir Senha"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
