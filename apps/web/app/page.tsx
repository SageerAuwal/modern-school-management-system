import { redirect } from "next/navigation";

// Redirect / → /login
export default function Home() {
  redirect("/login");
}
