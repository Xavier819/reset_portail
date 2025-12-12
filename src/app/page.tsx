// src/app/page.tsx
import { redirect } from "next/navigation";

export default function Home() {
  // Redirige immédiatement la racine vers /reset
  redirect("/reset");
}