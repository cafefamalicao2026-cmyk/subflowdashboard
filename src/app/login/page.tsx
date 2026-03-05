"use client";

import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao entrar",
        description: "Verifique seu e-mail e senha e tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestLoading(true);
    
    // Simulação de envio de solicitação
    setTimeout(() => {
      setRequestLoading(false);
      setRequestOpen(false);
      toast({
        title: "Solicitação enviada!",
        description: "Nossa equipe analisará seu pedido e entrará em contato em breve.",
      });
    }, 1500);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background text-foreground">
      <Card className="w-full max-w-md shadow-lg border-none">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-xl">
              <LogIn className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">SubFlow Pro</CardTitle>
          <CardDescription className="text-center">
            Entre com suas credenciais para acessar seu dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="nome@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-muted/50 border-transparent focus:bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-muted/50 border-transparent focus:bg-background"
              />
            </div>
            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Ainda não tem uma conta?{" "}
            <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
              <DialogTrigger asChild>
                <span className="text-primary font-medium cursor-pointer hover:underline transition-all">
                  Solicite acesso
                </span>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleRequestAccess}>
                  <DialogHeader>
                    <DialogTitle>Solicitar Acesso</DialogTitle>
                    <DialogDescription>
                      Preencha os dados abaixo e entraremos em contato para validar seu perfil Pro.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="req-name">Nome Completo</Label>
                      <Input id="req-name" placeholder="Seu nome" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="req-email">E-mail Corporativo</Label>
                      <Input id="req-email" type="email" placeholder="nome@empresa.com" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="req-message">Por que você precisa de acesso?</Label>
                      <Textarea 
                        id="req-message" 
                        placeholder="Conte-nos brevemente sobre seu negócio..." 
                        className="resize-none"
                        required
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full gap-2" disabled={requestLoading}>
                      {requestLoading ? "Enviando..." : (
                        <>
                          Enviar Solicitação
                          <Send className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
