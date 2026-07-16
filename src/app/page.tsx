import type { Metadata } from "next";
import { HomeClient } from "./HomeClient";

export const metadata: Metadata = {
  title: "Centro de Inteligência - SETDIG",
  description: "Plataforma que reúne indicadores estratégicos, operacionais e de governança do Governo de Mato Grosso do Sul em um único ambiente.",
};

export default function Home() {
  return <HomeClient />;
}
