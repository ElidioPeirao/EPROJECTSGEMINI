import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, MessageSquare, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ToolRatingProps {
  toolId: number;
  averageRating?: number | string;
  totalRatings?: number;
}

interface Rating {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: {
    id: number;
    username: string;
  };
}

export default function ToolRating({ toolId, averageRating = 0, totalRatings = 0 }: ToolRatingProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [showRatingsDialog, setShowRatingsDialog] = useState(false);

  // Buscar avaliação do usuário atual
  const { data: userRating } = useQuery({
    queryKey: [`/api/tools/${toolId}/user-rating`],
    enabled: !!user
  });

  // Buscar todas as avaliações
  const { data: ratings = [] } = useQuery({
    queryKey: [`/api/tools/${toolId}/ratings`],
    enabled: showRatingsDialog
  });

  // Mutation para enviar avaliação
  const rateMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/tools/${toolId}/rate`, {
        rating: selectedRating,
        comment: comment.trim() || null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tools/${toolId}/user-rating`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tools/${toolId}/ratings`] });
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
      
      toast({
        title: "Avaliação enviada",
        description: "Sua avaliação foi salva com sucesso!",
      });
      
      setShowRatingDialog(false);
      setSelectedRating(0);
      setComment("");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao avaliar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenRatingDialog = () => {
    if (userRating) {
      setSelectedRating(userRating.rating);
      setComment(userRating.comment || "");
    } else {
      setSelectedRating(0);
      setComment("");
    }
    setShowRatingDialog(true);
  };

  const handleSubmitRating = () => {
    if (selectedRating === 0) {
      toast({
        title: "Avaliação obrigatória",
        description: "Por favor, selecione uma nota de 1 a 5 estrelas.",
        variant: "destructive",
      });
      return;
    }
    
    rateMutation.mutate();
  };

  const renderStars = (rating: number, size: "sm" | "md" = "sm", interactive = false) => {
    const starSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
    
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${starSize} ${
              star <= rating 
                ? "fill-yellow-400 text-yellow-400" 
                : "text-gray-300"
            } ${interactive ? "cursor-pointer hover:text-yellow-400" : ""}`}
            onClick={interactive ? () => setSelectedRating(star) : undefined}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const avgRating = typeof averageRating === "string" ? parseFloat(averageRating) : averageRating || 0;

  return (
    <div className="space-y-3 border-t pt-3">
      {/* Display da avaliação média */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {renderStars(Math.round(avgRating))}
          <span className="text-xs text-gray-500">
            {avgRating.toFixed(1)} ({totalRatings})
          </span>
        </div>
        
        {/* Botões de ação */}
        {user && (
          <div className="flex items-center gap-1">
            <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={handleOpenRatingDialog}
                >
                  <Star className="h-3 w-3 mr-1" />
                  {userRating ? "Editar" : "Avaliar"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Avaliar ferramenta</DialogTitle>
                  <DialogDescription>
                    Compartilhe sua experiência com esta ferramenta
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Sua avaliação
                    </label>
                    {renderStars(selectedRating, "md", true)}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Comentário (opcional)
                    </label>
                    <Textarea
                      placeholder="Compartilhe sua experiência com esta ferramenta..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowRatingDialog(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSubmitRating}
                      disabled={rateMutation.isPending}
                    >
                      {rateMutation.isPending ? "Salvando..." : "Salvar avaliação"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {totalRatings > 0 && (
              <Dialog open={showRatingsDialog} onOpenChange={setShowRatingsDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Ver
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[600px] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Avaliações da ferramenta</DialogTitle>
                    <DialogDescription>
                      Veja o que outros usuários pensam sobre esta ferramenta
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    {ratings.map((rating: Rating) => (
                      <Card key={rating.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <span className="font-medium text-sm">
                                {rating.user.username}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {renderStars(rating.rating)}
                              <span className="text-xs text-gray-500">
                                {formatDate(rating.createdAt)}
                              </span>
                            </div>
                          </div>
                        </CardHeader>
                        {rating.comment && (
                          <CardContent className="pt-0">
                            <p className="text-sm text-gray-700">{rating.comment}</p>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                    
                    {ratings.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        Nenhuma avaliação encontrada.
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </div>
    </div>
  );
}