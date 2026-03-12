"use client";

import React, { useState } from "react";
import { useUser, useAuth, useDoc, useMemoFirebase } from "@/firebase";
import { signOut as firebaseSignOut } from "firebase/auth";
import { LogOut, User, HelpCircle, Edit3, ChevronRight, CreditCard, AlertCircle, Loader2, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import { doc } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
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

export default function DashboardPage() {
  const { user } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Monitor subscription status in Firestore
  const userDocRef = useMemoFirebase(() => user ? doc(db, "users", user.uid) : null, [user, db]);
  const { data: userData } = useDoc(userDocRef);
  
  const userName = user?.displayName || userData?.name || "Usuário";
  const userEmail = user?.email || userData?.email || "";
  const subscriptionStatus = userData?.subscriptionStatus || "Cancelado";
  const nextBillingDate = userData?.currentPeriodEnd ? new Date(userData.currentPeriodEnd).toLocaleDateString() : "Indisponível";
  const isCanceling = userData?.cancelAtPeriodEnd === true;

  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleSubscribe = async () => {
    if (!user) return;
    
    setCheckoutLoading(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          plan: "monthly",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to create checkout session");
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro no checkout",
        description: error.message || "Não foi possível iniciar o pagamento.",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user) return;
    
    setCancelLoading(true);
    try {
      const response = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Erro ao cancelar assinatura");
      }

      toast({
        title: "Cancelamento solicitado",
        description: "Seu plano continuará ativo até o final do período atual.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro no cancelamento",
        description: error.message || "Não foi possível cancelar a assinatura.",
      });
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-12">
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
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-muted-foreground hover:text-destructive">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          
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
                    <Badge 
                      variant={subscriptionStatus === "Ativo" || subscriptionStatus === "Cancelando" ? "default" : "destructive"} 
                      className={`${(subscriptionStatus === "Ativo" || subscriptionStatus === "Cancelando") ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"} hover:bg-opacity-80 border-none font-semibold px-3 py-1`}
                    >
                      {subscriptionStatus}
                    </Badge>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50/50 border border-gray-100">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      {isCanceling ? "Expira em" : "Próxima Cobrança"}
                    </p>
                    <span className="text-sm font-semibold text-foreground">{nextBillingDate}</span>
                  </div>
                </div>

                {isCanceling && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-3">
                    <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700">
                      Sua assinatura foi marcada para cancelamento. Seu plano continuará ativo até o final do período atual em <span className="font-bold">{nextBillingDate}</span>. Após essa data, o acesso será interrompido.
                    </p>
                  </div>
                )}

                {subscriptionStatus === "Cancelado" && (
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
                      <Button 
                        onClick={handleSubscribe}
                        disabled={checkoutLoading}
                        className="bg-primary hover:bg-primary/90 text-white px-8 py-6 rounded-xl font-bold transition-all shadow-md hover:shadow-lg min-w-[160px]"
                      >
                        {checkoutLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Assinar Plano"}
                      </Button>
                    </div>
                  </div>
                )}
                
                {subscriptionStatus === "Ativo" && !isCanceling && (
                  <div className="flex flex-col sm:flex-row items-center justify-between p-6 rounded-2xl bg-green-50 border border-green-100 gap-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-green-100 p-3 rounded-full">
                        <CreditCard className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-green-800">Sua assinatura está ativa!</h3>
                        <p className="text-sm text-green-700">Aproveite todos os recursos do SubFlow Pro.</p>
                      </div>
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="text-muted-foreground hover:text-destructive border-gray-200">
                          Cancelar Assinatura
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Tem certeza que deseja cancelar?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Sua assinatura permanecerá ativa até {nextBillingDate}. Após essa data, você perderá acesso aos recursos Premium.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Voltar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleCancelSubscription}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={cancelLoading}
                          >
                            {cancelLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                            Confirmar Cancelamento
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </CardContent>
            </Card>

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
                    <AvatarFallback className="text-2xl font-bold bg-primary text-white">
                      {userName.charAt(0)}
                    </AvatarFallback>
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
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
