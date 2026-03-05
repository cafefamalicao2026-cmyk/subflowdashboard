"use client";

import React from "react";
import { useAuth } from "@/context/auth-context";
import { LogOut, User, HelpCircle, Edit3, ChevronRight, CreditCard, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  
  // Mock data as requested in requirements
  const userName = "Hebert Alves";
  const userEmail = user?.email || "hebert.alves@subflow.pro";

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white rounded-sm rotate-45"></div>
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">SubFlow Pro</span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground hidden sm:inline">
              Olá, <span className="text-foreground">{userName}</span>
            </span>
            <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground hover:text-destructive">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          
          {/* Left Column - Subscription & Activation */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Detalhes da Assinatura
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-gray-50/50 border border-gray-100">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Status Atual</p>
                    <Badge variant="destructive" className="bg-red-100 text-red-600 hover:bg-red-100 border-none font-semibold px-3 py-1">
                      Cancelado
                    </Badge>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50/50 border border-gray-100">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Próxima Cobrança</p>
                    <span className="text-sm font-semibold text-foreground">Indisponível</span>
                  </div>
                </div>

                {/* Activation Banner */}
                <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="space-y-1 text-center md:text-left">
                    <h3 className="text-lg font-bold text-primary">Ative seu plano agora</h3>
                    <p className="text-sm text-primary/70">Tenha acesso ilimitado a todas as funcionalidades pro.</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center md:text-right">
                      <p className="text-xs font-medium text-primary/60 uppercase">Mensal</p>
                      <p className="text-2xl font-black text-primary">R$ 49,90</p>
                    </div>
                    <Button className="bg-primary hover:bg-primary/90 text-white px-8 py-6 rounded-xl font-bold transition-all shadow-md hover:shadow-lg">
                      Assinar Plano
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bottom Row - Payment History */}
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Histórico de Pagamentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="min-h-[200px] border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-8 bg-gray-50/30">
                  <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                    <AlertCircle className="h-8 w-8 text-gray-300" />
                  </div>
                  <p className="text-gray-400 font-medium text-center">Nenhum pagamento registrado ainda.</p>
                  <p className="text-gray-300 text-sm mt-1">Suas faturas aparecerão aqui após a primeira assinatura.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - User Profile & Settings */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="border-none shadow-sm h-full">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Configurações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center text-center p-4">
                  <Avatar className="h-20 w-20 border-4 border-primary/10 mb-4">
                    <AvatarFallback className="text-2xl font-bold bg-primary text-white">H</AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <h4 className="font-bold text-lg text-foreground">{userName}</h4>
                    <p className="text-sm text-muted-foreground truncate max-w-[200px]">{userEmail}</p>
                  </div>
                </div>

                <Separator className="bg-gray-100" />

                <nav className="space-y-1">
                  <Button variant="ghost" className="w-full justify-between h-12 hover:bg-gray-50 text-muted-foreground hover:text-primary transition-all">
                    <span className="flex items-center gap-3">
                      <Edit3 className="h-4 w-4" />
                      Editar Perfil
                    </span>
                    <ChevronRight className="h-4 w-4 opacity-50" />
                  </Button>
                  <Button variant="ghost" className="w-full justify-between h-12 hover:bg-gray-50 text-muted-foreground hover:text-primary transition-all">
                    <span className="flex items-center gap-3">
                      <HelpCircle className="h-4 w-4" />
                      Central de Ajuda
                    </span>
                    <ChevronRight className="h-4 w-4 opacity-50" />
                  </Button>
                </nav>

                <div className="pt-4">
                   <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                     <p className="text-xs text-muted-foreground leading-relaxed text-center italic">
                       "Otimize seu fluxo de trabalho com o SubFlow Pro e foque no que realmente importa."
                     </p>
                   </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}