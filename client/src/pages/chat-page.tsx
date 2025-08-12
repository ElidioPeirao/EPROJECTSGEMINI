import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, AlertCircle, X, Home, RefreshCcw } from "lucide-react";
import { ChatMessage, ChatThread } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ChatPage() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");

  // Buscar thread do chat (sem refetch automático)
  const { 
    data: threadData, 
    isLoading: threadLoading,
    refetch: refetchThread 
  } = useQuery<{ thread: ChatThread }>({
    queryKey: [`/api/chat/threads/${id}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!id,
    refetchInterval: false, // Desativa o refetch automático
    staleTime: Infinity // Mantém os dados frescos por tempo indeterminado
  });
  
  const thread = threadData?.thread;

  // Buscar mensagens do chat (sem refetch automático)
  const {
    data: messages = [],
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useQuery<ChatMessage[]>({
    queryKey: [`/api/chat/threads/${id}/messages`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!id,
    refetchInterval: false, // Desativa o refetch automático
    staleTime: Infinity // Mantém os dados frescos por tempo indeterminado
  });

  // Função de refresh manual
  const handleRefresh = () => {
    refetchThread();
    refetchMessages();
    
    // Marcar como lido
    if (id) {
      const endpoint = isAdmin 
        ? `/api/chat/threads/${id}/mark-read-admin`
        : `/api/chat/threads/${id}/mark-read-user`;
        
      apiRequest("POST", endpoint, {})
        .then(() => {
          // Atualizar contagem de não lidos
          if (isAdmin) {
            queryClient.invalidateQueries({
              queryKey: ["/api/chat/admin/unread-count"],
            });
          } else {
            queryClient.invalidateQueries({
              queryKey: ["/api/chat/unread-count"],
            });
          }
        })
        .catch(error => console.error("Erro ao marcar como lido:", error));
    }
    
    toast({
      title: "Atualizado",
      description: "Mensagens atualizadas com sucesso",
    });
  };

  // Mutação para enviar mensagem
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/chat/threads/${id}/messages`, {
        message: content,
      });
      return await response.json();
    },
    onSuccess: () => {
      // Recarregar mensagens
      refetchMessages();
      setMessage("");
      
      // Também invalidar contagem de não lidos
      if (isAdmin) {
        queryClient.invalidateQueries({
          queryKey: ["/api/chat/admin/unread-count"],
        });
      } else {
        queryClient.invalidateQueries({
          queryKey: ["/api/chat/unread-count"],
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutação para fechar thread
  const closeThreadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/chat/threads/${id}/close`, {});
      return await response.json();
    },
    onSuccess: () => {
      refetchThread();
      toast({
        title: "Ticket encerrado",
        description: "Este ticket foi finalizado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao finalizar ticket",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Função para enviar mensagem
  const handleSendMessage = () => {
    if (!message.trim()) return;
    sendMessageMutation.mutate(message.trim());
  };

  // Verificar permissão
  if (thread && user && !isAdmin && thread.userId !== user.id) {
    toast({
      title: "Acesso negado",
      description: "Você não tem permissão para acessar este ticket",
      variant: "destructive",
    });
    navigate("/");
  }

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

  if (threadLoading || !thread) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-ep-orange mb-4" />
        <p className="text-gray-600">Carregando ticket...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <Card className="bg-white shadow-lg">
        <CardHeader className="border-b pb-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="flex mr-2">
                <Link href={isAdmin ? "/admin/chats" : "/chats"}>
                  <Button variant="outline" size="icon" className="mr-2">
                    <X className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" size="sm" className="flex items-center">
                    <Home className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-2 flex items-center" 
                  onClick={handleRefresh}
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
              </div>
              <div>
                <CardTitle className="text-lg">Ticket: {thread.subject}</CardTitle>
                <CardDescription>
                  {isAdmin && thread.userName && (
                    <div className="font-medium text-ep-orange mb-1">
                      Usuário: {thread.userName}
                    </div>
                  )}
                  Aberto em {thread.createdAt ? format(new Date(thread.createdAt), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR }) : "data desconhecida"}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center">
              <Badge 
                variant={thread.status === "open" ? "default" : "secondary"}
                className="mr-2"
              >
                {thread.status === "open" ? "Aberto" : "Fechado"}
              </Badge>
              <div className="flex space-x-2">
                {thread.status === "open" && (
                  <Button 
                    variant="secondary" 
                    size="sm"
                    className="bg-green-100 hover:bg-green-200 text-green-700 border-green-300"
                    onClick={() => closeThreadMutation.mutate()}
                    disabled={closeThreadMutation.isPending}
                  >
                    {closeThreadMutation.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    )}
                    Finalizar Ticket
                  </Button>
                )}
                {isAdmin && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (window.confirm("Tem certeza que deseja excluir este ticket? Esta ação não pode ser desfeita.")) {
                        apiRequest("DELETE", `/api/chat/threads/${id}`, {})
                          .then(res => {
                            if (res.ok) {
                              toast({
                                title: "Ticket excluído",
                                description: "O ticket foi excluído com sucesso",
                              });
                              navigate(isAdmin ? "/admin/chats" : "/chats");
                            } else {
                              toast({
                                title: "Erro ao excluir ticket",
                                description: "Ocorreu um erro ao excluir o ticket",
                                variant: "destructive",
                              });
                            }
                          })
                          .catch(() => {
                            toast({
                              title: "Erro ao excluir ticket",
                              description: "Ocorreu um erro ao excluir o ticket",
                              variant: "destructive",
                            });
                          });
                      }
                    }}
                  >
                    Excluir
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="py-4 px-6">
          {messagesLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-ep-orange" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-gray-500 py-8">
              <div>Nenhuma mensagem ainda</div>
              <div className="text-sm">Seja o primeiro a enviar uma mensagem</div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className={msg.isAdminMessage ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"}>
                        {msg.isAdminMessage ? "A" : "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm">
                        {msg.isAdminMessage ? "Administrador" : "Usuário"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {msg.createdAt ? format(new Date(msg.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : ""}
                      </div>
                    </div>
                  </div>
                  <div className="ml-10 text-sm whitespace-pre-wrap">
                    {msg.message}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        
        <Separator />
        
        <CardFooter className="p-4">
          {thread.status === "closed" ? (
            <div className="w-full bg-gray-100 text-center py-3 px-4 rounded-md text-gray-500">
              Este ticket foi encerrado e não aceita mais mensagens
            </div>
          ) : (
            <div className="flex w-full space-x-2">
              <Input
                placeholder="Digite sua mensagem..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="flex-1"
                disabled={sendMessageMutation.isPending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || sendMessageMutation.isPending}
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}