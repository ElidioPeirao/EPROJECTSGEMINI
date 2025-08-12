import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import {
  Wrench,
  ArrowLeft,
  Shield,
  FileText,
  Users,
  AlertTriangle,
  CheckCircle,
  Scale,
} from "lucide-react";

const sections = [
  {
    id: "acceptance",
    title: "1. Aceitação dos Termos",
    icon: CheckCircle,
    content: [
      "Ao acessar e usar a plataforma E-Projects, você concorda em cumprir estes Termos de Uso e todas as leis e regulamentos aplicáveis.",
      "Se você não concordar com qualquer parte destes termos, não deve usar nossos serviços.",
      "Reservamo-nos o direito de modificar estes termos a qualquer momento, sendo que as alterações entrarão em vigor imediatamente após a publicação.",
    ],
  },
  {
    id: "services",
    title: "2. Descrição dos Serviços",
    icon: FileText,
    content: [
      "A E-Projects fornece ferramentas digitais especializadas para engenheiros, incluindo calculadoras, cursos e materiais educacionais.",
      "Oferecemos diferentes níveis de acesso: E-BASIC (gratuito), E-TOOL e E-MASTER (pagos).",
      "Os serviços são fornecidos através de nossa plataforma web e podem incluir atualizações e melhorias regulares.",
    ],
  },
  {
    id: "accounts",
    title: "3. Contas de Usuário",
    icon: Users,
    content: [
      "Para acessar nossos serviços, você deve criar uma conta fornecendo informações precisas e atualizadas.",
      "Você é responsável por manter a confidencialidade de sua senha e por todas as atividades que ocorrem em sua conta.",
      "Deve notificar-nos imediatamente sobre qualquer uso não autorizado de sua conta.",
      "Uma conta por pessoa/empresa. Contas múltiplas podem resultar em suspensão.",
    ],
  },
  {
    id: "payment",
    title: "4. Pagamentos e Assinaturas",
    icon: Scale,
    content: [
      "Os planos pagos são cobrados mensalmente ou conforme o período escolhido.",
      "Todos os pagamentos são processados através de provedores seguros de pagamento.",
      "As assinaturas são renovadas automaticamente, exceto se canceladas antes do vencimento.",
      "Reembolsos podem ser concedidos a critério da E-Projects e conforme políticas específicas.",
    ],
  },
  {
    id: "usage",
    title: "5. Uso Aceitável",
    icon: Shield,
    content: [
      "Você concorda em usar nossos serviços apenas para fins legais e de acordo com estes termos.",
      "É proibido: tentar acessar sistemas não autorizados, distribuir malware, violar direitos de propriedade intelectual.",
      "Não é permitido compartilhar credenciais de acesso ou usar a plataforma para atividades comerciais não autorizadas.",
      "Reservamo-nos o direito de suspender contas que violem estas diretrizes.",
    ],
  },
  {
    id: "intellectual",
    title: "6. Propriedade Intelectual",
    icon: FileText,
    content: [
      "Todo o conteúdo da plataforma, incluindo ferramentas, textos, gráficos e software, é propriedade da E-Projects.",
      "Você recebe uma licença limitada, não exclusiva e não transferível para usar nossos serviços.",
      "É proibido copiar, modificar, distribuir ou criar obras derivadas de nosso conteúdo sem autorização.",
      "Respeitamos os direitos de propriedade intelectual de terceiros e esperamos que nossos usuários façam o mesmo.",
    ],
  },
  {
    id: "privacy",
    title: "7. Privacidade e Dados",
    icon: Shield,
    content: [
      "Coletamos e processamos dados pessoais de acordo com nossa Política de Privacidade.",
      "Utilizamos medidas de segurança adequadas para proteger suas informações.",
      "Não vendemos seus dados pessoais para terceiros.",
      "Você tem direitos sobre seus dados pessoais, incluindo acesso, correção e exclusão.",
    ],
  },
  {
    id: "limitations",
    title: "8. Limitações de Responsabilidade",
    icon: AlertTriangle,
    content: [
      "Nossos serviços são fornecidos 'como estão', sem garantias expressas ou implícitas.",
      "Não nos responsabilizamos por danos indiretos, incidentais ou consequenciais.",
      "Nossa responsabilidade total não excederá o valor pago pelos serviços nos últimos 12 meses.",
      "Não garantimos que os serviços estarão sempre disponíveis ou livres de erros.",
    ],
  },
  {
    id: "termination",
    title: "9. Encerramento",
    icon: AlertTriangle,
    content: [
      "Você pode encerrar sua conta a qualquer momento através das configurações da conta.",
      "Podemos suspender ou encerrar sua conta por violação destes termos.",
      "Após o encerramento, você perderá acesso aos serviços e conteúdos da conta.",
      "Algumas disposições destes termos continuarão válidas após o encerramento.",
    ],
  },
  {
    id: "general",
    title: "10. Disposições Gerais",
    icon: Scale,
    content: [
      "Estes termos constituem o acordo completo entre você e a E-Projects.",
      "Se alguma disposição for considerada inválida, as demais permanecerão em vigor.",
      "Estes termos são regidos pelas leis do Brasil.",
      "Quaisquer disputas serão resolvidas nos tribunais competentes de São Paulo, SP.",
    ],
  },
];

