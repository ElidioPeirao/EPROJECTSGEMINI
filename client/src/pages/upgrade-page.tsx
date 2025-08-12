import {
  useStripe,
  Elements,
  PaymentElement,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, CreditCard, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Header from "@/components/header";
import Footer from "@/components/footer";

// Components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// Carregar Stripe fora do componente para evitar recriá-lo
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Componente do formulário de pagamento
function StripeCheckoutForm({
  selectedPlan,
  onSuccess,
  months,
}: {
  selectedPlan: string;
  onSuccess: () => void;
  months: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          // Redirecionar para a página inicial após o pagamento
          return_url: window.location.origin + "/?payment_success=true",
        },
        redirect: "if_required",
      });

      if (error) {
        toast({
          title: "Erro no pagamento",
          description:
            error.message || "Ocorreu um erro ao processar o pagamento.",
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        // Processar imediatamente o pagamento sem depender do webhook
        try {
          // Chamar o endpoint de confirmação diretamente
          const confirmResponse = await apiRequest(
            "POST",
            "/api/upgrade/confirm-payment",
            {
              paymentIntentId: paymentIntent.id,
            },
          );

          if (confirmResponse.ok) {
            toast({
              title: "Pagamento realizado!",
              description: "Seu upgrade foi concluído com sucesso.",
            });

            // Atualizar o usuário em cache
            queryClient.invalidateQueries({ queryKey: ["/api/user"] });

            // Navegar para a página inicial
            window.location.href = "/dashboard";
          } else {
            toast({
              title: "Pagamento processado",
              description:
                "Seu pagamento foi concluído, mas ainda estamos atualizando seu plano. Por favor, aguarde um momento.",
            });
          }
        } catch (err) {
          console.error("Erro ao confirmar pagamento:", err);
          toast({
            title: "Pagamento processado",
            description:
              "Seu pagamento foi concluído, mas ocorreu um erro ao atualizar seu plano. Entre em contato com o suporte se o problema persistir.",
          });
        }
        onSuccess();
      } else {
        // Aguardar webhook do Stripe confirmar o pagamento
        toast({
          title: "Pagamento em processamento",
          description:
            "Estamos processando seu pagamento. Você receberá uma notificação em breve.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Ocorreu um erro ao processar o pagamento.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement className="mb-6" />
      <div className="mt-2 mb-4 p-3 bg-gray-50 rounded-md">
        <p className="text-sm text-gray-600">
          Plano: <span className="font-medium">{selectedPlan}</span> por{" "}
          <span className="font-medium">
            {months} {months > 1 ? "meses" : "mês"}
          </span>
        </p>
      </div>
      <Button
        type="submit"
        className="w-full bg-ep-orange hover:bg-ep-orange/90"
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processando...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Finalizar pagamento
          </>
        )}
      </Button>
    </form>
  );
}

export default function UpgradePage() {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [checkoutComplete, setCheckoutComplete] = useState(false);
  const [months, setMonths] = useState(1);
  const { toast } = useToast();

  // Buscar preços dos planos disponíveis
  const { data: planPrices = {}, isLoading: isLoadingPlans } = useQuery<
    Record<string, { monthlyPrice: number }>
  >({
    queryKey: ["/api/upgrade/plans/prices"],
    enabled: !!user,
  });

  // Mutação para criar intenção de pagamento
  const createPaymentIntent = useMutation({
    mutationFn: async ({
      planType,
      months,
    }: {
      planType: string;
      months: number;
    }) => {
      const response = await apiRequest(
        "POST",
        "/api/upgrade/create-payment-intent",
        {
          planType,
          months,
        },
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao criar intenção de pagamento");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Selecionar um plano e iniciar checkout
  const handleSelectPlan = async (planType: string) => {
    setSelectedPlan(planType);
    createPaymentIntent.mutate({ planType, months });
  };

  // Resetar checkout
  const handleReset = () => {
    setSelectedPlan(null);
    setClientSecret(null);
    setCheckoutComplete(false);
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
  };

  // Buscar planos disponíveis ao carregar a página
  useEffect(() => {
    // Invalida a consulta ao usuário para garantir informações atualizadas
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
  }, []);

  // Se não estiver autenticado, redireciona para o login
  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>Acesso Restrito</CardTitle>
              <CardDescription>
                Você precisa estar autenticado para acessar esta página.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center">
              <Button asChild>
                <Link href="/auth">Fazer Login</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-grow">
        <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 sm:py-12">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-ep-black">
                Upgrade de <span className="text-ep-orange">Plano</span>
              </h1>
              <p className="mt-2 text-gray-600">
                Escolha um plano para obter acesso a mais ferramentas e
                conteúdos
              </p>
            </div>
            <Button variant="outline" asChild className="flex items-center">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar à página inicial
              </Link>
            </Button>
          </div>

          {checkoutComplete ? (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <div className="flex items-center justify-center mb-2">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
                <CardTitle className="text-center text-green-800">
                  Upgrade Concluído!
                </CardTitle>
                <CardDescription className="text-center text-green-700">
                  Seu pagamento foi processado com sucesso e seu plano foi
                  atualizado.
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex justify-center gap-4">
                <Button asChild variant="outline">
                  <Link href="/">Ir para a página inicial</Link>
                </Button>
                <Button asChild>
                  <Link href="/account">Ver Detalhes da Conta</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : clientSecret && selectedPlan ? (
            <Card>
              <CardHeader>
                <CardTitle>Finalizar Upgrade</CardTitle>
                <CardDescription>
                  Complete o pagamento para ativar seu novo plano
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: "stripe",
                      variables: {
                        colorPrimary: "#ff5722",
                      },
                    },
                  }}
                >
                  <StripeCheckoutForm
                    selectedPlan={selectedPlan}
                    onSuccess={() => setCheckoutComplete(true)}
                    months={months}
                  />
                </Elements>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button variant="ghost" onClick={handleReset}>
                  Escolher outro plano
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <>
              <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {isLoadingPlans ? (
                  <div className="col-span-full flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-ep-orange" />
                  </div>
                ) : Object.keys(planPrices).length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <p className="text-gray-500">
                      Não há planos de upgrade disponíveis para sua conta atual.
                    </p>
                    <Button asChild className="mt-4" variant="outline">
                      <Link href="/">Voltar ao Dashboard</Link>
                    </Button>
                  </div>
                ) : (
                  Object.entries(planPrices).map(
                    ([planType, data]: [string, any]) => {
                      const planInfo = {
                        name: planType === "E-TOOL" ? "E-TOOL" : "E-MASTER",
                        description:
                          planType === "E-TOOL"
                            ? "Acesso a ferramentas E-TOOL"
                            : "Acesso a todas as ferramentas e cursos",
                        days: 30 * months, // Dias calculados com base nos meses selecionados
                        monthlyPrice: data.monthlyPrice,
                        maxMonths: 12,
                        minMonths: 1,
                      };

                      return (
                        <Card key={planType} className="flex flex-col">
                          <CardHeader>
                            <Badge className="w-fit bg-ep-orange mb-2">
                              {planInfo.name}
                            </Badge>
                            <CardTitle>{planInfo.description}</CardTitle>
                            <CardDescription>
                              Acesso por {planInfo.days} dias
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="flex-grow">
                            <div className="space-y-4">
                              <div className="text-center">
                                <div className="text-sm text-gray-500">
                                  A partir de
                                </div>
                                <div className="text-3xl font-bold">
                                  R${" "}
                                  {(
                                    parseFloat(
                                      planInfo.monthlyPrice.toString(),
                                    ) || 0
                                  )
                                    .toFixed(2)
                                    .replace(".", ",")}
                                  <span className="text-sm font-normal text-gray-500">
                                    /mês
                                  </span>
                                </div>
                              </div>

                              <Separator />

                              <div className="space-y-2">
                                <Label htmlFor={`months-${planType}`}>
                                  Duração da assinatura:
                                </Label>
                                <Select
                                  defaultValue="1"
                                  onValueChange={(value) =>
                                    setMonths(parseInt(value))
                                  }
                                >
                                  <SelectTrigger id={`months-${planType}`}>
                                    <SelectValue placeholder="Selecione a duração" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from(
                                      { length: planInfo.maxMonths },
                                      (_, i) => i + planInfo.minMonths,
                                    ).map((m) => (
                                      <SelectItem key={m} value={m.toString()}>
                                        {m} {m > 1 ? "meses" : "mês"} - R${" "}
                                        {(
                                          parseFloat(
                                            planInfo.monthlyPrice.toString(),
                                          ) * m
                                        )
                                          .toFixed(2)
                                          .replace(".", ",")}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center text-sm text-gray-700">
                                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                  Acesso a ferramentas exclusivas
                                </div>
                                {planType === "E-MASTER" && (
                                  <div className="flex items-center text-sm text-gray-700">
                                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                    Acesso a todos os cursos disponíveis
                                  </div>
                                )}
                                <div className="flex items-center text-sm text-gray-700">
                                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                  Suporte prioritário
                                </div>
                              </div>
                            </div>
                          </CardContent>
                          <CardFooter>
                            <Button
                              className="w-full bg-ep-orange hover:bg-ep-orange/90"
                              onClick={() => handleSelectPlan(planType)}
                              disabled={createPaymentIntent.isPending}
                            >
                              {createPaymentIntent.isPending &&
                              planType === selectedPlan ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Carregando...
                                </>
                              ) : (
                                <>Fazer upgrade</>
                              )}
                            </Button>
                          </CardFooter>
                        </Card>
                      );
                    },
                  )
                )}
              </div>

              <div className="mt-12 p-6 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium mb-4">
                  Perguntas Frequentes
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium">
                      O que está incluído no plano E-TOOL?
                    </h4>
                    <p className="text-gray-600 mt-1">
                      O plano E-TOOL inclui acesso a todas as ferramentas
                      marcadas como E-TOOL e E-BASIC.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium">
                      O que está incluído no plano E-MASTER?
                    </h4>
                    <p className="text-gray-600 mt-1">
                      O plano E-MASTER inclui acesso a todas as ferramentas e
                      cursos disponíveis na plataforma.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium">
                      Como posso atualizar meu plano?
                    </h4>
                    <p className="text-gray-600 mt-1">
                      Selecione o plano desejado, escolha a duração e complete o
                      pagamento. Seu acesso será atualizado automaticamente.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium">
                      Posso cancelar minha assinatura?
                    </h4>
                    <p className="text-gray-600 mt-1">
                      Os planos não são recorrentes. Após o período contratado,
                      seu acesso volta ao nível anterior automaticamente.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
