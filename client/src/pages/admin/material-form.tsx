import { useToast } from "@/hooks/use-toast";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { 
  Loader2, 
  ChevronLeft, 
  Save, 
  FileType,
  Link as LinkIcon,
  File
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import Header from "@/components/header";
import { useEffect } from "react";

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

type MaterialFormProps = {
  mode: "create" | "edit";
  withLesson?: boolean;
};

export default function MaterialForm({ mode, withLesson }: MaterialFormProps) {
  const { courseId, materialId, lessonId } = useParams<{ courseId: string; materialId: string; lessonId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof materialSchema>>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      title: "",
      description: "",
      fileUrl: "",
      fileType: "pdf",
      iconType: "file",
      downloadable: false,
      lessonId: withLesson && lessonId ? parseInt(lessonId) : undefined,
    },
  });
  
  // Carregar dados do curso para verificação
  const { data: courseData, isLoading: isLoadingCourse } = useQuery({
    queryKey: [`/api/courses/${courseId}`],
    enabled: Boolean(courseId),
  });
  
  // Se houver lessonId e withLesson, carregue a aula para verificação
  const { data: lessonData, isLoading: isLoadingLesson } = useQuery({
    queryKey: [`/api/courses/${courseId}/lessons/${lessonId}`],
    enabled: Boolean(withLesson) && Boolean(courseId) && Boolean(lessonId),
  });
  
  // Para edição, carregue os dados do material
  const { data: materialData, isLoading: isLoadingMaterial } = useQuery({
    queryKey: [`/api/courses/${courseId}/materials/${materialId}`],
    enabled: mode === "edit" && Boolean(courseId) && Boolean(materialId),
  });
  
  // Carregar todas as aulas do curso para o select
  const { data: lessons = [], isLoading: isLoadingLessons } = useQuery({
    queryKey: [`/api/courses/${courseId}/lessons`],
    enabled: Boolean(courseId) && !withLesson,
  });
  
  // Preencha o formulário com os dados carregados quando disponíveis
  useEffect(() => {
    if (mode === "edit" && materialData) {
      form.reset({
        title: materialData.title,
        description: materialData.description || "",
        fileUrl: materialData.fileUrl || "",
        fileType: materialData.fileType || "pdf",
        iconType: materialData.iconType || "file",
        downloadable: materialData.downloadable || false,
        lessonId: materialData.lessonId,
      });
    }
  }, [form, materialData, mode]);
  
  // Mutação para criar/editar material
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof materialSchema>) => {
      if (mode === "create") {
        return await apiRequest("POST", `/api/courses/${courseId}/materials`, data);
      } else {
        return await apiRequest("PUT", `/api/courses/${courseId}/materials/${materialId}`, data);
      }
    },
    onSuccess: () => {
      toast({
        title: mode === "create" ? "Material criado" : "Material atualizado",
        description: mode === "create" ? "O material foi criado com sucesso." : "O material foi atualizado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/materials`] });
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
  const onSubmit = (data: z.infer<typeof materialSchema>) => {
    mutation.mutate(data);
  };
  
  // Exibir carregamento
  if ((mode === "edit" && isLoadingMaterial) || isLoadingCourse || (withLesson && isLoadingLesson) || (!withLesson && isLoadingLessons)) {
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
  
  // Verificar se a aula existe quando necessário
  if (withLesson && !lessonData) {
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
  
  // Verificar se o material existe no modo de edição
  if (mode === "edit" && !materialData) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="container max-w-3xl mx-auto py-8 px-4">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold mb-4">Material não encontrado</h2>
              <p className="mb-4">Não foi possível encontrar o material especificado.</p>
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
            <CardTitle>
              {mode === "create" ? "Novo Material" : "Editar Material"}
              {withLesson && lessonData && ` para a aula: ${lessonData.title}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título do Material</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o título do material" {...field} />
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
                      <FormLabel>Descrição (opcional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Digite uma descrição para o material" 
                          className="resize-y min-h-[100px]"
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="fileUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL do Material</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://..." 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        URL do arquivo, link ou recurso
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="iconType"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Tipo de Ícone</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="file" id="file" />
                              <Label htmlFor="file" className="flex items-center">
                                <File className="h-4 w-4 mr-2" />
                                Arquivo
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="link" id="link" />
                              <Label htmlFor="link" className="flex items-center">
                                <LinkIcon className="h-4 w-4 mr-2" />
                                Link
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="object" id="object" />
                              <Label htmlFor="object" className="flex items-center">
                                <FileType className="h-4 w-4 mr-2" />
                                Objeto (vídeo, áudio, etc.)
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="fileType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Arquivo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo de arquivo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pdf">PDF</SelectItem>
                            <SelectItem value="video">Vídeo</SelectItem>
                            <SelectItem value="audio">Áudio</SelectItem>
                            <SelectItem value="image">Imagem</SelectItem>
                            <SelectItem value="document">Documento</SelectItem>
                            <SelectItem value="spreadsheet">Planilha</SelectItem>
                            <SelectItem value="presentation">Apresentação</SelectItem>
                            <SelectItem value="other">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
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
                        <FormLabel>Material Baixável</FormLabel>
                        <FormDescription>
                          Marque esta opção se o material deve ter um botão de download
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                {!withLesson && (
                  <FormField
                    control={form.control}
                    name="lessonId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aula Relacionada (opcional)</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} 
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma aula (ou deixe em branco para material do curso)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Material do Curso (sem aula específica)</SelectItem>
                            {Array.isArray(lessons) && lessons.map((lesson: any) => (
                              <SelectItem key={lesson.id} value={lesson.id.toString()}>
                                {lesson.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Se este material pertence a uma aula específica, selecione-a aqui
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
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
                        Salvar Material
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