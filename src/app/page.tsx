import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";
export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect("/login");
  redirect(session.user.role === Role.PARENT ? "/portal" : "/dashboard");
}
