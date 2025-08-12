import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Esquema de validação
const formSchema = z.object({
  subject: z.string().min(3, "O assunto deve ter pelo menos 3 caracteres"),
  message: z.string().min(5, "A mensagem deve ter pelo menos 5 caracteres"),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewChatPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Configurar formulário
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: "",
      message: "",
    },
  });

  // Mutação para criar novo chat
  const createChatMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      // Primeiro, criar o thread
      const threadResponse = await apiRequest("POST", "/api/chat/threads", {
        subject: data.subject,
      });
      
      if (!threadResponse.ok) {
        throw new Error("Erro ao criar conversa");
      }
      
      const thread = await threadResponse.json();
      
      // Depois, adicionar a primeira mensagem
      const messageResponse = await apiRequest(
        "POST",
        `/api/chat/threads/${thread.id}/messages`,
        { message: data.message }
      );
      
      if (!messageResponse.ok) {
        throw new Error("Erro ao enviar mensagem inicial");
      }
      
      return thread;
    },
    onSuccess: (data) => {
      toast({
        title: "Conversa iniciada",
        description: "Sua mensagem foi enviada com sucesso.",
      });
      
      // Redirecionar para o chat
      navigate(`/chat/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao iniciar conversa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Manipular envio do formulário
  const onSubmit = (data: FormValues) => {
    createChatMutation.mutate(data);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Acesso negado</h2>
        <p className="text-gray-600 mb-4">Você precisa estar autenticado para acessar esta página.</p>
        <Link href="/auth">
          <Button>Fazer login</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Card className="bg-white shadow-lg">
        <CardHeader>
          <div className="flex items-center">
            <Link href="/chats">
              <Button variant="ghost" size="icon" className="mr-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <CardTitle className="text-xl">Nova Conversa</CardTitle>
              <CardDescription>
                Inicie uma nova conversa com nossa equipe de suporte
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assunto</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Dúvida sobre ferramentas"
                        {...field}
                        disabled={createChatMutation.isPending}
                      />
                    </FormControl>
                    <FormDescription>
                      Descreva o assunto da sua conversa brevemente
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mensagem</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Digite sua mensagem aqui..."
                        className="min-h-[150px] resize-none"
                        {...field}
                        disabled={createChatMutation.isPending}
                      />
                    </FormControl>
                    <FormDescription>
                      Detalhe sua dúvida ou solicitação para que possamos ajudar melhor
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            
            <CardFooter className="flex justify-between">
              <Link href="/chats">
                <Button variant="outline" disabled={createChatMutation.isPending}>
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={createChatMutation.isPending}>
                {createChatMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Enviar
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}