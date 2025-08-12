import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Wrench,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  MessageCircle,
  Users,
  HeadphonesIcon,
} from "lucide-react";

const contactMethods = [
  {
    icon: Mail,
    title: "Email",
    description: "eprojects.contato@gmail.com",
    detail: "Resposta em até 24 horas",
  },
  {
    icon: Phone,
    title: "Telefone",
    description: "+55 (47) 98834-1912",
    detail: "Seg-Sex, 8h às 18h",
  },
  {
    icon: MessageCircle,
    title: "Chat ao Vivo",
    description: "Disponível na plataforma",
    detail: "Para usuários logados",
  },
  {
    icon: MapPin,
    title: "Endereço",
    description: "Brusque, SC",
    detail: "Brasil",
  },
];

const supportTypes = [
  {
    icon: HeadphonesIcon,
    title: "Suporte Técnico",
    description: "Ajuda com ferramentas e funcionalidades",
  },
  {
    icon: Users,
    title: "Vendas",
    description: "Informações sobre planos e preços",
  },
  {
    icon: MessageCircle,
    title: "Parcerias",
    description: "Oportunidades de colaboração",
  },
];

export default function ContactPage() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.email ||
      !formData.subject ||
      !formData.message
    ) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    // Simular envio de formulário
    setTimeout(() => {
      toast({
        title: "Mensagem enviada!",
        description: "Entraremos em contato em breve",
      });
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wrench className="h-8 w-8 text-ep-orange" />
            <span className="text-2xl font-bold text-gray-900">E-Projects</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao Início
              </Link>
            </Button>
            <Button asChild className="bg-ep-orange hover:bg-ep-orange/90">
              <Link href="/auth">Entrar</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Entre em <span className="text-ep-orange">Contato</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Estamos aqui para ajudar. Entre em contato conosco através de
            qualquer um dos canais abaixo ou envie uma mensagem diretamente.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Contact Form */}
          <div>
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-2xl">Envie sua Mensagem</CardTitle>
                <CardDescription>
                  Preencha o formulário abaixo e entraremos em contato em breve
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Nome Completo *
                    </label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Seu nome completo"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Email *
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="seu@email.com"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="subject"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Assunto *
                    </label>
                    <Input
                      id="subject"
                      name="subject"
                      type="text"
                      value={formData.subject}
                      onChange={handleInputChange}
                      placeholder="Assunto da sua mensagem"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Mensagem *
                    </label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Digite sua mensagem aqui..."
                      rows={6}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-ep-orange hover:bg-ep-orange/90"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      "Enviando..."
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Enviar Mensagem
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Informações de Contato
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {contactMethods.map((method, index) => (
                  <Card
                    key={index}
                    className="border-2 hover:border-ep-orange/50 transition-colors"
                  >
                    <CardContent className="p-6">
                      <method.icon className="h-8 w-8 text-ep-orange mb-3" />
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {method.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-1">
                        {method.description}
                      </p>
                      <p className="text-gray-500 text-xs">{method.detail}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Horário de Atendimento
              </h3>
              <Card className="border-2">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <Clock className="h-6 w-6 text-ep-orange mr-3" />
                    <span className="font-semibold text-gray-900">
                      Suporte ao Cliente
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Segunda - Sexta:</span>
                      <span>8h às 18h</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sábado:</span>
                      <span>9h às 14h</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Domingo:</span>
                      <span>Fechado</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Support Types */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Como Podemos Ajudar
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Nossa equipe está preparada para atender diferentes tipos de
              solicitações
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {supportTypes.map((type, index) => (
              <Card
                key={index}
                className="text-center border-2 hover:border-ep-orange/50 transition-colors"
              >
                <CardHeader>
                  <type.icon className="h-12 w-12 text-ep-orange mx-auto mb-4" />
                  <CardTitle className="text-xl">{type.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600">
                    {type.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* FAQ Quick Links */}
        <section className="mb-16">
          <Card className="bg-white border-2">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Perguntas Frequentes</CardTitle>
              <CardDescription>
                Encontre respostas rápidas para as dúvidas mais comuns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Como posso fazer upgrade do meu plano?
                  </h4>
                  <p className="text-gray-600 text-sm">
                    Acesse sua conta e vá para a seção "Upgrade" para ver as
                    opções disponíveis.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Posso cancelar minha assinatura a qualquer momento?
                  </h4>
                  <p className="text-gray-600 text-sm">
                    Sim, você pode cancelar sua assinatura a qualquer momento em
                    "Minha Conta".
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    As ferramentas funcionam offline?
                  </h4>
                  <p className="text-gray-600 text-sm">
                    Nossas ferramentas são baseadas na web e requerem conexão
                    com a internet.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Vocês oferecem treinamento?
                  </h4>
                  <p className="text-gray-600 text-sm">
                    Sim, temos cursos especializados disponíveis para usuários
                    E-MASTER.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* CTA Section */}
        <section className="text-center">
          <div className="bg-gradient-to-r from-ep-orange to-orange-600 text-orange rounded-lg p-12">
            <h2 className="text-3xl font-bold mb-4">Pronto para Começar?</h2>
            <p className="text-xl mb-8 opacity-90">
              Experimente nossa plataforma gratuitamente
            </p>
            <Button
              size="lg"
              className="bg-white text-ep-orange hover:bg-gray-100"
              asChild
            >
              <Link href="/auth">Criar Conta Gratuita</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
