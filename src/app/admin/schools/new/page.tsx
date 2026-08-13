import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import NewSchoolForm from "./NewSchoolForm";

export default async function NewSchoolPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.SUPER_ADMIN) {
    redirect("/login");
  }

  return <NewSchoolForm />;
}
