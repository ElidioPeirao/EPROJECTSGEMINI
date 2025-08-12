import { useToast } from "@/hooks/use-toast";
import { Link, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  FileText, 
  Loader2, 
  ChevronLeft, 
  Video, 
  BookOpen,
  Play,
  Download,
  LinkIcon,
  Plus,
  Edit,
  Trash2,
  Lock,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Header from "@/components/header";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";

// Tipos do curso
type Course = {
  id: number;
  title: string;
  description: string;
  category: string;
  instructor: string;
  duration: string;
  level: "beginner" | "intermediate" | "advanced";
  imageUrl?: string;
  createdAt: string;
  requiresPromoCode?: boolean;
  hasAccess?: boolean;
  promoCodes?: PromoCode[];
  isPaid?: boolean;
  price?: number;
  hasPurchased?: boolean;
};

type Lesson = {
  id: number;
  courseId: number;
  title: string;
  description: string;
  youtubeUrl: string;
  videoSource: "youtube" | "drive";
  order: number;
};

type Material = {
  id: number;
  courseId: number;
  lessonId?: number;
  title: string;
  description?: string;
  fileUrl: string;
  fileType: string;
  iconType?: string;
  downloadable: boolean;
};

type PromoCode = {
  id: number;
  code: string;
  days: number;
  maxUses: number;
  usedCount: number;
  targetRole: string;
  promoType: "role" | "course";
  courseId?: number;
  isActive: boolean;
  expiryDate?: string;
  validUntil?: string;
  createdAt: string;
  createdBy: number;
};

// Esquemas de validação
const promoCodeSchema = z.object({
  code: z.string().min(3, "Código deve ter pelo menos 3 caracteres"),
});

const lessonSchema = z.object({
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres"),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres"),
  youtubeUrl: z.string().min(5, "URL do vídeo é obrigatória"),
  videoSource: z.enum(["youtube", "drive"], {
    required_error: "Selecione a fonte do vídeo",
  }),
  order: z.coerce.number().min(1, "A ordem deve ser maior que zero"),
});

const materialSchema = z.object({
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres"),
  description: z.string().optional(),
  fileUrl: z.string().min(5, "URL do arquivo é obrigatória"),
  fileType: z.string().min(1, "Tipo de arquivo é obrigatório"),
  iconType: z.enum(["file", "link", "object"], {
    required_error: "Selecione o tipo de ícone",
  }),
  downloadable: z.boolean().default(false),
  lessonId: z.number().optional(),
});

