import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  Lock,
  Code,
  Link as LinkIcon,
  Maximize2,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { Tool } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import ToolRating from "@/components/tool-rating";

type ToolCardProps = {
  tool: Tool;
  isBlocked?: boolean;
};

export default function ToolCard({ tool, isBlocked = false }: ToolCardProps) {
  const { isEMaster, isETool, isEBasic, isAdmin, user } = useAuth();
  const [location, setLocation] = useLocation();
  const [showCustomHtml, setShowCustomHtml] = useState(false);

  // Verificar se a ferramenta é acessível com base no nível de acesso do usuário
  const isAccessible = () => {
    if (isAdmin) return true;
    if (tool.accessLevel === "E-BASIC") return true;
    if (tool.accessLevel === "E-TOOL") return isETool || isEMaster;
    if (tool.accessLevel === "E-MASTER") return isEMaster;
    return false;
  };

  const isLocked = isBlocked || !isAccessible();

  const handleToolClick = () => {
    if (isLocked) return;

    if (tool.linkType === "external") {
      window.open(tool.link, "_blank");
    } else if (tool.linkType === "internal") {
      setLocation(tool.link);
    } else if (tool.linkType === "custom") {
      // Se a ferramenta estiver marcada para mostrar em iframe, abrir em nova guia
      if (tool.showInIframe) {
        // Criar um nome de URL amigável baseado no nome da ferramenta
        const urlName = tool.name
          .toLowerCase()
          .replace(/\s+/g, "-") // Substitui espaços por hífens
          .replace(/[^\w\-]+/g, "") // Remove caracteres não alfanuméricos
          .replace(/\-\-+/g, "-") // Substitui múltiplos hífens por um único
          .replace(/^-+/, "") // Remove hífens no início
          .replace(/-+$/, ""); // Remove hífens no final

        const newWindow = window.open("", "_blank");
        if (newWindow && tool.customHtml) {
          // Escrever o HTML com proteções contra visualização do código fonte
          newWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>${tool.name}</title>
                <style>
                  body {
  margin: 0;
  padding: 20px;
  overflow-y: auto;
  font-family: Arial, sans-serif;
  line-height: 1.6;
}
                  iframe { width: 100%; height: 100vh; border: none; }
                </style>
                <script>
                  // Desativar menu de contexto
                  document.addEventListener('contextmenu', event => event.preventDefault());
                  
                  // Desativar teclas de inspeção
                  document.addEventListener('keydown', function(e) {
                    // Ctrl+Shift+I, Ctrl+Shift+J, F12
                    if (
                      (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) || 
                      e.keyCode === 123
                    ) {
                      e.preventDefault();
                    }
                  });
                  
                  // Impedir visualização do código fonte
                  document.addEventListener('keydown', function(e) {
                    // Ctrl+U
                    if (e.ctrlKey && e.keyCode === 85) {
                      e.preventDefault();
                    }
                  });
                </script>
              </head>
              <body>
                <div id="content">
                  ${tool.customHtml}
                </div>
              </body>
            </html>
          `);

          // Definir URL para mostrar o nome da ferramenta
          try {
            newWindow.history.pushState({}, tool.name, "/" + urlName);
          } catch (e) {
            // Em alguns navegadores pode falhar por questões de segurança
            console.error("Não foi possível alterar a URL:", e);
          }

          newWindow.document.close();
        }
      } else {
        // Caso contrário, mostrar no modal
        setShowCustomHtml(true);
      }
    }
  };

  const renderToolAction = () => {
    if (isLocked) {
      return (
        <div className="space-y-2">
          <Button
            className="w-full bg-gray-400 text-white cursor-not-allowed"
            disabled
          >
            <Lock className="mr-2 h-4 w-4" /> Requer {tool.accessLevel}
          </Button>
          <Button
            variant="outline"
            className="w-full text-ep-orange border-ep-orange hover:bg-ep-orange/10"
            asChild
          >
            <Link href="/upgrade">
              Fazer Upgrade
            </Link>
          </Button>
        </div>
      );
    }

    let icon;
    let label = "Acessar ferramenta";

    if (tool.linkType === "external") {
      icon = <ExternalLink className="ml-2 h-4 w-4" />;
    } else if (tool.linkType === "internal") {
      icon = <LinkIcon className="ml-2 h-4 w-4" />;
    } else if (tool.linkType === "custom") {
      icon = <Code className="ml-2 h-4 w-4" />;
      label = "Abrir ferramenta";
    }

    return (
      <Button
        className="w-full bg-ep-black hover:bg-gray-800"
        onClick={handleToolClick}
      >
        {label} {icon}
      </Button>
    );
  };

  return (
    <>
      <Card className={`overflow-hidden transition-all ${isLocked ? 'opacity-75 border-gray-300 hover:shadow-sm' : 'hover:shadow-md'}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-medium ${isLocked ? 'text-gray-600' : 'text-ep-black'}`}>{tool.name}</h3>
            <div className="flex space-x-1">
              {isLocked && (
                <Badge className="bg-red-100 text-red-800 border-red-200">
                  <Lock className="mr-1 h-3 w-3" />
                  {tool.accessLevel}
                </Badge>
              )}
              {tool.category === "mechanical" ? (
                <Badge
                  variant="outline"
                  className="bg-blue-100 text-blue-800 border-blue-200"
                >
                  <svg
                    className="mr-1 h-3 w-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M14.31 8l5.74 9.94" />
                    <path d="M9.69 8h11.48" />
                    <path d="M7.38 12l5.74-9.94" />
                    <path d="M9.69 16L3.95 6.06" />
                    <path d="M14.31 16H2.83" />
                    <path d="M16.62 12l-5.74 9.94" />
                  </svg>
                  Mecânica
                </Badge>
              ) : tool.category === "electrical" ? (
                <Badge
                  variant="outline"
                  className="bg-yellow-100 text-yellow-800 border-yellow-200"
                >
                  <svg
                    className="mr-1 h-3 w-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                  Elétrica
                </Badge>
              ) : tool.category === "textile" ? (
                <Badge
                  variant="outline"
                  className="bg-pink-100 text-pink-800 border-pink-200"
                >
                  <svg
                    className="mr-1 h-3 w-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 12h18" />
                    <path d="M3 6h18" />
                    <path d="M3 18h18" />
                  </svg>
                  Têxtil
                </Badge>
              ) : tool.category === "informatics" ? (
                <Badge
                  variant="outline"
                  className="bg-purple-100 text-purple-800 border-purple-200"
                >
                  <svg
                    className="mr-1 h-3 w-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  Informática
                </Badge>
              ) : tool.category === "chemical" ? (
                <Badge
                  variant="outline"
                  className="bg-green-100 text-green-800 border-green-200"
                >
                  <svg
                    className="mr-1 h-3 w-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10 2v7.31" />
                    <path d="M14 9.3V2" />
                    <path d="M8.5 2h7" />
                    <path d="M14 9.3a6.5 6.5 0 1 1-4 0" />
                  </svg>
                  Química
                </Badge>
              ) : (
                <Badge variant="outline">Desconhecida</Badge>
              )}

              {tool.accessLevel === "E-TOOL" && (
                <Badge className="bg-ep-orange text-white border-transparent">
                  <svg
                    className="mr-1 h-3 w-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  E-TOOL
                </Badge>
              )}
              {tool.accessLevel === "E-MASTER" && (
                <Badge className="bg-purple-600 text-white border-transparent">
                  <svg
                    className="mr-1 h-3 w-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  E-MASTER
                </Badge>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-3">{tool.description}</p>
          
          {/* Sistema de avaliações */}
          <ToolRating 
            toolId={tool.id} 
            averageRating={tool.averageRating} 
            totalRatings={tool.totalRatings} 
          />
          
          <div className="mt-4">
            {renderToolAction()}
          </div>
        </CardContent>
      </Card>

      {/* Modal para exibir HTML personalizado */}
      <Dialog open={showCustomHtml} onOpenChange={setShowCustomHtml}>
        <DialogContent className="p-0 max-w-none w-[95vw] h-[95vh] max-h-[95vh]">
          <div className="h-full flex flex-col">
            <DialogHeader className="p-4 border-b">
              <DialogTitle>{tool.name}</DialogTitle>
              <DialogDescription>{tool.description}</DialogDescription>
            </DialogHeader>

            {tool.customHtml && (
              <div className="flex-grow h-full overflow-hidden">
                {tool.showInIframe ? (
                  <iframe
                    srcDoc={tool.customHtml}
                    title={tool.name}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                  />
                ) : (
                  <div className="w-full h-full overflow-y-auto p-6">
                    <div
                      className="bg-white"
                      dangerouslySetInnerHTML={{
                        __html: tool.customHtml || "",
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="p-4 border-t">
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => {
                  // Abrir em nova janela usando window.open com o HTML inserido e protegido
                  if (tool.customHtml) {
                    // Criar um nome de URL amigável baseado no nome da ferramenta
                    const urlName = tool.name
                      .toLowerCase()
                      .replace(/\s+/g, "-") // Substitui espaços por hífens
                      .replace(/[^\w\-]+/g, "") // Remove caracteres não alfanuméricos
                      .replace(/\-\-+/g, "-") // Substitui múltiplos hífens por um único
                      .replace(/^-+/, "") // Remove hífens no início
                      .replace(/-+$/, ""); // Remove hífens no final

                    const newWindow = window.open("", "_blank");
                    if (newWindow) {
                      // Escrever o HTML com proteções contra visualização do código fonte
                      newWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <title>${tool.name}</title>
                            <style>
                              body {
                                margin: 0;
                                padding: 0;
                                font-family: Arial, sans-serif;
                              }
                              #content {
                                padding: 20px;
                                max-width: 1200px;
                                margin: 0 auto;
                              }
                              img {
                                max-width: 100%;
                                height: auto;
                              }
                            </style>
                            <script>
                              // Desativar menu de contexto
                              document.addEventListener('contextmenu', event => event.preventDefault());
                              
                              // Desativar teclas de inspeção
                              document.addEventListener('keydown', function(e) {
                                // Ctrl+Shift+I, Ctrl+Shift+J, F12
                                if (
                                  (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) || 
                                  e.keyCode === 123
                                ) {
                                  e.preventDefault();
                                }
                              });
                              
                              // Impedir visualização do código fonte
                              document.addEventListener('keydown', function(e) {
                                // Ctrl+U
                                if (e.ctrlKey && e.keyCode === 85) {
                                  e.preventDefault();
                                }
                              });
                            </script>
                          </head>
                          <body>
                            <div id="content">
                              ${tool.customHtml}
                            </div>
                          </body>
                        </html>
                      `);

                      // Definir URL para mostrar o nome da ferramenta
                      try {
                        newWindow.history.pushState(
                          {},
                          tool.name,
                          "/" + urlName,
                        );
                      } catch (e) {
                        console.error("Não foi possível alterar a URL:", e);
                      }

                      newWindow.document.close();
                    }
                  }
                }}
              >
                <Maximize2 className="h-4 w-4" />
                Abrir em Nova Guia
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
