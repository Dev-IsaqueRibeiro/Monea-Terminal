import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Configuração do cliente Supabase com as chaves internas do servidor
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    // 1. Busca alertas que ainda estão "Ativo"
    const { data: alerts, error: alertError } = await supabase
      .from("price_alerts")
      .select("*")
      .eq("status", "Ativo");

    if (alertError) throw alertError;
    if (!alerts || alerts.length === 0) {
      return new Response("Nenhum alerta ativo para processar.", {
        status: 200,
      });
    }

    // 2. Consulta o preço atual do Euro (AwesomeAPI)
    const res = await fetch(
      "https://economia.awesomeapi.com.br/json/last/EUR-BRL",
    );
    const json = await res.json();
    const currentPrice = parseFloat(json.EURBRL.bid);

    const results = [];

    for (const alert of alerts) {
      const target = parseFloat(alert.preco_alvo);
      const isCompra = alert.tipo === "Compra" && currentPrice <= target;
      const isVenda = alert.tipo === "Venda" && currentPrice >= target;

      if (isCompra || isVenda) {
        // 3. Log de disparo (Aqui conectaremos o Push Notification depois)
        console.log(
          `ALERTA DISPARADO: Usuário ${alert.user_id} - ${alert.ativo} atingiu R$ ${currentPrice}`,
        );

        // 4. Atualiza o status no banco para 'Disparado' para não tocar o alarme repetidamente
        await supabase
          .from("price_alerts")
          .update({ status: "Disparado" })
          .eq("id", alert.id);

        results.push({ id: alert.id, status: "disparado" });
      }
    }

    return new Response(
      JSON.stringify({ message: "Processado", currentPrice, results }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
