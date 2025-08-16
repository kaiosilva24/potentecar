import { useEffect, useState } from "react";
import { verifyConnection } from "../../../supabase/supabase";
import { Alert, AlertDescription, AlertTitle } from "./alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export function ConnectionStatus() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"checking" | "connected" | "error">(
    "checking",
  );
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isConnected = await verifyConnection();
        if (isConnected) {
          setStatus("connected");
        } else {
          setStatus("error");
          setErrorMessage(
            "Não foi possível conectar ao banco de dados. Verifique suas credenciais.",
          );
        }
      } catch (error) {
        setStatus("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao verificar a conexão com o banco de dados.",
        );
      }
    };

    checkConnection();
  }, []);

  if (status === "checking") {
    return (
      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800">Verificando conexão</AlertTitle>
        <AlertDescription className="text-blue-700">
          Verificando a conexão com o banco de dados...
        </AlertDescription>
      </Alert>
    );
  }

  if (status === "error") {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro de conexão</AlertTitle>
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
    );
  }

  // Don't show anything when connected
  return null;
}
