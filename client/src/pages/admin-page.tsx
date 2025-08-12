import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatCPF } from "@/lib/cpf-utils";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Bell, BellOff, Check, AlertTriangle, Info, Ban, Search, Filter, X, DollarSign } from "lucide-react";
import { User, Tool, PromoCode, Course, Notification, PlanPrice } from "@shared/schema";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, formatDistance } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Form schemas
const newUserSchema = z.object({
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
  email: z.string().email("Digite um e-mail válido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  cpf: z.string().optional()
    .refine(
      val => !val || val.length === 11, 
      { message: "Se informado, o CPF deve conter 11 dígitos" }
    ),
  role: z.string().refine(val => ["E-BASIC", "E-TOOL", "E-MASTER", "admin"].includes(val), {
    message: "Papel deve ser um dos seguintes: E-BASIC, E-TOOL, E-MASTER, admin"
  }),
  proDays: z.string().optional(),
});

const editUserSchema = z.object({
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
  email: z.string().email("Digite um e-mail válido"),
  cpf: z.string().optional()
    .refine(
      val => !val || val.length === 11, 
      { message: "Se informado, o CPF deve conter 11 dígitos" }
    ),
  role: z.string().refine(val => ["E-BASIC", "E-TOOL", "E-MASTER", "admin"].includes(val), {
    message: "Papel deve ser um dos seguintes: E-BASIC, E-TOOL, E-MASTER, admin"
  }),
  proDays: z.string().optional(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

const newToolSchema = z.object({
  name: z.string().min(3, "Nome da ferramenta deve ter pelo menos 3 caracteres"),
  description: z.string().min(5, "Descrição deve ter pelo menos 5 caracteres"),
  category: z.string().refine(val => ["mechanical", "electrical", "textile", "informatics", "chemical"].includes(val), {
    message: "Categoria deve ser uma das seguintes: mechanical, electrical, textile, informatics, chemical"
  }),
  accessLevel: z.string().refine(val => ["E-BASIC", "E-TOOL", "E-MASTER"].includes(val), {
    message: "Nível de acesso deve ser um dos seguintes: E-BASIC, E-TOOL, E-MASTER"
  }),
  linkType: z.string().refine(val => ["internal", "external", "custom"].includes(val), {
    message: "Tipo de link deve ser um dos seguintes: internal, external, custom"
  }),
  link: z.string().min(1, "Link é obrigatório").optional(),
  customHtml: z.string().optional(),
  showInIframe: z.boolean().default(false),
  restrictedCpfs: z.string().optional(),
}).refine(
  (data) => {
    // Se linkType não for custom, link é obrigatório
    if (data.linkType !== "custom") {
      return !!data.link;
    }
    // Se linkType for custom, customHtml é obrigatório
    if (data.linkType === "custom") {
      return !!data.customHtml;
    }
    return true;
  },
  {
    message: "Link ou HTML personalizado é obrigatório dependendo do tipo selecionado",
    path: ["link"], // caminho para o erro (pode ser link ou customHtml)
  }
);

const newPromoCodeSchema = z.object({
  code: z.string().min(3, "Código deve ter pelo menos 3 caracteres"),
  days: z.string().min(1, "Número de dias é obrigatório"),
  maxUses: z.string().min(1, "Número máximo de usos é obrigatório"),
  promoType: z.enum(["role", "course"], {
    required_error: "Tipo de código promocional é obrigatório",
  }),
  targetRole: z.string().optional(),
  courseId: z.string().optional(),
  expiryDate: z.string().optional(),
}).refine(
  (data) => {
    if (data.promoType === 'role') {
      return !!data.targetRole;
    }
    if (data.promoType === 'course') {
      return !!data.courseId;
    }
    return true;
  }, 
  {
    message: "Você deve selecionar um cargo alvo ou um curso, dependendo do tipo de código",
    path: ["targetRole"], // Erro aparecerá no campo targetRole
  }
);

const newCourseSchema = z.object({
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  category: z.string().refine(val => ["mechanical", "electrical", "textile", "informatics", "chemical"].includes(val), {
    message: "Categoria deve ser uma das seguintes: mechanical, electrical, textile, informatics, chemical"
  }),
  instructor: z.string().min(3, "Nome do instrutor deve ter pelo menos 3 caracteres"),
  duration: z.string().min(1, "Duração é obrigatória"),
  level: z.string().refine(val => ["beginner", "intermediate", "advanced"].includes(val), {
    message: "Nível deve ser um dos seguintes: beginner, intermediate, advanced"
  }),
  imageUrl: z.string().optional(),
  requiresPromoCode: z.boolean().default(false),
});

const newNotificationSchema = z.object({
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  message: z.string().min(10, "Mensagem deve ter pelo menos 10 caracteres"),
  type: z.string().refine(val => ["info", "warning", "error", "success"].includes(val), {
    message: "Tipo deve ser um dos seguintes: info, warning, error, success"
  }),
  targetRole: z.string().refine(val => ["all", "E-BASIC", "E-TOOL", "E-MASTER", "admin"].includes(val), {
    message: "Cargo alvo deve ser um dos seguintes: all, E-BASIC, E-TOOL, E-MASTER, admin"
  }),
});

const planPriceSchema = z.object({
  planType: z.string().refine(val => ["E-TOOL", "E-MASTER"].includes(val), {
    message: "Tipo de plano deve ser um dos seguintes: E-TOOL, E-MASTER"
  }),
  monthlyPrice: z.string().min(1, "Preço mensal é obrigatório")
    .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Preço deve ser um número positivo"
    }),
});

const coursePriceSchema = z.object({
  courseId: z.string().min(1, "Curso é obrigatório"),
  price: z.string().min(1, "Preço é obrigatório")
    .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Preço deve ser um número positivo"
    }),
});

type NewUserFormValues = z.infer<typeof newUserSchema>;
type EditUserFormValues = z.infer<typeof editUserSchema>;
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
type NewToolFormValues = z.infer<typeof newToolSchema>;
type NewPromoCodeFormValues = z.infer<typeof newPromoCodeSchema>;
type NewCourseFormValues = z.infer<typeof newCourseSchema>;
type NewNotificationFormValues = z.infer<typeof newNotificationSchema>;
type PlanPriceFormValues = z.infer<typeof planPriceSchema>;
type CoursePriceFormValues = z.infer<typeof coursePriceSchema>;