export default function TermsPage() {
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
            Termos de <span className="text-ep-orange">Uso</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Estes termos definem as regras e condições para o uso da plataforma
            E-Projects. Leia atentamente antes de utilizar nossos serviços.
          </p>
          <div className="bg-white rounded-lg p-6 shadow-lg inline-block">
            <p className="text-sm text-gray-600">
              <strong>Última atualização:</strong> 09 de Junho de 2025
            </p>
          </div>
        </div>

        {/* Table of Contents */}
        <div className="mb-12">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center">
                <FileText className="h-6 w-6 mr-2 text-ep-orange" />
                Índice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sections.map((section, index) => (
                  <a
                    key={index}
                    href={`#${section.id}`}
                    className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <section.icon className="h-5 w-5 text-ep-orange mr-3" />
                    <span className="text-gray-700 hover:text-ep-orange">
                      {section.title}
                    </span>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Terms Sections */}
        <div className="space-y-8 mb-16">
          {sections.map((section, index) => (
            <Card key={index} id={section.id} className="border-2">
              <CardHeader>
                <CardTitle className="text-xl flex items-center">
                  <section.icon className="h-6 w-6 mr-3 text-ep-orange" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {section.content.map((paragraph, pIndex) => (
                    <p key={pIndex} className="text-gray-700 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Contact Information */}
        <section className="mb-16">
          <Card className="border-2 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center">
                <Shield className="h-6 w-6 mr-2 text-ep-orange" />
                Dúvidas sobre os Termos?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                Se você tiver dúvidas sobre estes Termos de Uso, entre em
                contato conosco:
              </p>
              <div className="space-y-2 text-gray-600">
                <p>
                  <strong>Email:</strong> eprojects.contato@gmail.com
                </p>
                <p>
                  <strong>Telefone:</strong> +55 (47) 98834-1912
                </p>
                <p>
                  <strong>Endereço:</strong> Brusque, SC - Brasil
                </p>
              </div>
              <div className="mt-6">
                <Button asChild className="bg-ep-orange hover:bg-ep-orange/90">
                  <Link href="/contact">Entrar em Contato</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Important Notice */}
        <section className="mb-16">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-r-lg">
            <div className="flex items-start">
              <AlertTriangle className="h-6 w-6 text-yellow-600 mr-3 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                  Aviso Importante
                </h3>
                <p className="text-yellow-700">
                  Estes termos podem ser alterados periodicamente. Recomendamos
                  que você revise esta página regularmente para se manter
                  informado sobre eventuais mudanças. O uso continuado dos
                  serviços após alterações constitui aceitação dos novos termos.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center">
          <div className="bg-gradient-to-r from-ep-orange to-orange-600 text-orange rounded-lg p-12">
            <h2 className="text-3xl font-bold mb-4">Aceita os Termos?</h2>
            <p className="text-xl mb-8 opacity-90">
              Crie sua conta e comece a usar nossa plataforma
            </p>
            <Button
              size="lg"
              className="bg-white text-ep-orange hover:bg-gray-100"
              asChild
            >
              <Link href="/auth">Criar Conta Agora</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
