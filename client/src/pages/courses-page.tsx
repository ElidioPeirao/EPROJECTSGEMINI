import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Loader2, LockIcon } from "lucide-react";
import { Course } from "@shared/schema";

export default function CoursesPage() {
  const [, setLocation] = useLocation();
  const { isAdmin, isEMaster } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  
  // Buscar cursos via API
  const { data: courses = [], isLoading, error } = useQuery<Course[]>({
    queryKey: ['/api/courses'],
  });
  
  // Log dos cursos para depuração
  console.log('Cursos recebidos:', courses);
  
  // Filtrar cursos com base na pesquisa, categoria e visibilidade
  const filteredCourses = courses.filter(course => {
    const matchesSearch = 
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.instructor.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesCategory = activeCategory === 'all' || course.category === activeCategory;
    
    // Só mostrar cursos visíveis, exceto para admin que veem tudo
    const isVisible = isAdmin ? true : !course.isHidden;
    
    return matchesSearch && matchesCategory && isVisible;
  });
  
  // Obter categorias únicas para as abas
  const uniqueCategories = Array.from(new Set(courses.map(course => course.category)));
  const categories = ['all', ...uniqueCategories];
  
  // Renderiza o badge de categoria
  const CategoryBadge = ({ category }: { category: string }) => {
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
  
  // Renderiza o badge de nível
  const LevelBadge = ({ level }: { level: string }) => {
    switch (level) {
      case "beginner":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800">
            Iniciante
          </Badge>
        );
      case "intermediate":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            Intermediário
          </Badge>
        );
      case "advanced":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800">
            Avançado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">Desconhecido</Badge>
        );
    }
  };

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
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow">
        <div className="py-6 sm:py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-ep-black">Cursos</h1>
                <p className="text-gray-600 mt-2">
                  Explore nossa biblioteca de cursos especializados em diversas áreas de engenharia.
                </p>
              </div>
              
              {(isAdmin || isEMaster) && (
                <Button 
                  className="mt-4 sm:mt-0 bg-ep-orange hover:bg-ep-orange/90"
                  onClick={() => setLocation('/admin')}
                >
                  Gerenciar Cursos
                </Button>
              )}
            </div>
            
            <div className="mb-8">
              <Input
                type="search"
                placeholder="Buscar cursos..."
                className="max-w-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Verificar se há cursos visíveis para o usuário */}
            {courses.filter(course => {
              return isAdmin ? true : !course.isHidden;
            }).length === 0 ? (
              <div className="text-center py-12 border rounded-lg bg-gray-50">
                <h3 className="text-xl font-medium text-gray-900">Nenhum curso disponível</h3>
                <p className="mt-2 text-gray-500">
                  {isAdmin || isEMaster ? 
                    "Não há cursos cadastrados. Você pode criar novos cursos na seção administrativa." :
                    "Não há cursos disponíveis no momento. Volte em breve para novidades."
                  }
                </p>
                {(isAdmin || isEMaster) && (
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
                <TabsList className="mb-4">
                  {categories.map((category) => (
                    <TabsTrigger key={category} value={category} className="capitalize">
                      {category === 'all' ? 'Todos' : 
                      category === 'mechanical' ? 'Mecânica' :
                      category === 'electrical' ? 'Elétrica' :
                      category === 'textile' ? 'Têxtil' :
                      category === 'informatics' ? 'Informática' :
                      category === 'chemical' ? 'Química' : category}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {categories.map((category) => (
                  <TabsContent key={category} value={category} className="space-y-4">
                    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                      {filteredCourses
                        .filter(course => category === 'all' || course.category === category)
                        .map((course) => (
                          <Card key={course.id} className="overflow-hidden transition-all hover:shadow-md">
                            <CardHeader className="pb-3">
                              <div className="flex flex-wrap gap-2 mb-2">
                                <CategoryBadge category={course.category} />
                                <LevelBadge level={course.level} />
                                <Badge variant="outline" className="bg-gray-100 text-gray-800">
                                  {course.duration}
                                </Badge>
                              </div>
                              <CardTitle className="text-xl font-bold">{course.title}</CardTitle>
                              <CardDescription className="font-medium">
                                {course.instructor}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="pb-3">
                              <p className="text-sm line-clamp-3">{course.description}</p>
                            </CardContent>
                            <CardFooter>
                              {course.price && typeof course.price === 'number' && course.price > 0 ? (
                                <Button 
                                  className="w-full bg-ep-orange hover:bg-ep-orange/90 flex items-center justify-center gap-2"
                                  onClick={() => setLocation(`/courses/${course.id}`)}
                                >
                                  <LockIcon className="h-4 w-4" /> 
                                  Ver Curso - R$ {Number(course.price).toFixed(2)}
                                </Button>
                              ) : (
                                <Button 
                                  className="w-full bg-ep-orange hover:bg-ep-orange/90"
                                  onClick={() => setLocation(`/courses/${course.id}`)}
                                >
                                  {course.requiresPromoCode ? (
                                    <span className="flex items-center gap-2">
                                      <LockIcon className="h-4 w-4" /> Ver Curso
                                    </span>
                                  ) : (
                                    "Ver Curso"
                                  )}
                                </Button>
                              )}
                            </CardFooter>
                          </Card>
                        ))}
                    </div>
                    
                    {filteredCourses.filter(course => category === 'all' || course.category === category).length === 0 && (
                      <div className="text-center py-12">
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
    </div>
  );
}