import { useState } from "react";
import { X, Bell, BellOff } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Notification } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/notifications/${id}/read`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleMarkAsRead = (id: number) => {
    markAsReadMutation.mutate(id);
  };

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  // Agrupar notificações por tipo
  const infoNotifications = notifications.filter((n) => n.type === "info");
  const warningNotifications = notifications.filter((n) => n.type === "warning");
  const successNotifications = notifications.filter((n) => n.type === "success");
  const errorNotifications = notifications.filter((n) => n.type === "error");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-white hover:bg-ep-orange transition-all">
          {unreadCount > 0 ? (
            <>
              <Bell className="h-5 w-5" />
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-ep-orange border-ep-orange"
              >
                {unreadCount}
              </Badge>
            </>
          ) : (
            <BellOff className="h-5 w-5" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="border-l-ep-orange">
        <SheetHeader>
          <SheetTitle className="text-ep-black flex items-center gap-2">
            <Bell className="h-5 w-5 text-ep-orange" />
            Notificações
          </SheetTitle>
          <SheetDescription>
            {unreadCount > 0
              ? `Você tem ${unreadCount} notificação${unreadCount > 1 ? "es" : ""} não lida${unreadCount > 1 ? "s" : ""}.`
              : "Não há notificações não lidas."}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4 overflow-y-auto h-[85vh] pb-20">
          {isLoading ? (
            <p className="text-center py-4">Carregando notificações...</p>
          ) : notifications.length === 0 ? (
            <p className="text-center py-4">Você não tem notificações.</p>
          ) : (
            <>
              {errorNotifications.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Importantes</h3>
                  {errorNotifications.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                    />
                  ))}
                </div>
              )}
              
              {warningNotifications.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Avisos</h3>
                  {warningNotifications.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                    />
                  ))}
                </div>
              )}
              
              {successNotifications.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Confirmações</h3>
                  {successNotifications.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                    />
                  ))}
                </div>
              )}
              
              {infoNotifications.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Informações</h3>
                  {infoNotifications.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead: (id: number) => void;
}

function NotificationCard({ notification, onMarkAsRead }: NotificationCardProps) {
  // Determinar a variante do card com base no tipo de notificação
  const getCardVariant = () => {
    switch (notification.type) {
      case "error":
        return "bg-red-50 border-red-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      case "success":
        return "bg-green-50 border-green-200";
      case "info":
      default:
        return notification.isRead ? "bg-gray-50 border-gray-200" : "bg-blue-50 border-blue-200";
    }
  };

  const getDateString = (date: Date | string) => {
    return new Date(date).toLocaleString("pt-BR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className={`${getCardVariant()} relative transition-all ${notification.isRead ? "opacity-70" : "opacity-100"}`}>
      {!notification.isRead && (
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-2 right-2 h-6 w-6 hover:bg-ep-orange/20"
          onClick={() => onMarkAsRead(notification.id)}
        >
          <X className="h-4 w-4 text-ep-orange" />
        </Button>
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{notification.title}</CardTitle>
        <CardDescription className="text-xs">
          {getDateString(notification.createdAt)}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="text-sm">{notification.message}</p>
      </CardContent>
      {!notification.isRead && (
        <CardFooter>
          <Button
            size="sm"
            className="w-full bg-ep-orange hover:bg-ep-orange/90 text-white"
            onClick={() => onMarkAsRead(notification.id)}
          >
            Marcar como lida
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}