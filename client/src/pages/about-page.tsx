import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "wouter";
import {
  Wrench,
  ArrowLeft,
  Users,
  Target,
  Lightbulb,
  Award,
  ChevronRight,
} from "lucide-react";

const values = [
  {
    icon: Target,
    title: "Precisão",
    description:
      "Fornecemos ferramentas precisas e confiáveis para cálculos de engenharia",
  },
  {
    icon: Lightbulb,
    title: "Inovação",
    description:
      "Desenvolvemos constantemente novas soluções para os desafios da engenharia moderna",
  },
  {
    icon: Users,
    title: "Colaboração",
    description:
      "Construímos nossa plataforma com feedback direto da comunidade de engenheiros",
  },
  {
    icon: Award,
    title: "Excelência",
    description:
      "Mantemos os mais altos padrões de qualidade em todas as nossas ferramentas",
  },
];

const team = [
  {
    name: "Prof. Elidio P. Junio",
    role: "Fundador & CEO",
    description:
      "Engenheiro Mecânico com 5 anos de experiência em projetos industriais",
    image: "👨‍💼",
  },
  {
    name: "Prof. Henrique Fracari",
    role: "Diretor Técnico",
    description: "Especialista em Engenharia Elétrica e Eletronica",
    image: "👩‍💻",
  },
  {
    name: "Prof. Maicon Steinbach",
    role: "Líder de Produto",
    description: "Técnico Mecânico com experiencia em ferramentaria",
    image: "👨‍🔬",
  },
];

export default function AboutPage() {
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
            Sobre a <span className="text-ep-orange">E-Projects</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Somos uma empresa dedicada a revolucionar a forma como engenheiros
            trabalham, fornecendo ferramentas digitais avançadas e precisas para
            acelerar projetos e garantir resultados excepcionais.
          </p>
        </div>

        {/* Mission Section */}
        <section className="mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Nossa Missão
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Capacitar engenheiros com ferramentas digitais intuitivas e
                precisas que otimizam processos, reduzem tempo de
                desenvolvimento e garantem a qualidade técnica em projetos de
                todas as complexidades.
              </p>
              <p className="text-lg text-gray-600">
                Acreditamos que a tecnologia deve simplificar o trabalho do
                engenheiro, não complicá-lo. Por isso, desenvolvemos soluções
                que combinam rigor técnico com facilidade de uso.
              </p>
            </div>
            <div className="bg-white rounded-lg p-8 shadow-lg">
              <div className="text-center">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Nosso Objetivo
                </h3>
                <p className="text-gray-600">
                  Ser a plataforma de referência para engenheiros que buscam
                  excelência técnica e eficiência em seus projetos.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Nossos Valores
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Os princípios que guiam nosso trabalho e definem nossa cultura
              empresarial
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <Card
                key={index}
                className="text-center border-2 hover:border-ep-orange/50 transition-colors"
              >
                <CardHeader>
                  <value.icon className="h-12 w-12 text-ep-orange mx-auto mb-4" />
                  <CardTitle className="text-xl">{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600">
                    {value.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Team Section */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Nossa Equipe
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Profissionais experientes e apaixonados por engenharia e
              tecnologia
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <Card
                key={index}
                className="text-center border-2 hover:border-ep-orange/50 transition-colors"
              >
                <CardHeader>
                  <div className="text-6xl mb-4">{member.image}</div>
                  <CardTitle className="text-xl">{member.name}</CardTitle>
                  <CardDescription className="text-ep-orange font-semibold">
                    {member.role}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{member.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* History Section */}
        <section className="mb-20">
          <div className="bg-white rounded-lg p-8 shadow-lg">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Nossa História
            </h2>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="bg-ep-orange text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    2022 - Fundação
                  </h3>
                  <p className="text-gray-600">
                    A E-Projects nasceu da necessidade de engenheiros
                    experientes que buscavam ferramentas mais eficientes para
                    seus projetos diários.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="bg-ep-orange text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    2023 - Primeiras Ferramentas
                  </h3>
                  <p className="text-gray-600">
                    Lançamento das primeiras calculadoras especializadas para
                    engenharia mecânica e elétrica com grande aceitação da
                    comunidade.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="bg-ep-orange text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    2024 - Expansão
                  </h3>
                  <p className="text-gray-600">
                    Adição de ferramentas para engenharia têxtil, química e
                    informática, além do lançamento da plataforma de cursos
                    especializados.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="bg-ep-orange text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    2025 - Presente
                  </h3>
                  <p className="text-gray-600">
                    Mais de 20 engenheiros ativos utilizam nossa plataforma
                    diariamente, consolidando nossa posição como referência no
                    setor.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center">
          <div className="bg-gradient-to-r from-ep-orange to-orange-600 text-orange rounded-lg p-12">
            <h2 className="text-3xl font-bold mb-4">
              Junte-se à Nossa Comunidade
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Faça parte da revolução digital na engenharia
            </p>
            <Button
              size="lg"
              className="bg-white text-ep-orange hover:bg-gray-100"
              asChild
            >
              <Link href="/auth">
                Começar Agora
                <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
