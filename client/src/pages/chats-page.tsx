import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { getQueryFn, queryClient } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  AlertCircle,
  MessageSquareText,
  Plus,
  Search,
  Home,
} from "lucide-react";
import { ChatThread } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

export default function ChatsPage() {
  const { user, isAdmin } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  // Buscar threads de chat
  const {
    data: threads = [],
    isLoading,
    refetch,
  } = useQuery<ChatThread[]>({
    queryKey: [isAdmin ? "/api/chat/admin/threads" : "/api/chat/threads"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    refetchInterval: isAdmin ? 15000 : 30000, // Atualizar mais frequentemente para admin
  });

  // Invalidar contadores de não lidos quando a página é carregada
  // Utilizamos apenas a função de refetch que já é fornecida pela query
  // Não precisamos do useEffect aqui
  if (isAdmin) {
    queryClient.invalidateQueries({
      queryKey: ["/api/chat/admin/unread-count"],
    });
  } else {
    queryClient.invalidateQueries({
      queryKey: ["/api/chat/unread-count"],
    });
  }

  // Filtrar threads
  const filteredThreads = threads.filter((thread) =>
    thread.subject.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Iniciar novo chat
  const handleNewChat = () => {
    navigate("/chat/new");
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Acesso negado</h2>
        <p className="text-gray-600 mb-4">
          Você precisa estar autenticado para acessar esta página.
        </p>
        <Link href="/auth">
          <Button>Fazer login</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">
                {isAdmin ? "Suporte ao Usuário" : "Meus Chats"}
              </CardTitle>
              <CardDescription>
                {isAdmin
                  ? "Visualize e responda às conversas dos usuários"
                  : "Converse com nossa equipe de suporte"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button variant="outline" className="flex items-center">
                  <Home className="h-4 w-4 mr-2" />
                  Voltar à Página Inicial
                </Button>
              </Link>
              {!isAdmin && (
                <Button onClick={handleNewChat}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Chat
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-2 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar chats..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-ep-orange" />
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquareText className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <h3 className="text-lg font-medium text-gray-900">
                Nenhum chat encontrado
              </h3>
              <p className="mt-1 text-gray-500">
                {searchTerm
                  ? "Tente ajustar sua busca"
                  : "Inicie uma nova conversa com nossa equipe"}
              </p>
              {!isAdmin && (
                <Button className="mt-4" onClick={handleNewChat}>
                  <Plus className="h-4 w-4 mr-2" />
                  Iniciar novo chat
                </Button>
              )}
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assunto</TableHead>
                    {isAdmin && <TableHead>Usuário</TableHead>}
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredThreads.map((thread) => (
                    <TableRow key={thread.id}>
                      <TableCell className="font-medium flex items-center">
                        {(isAdmin
                          ? thread.isAdminUnread
                          : thread.isUserUnread) && (
                          <div className="h-2 w-2 bg-ep-orange rounded-full mr-2" />
                        )}
                        {thread.subject}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          {thread.userName || `Usuário #${thread.userId}`}
                        </TableCell>
                      )}
                      <TableCell>
                        {thread.lastMessageAt || thread.createdAt
                          ? format(
                              new Date(
                                thread.lastMessageAt || thread.createdAt,
                              ),
                              "dd/MM/yyyy HH:mm",
                              { locale: ptBR },
                            )
                          : "Data desconhecida"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            thread.status === "open" ? "default" : "secondary"
                          }
                        >
                          {thread.status === "open" ? "Aberto" : "Fechado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/chat/${thread.id}`}>
                          <Button variant="outline" size="sm">
                            Visualizar
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
