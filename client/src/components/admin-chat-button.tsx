import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function AdminChatButton() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  
  // Buscar contagem de mensagens não lidas para admin
  const { data: unreadCount = 0, isLoading } = useQuery<number>({
    queryKey: ["/api/chat/admin/unread-count"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAdmin,
    refetchInterval: 15000, // Atualizar a cada 15 segundos
  });

  // Verificar se há mensagens não lidas
  const hasUnread = unreadCount > 0;

  // Função para navegar para a página de chats do admin
  const handleClick = () => {
    setLocation("/admin/chats");
  };

  if (!isAdmin) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={handleClick}
          >
            <MessageSquare className="h-5 w-5" />
            {hasUnread && (
              <div className="absolute top-1 right-1 h-2 w-2 bg-ep-orange rounded-full" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Chat de Suporte {hasUnread ? `(${unreadCount} não lidos)` : ""}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}