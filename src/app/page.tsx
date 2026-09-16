import type { Metadata } from "next";
import { HomeClient } from "./HomeClient";
import { getAcessosServicoMensal } from "@/lib/data";
import { ServicosClient } from "./(plataforma)/servicos/ServicosClient";

export const metadata: Metadata = {
  title: "Centro de Inteligência - SETDIG",
  description: "Plataforma que reúne indicadores estratégicos, operacionais e de governança do Governo de Mato Grosso do Sul em um único ambiente.",
};

export default function Home() {
  return <HomeClient />;
}
const acessosMensal = getAcessosServicoMensal();
<ServicosClient acessosMensal={acessosMensal} resumo={{
  total: 0,
  ativos: 0,
  inativos: 0,
  digitais: 0,
  presenciais: 0,
  hibridos: 0,
  percentDigital: 0
}} orgaos={[]} relacao={[]} />
