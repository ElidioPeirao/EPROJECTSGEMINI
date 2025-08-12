import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { NotificationCenter } from "@/components/notification-center";
import AdminChatButton from "@/components/admin-chat-button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Lock } from "lucide-react";

export default function Header() {
  const { user, isAdmin, isEMaster, isETool, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="bg-ep-black text-white shadow-md w-full">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex-shrink-0 flex items-center">
            <Link href="/dashboard" className="font-bold text-xl text-white">
              <span className="text-ep-orange">E</span>PROJECTS
            </Link>
          </div>
          
          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <Link 
              href="/dashboard" 
              className={`px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-ep-orange transition-all ${
                location === "/dashboard" ? "bg-ep-orange" : ""
              }`}
            >
              Início
            </Link>
            
            {isEMaster ? (
              <Link 
                href="/courses" 
                className={`px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-ep-orange transition-all ${
                  location.startsWith("/courses") ? "bg-ep-orange" : ""
                }`}
              >
                Cursos
              </Link>
            ) : (
              <div className="relative group">
                <button 
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-400 cursor-not-allowed flex items-center"
                  onClick={() => {
                    toast({
                      title: "Acesso Restrito",
                      description: "Esta funcionalidade está disponível apenas para usuários E-MASTER. Faça upgrade da sua conta para acessar os cursos.",
                      variant: "destructive",
                    });
                  }}
                >
                  Cursos
                  <svg 
                    className="ml-1 h-4 w-4" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </button>
                <div className="hidden group-hover:block absolute z-10 bg-gray-800 p-2 rounded shadow-lg text-xs text-white w-48 top-full mt-1">
                  Disponível apenas para usuários E-MASTER
                </div>
              </div>
            )}
            

            
            {/* Link para Upgrade */}
            {(!isAdmin && user?.role !== 'E-MASTER') && (
              <Link 
                href="/upgrade" 
                className={`px-3 py-2 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-all ${
                  location === "/upgrade" ? "ring-2 ring-green-400" : ""
                }`}
              >
                Fazer Upgrade
              </Link>
            )}
            
            {isAdmin && (
              <Link 
                href="/admin" 
                className={`px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-ep-orange transition-all ${
                  location === "/admin" ? "bg-ep-orange" : ""
                }`}
              >
                Administrador
              </Link>
            )}
            
            <Link 
              href="/chats" 
              className={`px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-ep-orange transition-all ${
                location.startsWith("/chat") ? "bg-ep-orange" : ""
              }`}
            >
              Suporte
            </Link>
            
            <Link 
              href="/account" 
              className={`px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-ep-orange transition-all ${
                location === "/account" ? "bg-ep-orange" : ""
              }`}
            >
              Minha Conta
            </Link>
            
            <div className="flex items-center space-x-2">
              <NotificationCenter />
              <AdminChatButton />
            </div>
            
            <Button 
              variant="ghost" 
              className="px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-ep-orange transition-all"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              Sair
            </Button>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <div className="flex items-center space-x-2">
              <NotificationCenter />
              <AdminChatButton />
            </div>
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" className="text-white hover:text-ep-orange">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-ep-black text-white p-0">
                <div className="flex flex-col py-4">
                  <Link 
                    href="/dashboard" 
                    className={`px-4 py-3 text-base font-medium hover:bg-ep-orange transition-all ${
                      location === "/dashboard" ? "bg-ep-orange" : ""
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    Início
                  </Link>
                  
                  {isEMaster ? (
                    <Link 
                      href="/courses" 
                      className={`px-4 py-3 text-base font-medium hover:bg-ep-orange transition-all ${
                        location.startsWith("/courses") ? "bg-ep-orange" : ""
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      Cursos
                    </Link>
                  ) : (
                    <button 
                      className="px-4 py-3 text-base font-medium text-left text-gray-400 flex items-center"
                      onClick={() => {
                        toast({
                          title: "Acesso Restrito",
                          description: "Esta funcionalidade está disponível apenas para usuários E-MASTER. Faça upgrade da sua conta para acessar os cursos.",
                          variant: "destructive",
                        });
                        setIsOpen(false);
                      }}
                    >
                      Cursos
                      <svg 
                        className="ml-1 h-4 w-4" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </button>
                  )}
                  

                  
                  {/* Link para Upgrade no menu mobile */}
                  {(!isAdmin && user?.role !== 'E-MASTER') && (
                    <Link 
                      href="/upgrade" 
                      className={`px-4 py-3 text-base font-medium bg-green-600 hover:bg-green-700 transition-all ${
                        location === "/upgrade" ? "ring-2 ring-green-400" : ""
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      Fazer Upgrade
                    </Link>
                  )}
                  
                  {isAdmin && (
                    <Link 
                      href="/admin" 
                      className={`px-4 py-3 text-base font-medium hover:bg-ep-orange transition-all ${
                        location === "/admin" ? "bg-ep-orange" : ""
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      Administrador
                    </Link>
                  )}
                  
                  <Link 
                    href="/chats" 
                    className={`px-4 py-3 text-base font-medium hover:bg-ep-orange transition-all ${
                      location.startsWith("/chat") ? "bg-ep-orange" : ""
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    Suporte
                  </Link>
                  
                  <Link 
                    href="/account" 
                    className={`px-4 py-3 text-base font-medium hover:bg-ep-orange transition-all ${
                      location === "/account" ? "bg-ep-orange" : ""
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    Minha Conta
                  </Link>
                  
                  <button 
                    className="px-4 py-3 text-base font-medium text-left hover:bg-ep-orange transition-all"
                    onClick={() => {
                      handleLogout();
                      setIsOpen(false);
                    }}
                    disabled={logoutMutation.isPending}
                  >
                    Sair
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
