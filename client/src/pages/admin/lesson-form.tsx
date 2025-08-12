import { useToast } from "@/hooks/use-toast";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, ChevronLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import Header from "@/components/header";
import { useEffect } from "react";

const lessonSchema = z.object({
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres"),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres"),
  youtubeUrl: z.string().min(5, "URL do vídeo é obrigatória"),
  videoSource: z.enum(["youtube", "drive"], {
    required_error: "Selecione a fonte do vídeo",
  }),
  order: z.coerce.number().min(1, "A ordem deve ser maior que zero"),
});

type LessonFormProps = {
  mode: "create" | "edit";
};

export default function LessonForm({ mode }: LessonFormProps) {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof lessonSchema>>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: "",
      description: "",
      youtubeUrl: "",
      videoSource: "youtube",
      order: 1,
    },
  });
  
  // Carregar dados do curso para verificação
  const { data: courseData, isLoading: isLoadingCourse } = useQuery({
    queryKey: [`/api/courses/${courseId}`],
    enabled: Boolean(courseId),
  });
  
  // Para edição, carregue os dados da aula
  const { data: lessonData, isLoading: isLoadingLesson } = useQuery({
    queryKey: [`/api/courses/${courseId}/lessons/${lessonId}`],
    enabled: mode === "edit" && Boolean(courseId) && Boolean(lessonId),
  });
  
  // Preencha o formulário com os dados carregados quando disponíveis
  useEffect(() => {
    if (mode === "edit" && lessonData) {
      form.reset({
        title: lessonData.title,
        description: lessonData.description || "",
        youtubeUrl: lessonData.youtubeUrl || "",
        videoSource: lessonData.videoSource || "youtube",
        order: lessonData.order || 1,
      });
    }
  }, [form, lessonData, mode]);
  
  // Mutação para criar/editar aula
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof lessonSchema>) => {
      if (mode === "create") {
        return await apiRequest("POST", `/api/courses/${courseId}/lessons`, data);
      } else {
        return await apiRequest("PUT", `/api/courses/${courseId}/lessons/${lessonId}`, data);
      }
    },
    onSuccess: () => {
      toast({
        title: mode === "create" ? "Aula criada" : "Aula atualizada",
        description: mode === "create" ? "A aula foi criada com sucesso." : "A aula foi atualizada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/lessons`] });
      navigate(`/courses/${courseId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Função para tratar o envio do formulário
  const onSubmit = (data: z.infer<typeof lessonSchema>) => {
    mutation.mutate(data);
  };
  
  // Exibir carregamento
  if ((mode === "edit" && isLoadingLesson) || isLoadingCourse) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-ep-orange" />
        </main>
      </div>
    );
  }
  
  // Verificar se o curso existe
  if (!courseData?.course) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="container max-w-3xl mx-auto py-8 px-4">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold mb-4">Curso não encontrado</h2>
              <p className="mb-4">Não foi possível encontrar o curso especificado.</p>
              <Button variant="secondary" asChild>
                <Link href="/courses">Voltar para Cursos</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }
  
  // Verificar se a aula existe no modo de edição
  if (mode === "edit" && !lessonData) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="container max-w-3xl mx-auto py-8 px-4">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold mb-4">Aula não encontrada</h2>
              <p className="mb-4">Não foi possível encontrar a aula especificada.</p>
              <Button variant="secondary" asChild>
                <Link href={`/courses/${courseId}`}>Voltar para o Curso</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="container max-w-3xl mx-auto py-8 px-4">
        <Button variant="ghost" className="mb-4" asChild>
          <Link href={`/courses/${courseId}`}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Voltar para o Curso
          </Link>
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle>{mode === "create" ? "Nova Aula" : "Editar Aula"}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título da Aula</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o título da aula" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Digite a descrição da aula" 
                          className="resize-y min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="videoSource"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Fonte do Vídeo</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
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
                  control={form.control}
                  name="youtubeUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL do Vídeo</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={form.watch("videoSource") === "youtube" 
                            ? "https://www.youtube.com/watch?v=..." 
                            : "https://drive.google.com/file/d/..."} 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ordem</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end pt-4">
                  <Button 
                    type="submit" 
                    className="bg-ep-orange hover:bg-ep-orange/90"
                    disabled={mutation.isPending}
                  >
                    {mutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Aula
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}