import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  Calculator,
  Zap,
  Wrench,
  Monitor,
  FlaskConical,
  Shirt,
  ArrowRight,
  CheckCircle,
  Users,
  BookOpen,
  Shield,
  Star,
} from "lucide-react";

const features = [
  {
    icon: Calculator,
    title: "Ferramentas Mecânicas",
    description:
      "Calculadoras avançadas para dimensionamento e análise estrutural",
  },
  {
    icon: Zap,
    title: "Ferramentas Elétricas",
    description: "Sistemas de dimensionamento elétrico e análise de circuitos",
  },
  {
    icon: Shirt,
    title: "Processos Têxteis",
    description: "Ferramentas especializadas para indústria têxtil",
  },
  {
    icon: Monitor,
    title: "Informática",
    description: "Soluções tecnológicas e ferramentas de desenvolvimento",
  },
  {
    icon: FlaskConical,
    title: "Processos Químicos",
    description: "Calculadoras para processos químicos industriais",
  },
  {
    icon: BookOpen,
    title: "Cursos Especializados",
    description: "Conteúdo educacional avançado para profissionais",
  },
];

const plans = [
  {
    name: "E-BASIC",
    price: "Gratuito",
    description: "Acesso às ferramentas básicas",
    features: [
      "Calculadoras básicas",
      "Suporte por chat",
      "Documentação completa",
    ],
    highlight: false,
  },
  {
    name: "E-TOOL",
    price: "R$ 29,90/mês",
    description: "Ferramentas avançadas de engenharia",
    features: [
      "Todas as ferramentas básicas",
      "Análise de tensões",
      "Dimensionamento avançado",
      "Suporte prioritário",
    ],
    highlight: true,
  },
  {
    name: "E-MASTER",
    price: "R$ 59,90/mês",
    description: "Acesso completo + cursos",
    features: [
      "Todas as ferramentas E-TOOL",
      "Acesso completo aos cursos",
      "Materiais exclusivos",
      "Suporte premium",
    ],
    highlight: false,
  },
];

const testimonials = [
  {
    name: "Prof. Elidio P. Junior",
    role: "Engenheiro Mecânico",
    content:
      "As ferramentas da E-Projects revolucionaram minha forma de trabalhar. Economia de tempo e precisão incomparáveis.",
    rating: 5,
  },
  {
    name: "Prof. Henrique Fracari",
    role: "Engenheiro Elétrica",
    content:
      "Plataforma excepcional para dimensionamento elétrico. Recomendo para todos os profissionais da área.",
    rating: 5,
  },
  {
    name: "Prof. Lisandra Corsi",
    role: "Engenheira Têxtil",
    content:
      "Finalmente uma solução completa para a indústria têxtil. Ferramentas precisas e fáceis de usar.",
    rating: 5,
  },
];

export default function HomePage() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
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
            <Button variant="ghost" onClick={() => scrollToSection("features")}>
              Recursos
            </Button>
            <Button variant="ghost" onClick={() => scrollToSection("pricing")}>
              Planos
            </Button>
            <Button
              variant="ghost"
              onClick={() => scrollToSection("testimonials")}
            >
              Depoimentos
            </Button>
            <Button asChild className="bg-ep-orange hover:bg-ep-orange/90">
              <Link href="/auth">Entrar</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <Badge variant="secondary" className="mb-6">
            Plataforma de Engenharia Avançada
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Ferramentas de
            <span className="text-ep-orange"> Engenharia</span>
            <br />
            para Profissionais
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Acesse calculadoras avançadas, cursos especializados e ferramentas
            profissionais para engenharia mecânica, elétrica, têxtil, química e
            informática.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              asChild
              className="bg-ep-orange hover:bg-ep-orange/90"
            >
              <Link href="/auth">
                Começar Gratuitamente
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => scrollToSection("features")}
            >
              Conhecer Recursos
            </Button>
          </div>
          <div className="mt-12 flex items-center justify-center space-x-8 text-gray-500">
            <div className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              <span>50+ Engenheiros</span>
            </div>
            <div className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              <span>100% Seguro</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span>Sempre Atualizado</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Recursos Profissionais
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Ferramentas especializadas desenvolvidas por engenheiros para
              engenheiros
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="border-2 hover:border-ep-orange/50 transition-colors"
              >
                <CardHeader>
                  <feature.icon className="h-12 w-12 text-ep-orange mb-4" />
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-gray-600">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section
        id="pricing"
        className="py-20 px-4 bg-gradient-to-br from-slate-50 to-orange-50"
      >
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Planos Flexíveis
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Escolha o plano ideal para suas necessidades profissionais
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <Card
                key={index}
                className={`relative ${
                  plan.highlight
                    ? "border-2 border-ep-orange shadow-xl scale-105"
                    : "border-2 hover:border-ep-orange/50"
                } transition-all`}
              >
                {plan.highlight && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-ep-orange">
                    Mais Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl font-bold">
                    {plan.name}
                  </CardTitle>
                  <div className="text-3xl font-bold text-ep-orange mb-2">
                    {plan.price}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${
                      plan.highlight
                        ? "bg-ep-orange hover:bg-ep-orange/90"
                        : "bg-gray-900 hover:bg-gray-800"
                    }`}
                    asChild
                  >
                    <Link href="/auth">
                      {plan.name === "E-BASIC"
                        ? "Começar Grátis"
                        : "Escolher Plano"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              O que nossos usuários dizem
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Profissionais de engenharia confiam na E-Projects
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card
                key={index}
                className="border-2 hover:border-ep-orange/50 transition-colors"
              >
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-5 w-5 text-yellow-400 fill-current"
                      />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-4 italic">
                    "{testimonial.content}"
                  </p>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-ep-orange to-orange-600 text-orange">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Pronto para começar?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Junte-se a milhares de engenheiros que já usam a E-Projects para
            otimizar seus projetos e acelerar seus resultados.
          </p>
          <Button
            size="lg"
            className="bg-white text-ep-orange hover:bg-gray-100"
            asChild
          >
            <Link href="/auth">
              Criar Conta Gratuita
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Wrench className="h-6 w-6 text-ep-orange" />
                <span className="text-xl font-bold">E-Projects</span>
              </div>
              <p className="text-gray-400">
                Ferramentas profissionais de engenharia para acelerar seus
                projetos.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Recursos</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="#features" className="hover:text-white">
                    Ferramentas
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="hover:text-white">
                    Planos
                  </Link>
                </li>
                <li>
                  <Link href="/auth" className="hover:text-white">
                    Cursos
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Suporte</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/contact" className="hover:text-white">
                    Central de Ajuda
                  </Link>
                </li>
                <li>
                  <Link href="/auth" className="hover:text-white">
                    Chat
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white">
                    Documentação
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Empresa</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/about" className="hover:text-white">
                    Sobre
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white">
                    Contato
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white">
                    Termos
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 E-Projects. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