export default function CourseDetailPage() {
  // Hooks e estados essenciais
  const { id } = useParams<{ id: string }>();
  const courseId = parseInt(id);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  
  // Formulários
  const promoCodeForm = useForm<z.infer<typeof promoCodeSchema>>({
    resolver: zodResolver(promoCodeSchema),
    defaultValues: {
      code: "",
    },
  });

  const lessonForm = useForm<z.infer<typeof lessonSchema>>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: "",
      description: "",
      youtubeUrl: "",
      videoSource: "youtube",
      order: 1,
    },
  });

  const materialForm = useForm<z.infer<typeof materialSchema>>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      title: "",
      description: "",
      fileUrl: "",
      fileType: "pdf",
      iconType: "file",
      downloadable: false,
      lessonId: undefined,
    },
  });

  // Queries para carregar dados do curso
  const { data: courseData, isLoading: isLoadingCourse } = useQuery({
    queryKey: [`/api/courses/${courseId}`],
    enabled: !isNaN(courseId),
  });

  const course = courseData?.course;
  const isPaid = Boolean(course?.price != null && course.price > 0);
  
  const { data: accessData, isLoading: isCheckingAccess } = useQuery({
    queryKey: [`/api/courses/${courseId}/access`],
    enabled: !isNaN(courseId) && !!user,
  });

  // Determinar acesso antes de carregar aulas e materiais
  const hasAccess = Boolean(isAdmin || accessData?.hasAccess);
  const hasPurchased = Boolean(accessData?.hasPurchased);
  const requiresPromoCode = Boolean(course?.requiresPromoCode);
  
  const { data: lessons = [], isLoading: isLoadingLessons } = useQuery({
    queryKey: [`/api/courses/${courseId}/lessons`],
    enabled: !isNaN(courseId) && hasAccess,
  });

  const { data: materials = [], isLoading: isLoadingMaterials } = useQuery({
    queryKey: [`/api/courses/${courseId}/materials`],
    enabled: !isNaN(courseId) && hasAccess,
  });
  
  // Resetar formulários quando mudar os estados de edição
  useEffect(() => {
    if (editingLesson) {
      lessonForm.reset({
        title: editingLesson.title,
        description: editingLesson.description || "",
        youtubeUrl: editingLesson.youtubeUrl || "",
        videoSource: editingLesson.videoSource || "youtube",
        order: editingLesson.order || 1,
      });
    } else {
      lessonForm.reset({
        title: "",
        description: "",
        youtubeUrl: "",
        videoSource: "youtube",
        order: Array.isArray(lessons) && lessons.length 
          ? Math.max(...lessons.map((l: any) => l.order || 0)) + 1 
          : 1,
      });
    }
  }, [editingLesson, lessonForm, lessons]);

  useEffect(() => {
    if (editingMaterial) {
      materialForm.reset({
        title: editingMaterial.title,
        description: editingMaterial.description || "",
        fileUrl: editingMaterial.fileUrl || "",
        fileType: editingMaterial.fileType || "pdf",
        iconType: editingMaterial.iconType as "file" | "link" | "object",
        downloadable: editingMaterial.downloadable || false,
        lessonId: editingMaterial.lessonId,
      });
    } else {
      materialForm.reset({
        title: "",
        description: "",
        fileUrl: "",
        fileType: "pdf",
        iconType: "file",
        downloadable: false,
        lessonId: editingLessonId || undefined,
      });
    }
  }, [editingMaterial, materialForm, editingLessonId]);
  
  // Informações de acesso ao curso
  
  // Mutation para usar código promocional
  const usePromoCodeMutation = useMutation({
    mutationFn: async (data: { code: string }) => {
      return await apiRequest("POST", `/api/courses/${courseId}/use-promo-code`, data);
    },
    onSuccess: () => {
      toast({
        title: "Código promocional aplicado",
        description: "Você agora tem acesso ao curso!",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/access`] });
      promoCodeForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao aplicar código",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para excluir aula
  const deleteLessonMutation = useMutation({
    mutationFn: async (lessonId: number) => {
      return await apiRequest("DELETE", `/api/courses/${courseId}/lessons/${lessonId}`);
    },
    onSuccess: () => {
      toast({
        title: "Aula removida",
        description: "A aula foi removida com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/lessons`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover aula",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation para excluir material
  const deleteMaterialMutation = useMutation({
    mutationFn: async (materialId: number) => {
      return await apiRequest("DELETE", `/api/courses/${courseId}/materials/${materialId}`);
    },
    onSuccess: () => {
      toast({
        title: "Material removido",
        description: "O material foi removido com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/materials`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover material",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutations para aulas e materiais
  const createLessonMutation = useMutation({
    mutationFn: async (data: z.infer<typeof lessonSchema>) => {
      return await apiRequest("POST", `/api/courses/${courseId}/lessons`, data);
    },
    onSuccess: () => {
      toast({
        title: "Aula criada",
        description: "A aula foi criada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/lessons`] });
      setEditingLesson(null);
      setLessonDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar aula",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateLessonMutation = useMutation({
    mutationFn: async (data: { id: number; lesson: z.infer<typeof lessonSchema> }) => {
      return await apiRequest("PUT", `/api/courses/${courseId}/lessons/${data.id}`, data.lesson);
    },
    onSuccess: () => {
      toast({
        title: "Aula atualizada",
        description: "A aula foi atualizada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/lessons`] });
      setEditingLesson(null);
      setLessonDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar aula",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createMaterialMutation = useMutation({
    mutationFn: async (data: z.infer<typeof materialSchema>) => {
      return await apiRequest("POST", `/api/courses/${courseId}/materials`, data);
    },
    onSuccess: () => {
      toast({
        title: "Material criado",
        description: "O material foi criado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/materials`] });
      setEditingMaterial(null);
      setEditingLessonId(null);
      setMaterialDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar material",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMaterialMutation = useMutation({
    mutationFn: async (data: { id: number; material: z.infer<typeof materialSchema> }) => {
      return await apiRequest("PUT", `/api/courses/${courseId}/materials/${data.id}`, data.material);
    },
    onSuccess: () => {
      toast({
        title: "Material atualizado",
        description: "O material foi atualizado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/materials`] });
      setEditingMaterial(null);
      setMaterialDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar material",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handlers
  const handleUsePromoCode = (data: z.infer<typeof promoCodeSchema>) => {
    usePromoCodeMutation.mutate(data);
  };
  
  const handleLessonSubmit = (data: z.infer<typeof lessonSchema>) => {
    if (editingLesson) {
      updateLessonMutation.mutate({ id: editingLesson.id, lesson: data });
    } else {
      createLessonMutation.mutate(data);
    }
  };
  
  const handleMaterialSubmit = (data: z.infer<typeof materialSchema>) => {
    if (editingMaterial) {
      updateMaterialMutation.mutate({ id: editingMaterial.id, material: data });
    } else {
      createMaterialMutation.mutate(data);
    }
  };
  
  // Funções para confirmação de exclusão
  const handleDeleteLesson = (lessonId: number) => {
    if (confirm("Tem certeza que deseja excluir esta aula? Esta ação não pode ser desfeita.")) {
      deleteLessonMutation.mutate(lessonId);
    }
  };
  
  const handleDeleteMaterial = (materialId: number) => {
    if (confirm("Tem certeza que deseja excluir este material? Esta ação não pode ser desfeita.")) {
      deleteMaterialMutation.mutate(materialId);
    }
  };
  
  // Função para renderizar ícone do material
  const getMaterialIcon = (fileType: string, iconType?: string) => {
    switch (iconType) {
      case "link":
        return <LinkIcon className="h-5 w-5 text-blue-500" />;
      case "object":
        switch (fileType) {
          case "video":
            return <Video className="h-5 w-5 text-red-500" />;
          case "audio":
            return <FileText className="h-5 w-5 text-purple-500" />;
          case "image":
            return <FileText className="h-5 w-5 text-green-500" />;
          case "pdf":
            return <FileText className="h-5 w-5 text-red-600" />;
          case "spreadsheet":
            return <FileText className="h-5 w-5 text-green-600" />;
          default:
            return <FileText className="h-5 w-5 text-gray-500" />;
        }
      case "file":
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };
  
  // Funções auxiliares para renderização de badges
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "mechanical": return <Badge variant="outline" className="bg-blue-100 text-blue-800">Mecânica</Badge>;
      case "electrical": return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Elétrica</Badge>;
      case "textile": return <Badge variant="outline" className="bg-pink-100 text-pink-800">Têxtil</Badge>;
      case "informatics": return <Badge variant="outline" className="bg-purple-100 text-purple-800">Informática</Badge>;
      case "chemical": return <Badge variant="outline" className="bg-green-100 text-green-800">Química</Badge>;
      default: return <Badge variant="outline">Outro</Badge>;
    }
  };
  
  const getLevelBadge = (level: string) => {
    switch (level) {
      case "beginner": return <Badge variant="outline" className="bg-green-100 text-green-800">Iniciante</Badge>;
      case "intermediate": return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Intermediário</Badge>;
      case "advanced": return <Badge variant="outline" className="bg-red-100 text-red-800">Avançado</Badge>;
      default: return <Badge variant="outline">Outro</Badge>;
    }
  };
  
  // Verificação de carregamento
  if (isLoadingCourse || isCheckingAccess) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 container mx-auto py-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando informações do curso...</p>
          </div>
        </div>
      </div>
    );
  }

  // Se o curso não existir
  if (!course) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 container mx-auto py-10 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Curso não encontrado</h1>
            <p className="text-muted-foreground mb-6">Este curso não existe ou foi removido.</p>
            <Link href="/courses">
              <Button>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Voltar para cursos
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Se necessitar de código promocional e o usuário não tiver acesso
  if (!isAdmin && requiresPromoCode && !hasAccess) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 container mx-auto py-10">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center mb-6">
              <Link href="/courses">
                <Button variant="ghost" size="sm">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Voltar para cursos
                </Button>
              </Link>
            </div>
            
            <Card className="mb-8">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl mb-2">{course.title}</CardTitle>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {getCategoryBadge(course.category)}
                      {getLevelBadge(course.level)}
                    </div>
                  </div>
                  <Lock className="h-6 w-6 text-orange-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none dark:prose-invert mb-6">
                  <p>{course.description}</p>
                </div>
                
                <div className="bg-muted p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Acesso Restrito</h3>
                  <p className="mb-4">Este curso requer um código promocional para acesso.</p>
                  
                  <Form {...promoCodeForm}>
                    <form onSubmit={promoCodeForm.handleSubmit(handleUsePromoCode)} className="space-y-4">
                      <FormField
                        control={promoCodeForm.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Código Promocional</FormLabel>
                            <FormControl>
                              <Input placeholder="Digite o código promocional" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        disabled={usePromoCodeMutation.isPending}
                        className="w-full md:w-auto"
                      >
                        {usePromoCodeMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verificando...
                          </>
                        ) : (
                          "Desbloquear Acesso"
                        )}
                      </Button>
                    </form>
                  </Form>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Se for um curso pago e o usuário não o comprou
  if (!isAdmin && isPaid && !hasPurchased) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 container mx-auto py-10">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center mb-6">
              <Link href="/courses">
                <Button variant="ghost" size="sm">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Voltar para cursos
                </Button>
              </Link>
            </div>
            
            <Card className="mb-8">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl mb-2">{course.title}</CardTitle>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {getCategoryBadge(course.category)}
                      {getLevelBadge(course.level)}
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    R$ {course.price?.toFixed(2)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none dark:prose-invert mb-6">
                  <p>{course.description}</p>
                </div>
                
                <div className="bg-muted p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Curso Premium</h3>
                  <p className="mb-4">Este curso requer uma compra para obter acesso.</p>
                  
                  <Link href={`/upgrade?courseId=${course.id}`}>
                    <Button className="w-full md:w-auto">
                      Comprar Acesso
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Renderização principal do curso (com acesso)
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex-1 container mx-auto py-6 lg:py-10">
        <div className="flex items-center mb-6">
          <Link href="/courses">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar para cursos
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 gap-8">
          <div>
            {/* Cabeçalho do curso */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-3">{course.title}</h1>
              <div className="flex flex-wrap gap-2 mb-4">
                {getCategoryBadge(course.category)}
                {getLevelBadge(course.level)}
                {course.duration && <Badge variant="outline">Duração: {course.duration}</Badge>}
                {course.instructor && <Badge variant="outline">Instrutor: {course.instructor}</Badge>}
              </div>
              <p className="text-muted-foreground">{course.description}</p>
            </div>
            
            {/* Abas */}
            <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mb-10">
              <TabsList className="mb-6">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="content">Conteúdo do Curso</TabsTrigger>
                {isAdmin && <TabsTrigger value="admin">Administração</TabsTrigger>}
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Sobre este curso</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose max-w-none dark:prose-invert">
                      <p>{course.description}</p>

                      <h3>Instrutor</h3>
                      <p>{course.instructor || "Não especificado"}</p>

                      <h3>Duração</h3>
                      <p>{course.duration || "Não especificada"}</p>

                      <h3>Nível</h3>
                      <p>
                        {course.level === "beginner" && "Iniciante"}
                        {course.level === "intermediate" && "Intermediário"}
                        {course.level === "advanced" && "Avançado"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="content" className="space-y-6">
                {isLoadingLessons || isLoadingMaterials ? (
                  <div className="flex justify-center items-center p-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : Array.isArray(lessons) && lessons.length > 0 ? (
                  <Accordion type="single" collapsible>
                    {lessons
                      .slice()
                      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                      .map((lesson: any) => (
                        <AccordionItem key={lesson.id} value={`lesson-${lesson.id}`}>
                          <AccordionTrigger className="hover:bg-accent/50 px-4 py-2 rounded-md">
                            <div className="flex items-center gap-2 text-left">
                              <span className="text-sm font-semibold">{lesson.title}</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pt-2 pb-4">
                            <div className="prose max-w-none dark:prose-invert mb-4 text-sm">
                              <p>{lesson.description}</p>
                            </div>
                            
                            <div className="mb-6">
                              {lesson.videoSource === "youtube" ? (
                                <div className="relative pt-[56.25%] rounded-md overflow-hidden">
                                  <iframe
                                    className="absolute inset-0 w-full h-full border-0"
                                    src={`https://www.youtube.com/embed/${lesson.youtubeUrl.includes("youtu.be/") 
                                      ? lesson.youtubeUrl.split("youtu.be/")[1] 
                                      : lesson.youtubeUrl.includes("youtube.com/watch?v=") 
                                        ? lesson.youtubeUrl.split("v=")[1].split("&")[0] 
                                        : lesson.youtubeUrl}`}
                                    allowFullScreen
                                    title={lesson.title}
                                  ></iframe>
                                </div>
                              ) : lesson.videoSource === "drive" ? (
                                <div className="relative pt-[56.25%] rounded-md overflow-hidden">
                                  <iframe
                                    className="absolute inset-0 w-full h-full border-0"
                                    src={`https://drive.google.com/file/d/${lesson.youtubeUrl.includes("drive.google.com/file/d/") 
                                      ? lesson.youtubeUrl.split("/d/")[1].split("/")[0] 
                                      : lesson.youtubeUrl}/preview`}
                                    allowFullScreen
                                    title={lesson.title}
                                  ></iframe>
                                </div>
                              ) : (
                                <div className="bg-muted rounded-md p-4 text-center">
                                  <Play className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                  <p className="text-sm text-muted-foreground">Formato de vídeo não suportado</p>
                                </div>
                              )}
                            </div>
                            
                            {/* Materiais da aula */}
                            <div>
                              <h4 className="text-sm font-medium mb-2">Materiais</h4>
                              {Array.isArray(materials) && materials.filter((m: any) => m.lessonId === lesson.id).length > 0 ? (
                                <div className="space-y-2">
                                  {materials
                                    .filter((m: any) => m.lessonId === lesson.id)
                                    .map((material: any) => (
                                      <div key={material.id} className="flex items-center justify-between p-2 bg-accent/30 rounded-md">
                                        <div className="flex items-center gap-2">
                                          {getMaterialIcon(material.fileType, material.iconType)}
                                          <span className="text-sm">{material.title}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          {isAdmin && (
                                            <>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                  setEditingMaterial(material);
                                                  setMaterialDialogOpen(true);
                                                }}
                                              >
                                                <Edit className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteMaterial(material.id)}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </>
                                          )}
                                          <a
                                            href={material.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center h-8 px-3 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                                          >
                                            {material.downloadable ? (
                                              <>
                                                <Download className="h-3.5 w-3.5 mr-1" />
                                                Download
                                              </>
                                            ) : (
                                              <>
                                                <BookOpen className="h-3.5 w-3.5 mr-1" />
                                                Abrir
                                              </>
                                            )}
                                          </a>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">Nenhum material disponível para esta aula.</p>
                              )}
                              
                              {isAdmin && (
                                <div className="mt-4">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setEditingMaterial(null);
                                      setEditingLessonId(lesson.id);
                                      setMaterialDialogOpen(true);
                                    }}
                                  >
                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                    Adicionar Material
                                  </Button>
                                </div>
                              )}
                            </div>
                            
                            {isAdmin && (
                              <div className="mt-6 pt-4 border-t border-border flex justify-end gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setEditingLesson(lesson);
                                    setLessonDialogOpen(true);
                                  }}
                                >
                                  <Edit className="h-3.5 w-3.5 mr-1" />
                                  Editar Aula
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => handleDeleteLesson(lesson.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                                  Excluir Aula
                                </Button>
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                  </Accordion>
                ) : (
                  <Card>
                    <CardContent className="p-10 flex flex-col items-center justify-center text-center">
                      <BookOpen className="h-10 w-10 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Nenhum conteúdo disponível</h3>
                      <p className="text-muted-foreground mb-4">Este curso ainda não possui aulas ou materiais disponíveis.</p>
                      
                      {isAdmin && (
                        <Button 
                          onClick={() => {
                            setEditingLesson(null);
                            setLessonDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar Aula
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
                
                {isAdmin && Array.isArray(lessons) && lessons.length > 0 && (
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => {
                        setEditingLesson(null);
                        setLessonDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Aula
                    </Button>
                  </div>
                )}
                
                {/* Materiais gerais do curso */}
                {Array.isArray(materials) && materials.filter((m: any) => !m.lessonId).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Materiais do Curso</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {materials
                          .filter((material: any) => !material.lessonId)
                          .map((material: any) => (
                            <div key={material.id} className="flex items-center justify-between p-2 bg-accent/30 rounded-md">
                              <div className="flex items-center gap-2">
                                {getMaterialIcon(material.fileType, material.iconType)}
                                <span className="text-sm">{material.title}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {isAdmin && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setEditingMaterial(material);
                                        setMaterialDialogOpen(true);
                                      }}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteMaterial(material.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                <a
                                  href={material.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center h-8 px-3 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                                >
                                  {material.downloadable ? (
                                    <>
                                      <Download className="h-3.5 w-3.5 mr-1" />
                                      Download
                                    </>
                                  ) : (
                                    <>
                                      <BookOpen className="h-3.5 w-3.5 mr-1" />
                                      Abrir
                                    </>
                                  )}
                                </a>
                              </div>
                            </div>
                          ))}
                      </div>
                      
                      {isAdmin && (
                        <div className="mt-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setEditingMaterial(null);
                              setEditingLessonId(null);
                              setMaterialDialogOpen(true);
                            }}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Adicionar Material ao Curso
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              {isAdmin && (
                <TabsContent value="admin" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Administração do Curso</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <h3 className="text-md font-medium mb-2">Aulas</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Gerencie as aulas deste curso.
                        </p>
                        <Button 
                          onClick={() => {
                            setEditingLesson(null);
                            setLessonDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar Aula
                        </Button>
                      </div>
                      
                      <div>
                        <h3 className="text-md font-medium mb-2">Materiais</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Adicione materiais gerais ao curso (não associados a nenhuma aula específica).
                        </p>
                        <Button 
                          onClick={() => {
                            setEditingMaterial(null);
                            setEditingLessonId(null);
                            setMaterialDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar Material
                        </Button>
                      </div>
                      
                      <div>
                        <h3 className="text-md font-medium mb-2">Códigos Promocionais</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Gerencie códigos promocionais específicos para este curso.
                        </p>
                        <Link href={`/admin?tab=promocodes&courseId=${course.id}`}>
                          <Button variant="outline">
                            Gerenciar Códigos
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
        
        {/* Modal de Aula */}
        <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
          <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLesson ? "Editar Aula" : "Nova Aula"}</DialogTitle>
              <DialogDescription>
                {editingLesson 
                  ? "Atualizar informações da aula existente." 
                  : "Adicionar uma nova aula ao curso."}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...lessonForm}>
              <form onSubmit={lessonForm.handleSubmit(handleLessonSubmit)} className="space-y-4">
                <FormField
                  control={lessonForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input placeholder="Título da aula" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={lessonForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Descrição da aula" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={lessonForm.control}
                  name="videoSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fonte do Vídeo</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex space-x-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="youtube" id="youtube" />
                            <Label htmlFor="youtube">YouTube</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="drive" id="drive" />
                            <Label htmlFor="drive">Google Drive</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={lessonForm.control}
                  name="youtubeUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {lessonForm.getValues().videoSource === "youtube" ? "URL do YouTube" : "ID do Google Drive"}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={
                            lessonForm.getValues().videoSource === "youtube" 
                              ? "https://www.youtube.com/watch?v=ID ou https://youtu.be/ID" 
                              : "ID do arquivo no Drive"
                          } 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        {lessonForm.getValues().videoSource === "youtube" 
                          ? "Link completo do vídeo do YouTube." 
                          : "ID do arquivo no Google Drive (ex: 1xUJXk5yLG_3JDv8NhKfMu-QfGcM-1Nlo)"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={lessonForm.control}
                  name="order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ordem</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormDescription>
                        Número que define a ordem desta aula no curso.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter className="flex justify-between sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLessonDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createLessonMutation.isPending || updateLessonMutation.isPending}
                  >
                    {(createLessonMutation.isPending || updateLessonMutation.isPending) ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Modal de Material */}
        <Dialog open={materialDialogOpen} onOpenChange={setMaterialDialogOpen}>
          <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMaterial ? "Editar Material" : "Novo Material"}</DialogTitle>
              <DialogDescription>
                {editingMaterial 
                  ? "Atualizar informações do material existente." 
                  : "Adicionar um novo material."}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...materialForm}>
              <form onSubmit={materialForm.handleSubmit(handleMaterialSubmit)} className="space-y-4">
                <FormField
                  control={materialForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input placeholder="Título do material" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={materialForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição (opcional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Descrição do material" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={materialForm.control}
                  name="iconType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Ícone</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um tipo de ícone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="file">Arquivo</SelectItem>
                          <SelectItem value="link">Link</SelectItem>
                          <SelectItem value="object">Objeto Incorporado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Escolha o tipo de ícone para representar este material.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={materialForm.control}
                  name="fileType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Arquivo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um tipo de arquivo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pdf">PDF</SelectItem>
                          <SelectItem value="image">Imagem</SelectItem>
                          <SelectItem value="video">Vídeo</SelectItem>
                          <SelectItem value="audio">Áudio</SelectItem>
                          <SelectItem value="spreadsheet">Planilha</SelectItem>
                          <SelectItem value="doc">Documento</SelectItem>
                          <SelectItem value="other">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Escolha o tipo de arquivo deste material.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={materialForm.control}
                  name="fileUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL do Arquivo</FormLabel>
                      <FormControl>
                        <Input placeholder="https://exemplo.com/arquivo.pdf" {...field} />
                      </FormControl>
                      <FormDescription>
                        URL para o arquivo ou link externo.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={materialForm.control}
                  name="downloadable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Disponível para download
                        </FormLabel>
                        <FormDescription>
                          Se marcado, o material poderá ser baixado pelo usuário.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                {Array.isArray(lessons) && lessons.length > 0 && !editingLessonId && (
                  <FormField
                    control={materialForm.control}
                    name="lessonId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aula Associada (opcional)</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma aula (opcional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Nenhuma (material do curso)</SelectItem>
                            {lessons.sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                              .map((lesson: any) => (
                                <SelectItem key={lesson.id} value={lesson.id.toString()}>
                                  {lesson.title}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Associe este material a uma aula específica ou deixe vazio para associá-lo ao curso como um todo.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <DialogFooter className="flex justify-between sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMaterialDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMaterialMutation.isPending || updateMaterialMutation.isPending}
                  >
                    {(createMaterialMutation.isPending || updateMaterialMutation.isPending) ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}