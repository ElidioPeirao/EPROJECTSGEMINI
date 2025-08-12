import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import Footer from "@/components/footer";
import ToolCard from "@/components/tool-card";
import { Tool } from "@shared/schema";
import { format, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "wouter";
import { Search } from "lucide-react";

type FilterType =
  | "all"
  | "mechanical"
  | "electrical"
  | "textile"
  | "informatics"
  | "chemical"
  | "blocked";

export default function DashboardPage() {
  const { user, isEMaster, isETool, isEBasic, isAdmin, usePromoCodeMutation } =
    useAuth();
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [promoCode, setPromoCode] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Verificar se há parâmetro de pagamento com sucesso na URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get("payment_success");

    if (paymentSuccess === "true") {
      // Remover o parâmetro da URL para evitar mensagens duplicadas em refresh
      window.history.replaceState({}, document.title, window.location.pathname);

      // Mostrar notificação de sucesso
      toast({
        title: "Pagamento processado com sucesso!",
        description: "Seu plano foi atualizado. Aproveite os novos recursos.",
        variant: "default",
      });
    }
  }, [toast]);

  const { data: tools, isLoading } = useQuery<Tool[]>({
    queryKey: ["/api/tools"],
  });

  const handleActivatePromo = () => {
    if (!promoCode.trim()) {
      toast({
        title: "Código Promocional",
        description: "Por favor, insira um código promocional.",
        variant: "destructive",
      });
      return;
    }

    usePromoCodeMutation.mutate(
      { code: promoCode },
      {
        onSuccess: (data) => {
          toast({
            title: "Sucesso",
            description: data.message,
            variant: "default",
          });
          setPromoCode("");
        },
        onError: (error) => {
          toast({
            title: "Erro",
            description: error.message,
            variant: "destructive",
          });
        },
      },
    );
  };

  // Função para verificar se uma ferramenta deve ser completamente oculta (por restrições de CPF)
  const isToolHidden = (tool: Tool) => {
    if (isAdmin) return false; // Admin sempre vê todas as ferramentas
    
    // Verificar se a ferramenta tem restrições de CPF
    if (tool.restrictedCpfs && tool.restrictedCpfs.trim() !== "") {
      if (!user?.cpf || user.cpf.trim() === "") {
        return true; // Usuário não tem CPF cadastrado, ferramenta fica oculta
      }
      
      // Verificar se o CPF do usuário está na lista de CPFs autorizados
      const authorizedCpfs = tool.restrictedCpfs
        .split(',')
        .map(cpf => cpf.trim().replace(/\D/g, '')) // Remove caracteres não numéricos
        .filter(cpf => cpf.length > 0);
      
      const userCpf = user.cpf.replace(/\D/g, ''); // Remove caracteres não numéricos
      
      if (!authorizedCpfs.includes(userCpf)) {
        return true; // CPF do usuário não está autorizado, ferramenta fica oculta
      }
    }
    
    return false; // Ferramenta não deve ser oculta
  };

  // Função para verificar se o usuário tem acesso a uma ferramenta (apenas para nível de acesso)
  const hasAccessToTool = (tool: Tool) => {
    if (isAdmin) return true; // Admin tem acesso a tudo
    
    // Hierarquia de acesso: E-BASIC < E-TOOL < E-MASTER
    if (tool.accessLevel === "E-BASIC") return true; // Todos têm acesso ao E-BASIC
    if (tool.accessLevel === "E-TOOL") return isETool || isEMaster; // E-TOOL e E-MASTER têm acesso
    if (tool.accessLevel === "E-MASTER") return isEMaster; // Apenas E-MASTER tem acesso
    
    return false;
  };

  // Função para filtrar ferramentas com base na busca e na categoria
  const filteredTools = useMemo(() => {
    if (!tools) return [];

    return tools.filter((tool) => {
      // Primeiro, verificar se a ferramenta deve ser completamente oculta
      if (isToolHidden(tool)) {
        return false; // Ferramenta com restrição de CPF não autorizada - ocultar completamente
      }

      const hasAccess = hasAccessToTool(tool);
      
      // Se o filtro for "blocked", mostrar apenas ferramentas sem acesso
      if (activeFilter === "blocked") {
        if (hasAccess) return false; // Se tem acesso, não mostrar na categoria bloqueado
      } else {
        // Para outras categorias, não mostrar ferramentas bloqueadas
        if (!hasAccess) return false;
        
        // Filtra pela categoria
        const categoryMatch = activeFilter === "all" || tool.category === activeFilter;
        if (!categoryMatch) return false;
      }

      // Se não houver termo de busca, retorna com base no filtro de categoria
      if (!searchTerm.trim()) return true;

      // Busca case-insensitive no nome e descrição da ferramenta
      const search = searchTerm.toLowerCase();
      const nameMatch = tool.name.toLowerCase().includes(search);
      const descriptionMatch = tool.description.toLowerCase().includes(search);

      return nameMatch || descriptionMatch;
    });
  }, [tools, activeFilter, searchTerm, isAdmin, isETool, isEMaster, user]);

  // Verificar se há ferramentas bloqueadas para o usuário (excluindo as ocultas por CPF)
  const hasBlockedTools = useMemo(() => {
    if (isAdmin || !tools) return false;
    return tools.some(tool => !isToolHidden(tool) && !hasAccessToTool(tool));
  }, [tools, isAdmin, isETool, isEMaster, user]);

  // Obter categorias que possuem pelo menos uma ferramenta
  const availableCategories = useMemo(() => {
    if (isAdmin) {
      return ["all", "mechanical", "electrical", "textile", "informatics", "chemical"];
    }
    
    const accessibleCategories = Array.from(
      new Set(tools?.filter(tool => !isToolHidden(tool) && hasAccessToTool(tool)).map(tool => tool.category) || [])
    );
    
    const categories = ["all", ...accessibleCategories];
    
    // Adicionar categoria "blocked" se houver ferramentas bloqueadas
    if (hasBlockedTools) {
      categories.push("blocked");
    }
    
    return categories;
  }, [tools, isAdmin, hasBlockedTools]);

  // Verifica se uma categoria está disponível nos filtros
  const isCategoryAvailable = (category: FilterType) => {
    return availableCategories.includes(category);
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-ep-black">
                Bem-vindo à <span className="text-ep-orange">EPROJECTS</span>
              </h1>
              <p className="mt-2 text-gray-600">Bem-vindo, {user?.username}!</p>

              {/* User Role Badge */}
              <div className="mt-3">
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
                ) : isEMaster ? (
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
                    E-MASTER{" "}
                    {getProExpiryText() ? `(até ${getProExpiryText()})` : ""}
                  </Badge>
                ) : isETool ? (
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
                    E-TOOL{" "}
                    {getProExpiryText() ? `(até ${getProExpiryText()})` : ""}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-gray-100 text-gray-800"
                  >
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
                    E-BASIC
                  </Badge>
                )}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex justify-center gap-4 mb-8">
              {/* Botão de Cursos */}
              <Card className="flex-1 max-w-[220px]">
                <CardContent className="p-4 text-center">
                  {isEMaster ? (
                    <Button
                      variant="outline"
                      className="w-full h-16 flex flex-col gap-2 hover:bg-ep-orange/10"
                      asChild
                    >
                      <Link href="/courses">
                        <svg
                          className="h-6 w-6 text-ep-orange"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                          />
                        </svg>
                        <span>Cursos</span>
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full h-16 flex flex-col gap-2 relative hover:bg-ep-orange/10"
                      onClick={() => {
                        toast({
                          title: "Acesso Restrito",
                          description:
                            "Esta funcionalidade está disponível apenas para usuários E-MASTER. Faça upgrade da sua conta para acessar os cursos.",
                          variant: "destructive",
                        });
                      }}
                    >
                      <svg
                        className="h-6 w-6 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                      </svg>
                      <span className="text-gray-500">Cursos</span>
                      <svg
                        className="absolute top-2 right-2 h-5 w-5 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </Button>
                  )}
                </CardContent>
              </Card>

              {isAdmin && (
                <Card className="flex-1 max-w-[220px]">
                  <CardContent className="p-4 text-center">
                    <Button
                      variant="outline"
                      className="w-full h-16 flex flex-col gap-2 hover:bg-ep-orange/10"
                      asChild
                    >
                      <Link href="/admin">
                        <svg
                          className="h-6 w-6 text-ep-orange"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <span>Admin</span>
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card className="flex-1 max-w-[220px]">
                <CardContent className="p-4 text-center">
                  <Button
                    variant="outline"
                    className="w-full h-16 flex flex-col gap-2 hover:bg-ep-orange/10"
                    asChild
                  >
                    <Link href="/account">
                      <svg
                        className="h-6 w-6 text-ep-orange"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <span>Conta</span>
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Promo Code Input */}
            <Card className="max-w-lg mx-auto mb-8">
              <CardContent className="p-4">
                <h3 className="text-lg font-medium text-ep-black mb-3">
                  Ativar código promocional
                </h3>
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
              </CardContent>
            </Card>

            {/* Search and Filter Section */}
            <div className="flex justify-center items-center mb-6">
              <div className="relative max-w-xs mx-auto w-full transition-all duration-200">
                <div
                  className={`flex items-center rounded-full border ${isSearchActive ? "border-ep-orange ring-1 ring-ep-orange/20" : "border-gray-300"} 
                  transition-all duration-200 overflow-hidden ${isSearchActive ? "w-64" : "w-10"}`}
                >
                  <button
                    className="p-2 text-gray-500 hover:text-ep-orange transition-colors duration-200"
                    onClick={() => {
                      setIsSearchActive(!isSearchActive);
                      if (!isSearchActive) {
                        // Focar no input quando expandir
                        setTimeout(() => {
                          const input =
                            document.getElementById("tool-search-input");
                          if (input) input.focus();
                        }, 200);
                      } else {
                        // Limpar busca quando colapsar
                        setSearchTerm("");
                      }
                    }}
                  >
                    <Search
                      size={20}
                      className={
                        isSearchActive ? "text-ep-orange" : "text-gray-500"
                      }
                    />
                  </button>

                  <input
                    id="tool-search-input"
                    type="text"
                    className={`outline-none border-none px-2 py-1 w-full ${isSearchActive ? "opacity-100" : "opacity-0"} transition-opacity duration-200`}
                    placeholder="Buscar ferramenta..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {searchTerm && (
                  <div className="absolute right-0 top-10 mt-1 w-full">
                    <Badge
                      className="bg-ep-orange/10 text-ep-orange border-transparent hover:bg-ep-orange/20 cursor-pointer"
                      onClick={() => setSearchTerm("")}
                    >
                      {`"${searchTerm}" `}
                      <span className="ml-1">×</span>
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="mb-6 flex flex-wrap justify-center gap-2">
              {/* Botão Todos sempre visível */}
              <Button
                variant={activeFilter === "all" ? "default" : "outline"}
                className={
                  activeFilter === "all"
                    ? "bg-ep-orange hover:bg-ep-orange/90"
                    : ""
                }
                onClick={() => setActiveFilter("all")}
              >
                Todos
              </Button>

              {/* Botões de filtro por categoria - apenas mostrar se houver ferramentas naquela categoria ou se for admin */}
              {isCategoryAvailable("mechanical") && (
                <Button
                  variant={
                    activeFilter === "mechanical" ? "default" : "outline"
                  }
                  className={
                    activeFilter === "mechanical"
                      ? "bg-ep-orange hover:bg-ep-orange/90"
                      : ""
                  }
                  onClick={() => setActiveFilter("mechanical")}
                >
                  Mecânica
                </Button>
              )}

              {isCategoryAvailable("electrical") && (
                <Button
                  variant={
                    activeFilter === "electrical" ? "default" : "outline"
                  }
                  className={
                    activeFilter === "electrical"
                      ? "bg-ep-orange hover:bg-ep-orange/90"
                      : ""
                  }
                  onClick={() => setActiveFilter("electrical")}
                >
                  Elétrica
                </Button>
              )}

              {isCategoryAvailable("textile") && (
                <Button
                  variant={activeFilter === "textile" ? "default" : "outline"}
                  className={
                    activeFilter === "textile"
                      ? "bg-ep-orange hover:bg-ep-orange/90"
                      : ""
                  }
                  onClick={() => setActiveFilter("textile")}
                >
                  Têxtil
                </Button>
              )}

              {isCategoryAvailable("informatics") && (
                <Button
                  variant={
                    activeFilter === "informatics" ? "default" : "outline"
                  }
                  className={
                    activeFilter === "informatics"
                      ? "bg-ep-orange hover:bg-ep-orange/90"
                      : ""
                  }
                  onClick={() => setActiveFilter("informatics")}
                >
                  Informática
                </Button>
              )}

              {isCategoryAvailable("chemical") && (
                <Button
                  variant={activeFilter === "chemical" ? "default" : "outline"}
                  className={
                    activeFilter === "chemical"
                      ? "bg-ep-orange hover:bg-ep-orange/90"
                      : ""
                  }
                  onClick={() => setActiveFilter("chemical")}
                >
                  Química
                </Button>
              )}

              {isCategoryAvailable("blocked") && (
                <Button
                  variant={activeFilter === "blocked" ? "default" : "outline"}
                  className={
                    activeFilter === "blocked"
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "border-red-300 text-red-600 hover:bg-red-50"
                  }
                  onClick={() => setActiveFilter("blocked")}
                >
                  🔒 Bloqueado
                </Button>
              )}
            </div>

            {/* Tools Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="h-6 bg-gray-200 rounded mb-4 animate-pulse" />
                      <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse" />
                      <div className="h-4 bg-gray-200 rounded mb-4 animate-pulse w-3/4" />
                      <div className="h-10 bg-gray-200 rounded animate-pulse" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredTools.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTools.map((tool) => (
                  <ToolCard 
                    key={tool.id} 
                    tool={tool} 
                    isBlocked={activeFilter === "blocked"} 
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {activeFilter === "blocked" 
                    ? "Parabéns! Você tem acesso a todas as ferramentas disponíveis."
                    : searchTerm 
                      ? `Nenhuma ferramenta encontrada para "${searchTerm}".`
                      : "Nenhuma ferramenta disponível para esta categoria."
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