export default function AdminPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("users");
  const [editingUser, setEditingUser] = useState<Omit<User, "password"> | null>(null);
  const [userToResetPassword, setUserToResetPassword] = useState<Omit<User, "password"> | null>(null);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingCoursePrice, setEditingCoursePrice] = useState<Course | null>(null);
  const [hasRestrictedCpfs, setHasRestrictedCpfs] = useState(false);
  const [editHasRestrictedCpfs, setEditHasRestrictedCpfs] = useState(false);
  
  // Estados para filtros e busca
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  
  const [toolSearchTerm, setToolSearchTerm] = useState("");
  const [toolCategoryFilter, setToolCategoryFilter] = useState("all");
  const [toolAccessFilter, setToolAccessFilter] = useState("all");
  
  // Courses tab
  const { data: courses, isLoading: isLoadingCourses } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });
  
  // Plan prices tab
  const { data: planPrices, isLoading: isLoadingPlanPrices } = useQuery<Record<string, { monthlyPrice: number }>>({
    queryKey: ["/api/upgrade/plans/prices"],
  });
  
  // Notifications tab
  const { data: notifications, isLoading: isLoadingNotifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });
  
  // New notification form
  const newNotificationForm = useForm<NewNotificationFormValues>({
    resolver: zodResolver(newNotificationSchema),
    defaultValues: {
      title: "",
      message: "",
      type: "info",
      targetRole: "all",
    },
  });
  
  // Edit user form
  const editUserForm = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: "",
      email: "",
      cpf: "",
      role: "E-BASIC",
      proDays: "0",
    }
  });
  
  // Plan price form
  const planPriceForm = useForm<PlanPriceFormValues>({
    resolver: zodResolver(planPriceSchema),
    defaultValues: {
      planType: "E-TOOL",
      monthlyPrice: "49.90",
    }
  });
  
  // Course price form
  const coursePriceForm = useForm<CoursePriceFormValues>({
    resolver: zodResolver(coursePriceSchema),
    defaultValues: {
      courseId: "",
      price: "",
    }
  });
  
  // Reset password form
  const resetPasswordForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
    }
  });
  
  // Users tab
  const { data: users, isLoading: isLoadingUsers } = useQuery<Omit<User, "password">[]>({
    queryKey: ["/api/users"],
  });
  
  // Tools tab
  const { data: tools, isLoading: isLoadingTools } = useQuery<Tool[]>({
    queryKey: ["/api/tools"],
  });
  
  // Promo codes tab
  const { data: promoCodes, isLoading: isLoadingPromoCodes } = useQuery<PromoCode[]>({
    queryKey: ["/api/promocodes"],
  });
  
  // Delete mutations
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuário excluído",
        description: "O usuário foi excluído com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const deleteToolMutation = useMutation({
    mutationFn: async (toolId: number) => {
      await apiRequest("DELETE", `/api/tools/${toolId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
      toast({
        title: "Ferramenta excluída",
        description: "A ferramenta foi excluída com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir ferramenta",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const deletePromoCodeMutation = useMutation({
    mutationFn: async (promoId: number) => {
      await apiRequest("DELETE", `/api/promocodes/${promoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promocodes"] });
      toast({
        title: "Código promocional excluído",
        description: "O código promocional foi completamente excluído do sistema.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir código promocional",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // New user form
  const newUserForm = useForm<NewUserFormValues>({
    resolver: zodResolver(newUserSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      cpf: "",
      role: "E-BASIC",
      proDays: "30",
    },
  });
  
  // New tool form
  const newToolForm = useForm<NewToolFormValues>({
    resolver: zodResolver(newToolSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "mechanical",
      accessLevel: "E-BASIC",
      linkType: "internal",
      link: "",
      customHtml: "",
      showInIframe: false,
      restrictedCpfs: "",
    },
  });
  
  // New promo code form
  const newPromoCodeForm = useForm<NewPromoCodeFormValues>({
    resolver: zodResolver(newPromoCodeSchema),
    defaultValues: {
      code: "",
      days: "30",
      maxUses: "10",
      promoType: "role",
      targetRole: "E-TOOL",
      courseId: "",
      expiryDate: "",
    },
  });
  
  // Create mutations
  const createUserMutation = useMutation({
    mutationFn: async (data: NewUserFormValues) => {
      await apiRequest("POST", "/api/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuário criado",
        description: "O usuário foi criado com sucesso.",
      });
      newUserForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const createToolMutation = useMutation({
    mutationFn: async (data: NewToolFormValues) => {
      await apiRequest("POST", "/api/tools", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
      toast({
        title: "Ferramenta criada",
        description: "A ferramenta foi criada com sucesso.",
      });
      newToolForm.reset();
      setHasRestrictedCpfs(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar ferramenta",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const createPromoCodeMutation = useMutation({
    mutationFn: async (data: NewPromoCodeFormValues) => {
      await apiRequest("POST", "/api/promocodes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promocodes"] });
      toast({
        title: "Código promocional criado",
        description: "O código promocional foi criado com sucesso.",
      });
      newPromoCodeForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar código promocional",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Edit user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EditUserFormValues }) => {
      await apiRequest("PATCH", `/api/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuário atualizado",
        description: "O usuário foi atualizado com sucesso.",
      });
      setEditingUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ResetPasswordFormValues }) => {
      await apiRequest("PATCH", `/api/users/${id}/reset-password`, data);
    },
    onSuccess: () => {
      toast({
        title: "Senha redefinida",
        description: "A senha do usuário foi redefinida com sucesso.",
      });
      setUserToResetPassword(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao redefinir senha",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update plan price mutation
  const updatePlanPriceMutation = useMutation({
    mutationFn: async (data: PlanPriceFormValues) => {
      await apiRequest("POST", "/api/admin/plan-prices", {
        planType: data.planType,
        monthlyPrice: parseFloat(data.monthlyPrice)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/upgrade/plans/prices"] });
      toast({
        title: "Preço atualizado",
        description: "O preço do plano foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar preço",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Force expiration check mutation
  const forceExpirationCheckMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/force-expiration-check");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Verificação concluída",
        description: "A verificação de planos expirados foi executada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na verificação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update course price mutation
  const updateCoursePriceMutation = useMutation({
    mutationFn: async (data: CoursePriceFormValues) => {
      await apiRequest("POST", "/api/admin/course-prices", {
        courseId: parseInt(data.courseId),
        price: parseFloat(data.price)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({
        title: "Preço atualizado",
        description: "O preço do curso foi atualizado com sucesso.",
      });
      setEditingCoursePrice(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar preço",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Remove course price mutation
  const removeCoursePriceMutation = useMutation({
    mutationFn: async (courseId: number) => {
      await apiRequest("POST", "/api/admin/course-prices", {
        courseId: courseId,
        price: null // Enviando null para remover o preço
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({
        title: "Preço removido",
        description: "O preço do curso foi removido com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover preço",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form submission handlers
  const onNewUserSubmit = (data: NewUserFormValues) => {
    createUserMutation.mutate(data);
  };
  
  const onEditUserSubmit = (data: EditUserFormValues) => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, data });
    }
  };
  
  const onResetPasswordSubmit = (data: ResetPasswordFormValues) => {
    if (userToResetPassword) {
      resetPasswordMutation.mutate({ id: userToResetPassword.id, data });
    }
  };
  
  const onNewToolSubmit = (data: NewToolFormValues) => {
    createToolMutation.mutate(data);
  };
  
  const onNewPromoCodeSubmit = (data: NewPromoCodeFormValues) => {
    createPromoCodeMutation.mutate(data);
  };
  



  // Price form handlers
  const onPlanPriceSubmit = (data: PlanPriceFormValues) => {
    updatePlanPriceMutation.mutate(data);
  };
  
  const onCoursePriceSubmit = (data: CoursePriceFormValues) => {
    updateCoursePriceMutation.mutate(data);
  };
  
  // Create notification mutation
  const createNotificationMutation = useMutation({
    mutationFn: async (data: NewNotificationFormValues) => {
      await apiRequest("POST", "/api/notifications", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Notificação criada",
        description: "A notificação foi enviada com sucesso.",
      });
      newNotificationForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar notificação",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest("DELETE", `/api/notifications/${notificationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Notificação excluída",
        description: "A notificação foi excluída com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir notificação",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Notification submission handler
  const onNewNotificationSubmit = (data: NewNotificationFormValues) => {
    createNotificationMutation.mutate(data);
  };
  
  // Edit tool form
  const editToolForm = useForm<NewToolFormValues>({
    resolver: zodResolver(newToolSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "mechanical",
      accessLevel: "E-BASIC",
      linkType: "internal",
      link: "",
      customHtml: "",
      showInIframe: false,
      restrictedCpfs: "",
    },
  });
  
  // Edit tool mutation
  const updateToolMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: NewToolFormValues }) => {
      await apiRequest("PATCH", `/api/tools/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
      toast({
        title: "Ferramenta atualizada",
        description: "A ferramenta foi atualizada com sucesso.",
      });
      setEditingTool(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar ferramenta",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Edit tool submission handler
  const onEditToolSubmit = (data: NewToolFormValues) => {
    if (editingTool) {
      updateToolMutation.mutate({ id: editingTool.id, data });
    }
  };
  
  // Role badge component
  const RoleBadge = ({ role }: { role: string }) => {
    switch (role) {
      case "admin":
        return (
          <Badge className="bg-ep-black text-white">Admin</Badge>
        );
      case "E-MASTER":
        return (
          <Badge className="bg-ep-orange text-white">E-MASTER</Badge>
        );
      case "E-TOOL":
        return (
          <Badge className="bg-yellow-500 text-white">E-TOOL</Badge>
        );
      case "E-BASIC":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800">E-BASIC</Badge>
        );
      default:
        return (
          <Badge variant="outline">Desconhecido</Badge>
        );
    }
  };
  
  // Category badge component
  const CategoryBadge = ({ category }: { category: string }) => {
    switch (category) {
      case "mechanical":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800">Mecânica</Badge>
        );
      case "electrical":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Elétrica</Badge>
        );
      case "textile":
        return (
          <Badge variant="outline" className="bg-pink-100 text-pink-800">Têxtil</Badge>
        );
      case "informatics":
        return (
          <Badge variant="outline" className="bg-purple-100 text-purple-800">Informática</Badge>
        );
      case "chemical":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800">Química</Badge>
        );
      default:
        return (
          <Badge variant="outline">Desconhecida</Badge>
        );
    }
  };
  
  // Access level badge component
  const AccessLevelBadge = ({ level }: { level: string }) => {
    switch (level) {
      case "E-MASTER":
        return (
          <Badge className="bg-ep-orange text-white">E-MASTER</Badge>
        );
      case "E-TOOL":
        return (
          <Badge className="bg-yellow-500 text-white">E-TOOL</Badge>
        );
      case "E-BASIC":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800">E-BASIC</Badge>
        );
      default:
        return (
          <Badge variant="outline">Desconhecido</Badge>
        );
    }
  };
  
  // Course level badge component
  const CourseLevelBadge = ({ level }: { level: string }) => {
    switch (level) {
      case "beginner":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800">Iniciante</Badge>
        );
      case "intermediate":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Intermediário</Badge>
        );
      case "advanced":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800">Avançado</Badge>
        );
      default:
        return (
          <Badge variant="outline">Desconhecido</Badge>
        );
    }
  };
  
  // Notification type badge component with icon
  const NotificationTypeBadge = ({ type }: { type: string }) => {
    switch (type) {
      case "info":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 gap-1">
            <Info className="h-3 w-3" /> Informação
          </Badge>
        );
      case "warning":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 gap-1">
            <AlertTriangle className="h-3 w-3" /> Aviso
          </Badge>
        );
      case "error":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 gap-1">
            <Ban className="h-3 w-3" /> Erro
          </Badge>
        );
      case "success":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 gap-1">
            <Check className="h-3 w-3" /> Sucesso
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">Desconhecido</Badge>
        );
    }
  };
  
  // New Course form
  const newCourseForm = useForm<NewCourseFormValues>({
    resolver: zodResolver(newCourseSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "mechanical",
      instructor: "",
      duration: "",
      level: "beginner",
      imageUrl: "",
      requiresPromoCode: false,
    },
  });
  
  // Edit Course form
  const editCourseForm = useForm<NewCourseFormValues>({
    resolver: zodResolver(newCourseSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "mechanical",
      instructor: "",
      duration: "",
      level: "beginner",
      imageUrl: "",
      requiresPromoCode: false,
    },
  });
  
  // Create Course mutation
  const createCourseMutation = useMutation({
    mutationFn: async (data: NewCourseFormValues) => {
      await apiRequest("POST", "/api/courses", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({
        title: "Curso criado",
        description: "O curso foi criado com sucesso.",
      });
      newCourseForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar curso",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update Course mutation
  const updateCourseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: NewCourseFormValues }) => {
      await apiRequest("PATCH", `/api/courses/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({
        title: "Curso atualizado",
        description: "O curso foi atualizado com sucesso.",
      });
      setEditingCourse(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar curso",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete Course mutation
  const deleteCourseMutation = useMutation({
    mutationFn: async (courseId: number) => {
      await apiRequest("DELETE", `/api/courses/${courseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({
        title: "Curso excluído",
        description: "O curso foi excluído com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir curso",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Toggle course visibility mutation
  const toggleCourseVisibilityMutation = useMutation({
    mutationFn: async ({ id, isHidden }: { id: number; isHidden: boolean }) => {
      await apiRequest("PATCH", `/api/courses/${id}/toggle-visibility`, { isHidden });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({
        title: "Visibilidade atualizada",
        description: "A visibilidade do curso foi atualizada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar visibilidade",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Form submission handlers
  const onNewCourseSubmit = (data: NewCourseFormValues) => {
    createCourseMutation.mutate(data);
  };
  
  const onEditCourseSubmit = (data: NewCourseFormValues) => {
    if (editingCourse) {
      updateCourseMutation.mutate({ id: editingCourse.id, data });
    }
  };
  
  // Filtrar usuários com base nos termos de busca e filtros
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    return users.filter(user => {
      // Filtrar por papel
      if (userRoleFilter !== "all" && user.role !== userRoleFilter) {
        return false;
      }
      
      // Filtrar por termo de busca
      if (userSearchTerm.trim() === "") return true;
      
      const searchLower = userSearchTerm.toLowerCase();
      return (
        user.username.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      );
    });
  }, [users, userSearchTerm, userRoleFilter]);
  
  // Filtrar ferramentas com base nos termos de busca e filtros
  const filteredTools = useMemo(() => {
    if (!tools) return [];
    
    return tools.filter(tool => {
      // Filtrar por categoria
      if (toolCategoryFilter !== "all" && tool.category !== toolCategoryFilter) {
        return false;
      }
      
      // Filtrar por nível de acesso
      if (toolAccessFilter !== "all" && tool.accessLevel !== toolAccessFilter) {
        return false;
      }
      
      // Filtrar por termo de busca
      if (toolSearchTerm.trim() === "") return true;
      
      const searchLower = toolSearchTerm.toLowerCase();
      return (
        tool.name.toLowerCase().includes(searchLower) ||
        tool.description.toLowerCase().includes(searchLower)
      );
    });
  }, [tools, toolSearchTerm, toolCategoryFilter, toolAccessFilter]);
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow">
        <div className="py-6 sm:py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-ep-black">Painel de <span className="text-ep-orange">Administração</span></h1>
              <p className="mt-2 text-gray-600">Gerencie usuários e ferramentas do sistema</p>
            </div>
            
            <Card>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="users">Usuários</TabsTrigger>
                  <TabsTrigger value="tools">Ferramentas</TabsTrigger>
                  <TabsTrigger value="promocodes">Códigos Promo</TabsTrigger>
                  <TabsTrigger value="courses">Cursos</TabsTrigger>
                  <TabsTrigger value="notifications">Notificações</TabsTrigger>
                  <TabsTrigger value="prices">Preços</TabsTrigger>
                </TabsList>
                
                {/* Diálogo de edição de curso */}
                {editingCourse && (
                  <Dialog open={!!editingCourse} onOpenChange={(open) => !open && setEditingCourse(null)}>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>Editar Curso</DialogTitle>
                      </DialogHeader>
                      <Form {...editCourseForm}>
                        <form onSubmit={editCourseForm.handleSubmit(onEditCourseSubmit)} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={editCourseForm.control}
                              name="title"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Título</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={editCourseForm.control}
                              name="instructor"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Instrutor</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={editCourseForm.control}
                              name="category"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Categoria</FormLabel>
                                  <Select 
                                    onValueChange={field.onChange} 
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione a categoria" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="mechanical">Mecânica</SelectItem>
                                      <SelectItem value="electrical">Elétrica</SelectItem>
                                      <SelectItem value="textile">Têxtil</SelectItem>
                                      <SelectItem value="informatics">Informática</SelectItem>
                                      <SelectItem value="chemical">Química</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={editCourseForm.control}
                              name="level"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Nível</FormLabel>
                                  <Select 
                                    onValueChange={field.onChange} 
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione o nível" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="beginner">Iniciante</SelectItem>
                                      <SelectItem value="intermediate">Intermediário</SelectItem>
                                      <SelectItem value="advanced">Avançado</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={editCourseForm.control}
                              name="duration"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Duração</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Ex: 10 horas" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={editCourseForm.control}
                              name="imageUrl"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>URL da imagem (opcional)</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="https://" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <FormField
                            control={editCourseForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Descrição</FormLabel>
                                <FormControl>
                                  <Textarea rows={4} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={editCourseForm.control}
                            name="requiresPromoCode"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Requer código promocional para acesso</FormLabel>
                                  <FormDescription>
                                    Se ativado, o curso só poderá ser acessado por usuários com código promocional específico para este curso.
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                          
                          <DialogFooter>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setEditingCourse(null)}
                            >
                              Cancelar
                            </Button>
                            <Button
                              type="submit"
                              className="bg-ep-orange hover:bg-ep-orange/90"
                              disabled={updateCourseMutation.isPending}
                            >
                              {updateCourseMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                )}
                
                {/* Users Management Section */}
                <TabsContent value="users">
                  <CardContent className="p-6">
                    {/* Filtros e Busca de Usuários */}
                    <div className="mb-6 p-4 border rounded-md bg-gray-50">
                      <h3 className="text-lg font-medium text-ep-black mb-4">Gerenciar Usuários</h3>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                          <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar usuários..."
                            className="pl-9"
                            value={userSearchTerm}
                            onChange={(e) => setUserSearchTerm(e.target.value)}
                          />
                          {userSearchTerm && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute right-0.5 top-0.5 h-8 w-8 p-0"
                              onClick={() => setUserSearchTerm("")}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="w-full sm:w-52">
                          <Select
                            value={userRoleFilter}
                            onValueChange={setUserRoleFilter}
                          >
                            <SelectTrigger>
                              <Filter className="mr-2 h-4 w-4" />
                              <span>
                                {userRoleFilter === "all" 
                                  ? "Todos os papéis" 
                                  : userRoleFilter}
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos os papéis</SelectItem>
                              <SelectItem value="E-BASIC">E-BASIC</SelectItem>
                              <SelectItem value="E-TOOL">E-TOOL</SelectItem>
                              <SelectItem value="E-MASTER">E-MASTER</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-8">
                      <h3 className="text-lg font-medium text-ep-black mb-4">Adicionar Novo Usuário</h3>
                      <Form {...newUserForm}>
                        <form onSubmit={newUserForm.handleSubmit(onNewUserSubmit)} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={newUserForm.control}
                              name="username"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Nome de usuário</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={newUserForm.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>E-mail</FormLabel>
                                  <FormControl>
                                    <Input type="email" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={newUserForm.control}
                              name="password"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Senha</FormLabel>
                                  <FormControl>
                                    <Input type="password" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={newUserForm.control}
                              name="cpf"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>CPF (opcional)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="Somente números" 
                                      maxLength={11}
                                      {...field}
                                      onChange={(e) => {
                                        // Permite apenas números
                                        const value = e.target.value.replace(/[^0-9]/g, '');
                                        field.onChange(value);
                                      }}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    CPF é opcional para contas criadas pelo administrador
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={newUserForm.control}
                              name="role"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Papel</FormLabel>
                                  <Select 
                                    onValueChange={field.onChange} 
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione o papel" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="E-BASIC">E-BASIC</SelectItem>
                                      <SelectItem value="E-TOOL">E-TOOL</SelectItem>
                                      <SelectItem value="E-MASTER">E-MASTER</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            {(newUserForm.watch("role") === "E-TOOL" || newUserForm.watch("role") === "E-MASTER") && (
                              <FormField
                                control={newUserForm.control}
                                name="proDays"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Dias de Assinatura</FormLabel>
                                    <FormControl>
                                      <Input type="number" min="1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                          </div>
                          
                          <Button 
                            type="submit" 
                            className="bg-ep-orange hover:bg-ep-orange/90"
                            disabled={createUserMutation.isPending}
                          >
                            {createUserMutation.isPending ? "Adicionando..." : "Adicionar Usuário"}
                          </Button>
                        </form>
                      </Form>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-ep-black">Lista de Usuários</h3>
                        <Button
                          variant="outline"
                          onClick={() => forceExpirationCheckMutation.mutate()}
                          disabled={forceExpirationCheckMutation.isPending}
                          className="text-ep-orange border-ep-orange hover:bg-ep-orange hover:text-white"
                        >
                          {forceExpirationCheckMutation.isPending ? "Verificando..." : "Verificar Planos Expirados"}
                        </Button>
                      </div>
                      {isLoadingUsers ? (
                        <div className="text-center py-4">Carregando usuários...</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Usuário</TableHead>
                                <TableHead>E-mail</TableHead>
                                <TableHead>CPF</TableHead>
                                <TableHead>Papel</TableHead>
                                <TableHead>Pro Expira</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                  <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.username}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{user.cpf ? formatCPF(user.cpf) : "-"}</TableCell>
                                    <TableCell>
                                      <RoleBadge role={user.role} />
                                    </TableCell>
                                    <TableCell>
                                      {user.roleExpiryDate ? format(new Date(user.roleExpiryDate), "dd/MM/yyyy") : "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button 
                                        variant="ghost" 
                                        className="mr-2 text-ep-orange hover:text-ep-orange/80"
                                        onClick={() => {
                                          setEditingUser(user);
                                          editUserForm.reset({
                                            username: user.username,
                                            email: user.email,
                                            cpf: user.cpf || "",
                                            role: user.role,
                                            proDays: "0"
                                          });
                                        }}
                                      >
                                        Editar
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        className="mr-2 text-blue-600 hover:text-blue-900"
                                        onClick={() => {
                                          setUserToResetPassword(user);
                                          resetPasswordForm.reset({
                                            password: ""
                                          });
                                        }}
                                      >
                                        Redefinir Senha
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button 
                                            variant="ghost" 
                                            className="text-red-600 hover:text-red-900"
                                          >
                                            Excluir
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Tem certeza que deseja excluir o usuário {user.username}? Esta ação não pode ser desfeita.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => deleteUserMutation.mutate(user.id)}
                                              className="bg-red-600 hover:bg-red-700"
                                            >
                                              Excluir
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={6} className="text-center">
                                    Nenhum usuário encontrado
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </TabsContent>
                
                {/* Tools Management Section */}
                <TabsContent value="tools">
                  <CardContent className="p-6">
                    {/* Filtros e Busca de Ferramentas */}
                    <div className="mb-6 p-4 border rounded-md bg-gray-50">
                      <h3 className="text-lg font-medium text-ep-black mb-4">Gerenciar Ferramentas</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="relative col-span-1 sm:col-span-3 md:col-span-1">
                          <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar ferramentas..."
                            className="pl-9"
                            value={toolSearchTerm}
                            onChange={(e) => setToolSearchTerm(e.target.value)}
                          />
                          {toolSearchTerm && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute right-0.5 top-0.5 h-8 w-8 p-0"
                              onClick={() => setToolSearchTerm("")}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        
                        <div>
                          <Select
                            value={toolCategoryFilter}
                            onValueChange={setToolCategoryFilter}
                          >
                            <SelectTrigger>
                              <Filter className="mr-2 h-4 w-4" />
                              <span>
                                {toolCategoryFilter === "all" 
                                  ? "Todas as categorias" 
                                  : toolCategoryFilter === "mechanical" ? "Mecânica"
                                  : toolCategoryFilter === "electrical" ? "Elétrica"
                                  : toolCategoryFilter === "textile" ? "Têxtil"
                                  : toolCategoryFilter === "informatics" ? "Informática"
                                  : "Química"}
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todas as categorias</SelectItem>
                              <SelectItem value="mechanical">Mecânica</SelectItem>
                              <SelectItem value="electrical">Elétrica</SelectItem>
                              <SelectItem value="textile">Têxtil</SelectItem>
                              <SelectItem value="informatics">Informática</SelectItem>
                              <SelectItem value="chemical">Química</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Select
                            value={toolAccessFilter}
                            onValueChange={setToolAccessFilter}
                          >
                            <SelectTrigger>
                              <Filter className="mr-2 h-4 w-4" />
                              <span>
                                {toolAccessFilter === "all" 
                                  ? "Todos os acessos" 
                                  : toolAccessFilter}
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos os acessos</SelectItem>
                              <SelectItem value="E-BASIC">E-BASIC</SelectItem>
                              <SelectItem value="E-TOOL">E-TOOL</SelectItem>
                              <SelectItem value="E-MASTER">E-MASTER</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-8">
                      <h3 className="text-lg font-medium text-ep-black mb-4">Adicionar Nova Ferramenta</h3>
                      <Form {...newToolForm}>
                        <form onSubmit={newToolForm.handleSubmit(onNewToolSubmit)} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={newToolForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Nome da ferramenta</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={newToolForm.control}
                              name="category"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Categoria</FormLabel>
                                  <Select 
                                    onValueChange={field.onChange} 
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione a categoria" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="mechanical">Mecânica</SelectItem>
                                      <SelectItem value="electrical">Elétrica</SelectItem>
                                      <SelectItem value="textile">Têxtil</SelectItem>
                                      <SelectItem value="informatics">Informática</SelectItem>
                                      <SelectItem value="chemical">Química</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={newToolForm.control}
                              name="description"
                              render={({ field }) => (
                                <FormItem className="col-span-1 md:col-span-2">
                                  <FormLabel>Descrição</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      rows={3} 
                                      placeholder="Descreva a ferramenta..."
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={newToolForm.control}
                              name="accessLevel"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Nível de acesso</FormLabel>
                                  <Select 
                                    onValueChange={field.onChange} 
                                    value={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione o nível de acesso" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="E-BASIC">E-BASIC</SelectItem>
                                      <SelectItem value="E-TOOL">E-TOOL</SelectItem>
                                      <SelectItem value="E-MASTER">E-MASTER</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={newToolForm.control}
                              name="linkType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Tipo de conteúdo</FormLabel>
                                  <Select 
                                    onValueChange={(value) => {
                                      field.onChange(value);
                                      // Limpar os campos não usados dependendo do tipo selecionado
                                      if (value === "custom") {
                                        newToolForm.setValue("link", "#");
                                      } else if (value === "external" || value === "internal") {
                                        newToolForm.setValue("customHtml", "");
                                      }
                                    }} 
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione o tipo de conteúdo" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="internal">Link Interno</SelectItem>
                                      <SelectItem value="external">Link Externo</SelectItem>
                                      <SelectItem value="custom">HTML Personalizado</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            {newToolForm.watch("linkType") !== "custom" && (
                              <FormField
                                control={newToolForm.control}
                                name="link"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>URL/Link</FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder={newToolForm.watch("linkType") === "internal" ? "/tools/example" : "https://example.com"}
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                            
                            {newToolForm.watch("linkType") === "custom" && (
                              <>
                                <FormField
                                  control={newToolForm.control}
                                  name="customHtml"
                                  render={({ field }) => (
                                    <FormItem className="col-span-1 md:col-span-2">
                                      <FormLabel>HTML Personalizado</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          rows={20}
                                          className="min-h-[400px] font-mono text-sm"
                                          placeholder="<html><body><h1>Minha ferramenta</h1><p>Conteúdo da ferramenta</p></body></html>"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormDescription>
                                        Insira o código HTML personalizado que será exibido quando a ferramenta for acessada.
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={newToolForm.control}
                                  name="showInIframe"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                        />
                                      </FormControl>
                                      <div className="space-y-1 leading-none">
                                        <FormLabel>Abrir em nova guia automaticamente</FormLabel>
                                        <FormDescription>
                                          Marque para abrir diretamente em nova guia ao clicar, permitindo execução de scripts e formulários.
                                        </FormDescription>
                                      </div>
                                    </FormItem>
                                  )}
                                />
                              </>
                            )}
                            
                            <div className="col-span-1 md:col-span-2 space-y-4">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="hasRestrictedCpfs"
                                  checked={hasRestrictedCpfs}
                                  onCheckedChange={(checked) => {
                                    setHasRestrictedCpfs(!!checked);
                                    if (!checked) {
                                      newToolForm.setValue("restrictedCpfs", "");
                                    }
                                  }}
                                />
                                <label
                                  htmlFor="hasRestrictedCpfs"
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  Restringir acesso por CPF
                                </label>
                              </div>
                              
                              {hasRestrictedCpfs && (
                                <FormField
                                  control={newToolForm.control}
                                  name="restrictedCpfs"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>CPFs Autorizados</FormLabel>
                                      <FormControl>
                                        <Textarea 
                                          rows={3} 
                                          placeholder="Digite os CPFs separados por vírgula (ex: 12345678901, 09876543210)"
                                          {...field} 
                                        />
                                      </FormControl>
                                      <FormDescription>
                                        Apenas usuários com estes CPFs poderão acessar esta ferramenta, independente do nível de acesso
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              )}
                            </div>
                          </div>
                          
                          <Button 
                            type="submit" 
                            className="bg-ep-orange hover:bg-ep-orange/90"
                            disabled={createToolMutation.isPending}
                          >
                            {createToolMutation.isPending ? "Adicionando..." : "Adicionar Ferramenta"}
                          </Button>
                        </form>
                      </Form>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium text-ep-black mb-4">Lista de Ferramentas</h3>
                      {isLoadingTools ? (
                        <div className="text-center py-4">Carregando ferramentas...</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead>Acesso</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredTools.length > 0 ? (
                                filteredTools.map((tool) => (
                                  <TableRow key={tool.id}>
                                    <TableCell className="font-medium">{tool.name}</TableCell>
                                    <TableCell>
                                      <CategoryBadge category={tool.category} />
                                    </TableCell>
                                    <TableCell>
                                      <AccessLevelBadge level={tool.accessLevel} />
                                    </TableCell>
                                    <TableCell>
                                      {tool.linkType === "external" 
                                        ? "Link Externo" 
                                        : tool.linkType === "internal" 
                                          ? "Link Interno" 
                                          : "HTML Personalizado"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button 
                                        variant="ghost" 
                                        className="mr-2 text-ep-orange hover:text-ep-orange/80"
                                        onClick={() => {
                                          setEditingTool(tool);
                                          const hasRestrictedCpfsValue = !!(tool.restrictedCpfs && tool.restrictedCpfs.trim());
                                          setEditHasRestrictedCpfs(hasRestrictedCpfsValue);
                                          editToolForm.reset({
                                            name: tool.name,
                                            description: tool.description,
                                            category: tool.category as "mechanical" | "electrical" | "textile" | "informatics" | "chemical",
                                            accessLevel: tool.accessLevel as "E-BASIC" | "E-TOOL" | "E-MASTER",
                                            linkType: tool.linkType as "internal" | "external" | "custom",
                                            link: tool.link,
                                            customHtml: tool.customHtml || "",
                                            showInIframe: tool.showInIframe || false,
                                            restrictedCpfs: tool.restrictedCpfs || "",
                                          });
                                        }}
                                      >
                                        Editar
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button 
                                            variant="ghost" 
                                            className="text-red-600 hover:text-red-900"
                                          >
                                            Excluir
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Excluir ferramenta</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Tem certeza que deseja excluir a ferramenta {tool.name}? Esta ação não pode ser desfeita.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => deleteToolMutation.mutate(tool.id)}
                                              className="bg-red-600 hover:bg-red-700"
                                            >
                                              Excluir
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center">
                                    Nenhuma ferramenta encontrada
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </TabsContent>
                
                {/* Courses Management Section */}
                <TabsContent value="notifications">
                  <CardContent className="p-6">
                    <div className="mb-8">
                      <h3 className="text-lg font-medium text-ep-black mb-4">Enviar Notificação</h3>
                      <Form {...newNotificationForm}>
                        <form onSubmit={newNotificationForm.handleSubmit(onNewNotificationSubmit)} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={newNotificationForm.control}
                              name="title"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Título</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={newNotificationForm.control}
                              name="type"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Tipo</FormLabel>
                                  <Select 
                                    onValueChange={field.onChange} 
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione o tipo" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="info">Informação</SelectItem>
                                      <SelectItem value="warning">Aviso</SelectItem>
                                      <SelectItem value="error">Erro</SelectItem>
                                      <SelectItem value="success">Sucesso</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={newNotificationForm.control}
                              name="targetRole"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Destinatários</FormLabel>
                                  <Select 
                                    onValueChange={field.onChange} 
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione os destinatários" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="all">Todos os usuários</SelectItem>
                                      <SelectItem value="E-BASIC">E-BASIC</SelectItem>
                                      <SelectItem value="E-TOOL">E-TOOL</SelectItem>
                                      <SelectItem value="E-MASTER">E-MASTER</SelectItem>
                                      <SelectItem value="admin">Administradores</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <FormField
                              control={newNotificationForm.control}
                              name="message"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Mensagem</FormLabel>
                                  <FormControl>
                                    <Textarea rows={4} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          
                          <Button 
                            type="submit" 
                            className="bg-ep-orange hover:bg-ep-orange/90"
                            disabled={createNotificationMutation.isPending}
                          >
                            {createNotificationMutation.isPending ? "Enviando..." : "Enviar Notificação"}
                          </Button>
                        </form>
                      </Form>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium text-ep-black mb-4">Histórico de Notificações</h3>
                      {isLoadingNotifications ? (
                        <div className="text-center py-4">Carregando notificações...</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Título</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Destinatários</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {notifications && notifications.length > 0 ? (
                                notifications.map((notification) => (
                                  <TableRow key={notification.id}>
                                    <TableCell className="font-medium">{notification.title}</TableCell>
                                    <TableCell>
                                      <NotificationTypeBadge type={notification.type} />
                                    </TableCell>
                                    <TableCell>
                                      <RoleBadge role={notification.targetRole} />
                                    </TableCell>
                                    <TableCell>
                                      {format(new Date(notification.createdAt), "dd/MM/yyyy HH:mm")}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button 
                                            variant="ghost" 
                                            className="text-red-600 hover:text-red-900"
                                          >
                                            Excluir
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Esta ação não pode ser desfeita. Isto excluirá permanentemente a notificação.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction 
                                              onClick={() => deleteNotificationMutation.mutate(notification.id)}
                                              className="bg-red-600 hover:bg-red-700"
                                            >
                                              Excluir
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center">
                                    Nenhuma notificação encontrada.
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </TabsContent>
                
                <TabsContent value="courses">
                  <CardContent className="p-6">
                    <div className="mb-8">
                      <h3 className="text-lg font-medium text-ep-black mb-4">Adicionar Novo Curso</h3>
                      <Form {...newCourseForm}>
                        <form onSubmit={newCourseForm.handleSubmit(onNewCourseSubmit)} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={newCourseForm.control}
                              name="title"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Título</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={newCourseForm.control}
                              name="instructor"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Instrutor</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={newCourseForm.control}
                              name="category"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Categoria</FormLabel>
                                  <Select 
                                    onValueChange={field.onChange} 
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione a categoria" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="mechanical">Mecânica</SelectItem>
                                      <SelectItem value="electrical">Elétrica</SelectItem>
                                      <SelectItem value="textile">Têxtil</SelectItem>
                                      <SelectItem value="informatics">Informática</SelectItem>
                                      <SelectItem value="chemical">Química</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={newCourseForm.control}
                              name="level"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Nível</FormLabel>
                                  <Select 
                                    onValueChange={field.onChange} 
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione o nível" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="beginner">Iniciante</SelectItem>
                                      <SelectItem value="intermediate">Intermediário</SelectItem>
                                      <SelectItem value="advanced">Avançado</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={newCourseForm.control}
                              name="duration"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Duração</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Ex: 10 horas" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={newCourseForm.control}
                              name="imageUrl"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>URL da imagem (opcional)</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="https://" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <FormField
                            control={newCourseForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Descrição</FormLabel>
                                <FormControl>
                                  <Textarea rows={4} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={newCourseForm.control}
                            name="requiresPromoCode"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Requer código promocional para acesso</FormLabel>
                                  <FormDescription>
                                    Se ativado, o curso só poderá ser acessado por usuários com código promocional específico para este curso.
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                          
                          <Button 
                            type="submit" 
                            className="bg-ep-orange hover:bg-ep-orange/90"
                            disabled={createCourseMutation.isPending}
                          >
                            {createCourseMutation.isPending ? "Adicionando..." : "Adicionar Curso"}
                          </Button>
                        </form>
                      </Form>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium text-ep-black mb-4">Lista de Cursos</h3>
                      {isLoadingCourses ? (
                        <div className="text-center py-4">Carregando cursos...</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Título</TableHead>
                                <TableHead>Instrutor</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead>Nível</TableHead>
                                <TableHead>Duração</TableHead>
                                <TableHead>Visibilidade</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {courses && courses.length > 0 ? (
                                courses.map((course) => (
                                  <TableRow key={course.id}>
                                    <TableCell className="font-medium">{course.title}</TableCell>
                                    <TableCell>{course.instructor}</TableCell>
                                    <TableCell>
                                      <CategoryBadge category={course.category} />
                                    </TableCell>
                                    <TableCell>
                                      <CourseLevelBadge level={course.level} />
                                    </TableCell>
                                    <TableCell>{course.duration}</TableCell>
                                    <TableCell>
                                      {course.isHidden ? (
                                        <Badge variant="outline" className="bg-red-100 text-red-800">Oculto</Badge>
                                      ) : (
                                        <Badge variant="outline" className="bg-green-100 text-green-800">Visível</Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button 
                                        variant="ghost" 
                                        className="mr-2 text-ep-orange hover:text-ep-orange/80"
                                        onClick={() => {
                                          setEditingCourse(course);
                                          editCourseForm.reset({
                                            title: course.title,
                                            description: course.description,
                                            category: course.category,
                                            instructor: course.instructor,
                                            duration: course.duration,
                                            level: course.level,
                                            imageUrl: course.imageUrl || "",
                                            requiresPromoCode: course.requiresPromoCode || false,
                                          });
                                        }}
                                      >
                                        Editar
                                      </Button>
                                      
                                      <Button 
                                        variant="ghost" 
                                        className="mr-2 text-blue-600 hover:text-blue-900"
                                        onClick={() => {
                                          window.open(`/courses/${course.id}`, "_blank");
                                        }}
                                      >
                                        Ver
                                      </Button>
                                      
                                      <Button 
                                        variant="ghost" 
                                        className="mr-2 text-purple-600 hover:text-purple-900"
                                        onClick={() => {
                                          toggleCourseVisibilityMutation.mutate({
                                            id: course.id,
                                            isHidden: !course.isHidden
                                          });
                                        }}
                                      >
                                        {course.isHidden ? "Mostrar" : "Ocultar"}
                                      </Button>
                                      
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button 
                                            variant="ghost" 
                                            className="text-red-600 hover:text-red-900"
                                          >
                                            Excluir
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Excluir curso</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Tem certeza que deseja excluir o curso "{course.title}"? Esta ação não pode ser desfeita e irá remover todas as aulas e materiais associados.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => deleteCourseMutation.mutate(course.id)}
                                              className="bg-red-600 hover:bg-red-700"
                                            >
                                              Excluir
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={7} className="text-center">
                                    Nenhum curso encontrado
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </TabsContent>
                
                {/* Promo Codes Management Section */}
                <TabsContent value="promocodes">
                  <CardContent className="p-6">
                    <div className="mb-8">
                      <h3 className="text-lg font-medium text-ep-black mb-4">Criar Código Promocional</h3>
                      <Form {...newPromoCodeForm}>
                        <form onSubmit={newPromoCodeForm.handleSubmit(onNewPromoCodeSubmit)} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                              control={newPromoCodeForm.control}
                              name="code"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Código</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Ex: SUMMER2023" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={newPromoCodeForm.control}
                              name="promoType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Tipo de Código</FormLabel>
                                  <Select 
                                    onValueChange={field.onChange} 
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione o tipo" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="role">Atualização de Cargo</SelectItem>
                                      <SelectItem value="course">Acesso a Curso</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    O tipo de benefício que este código oferece.
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={newPromoCodeForm.control}
                              name="days"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Dias de Validade</FormLabel>
                                  <FormControl>
                                    <Input type="number" min="1" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={newPromoCodeForm.control}
                              name="maxUses"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Número máximo de usos</FormLabel>
                                  <FormControl>
                                    <Input type="number" min="1" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            {newPromoCodeForm.watch("promoType") === "role" && (
                              <FormField
                                control={newPromoCodeForm.control}
                                name="targetRole"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Cargo a ser ativado</FormLabel>
                                    <Select 
                                      onValueChange={field.onChange} 
                                      defaultValue={field.value}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Selecione o cargo" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="E-TOOL">E-TOOL</SelectItem>
                                        <SelectItem value="E-MASTER">E-MASTER</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormDescription>
                                      O cargo que o usuário receberá ao usar este código.
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}

                            {newPromoCodeForm.watch("promoType") === "course" && (
                              <FormField
                                control={newPromoCodeForm.control}
                                name="courseId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Curso a ser desbloqueado</FormLabel>
                                    <Select 
                                      onValueChange={field.onChange} 
                                      defaultValue={field.value}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Selecione o curso" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {courses?.map((course) => (
                                          <SelectItem key={course.id} value={course.id.toString()}>
                                            {course.title}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormDescription>
                                      O curso que será desbloqueado com este código.
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                            
                            <FormField
                              control={newPromoCodeForm.control}
                              name="expiryDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Data de expiração (opcional)</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <Button 
                            type="submit" 
                            className="bg-ep-orange hover:bg-ep-orange/90"
                            disabled={createPromoCodeMutation.isPending}
                          >
                            {createPromoCodeMutation.isPending ? "Criando..." : "Criar Código"}
                          </Button>
                        </form>
                      </Form>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium text-ep-black mb-4">Códigos Promocionais Ativos</h3>
                      {isLoadingPromoCodes ? (
                        <div className="text-center py-4">Carregando códigos promocionais...</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Alvo</TableHead>
                                <TableHead>Dias</TableHead>
                                <TableHead>Usos</TableHead>
                                <TableHead>Expiração</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {promoCodes && promoCodes.length > 0 ? (
                                promoCodes.map((code) => (
                                  <TableRow key={code.id}>
                                    <TableCell className="font-medium">{code.code}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className={code.promoType === 'role' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                                        {code.promoType === 'role' ? 'Cargo' : 'Curso'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {code.promoType === 'role' ? (
                                        <RoleBadge role={code.targetRole} />
                                      ) : (
                                        <span>
                                          {courses?.find(c => c.id === code.courseId)?.title || `Curso #${code.courseId}`}
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell>{code.days}</TableCell>
                                    <TableCell>
                                      {code.usedCount}/{code.maxUses}
                                    </TableCell>
                                    <TableCell>
                                      {code.expiryDate ? format(new Date(code.expiryDate), "dd/MM/yyyy") : "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button 
                                            variant="ghost" 
                                            className="text-red-600 hover:text-red-900"
                                          >
                                            Excluir
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Excluir código promocional</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Tem certeza que deseja excluir o código promocional {code.code}? Esta ação não pode ser desfeita e removerá todos os registros de uso deste código.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => deletePromoCodeMutation.mutate(code.id)}
                                              className="bg-red-600 hover:bg-red-700"
                                            >
                                              Excluir
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center">
                                    Nenhum código promocional encontrado
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </TabsContent>
                
                {/* Prices Management Section */}
                <TabsContent value="prices">
                  <CardContent className="p-6">
                    <div className="space-y-8">
                      <div>
                        <h3 className="text-lg font-medium text-ep-black mb-4">Preços dos Planos</h3>
                        <div className="p-4 border rounded-md bg-gray-50">
                          <p className="text-sm text-muted-foreground mb-4">
                            Defina o preço mensal base para os planos de assinatura. O valor será multiplicado pelo número de meses selecionado pelo usuário.
                          </p>
                          <Form {...planPriceForm}>
                            <form onSubmit={planPriceForm.handleSubmit(onPlanPriceSubmit)} className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                  control={planPriceForm.control}
                                  name="planType"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Tipo de Plano</FormLabel>
                                      <Select 
                                        onValueChange={field.onChange} 
                                        defaultValue={field.value}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Selecione o plano" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="E-TOOL">E-TOOL</SelectItem>
                                          <SelectItem value="E-MASTER">E-MASTER</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={planPriceForm.control}
                                  name="monthlyPrice"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Preço Mensal (R$)</FormLabel>
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          placeholder="Ex: 49.90" 
                                          type="text"
                                          onChange={(e) => {
                                            // Permite apenas números e ponto/vírgula
                                            const value = e.target.value.replace(/[^\d.,]/g, '');
                                            field.onChange(value);
                                          }}
                                        />
                                      </FormControl>
                                      <FormDescription>
                                        Preço base mensal do plano em reais (use ponto como separador decimal)
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              
                              <Button 
                                type="submit" 
                                className="bg-ep-orange hover:bg-ep-orange/90"
                                disabled={updatePlanPriceMutation.isPending}
                              >
                                {updatePlanPriceMutation.isPending ? "Atualizando..." : "Atualizar Preço do Plano"}
                              </Button>
                            </form>
                          </Form>
                        </div>
                        
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">Preços Atuais dos Planos</h4>
                          {isLoadingPlanPrices ? (
                            <div className="flex justify-center p-4">
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            <div className="border rounded-md overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Plano</TableHead>
                                    <TableHead>Preço Mensal</TableHead>
                                    <TableHead>Última Atualização</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {planPrices && Object.keys(planPrices).length > 0 ? (
                                    Object.entries(planPrices).map(([planType, data]: [string, any]) => (
                                      <TableRow key={planType}>
                                        <TableCell>
                                          <RoleBadge role={planType} />
                                        </TableCell>
                                        <TableCell>
                                          R$ {parseFloat(data.monthlyPrice.toString()).toFixed(2).replace('.', ',')}
                                        </TableCell>
                                        <TableCell>
                                          {/* Informação de atualização não disponível neste formato de API */}
                                          Atualizado recentemente
                                        </TableCell>
                                      </TableRow>
                                    ))
                                  ) : (
                                    <TableRow>
                                      <TableCell colSpan={3} className="text-center">
                                        Nenhum preço de plano definido
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <h3 className="text-lg font-medium text-ep-black mb-4">Preços dos Cursos</h3>
                        <div className="p-4 border rounded-md bg-gray-50">
                          <p className="text-sm text-muted-foreground mb-4">
                            Defina o preço para os cursos pagos. Os cursos que não requererem código promocional podem ser vendidos diretamente.
                          </p>
                          <Form {...coursePriceForm}>
                            <form onSubmit={coursePriceForm.handleSubmit(onCoursePriceSubmit)} className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                  control={coursePriceForm.control}
                                  name="courseId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Curso</FormLabel>
                                      <Select 
                                        onValueChange={field.onChange} 
                                        defaultValue={field.value}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Selecione o curso" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {courses && courses.map(course => (
                                            <SelectItem key={course.id} value={course.id.toString()}>
                                              {course.title}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={coursePriceForm.control}
                                  name="price"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Preço (R$)</FormLabel>
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          placeholder="Ex: 199.90" 
                                          type="text"
                                          onChange={(e) => {
                                            // Permite apenas números e ponto/vírgula
                                            const value = e.target.value.replace(/[^\d.,]/g, '');
                                            field.onChange(value);
                                          }}
                                        />
                                      </FormControl>
                                      <FormDescription>
                                        Preço do curso em reais (use ponto como separador decimal)
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              
                              <Button 
                                type="submit" 
                                className="bg-ep-orange hover:bg-ep-orange/90"
                                disabled={updateCoursePriceMutation.isPending}
                              >
                                {updateCoursePriceMutation.isPending ? "Atualizando..." : "Atualizar Preço do Curso"}
                              </Button>
                            </form>
                          </Form>
                        </div>
                        
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">Preços Atuais dos Cursos</h4>
                          {isLoadingCourses ? (
                            <div className="flex justify-center p-4">
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            <div className="border rounded-md overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Curso</TableHead>
                                    <TableHead>Preço</TableHead>
                                    <TableHead>Categoria</TableHead>
                                    <TableHead>Instrutor</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {courses && courses.length > 0 ? (
                                    courses.map((course) => (
                                      <TableRow key={course.id}>
                                        <TableCell className="font-medium">{course.title}</TableCell>
                                        <TableCell>
                                          {course.price ? `R$ ${parseFloat(course.price).toFixed(2)}` : "Não definido"}
                                        </TableCell>
                                        <TableCell>
                                          <CategoryBadge category={course.category} />
                                        </TableCell>
                                        <TableCell>{course.instructor}</TableCell>
                                        <TableCell className="text-right">
                                          {course.price && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => removeCoursePriceMutation.mutate(course.id)}
                                              disabled={removeCoursePriceMutation.isPending && removeCoursePriceMutation.variables === course.id}
                                            >
                                              {removeCoursePriceMutation.isPending && removeCoursePriceMutation.variables === course.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                              ) : (
                                                <X className="h-4 w-4" />
                                              )}
                                              <span className="ml-1">Remover preço</span>
                                            </Button>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))
                                  ) : (
                                    <TableRow>
                                      <TableCell colSpan={5} className="text-center">
                                        Nenhum curso encontrado
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
      
      {/* Edit Tool Dialog */}
      <Dialog open={!!editingTool} onOpenChange={(open) => !open && setEditingTool(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Ferramenta</DialogTitle>
            <DialogDescription>
              Faça as alterações necessárias na ferramenta {editingTool?.name}.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editToolForm}>
            <form onSubmit={editToolForm.handleSubmit(onEditToolSubmit)} className="space-y-4 py-4">
              <FormField
                control={editToolForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editToolForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editToolForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="mechanical">Mecânica</SelectItem>
                          <SelectItem value="electrical">Elétrica</SelectItem>
                          <SelectItem value="textile">Têxtil</SelectItem>
                          <SelectItem value="informatics">Informática</SelectItem>
                          <SelectItem value="chemical">Química</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editToolForm.control}
                  name="accessLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nível de Acesso</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o nível de acesso" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="E-BASIC">E-BASIC</SelectItem>
                          <SelectItem value="E-TOOL">E-TOOL</SelectItem>
                          <SelectItem value="E-MASTER">E-MASTER</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editToolForm.control}
                  name="linkType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Conteúdo</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Limpar os campos não usados dependendo do tipo selecionado
                          if (value === "custom") {
                            editToolForm.setValue("link", "#");
                          } else if (value === "external" || value === "internal") {
                            editToolForm.setValue("customHtml", "");
                          }
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo de conteúdo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="internal">Link Interno</SelectItem>
                          <SelectItem value="external">Link Externo</SelectItem>
                          <SelectItem value="custom">HTML Personalizado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {editToolForm.watch("linkType") !== "custom" && (
                  <FormField
                    control={editToolForm.control}
                    name="link"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Link</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {editToolForm.watch("linkType") === "custom" && (
                  <>
                    <FormField
                      control={editToolForm.control}
                      name="customHtml"
                      render={({ field }) => (
                        <FormItem className="col-span-1 md:col-span-2">
                          <FormLabel>HTML Personalizado</FormLabel>
                          <FormControl>
                            <Textarea
                              rows={20}
                              className="min-h-[400px] font-mono text-sm"
                              placeholder="<html><body><h1>Minha ferramenta</h1><p>Conteúdo da ferramenta</p></body></html>"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Insira o código HTML personalizado que será exibido quando a ferramenta for acessada.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editToolForm.control}
                      name="showInIframe"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Abrir em nova guia automaticamente</FormLabel>
                            <FormDescription>
                              Marque para abrir diretamente em nova guia ao clicar, permitindo execução de scripts e formulários.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </>
                )}
                
                <div className="col-span-1 md:col-span-2 space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="editHasRestrictedCpfs"
                      checked={editHasRestrictedCpfs}
                      onCheckedChange={(checked) => {
                        setEditHasRestrictedCpfs(!!checked);
                        if (!checked) {
                          editToolForm.setValue("restrictedCpfs", "");
                        }
                      }}
                    />
                    <label
                      htmlFor="editHasRestrictedCpfs"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Restringir acesso por CPF
                    </label>
                  </div>
                  
                  {editHasRestrictedCpfs && (
                    <FormField
                      control={editToolForm.control}
                      name="restrictedCpfs"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPFs Autorizados</FormLabel>
                          <FormControl>
                            <Textarea 
                              rows={3} 
                              placeholder="Digite os CPFs separados por vírgula (ex: 12345678901, 09876543210)"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Apenas usuários com estes CPFs poderão acessar esta ferramenta, independente do nível de acesso
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingTool(null)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-ep-orange hover:bg-ep-orange/90" 
                  disabled={updateToolMutation.isPending}
                >
                  {updateToolMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Altere os dados do usuário conforme necessário.
            </DialogDescription>
          </DialogHeader>
          
          {editingUser && (
            <Form {...editUserForm}>
              <form onSubmit={editUserForm.handleSubmit(onEditUserSubmit)} className="space-y-4">
                <FormField
                  control={editUserForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome de usuário</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editUserForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editUserForm.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF (opcional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Somente números" 
                          maxLength={11}
                          {...field}
                          onChange={(e) => {
                            // Permite apenas números
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        CPF é opcional para contas gerenciadas pelo administrador
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editUserForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Papel</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o papel" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="E-BASIC">E-BASIC</SelectItem>
                          <SelectItem value="E-TOOL">E-TOOL</SelectItem>
                          <SelectItem value="E-MASTER">E-MASTER</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {(editUserForm.watch("role") === "E-TOOL" || editUserForm.watch("role") === "E-MASTER") && (
                  <FormField
                    control={editUserForm.control}
                    name="proDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dias de Assinatura</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormDescription>
                          Dias a adicionar ao período de assinatura atual
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setEditingUser(null)}
                    type="button"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-ep-orange hover:bg-ep-orange/90"
                    disabled={updateUserMutation.isPending}
                  >
                    {updateUserMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Reset Password Dialog */}
      <Dialog open={!!userToResetPassword} onOpenChange={(open) => !open && setUserToResetPassword(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir Senha</DialogTitle>
            <DialogDescription>
              {userToResetPassword ? `Definir nova senha para ${userToResetPassword.username}` : 'Definir nova senha para o usuário'}
            </DialogDescription>
          </DialogHeader>
          
          {userToResetPassword && (
            <Form {...resetPasswordForm}>
              <form onSubmit={resetPasswordForm.handleSubmit(onResetPasswordSubmit)} className="space-y-4">
                <FormField
                  control={resetPasswordForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nova Senha</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setUserToResetPassword(null)}
                    type="button"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-ep-orange hover:bg-ep-orange/90"
                    disabled={resetPasswordMutation.isPending}
                  >
                    {resetPasswordMutation.isPending ? "Redefinindo..." : "Redefinir Senha"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
