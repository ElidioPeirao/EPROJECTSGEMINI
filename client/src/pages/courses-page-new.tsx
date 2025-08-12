import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Course as BaseCourse } from "@shared/schema";
import { Loader2, Search, BookOpen, Bookmark, Clock, Award, Lock } from "lucide-react";

// Estender o tipo Course para incluir a propriedade hasAccess
interface Course extends BaseCourse {
  hasAccess?: boolean;
}
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

// Tipos para os filtros
type SortOrder = "new" | "popular" | "name-asc" | "name-desc";
type LevelFilter = "all" | "beginner" | "intermediate" | "advanced";
type ViewFilter = "all" | "purchased";

// Schema para o formulário de código promocional
const promoCodeSchema = z.object({
  code: z.string().min(3, "Código deve ter pelo menos 3 caracteres"),
});

export default function CoursesPage() {
  const [location, setLocation] = useLocation();
  const { isAdmin, isEMaster } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>("new");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");
  const [isPromoDialogOpen, setIsPromoDialogOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  
  // Formulário para o código promocional
  const promoCodeForm = useForm<z.infer<typeof promoCodeSchema>>({
    resolver: zodResolver(promoCodeSchema),
    defaultValues: {
      code: "",
    },
  });
  
  // Mutation para usar código promocional
  const usePromoCodeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof promoCodeSchema>) => {
      if (!selectedCourseId) {
        throw new Error("Nenhum curso selecionado");
      }
      const response = await apiRequest("POST", "/api/promocodes/use", {
        ...data,
        courseId: selectedCourseId // Incluir ID do curso na requisição
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao utilizar o código promocional");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      console.log("Resposta do código promocional:", data);
      
      // Invalidar os dados do curso atual
      if (selectedCourseId) {
        queryClient.invalidateQueries({ queryKey: [`/api/courses/${selectedCourseId}/access`] });
        queryClient.invalidateQueries({ queryKey: [`/api/courses/${selectedCourseId}`] });
      }
      
      // Invalidar lista de cursos
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      
      // Invalidar dados do usuário se necessário
      if (data.user) {
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      }
      
      toast({
        title: "Código promocional ativado",
        description: data.message,
        variant: "default",
      });
      
      // Fechar o diálogo e redirecionar para a página do curso
      setIsPromoDialogOpen(false);
      if (selectedCourseId) {
        setLocation(`/courses/${selectedCourseId}`);
      }
      
      // Resetar o formulário
      promoCodeForm.reset();
    },
    onError: (error: Error) => {
      console.error("Erro ao usar código promocional:", error);
      toast({
        title: "Erro ao ativar código",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Função para lidar com o clique em um curso
  const handleCourseClick = (course: Course) => {
    // Garante que hasAccess seja tratado como false quando for undefined 
    // (caso a resposta do servidor ainda não tenha chegado)
    const hasAccess = !!course.hasAccess;
    
    if (course.requiresPromoCode && !isAdmin && !hasAccess) {
      // Se o curso requer código promocional e o usuário não tem acesso, abrir diálogo
      setSelectedCourseId(course.id);
      setSelectedCourse(course);
      setIsPromoDialogOpen(true);
    } else {
      // Caso contrário, redirecionar para a página do curso
      setLocation(`/courses/${course.id}`);
    }
  };
  
  // Função para submeter o formulário de código promocional
  const handleUsePromoCode = (data: z.infer<typeof promoCodeSchema>) => {
    console.log("Enviando código promocional:", data);
    usePromoCodeMutation.mutate(data);
  };
  
  // Buscar cursos via API
  const { data: courses = [], isLoading, error } = useQuery<Course[]>({
    queryKey: ['/api/courses'],
  });
  
  // Filtrar cursos com base na pesquisa, categoria, nível, visibilidade e acesso
  const filteredCourses = courses.filter(course => {
    // Verificar se corresponde à pesquisa
    const matchesSearch = 
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.instructor.toLowerCase().includes(searchTerm.toLowerCase());
      
    // Verificar se corresponde à categoria selecionada  
    const matchesCategory = activeCategory === 'all' || course.category === activeCategory;
    
    // Verificar se corresponde ao nível selecionado
    const matchesLevel = levelFilter === 'all' || course.level === levelFilter;
    
    // Só mostrar cursos visíveis, exceto para admin que veem tudo
    const isVisible = isAdmin ? true : !course.isHidden;
    
    // Filtrar por cursos adquiridos (com acesso via códigos promocionais)
    // Se o filtro for 'purchased', apenas mostrar cursos que requerem código e têm acesso
    // Usamos !!course.hasAccess para garantir que undefined seja tratado como false
    const matchesViewFilter = viewFilter === 'all' || 
      (viewFilter === 'purchased' && course.requiresPromoCode === true && !!course.hasAccess === true);
    
    return matchesSearch && matchesCategory && matchesLevel && isVisible && matchesViewFilter;
  });

  // Ordenar os cursos filtrados
  const sortedCourses = [...filteredCourses].sort((a, b) => {
    switch (sortOrder) {
      case "new":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "name-asc":
        return a.title.localeCompare(b.title);
      case "name-desc":
        return b.title.localeCompare(a.title);
      default:
        return 0;
    }
  });
  
  // Obter categorias únicas para as abas, filtrando apenas categorias visíveis para usuários não-admin
  // Se houver apenas um curso de uma categoria e ele estiver oculto, a categoria não aparecerá nos filtros
  const visibleCoursesForCategories = isAdmin ? courses : courses.filter(course => !course.isHidden);
  const uniqueCategories = Array.from(new Set(visibleCoursesForCategories.map(course => course.category)));
  const categories = ['all', ...uniqueCategories];
  
  // Estado de carregamento
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="flex flex-col items-center justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin text-ep-orange mb-4" />
            <p className="text-lg font-medium">Carregando cursos...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Estado de erro
  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="max-w-md p-4">
            <h2 className="text-xl font-bold text-red-600 mb-2">Erro ao carregar cursos</h2>
            <p className="text-gray-600 mb-4">Ocorreu um problema ao buscar os cursos. Por favor, tente novamente mais tarde.</p>
            <Button 
              onClick={() => window.location.reload()}
              className="bg-ep-orange hover:bg-ep-orange/90"
            >
              Tentar novamente
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  // Renderizar os badges de categoria
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "mechanical":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Mecânica</Badge>;
      case "electrical":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Elétrica</Badge>;
      case "textile":
        return <Badge variant="outline" className="bg-pink-100 text-pink-800">Têxtil</Badge>;
      case "informatics":
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">Informática</Badge>;
      case "chemical":
        return <Badge variant="outline" className="bg-green-100 text-green-800">Química</Badge>;
      default:
        return <Badge variant="outline">Outro</Badge>;
    }
  };
  
  // Renderizar os badges de nível
  const getLevelBadge = (level: string) => {
    switch (level) {
      case "beginner":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 flex items-center gap-1">
            <Award className="w-3 h-3" />
            Iniciante
          </Badge>
        );
      case "intermediate":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 flex items-center gap-1">
            <Award className="w-3 h-3" />
            Intermediário
          </Badge>
        );
      case "advanced":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 flex items-center gap-1">
            <Award className="w-3 h-3" />
            Avançado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">Desconhecido</Badge>
        );
    }
  };
  
  // Converter nome da categoria para exibição
  const getCategoryDisplayName = (category: string) => {
    switch (category) {
      case "all": return "Todos";
      case "mechanical": return "Mecânica";
      case "electrical": return "Elétrica";
      case "textile": return "Têxtil";
      case "informatics": return "Informática";
      case "chemical": return "Química";
      default: return category;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <div className="max-w-3xl">
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                Cursos Especializados em Engenharia
              </h1>
              <p className="text-lg sm:text-xl text-gray-300 mb-6">
                Desenvolva suas habilidades com cursos projetados por especialistas para profissionais da indústria.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Buscar por cursos, tópicos ou instrutores..."
                    className="pl-10 bg-gray-800 border-gray-700 text-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <select 
                  className="h-10 rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                >
                  <option value="new">Mais recentes</option>
                  <option value="name-asc">Nome (A-Z)</option>
                  <option value="name-desc">Nome (Z-A)</option>
                </select>
                
                <select 
                  className="h-10 rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value as LevelFilter)}
                >
                  <option value="all">Todos os níveis</option>
                  <option value="beginner">Iniciante</option>
                  <option value="intermediate">Intermediário</option>
                  <option value="advanced">Avançado</option>
                </select>
                
                <select 
                  className="h-10 rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
                  value={viewFilter}
                  onChange={(e) => setViewFilter(e.target.value as ViewFilter)}
                >
                  <option value="all">Todos os cursos</option>
                  <option value="purchased">Desbloqueados com código</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        {/* Content Section */}
        <div className="py-8 sm:py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-ep-black">
                  {searchTerm ? `Resultados da busca: "${searchTerm}"` : 'Todos os Cursos'}
                </h2>
                <p className="text-gray-600 mt-1">
                  {sortedCourses.length} {sortedCourses.length === 1 ? 'curso encontrado' : 'cursos encontrados'}
                </p>
              </div>
              
              {isAdmin && (
                <Button 
                  className="mt-4 sm:mt-0 bg-ep-orange hover:bg-ep-orange/90"
                  onClick={() => setLocation('/admin')}
                >
                  Gerenciar Cursos
                </Button>
              )}
            </div>
            
            {/* Verificar se há cursos visíveis para o usuário */}
            {sortedCourses.length === 0 ? (
              <div className="text-center py-12 border rounded-lg bg-gray-50">
                <h3 className="text-xl font-medium text-gray-900">Nenhum curso disponível</h3>
                <p className="mt-2 text-gray-500">
                  {isAdmin ? 
                    "Não há cursos cadastrados. Você pode criar novos cursos na seção administrativa." :
                    "Não há cursos disponíveis no momento. Volte em breve para novidades."
                  }
                </p>
                {isAdmin && (
                  <Button 
                    className="mt-4 bg-ep-orange hover:bg-ep-orange/90"
                    onClick={() => setLocation('/admin')}
                  >
                    Criar Cursos
                  </Button>
                )}
              </div>
            ) : (
              <Tabs defaultValue="all" onValueChange={setActiveCategory} className="mb-8">
                <TabsList className="mb-6 flex flex-wrap">
                  {categories.map((category) => (
                    <TabsTrigger 
                      key={category} 
                      value={category} 
                      className="capitalize px-4 py-2"
                    >
                      {getCategoryDisplayName(category)}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {categories.map((category) => (
                  <TabsContent key={category} value={category} className="space-y-6">
                    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                      {sortedCourses
                        .filter(course => category === 'all' || course.category === category)
                        .map((course) => (
                          <Card 
                            key={course.id} 
                            className={cn(
                              "overflow-hidden transition-all hover:shadow-lg border-gray-200 cursor-pointer group",
                              course.isHidden && "border-dashed border-amber-300"
                            )}
                            onClick={() => handleCourseClick(course)}
                          >
                            {course.isHidden && (
                              <div className="bg-amber-50 px-3 py-1 text-amber-800 text-xs font-medium">
                                Curso oculto (visível apenas para administradores)
                              </div>
                            )}
                            <CardHeader className="pb-2">
                              <div className="flex flex-wrap gap-2 mb-2">
                                {getCategoryBadge(course.category)}
                                {getLevelBadge(course.level)}
                                <Badge variant="outline" className="bg-gray-100 text-gray-800 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {course.duration}
                                </Badge>
                              </div>
                              <CardTitle className="text-xl font-bold group-hover:text-ep-orange transition-colors">
                                {course.title}
                              </CardTitle>
                              <CardDescription className="font-medium flex items-center gap-1">
                                <BookOpen className="w-4 h-4" />
                                {course.instructor}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="pb-2">
                              <p className="text-sm line-clamp-3 text-gray-600">{course.description}</p>
                            </CardContent>
                            <CardFooter className="pt-2">
                              <Button 
                                className="w-full bg-ep-orange hover:bg-ep-orange/90 group-hover:scale-105 transition-transform"
                                onClick={() => {
                                  if (course.requiresPromoCode && !(!!course.hasAccess) && !isAdmin) {
                                    // Abrir diálogo de código promocional
                                    setSelectedCourse(course);
                                    setIsPromoDialogOpen(true);
                                  } else {
                                    // Navegar direto para o curso
                                    window.location.href = `/courses/${course.id}`;
                                  }
                                }}
                              >
                                {course.requiresPromoCode && !(!!course.hasAccess) && !isAdmin ? (
                                  <>
                                    <Lock className="w-4 h-4 mr-2" />
                                    Ver Curso
                                  </>
                                ) : (
                                  <>Ver Curso</>
                                )}
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                    </div>
                    
                    {sortedCourses.filter(course => category === 'all' || course.category === category).length === 0 && (
                      <div className="text-center py-12 border rounded-lg bg-gray-50">
                        <h3 className="text-xl font-medium text-gray-900">Nenhum curso encontrado</h3>
                        <p className="mt-2 text-gray-500">
                          Tente ajustar sua pesquisa ou filtros.
                        </p>
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
      
      {/* Diálogo de Código Promocional */}
      <Dialog open={isPromoDialogOpen} onOpenChange={setIsPromoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Acesso Exclusivo</DialogTitle>
            <DialogDescription>
              {selectedCourse && (
                <>
                  O curso <span className="font-semibold">{selectedCourse.title}</span> requer um código promocional para acesso.
                  Digite seu código abaixo para desbloquear o conteúdo.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...promoCodeForm}>
            <form onSubmit={promoCodeForm.handleSubmit(handleUsePromoCode)} className="space-y-4">
              <FormField
                control={promoCodeForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código Promocional</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite seu código promocional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="mt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsPromoDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  className="bg-ep-orange hover:bg-ep-orange/90"
                  disabled={usePromoCodeMutation.isPending}
                >
                  {usePromoCodeMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Desbloquear Curso
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}