import { PrismaClient, Role, MobileMoneyProvider } from "@prisma/client";
import bcrypt from "bcryptjs";
import { encryptSecret } from "../src/lib/payments/crypto";

const prisma = new PrismaClient();

async function main() {
  const school = await prisma.school.create({
    data: {
      name: "Groupe Scolaire Les Palmiers",
      slug: "les-palmiers",
      currency: "XOF", // zone UEMOA (exemple : Sénégal)
    },
  });

  const passwordHash = await bcrypt.hash("Password123!", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@lespalmiers.test",
      passwordHash,
      role: Role.SCHOOL_ADMIN,
      schoolId: school.id,
    },
  });

  const classroom = await prisma.classroom.create({
    data: { schoolId: school.id, name: "CM2 A", level: "Primaire" },
  });

  const parentUser = await prisma.user.create({
    data: {
      email: "parent@lespalmiers.test",
      passwordHash,
      role: Role.PARENT,
      schoolId: school.id,
    },
  });

  const parentProfile = await prisma.parentProfile.create({
    data: {
      userId: parentUser.id,
      schoolId: school.id,
      fullName: "Awa Diallo",
      phone: "+221770000000",
    },
  });

  await prisma.student.create({
    data: {
      schoolId: school.id,
      classroomId: classroom.id,
      parentId: parentProfile.id,
      fullName: "Ibrahima Diallo",
      monthlyFee: 25000, // 25 000 FCFA
    },
  });

  // Exemple : l'école a ouvert elle-même son compte marchand Wave dans sa
  // localité. En conditions réelles, ces identifiants sont saisis par
  // l'admin de l'école via POST /api/merchant-accounts, jamais en dur ici.
  await prisma.merchantAccount.create({
    data: {
      schoolId: school.id,
      provider: MobileMoneyProvider.WAVE,
      merchantId: "wave-merchant-demo-001",
      encryptedApiSecret: encryptSecret("demo-secret-a-ne-jamais-utiliser-en-prod"),
    },
  });

  console.log("Seed terminé :", { admin: admin.email, parent: parentUser.email });
  console.log("Mot de passe pour les deux comptes : Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
